import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StarsBackground from "@/components/StarsBackground";
import { toast } from "sonner";
import {
  ArrowRight, Sparkles, Loader2, GraduationCap, Volume2, VolumeX,
  CheckCircle, XCircle, BookOpen, Send, Brain
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ExamQuestion {
  question_text: string;
  options?: string[];
  correct_answer: string;
  time_limit: number;
}

const ProExam = () => {
  const { user, isActivated, loading, profile } = useAuth();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(window.location.search);
  const [topic, setTopic] = useState(searchParams.get("topic") || "");
  const [level, setLevel] = useState(searchParams.get("level") || "متوسط");
  const [count, setCount] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [textAnswer, setTextAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [corrections, setCorrections] = useState<Record<number, string>>({});
  const [correcting, setCorrecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [examStarted, setExamStarted] = useState(false);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isActivated) return <Navigate to="/pending" replace />;
  
  const isPro = profile?.version === "pro";
  if (!isPro) return <Navigate to="/" replace />;

  const speakQuestion = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ar'; u.rate = 0.9;
      u.onstart = () => setIsSpeaking(true);
      u.onend = () => setIsSpeaking(false);
      u.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(u);
    }
  };

  const generateExam = async () => {
    if (!topic.trim()) { toast.error("اكتب الموضوع"); return; }
    setGenerating(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-questions`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ topic, count, type: "multiple_choice", level, aiMode: "algerian" }),
      });
      if (!resp.ok) { const err = await resp.json(); toast.error(err.error || "خطأ"); return; }
      const data = await resp.json();
      if (!data.questions?.length) { toast.error("لم يتم توليد أسئلة"); return; }
      setQuestions(data.questions);
      setExamStarted(true);
      setCurrent(0);
      setAnswers({});
      setCorrections({});
      setSubmitted(false);
    } catch { toast.error("خطأ في الاتصال"); }
    finally { setGenerating(false); }
  };

  const selectAnswer = (idx: number, ans: string) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [idx]: ans }));
  };

  const submitExam = async () => {
    if (Object.keys(answers).length < questions.length) {
      toast.error("أجب على جميع الأسئلة أولاً");
      return;
    }
    setSubmitted(true);
    setCorrecting(true);

    // Correct each answer with AI teacher
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-teacher-correct`;
    for (let i = 0; i < questions.length; i++) {
      try {
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: JSON.stringify({
            question: questions[i].question_text,
            userAnswer: answers[i],
            correctAnswer: questions[i].correct_answer,
            topic, level,
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          setCorrections(prev => ({ ...prev, [i]: data.correction }));
        }
      } catch { /* skip */ }
    }
    setCorrecting(false);
  };

  const score = submitted
    ? questions.filter((q, i) => answers[i]?.trim().toLowerCase() === q.correct_answer.trim().toLowerCase()).length
    : 0;

  // Setup screen
  if (!examStarted) {
    return (
      <div className="min-h-screen relative">
        <StarsBackground />
        <div className="relative z-10 max-w-lg mx-auto p-4 md:p-6">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-purple-400" />
              </div>
              <h1 className="text-2xl font-heading font-bold gold-text">اختبار PRO</h1>
            </div>
            <Button variant="ghost" onClick={() => navigate("/")} className="gap-1 rounded-xl">
              <ArrowRight className="w-4 h-4" /> العودة
            </Button>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="glass-card p-6 space-y-5">
            <div className="text-center mb-4">
              <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 3, repeat: Infinity }}>
                <Brain className="w-12 h-12 text-purple-400 mx-auto mb-3" />
              </motion.div>
              <h2 className="font-heading text-xl gold-text mb-1">نموذج اختبار بالذكاء الاصطناعي</h2>
              <p className="text-sm text-muted-foreground">حسب المنهج الدراسي الجزائري مع تصحيح كالأستاذ</p>
            </div>

            <div className="space-y-3">
              <Input value={topic} onChange={e => setTopic(e.target.value)}
                placeholder="الموضوع (مثال: الحرب العالمية الأولى، الدوال العددية...)"
                className="bg-secondary/50 text-right rounded-xl h-12" />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">المستوى</label>
                  <select value={level} onChange={e => setLevel(e.target.value)}
                    className="w-full bg-secondary/50 border border-border/50 rounded-xl p-2.5 text-foreground text-right text-sm">
                    <option value="ابتدائي">ابتدائي</option>
                    <option value="متوسط">متوسط</option>
                    <option value="ثانوي">ثانوي / بكالوريا</option>
                    <option value="جامعي">جامعي</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">عدد الأسئلة</label>
                  <Input type="number" value={count} onChange={e => setCount(parseInt(e.target.value) || 10)}
                    min={5} max={30} className="bg-secondary/50 rounded-xl" />
                </div>
              </div>

              <div className="glass-card p-3 text-right text-xs text-muted-foreground space-y-1">
                <p>🇩🇿 أسئلة حسب المنهج الجزائري الرسمي</p>
                <p>🤖 تصحيح تلقائي ذكي كالأستاذ</p>
                <p>📊 تحليل مفصل لكل إجابة</p>
                <p>🔊 قراءة صوتية للأسئلة</p>
              </div>

              <motion.div whileTap={{ scale: 0.97 }}>
                <Button onClick={generateExam} disabled={generating}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white gap-2 text-lg py-6 rounded-xl shadow-lg shadow-purple-500/20">
                  {generating ? <><Loader2 className="w-5 h-5 animate-spin" /> جاري توليد الاختبار...</>
                    : <><Sparkles className="w-5 h-5" /> ابدأ الاختبار</>}
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Exam view
  const q = questions[current];
  const isCorrect = (i: number) => answers[i]?.trim().toLowerCase() === questions[i].correct_answer.trim().toLowerCase();

  return (
    <div className="min-h-screen relative">
      <StarsBackground />
      <div className="relative z-10 max-w-2xl mx-auto p-4 md:p-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-purple-400" />
            <span className="font-heading text-sm gold-text">اختبار: {topic}</span>
          </div>
          {submitted && (
            <span className={`font-heading text-lg font-bold ${score / questions.length >= 0.5 ? "text-green-400" : "text-destructive"}`}>
              {score}/{questions.length}
            </span>
          )}
        </motion.div>

        {/* Question navigation dots */}
        <div className="flex gap-1 justify-center mb-4 flex-wrap">
          {questions.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                current === i ? "bg-purple-500 text-white scale-110" :
                submitted ? (isCorrect(i) ? "bg-green-500/20 text-green-400" : "bg-destructive/20 text-destructive") :
                answers[i] ? "bg-primary/20 text-primary" : "bg-secondary/50 text-muted-foreground"
              }`}>
              {i + 1}
            </button>
          ))}
        </div>

        {/* Question card */}
        <AnimatePresence mode="wait">
          <motion.div key={current} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
            className="glass-card p-6 mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground">السؤال {current + 1} من {questions.length}</span>
              <button onClick={() => isSpeaking ? (window.speechSynthesis.cancel(), setIsSpeaking(false)) : speakQuestion(q.question_text)}
                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
                {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                <span>{isSpeaking ? "إيقاف" : "اقرأ"}</span>
              </button>
            </div>
            <h2 className="text-lg md:text-xl font-heading font-bold text-foreground text-right leading-relaxed">
              {q.question_text}
            </h2>

            {submitted && (
              <div className={`mt-3 flex items-center gap-2 ${isCorrect(current) ? "text-green-400" : "text-destructive"}`}>
                {isCorrect(current) ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                <span className="text-sm font-body">{isCorrect(current) ? "إجابة صحيحة!" : `الإجابة الصحيحة: ${q.correct_answer}`}</span>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Options */}
        {q.options && q.options.length > 0 ? (
          <div className="grid grid-cols-1 gap-2 mb-4">
            {q.options.map((opt, oi) => (
              <motion.button key={oi} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * oi }}
                onClick={() => selectAnswer(current, opt)} disabled={submitted}
                className={`glass-card p-4 text-right font-body transition-all rounded-xl
                  ${!submitted && answers[current] === opt ? "border-purple-500 bg-purple-500/10" : ""}
                  ${!submitted && answers[current] !== opt ? "hover:border-primary/30" : ""}
                  ${submitted && opt.toLowerCase() === q.correct_answer.toLowerCase() ? "border-green-500 bg-green-500/10" : ""}
                  ${submitted && answers[current] === opt && opt.toLowerCase() !== q.correct_answer.toLowerCase() ? "border-destructive bg-destructive/10" : ""}
                `}>
                <span className="text-xs text-muted-foreground ml-2">{["أ", "ب", "ج", "د"][oi]})</span>
                {opt}
              </motion.button>
            ))}
          </div>
        ) : (
          <div className="flex gap-2 mb-4">
            <Input value={answers[current] || textAnswer} onChange={e => { setTextAnswer(e.target.value); setAnswers(prev => ({ ...prev, [current]: e.target.value })); }}
              placeholder="اكتب إجابتك..." className="bg-secondary/50 text-right rounded-xl flex-1" disabled={submitted} />
          </div>
        )}

        {/* AI Teacher correction */}
        {submitted && corrections[current] && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="glass-card p-4 mb-4 border-purple-500/30">
            <div className="flex items-center gap-2 mb-2 justify-end">
              <span className="text-sm font-heading text-purple-400">تصحيح الأستاذ AI</span>
              <GraduationCap className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-sm text-muted-foreground font-body leading-relaxed whitespace-pre-wrap text-right">
              {corrections[current]}
            </p>
          </motion.div>
        )}

        {submitted && correcting && !corrections[current] && (
          <div className="flex items-center justify-center gap-2 text-purple-400 mb-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">جاري تصحيح الأستاذ...</span>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 justify-between">
          <Button variant="outline" onClick={() => setCurrent(p => Math.max(0, p - 1))} disabled={current === 0} className="rounded-xl">
            السابق
          </Button>

          {!submitted && current === questions.length - 1 && Object.keys(answers).length === questions.length && (
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button onClick={submitExam} className="bg-purple-600 hover:bg-purple-700 text-white gap-2 rounded-xl shadow-lg">
                <Send className="w-4 h-4" /> تسليم الاختبار
              </Button>
            </motion.div>
          )}

          {submitted && current === questions.length - 1 && (
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button onClick={() => { setExamStarted(false); setQuestions([]); setAnswers({}); setCorrections({}); setSubmitted(false); }}
                className="gold-gradient text-background gap-2 rounded-xl">
                <BookOpen className="w-4 h-4" /> اختبار جديد
              </Button>
            </motion.div>
          )}

          <Button variant="outline" onClick={() => setCurrent(p => Math.min(questions.length - 1, p + 1))}
            disabled={current === questions.length - 1} className="rounded-xl">
            التالي
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProExam;
