import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import StarsBackground from "@/components/StarsBackground";
import { Button } from "@/components/ui/button";
import { curriculum, Stage, YearLevel, Subject } from "@/data/curriculum";
import { ArrowRight, GraduationCap, BookOpen, Sparkles, ChevronLeft, Award } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import NotificationBell from "@/components/NotificationBell";

type View = "stages" | "years" | "subjects" | "exams";

const Curriculum = () => {
  const { user, isActivated, loading, profile } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<View>("stages");
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [selectedYear, setSelectedYear] = useState<YearLevel | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isActivated) return <Navigate to="/pending" replace />;

  const isPro = profile?.version === "pro";

  const goBack = () => {
    if (view === "exams") { setView("subjects"); setSelectedSubject(null); }
    else if (view === "subjects") { setView("years"); setSelectedYear(null); }
    else if (view === "years") { setView("stages"); setSelectedStage(null); }
    else navigate("/");
  };

  const selectStage = (s: Stage) => { setSelectedStage(s); setView("years"); };
  const selectYear = (y: YearLevel) => { setSelectedYear(y); setView("subjects"); };
  const selectSubject = (s: Subject) => { setSelectedSubject(s); setView("exams"); };

  const breadcrumb = () => {
    const parts: string[] = [];
    if (selectedStage) parts.push(selectedStage.name);
    if (selectedYear) parts.push(selectedYear.name);
    if (selectedSubject) parts.push(selectedSubject.name);
    return parts;
  };

  const startAIExam = () => {
    if (!selectedSubject || !selectedYear) return;
    const level = selectedStage?.id === "primary" ? "ابتدائي" : selectedStage?.id === "middle" ? "متوسط" : "ثانوي";
    navigate(`/pro-exam?topic=${encodeURIComponent(selectedSubject.name)}&level=${encodeURIComponent(level)}&year=${encodeURIComponent(selectedYear.name)}`);
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
              <GraduationCap className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-heading font-bold gold-text">المنهج الدراسي الجزائري</h1>
              <p className="text-xs text-muted-foreground">جميع المواد والمراحل</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button variant="ghost" onClick={goBack} className="gap-1 rounded-xl">
              <ArrowRight className="w-4 h-4" /> {view === "stages" ? "الرئيسية" : "رجوع"}
            </Button>
          </div>
        </motion.div>

        {/* Breadcrumb */}
        {breadcrumb().length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 mb-4 text-sm text-muted-foreground flex-wrap">
            <button onClick={() => { setView("stages"); setSelectedStage(null); setSelectedYear(null); setSelectedSubject(null); }}
              className="hover:text-primary transition-colors">الرئيسية</button>
            {breadcrumb().map((p, i) => (
              <span key={i} className="flex items-center gap-2">
                <ChevronLeft className="w-3 h-3" />
                <span className={i === breadcrumb().length - 1 ? "text-primary font-medium" : ""}>{p}</span>
              </span>
            ))}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {/* STAGES VIEW */}
          {view === "stages" && (
            <motion.div key="stages" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="space-y-4">
              {/* Hero */}
              <div className="glass-card p-6 md:p-8 text-center mb-6">
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 3, repeat: Infinity }}>
                  <BookOpen className="w-12 h-12 text-primary mx-auto mb-3" />
                </motion.div>
                <h2 className="text-2xl md:text-3xl font-heading font-bold gold-text mb-2">الموقع الأول لتحضير الفروض والاختبارات</h2>
                <p className="text-muted-foreground text-sm max-w-lg mx-auto">
                  نماذج اختبارات AI حسب المنهج الجزائري الرسمي لجميع المراحل والمواد
                </p>
              </div>

              <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {curriculum.map((stage) => (
                  <motion.button key={stage.id} variants={item} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => selectStage(stage)}
                    className="glass-card-hover p-6 text-center relative overflow-hidden group">
                    <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity" style={{ background: stage.color }} />
                    <div className="relative z-10">
                      <span className="text-4xl mb-3 block">{stage.icon}</span>
                      <h3 className="font-heading text-lg font-bold text-foreground mb-1">{stage.name}</h3>
                      <p className="text-xs text-muted-foreground">{stage.years.length} سنوات دراسية</p>
                      {stage.certificate && (
                        <div className="flex items-center justify-center gap-1 mt-2 text-xs text-primary">
                          <Award className="w-3 h-3" />
                          <span>{stage.certificate.name}</span>
                        </div>
                      )}
                    </div>
                  </motion.button>
                ))}
              </motion.div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mt-6">
                {[
                  { label: "مرحلة تعليمية", value: "3", icon: "🏫" },
                  { label: "سنة دراسية", value: "13", icon: "📅" },
                  { label: "مادة دراسية", value: "25+", icon: "📚" },
                ].map((s, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }}
                    className="glass-card p-4 text-center">
                    <span className="text-2xl">{s.icon}</span>
                    <p className="text-xl font-heading font-bold gold-text">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* YEARS VIEW */}
          {view === "years" && selectedStage && (
            <motion.div key="years" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedStage.years.map((year) => (
                  <motion.button key={year.id} variants={item} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => selectYear(year)}
                    className="glass-card-hover p-5 text-right">
                    <div className="flex items-center justify-between">
                      <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <h3 className="font-heading font-bold text-foreground">{year.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{year.subjects.length} مادة دراسية</p>
                      </div>
                    </div>
                  </motion.button>
                ))}

                {selectedStage.certificate && (
                  <motion.button variants={item} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    className="glass-card-hover p-5 text-right col-span-full border-primary/20">
                    <div className="flex items-center justify-between">
                      <Award className="w-5 h-5 text-primary" />
                      <div>
                        <h3 className="font-heading font-bold gold-text">{selectedStage.certificate.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1">مواضيع وحلول الشهادات الرسمية</p>
                      </div>
                    </div>
                  </motion.button>
                )}
              </motion.div>
            </motion.div>
          )}

          {/* SUBJECTS VIEW */}
          {view === "subjects" && selectedYear && (
            <motion.div key="subjects" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {selectedYear.subjects.map((subj) => (
                  <motion.button key={subj.id} variants={item} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={() => selectSubject(subj)}
                    className="glass-card-hover p-5 text-center">
                    <span className="text-3xl mb-2 block">{subj.icon}</span>
                    <h3 className="font-heading text-sm font-bold text-foreground">{subj.name}</h3>
                  </motion.button>
                ))}
              </motion.div>
            </motion.div>
          )}

          {/* EXAMS VIEW - Subject selected */}
          {view === "exams" && selectedSubject && selectedYear && (
            <motion.div key="exams" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              className="space-y-4">
              <div className="glass-card p-6 text-center">
                <span className="text-5xl mb-3 block">{selectedSubject.icon}</span>
                <h2 className="text-xl font-heading font-bold gold-text mb-1">{selectedSubject.name}</h2>
                <p className="text-sm text-muted-foreground">{selectedYear.name}</p>
              </div>

              <div className="glass-card p-5 space-y-3">
                <h3 className="font-heading font-bold text-foreground text-right flex items-center gap-2 justify-end">
                  <span>نماذج الاختبارات</span>
                  <BookOpen className="w-4 h-4 text-primary" />
                </h3>

                {/* Trimesters */}
                {["الفصل الأول", "الفصل الثاني", "الفصل الثالث"].map((trimester, ti) => (
                  <div key={ti} className="glass-card p-4">
                    <h4 className="text-sm font-heading font-bold text-foreground mb-3 text-right">{trimester}</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <motion.button whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          if (isPro) {
                            navigate(`/pro-exam?topic=${encodeURIComponent(`${selectedSubject.name} - ${trimester} - فروض`)}&level=${encodeURIComponent(selectedStage?.id === "primary" ? "ابتدائي" : selectedStage?.id === "middle" ? "متوسط" : "ثانوي")}`);
                          } else {
                            navigate(`/pro-exam`);
                          }
                        }}
                        className="glass-card-hover p-3 text-center text-sm">
                        <span className="text-lg mb-1 block">📝</span>
                        <span className="text-foreground font-medium">فروض</span>
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          if (isPro) {
                            navigate(`/pro-exam?topic=${encodeURIComponent(`${selectedSubject.name} - ${trimester} - اختبارات`)}&level=${encodeURIComponent(selectedStage?.id === "primary" ? "ابتدائي" : selectedStage?.id === "middle" ? "متوسط" : "ثانوي")}`);
                          } else {
                            navigate(`/pro-exam`);
                          }
                        }}
                        className="glass-card-hover p-3 text-center text-sm">
                        <span className="text-lg mb-1 block">📋</span>
                        <span className="text-foreground font-medium">اختبارات</span>
                      </motion.button>
                    </div>
                  </div>
                ))}
              </div>

              {/* AI Generate button */}
              {isPro && (
                <motion.div whileTap={{ scale: 0.97 }}>
                  <Button onClick={startAIExam}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white gap-2 h-14 text-base font-heading rounded-xl shadow-lg shadow-purple-500/20">
                    <Sparkles className="w-5 h-5" /> توليد نموذج اختبار AI - {selectedSubject.name}
                  </Button>
                </motion.div>
              )}

              {!isPro && (
                <div className="glass-card p-4 text-center border-purple-500/20">
                  <p className="text-sm text-muted-foreground mb-2">توليد نماذج AI متاح فقط في نسخة PRO</p>
                  <span className="text-xs text-purple-400">🔒 ترقية إلى PRO للوصول</span>
                </div>
              )}

              {/* Additional resources */}
              <div className="grid grid-cols-2 gap-3">
                <div className="glass-card p-4 text-center">
                  <span className="text-2xl mb-1 block">📚</span>
                  <span className="text-xs text-muted-foreground">دروس وملخصات</span>
                </div>
                <div className="glass-card p-4 text-center">
                  <span className="text-2xl mb-1 block">✏️</span>
                  <span className="text-xs text-muted-foreground">تمارين محلولة</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Curriculum;
