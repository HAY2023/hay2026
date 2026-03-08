import { useState, useRef } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StarsBackground from "@/components/StarsBackground";
import { toast } from "sonner";
import {
  ArrowRight, Sparkles, Loader2, GraduationCap,
  CheckCircle, XCircle, BookOpen, Send, Brain, Printer, RotateCcw
} from "lucide-react";
import { motion } from "framer-motion";
import { curriculum } from "@/data/curriculum";

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
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [corrections, setCorrections] = useState<Record<number, string>>({});
  const [correcting, setCorrecting] = useState(false);
  const [examStarted, setExamStarted] = useState(false);
  const examRef = useRef<HTMLDivElement>(null);
  const [useManualTopic, setUseManualTopic] = useState(false);
  const [selectedStage, setSelectedStage] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isActivated) return <Navigate to="/pending" replace />;
  
  const isPro = profile?.version === "pro";
  if (!isPro) return <Navigate to="/" replace />;

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
    const unanswered = questions.length - Object.keys(answers).length;
    if (unanswered > 0) {
      toast.error(`بقي ${unanswered} سؤال بدون إجابة`);
      return;
    }
    setSubmitted(true);
    setCorrecting(true);

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

  const isCorrect = (i: number) => answers[i]?.trim().toLowerCase() === questions[i].correct_answer.trim().toLowerCase();

  const printExam = () => {
    window.print();
  };

  const newExam = () => {
    setExamStarted(false);
    setQuestions([]);
    setAnswers({});
    setCorrections({});
    setSubmitted(false);
  };

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
              <p className="text-sm text-muted-foreground">ورقة اختبار كاملة حسب المنهج الجزائري</p>
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
                    min={3} max={30} className="bg-secondary/50 rounded-xl" />
                </div>
              </div>

              <div className="glass-card p-3 text-right text-xs text-muted-foreground space-y-1">
                <p>📄 ورقة اختبار كاملة - جميع الأسئلة في صفحة واحدة</p>
                <p>🇩🇿 أسئلة حسب المنهج الجزائري الرسمي</p>
                <p>🤖 تصحيح تلقائي ذكي كالأستاذ</p>
                <p>🖨️ إمكانية طباعة الاختبار</p>
              </div>

              <motion.div whileTap={{ scale: 0.97 }}>
                <Button onClick={generateExam} disabled={generating}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white gap-2 text-lg py-6 rounded-xl shadow-lg shadow-purple-500/20">
                  {generating ? <><Loader2 className="w-5 h-5 animate-spin" /> جاري توليد الاختبار...</>
                    : <><Sparkles className="w-5 h-5" /> توليد ورقة الاختبار</>}
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Full paper exam view - ALL questions on one page
  return (
    <div className="min-h-screen relative">
      <StarsBackground />
      <div className="relative z-10 max-w-3xl mx-auto p-4 md:p-6 print:max-w-none print:p-8">
        
        {/* Sticky top bar */}
        <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border/30 -mx-4 px-4 py-3 mb-6 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-1 rounded-xl">
              <ArrowRight className="w-4 h-4" /> العودة
            </Button>
            <Button variant="outline" size="sm" onClick={printExam} className="gap-1 rounded-xl">
              <Printer className="w-4 h-4" /> طباعة
            </Button>
            <Button variant="outline" size="sm" onClick={newExam} className="gap-1 rounded-xl">
              <RotateCcw className="w-4 h-4" /> اختبار جديد
            </Button>
          </div>
          <div className="flex items-center gap-3">
            {submitted && (
              <span className={`font-heading text-lg font-bold ${score / questions.length >= 0.5 ? "text-green-400" : "text-destructive"}`}>
                {score}/{questions.length}
              </span>
            )}
            {!submitted && (
              <span className="text-xs text-muted-foreground">
                {Object.keys(answers).length}/{questions.length} إجابة
              </span>
            )}
          </div>
        </div>

        {/* Exam Paper Header */}
        <div ref={examRef} className="exam-paper">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="border-2 border-foreground/20 rounded-2xl p-6 mb-6 text-center print:border-black print:rounded-none">
            <div className="flex items-center justify-between mb-4 text-xs text-muted-foreground print:text-black">
              <span>المدة: {questions.length * 3} دقائق</span>
              <span>🇩🇿 الجمهورية الجزائرية الديمقراطية الشعبية</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground mb-2 print:text-black">
              اختبار في مادة {topic}
            </h1>
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground print:text-black">
              <span>المستوى: {level}</span>
              <span>•</span>
              <span>عدد الأسئلة: {questions.length}</span>
            </div>
            <div className="mt-3 border-t border-border/30 pt-3 print:border-black">
              <p className="text-xs text-muted-foreground print:text-black">
                الاسم واللقب: ............................ القسم: .............. التاريخ: {new Date().toLocaleDateString("ar-DZ")}
              </p>
            </div>
          </motion.div>

          {/* ALL Questions - Full Paper */}
          <div className="space-y-6">
            {questions.map((q, qIndex) => (
              <motion.div key={qIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: qIndex * 0.05 }}
                className={`border rounded-xl p-5 transition-all print:border-black print:rounded-none print:break-inside-avoid ${
                  submitted
                    ? isCorrect(qIndex)
                      ? "border-green-500/40 bg-green-500/5"
                      : "border-destructive/40 bg-destructive/5"
                    : answers[qIndex]
                      ? "border-purple-500/40 bg-purple-500/5"
                      : "border-border/30"
                }`}>
                
                {/* Question header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    {submitted && (
                      isCorrect(qIndex)
                        ? <CheckCircle className="w-5 h-5 text-green-400 shrink-0 print:hidden" />
                        : <XCircle className="w-5 h-5 text-destructive shrink-0 print:hidden" />
                    )}
                  </div>
                  <div className="flex-1 text-right">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/10 text-purple-400 font-heading font-bold text-sm mb-2 print:bg-transparent print:border print:border-black print:text-black">
                      {qIndex + 1}
                    </span>
                    <h3 className="text-base md:text-lg font-heading font-bold text-foreground leading-relaxed print:text-black">
                      {q.question_text}
                    </h3>
                  </div>
                </div>

                {/* Options */}
                {q.options && q.options.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mr-4 print:grid-cols-2">
                    {q.options.map((opt, oi) => {
                      const letter = ["أ", "ب", "ج", "د"][oi];
                      const isSelected = answers[qIndex] === opt;
                      const isCorrectOption = opt.toLowerCase() === q.correct_answer.toLowerCase();
                      
                      return (
                        <button key={oi}
                          onClick={() => selectAnswer(qIndex, opt)}
                          disabled={submitted}
                          className={`p-3 rounded-lg text-right text-sm font-body transition-all border print:border-black print:rounded-none ${
                            !submitted && isSelected
                              ? "border-purple-500 bg-purple-500/10 ring-1 ring-purple-500/30"
                              : !submitted
                                ? "border-border/30 hover:border-primary/40 hover:bg-secondary/30"
                                : isCorrectOption
                                  ? "border-green-500 bg-green-500/10"
                                  : isSelected && !isCorrectOption
                                    ? "border-destructive bg-destructive/10"
                                    : "border-border/20 opacity-60"
                          }`}>
                          <span className="text-xs text-muted-foreground ml-2 font-bold print:text-black">{letter})</span>
                          <span className="print:text-black">{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mr-4">
                    <Input
                      value={answers[qIndex] || ""}
                      onChange={e => setAnswers(prev => ({ ...prev, [qIndex]: e.target.value }))}
                      placeholder="اكتب إجابتك هنا..."
                      className="bg-secondary/30 text-right rounded-xl print:border-black"
                      disabled={submitted}
                    />
                  </div>
                )}

                {/* Show correct answer after submission */}
                {submitted && !isCorrect(qIndex) && (
                  <div className="mt-3 mr-4 text-sm text-green-400 font-body text-right print:text-black">
                    ✅ الإجابة الصحيحة: {q.correct_answer}
                  </div>
                )}

                {/* AI Teacher correction */}
                {submitted && corrections[qIndex] && (
                  <div className="mt-3 mr-4 p-3 rounded-lg bg-purple-500/5 border border-purple-500/20 print:border-black print:bg-transparent">
                    <div className="flex items-center gap-2 mb-1 justify-end">
                      <span className="text-xs font-heading text-purple-400 print:text-black">تصحيح الأستاذ AI</span>
                      <GraduationCap className="w-3 h-3 text-purple-400 print:hidden" />
                    </div>
                    <p className="text-xs text-muted-foreground font-body leading-relaxed whitespace-pre-wrap text-right print:text-black">
                      {corrections[qIndex]}
                    </p>
                  </div>
                )}

                {submitted && correcting && !corrections[qIndex] && (
                  <div className="mt-3 mr-4 flex items-center justify-end gap-2 text-purple-400 print:hidden">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span className="text-xs">جاري التصحيح...</span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Submit / Score section */}
          <div className="mt-8 print:hidden">
            {!submitted ? (
              <motion.div whileTap={{ scale: 0.97 }}>
                <Button onClick={submitExam}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white gap-2 text-lg py-6 rounded-xl shadow-lg shadow-purple-500/20">
                  <Send className="w-5 h-5" /> تسليم ورقة الاختبار ({Object.keys(answers).length}/{questions.length})
                </Button>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="glass-card p-6 text-center space-y-4">
                <div className={`text-5xl font-heading font-bold ${score / questions.length >= 0.5 ? "text-green-400" : "text-destructive"}`}>
                  {score}/{questions.length}
                </div>
                <p className="text-lg font-heading text-foreground">
                  {score / questions.length >= 0.8 ? "ممتاز! 🌟" :
                   score / questions.length >= 0.5 ? "جيد، واصل التحسن 👍" :
                   "تحتاج مراجعة أكثر 📖"}
                </p>
                <p className="text-sm text-muted-foreground">
                  النسبة: {Math.round((score / questions.length) * 100)}%
                  {correcting && " • جاري تصحيح الأستاذ AI..."}
                </p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={printExam} variant="outline" className="gap-2 rounded-xl">
                    <Printer className="w-4 h-4" /> طباعة النتائج
                  </Button>
                  <Button onClick={newExam} className="gold-gradient text-background gap-2 rounded-xl">
                    <BookOpen className="w-4 h-4" /> اختبار جديد
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProExam;
