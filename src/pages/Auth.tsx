import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import StarsBackground from "@/components/StarsBackground";
import { Brain, LogIn, UserPlus, Mail, Lock, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const Auth = () => {
  const { user, isActivated, loading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { signIn, signUp } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="gold-text text-2xl font-heading"
      >
        جاري التحميل...
      </motion.div>
    </div>
  );
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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <StarsBackground />
      
      {/* Decorative orbs */}
      <div className="absolute top-1/4 -right-20 w-60 h-60 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-1/4 -left-20 w-60 h-60 rounded-full bg-primary/5 blur-3xl" />
      
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md z-10"
      >
        <Card className="glass-card overflow-hidden">
          {/* Top glow line */}
          <div className="h-px w-full gold-gradient opacity-50" />
          
          <CardHeader className="text-center space-y-4 pt-8 pb-4">
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="mx-auto relative"
            >
              <div className="w-20 h-20 rounded-2xl gold-gradient flex items-center justify-center shadow-lg shadow-primary/20">
                <Brain className="w-10 h-10 text-background" />
              </div>
              <div className="absolute inset-0 w-20 h-20 rounded-2xl gold-gradient opacity-30 blur-xl" />
            </motion.div>
            <div>
              <CardTitle className="text-4xl font-heading gold-text">Quiz AI</CardTitle>
              <p className="text-muted-foreground font-body mt-1">موقع أسئلة ذكي بالذكاء الاصطناعي</p>
            </div>
          </CardHeader>
          
          <CardContent className="px-6 pb-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="wait">
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="اسم العرض"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="bg-secondary/50 border-border/50 text-foreground placeholder:text-muted-foreground text-right pl-10 h-12 rounded-xl"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="البريد الإلكتروني"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-secondary/50 border-border/50 text-foreground placeholder:text-muted-foreground text-right pl-10 h-12 rounded-xl"
                  required
                />
              </div>
              
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="كلمة المرور"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-secondary/50 border-border/50 text-foreground placeholder:text-muted-foreground text-right pl-10 h-12 rounded-xl"
                  required
                  minLength={6}
                />
              </div>
              
              <motion.div whileTap={{ scale: 0.98 }}>
                <Button 
                  type="submit" 
                  disabled={submitting} 
                  className="w-full gold-gradient text-background font-heading text-lg h-13 rounded-xl hover:opacity-90 shadow-lg shadow-primary/20 transition-all"
                >
                  {isLogin ? (
                    <><LogIn className="w-5 h-5 ml-2" /> تسجيل الدخول</>
                  ) : (
                    <><UserPlus className="w-5 h-5 ml-2" /> إنشاء حساب</>
                  )}
                </Button>
              </motion.div>
            </form>
            
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-3 text-muted-foreground">أو</span>
              </div>
            </div>
            
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors font-body"
            >
              {isLogin ? "ليس لديك حساب؟ سجّل الآن" : "لديك حساب؟ سجّل دخولك"}
            </button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Auth;
