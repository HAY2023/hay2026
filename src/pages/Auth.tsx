import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import StarsBackground from "@/components/StarsBackground";
import { Brain, LogIn, UserPlus } from "lucide-react";

const Auth = () => {
  const { user, isActivated, loading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { signIn, signUp } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="gold-text text-2xl font-heading">جاري التحميل...</div></div>;
  if (user && isActivated) return <Navigate to="/" replace />;
  if (user && !isActivated) return <Navigate to="/pending" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) toast.error(error);
    } else {
      if (!displayName.trim()) { toast.error("أدخل اسم العرض"); setSubmitting(false); return; }
      const { error } = await signUp(email, password, displayName);
      if (error) toast.error(error);
      else toast.success("تم إنشاء الحساب! انتظر تفعيل الأدمن.");
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <StarsBackground />
      <Card className="glass-card w-full max-w-md z-10 animate-slide-up">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl gold-gradient flex items-center justify-center animate-glow-pulse">
            <Brain className="w-8 h-8 text-background" />
          </div>
          <CardTitle className="text-3xl font-heading gold-text">Quiz AI</CardTitle>
          <p className="text-muted-foreground font-body">موقع أسئلة ذكي</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <Input
                placeholder="اسم العرض"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="bg-secondary/50 border-border/50 text-foreground placeholder:text-muted-foreground text-right"
              />
            )}
            <Input
              type="email"
              placeholder="البريد الإلكتروني"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-secondary/50 border-border/50 text-foreground placeholder:text-muted-foreground text-right"
              required
            />
            <Input
              type="password"
              placeholder="كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-secondary/50 border-border/50 text-foreground placeholder:text-muted-foreground text-right"
              required
              minLength={6}
            />
            <Button type="submit" disabled={submitting} className="w-full gold-gradient text-background font-heading text-lg h-12 hover:opacity-90">
              {isLogin ? <><LogIn className="w-5 h-5 ml-2" /> تسجيل الدخول</> : <><UserPlus className="w-5 h-5 ml-2" /> إنشاء حساب</>}
            </Button>
          </form>
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            {isLogin ? "ليس لديك حساب؟ سجّل الآن" : "لديك حساب؟ سجّل دخولك"}
          </button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
