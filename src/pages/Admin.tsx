import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import StarsBackground from "@/components/StarsBackground";
import { toast } from "sonner";
import { ArrowRight, Check, X, Users, Shield } from "lucide-react";
import { motion } from "framer-motion";

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  is_activated: boolean;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, x: 20 },
  show: { opacity: 1, x: 0 },
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
            <motion.div key={u.id} variants={item} className="glass-card-hover p-4 flex items-center justify-between">
              <div>
                <p className="font-heading font-bold text-foreground text-lg">{u.display_name || "بدون اسم"}</p>
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
