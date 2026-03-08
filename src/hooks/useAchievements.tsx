import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ACHIEVEMENTS } from "@/data/achievements";

export const useAchievements = (userId: string | undefined) => {
  const [unlockedKeys, setUnlockedKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [newlyUnlocked, setNewlyUnlocked] = useState<string[]>([]);

  useEffect(() => {
    if (!userId) return;
    fetchUnlocked();
  }, [userId]);

  const fetchUnlocked = async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("user_achievements" as any)
      .select("achievement_key")
      .eq("user_id", userId);
    if (data) {
      setUnlockedKeys(new Set((data as any[]).map(d => d.achievement_key)));
    }
    setLoading(false);
  };

  const checkAndUnlock = async (stats: {
    totalGames: number;
    perfectGames: number;
    streak: number;
    level: number;
    xp: number;
    purchases: number;
    fastestGame: number | null;
  }) => {
    if (!userId) return;
    const toUnlock: string[] = [];

    const checks: Record<string, boolean> = {
      first_game: stats.totalGames >= 1,
      games_10: stats.totalGames >= 10,
      games_50: stats.totalGames >= 50,
      games_100: stats.totalGames >= 100,
      perfect_score: stats.perfectGames >= 1,
      perfect_5: stats.perfectGames >= 5,
      streak_3: stats.streak >= 3,
      streak_7: stats.streak >= 7,
      streak_30: stats.streak >= 30,
      level_5: stats.level >= 5,
      level_10: stats.level >= 10,
      level_20: stats.level >= 20,
      xp_1000: stats.xp >= 1000,
      xp_5000: stats.xp >= 5000,
      first_purchase: stats.purchases >= 1,
      speed_demon: stats.fastestGame !== null && stats.fastestGame < 30,
    };

    for (const [key, met] of Object.entries(checks)) {
      if (met && !unlockedKeys.has(key)) {
        toUnlock.push(key);
      }
    }

    if (toUnlock.length > 0) {
      const rows = toUnlock.map(key => ({ user_id: userId, achievement_key: key }));
      await (supabase.from("user_achievements" as any) as any).insert(rows);
      setUnlockedKeys(prev => {
        const next = new Set(prev);
        toUnlock.forEach(k => next.add(k));
        return next;
      });
      setNewlyUnlocked(toUnlock);
    }

    return toUnlock;
  };

  const clearNewlyUnlocked = () => setNewlyUnlocked([]);

  return {
    unlockedKeys,
    loading,
    newlyUnlocked,
    checkAndUnlock,
    clearNewlyUnlocked,
    totalAchievements: ACHIEVEMENTS.length,
    unlockedCount: unlockedKeys.size,
  };
};
