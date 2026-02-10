import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StarsBackground from "@/components/StarsBackground";
import { Clock, LogOut } from "lucide-react";

const Pending = () => {
  const { user, isActivated, loading, signOut } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (isActivated) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <StarsBackground />
      <Card className="glass-card w-full max-w-md z-10 animate-slide-up text-center">
        <CardHeader className="space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
            <Clock className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-heading gold-text">في انتظار التفعيل</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">تم إنشاء حسابك بنجاح. يرجى انتظار تفعيل الأدمن لحسابك.</p>
          <Button variant="outline" onClick={signOut} className="gap-2">
            <LogOut className="w-4 h-4" /> تسجيل الخروج
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Pending;
