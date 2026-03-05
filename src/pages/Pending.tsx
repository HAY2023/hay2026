import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StarsBackground from "@/components/StarsBackground";
import { Clock, LogOut, RefreshCw, KeyRound, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const Pending = () => {
  const { user, isActivated, loading, signOut } = useAuth();
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (isActivated) return <Navigate to="/" replace />;

  const handleRefresh = () => window.location.reload();

  const handleActivate = async () => {
    if (!code.trim()) { toast.error("أدخل كود التفعيل"); return; }
    const pattern = /^[A-Za-z0-9]{5}-[A-Za-z0-9]{5}-\d{2}-\d{2}$/;
    if (!pattern.test(code.trim())) {
      toast.error("صيغة الكود غير صحيحة (XXXXX-XXXXX-12-26)");
      return;
    }
    setChecking(true);
    try {
      const { data, error } = await supabase.rpc('activate_account_by_code', {
        code_text: code.trim()
      });

      const res = data as { success: boolean, message: string } | null;

      if (error || !res || !res.success) {
        toast.error(res?.message || error?.message || "كود التفعيل غير صحيح أو مستخدم مسبقاً");
        setChecking(false);
        return;
      }

      toast.success("تم تفعيل حسابك بنجاح! 🎉");
      setTimeout(() => window.location.reload(), 1000);
    } catch {
      toast.error("حدث خطأ في التحقق");
    }
    setChecking(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <StarsBackground />
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md z-10"
      >
        <Card className="glass-card text-center overflow-hidden">
          <div className="h-px w-full gold-gradient opacity-50" />
          <CardHeader className="space-y-4 pt-8">
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              className="mx-auto w-18 h-18 rounded-2xl bg-secondary flex items-center justify-center"
            >
              <Clock className="w-9 h-9 text-primary" />
            </motion.div>
            <CardTitle className="text-2xl font-heading gold-text">في انتظار التفعيل</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 pb-8">
            <p className="text-muted-foreground font-body leading-relaxed">
              أدخل كود التفعيل لتفعيل حسابك واختيار النسخة (HAY أو PRO).
            </p>

            <div className="space-y-3">
              <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground">
                <KeyRound className="w-4 h-4 text-primary" />
                <span>أدخل كود التفعيل</span>
              </div>
              <Input
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="XXXXX-XXXXX-12-26"
                className="bg-secondary/50 text-center rounded-xl h-12 text-lg tracking-wider font-mono"
                dir="ltr"
              />
              <div className="flex gap-2 text-xs text-muted-foreground justify-center">
                <span className="px-2 py-1 rounded-full bg-primary/10 text-primary font-bold">HAY = أساسي</span>
                <span className="px-2 py-1 rounded-full bg-purple-500/20 text-purple-400 font-bold">PRO = متقدم + AI</span>
              </div>
              <motion.div whileTap={{ scale: 0.97 }}>
                <Button onClick={handleActivate} disabled={checking}
                  className="w-full gold-gradient text-background gap-2 rounded-xl shadow-lg shadow-primary/15">
                  {checking ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري التحقق...</> : <><KeyRound className="w-4 h-4" /> تفعيل بالكود</>}
                </Button>
              </motion.div>
            </div>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/50" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-card px-3 text-muted-foreground">أو</span></div>
            </div>

            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={handleRefresh} className="gap-2 rounded-xl">
                <RefreshCw className="w-4 h-4" /> تحديث
              </Button>
              <Button variant="ghost" onClick={signOut} className="gap-2 rounded-xl text-muted-foreground">
                <LogOut className="w-4 h-4" /> خروج
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Pending;
