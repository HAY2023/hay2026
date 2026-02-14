import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StarsBackground from "@/components/StarsBackground";
import { toast } from "sonner";
import { ArrowRight, Plus, Trash2, BookOpen, FolderOpen, Sparkles, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Category { id: string; name: string; icon: string; color: string | null; created_by: string; }
interface Question { id: string; question_text: string; question_type: string; options: string[] | null; correct_answer: string; time_limit: number; category_id: string; created_by: string; }

const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

const Dashboard = () => {
  const { user, isActivated, loading } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedCat, setSelectedCat] = useState("");
  const [newQ, setNewQ] = useState({ text: "", type: "multiple_choice", options: ["", "", "", ""], answer: "", timeLimit: 30, catId: "" });
  const [newCat, setNewCat] = useState({ name: "", icon: "📚" });
  const [aiTopic, setAiTopic] = useState("");
  const [aiCount, setAiCount] = useState(5);
  const [aiType, setAiType] = useState("multiple_choice");
  const [aiLoading, setAiLoading] = useState(false);

  const fetchAll = async () => {
    if (!user) return;
    const [c, q] = await Promise.all([
      supabase.from("categories").select("*").eq("created_by", user.id),
      supabase.from("questions").select("*").eq("created_by", user.id),
    ]);
    if (c.data) { setCategories(c.data as Category[]); if (!selectedCat && c.data.length) setSelectedCat(c.data[0].id); }
    if (q.data) setQuestions(q.data as Question[]);
  };

  useEffect(() => { if (user && isActivated) fetchAll(); }, [user, isActivated]);

  const addCategory = async () => {
    if (!newCat.name.trim() || !user) return;
    await supabase.from("categories").insert({ name: newCat.name, icon: newCat.icon, created_by: user.id });
    setNewCat({ name: "", icon: "📚" });
    toast.success("تمت إضافة القسم");
    fetchAll();
  };

  const deleteCategory = async (id: string) => {
    await supabase.from("categories").delete().eq("id", id);
    toast.success("تم حذف القسم");
    fetchAll();
  };

  const addQuestion = async () => {
    if (!user) return;
    const catId = newQ.catId || selectedCat;
    if (!catId || !newQ.text.trim() || !newQ.answer.trim()) { toast.error("أكمل جميع الحقول"); return; }
    const opts = newQ.type === "multiple_choice" ? newQ.options.filter(o => o.trim()) : null;
    if (newQ.type === "multiple_choice" && (!opts || opts.length < 2)) { toast.error("أضف خيارين على الأقل"); return; }
    await supabase.from("questions").insert({
      category_id: catId, question_text: newQ.text, question_type: newQ.type,
      options: opts, correct_answer: newQ.answer, time_limit: newQ.timeLimit, created_by: user.id,
    });
    setNewQ({ text: "", type: "multiple_choice", options: ["", "", "", ""], answer: "", timeLimit: 30, catId: "" });
    toast.success("تمت إضافة السؤال");
    fetchAll();
  };

  const deleteQuestion = async (id: string) => {
    await supabase.from("questions").delete().eq("id", id);
    toast.success("تم حذف السؤال");
    fetchAll();
  };

  const generateWithAI = async () => {
    if (!user) return;
    const catId = newQ.catId || selectedCat;
    if (!catId) { toast.error("اختر قسماً أولاً"); return; }
    if (!aiTopic.trim()) { toast.error("اكتب الموضوع"); return; }
    setAiLoading(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-questions`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ topic: aiTopic, count: aiCount, type: aiType }),
      });
      if (!resp.ok) { const err = await resp.json(); toast.error(err.error || "حدث خطأ"); return; }
      const data = await resp.json();
      if (!data.questions?.length) { toast.error("لم يتم توليد أسئلة"); return; }
      const inserts = data.questions.map((q: any) => ({
        category_id: catId, question_text: q.question_text,
        question_type: q.options?.length ? "multiple_choice" : "text",
        options: q.options?.length ? q.options : null,
        correct_answer: q.correct_answer, time_limit: q.time_limit || 30, created_by: user.id,
      }));
      const { error } = await supabase.from("questions").insert(inserts);
      if (error) { toast.error("خطأ في حفظ الأسئلة"); return; }
      toast.success(`تم توليد ${inserts.length} سؤال بنجاح!`);
      setAiTopic("");
      fetchAll();
    } catch { toast.error("حدث خطأ في الاتصال"); }
    finally { setAiLoading(false); }
  };

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isActivated) return <Navigate to="/pending" replace />;

  const filteredQ = selectedCat ? questions.filter(q => q.category_id === selectedCat) : questions;

  return (
    <div className="min-h-screen relative">
      <StarsBackground />
      <div className="relative z-10 max-w-2xl mx-auto p-4 md:p-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-heading font-bold gold-text">إدارة أسئلتي</h1>
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-1 rounded-xl">
            <ArrowRight className="w-4 h-4" /> العودة
          </Button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Tabs defaultValue="questions" className="w-full">
            <TabsList className="glass-card w-full justify-start mb-6 p-1 rounded-xl">
              <TabsTrigger value="questions" className="gap-1 font-heading rounded-lg"><BookOpen className="w-4 h-4" /> الأسئلة</TabsTrigger>
              <TabsTrigger value="ai" className="gap-1 font-heading rounded-lg"><Sparkles className="w-4 h-4" /> توليد AI</TabsTrigger>
              <TabsTrigger value="categories" className="gap-1 font-heading rounded-lg"><FolderOpen className="w-4 h-4" /> الأقسام</TabsTrigger>
            </TabsList>

            {/* Questions Tab */}
            <TabsContent value="questions" className="space-y-4">
              <div className="glass-card p-5 space-y-3">
                <h3 className="font-heading font-bold text-foreground">إضافة سؤال جديد</h3>
                {categories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">أضف قسماً أولاً من تبويب "الأقسام"</p>
                ) : (
                  <>
                    <select
                      value={newQ.catId || selectedCat}
                      onChange={(e) => { setNewQ(p => ({ ...p, catId: e.target.value })); setSelectedCat(e.target.value); }}
                      className="w-full bg-secondary/50 border border-border/50 rounded-xl p-3 text-foreground text-right"
                    >
                      {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                    </select>
                    <Textarea value={newQ.text} onChange={e => setNewQ(p => ({ ...p, text: e.target.value }))} placeholder="نص السؤال" className="bg-secondary/50 text-right rounded-xl min-h-[80px]" />
                    <select value={newQ.type} onChange={e => setNewQ(p => ({ ...p, type: e.target.value }))} className="w-full bg-secondary/50 border border-border/50 rounded-xl p-3 text-foreground text-right">
                      <option value="multiple_choice">اختيارات متعددة</option>
                      <option value="text">كتابة</option>
                    </select>
                    <AnimatePresence>
                      {newQ.type === "multiple_choice" && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="grid grid-cols-2 gap-2">
                          {newQ.options.map((o, i) => (
                            <Input key={i} value={o} onChange={e => { const opts = [...newQ.options]; opts[i] = e.target.value; setNewQ(p => ({ ...p, options: opts })); }}
                              placeholder={`الخيار ${i + 1}`} className="bg-secondary/50 text-right rounded-xl" />
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <Input value={newQ.answer} onChange={e => setNewQ(p => ({ ...p, answer: e.target.value }))} placeholder="الإجابة الصحيحة" className="bg-secondary/50 text-right rounded-xl" />
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">المؤقت (ثانية):</span>
                      <Input type="number" value={newQ.timeLimit} onChange={e => setNewQ(p => ({ ...p, timeLimit: parseInt(e.target.value) || 30 }))} className="w-20 bg-secondary/50 rounded-xl" />
                    </div>
                    <motion.div whileTap={{ scale: 0.97 }}>
                      <Button onClick={addQuestion} className="gold-gradient text-background gap-1 rounded-xl shadow-lg shadow-primary/15"><Plus className="w-4 h-4" /> إضافة السؤال</Button>
                    </motion.div>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <AnimatePresence>
                  {filteredQ.map(q => (
                    <motion.div key={q.id} layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-card p-4 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-foreground truncate">{q.question_text}</p>
                        <p className="text-xs text-muted-foreground">✅ {q.correct_answer} | {q.question_type === "multiple_choice" ? "اختيارات" : "كتابة"}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deleteQuestion(q.id)} className="text-destructive shrink-0 rounded-xl"><Trash2 className="w-4 h-4" /></Button>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {filteredQ.length === 0 && (
                  <div className="glass-card p-8 text-center">
                    <p className="text-muted-foreground text-sm">لا توجد أسئلة بعد</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* AI Generation Tab */}
            <TabsContent value="ai" className="space-y-4">
              <div className="glass-card p-6 space-y-4 relative overflow-hidden">
                <div className="absolute inset-0 animate-shimmer" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 justify-end mb-2">
                    <h3 className="font-heading font-bold gold-text text-xl">توليد أسئلة بالذكاء الاصطناعي</h3>
                    <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                      <Sparkles className="w-5 h-5 text-primary" />
                    </motion.div>
                  </div>
                  {categories.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-right">أضف قسماً أولاً من تبويب "الأقسام"</p>
                  ) : (
                    <>
                      <select
                        value={newQ.catId || selectedCat}
                        onChange={(e) => { setNewQ(p => ({ ...p, catId: e.target.value })); setSelectedCat(e.target.value); }}
                        className="w-full bg-secondary/50 border border-border/50 rounded-xl p-3 text-foreground text-right"
                      >
                        {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                      </select>
                      <Input value={aiTopic} onChange={e => setAiTopic(e.target.value)} placeholder="الموضوع (مثال: عواصم الدول العربية)" className="bg-secondary/50 text-right rounded-xl h-12" />
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="text-xs text-muted-foreground block mb-1">عدد الأسئلة</label>
                          <Input type="number" value={aiCount} onChange={e => setAiCount(parseInt(e.target.value) || 5)} min={1} max={20} className="bg-secondary/50 rounded-xl" />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-muted-foreground block mb-1">نوع الأسئلة</label>
                          <select value={aiType} onChange={e => setAiType(e.target.value)} className="w-full bg-secondary/50 border border-border/50 rounded-xl p-2.5 text-foreground text-right">
                            <option value="multiple_choice">اختيارات متعددة</option>
                            <option value="text">كتابة</option>
                          </select>
                        </div>
                      </div>
                      <motion.div whileTap={{ scale: 0.97 }}>
                        <Button onClick={generateWithAI} disabled={aiLoading} className="w-full gold-gradient text-background gap-2 text-lg py-6 rounded-xl shadow-lg shadow-primary/20">
                          {aiLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> جاري التوليد...</> : <><Sparkles className="w-5 h-5" /> توليد الأسئلة</>}
                        </Button>
                      </motion.div>
                    </>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Categories Tab */}
            <TabsContent value="categories" className="space-y-4">
              <div className="glass-card p-5 flex gap-3 items-center">
                <Input value={newCat.icon} onChange={e => setNewCat(p => ({ ...p, icon: e.target.value }))} className="w-16 bg-secondary/50 text-center rounded-xl text-xl" placeholder="🎯" />
                <Input value={newCat.name} onChange={e => setNewCat(p => ({ ...p, name: e.target.value }))} className="flex-1 bg-secondary/50 text-right rounded-xl" placeholder="اسم القسم" />
                <motion.div whileTap={{ scale: 0.9 }}>
                  <Button onClick={addCategory} className="gold-gradient text-background rounded-xl"><Plus className="w-4 h-4" /></Button>
                </motion.div>
              </div>
              <div className="space-y-2">
                <AnimatePresence>
                  {categories.map(c => (
                    <motion.div key={c.id} layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-card p-4 flex items-center justify-between">
                      <span className="font-heading text-foreground text-lg">{c.icon} {c.name}</span>
                      <Button variant="ghost" size="icon" onClick={() => deleteCategory(c.id)} className="text-destructive rounded-xl"><Trash2 className="w-4 h-4" /></Button>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {categories.length === 0 && (
                  <div className="glass-card p-8 text-center">
                    <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 3, repeat: Infinity }} className="text-4xl mb-3">📂</motion.div>
                    <p className="text-muted-foreground text-sm">لا توجد أقسام بعد. أضف قسماً للبدء!</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
