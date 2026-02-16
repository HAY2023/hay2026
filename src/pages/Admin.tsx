import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StarsBackground from "@/components/StarsBackground";
import { toast } from "sonner";
import { ArrowRight, Check, X, Users, Shield, KeyRound, Copy, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  is_activated: boolean;
  activation_code: string | null;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, x: 20 },
  show: { opacity: 1, x: 0 },
};

const generateCode = (): string => {
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

  const fetchUsers = async () => {
    const { data } = await supabase.from("profiles").select("*");
    if (data) setUsers(data as Profile[]);
  };

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin]);

  const toggleActivation = async (p: Profile) => {
    await supabase.from("profiles").update({ is_activated: !p.is_activated }).eq("id", p.id);
    toast.success(p.is_activated ? "تم تعطيل الحساب" : "تم تفعيل الحساب");
    fetchUsers();
  };

  const assignCode = async (p: Profile) => {
    const code = generateCode();
    await supabase.from("profiles").update({ activation_code: code }).eq("id", p.id);
    toast.success("تم إنشاء كود التفعيل");
    fetchUsers();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("تم نسخ الكود");
  };

  if (loading) return null;
  if (!user || !isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen relative">
      <StarsBackground />
      <div className="relative z-10 max-w-2xl mx-auto p-4 md:p-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-heading font-bold gold-text">إدارة الحسابات</h1>
              <p className="text-xs text-muted-foreground">{users.length} مستخدم</p>
            </div>
          </div>
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-1 rounded-xl">
            <ArrowRight className="w-4 h-4" /> العودة
          </Button>
        </motion.div>

        <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
          {users.map((u) => (
            <motion.div key={u.id} variants={item} className="glass-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-heading font-bold text-foreground text-lg truncate">{u.display_name || "بدون اسم"}</p>
                  <p className="text-sm text-muted-foreground">
                    {u.is_activated ? "✅ مفعّل" : "⏳ غير مفعّل"}
                  </p>
                </div>
                <motion.div whileTap={{ scale: 0.95 }}>
                  <Button
                    variant={u.is_activated ? "outline" : "default"}
                    size="sm"
                    onClick={() => toggleActivation(u)}
                    className={`rounded-xl ${u.is_activated ? "" : "gold-gradient text-background shadow-lg shadow-primary/15"}`}
                  >
                    {u.is_activated ? (
                      <><X className="w-4 h-4 ml-1" /> تعطيل</>
                    ) : (
                      <><Check className="w-4 h-4 ml-1" /> تفعيل</>
                    )}
                  </Button>
                </motion.div>
              </div>

              {/* Activation Code Section */}
              <div className="flex items-center gap-2 flex-wrap">
                {u.activation_code ? (
                  <>
                    <div className="flex items-center gap-2 bg-secondary/50 rounded-xl px-3 py-2 flex-1 min-w-0">
                      <KeyRound className="w-4 h-4 text-primary shrink-0" />
                      <code className="text-sm font-mono text-foreground truncate" dir="ltr">{u.activation_code}</code>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => copyCode(u.activation_code!)} className="rounded-xl shrink-0">
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => assignCode(u)} className="rounded-xl shrink-0">
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => assignCode(u)} className="gap-1 rounded-xl text-xs">
                    <KeyRound className="w-3.5 h-3.5" /> إنشاء كود تفعيل
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
          {users.length === 0 && (
            <div className="glass-card p-10 text-center">
              <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">لا يوجد مستخدمون بعد</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Admin;
