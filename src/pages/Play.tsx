import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import StarsBackground from "@/components/StarsBackground";
import { Heart, Timer, ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options: string[] | null;
  correct_answer: string;
  time_limit: number;
  category_id: string;
}

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

  // Timer
  useEffect(() => {
    if (gameOver || showResult || fetchLoading || questions.length === 0) return;
    if (timeLeft <= 0) { handleWrong(); return; }
    const t = setTimeout(() => setTimeLeft((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, gameOver, showResult, fetchLoading, questions.length]);

  const handleWrong = useCallback(() => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
    setShowResult("wrong");
    const newLives = lives - 1;
    setLives(newLives);
    if (newLives <= 0) {
      setTimeout(() => setGameOver(true), 1500);
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
      setTimeout(() => nextQuestion(), 1200);
    } else {
      handleWrong();
    }
  };

  // Save result
  useEffect(() => {
    if (!gameOver || !user || questions.length === 0) return;
    const timeTaken = Math.round((Date.now() - startTime) / 1000);
    const pct = parseFloat(((score / questions.length) * 100).toFixed(2));
    supabase.from("game_results").insert({
      user_id: user.id,
      category_id: categoryId === "all" ? null : categoryId!,
      total_questions: questions.length,
      correct_answers: score,
      score_percentage: pct,
      time_taken: timeTaken,
    }).then(() => {});
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

  // Game over screen
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
        {/* Top bar */}
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

        {/* Question */}
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

        {/* Options */}
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
