import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import StarsBackground from "@/components/StarsBackground";
import {
  Brain, LogOut, Settings, Sparkles, Trophy, PenTool, Zap, Heart,
  GraduationCap, HelpCircle, User, BookOpen, Flame, Target,
  TrendingUp, Clock, Star, Award, ChevronLeft, BarChart3, Calendar, ShoppingBag
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import NotificationBell from "@/components/NotificationBell";
import { Progress } from "@/components/ui/progress";
import { getLevelFromXP, getXPForNextLevel, getXPForCurrentLevel, getLevelTitle, getLevelColor } from "@/hooks/useXP";

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface QuickStat {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

const motivationalQuotes = [
  "العلم نور والجهل ظلام 🌟",
  "من جدّ وجد ومن زرع حصد 🌾",
  "اطلبوا العلم من المهد إلى اللحد 📚",
  "النجاح ليس نهاية الطريق، بل بداية رحلة جديدة 🚀",
  "كل يوم فرصة جديدة للتعلم ✨",
  "الاستمرارية مفتاح النجاح 🔑",
  "المعرفة كنز لا يفنى 💎",
  "التكرار يعلّم الحمار 🎯",
];

const dailyTips = [
  { tip: "راجع دروسك يومياً لمدة 30 دقيقة على الأقل", icon: "⏰" },
  { tip: "استخدم تقنية بومودورو: 25 دقيقة دراسة + 5 دقائق راحة", icon: "🍅" },
  { tip: "اكتب ملخصات بخط يدك لتثبيت المعلومات", icon: "✍️" },
  { tip: "حل تمارين متنوعة ولا تكتفِ بالقراءة فقط", icon: "📝" },
  { tip: "النوم الجيد يساعد على تثبيت المعلومات في الذاكرة", icon: "😴" },
  { tip: "اشرح ما تعلمته لشخص آخر لتتأكد من فهمك", icon: "🗣️" },
  { tip: "ابدأ بالمواد الصعبة وأنت نشيط ذهنياً", icon: "🧠" },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
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
  const [totalGames, setTotalGames] = useState(0);
  const [avgScore, setAvgScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [recentResults, setRecentResults] = useState<any[]>([]);
  const [streak, setStreak] = useState(0);
  const [xp, setXP] = useState(0);
  const [level, setLevel] = useState(1);

  const todayQuote = motivationalQuotes[new Date().getDate() % motivationalQuotes.length];
  const todayTip = dailyTips[new Date().getDate() % dailyTips.length];

  useEffect(() => {
    if (user && isActivated) {
      fetchCategories();
      fetchStats();
    }
  }, [user, isActivated]);

  const fetchCategories = async () => {
    if (!user) return;
    try {
      const { data: catData } = await supabase
        .from("categories")
        .select("*")
        .or(`created_by.eq.${user.id},created_by.is.null`);

      if (catData && catData.length > 0) {
        setCategories(catData as Category[]);
      } else {
        const { data: qData } = await supabase.from("questions").select("category_id").eq("created_by", user.id);
        if (qData && qData.length > 0) {
          const uniqueCatIds = [...new Set(qData.map(q => q.category_id))];
          const { data: linkedCats } = await supabase.from("categories").select("*").in("id", uniqueCatIds);
          if (linkedCats && linkedCats.length > 0) { setCategories(linkedCats as Category[]); return; }
        }
        const defaults = [
          { name: "جغرافيا", icon: "🌍", color: "#4CAF50", created_by: user.id },
          { name: "تاريخ", icon: "📜", color: "#FF9800", created_by: user.id },
          { name: "علوم", icon: "🔬", color: "#2196F3", created_by: user.id },
          { name: "رياضيات", icon: "🔢", color: "#9C27B0", created_by: user.id },
          { name: "ثقافة عامة", icon: "📚", color: "#D4AF37", created_by: user.id },
          { name: "رياضة", icon: "⚽", color: "#F44336", created_by: user.id },
        ];
        await supabase.from("categories").insert(defaults);
        const { data: newData } = await supabase.from("categories").select("*").eq("created_by", user.id);
        if (newData) setCategories(newData as Category[]);
      }
    } catch (err) { console.error("Error in fetchCategories:", err); }
  };

  const fetchStats = async () => {
    if (!user) return;
    try {
      const [resultsRes, questionsRes, profileRes] = await Promise.all([
        supabase.from("game_results").select("*, categories(name)").eq("user_id", user.id).order("played_at", { ascending: false }).limit(50),
        supabase.from("questions").select("id").eq("created_by", user.id),
        supabase.from("profiles").select("xp, level").eq("user_id", user.id).single(),
      ]);

      if (profileRes.data) {
        setXP((profileRes.data as any).xp ?? 0);
        setLevel((profileRes.data as any).level ?? 1);
      }

      const results = resultsRes.data || [];
      setTotalGames(results.length);
      setTotalQuestions((questionsRes.data || []).length);
      setRecentResults(results.slice(0, 3));

      if (results.length > 0) {
        const avg = results.reduce((sum, r) => sum + r.score_percentage, 0) / results.length;
        setAvgScore(Math.round(avg));
        setBestScore(Math.max(...results.map(r => r.score_percentage)));

        // Calculate streak (consecutive days played)
        let currentStreak = 0;
        const today = new Date();
        for (let i = 0; i < 30; i++) {
          const checkDate = new Date(today);
          checkDate.setDate(today.getDate() - i);
          const dateStr = checkDate.toISOString().split("T")[0];
          const played = results.some(r => r.played_at.startsWith(dateStr));
          if (played || i === 0) { if (played) currentStreak++; }
          else break;
        }
        setStreak(currentStreak);
      }
    } catch (err) { console.error("Stats error:", err); }
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

  const version = profile?.version || "hay";
  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? "صباح الخير" : greetingHour < 18 ? "مساء الخير" : "مساء النور";

  const stats: QuickStat[] = [
    { label: "الألعاب", value: totalGames, icon: <Target className="w-4 h-4" />, color: "text-primary" },
    { label: "المعدل", value: `${avgScore}%`, icon: <TrendingUp className="w-4 h-4" />, color: "text-green-400" },
    { label: "أفضل نتيجة", value: `${bestScore}%`, icon: <Star className="w-4 h-4" />, color: "text-yellow-400" },
    { label: "أسئلتي", value: totalQuestions, icon: <BarChart3 className="w-4 h-4" />, color: "text-blue-400" },
  ];

  return (
    <div className="min-h-screen relative">
      <StarsBackground />
      <div className="relative z-10">
        {/* Header */}
        <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="flex items-center justify-between p-4 md:p-6">
          <div className="flex items-center gap-3">
            <motion.div whileHover={{ rotate: 10 }} className="w-12 h-12 rounded-2xl gold-gradient flex items-center justify-center shadow-lg shadow-primary/20">
              <Brain className="w-7 h-7 text-background" />
            </motion.div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading text-xl font-bold gold-text">Quiz AI</h1>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${version === "pro" ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-primary/10 text-primary border border-primary/20"}`}>
                  {version.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-body">{greeting}، {profile?.display_name} 👋</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => navigate("/admin")} className="gap-1 rounded-xl text-xs border-primary/30">
                <Settings className="w-3.5 h-3.5" /> إدارة
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={signOut} className="rounded-xl">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </motion.header>

        <div className="max-w-lg mx-auto px-4 space-y-5 pb-10">

          {/* Streak & Motivational Banner */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="glass-card p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 gold-gradient" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {streak > 0 && (
                  <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}
                    className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 px-3 py-1.5 rounded-xl">
                    <Flame className="w-5 h-5 text-orange-400" />
                    <span className="text-sm font-bold text-orange-400">{streak}</span>
                    <span className="text-xs text-orange-400/70">يوم</span>
                  </motion.div>
                )}
              </div>
              <p className="text-xs text-muted-foreground font-body text-right flex-1 mr-3">{todayQuote}</p>
            </div>
          </motion.div>

          {/* XP & Level Bar */}
          {(() => {
            const currentLevelXP = getXPForCurrentLevel(level);
            const nextLevelXP = getXPForNextLevel(level);
            const progressInLevel = nextLevelXP > currentLevelXP ? ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100 : 100;
            return (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
                className="glass-card p-4 cursor-pointer" onClick={() => navigate("/store")}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-primary" />
                    <span className="text-xs text-primary font-heading font-bold">المتجر</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <span className={`text-sm font-heading font-bold ${getLevelColor(level)}`}>
                        Lv.{level} {getLevelTitle(level)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 bg-primary/10 border border-primary/20 px-2 py-1 rounded-lg">
                      <Zap className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-bold text-primary">{xp}</span>
                    </div>
                  </div>
                </div>
                <Progress value={progressInLevel} className="h-2 rounded-full" />
                <p className="text-[10px] text-muted-foreground mt-1 text-center">
                  {Math.round(nextLevelXP - xp)} XP للمستوى {level + 1}
                </p>
              </motion.div>
            );
          })()}

          {/* Quick Stats */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="grid grid-cols-4 gap-2">
            {stats.map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                className="glass-card p-3 text-center">
                <div className={`${stat.color} mx-auto mb-1`}>{stat.icon}</div>
                <p className="text-lg font-heading font-bold text-foreground">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Daily Tip */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
            className="glass-card p-4 border-r-4 border-r-primary">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{todayTip.icon}</span>
              <div>
                <p className="text-xs text-primary font-heading font-bold mb-1">💡 نصيحة اليوم</p>
                <p className="text-sm text-muted-foreground font-body">{todayTip.tip}</p>
              </div>
            </div>
          </motion.div>

          {/* Main Action Buttons */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="space-y-3">
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
            </div>

            {version === "pro" && (
              <>
                <motion.div whileTap={{ scale: 0.97 }}>
                  <Button onClick={() => navigate("/pro-exam")}
                    className="bg-purple-600 hover:bg-purple-700 text-white gap-2 h-14 text-base font-heading w-full rounded-xl shadow-lg shadow-purple-500/20">
                    <GraduationCap className="w-5 h-5" /> اختبار PRO - AI أستاذ
                  </Button>
                </motion.div>
                <div className="grid grid-cols-2 gap-3">
                  <motion.div whileTap={{ scale: 0.97 }}>
                    <Button onClick={() => navigate("/curriculum")} variant="outline"
                      className="gap-2 h-12 text-sm font-heading w-full rounded-xl border-primary/30">
                      <Sparkles className="w-4 h-4 text-primary" /> 🇩🇿 المنهج الدراسي
                    </Button>
                  </motion.div>
                  <motion.div whileTap={{ scale: 0.97 }}>
                    <Button onClick={() => navigate("/library")} variant="outline"
                      className="gap-2 h-12 text-sm font-heading w-full rounded-xl border-primary/30">
                      <BookOpen className="w-4 h-4 text-primary" /> 📚 المكتبة
                    </Button>
                  </motion.div>
                </div>
              </>
            )}
          </motion.div>

          {/* Recent Results */}
          {recentResults.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <div className="flex items-center justify-between mb-2">
                <button onClick={() => navigate("/results")} className="text-xs text-primary flex items-center gap-1 hover:underline">
                  عرض الكل <ChevronLeft className="w-3 h-3" />
                </button>
                <h3 className="text-sm font-heading font-bold text-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" /> آخر النتائج
                </h3>
              </div>
              <div className="space-y-2">
                {recentResults.map((r, i) => (
                  <motion.div key={r.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + i * 0.05 }}
                    className="glass-card p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold ${
                        r.score_percentage >= 80 ? "bg-green-500/10 text-green-400" :
                        r.score_percentage >= 50 ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                      }`}>
                        {r.score_percentage}%
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{r.correct_answers}/{r.total_questions} صحيحة</p>
                        <Progress value={r.score_percentage} className="w-20 h-1.5 mt-1" />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-heading font-bold text-foreground">{r.categories?.name ?? "كوكتيل"}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(r.played_at).toLocaleDateString("ar")}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Lives selector */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <h3 className="text-sm font-heading font-bold text-foreground mb-2 flex items-center gap-2 justify-end">
              عدد القلوب <Heart className="w-4 h-4 text-destructive" />
            </h3>
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
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <h3 className="text-sm font-heading font-bold text-foreground mb-3 flex items-center gap-2 justify-end">
              اختر القسم وابدأ التحدي <Zap className="w-4 h-4 text-primary" />
            </h3>
            {categories.length === 0 ? (
              <div className="glass-card p-10 text-center">
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 3, repeat: Infinity }} className="text-5xl mb-4">📝</motion.div>
                <p className="text-muted-foreground mb-5 font-body">لم تضف أي أقسام بعد. أنشئ أقسامك وأسئلتك!</p>
                <motion.div whileTap={{ scale: 0.97 }}>
                  <Button onClick={() => navigate("/dashboard")} className="gold-gradient text-background gap-2 rounded-xl shadow-lg shadow-primary/15">
                    <PenTool className="w-4 h-4" /> إنشاء أقسام وأسئلة
                  </Button>
                </motion.div>
              </div>
            ) : (
              <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 gap-3">
                {/* Cocktail */}
                <motion.button variants={item} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => navigate(`/play/all?lives=${livesCount}`)}
                  className="glass-card-hover p-5 text-center col-span-2 relative overflow-hidden group">
                  <div className="absolute inset-0 gold-gradient opacity-5 group-hover:opacity-10 transition-opacity" />
                  <div className="relative z-10 flex items-center justify-center gap-4">
                    <div>
                      <h3 className="font-heading text-lg font-bold gold-text">🍸 كوكتيل</h3>
                      <p className="text-xs text-muted-foreground">جميع الأقسام مختلطة</p>
                    </div>
                    <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 2, repeat: Infinity }}
                      className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Zap className="w-6 h-6 text-primary" />
                    </motion.div>
                  </div>
                </motion.button>

                {categories.map((cat) => (
                  <motion.button key={cat.id} variants={item} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={() => navigate(`/play/${cat.id}?lives=${livesCount}`)}
                    className="glass-card-hover p-5 text-center relative overflow-hidden group">
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity" style={{ background: cat.color }} />
                    <div className="relative z-10">
                      <span className="text-3xl mb-2 block">{cat.icon}</span>
                      <h3 className="font-heading text-sm font-bold text-foreground">{cat.name}</h3>
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </motion.div>

          {/* Footer Navigation */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="flex gap-2">
            <motion.div whileTap={{ scale: 0.97 }} className="flex-1">
              <Button onClick={() => navigate("/settings")} variant="ghost" className="gap-2 w-full rounded-xl text-muted-foreground hover:text-foreground">
                <User className="w-4 h-4" /> الإعدادات
              </Button>
            </motion.div>
            <motion.div whileTap={{ scale: 0.97 }} className="flex-1">
              <Button onClick={() => navigate("/support")} variant="ghost" className="gap-2 w-full rounded-xl text-muted-foreground hover:text-foreground">
                <HelpCircle className="w-4 h-4" /> الدعم الفني
              </Button>
            </motion.div>
          </motion.div>

          {/* App Version Footer */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
            className="text-center py-4">
            <p className="text-[10px] text-muted-foreground/50">Quiz AI v2.0 — مدعوم بالذكاء الاصطناعي 🇩🇿</p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Index;
