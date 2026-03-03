import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StarsBackground from "@/components/StarsBackground";
import { toast } from "sonner";
import { ArrowRight, User, Lock, Clock, Shield, Save } from "lucide-react";
import { motion } from "framer-motion";

const Settings = () => {
  const { user, isActivated, loading, profile } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [saving, setSaving] = useState(false);
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [changingPass, setChangingPass] = useState(false);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isActivated) return <Navigate to="/pending" replace />;

  const version = profile?.version || "hay";
  const expiresAt = profile?.activation_expires_at;
  const daysLeft = expiresAt ? Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

  const saveProfile = async () => {
    if (!displayName.trim()) { toast.error("الاسم مطلوب"); return; }
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ display_name: displayName }).eq("user_id", user.id);
    if (error) toast.error("خطأ في الحفظ");
    else toast.success("تم تحديث الاسم بنجاح");
    setSaving(false);
  };

  const changePassword = async () => {
    if (!newPass || newPass.length < 6) { toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل"); return; }
    setChangingPass(true);
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) toast.error(error.message);
    else { toast.success("تم تغيير كلمة المرور"); setOldPass(""); setNewPass(""); }
    setChangingPass(false);
  };

  return (
    <div className="min-h-screen relative">
      <StarsBackground />
      <div className="relative z-10 max-w-lg mx-auto p-4 md:p-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/20 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-heading font-bold gold-text">الإعدادات</h1>
          </div>
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-1 rounded-xl">
            <ArrowRight className="w-4 h-4" /> العودة
          </Button>
        </motion.div>

        {/* Account Info */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass-card p-5 mb-4 space-y-3">
          <h3 className="font-heading font-bold text-foreground text-right flex items-center gap-2 justify-end">
            <span>معلومات الحساب</span>
            <Shield className="w-4 h-4 text-primary" />
          </h3>
          <div className="space-y-2 text-right text-sm">
            <div className="flex justify-between items-center">
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${version === "pro" ? "bg-purple-500/20 text-purple-400" : "bg-primary/10 text-primary"}`}>
                {version.toUpperCase()}
              </span>
              <span className="text-muted-foreground">النسخة</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-foreground text-xs" dir="ltr">{user.email}</span>
              <span className="text-muted-foreground">البريد</span>
            </div>
            {daysLeft !== null && (
              <div className="flex justify-between items-center">
                <span className={`flex items-center gap-1 text-xs ${daysLeft <= 7 ? "text-destructive" : "text-foreground"}`}>
                  <Clock className="w-3 h-3" /> {daysLeft > 0 ? `${daysLeft} يوم متبقي` : "منتهي ⚠️"}
                </span>
                <span className="text-muted-foreground">مدة التفعيل</span>
              </div>
            )}
            {!expiresAt && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-green-400">♾️ دائم</span>
                <span className="text-muted-foreground">مدة التفعيل</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Change Name */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="glass-card p-5 mb-4 space-y-3">
          <h3 className="font-heading font-bold text-foreground text-right">تغيير الاسم</h3>
          <Input value={displayName} onChange={e => setDisplayName(e.target.value)}
            placeholder="اسمك الجديد" className="bg-secondary/50 text-right rounded-xl" />
          <Button onClick={saveProfile} disabled={saving} className="gold-gradient text-background gap-1 rounded-xl w-full">
            <Save className="w-4 h-4" /> {saving ? "جاري الحفظ..." : "حفظ"}
          </Button>
        </motion.div>

        {/* Change Password */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="glass-card p-5 space-y-3">
          <h3 className="font-heading font-bold text-foreground text-right flex items-center gap-2 justify-end">
            <span>تغيير كلمة المرور</span>
            <Lock className="w-4 h-4 text-primary" />
          </h3>
          <Input type="password" value={newPass} onChange={e => setNewPass(e.target.value)}
            placeholder="كلمة المرور الجديدة" className="bg-secondary/50 text-right rounded-xl" />
          <Button onClick={changePassword} disabled={changingPass} variant="outline" className="gap-1 rounded-xl w-full">
            <Lock className="w-4 h-4" /> {changingPass ? "جاري التغيير..." : "تغيير كلمة المرور"}
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default Settings;
