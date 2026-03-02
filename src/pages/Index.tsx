import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import StarsBackground from "@/components/StarsBackground";
import { Brain, LogOut, Settings, Sparkles, Trophy, PenTool, Zap, Heart, GraduationCap, HelpCircle } from "lucide-react";
import { motion } from "framer-motion";
import NotificationBell from "@/components/NotificationBell";

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const Index = () => {
  const { user, isActivated, isAdmin, loading, signOut, profile } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [livesCount, setLivesCount] = useState(3);

  useEffect(() => {
    if (user && isActivated) {
      supabase.from("categories").select("*").eq("created_by", user.id).then(({ data }) => {
        if (data) setCategories(data as Category[]);
      });
    }
  }, [user, isActivated]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }} className="gold-text text-2xl font-heading">
        جاري التحميل...
      </motion.div>
    </div>
  );
  if (!user) return <Navigate to="/auth" replace />;
  if (!isActivated) return <Navigate to="/pending" replace />;

  const version = profile?.version || "hay";

  return (
    <div className="min-h-screen relative">
      <StarsBackground />
      <div className="relative z-10">
        {/* Header */}
        <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="flex items-center justify-between p-4 md:p-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl gold-gradient flex items-center justify-center shadow-lg shadow-primary/20">
              <Brain className="w-6 h-6 text-background" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading text-xl font-bold gold-text">Quiz AI</h1>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${version === "pro" ? "bg-purple-500/20 text-purple-400" : "bg-primary/10 text-primary"}`}>
                  {version.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-body">مرحباً {profile?.display_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => navigate("/admin")} className="gap-1 rounded-xl text-xs">
                <Settings className="w-3.5 h-3.5" /> إدارة
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={signOut} className="rounded-xl">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </motion.header>

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
          className="text-center py-8 md:py-12 px-4">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-5">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-body">مدعوم بالذكاء الاصطناعي</span>
          </motion.div>
          <h2 className="text-3xl md:text-5xl font-heading font-bold gold-text mb-3 leading-tight">
            اختر قسماً وابدأ التحدي!
          </h2>
          <p className="text-muted-foreground text-base md:text-lg max-w-md mx-auto">اختبر معلوماتك بأسئلتك الخاصة المولّدة بالذكاء الاصطناعي</p>
        </motion.div>

        {/* Action buttons */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
          className="max-w-lg mx-auto px-4 mb-8">
          <div className="grid grid-cols-2 gap-3">
            <motion.div whileTap={{ scale: 0.97 }}>
              <Button onClick={() => navigate("/dashboard")} className="gold-gradient text-background gap-2 h-14 text-base font-heading w-full rounded-xl shadow-lg shadow-primary/15">
                <PenTool className="w-5 h-5" /> إدارة أسئلتي
              </Button>
            </motion.div>
            <motion.div whileTap={{ scale: 0.97 }}>
              <Button onClick={() => navigate("/results")} variant="outline" className="gap-2 h-14 text-base font-heading w-full rounded-xl">
                <Trophy className="w-5 h-5" /> نتائجي
              </Button>
            </motion.div>
            {version === "pro" && (
              <motion.div whileTap={{ scale: 0.97 }} className="col-span-2">
                <Button onClick={() => navigate("/pro-exam")}
                  className="bg-purple-600 hover:bg-purple-700 text-white gap-2 h-14 text-base font-heading w-full rounded-xl shadow-lg shadow-purple-500/20">
                  <GraduationCap className="w-5 h-5" /> اختبار PRO - AI أستاذ
                </Button>
              </motion.div>
            )}
          </div>
          <motion.div whileTap={{ scale: 0.97 }} className="mt-3">
            <Button onClick={() => navigate("/support")} variant="ghost" className="gap-2 w-full rounded-xl text-muted-foreground">
              <HelpCircle className="w-4 h-4" /> الدعم الفني
            </Button>
          </motion.div>
        </motion.div>

        {/* Lives selector */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="max-w-lg mx-auto px-4 mb-6">
          <div className="glass-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setLivesCount(n)} className="transition-transform hover:scale-110">
                  <Heart className={`w-6 h-6 ${n <= livesCount ? "text-destructive fill-destructive" : "text-muted/30"}`} />
                </button>
              ))}
              <button onClick={() => setLivesCount(0)} className="mr-2 text-xs px-2 py-1 rounded-lg border border-border/50 text-muted-foreground hover:text-foreground transition-colors">
                {livesCount === 0 ? "♾️" : "إزالة"}
              </button>
            </div>
            <span className="text-sm text-muted-foreground font-body">{livesCount === 0 ? "♾️ بلا حدود" : `${livesCount} قلوب`}</span>
          </div>
        </motion.div>

        {/* Categories grid */}
        <div className="max-w-lg mx-auto px-4 pb-10">
          {categories.length === 0 ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}
              className="glass-card p-10 text-center">
              <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 3, repeat: Infinity }} className="text-5xl mb-4">📝</motion.div>
              <p className="text-muted-foreground mb-5 font-body">لم تضف أي أقسام بعد. أنشئ أقسامك وأسئلتك!</p>
              <motion.div whileTap={{ scale: 0.97 }}>
                <Button onClick={() => navigate("/dashboard")} className="gold-gradient text-background gap-2 rounded-xl shadow-lg shadow-primary/15">
                  <PenTool className="w-4 h-4" /> إنشاء أقسام وأسئلة
                </Button>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 gap-3">
              {/* Cocktail */}
              <motion.button variants={item} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => navigate(`/play/all?lives=${livesCount}`)}
                className="glass-card-hover p-6 text-center col-span-2 relative overflow-hidden group">
                <div className="absolute inset-0 gold-gradient opacity-5 group-hover:opacity-10 transition-opacity" />
                <div className="relative z-10">
                  <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 4, repeat: Infinity }} className="text-4xl mb-2">🍸</motion.div>
                  <h3 className="font-heading text-lg font-bold gold-text">كوكتيل</h3>
                  <p className="text-xs text-muted-foreground">جميع الأقسام</p>
                  <div className="flex items-center justify-center gap-1 mt-2">
                    <Zap className="w-3 h-3 text-primary" />
                    <span className="text-xs text-primary">ابدأ الآن</span>
                  </div>
                </div>
              </motion.button>

              {categories.map((cat) => (
                <motion.button key={cat.id} variants={item} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => navigate(`/play/${cat.id}?lives=${livesCount}`)}
                  className="glass-card-hover p-5 text-center">
                  <div className="text-3xl mb-2">{cat.icon}</div>
                  <h3 className="font-heading text-sm font-bold text-foreground">{cat.name}</h3>
                </motion.button>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
