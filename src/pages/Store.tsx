import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getLevelFromXP, getXPForNextLevel, getXPForCurrentLevel, getLevelTitle, getLevelColor } from "@/hooks/useXP";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import StarsBackground from "@/components/StarsBackground";
import { ArrowRight, ShoppingBag, Sparkles, Star, Zap, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import confetti from "canvas-confetti";

interface StoreItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  price: number;
  item_type: string;
}

const Store = () => {
  const { user, isActivated, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [xp, setXP] = useState(0);
  const [level, setLevel] = useState(1);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [justBought, setJustBought] = useState<string | null>(null);

  useEffect(() => {
    if (user && isActivated) {
      fetchData();
    }
  }, [user, isActivated]);

  const fetchData = async () => {
    if (!user) return;
    const [itemsRes, profileRes] = await Promise.all([
      supabase.from("store_items").select("*").eq("is_active", true),
      supabase.from("profiles").select("xp, level").eq("user_id", user.id).single(),
    ]);
    if (itemsRes.data) setItems(itemsRes.data as StoreItem[]);
    if (profileRes.data) {
      setXP((profileRes.data as any).xp ?? 0);
      setLevel((profileRes.data as any).level ?? 1);
    }
  };

  const handlePurchase = async (item: StoreItem) => {
    if (!user) return;
    if (xp < item.price) {
      toast.error("نقاط XP غير كافية! 😢");
      return;
    }
    setPurchasing(item.id);
    try {
      // Deduct XP
      const newXP = xp - item.price;
      const newLevel = getLevelFromXP(newXP);
      await supabase.from("profiles").update({ xp: newXP, level: newLevel } as any).eq("user_id", user.id);
      // Record purchase
      await supabase.from("user_purchases").insert({
        user_id: user.id,
        item_id: item.id,
        quantity: 1,
      } as any);
      setXP(newXP);
      setLevel(newLevel);
      setJustBought(item.id);
      confetti({ particleCount: 60, spread: 50, origin: { y: 0.7 }, colors: ["#D4AF37", "#FFD700", "#FFA500"] });
      toast.success(`تم شراء ${item.name}! 🎉`);
      setTimeout(() => setJustBought(null), 2000);
    } catch {
      toast.error("حدث خطأ أثناء الشراء");
    }
    setPurchasing(null);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }} className="gold-text text-2xl font-heading">
        جاري التحميل...
      </motion.div>
    </div>
  );
  if (!user) return <Navigate to="/auth" replace />;
  if (!isActivated) return <Navigate to="/pending" replace />;

  const currentLevelXP = getXPForCurrentLevel(level);
  const nextLevelXP = getXPForNextLevel(level);
  const progressInLevel = nextLevelXP > currentLevelXP ? ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100 : 100;

  return (
    <div className="min-h-screen relative">
      <StarsBackground />
      <div className="relative z-10">
        {/* Header */}
        <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-4 md:p-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="rounded-xl">
            <ArrowRight className="w-5 h-5" />
          </Button>
          <h1 className="font-heading text-xl font-bold gold-text flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" /> المتجر
          </h1>
          <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-xl">
            <Zap className="w-4 h-4 text-primary" />
            <span className="font-heading font-bold text-primary text-sm">{xp} XP</span>
          </div>
        </motion.header>

        <div className="max-w-lg mx-auto px-4 space-y-5 pb-10">
          {/* Level Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="glass-card p-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 gold-gradient" />
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{xp} / {nextLevelXP} XP</span>
              </div>
              <div className="flex items-center gap-2">
                <div>
                  <p className={`text-lg font-heading font-bold ${getLevelColor(level)}`}>
                    المستوى {level}
                  </p>
                  <p className="text-xs text-muted-foreground text-right">{getLevelTitle(level)}</p>
                </div>
                <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 3, repeat: Infinity }}
                  className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Star className="w-6 h-6 text-primary fill-primary" />
                </motion.div>
              </div>
            </div>
            <Progress value={progressInLevel} className="h-2.5 rounded-full" />
            <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
              {Math.round(nextLevelXP - xp)} XP للمستوى التالي
            </p>
          </motion.div>

          {/* Store Items */}
          <div>
            <h2 className="text-sm font-heading font-bold text-foreground mb-3 flex items-center gap-2 justify-end">
              اختر ما تريد شراءه <Sparkles className="w-4 h-4 text-primary" />
            </h2>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
              className="grid grid-cols-2 gap-3">
              {items.map((item, i) => (
                <motion.div key={item.id}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.05 }}
                  className={`glass-card p-4 text-center relative overflow-hidden group transition-all ${
                    justBought === item.id ? "border-green-500/50 bg-green-500/5" : ""
                  }`}>
                  <AnimatePresence>
                    {justBought === item.id && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                        className="absolute inset-0 bg-green-500/10 flex items-center justify-center z-10">
                        <Check className="w-10 h-10 text-green-400" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <span className="text-3xl mb-2 block">{item.icon}</span>
                  <h3 className="font-heading text-sm font-bold text-foreground mb-1">{item.name}</h3>
                  <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed">{item.description}</p>
                  <Button
                    size="sm"
                    onClick={() => handlePurchase(item)}
                    disabled={purchasing === item.id || xp < item.price}
                    className={`w-full rounded-xl text-xs gap-1 ${
                      xp >= item.price
                        ? "gold-gradient text-background"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Zap className="w-3 h-3" />
                    {item.price} XP
                  </Button>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* How to earn XP */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="glass-card p-4">
            <h3 className="text-sm font-heading font-bold text-foreground mb-3 flex items-center gap-2 justify-end">
              كيف تكسب نقاط XP؟ <Zap className="w-4 h-4 text-primary" />
            </h3>
            <div className="space-y-2 text-right">
              {[
                { text: "أكمل اختبارًا", xp: "+5-50 XP", icon: "🎮" },
                { text: "نتيجة مثالية 100%", xp: "+50 XP إضافي", icon: "🏆" },
                { text: "سلسلة 3 أيام متواصلة", xp: "+10 XP", icon: "🔥" },
                { text: "سلسلة 7 أيام متواصلة", xp: "+20 XP", icon: "⚡" },
              ].map((rule, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-primary font-heading font-bold">{rule.xp}</span>
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    {rule.text} <span>{rule.icon}</span>
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Store;
