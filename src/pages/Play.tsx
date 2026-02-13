import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import StarsBackground from "@/components/StarsBackground";
import { Heart, Timer, ArrowLeft, CheckCircle, XCircle, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";


interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options: string[] | null;
  correct_answer: string;
  time_limit: number;
  category_id: string;
}

// Sound effects using Web Audio API
const playSound = (type: "correct" | "wrong" | "win" | "lose") => {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.value = 0.15;

    if (type === "correct") {
      osc.frequency.value = 523;
      osc.start();
      setTimeout(() => { osc.frequency.value = 659; }, 100);
      setTimeout(() => { osc.frequency.value = 784; }, 200);
      setTimeout(() => { osc.stop(); ctx.close(); }, 350);
    } else if (type === "wrong") {
      osc.frequency.value = 300;
      osc.type = "sawtooth";
      osc.start();
      setTimeout(() => { osc.frequency.value = 200; }, 150);
      setTimeout(() => { osc.stop(); ctx.close(); }, 400);
    } else if (type === "win") {
      osc.frequency.value = 523;
      osc.start();
      setTimeout(() => { osc.frequency.value = 659; }, 150);
      setTimeout(() => { osc.frequency.value = 784; }, 300);
      setTimeout(() => { osc.frequency.value = 1047; }, 450);
      setTimeout(() => { osc.stop(); ctx.close(); }, 700);
    } else {
      osc.frequency.value = 400;
      osc.type = "sawtooth";
      gain.gain.value = 0.1;
      osc.start();
      setTimeout(() => { osc.frequency.value = 300; }, 200);
      setTimeout(() => { osc.frequency.value = 200; }, 400);
      setTimeout(() => { osc.stop(); ctx.close(); }, 600);
    }
  } catch {}
};

const fireConfetti = () => {
  confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ["#D4AF37", "#FFD700", "#FFA500"] });
  setTimeout(() => {
    confetti({ particleCount: 50, angle: 60, spread: 55, origin: { x: 0 }, colors: ["#D4AF37", "#FFD700"] });
    confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1 }, colors: ["#D4AF37", "#FFD700"] });
  }, 300);
};

const Play = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const { user, isActivated, loading } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [answer, setAnswer] = useState("");
  const [showResult, setShowResult] = useState<"correct" | "wrong" | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [shake, setShake] = useState(false);
  const [startTime] = useState(Date.now());
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (!user || !isActivated) return;
    const fetchQ = async () => {
      let query = supabase.from("questions").select("*");
      if (categoryId !== "all") query = query.eq("category_id", categoryId!);
      const { data } = await query;
      if (data && data.length > 0) {
        const shuffled = (data as Question[]).sort(() => Math.random() - 0.5);
        setQuestions(shuffled);
        setTimeLeft(shuffled[0].time_limit);
      }
      setFetchLoading(false);
    };
    fetchQ();
  }, [user, isActivated, categoryId]);

  useEffect(() => {
    if (gameOver || showResult || fetchLoading || questions.length === 0) return;
    if (timeLeft <= 0) { handleWrong(); return; }
    const t = setTimeout(() => setTimeLeft((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, gameOver, showResult, fetchLoading, questions.length]);

  const handleWrong = useCallback(() => {
    setShake(true);
    playSound("wrong");
    setTimeout(() => setShake(false), 500);
    setShowResult("wrong");
    const newLives = lives - 1;
    setLives(newLives);
    if (newLives <= 0) {
      setTimeout(() => { setGameOver(true); playSound("lose"); }, 1500);
    } else {
      setTimeout(() => nextQuestion(), 1500);
    }
  }, [lives, current, questions.length]);

  const nextQuestion = () => {
    setShowResult(null);
    setAnswer("");
    if (current + 1 >= questions.length) {
      setGameOver(true);
    } else {
      setCurrent((p) => p + 1);
      setTimeLeft(questions[current + 1]?.time_limit ?? 30);
    }
  };

  const handleAnswer = (ans: string) => {
    if (showResult) return;
    const correct = questions[current].correct_answer.trim().toLowerCase();
    if (ans.trim().toLowerCase() === correct) {
      setShowResult("correct");
      setScore((p) => p + 1);
      playSound("correct");
      setTimeout(() => nextQuestion(), 1200);
    } else {
      handleWrong();
    }
  };

  // Save result & analyze
  useEffect(() => {
    if (!gameOver || !user || questions.length === 0) return;
    const timeTaken = Math.round((Date.now() - startTime) / 1000);
    const pct = parseFloat(((score / questions.length) * 100).toFixed(2));

    if (pct >= 70) { fireConfetti(); playSound("win"); }

    supabase.from("game_results").insert({
      user_id: user.id,
      category_id: categoryId === "all" ? null : categoryId!,
      total_questions: questions.length,
      correct_answers: score,
      score_percentage: pct,
      time_taken: timeTaken,
    }).then(() => {});

    // AI analysis
    setAnalyzing(true);
    const analyzeUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-results`;
    fetch(analyzeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
      body: JSON.stringify({ score, total: questions.length, percentage: pct, categoryName: categoryId === "all" ? null : categoryId, timeTaken }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.analysis) setAiAnalysis(d.analysis); })
      .catch(() => {})
      .finally(() => setAnalyzing(false));
  }, [gameOver]);

  if (loading || fetchLoading) return <div className="min-h-screen flex items-center justify-center"><div className="gold-text text-2xl font-heading">جاري التحميل...</div></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isActivated) return <Navigate to="/pending" replace />;

  if (questions.length === 0 && !fetchLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative">
        <StarsBackground />
        <div className="glass-card p-8 text-center z-10">
          <p className="text-xl font-heading gold-text mb-4">لا توجد أسئلة في هذا القسم بعد</p>
          <Button onClick={() => navigate("/")} className="gold-gradient text-background">العودة</Button>
        </div>
      </div>
    );
  }

  if (gameOver) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative">
        <StarsBackground />
        <div className="glass-card p-8 text-center z-10 animate-slide-up max-w-md w-full">
          <div className="text-6xl mb-4">{pct >= 80 ? "🏆" : pct >= 50 ? "👏" : "😢"}</div>
          <h2 className="text-3xl font-heading font-bold gold-text mb-2">انتهت اللعبة!</h2>
          <div className="text-5xl font-heading font-bold text-primary my-4">{pct}%</div>
          <p className="text-muted-foreground mb-6">{score} من {questions.length} إجابة صحيحة</p>

          {/* AI Analysis */}
          {analyzing && (
            <div className="flex items-center justify-center gap-2 text-primary mb-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm font-body">جاري التحليل الذكي...</span>
            </div>
          )}
          {aiAnalysis && (
            <div className="glass-card p-4 mb-6 text-right">
              <div className="flex items-center gap-2 mb-2 justify-end">
                <span className="text-sm font-heading gold-text">تحليل الذكاء الاصطناعي</span>
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground font-body leading-relaxed whitespace-pre-wrap">{aiAnalysis}</p>
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <Button onClick={() => navigate("/")} variant="outline">العودة للرئيسية</Button>
            <Button onClick={() => window.location.reload()} className="gold-gradient text-background">إعادة اللعب</Button>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[current];
  const progress = ((current + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen relative">
      <StarsBackground />
      <div className="relative z-10 max-w-2xl mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <Heart key={i} className={`w-6 h-6 ${i < lives ? "text-destructive fill-destructive" : "text-muted"}`} />
            ))}
          </div>
          <div className="flex items-center gap-1 text-primary font-heading">
            <Timer className="w-5 h-5" />
            <span className={`text-xl font-bold ${timeLeft <= 5 ? "text-destructive animate-pulse" : ""}`}>{timeLeft}</span>
          </div>
        </div>

        <Progress value={progress} className="h-2 mb-6" />
        <p className="text-center text-sm text-muted-foreground mb-4">السؤال {current + 1} من {questions.length}</p>

        <div className={`glass-card p-6 mb-6 ${shake ? "animate-shake" : ""}`}>
          <h2 className="text-xl md:text-2xl font-heading font-bold text-center text-foreground leading-relaxed">
            {q.question_text}
          </h2>
          {showResult && (
            <div className={`mt-4 flex items-center justify-center gap-2 ${showResult === "correct" ? "text-green-400" : "text-destructive"}`}>
              {showResult === "correct" ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              <span className="font-body">{showResult === "correct" ? "إجابة صحيحة!" : `خطأ! الإجابة: ${q.correct_answer}`}</span>
            </div>
          )}
        </div>

        {q.question_type === "multiple_choice" && q.options ? (
          <div className="grid grid-cols-1 gap-3">
            {(q.options as string[]).map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(opt)}
                disabled={!!showResult}
                className={`glass-card p-4 text-right font-body text-lg transition-all hover:border-primary/50 hover:scale-[1.02] disabled:opacity-70
                  ${showResult && opt.toLowerCase() === q.correct_answer.toLowerCase() ? "border-green-500 bg-green-500/10" : ""}
                  ${showResult === "wrong" && answer === opt ? "border-destructive bg-destructive/10" : ""}
                `}
              >
                {opt}
              </button>
            ))}
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); handleAnswer(answer); }} className="flex gap-3">
            <Input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="اكتب الإجابة هنا..."
              className="bg-secondary/50 border-border/50 text-right flex-1"
              disabled={!!showResult}
            />
            <Button type="submit" disabled={!!showResult || !answer.trim()} className="gold-gradient text-background">إرسال</Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Play;
