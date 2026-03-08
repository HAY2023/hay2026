import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAchievements } from "@/hooks/useAchievements";
import { ACHIEVEMENTS } from "@/data/achievements";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import StarsBackground from "@/components/StarsBackground";
import AchievementToast from "@/components/AchievementToast";
import { ArrowRight, Award, Lock, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

const Achievements = () => {
  const { user, isActivated, loading } = useAuth();
  const { unlockedKeys, loading: achLoading, checkAndUnlock, newlyUnlocked, clearNewlyUnlocked, unlockedCount, totalAchievements } = useAchievements(user?.id);
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (!user || achLoading || checked) return;
    // Fetch stats and check for new achievements
    const check = async () => {
      const [resultsRes, purchasesRes, profileRes] = await Promise.all([
        supabase.from("game_results").select("score_percentage, time_taken").eq("user_id", user.id),
        supabase.from("user_purchases").select("id").eq("user_id", user.id),
        supabase.from("profiles").select("xp, level").eq("user_id", user.id).single(),
      ]);
      const results = resultsRes.data || [];
      const perfectGames = results.filter(r => r.score_percentage === 100).length;
      const fastestGame = results.reduce((min: number | null, r) => {
        if (r.time_taken == null) return min;
        return min === null ? r.time_taken : Math.min(min, r.time_taken);
      }, null as number | null);

      // Calculate streak
      let streak = 0;
      const { data: allResults } = await supabase.from("game_results").select("played_at").eq("user_id", user.id);
      if (allResults) {
        const today = new Date();
        for (let i = 0; i < 60; i++) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          const ds = d.toISOString().split("T")[0];
          const played = allResults.some(r => r.played_at.startsWith(ds));
          if (played || i === 0) { if (played) streak++; } else break;
        }
      }

      await checkAndUnlock({
        totalGames: results.length,
        perfectGames,
        streak,
        level: (profileRes.data as any)?.level ?? 1,
        xp: (profileRes.data as any)?.xp ?? 0,
        purchases: (purchasesRes.data || []).length,
        fastestGame,
      });
      if (unlocked && unlocked.length > 0) setShowToast(true);
      setChecked(true);
    };
    check();
  }, [user, achLoading]);

  if (loading || achLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="gold-text text-2xl font-heading">جاري التحميل...</motion.div>
    </div>
  );
  if (!user) return <Navigate to="/auth" replace />;
  if (!isActivated) return <Navigate to="/pending" replace />;

  const pct = Math.round((unlockedCount / totalAchievements) * 100);

  return (
    <div className="min-h-screen relative">
      {showToast && newlyUnlocked.length > 0 && (
        <AchievementToast achievementKeys={newlyUnlocked} onDone={() => { setShowToast(false); clearNewlyUnlocked(); }} />
      )}
      <StarsBackground />
      <div className="relative z-10">
        <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-4 md:p-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="rounded-xl">
            <ArrowRight className="w-5 h-5" />
          </Button>
          <h1 className="font-heading text-xl font-bold gold-text flex items-center gap-2">
            <Award className="w-5 h-5" /> الإنجازات
          </h1>
          <div className="text-sm font-heading text-primary font-bold">{unlockedCount}/{totalAchievements}</div>
        </motion.header>

        <div className="max-w-lg mx-auto px-4 pb-10 space-y-4">
          {/* Progress */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="glass-card p-4 text-center">
            <p className="text-3xl font-heading font-bold gold-text mb-1">{pct}%</p>
            <p className="text-xs text-muted-foreground">نسبة الإنجازات المفتوحة</p>
            <div className="w-full bg-secondary rounded-full h-2.5 mt-3">
              <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1 }}
                className="gold-gradient h-2.5 rounded-full" />
            </div>
          </motion.div>

          {/* Achievements Grid */}
          <div className="grid grid-cols-2 gap-3">
            {ACHIEVEMENTS.map((ach, i) => {
              const unlocked = unlockedKeys.has(ach.key);
              return (
                <motion.div key={ach.key} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`glass-card p-4 text-center relative overflow-hidden transition-all ${
                    unlocked ? "border-primary/30" : "opacity-60"
                  }`}>
                  {unlocked && (
                    <div className="absolute top-2 left-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    </div>
                  )}
                  {!unlocked && (
                    <div className="absolute top-2 left-2">
                      <Lock className="w-3.5 h-3.5 text-muted-foreground/50" />
                    </div>
                  )}
                  <span className={`text-3xl block mb-2 ${!unlocked ? "grayscale" : ""}`}>{ach.icon}</span>
                  <h3 className="font-heading text-sm font-bold text-foreground mb-0.5">{ach.title}</h3>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">{ach.description}</p>
                  <span className={`inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full ${
                    unlocked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}>{ach.condition}</span>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Achievements;
