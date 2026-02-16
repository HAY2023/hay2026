import { useState, useEffect } from "react";
import { useParams, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import StarsBackground from "@/components/StarsBackground";
import { ArrowLeft, ArrowRight, Eye, EyeOff, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Question {
  id: string; question_text: string; question_type: string;
  options: string[] | null; correct_answer: string; time_limit: number;
}

const QASession = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const { user, isActivated, loading } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);

  useEffect(() => {
    if (!user || !isActivated) return;
    const fetch = async () => {
      let query = supabase.from("questions").select("*").eq("created_by", user.id);
      if (categoryId !== "all") query = query.eq("category_id", categoryId!);
      const { data } = await query;
      if (data) setQuestions(data as Question[]);
      setFetchLoading(false);
    };
    fetch();
  }, [user, isActivated, categoryId]);

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
        <div className="glass-card p-10 text-center z-10">
          <p className="text-xl font-heading gold-text mb-4">لا توجد أسئلة</p>
          <Button onClick={() => navigate("/")} className="gold-gradient text-background rounded-xl">العودة</Button>
        </div>
      </div>
    );
  }

  const q = questions[current];
  const labels = ["أ", "ب", "ج", "د"];

  const goNext = () => {
    if (current < questions.length - 1) {
      setCurrent(c => c + 1);
      setShowAnswer(false);
    }
  };

  const goPrev = () => {
    if (current > 0) {
      setCurrent(c => c - 1);
      setShowAnswer(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col">
      <StarsBackground />
      <div className="relative z-10 flex-1 flex flex-col max-w-2xl mx-auto w-full p-4">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-4">
          <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-heading font-bold gold-text text-lg">جلسة أسئلة وأجوبة</h1>
          <span className="text-sm text-muted-foreground font-mono">{current + 1}/{questions.length}</span>
        </motion.div>

        {/* Progress dots */}
        <div className="flex gap-1 justify-center mb-6 flex-wrap">
          {questions.map((_, i) => (
            <button key={i} onClick={() => { setCurrent(i); setShowAnswer(false); }}
              className={`w-3 h-3 rounded-full transition-all ${i === current ? "bg-primary scale-125" : "bg-secondary hover:bg-muted-foreground/30"}`} />
          ))}
        </div>

        {/* Question Card */}
        <div className="flex-1 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div key={current} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
              className="glass-card p-6 md:p-10 w-full">
              
              {/* Question number badge */}
              <div className="flex justify-between items-center mb-6">
                <span className="text-xs text-muted-foreground">
                  {q.question_type === "multiple_choice" ? "اختيارات متعددة" : q.question_type === "matching" ? "ربط" : "كتابة"}
                </span>
                <span className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center text-background font-heading font-bold text-lg">
                  {current + 1}
                </span>
              </div>

              {/* Question text */}
              <h2 className="text-xl md:text-2xl font-heading font-bold text-foreground text-center leading-relaxed mb-8">
                {q.question_text}
              </h2>

              {/* Options */}
              {q.question_type === "multiple_choice" && q.options && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  {(q.options as string[]).map((opt, i) => {
                    const isCorrect = showAnswer && opt.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
                    return (
                      <div key={i} className={`glass-card p-4 text-right font-body rounded-xl transition-all
                        ${isCorrect ? "border-green-500 bg-green-500/10" : ""}`}>
                        <span className="text-primary ml-2 font-heading">{labels[i]})</span> {opt}
                      </div>
                    );
                  })}
                </div>
              )}

              {q.question_type === "text" && !showAnswer && (
                <div className="text-center text-muted-foreground mb-6 text-lg tracking-widest">
                  ..........................................
                </div>
              )}

              {q.question_type === "matching" && !showAnswer && (
                <div className="text-center text-primary mb-6 font-body">
                  صل بين العمود الأيمن والعمود الأيسر
                </div>
              )}

              {/* Answer reveal */}
              <AnimatePresence>
                {showAnswer && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center mb-4">
                    <p className="text-sm text-muted-foreground mb-1">الإجابة الصحيحة</p>
                    <p className="text-lg font-heading font-bold text-green-400">{q.correct_answer}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Show/Hide answer */}
              <div className="flex justify-center">
                <motion.div whileTap={{ scale: 0.95 }}>
                  <Button variant="outline" onClick={() => setShowAnswer(!showAnswer)} className="gap-2 rounded-xl">
                    {showAnswer ? <><EyeOff className="w-4 h-4" /> إخفاء الإجابة</> : <><Eye className="w-4 h-4" /> عرض الإجابة</>}
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6 pb-4">
          <Button variant="outline" onClick={goPrev} disabled={current === 0} className="gap-1 rounded-xl">
            <ChevronRight className="w-4 h-4" /> السابق
          </Button>
          <Button variant="outline" onClick={goNext} disabled={current === questions.length - 1} className="gap-1 rounded-xl">
            التالي <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QASession;
