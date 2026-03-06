import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StarsBackground from "@/components/StarsBackground";
import { toast } from "sonner";
import {
  ArrowRight, User, Lock, Clock, Shield, Save, Trash2, AlertTriangle,
  Brain, Eye, EyeOff, Download, FileText, LogOut, Palette, Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const Settings = () => {
  const { user, isActivated, loading, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [changingPass, setChangingPass] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [statsCount, setStatsCount] = useState({ categories: 0, questions: 0, results: 0 });

  useEffect(() => {
    if (profile?.display_name) setDisplayName(profile.display_name);
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("categories").select("id", { count: "exact", head: true }).eq("created_by", user.id),
      supabase.from("questions").select("id", { count: "exact", head: true }).eq("created_by", user.id),
      supabase.from("game_results").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]).then(([cats, qs, res]) => {
      setStatsCount({
        categories: cats.count || 0,
        questions: qs.count || 0,
        results: res.count || 0,
      });
    });
  }, [user]);

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
    else toast.success("تم تحديث الاسم بنجاح ✅");
    setSaving(false);
  };

  const changePassword = async () => {
    if (!newPass || newPass.length < 6) { toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل"); return; }
    if (newPass !== confirmPass) { toast.error("كلمتا المرور غير متطابقتين"); return; }
    setChangingPass(true);
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) toast.error(error.message);
    else { toast.success("تم تغيير كلمة المرور ✅"); setNewPass(""); setConfirmPass(""); }
    setChangingPass(false);
  };

  const exportData = async () => {
    try {
      const [cats, qs, results] = await Promise.all([
        supabase.from("categories").select("*").eq("created_by", user.id),
        supabase.from("questions").select("*").eq("created_by", user.id),
        supabase.from("game_results").select("*").eq("user_id", user.id),
      ]);
      const data = {
        profile: { display_name: profile?.display_name, version, email: user.email },
        categories: cats.data || [],
        questions: qs.data || [],
        results: results.data || [],
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `quiz-ai-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click(); URL.revokeObjectURL(url);
      toast.success("تم تصدير البيانات بنجاح");
    } catch { toast.error("خطأ في التصدير"); }
  };

  const deleteAccount = async () => {
    if (deleteText !== "حذف حسابي") { toast.error('اكتب "حذف حسابي" للتأكيد'); return; }
    setDeleting(true);
    try {
      const { error } = await supabase.rpc("delete_user_permanently", { target_user_id: user.id });
      if (error) throw error;

      await signOut();
      toast.success("تم حذف بيانات حسابك نهائياً");
      navigate("/auth");
    } catch (err: any) {
      console.error(err);
      toast.error("خطأ في الحذف: " + (err.message || "حاول مرة أخرى"));
    }
    setDeleting(false);
  };

  return (
    <div className="min-h-screen relative">
      <StarsBackground />
      <div className="relative z-10 max-w-lg mx-auto p-4 md:p-6 pb-20">
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

        {/* Account Info Card */}
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
            {expiresAt && (
              <div className="flex justify-between items-center">
                <span className={`flex items-center gap-1 text-xs ${daysLeft !== null && daysLeft <= 7 ? "text-destructive" : "text-foreground"}`}>
                  <Clock className="w-3 h-3" />
                  <span dir="ltr">إلى: {new Date(expiresAt).toLocaleDateString('en-GB')}</span>
                  {daysLeft !== null && daysLeft > 0 ? ` (${daysLeft} يوم)` : " (منتهي)"}
                </span>
                <span className="text-muted-foreground">صلاحية التفعيل</span>
              </div>
            )}
            {!expiresAt && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-green-400">♾️ دائم</span>
                <span className="text-muted-foreground">مدة التفعيل</span>
              </div>
            )}
          </div>

          {/* User Stats */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/30">
            <div className="text-center">
              <p className="text-lg font-heading font-bold text-primary">{statsCount.categories}</p>
              <p className="text-xs text-muted-foreground">أقسام</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-heading font-bold text-primary">{statsCount.questions}</p>
              <p className="text-xs text-muted-foreground">أسئلة</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-heading font-bold text-primary">{statsCount.results}</p>
              <p className="text-xs text-muted-foreground">اختبارات</p>
            </div>
          </div>
        </motion.div>

        {/* Change Name */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="glass-card p-5 mb-4 space-y-3">
          <h3 className="font-heading font-bold text-foreground text-right flex items-center gap-2 justify-end">
            <span>تغيير الاسم</span>
            <Palette className="w-4 h-4 text-primary" />
          </h3>
          <Input value={displayName} onChange={e => setDisplayName(e.target.value)}
            placeholder="اسمك الجديد" className="bg-secondary/50 text-right rounded-xl" />
          <Button onClick={saveProfile} disabled={saving} className="gold-gradient text-background gap-1 rounded-xl w-full">
            <Save className="w-4 h-4" /> {saving ? "جاري الحفظ..." : "حفظ الاسم"}
          </Button>
        </motion.div>

        {/* Change Password */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="glass-card p-5 mb-4 space-y-3">
          <h3 className="font-heading font-bold text-foreground text-right flex items-center gap-2 justify-end">
            <span>تغيير كلمة المرور</span>
            <Lock className="w-4 h-4 text-primary" />
          </h3>
          <div className="relative">
            <Input type={showPass ? "text" : "password"} value={newPass} onChange={e => setNewPass(e.target.value)}
              placeholder="كلمة المرور الجديدة" className="bg-secondary/50 text-right rounded-xl pl-10" />
            <button onClick={() => setShowPass(!showPass)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <Input type={showPass ? "text" : "password"} value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
            placeholder="تأكيد كلمة المرور" className="bg-secondary/50 text-right rounded-xl" />
          {newPass && confirmPass && newPass !== confirmPass && (
            <p className="text-xs text-destructive text-right">كلمتا المرور غير متطابقتين</p>
          )}
          <Button onClick={changePassword} disabled={changingPass || !newPass || newPass !== confirmPass} variant="outline" className="gap-1 rounded-xl w-full">
            <Lock className="w-4 h-4" /> {changingPass ? "جاري التغيير..." : "تغيير كلمة المرور"}
          </Button>
        </motion.div>

        {/* Export & Security */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="glass-card p-5 mb-4 space-y-3">
          <h3 className="font-heading font-bold text-foreground text-right flex items-center gap-2 justify-end">
            <span>البيانات والأمان</span>
            <Brain className="w-4 h-4 text-primary" />
          </h3>
          <div className="text-right text-xs text-muted-foreground space-y-1">
            <p>🔒 جميع البيانات مشفرة ومحمية بسياسات أمان متقدمة (RLS)</p>
            <p>🤖 اتصال AI عبر بوابة آمنة مع تشفير كامل</p>
            <p>✅ لا يتم مشاركة بياناتك مع أي طرف ثالث</p>
          </div>
          <Button onClick={exportData} variant="outline" className="gap-1 rounded-xl w-full">
            <Download className="w-4 h-4" /> تصدير جميع بياناتي (JSON)
          </Button>
          <Button onClick={signOut} variant="outline" className="gap-1 rounded-xl w-full text-muted-foreground">
            <LogOut className="w-4 h-4" /> تسجيل الخروج
          </Button>
        </motion.div>

        {/* Danger Zone */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="glass-card p-5 space-y-3 border-destructive/20">
          <h3 className="font-heading font-bold text-destructive text-right flex items-center gap-2 justify-end">
            <span>منطقة الخطر</span>
            <AlertTriangle className="w-4 h-4" />
          </h3>

          <AnimatePresence>
            {!showDeleteConfirm ? (
              <Button onClick={() => setShowDeleteConfirm(true)} variant="outline" className="gap-1 rounded-xl w-full border-destructive/30 text-destructive hover:bg-destructive/10">
                <Trash2 className="w-4 h-4" /> حذف الحساب نهائياً
              </Button>
            ) : (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-3">
                <div className="bg-destructive/5 p-3 rounded-xl border border-destructive/20 text-right">
                  <p className="text-xs text-destructive font-bold mb-1">⚠️ تحذير نهائي</p>
                  <p className="text-xs text-destructive/80">سيتم حذف جميع بياناتك (أقسام، أسئلة، نتائج، إشعارات) نهائياً. هذا الإجراء لا يمكن التراجع عنه.</p>
                </div>
                <Input value={deleteText} onChange={e => setDeleteText(e.target.value)}
                  placeholder='اكتب "حذف حسابي" للتأكيد' className="bg-destructive/5 text-right rounded-xl border-destructive/30" />
                <div className="flex gap-2">
                  <Button onClick={() => { setShowDeleteConfirm(false); setDeleteText(""); }} variant="outline" className="flex-1 rounded-xl">
                    إلغاء
                  </Button>
                  <Button onClick={deleteAccount} disabled={deleting || deleteText !== "حذف حسابي"}
                    className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-1 rounded-xl">
                    <Trash2 className="w-4 h-4" /> {deleting ? "جاري الحذف..." : "تأكيد الحذف"}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default Settings;
