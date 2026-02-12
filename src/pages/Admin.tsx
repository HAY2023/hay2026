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
import { ArrowRight, Plus, Trash2, Check, X, Users, BookOpen, FolderOpen, Sparkles, Loader2 } from "lucide-react";

interface Profile { id: string; user_id: string; display_name: string | null; is_activated: boolean; activation_code: string | null; }
interface Category { id: string; name: string; icon: string; color: string | null; }
interface Question { id: string; question_text: string; question_type: string; options: string[] | null; correct_answer: string; time_limit: number; category_id: string; }

const Admin = () => {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<Profile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>("");

  const [newQ, setNewQ] = useState({ text: "", type: "multiple_choice", options: ["", "", "", ""], answer: "", timeLimit: 30, catId: "" });
  const [newCat, setNewCat] = useState({ name: "", icon: "📚" });

  // AI generation
  const [aiTopic, setAiTopic] = useState("");
  const [aiCount, setAiCount] = useState(5);
  const [aiType, setAiType] = useState("multiple_choice");
  const [aiLoading, setAiLoading] = useState(false);

  const fetchAll = async () => {
    const [u, c, q] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("categories").select("*"),
      supabase.from("questions").select("*"),
    ]);
    if (u.data) setUsers(u.data as Profile[]);
    if (c.data) { setCategories(c.data as Category[]); if (!selectedCat && c.data.length) setSelectedCat(c.data[0].id); }
    if (q.data) setQuestions(q.data as Question[]);
  };

  useEffect(() => { if (isAdmin) fetchAll(); }, [isAdmin]);

  const toggleActivation = async (p: Profile) => {
    await supabase.from("profiles").update({ is_activated: !p.is_activated }).eq("id", p.id);
    toast.success(p.is_activated ? "تم تعطيل الحساب" : "تم تفعيل الحساب");
    fetchAll();
  };

  const addCategory = async () => {
    if (!newCat.name.trim()) return;
    await supabase.from("categories").insert({ name: newCat.name, icon: newCat.icon });
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
    const catId = newQ.catId || selectedCat;
    if (!catId || !newQ.text.trim() || !newQ.answer.trim()) { toast.error("أكمل جميع الحقول"); return; }
    const opts = newQ.type === "multiple_choice" ? newQ.options.filter(o => o.trim()) : null;
    if (newQ.type === "multiple_choice" && (!opts || opts.length < 2)) { toast.error("أضف خيارين على الأقل"); return; }
    await supabase.from("questions").insert({
      category_id: catId,
      question_text: newQ.text,
      question_type: newQ.type,
      options: opts,
      correct_answer: newQ.answer,
      time_limit: newQ.timeLimit,
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

  // AI Generate Questions
  const generateWithAI = async () => {
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

      if (!resp.ok) {
        const err = await resp.json();
        toast.error(err.error || "حدث خطأ");
        return;
      }

      const data = await resp.json();
      if (!data.questions?.length) { toast.error("لم يتم توليد أسئلة"); return; }

      // Insert generated questions
      const inserts = data.questions.map((q: any) => ({
        category_id: catId,
        question_text: q.question_text,
        question_type: q.options?.length ? "multiple_choice" : "text",
        options: q.options?.length ? q.options : null,
        correct_answer: q.correct_answer,
        time_limit: q.time_limit || 30,
      }));

      const { error } = await supabase.from("questions").insert(inserts);
      if (error) { toast.error("خطأ في حفظ الأسئلة"); return; }

      toast.success(`تم توليد ${inserts.length} سؤال بنجاح!`);
      setAiTopic("");
      fetchAll();
    } catch (e) {
      toast.error("حدث خطأ في الاتصال");
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) return null;
  if (!user || !isAdmin) return <Navigate to="/" replace />;

  const filteredQ = selectedCat ? questions.filter(q => q.category_id === selectedCat) : questions;

  return (
    <div className="min-h-screen relative">
      <StarsBackground />
      <div className="relative z-10 max-w-4xl mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-heading font-bold gold-text">لوحة تحكم الأدمن</h1>
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-1">
            <ArrowRight className="w-4 h-4" /> العودة
          </Button>
        </div>

        <Tabs defaultValue="questions" className="w-full">
          <TabsList className="glass-card w-full justify-start mb-6 p-1">
            <TabsTrigger value="questions" className="gap-1 font-heading"><BookOpen className="w-4 h-4" /> الأسئلة</TabsTrigger>
            <TabsTrigger value="ai" className="gap-1 font-heading"><Sparkles className="w-4 h-4" /> توليد AI</TabsTrigger>
            <TabsTrigger value="categories" className="gap-1 font-heading"><FolderOpen className="w-4 h-4" /> الأقسام</TabsTrigger>
            <TabsTrigger value="users" className="gap-1 font-heading"><Users className="w-4 h-4" /> المستخدمون</TabsTrigger>
          </TabsList>

          {/* Questions Tab */}
          <TabsContent value="questions" className="space-y-4">
            <div className="glass-card p-4 space-y-3">
              <h3 className="font-heading font-bold text-foreground">إضافة سؤال جديد</h3>
              <select
                value={newQ.catId || selectedCat}
                onChange={(e) => { setNewQ(p => ({ ...p, catId: e.target.value })); setSelectedCat(e.target.value); }}
                className="w-full bg-secondary/50 border border-border/50 rounded-lg p-2 text-foreground text-right"
              >
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
              <Textarea value={newQ.text} onChange={e => setNewQ(p => ({ ...p, text: e.target.value }))} placeholder="نص السؤال" className="bg-secondary/50 text-right" />
              <select value={newQ.type} onChange={e => setNewQ(p => ({ ...p, type: e.target.value }))} className="w-full bg-secondary/50 border border-border/50 rounded-lg p-2 text-foreground text-right">
                <option value="multiple_choice">اختيارات متعددة</option>
                <option value="text">كتابة</option>
              </select>
              {newQ.type === "multiple_choice" && (
                <div className="grid grid-cols-2 gap-2">
                  {newQ.options.map((o, i) => (
                    <Input key={i} value={o} onChange={e => { const opts = [...newQ.options]; opts[i] = e.target.value; setNewQ(p => ({ ...p, options: opts })); }}
                      placeholder={`الخيار ${i + 1}`} className="bg-secondary/50 text-right" />
                  ))}
                </div>
              )}
              <Input value={newQ.answer} onChange={e => setNewQ(p => ({ ...p, answer: e.target.value }))} placeholder="الإجابة الصحيحة" className="bg-secondary/50 text-right" />
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">المؤقت (ثانية):</span>
                <Input type="number" value={newQ.timeLimit} onChange={e => setNewQ(p => ({ ...p, timeLimit: parseInt(e.target.value) || 30 }))} className="w-20 bg-secondary/50" />
              </div>
              <Button onClick={addQuestion} className="gold-gradient text-background gap-1"><Plus className="w-4 h-4" /> إضافة السؤال</Button>
            </div>

            <div className="space-y-2">
              {filteredQ.map(q => (
                <div key={q.id} className="glass-card p-3 flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-body text-foreground">{q.question_text}</p>
                    <p className="text-xs text-muted-foreground">الإجابة: {q.correct_answer} | {q.question_type === "multiple_choice" ? "اختيارات" : "كتابة"}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteQuestion(q.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* AI Generation Tab */}
          <TabsContent value="ai" className="space-y-4">
            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center gap-2 justify-end">
                <h3 className="font-heading font-bold gold-text text-xl">توليد أسئلة بالذكاء الاصطناعي</h3>
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground text-right">اكتب الموضوع وسيتم توليد أسئلة تلقائياً وإضافتها للقسم المختار</p>

              <select
                value={newQ.catId || selectedCat}
                onChange={(e) => { setNewQ(p => ({ ...p, catId: e.target.value })); setSelectedCat(e.target.value); }}
                className="w-full bg-secondary/50 border border-border/50 rounded-lg p-2 text-foreground text-right"
              >
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>

              <Input value={aiTopic} onChange={e => setAiTopic(e.target.value)} placeholder="الموضوع (مثال: عواصم الدول العربية)" className="bg-secondary/50 text-right" />

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground">عدد الأسئلة</label>
                  <Input type="number" value={aiCount} onChange={e => setAiCount(parseInt(e.target.value) || 5)} min={1} max={20} className="bg-secondary/50" />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground">نوع الأسئلة</label>
                  <select value={aiType} onChange={e => setAiType(e.target.value)} className="w-full bg-secondary/50 border border-border/50 rounded-lg p-2 text-foreground text-right">
                    <option value="multiple_choice">اختيارات متعددة</option>
                    <option value="text">كتابة</option>
                  </select>
                </div>
              </div>

              <Button onClick={generateWithAI} disabled={aiLoading} className="w-full gold-gradient text-background gap-2 text-lg py-6">
                {aiLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> جاري التوليد...</> : <><Sparkles className="w-5 h-5" /> توليد الأسئلة</>}
              </Button>
            </div>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-4">
            <div className="glass-card p-4 flex gap-3">
              <Input value={newCat.icon} onChange={e => setNewCat(p => ({ ...p, icon: e.target.value }))} className="w-16 bg-secondary/50 text-center" placeholder="🎯" />
              <Input value={newCat.name} onChange={e => setNewCat(p => ({ ...p, name: e.target.value }))} className="flex-1 bg-secondary/50 text-right" placeholder="اسم القسم" />
              <Button onClick={addCategory} className="gold-gradient text-background"><Plus className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-2">
              {categories.map(c => (
                <div key={c.id} className="glass-card p-3 flex items-center justify-between">
                  <span className="font-heading text-foreground">{c.icon} {c.name}</span>
                  <Button variant="ghost" size="icon" onClick={() => deleteCategory(c.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-2">
            {users.map(u => (
              <div key={u.id} className="glass-card p-3 flex items-center justify-between">
                <div>
                  <p className="font-heading text-foreground">{u.display_name || "بدون اسم"}</p>
                  <p className="text-xs text-muted-foreground">{u.is_activated ? "✅ مفعّل" : "⏳ غير مفعّل"}</p>
                </div>
                <Button variant={u.is_activated ? "outline" : "default"} size="sm" onClick={() => toggleActivation(u)}
                  className={u.is_activated ? "" : "gold-gradient text-background"}>
                  {u.is_activated ? <><X className="w-4 h-4 ml-1" /> تعطيل</> : <><Check className="w-4 h-4 ml-1" /> تفعيل</>}
                </Button>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
