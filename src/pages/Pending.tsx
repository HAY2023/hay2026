import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StarsBackground from "@/components/StarsBackground";
import { Clock, LogOut, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

const Pending = () => {
  const { user, isActivated, loading, signOut } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (isActivated) return <Navigate to="/" replace />;

  const handleRefresh = () => {
    window.location.reload();
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
              تم إنشاء حسابك بنجاح. يرجى انتظار تفعيل الأدمن لحسابك أو إدخال كود التفعيل.
            </p>
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
