import { supabase } from "@/integrations/supabase/client";

// XP thresholds per level
const XP_PER_LEVEL = [
  0, 100, 250, 500, 800, 1200, 1700, 2300, 3000, 4000,
  5000, 6500, 8000, 10000, 12500, 15000, 18000, 22000, 27000, 33000,
];

export const getLevelFromXP = (xp: number): number => {
  for (let i = XP_PER_LEVEL.length - 1; i >= 0; i--) {
    if (xp >= XP_PER_LEVEL[i]) return i + 1;
  }
  return 1;
};

export const getXPForNextLevel = (level: number): number => {
  return XP_PER_LEVEL[level] ?? XP_PER_LEVEL[XP_PER_LEVEL.length - 1] + 5000;
};

export const getXPForCurrentLevel = (level: number): number => {
  return XP_PER_LEVEL[level - 1] ?? 0;
};

export const getLevelTitle = (level: number): string => {
  if (level <= 3) return "مبتدئ";
  if (level <= 6) return "متعلم";
  if (level <= 9) return "متقدم";
  if (level <= 12) return "خبير";
  if (level <= 15) return "أستاذ";
  if (level <= 18) return "عبقري";
  return "أسطورة";
};

export const getLevelColor = (level: number): string => {
  if (level <= 3) return "text-green-400";
  if (level <= 6) return "text-blue-400";
  if (level <= 9) return "text-purple-400";
  if (level <= 12) return "text-yellow-400";
  if (level <= 15) return "text-orange-400";
  if (level <= 18) return "text-red-400";
  return "text-primary";
};

export const calculateGameXP = (
  scorePercentage: number,
  totalQuestions: number,
  isPerfect: boolean,
  streakDays: number
): number => {
  let xp = Math.round(scorePercentage * 0.5 * totalQuestions * 0.1);
  // Minimum 5 XP for playing
  xp = Math.max(xp, 5);
  // Perfect bonus
  if (isPerfect) xp += 50;
  // Streak bonus
  if (streakDays >= 3) xp += 10;
  if (streakDays >= 7) xp += 20;
  return xp;
};

export const awardXP = async (userId: string, amount: number): Promise<{ newXP: number; newLevel: number; leveledUp: boolean }> => {
  const { data: profile } = await supabase
    .from("profiles")
    .select("xp, level")
    .eq("user_id", userId)
    .single();

  const currentXP = (profile as any)?.xp ?? 0;
  const currentLevel = (profile as any)?.level ?? 1;
  const newXP = currentXP + amount;
  const newLevel = getLevelFromXP(newXP);

  await supabase
    .from("profiles")
    .update({ xp: newXP, level: newLevel } as any)
    .eq("user_id", userId);

  return { newXP, newLevel, leveledUp: newLevel > currentLevel };
};
