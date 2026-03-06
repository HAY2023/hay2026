import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import StarsBackground from "@/components/StarsBackground";
import { Button } from "@/components/ui/button";
import { curriculum } from "@/data/curriculum";
import { ArrowRight, BookOpen, Loader2, Sparkles, ChevronLeft, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import NotificationBell from "@/components/NotificationBell";
import { toast } from "sonner";

interface BookItem {
  title: string;
  subject: string;
  level: string;
  year: string;
  summary?: string;
  loadingSummary?: boolean;
}

// Generate book list from curriculum
const generateBooks = (): BookItem[] => {
  const books: BookItem[] = [];
  for (const stage of curriculum) {
    for (const year of stage.years) {
      for (const subj of year.subjects) {
        books.push({
          title: `كتاب ${subj.name} - ${year.name}`,
          subject: subj.name,
          level: stage.name,
          year: year.name,
        });
      }
    }
  }
  return books;
};

const Library = () => {
  const { user, isActivated, loading, profile } = useAuth();
  const navigate = useNavigate();
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isActivated) return <Navigate to="/pending" replace />;

  const isPro = profile?.version === "pro";
  const stage = curriculum.find(s => s.id === selectedStage);
  const year = stage?.years.find(y => y.id === selectedYear);

  const generateSummary = async (subjectName: string, yearName: string, levelName: string) => {
    const key = `${subjectName}-${yearName}`;
    if (summaries[key]) return; // already generated
    
    if (!isPro) {
      toast.error("ملخصات AI متاحة فقط في نسخة PRO");
      return;
    }

    setLoadingKey(key);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-book-summary`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` 
        },
        body: JSON.stringify({ subject: subjectName, year: yearName, level: levelName }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setSummaries(prev => ({ ...prev, [key]: data.summary }));
      } else {
        toast.error("خطأ في توليد الملخص");
      }
    } catch {
      toast.error("خطأ في الاتصال");
    }
    setLoadingKey(null);
  };

  const goBack = () => {
    if (selectedYear) { setSelectedYear(null); }
    else if (selectedStage) { setSelectedStage(null); }
    else navigate("/");
  };

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const item = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

  return (
    <div className="min-h-screen relative">
      <StarsBackground />
      <div className="relative z-10 max-w-4xl mx-auto p-4 md:p-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/20 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-heading font-bold gold-text">مكتبة الكتب المدرسية</h1>
              <p className="text-xs text-muted-foreground">ملخصات AI لجميع الكتب الجزائرية</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button variant="ghost" onClick={goBack} className="gap-1 rounded-xl">
              <ArrowRight className="w-4 h-4" /> {!selectedStage ? "الرئيسية" : "رجوع"}
            </Button>
          </div>
        </motion.div>

        {/* Breadcrumb */}
        {selectedStage && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 mb-4 text-sm text-muted-foreground flex-wrap">
            <button onClick={() => { setSelectedStage(null); setSelectedYear(null); }}
              className="hover:text-primary transition-colors">المكتبة</button>
            {stage && (
              <span className="flex items-center gap-2">
                <ChevronLeft className="w-3 h-3" />
                <button onClick={() => setSelectedYear(null)} className={!selectedYear ? "text-primary font-medium" : "hover:text-primary transition-colors"}>
                  {stage.name}
                </button>
              </span>
            )}
            {year && (
              <span className="flex items-center gap-2">
                <ChevronLeft className="w-3 h-3" />
                <span className="text-primary font-medium">{year.name}</span>
              </span>
            )}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {/* Stages view */}
          {!selectedStage && (
            <motion.div key="stages" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="glass-card p-6 md:p-8 text-center mb-6">
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 3, repeat: Infinity }}>
                  <BookOpen className="w-12 h-12 text-primary mx-auto mb-3" />
                </motion.div>
                <h2 className="text-2xl font-heading font-bold gold-text mb-2">📚 مكتبة الكتب المدرسية</h2>
                <p className="text-muted-foreground text-sm max-w-lg mx-auto">
                  ملخصات ذكية بالذكاء الاصطناعي لجميع الكتب المدرسية الجزائرية
                </p>
              </div>

              <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {curriculum.map((s) => (
                  <motion.button key={s.id} variants={item} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => setSelectedStage(s.id)}
                    className="glass-card-hover p-6 text-center relative overflow-hidden group">
                    <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity" style={{ background: s.color }} />
                    <div className="relative z-10">
                      <span className="text-4xl mb-3 block">{s.icon}</span>
                      <h3 className="font-heading text-lg font-bold text-foreground mb-1">{s.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {s.years.reduce((acc, y) => acc + y.subjects.length, 0)} كتاب مدرسي
                      </p>
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            </motion.div>
          )}

          {/* Years view */}
          {selectedStage && !selectedYear && stage && (
            <motion.div key="years" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {stage.years.map((y) => (
                  <motion.button key={y.id} variants={item} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => setSelectedYear(y.id)}
                    className="glass-card-hover p-5 text-right">
                    <div className="flex items-center justify-between">
                      <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <h3 className="font-heading font-bold text-foreground">{y.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{y.subjects.length} كتاب</p>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            </motion.div>
          )}

          {/* Books/Subjects view */}
          {selectedYear && year && stage && (
            <motion.div key="books" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <div className="space-y-3">
                {year.subjects.map((subj) => {
                  const key = `${subj.name}-${year.name}`;
                  const summary = summaries[key];
                  const isLoading = loadingKey === key;

                  return (
                    <motion.div key={subj.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass-card p-5 text-right">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {isPro && (
                            <Button
                              size="sm"
                              variant={summary ? "outline" : "default"}
                              onClick={() => generateSummary(subj.name, year.name, stage.name)}
                              disabled={isLoading || !!summary}
                              className={`gap-1 rounded-xl text-xs ${!summary ? "bg-purple-600 hover:bg-purple-700 text-white" : ""}`}>
                              {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                              {summary ? "تم التلخيص" : "ملخص AI"}
                            </Button>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div>
                            <h3 className="font-heading font-bold text-foreground">كتاب {subj.name}</h3>
                            <p className="text-xs text-muted-foreground">{year.name} - {stage.name}</p>
                          </div>
                          <span className="text-3xl">{subj.icon}</span>
                        </div>
                      </div>

                      {/* Summary */}
                      {summary && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                          className="mt-3 p-4 rounded-xl bg-purple-500/5 border border-purple-500/20">
                          <div className="flex items-center gap-2 mb-2 justify-end">
                            <span className="text-xs font-heading text-purple-400">ملخص AI</span>
                            <FileText className="w-3 h-3 text-purple-400" />
                          </div>
                          <p className="text-sm text-muted-foreground font-body leading-relaxed whitespace-pre-wrap">
                            {summary}
                          </p>
                        </motion.div>
                      )}

                      {!isPro && (
                        <p className="text-xs text-muted-foreground mt-2">🔒 ملخصات AI متاحة في نسخة PRO</p>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Library;
