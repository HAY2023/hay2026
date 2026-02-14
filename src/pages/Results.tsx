import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import StarsBackground from "@/components/StarsBackground";
import { Button } from "@/components/ui/button";
import { ArrowRight, Trophy } from "lucide-react";
import { motion } from "framer-motion";

interface Result {
  id: string; total_questions: number; correct_answers: number;
  score_percentage: number; played_at: string; categories?: { name: string } | null;
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

const Results = () => {
  const { user, isActivated, loading } = useAuth();
  const navigate = useNavigate();
  const [results, setResults] = useState<Result[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("game_results").select("*, categories(name)").eq("user_id", user.id)
      .order("played_at", { ascending: false }).limit(20)
      .then(({ data }) => { if (data) setResults(data as any); });
  }, [user]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isActivated) return <Navigate to="/pending" replace />;

  return (
    <div className="min-h-screen relative">
      <StarsBackground />
      <div className="relative z-10 max-w-2xl mx-auto p-4">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-heading font-bold gold-text flex items-center gap-2">
            <Trophy className="w-6 h-6 text-primary" /> نتائجي
          </h1>
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-1 rounded-xl">
            <ArrowRight className="w-4 h-4" /> العودة
          </Button>
        </motion.div>
        {results.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-10 text-center">
            <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 3, repeat: Infinity }} className="text-5xl mb-3">🎮</motion.div>
            <p className="text-muted-foreground">لم تلعب أي جولة بعد</p>
          </motion.div>
        ) : (
          <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
            {results.map((r) => (
              <motion.div key={r.id} variants={item} className="glass-card-hover p-4 flex items-center justify-between">
                <div>
                  <p className="font-heading font-bold text-foreground">{r.categories?.name ?? "كوكتيل"}</p>
                  <p className="text-xs text-muted-foreground">{new Date(r.played_at).toLocaleDateString("ar")}</p>
                </div>
                <div className="text-left">
                  <p className={`text-2xl font-heading font-bold ${r.score_percentage >= 80 ? "text-green-400" : r.score_percentage >= 50 ? "text-primary" : "text-destructive"}`}>
                    {r.score_percentage}%
                  </p>
                  <p className="text-xs text-muted-foreground">{r.correct_answers}/{r.total_questions}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Results;
