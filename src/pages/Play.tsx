import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { calculateGameXP, awardXP } from "@/hooks/useXP";
import { useInventory } from "@/hooks/useInventory";
import { useAchievements } from "@/hooks/useAchievements";
import AchievementToast from "@/components/AchievementToast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import StarsBackground from "@/components/StarsBackground";
import MatchingQuestion from "@/components/MatchingQuestion";
import { Heart, Timer, ArrowLeft, CheckCircle, XCircle, Sparkles, Loader2, Volume2, VolumeX, Zap, Lightbulb, Clock, Shield, RotateCcw, Snowflake } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";

interface Question {
  id: string; question_text: string; question_type: string;
  options: string[] | null; correct_answer: string; time_limit: number; category_id: string;
}

const playSound = (type: "correct" | "wrong" | "win" | "lose") => {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination); gain.gain.value = 0.15;
    if (type === "correct") {
      osc.frequency.value = 523; osc.start();
      setTimeout(() => { osc.frequency.value = 659; }, 100);
      setTimeout(() => { osc.frequency.value = 784; }, 200);
      setTimeout(() => { osc.stop(); ctx.close(); }, 350);
    } else if (type === "wrong") {
      osc.frequency.value = 300; osc.type = "sawtooth"; osc.start();
      setTimeout(() => { osc.frequency.value = 200; }, 150);
      setTimeout(() => { osc.stop(); ctx.close(); }, 400);
    } else if (type === "win") {
      osc.frequency.value = 523; osc.start();
      setTimeout(() => { osc.frequency.value = 659; }, 150);
      setTimeout(() => { osc.frequency.value = 784; }, 300);
      setTimeout(() => { osc.frequency.value = 1047; }, 450);
      setTimeout(() => { osc.stop(); ctx.close(); }, 700);
    } else {
      osc.frequency.value = 400; osc.type = "sawtooth"; gain.gain.value = 0.1; osc.start();
      setTimeout(() => { osc.frequency.value = 300; }, 200);
      setTimeout(() => { osc.frequency.value = 200; }, 400);
      setTimeout(() => { osc.stop(); ctx.close(); }, 600);
    }
  } catch { }
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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isActivated, loading } = useAuth();
  const initialLives = parseInt(searchParams.get("lives") || "3", 10);
  const { consumeItem, getCount } = useInventory(user?.id);
  const { checkAndUnlock, newlyUnlocked, clearNewlyUnlocked } = useAchievements(user?.id);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [lives, setLives] = useState(initialLives);
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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [earnedXP, setEarnedXP] = useState(0);
  const [leveledUp, setLeveledUp] = useState(false);
  const [timeFrozen, setTimeFrozen] = useState(false);
  const [shieldActive, setShieldActive] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [hintText, setHintText] = useState<string | null>(null);
  const [retryUsed, setRetryUsed] = useState(false);
  const [xpMultiplier, setXpMultiplier] = useState(1);
  const [showAchievementToast, setShowAchievementToast] = useState(false);

  // Check for XP multiplier at start
  useEffect(() => {
    if (user) {
      const count = getCount("xp_multiplier");
      if (count > 0) {
        consumeItem("xp_multiplier").then(ok => {
          if (ok) { setXpMultiplier(2); toast.success("مضاعف XP مفعّل! ⚡×2"); }
        });
      }
    }
  }, [user]);

  const speakQuestion = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ar'; utterance.rate = 0.9;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => { window.speechSynthesis.cancel(); setIsSpeaking(false); };

  useEffect(() => {
    if (!user || !isActivated) return;
    const fetchQ = async () => {
      let query = supabase.from("questions").select("*").eq("created_by", user.id);
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
    if (gameOver || showResult || fetchLoading || questions.length === 0 || timeFrozen) return;
    if (timeLeft <= 0) { handleWrong(); return; }
    const t = setTimeout(() => setTimeLeft((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, gameOver, showResult, fetchLoading, questions.length, timeFrozen]);

  const handleWrong = useCallback(() => {
    // Shield protection
    if (shieldActive) {
      setShieldActive(false);
      toast.success("🛡️ درع الحماية أنقذك!");
      setShowResult("wrong");
      setTimeout(() => nextQuestion(), 1200);
      return;
    }

    setShake(true); playSound("wrong");
    setTimeout(() => setShake(false), 500);
    setShowResult("wrong");
    const newLives = lives - 1;
    setLives(newLives);
    if (initialLives > 0 && newLives <= 0) {
      setTimeout(() => { setGameOver(true); playSound("lose"); }, 1500);
    } else {
      setTimeout(() => nextQuestion(), 1500);
    }
  }, [lives, current, questions.length, shieldActive]);

  const handleCorrect = useCallback(() => {
    setShowResult("correct"); setScore((p) => p + 1); playSound("correct");
    setTimeout(() => nextQuestion(), 1200);
  }, [current, questions.length]);

  const nextQuestion = () => {
    setShowResult(null); setAnswer(""); setHintUsed(false); setHintText(null); setRetryUsed(false);
    if (current + 1 >= questions.length) { setGameOver(true); }
    else { setCurrent((p) => p + 1); setTimeLeft(questions[current + 1]?.time_limit ?? 30); }
  };

  const handleAnswer = (ans: string) => {
    if (showResult) return;
    const correct = questions[current].correct_answer.trim().toLowerCase();
    if (ans.trim().toLowerCase() === correct) { handleCorrect(); } else { handleWrong(); }
  };

  const handleMatchingComplete = (isCorrect: boolean) => {
    if (isCorrect) { handleCorrect(); } else { handleWrong(); }
  };

  // Power-up handlers
  const useHint = async () => {
    if (hintUsed || showResult) return;
    const ok = await consumeItem("hint");
    if (!ok) { toast.error("ليس لديك تلميحات! اشترِ من المتجر 💡"); return; }
    setHintUsed(true);
    const q = questions[current];
    if (q.question_type === "multiple_choice" && q.options) {
      // Show hint: reveal first letter of correct answer
      const correct = q.correct_answer;
      setHintText(`التلميح: الإجابة تبدأ بـ "${correct.charAt(0)}..." 💡`);
    } else {
      setHintText(`التلميح: الإجابة تتكون من ${q.correct_answer.length} أحرف 💡`);
    }
    toast.success("تم استخدام تلميح! 💡");
  };

  const useExtraTime = async () => {
    if (showResult) return;
    const ok = await consumeItem("extra_time");
    if (!ok) { toast.error("ليس لديك وقت إضافي! ⏰"); return; }
    setTimeLeft(prev => prev + 15);
    toast.success("+15 ثانية إضافية! ⏰");
  };

  const useFreezeTime = async () => {
    if (showResult || timeFrozen) return;
    const ok = await consumeItem("freeze_time");
    if (!ok) { toast.error("ليس لديك تجميد وقت! ❄️"); return; }
    setTimeFrozen(true);
    toast.success("تم تجميد الوقت لـ 10 ثوانٍ! ❄️");
    setTimeout(() => setTimeFrozen(false), 10000);
  };

  const useShield = async () => {
    if (showResult || shieldActive) return;
    const ok = await consumeItem("shield");
    if (!ok) { toast.error("ليس لديك درع! 🛡️"); return; }
    setShieldActive(true);
    toast.success("درع الحماية مفعّل! 🛡️");
  };

  const useRetry = async () => {
    if (!showResult || showResult !== "wrong" || retryUsed) return;
    const ok = await consumeItem("retry");
    if (!ok) { toast.error("ليس لديك إعادة محاولة! 🔄"); return; }
    setRetryUsed(true);
    setShowResult(null);
    setAnswer("");
    setLives(prev => prev + 1); // Restore the lost life
    setTimeLeft(questions[current]?.time_limit ?? 30);
    toast.success("إعادة المحاولة! 🔄");
  };

  useEffect(() => {
    if (!gameOver || !user || questions.length === 0) return;
    const timeTaken = Math.round((Date.now() - startTime) / 1000);
    const pct = parseFloat(((score / questions.length) * 100).toFixed(2));
    if (pct >= 70) { fireConfetti(); playSound("win"); }
    supabase.from("game_results").insert({
      user_id: user.id, category_id: categoryId === "all" ? null : categoryId!,
      total_questions: questions.length, correct_answers: score, score_percentage: pct, time_taken: timeTaken,
    }).then(() => { });
    const isPerfect = pct === 100;
    let xpAmount = calculateGameXP(pct, questions.length, isPerfect, 0);
    xpAmount *= xpMultiplier;
    setEarnedXP(xpAmount);
    awardXP(user.id, xpAmount).then(result => {
      if (result.leveledUp) {
        setLeveledUp(true);
        confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 }, colors: ["#D4AF37", "#FFD700", "#FFA500", "#9C27B0"] });
      }
    });
    // Check achievements after game
    const checkAch = async () => {
      const [allResultsRes, purchasesRes, profileRes2] = await Promise.all([
        supabase.from("game_results").select("score_percentage, time_taken, played_at").eq("user_id", user.id),
        supabase.from("user_purchases").select("id").eq("user_id", user.id),
        supabase.from("profiles").select("xp, level").eq("user_id", user.id).single(),
      ]);
      const allResults = allResultsRes.data || [];
      const perfectGames = allResults.filter(r => r.score_percentage === 100).length;
      const fastestGame = allResults.reduce((min: number | null, r) => {
        if (r.time_taken == null) return min;
        return min === null ? r.time_taken : Math.min(min, r.time_taken);
      }, null as number | null);
      let streak = 0;
      const today = new Date();
      for (let i = 0; i < 60; i++) {
        const d = new Date(today); d.setDate(today.getDate() - i);
        const ds = d.toISOString().split("T")[0];
        const played = allResults.some(r => r.played_at.startsWith(ds));
        if (played || i === 0) { if (played) streak++; } else break;
      }
      const unlocked = await checkAndUnlock({
        totalGames: allResults.length, perfectGames, streak,
        level: (profileRes2.data as any)?.level ?? 1,
        xp: (profileRes2.data as any)?.xp ?? 0,
        purchases: (purchasesRes.data || []).length, fastestGame,
      });
      if (unlocked && unlocked.length > 0) setShowAchievementToast(true);
    };
    checkAch();
    setAnalyzing(true);
    const analyzeUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-results`;
    fetch(analyzeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
      body: JSON.stringify({ score, total: questions.length, percentage: pct, categoryName: categoryId === "all" ? null : categoryId, timeTaken }),
    }).then((r) => r.json()).then((d) => { if (d.analysis) setAiAnalysis(d.analysis); }).catch(() => { }).finally(() => setAnalyzing(false));
  }, [gameOver]);

  if (loading || fetchLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="gold-text text-2xl font-heading">جاري التحميل...</motion.div>
    </div>
  );
  if (!user) return <Navigate to="/auth" replace />;
  if (!isActivated) return <Navigate to="/pending" replace />;

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative">
        <StarsBackground />
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-10 text-center z-10">
          <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity }} className="text-5xl mb-4">🤔</motion.div>
          <p className="text-xl font-heading gold-text mb-4">لا توجد أسئلة في هذا القسم بعد</p>
          <Button onClick={() => navigate("/")} className="gold-gradient text-background rounded-xl">العودة</Button>
        </motion.div>
      </div>
    );
  }

  if (gameOver) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <>
        {showAchievementToast && newlyUnlocked.length > 0 && (
          <AchievementToast achievementKeys={newlyUnlocked} onDone={() => { setShowAchievementToast(false); clearNewlyUnlocked(); }} />
        )}
        <div className="min-h-screen flex items-center justify-center p-4 relative">
        <StarsBackground />
        <motion.div initial={{ opacity: 0, y: 30, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 200 }}
          className="glass-card p-8 text-center z-10 max-w-md w-full overflow-hidden">
          <div className="h-px w-full gold-gradient opacity-50 -mt-8 mb-6" />
          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5 }} className="text-6xl mb-4">
            {pct >= 80 ? "🏆" : pct >= 50 ? "👏" : "😢"}
          </motion.div>
          <h2 className="text-3xl font-heading font-bold gold-text mb-2">انتهت اللعبة!</h2>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.3 }}
            className={`text-5xl font-heading font-bold my-4 ${pct >= 80 ? "text-green-400" : pct >= 50 ? "text-primary" : "text-destructive"}`}>
            {pct}%
          </motion.div>
          <p className="text-muted-foreground mb-3">{score} من {questions.length} إجابة صحيحة</p>
          {earnedXP > 0 && (
            <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, type: "spring" }}
              className="flex items-center justify-center gap-2 mb-2">
              <span className="text-primary font-heading font-bold text-lg">+{earnedXP} XP {xpMultiplier > 1 ? "(×2!)" : ""}</span>
              <Zap className="w-5 h-5 text-primary" />
            </motion.div>
          )}
          {leveledUp && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
              className="bg-primary/10 border border-primary/30 rounded-xl px-4 py-2 mb-4">
              <p className="text-sm font-heading font-bold text-primary">🎉 ارتقيت لمستوى جديد!</p>
            </motion.div>
          )}
          {analyzing && (
            <div className="flex items-center justify-center gap-2 text-primary mb-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm font-body">جاري التحليل الذكي...</span>
            </div>
          )}
          {aiAnalysis && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 mb-6 text-right">
              <div className="flex items-center gap-2 mb-2 justify-end">
                <span className="text-sm font-heading gold-text">تحليل الذكاء الاصطناعي</span>
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground font-body leading-relaxed whitespace-pre-wrap">{aiAnalysis}</p>
            </motion.div>
          )}
          <div className="flex gap-3 justify-center">
            <Button onClick={() => navigate("/")} variant="outline" className="rounded-xl">العودة للرئيسية</Button>
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button onClick={() => window.location.reload()} className="gold-gradient text-background rounded-xl shadow-lg shadow-primary/15">إعادة اللعب</Button>
            </motion.div>
          </div>
        </motion.div>
        </div>
      </>
    );
  }

  const q = questions[current];
  const progress = ((current + 1) / questions.length) * 100;

  let matchingPairs: Record<string, string> = {};
  let matchingLeft: string[] = [];
  let matchingRight: string[] = [];
  if (q.question_type === "matching") {
    try {
      matchingPairs = JSON.parse(q.correct_answer);
      matchingLeft = q.options as string[] || Object.keys(matchingPairs);
      matchingRight = Object.values(matchingPairs);
    } catch { matchingLeft = []; matchingRight = []; }
  }

  return (
    <div className="min-h-screen relative">
      <StarsBackground />
      <div className="relative z-10 max-w-2xl mx-auto p-4">
        {/* Top bar */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-4">
          <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-1">
            {initialLives > 0 ? (
              Array.from({ length: initialLives }).map((_, i) => (
                <motion.div key={i} animate={i >= lives ? { scale: [1, 0.8] } : {}} transition={{ duration: 0.3 }}>
                  <Heart className={`w-6 h-6 transition-colors ${i < lives ? "text-destructive fill-destructive" : "text-muted/30"}`} />
                </motion.div>
              ))
            ) : (
              <span className="text-lg">♾️</span>
            )}
          </div>
          <div className="flex items-center gap-2 font-heading">
            <span className="text-sm font-bold text-green-400">{score}/{questions.length}</span>
            {timeFrozen && <Snowflake className="w-4 h-4 text-blue-400 animate-pulse" />}
            {shieldActive && <Shield className="w-4 h-4 text-primary animate-pulse" />}
            <Timer className="w-5 h-5 text-primary" />
            <span className={`text-xl font-bold ${timeLeft <= 5 ? "text-destructive animate-pulse" : timeFrozen ? "text-blue-400" : "text-primary"}`}>{timeLeft}</span>
          </div>
        </motion.div>

        <Progress value={progress} className="h-2 mb-2 rounded-full" />
        <p className="text-center text-sm text-muted-foreground mb-4">السؤال {current + 1} من {questions.length}</p>

        {/* Power-ups bar */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center gap-2 mb-4 flex-wrap">
          <button onClick={useHint} disabled={hintUsed || !!showResult}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs border border-border/50 bg-secondary/50 hover:bg-primary/10 hover:border-primary/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            <Lightbulb className="w-3.5 h-3.5 text-yellow-400" />
            <span>تلميح ({getCount("hint")})</span>
          </button>
          <button onClick={useExtraTime} disabled={!!showResult}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs border border-border/50 bg-secondary/50 hover:bg-primary/10 hover:border-primary/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            <Clock className="w-3.5 h-3.5 text-green-400" />
            <span>+15 ث ({getCount("extra_time")})</span>
          </button>
          <button onClick={useFreezeTime} disabled={!!showResult || timeFrozen}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs border border-border/50 bg-secondary/50 hover:bg-primary/10 hover:border-primary/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            <Snowflake className="w-3.5 h-3.5 text-blue-400" />
            <span>تجميد ({getCount("freeze_time")})</span>
          </button>
          <button onClick={useShield} disabled={!!showResult || shieldActive}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs border border-border/50 bg-secondary/50 hover:bg-primary/10 hover:border-primary/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            <Shield className="w-3.5 h-3.5 text-primary" />
            <span>درع ({getCount("shield")})</span>
          </button>
        </motion.div>

        {/* Question card */}
        <AnimatePresence mode="wait">
          <motion.div key={current} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
            className={`glass-card p-6 md:p-8 mb-4 ${shake ? "animate-shake" : ""}`}>
            <h2 className="text-xl md:text-2xl font-heading font-bold text-center text-foreground leading-relaxed mb-4">
              {q.question_text}
            </h2>
            <button
              onClick={() => isSpeaking ? stopSpeaking() : speakQuestion(q.question_text)}
              className="mx-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              <span>{isSpeaking ? "إيقاف" : "اقرأ السؤال"}</span>
            </button>
            {hintText && (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                className="mt-3 text-center text-sm text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-xl px-3 py-2">
                {hintText}
              </motion.div>
            )}
            {showResult && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`mt-4 flex flex-col items-center gap-2 ${showResult === "correct" ? "text-green-400" : "text-destructive"}`}>
                <div className="flex items-center gap-2">
                  {showResult === "correct" ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                  <span className="font-body">{showResult === "correct" ? "إجابة صحيحة!" : "خطأ!"}</span>
                </div>
                {showResult === "wrong" && !retryUsed && getCount("retry") > 0 && (
                  <button onClick={useRetry}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs border border-primary/30 bg-primary/10 hover:bg-primary/20 transition-all text-primary">
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>إعادة المحاولة ({getCount("retry")})</span>
                  </button>
                )}
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Answer area */}
        {q.question_type === "matching" ? (
          <MatchingQuestion leftItems={matchingLeft} rightItems={matchingRight} correctPairs={matchingPairs}
            onComplete={handleMatchingComplete} disabled={!!showResult} />
        ) : q.question_type === "multiple_choice" && q.options ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="grid grid-cols-1 gap-3">
            {(q.options as string[]).map((opt, i) => (
              <motion.button key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}
                whileTap={{ scale: 0.98 }} onClick={() => handleAnswer(opt)} disabled={!!showResult}
                className={`glass-card p-4 text-right font-body text-lg transition-all rounded-xl
                  ${!showResult ? "hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98]" : ""}
                  ${showResult && opt.toLowerCase() === q.correct_answer.toLowerCase() ? "border-green-500 bg-green-500/10" : ""}
                  ${showResult === "wrong" && answer === opt ? "border-destructive bg-destructive/10" : ""}
                  disabled:opacity-70`}>
                {opt}
              </motion.button>
            ))}
          </motion.div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); handleAnswer(answer); }} className="flex gap-3">
            <Input value={answer} onChange={(e) => setAnswer(e.target.value)}
              placeholder="اكتب الإجابة هنا..." className="bg-secondary/50 border-border/50 text-right flex-1 rounded-xl h-12" disabled={!!showResult} />
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button type="submit" disabled={!!showResult || !answer.trim()} className="gold-gradient text-background rounded-xl h-12">إرسال</Button>
            </motion.div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Play;
