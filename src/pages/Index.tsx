import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import StarsBackground from "@/components/StarsBackground";
import { Brain, LogOut, Settings, Sparkles, Trophy, PenTool, Zap, Heart, GraduationCap, HelpCircle, User } from "lucide-react";
import { motion } from "framer-motion";
import NotificationBell from "@/components/NotificationBell";
import LegalDisclaimer from "@/components/LegalDisclaimer";
import { AnimatePresence } from "framer-motion";

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
      const fetchCategories = async () => {
        try {
          // 1. Try to fetch categories created by the user or shared ones
          const { data: catData, error: catErr } = await supabase
            .from("categories")
            .select("*")
            .or(`created_by.eq.${user.id},created_by.is.null`);

          if (catData && catData.length > 0) {
            setCategories(catData as Category[]);
          } else {
            // 2. If categories table is empty, check if there are questions with category_id
            const { data: qData } = await supabase
              .from("questions")
              .select("category_id")
              .eq("created_by", user.id);

            if (qData && qData.length > 0) {
              const uniqueCatIds = [...new Set(qData.map(q => q.category_id))];
              const { data: linkedCats } = await supabase
                .from("categories")
                .select("*")
                .in("id", uniqueCatIds);

              if (linkedCats && linkedCats.length > 0) {
                setCategories(linkedCats as Category[]);
                return;
              }
            }

            // 3. Fallback: Auto-create default categories if still empty
            const defaults = [
              { name: "جغرافيا", icon: "🌍", color: "#4CAF50", created_by: user.id },
              { name: "تاريخ", icon: "📜", color: "#FF9800", created_by: user.id },
              { name: "علوم", icon: "🔬", color: "#2196F3", created_by: user.id },
              { name: "رياضيات", icon: "🔢", color: "#9C27B0", created_by: user.id },
              { name: "ثقافة عامة", icon: "📚", color: "#D4AF37", created_by: user.id },
              { name: "رياضة", icon: "⚽", color: "#F44336", created_by: user.id },
            ];
            const { error: insErr } = await supabase.from("categories").insert(defaults);

            // Re-fetch after insert
            const { data: newData } = await supabase
              .from("categories")
              .select("*")
              .eq("created_by", user.id);
            if (newData) setCategories(newData as Category[]);
          }
        } catch (err) {
          console.error("Error in fetchCategories:", err);
        }
      };
      fetchCategories();
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
    <div className="min-h-screen relative flex flex-col items-center">
      <StarsBackground />
      <div className="relative z-10 w-full max-w-lg flex flex-col min-h-screen">

        {/* Header - Minimalist */}
        <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gold-gradient flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-background" />
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${version === "pro" ? "bg-purple-500/20 text-purple-400" : "bg-primary/10 text-primary"}`}>
              {version.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <Button variant="ghost" size="icon" onClick={() => navigate("/settings")} className="rounded-xl text-muted-foreground">
              <User className="w-5 h-5" />
            </Button>
          </div>
        </motion.header>

        {/* Logo & Title Section */}
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}
          className="text-center mt-4">
          <div className="inline-block p-1 rounded-full bg-secondary/30 border border-border/30 mb-6 px-4 py-1.5">
            <span className="text-[10px] gold-text font-bold">Quiz AI Premium 🚀</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-heading font-bold gold-text mb-2 tracking-tight">
            اختر قسماً وابدأ التحدي!
          </h1>
          <p className="text-muted-foreground text-sm font-body px-8">اختبر معلوماتك بأسئلتك الخاصة المولّدة بالذكاء الاصطناعي</p>
        </motion.div>

        {/* Main Action Buttons - Center Premium Layout */}
        <div className="flex-1 flex flex-col justify-center px-6 gap-4 my-8">

          {/* Main PRO / HAY Button */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button onClick={() => navigate("/pro-exam")}
              className="w-full h-16 gold-gradient text-background text-xl font-heading font-bold rounded-2xl shadow-xl shadow-primary/20 relative overflow-hidden group">
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              هيا {version.toUpperCase()}
            </Button>
          </motion.div>

          {/* Level Selection Overlay (Simulated as a Button for UI) */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button onClick={() => navigate("/curriculum")}
              className="w-full h-16 bg-purple-600 hover:bg-purple-700 text-white text-lg font-heading rounded-2xl shadow-lg shadow-purple-500/10 flex items-center justify-center gap-3">
              <GraduationCap className="w-6 h-6" />
              المستوى - متوسط
            </Button>
          </motion.div>

          {/* Subject Generation Button */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button onClick={() => navigate("/dashboard")}
              className="w-full h-16 bg-black border-2 border-primary/40 hover:border-primary text-foreground text-lg font-heading rounded-2xl transition-all flex items-center justify-center gap-3">
              <Zap className="w-6 h-6 text-primary" />
              اختبار في أي موضوع
            </Button>
          </motion.div>

          {/* Secondary Actions */}
          <div className="grid grid-cols-2 gap-3 mt-2">
            <Button onClick={() => navigate("/results")} variant="outline" className="h-12 rounded-xl text-xs gap-2">
              <Trophy className="w-4 h-4" /> نتائجي السابقة
            </Button>
            <Button onClick={() => navigate("/support")} variant="outline" className="h-12 rounded-xl text-xs gap-2">
              <HelpCircle className="w-4 h-4" /> الدعم والمساعدة
            </Button>
          </div>
        </div>

        {/* Footer Design - Lives & Info */}
        <motion.footer initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="pb-10 px-6">
          <div className="glass-card p-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {[1, 2, 3].map(n => (
                <Heart key={n} className={`w-5 h-5 ${n <= livesCount ? "text-destructive fill-destructive" : "text-muted/20"}`} />
              ))}
            </div>

            <div className="flex flex-col items-end">
              <span className="text-[10px] text-muted-foreground font-body">الخبير الذكي</span>
              <span className="text-sm font-heading gold-text">نشط (BETA)</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-body">النقاط</span>
              <span className="text-lg font-bold">1,240</span>
            </div>
          </div>


          {isAdmin && (
            <div className="mt-4 text-center">
              <Button variant="link" size="sm" onClick={() => navigate("/admin")} className="text-xs text-muted-foreground">
                <Settings className="w-3 h-3 ml-1" /> لوحة التحكم للأدمن
              </Button>
            </div>
          )}
        </motion.footer>

      </div>

      <AnimatePresence>
        {user && isActivated && profile && !profile.tos_accepted && (
          <LegalDisclaimer
            userId={user.id}
            onAccept={() => navigate(0)} // Refresh to update profile state
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
