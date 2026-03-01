import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StarsBackground from "@/components/StarsBackground";
import { toast } from "sonner";
import { ArrowRight, Check, X, Users, Shield, KeyRound, Copy, RefreshCw, Plus } from "lucide-react";
import { motion } from "framer-motion";

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  is_activated: boolean;
  version: string | null;
}

interface ActivationCode {
  id: string;
  code: string;
  version: string;
  is_used: boolean;
  used_by: string | null;
  created_at: string;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, x: 20 },
  show: { opacity: 1, x: 0 },
};

const generateCode = (version: string): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const rand = (len: number) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yy = String(now.getFullYear()).slice(-2);
  return `${rand(5)}-${rand(5)}-${mm}-${yy}`;
};

const Admin = () => {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<Profile[]>([]);
  const [codes, setCodes] = useState<ActivationCode[]>([]);
  const [tab, setTab] = useState<"users" | "codes">("users");
  const [genVersion, setGenVersion] = useState<"hay" | "pro">("hay");
  const [genCount, setGenCount] = useState(1);

  const fetchUsers = async () => {
    const { data } = await supabase.from("profiles").select("*");
    if (data) setUsers(data as Profile[]);
  };

  const fetchCodes = async () => {
    const { data } = await supabase.from("activation_codes").select("*").order("created_at", { ascending: false });
    if (data) setCodes(data as ActivationCode[]);
  };

  useEffect(() => {
    if (isAdmin) { fetchUsers(); fetchCodes(); }
  }, [isAdmin]);

  const toggleActivation = async (p: Profile) => {
    await supabase.from("profiles").update({ is_activated: !p.is_activated }).eq("id", p.id);
    toast.success(p.is_activated ? "تم تعطيل الحساب" : "تم تفعيل الحساب");
    fetchUsers();
  };

  const generateCodes = async () => {
    const newCodes = Array.from({ length: genCount }, () => ({
      code: generateCode(genVersion),
      version: genVersion,
    }));
    const { error } = await supabase.from("activation_codes").insert(newCodes);
    if (error) { toast.error("خطأ في إنشاء الأكواد"); return; }
    toast.success(`تم إنشاء ${genCount} كود ${genVersion.toUpperCase()}`);
    fetchCodes();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("تم نسخ الكود");
  };

  const deleteCode = async (id: string) => {
    await supabase.from("activation_codes").delete().eq("id", id);
    toast.success("تم حذف الكود");
    fetchCodes();
  };

  if (loading) return null;
  if (!user || !isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen relative">
      <StarsBackground />
      <div className="relative z-10 max-w-2xl mx-auto p-4 md:p-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-heading font-bold gold-text">لوحة الإدارة</h1>
          </div>
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-1 rounded-xl">
            <ArrowRight className="w-4 h-4" /> العودة
          </Button>
        </motion.div>

        {/* Tab switcher */}
        <div className="flex gap-2 mb-6">
          <Button variant={tab === "users" ? "default" : "outline"} onClick={() => setTab("users")}
            className={`rounded-xl gap-1 flex-1 ${tab === "users" ? "gold-gradient text-background" : ""}`}>
            <Users className="w-4 h-4" /> المستخدمون ({users.length})
          </Button>
          <Button variant={tab === "codes" ? "default" : "outline"} onClick={() => setTab("codes")}
            className={`rounded-xl gap-1 flex-1 ${tab === "codes" ? "gold-gradient text-background" : ""}`}>
            <KeyRound className="w-4 h-4" /> أكواد التفعيل
          </Button>
        </div>

        {tab === "users" && (
          <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
            {users.map((u) => (
              <motion.div key={u.id} variants={item} className="glass-card p-4 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-heading font-bold text-foreground text-lg truncate">{u.display_name || "بدون اسم"}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{u.is_activated ? "✅ مفعّل" : "⏳ غير مفعّل"}</span>
                    {u.version && <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">{u.version.toUpperCase()}</span>}
                  </div>
                </div>
                <motion.div whileTap={{ scale: 0.95 }}>
                  <Button variant={u.is_activated ? "outline" : "default"} size="sm" onClick={() => toggleActivation(u)}
                    className={`rounded-xl ${u.is_activated ? "" : "gold-gradient text-background shadow-lg shadow-primary/15"}`}>
                    {u.is_activated ? <><X className="w-4 h-4 ml-1" /> تعطيل</> : <><Check className="w-4 h-4 ml-1" /> تفعيل</>}
                  </Button>
                </motion.div>
              </motion.div>
            ))}
            {users.length === 0 && (
              <div className="glass-card p-10 text-center">
                <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">لا يوجد مستخدمون بعد</p>
              </div>
            )}
          </motion.div>
        )}

        {tab === "codes" && (
          <div className="space-y-4">
            {/* Generate codes */}
            <div className="glass-card p-5 space-y-4">
              <h3 className="font-heading font-bold text-foreground text-right">إنشاء أكواد تفعيل عامة</h3>
              <p className="text-xs text-muted-foreground text-right">هذه الأكواد يمكن لأي مستخدم استخدامها لتفعيل حسابه</p>
              <div className="flex gap-3 items-end flex-wrap">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">النسخة</label>
                  <select value={genVersion} onChange={e => setGenVersion(e.target.value as "hay" | "pro")}
                    className="bg-secondary/50 border border-border/50 rounded-xl p-2.5 text-foreground">
                    <option value="hay">HAY - أساسي</option>
                    <option value="pro">PRO - متقدم</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">العدد</label>
                  <Input type="number" value={genCount} onChange={e => setGenCount(Math.max(1, parseInt(e.target.value) || 1))}
                    min={1} max={50} className="w-20 bg-secondary/50 rounded-xl" />
                </div>
                <motion.div whileTap={{ scale: 0.95 }}>
                  <Button onClick={generateCodes} className="gold-gradient text-background gap-1 rounded-xl shadow-lg shadow-primary/15">
                    <Plus className="w-4 h-4" /> إنشاء
                  </Button>
                </motion.div>
              </div>
            </div>

            {/* Codes list */}
            <motion.div variants={container} initial="hidden" animate="show" className="space-y-2">
              {codes.map(c => (
                <motion.div key={c.id} variants={item} className={`glass-card p-3 flex items-center justify-between gap-2 ${c.is_used ? "opacity-50" : ""}`}>
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${c.version === "pro" ? "bg-purple-500/20 text-purple-400" : "bg-primary/10 text-primary"}`}>
                      {c.version.toUpperCase()}
                    </span>
                    <code className="text-sm font-mono text-foreground truncate" dir="ltr">{c.code}</code>
                    {c.is_used && <span className="text-xs text-muted-foreground">✅ مستخدم</span>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!c.is_used && (
                      <Button variant="ghost" size="icon" onClick={() => copyCode(c.code)} className="rounded-xl h-8 w-8">
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => deleteCode(c.id)} className="rounded-xl h-8 w-8 text-destructive">
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </motion.div>
              ))}
              {codes.length === 0 && (
                <div className="glass-card p-8 text-center">
                  <KeyRound className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground text-sm">لا توجد أكواد بعد. أنشئ أكواداً جديدة!</p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
