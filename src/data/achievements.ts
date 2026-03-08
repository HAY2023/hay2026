export interface Achievement {
  key: string;
  title: string;
  description: string;
  icon: string;
  condition: string; // for display
}

export const ACHIEVEMENTS: Achievement[] = [
  { key: "first_game", title: "البداية", description: "أكمل أول اختبار", icon: "🎮", condition: "1 اختبار" },
  { key: "games_10", title: "لاعب نشيط", description: "أكمل 10 اختبارات", icon: "🔥", condition: "10 اختبارات" },
  { key: "games_50", title: "محترف", description: "أكمل 50 اختبارًا", icon: "💪", condition: "50 اختبار" },
  { key: "games_100", title: "أسطوري", description: "أكمل 100 اختبار", icon: "🏆", condition: "100 اختبار" },
  { key: "perfect_score", title: "كامل", description: "احصل على 100% في اختبار", icon: "💯", condition: "100% مرة" },
  { key: "perfect_5", title: "متقن", description: "احصل على 100% في 5 اختبارات", icon: "⭐", condition: "100% × 5" },
  { key: "streak_3", title: "مثابر", description: "العب 3 أيام متتالية", icon: "📅", condition: "3 أيام" },
  { key: "streak_7", title: "ملتزم", description: "العب 7 أيام متتالية", icon: "🗓️", condition: "7 أيام" },
  { key: "streak_30", title: "لا يُهزم", description: "العب 30 يومًا متتاليًا", icon: "👑", condition: "30 يوم" },
  { key: "level_5", title: "متعلم", description: "وصلت للمستوى 5", icon: "📘", condition: "Lv.5" },
  { key: "level_10", title: "خبير", description: "وصلت للمستوى 10", icon: "📗", condition: "Lv.10" },
  { key: "level_20", title: "عبقري", description: "وصلت للمستوى 20", icon: "📕", condition: "Lv.20" },
  { key: "xp_1000", title: "جامع النقاط", description: "اجمع 1000 XP", icon: "💎", condition: "1000 XP" },
  { key: "xp_5000", title: "ثري بالمعرفة", description: "اجمع 5000 XP", icon: "🏅", condition: "5000 XP" },
  { key: "first_purchase", title: "متسوق", description: "اشترِ أول عنصر من المتجر", icon: "🛒", condition: "شراء 1" },
  { key: "speed_demon", title: "سريع البرق", description: "أكمل اختبارًا في أقل من 30 ثانية", icon: "⚡", condition: "<30 ثانية" },
];
