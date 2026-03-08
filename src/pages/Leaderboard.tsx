import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getLevelTitle, getLevelColor } from "@/hooks/useXP";
import { Button } from "@/components/ui/button";
import StarsBackground from "@/components/StarsBackground";
import { ArrowRight, Trophy, Star, Zap, Crown, Medal, Award } from "lucide-react";
import { motion } from "framer-motion";

interface LeaderboardEntry {
  user_id: string;
  display_name: string | null;
  xp: number;
  level: number;
}

const rankIcons = ["👑", "🥈", "🥉"];

const Leaderboard = () => {
  const { user, isActivated, loading } = useAuth();
  const navigate = useNavigate();
  const [players, setPlayers] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (user && isActivated) fetchLeaderboard();
  }, [user, isActivated]);

  const fetchLeaderboard = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("user_id, display_name, xp, level")
      .order("xp", { ascending: false })
      .limit(50);

    if (data) {
      const entries = (data as any[]).map(d => ({
        user_id: d.user_id,
        display_name: d.display_name,
        xp: d.xp ?? 0,
        level: d.level ?? 1,
      }));
      setPlayers(entries);
      const rank = entries.findIndex(e => e.user_id === user.id);
      if (rank !== -1) setMyRank(rank + 1);
    }
    setFetching(false);
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

  return (
    <div className="min-h-screen relative">
      <StarsBackground />
      <div className="relative z-10">
        <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-4 md:p-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="rounded-xl">
            <ArrowRight className="w-5 h-5" />
          </Button>
          <h1 className="font-heading text-xl font-bold gold-text flex items-center gap-2">
            <Trophy className="w-5 h-5" /> لوحة المتصدرين
          </h1>
          <div className="w-10" />
        </motion.header>

        <div className="max-w-lg mx-auto px-4 space-y-4 pb-10">
          {/* My Rank */}
          {myRank !== null && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="glass-card p-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 gold-gradient" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="text-sm font-heading font-bold text-primary">
                    {players.find(p => p.user_id === user.id)?.xp ?? 0} XP
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground font-body">ترتيبك</span>
                  <span className="text-2xl font-heading font-bold gold-text">#{myRank}</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Top 3 Podium */}
          {players.length >= 3 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="flex items-end justify-center gap-3 py-4">
              {[1, 0, 2].map((idx) => {
                const p = players[idx];
                const isFirst = idx === 0;
                return (
                  <motion.div key={idx}
                    initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + idx * 0.1 }}
                    className={`flex flex-col items-center ${isFirst ? "order-2" : idx === 1 ? "order-1" : "order-3"}`}>
                    <span className="text-2xl mb-1">{rankIcons[idx]}</span>
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center font-heading font-bold text-lg ${
                      isFirst ? "bg-primary/20 text-primary border-2 border-primary/40" :
                      idx === 1 ? "bg-secondary text-foreground border border-border" :
                      "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                    }`}>
                      {p.display_name?.charAt(0) ?? "?"}
                    </div>
                    <p className="text-xs font-heading font-bold text-foreground mt-1.5 max-w-[80px] truncate text-center">
                      {p.display_name ?? "مجهول"}
                    </p>
                    <p className="text-[10px] text-primary font-bold">{p.xp} XP</p>
                    <div className={`h-${isFirst ? "20" : idx === 1 ? "14" : "10"} w-16 rounded-t-lg mt-1 ${
                      isFirst ? "bg-primary/15 h-20" : idx === 1 ? "bg-secondary h-14" : "bg-orange-500/10 h-10"
                    } flex items-center justify-center`}>
                      <span className={`text-xs font-bold ${getLevelColor(p.level)}`}>Lv.{p.level}</span>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {/* Full List */}
          {fetching ? (
            <div className="text-center py-10">
              <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                className="gold-text text-lg font-heading">جاري التحميل...</motion.div>
            </div>
          ) : players.length === 0 ? (
            <div className="glass-card p-10 text-center">
              <p className="text-muted-foreground font-body">لا يوجد لاعبون بعد</p>
            </div>
          ) : (
            <div className="space-y-2">
              {players.map((p, i) => (
                <motion.div key={p.user_id}
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * Math.min(i, 10) }}
                  className={`glass-card p-3 flex items-center justify-between ${
                    p.user_id === user.id ? "border-primary/30 bg-primary/5" : ""
                  }`}>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-primary" />
                      <span className="text-sm font-bold text-primary">{p.xp}</span>
                    </div>
                    <span className={`text-xs font-heading ${getLevelColor(p.level)}`}>
                      Lv.{p.level}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-heading font-bold text-foreground">
                        {p.display_name ?? "مجهول"}
                        {p.user_id === user.id && <span className="text-primary text-xs mr-1">(أنت)</span>}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{getLevelTitle(p.level)}</p>
                    </div>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold ${
                      i < 3 ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                    }`}>
                      {i < 3 ? rankIcons[i] : `#${i + 1}`}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
