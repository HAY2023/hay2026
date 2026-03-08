import { useEffect, useState } from "react";
import { ACHIEVEMENTS } from "@/data/achievements";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

interface AchievementToastProps {
  achievementKeys: string[];
  onDone: () => void;
}

const AchievementToast = ({ achievementKeys, onDone }: AchievementToastProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  const achievements = achievementKeys
    .map(key => ACHIEVEMENTS.find(a => a.key === key))
    .filter(Boolean);

  useEffect(() => {
    if (achievements.length === 0) { onDone(); return; }
    // Fire confetti for each achievement
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.3 },
      colors: ["#D4AF37", "#FFD700", "#FFA500", "#9C27B0"],
    });

    // Play achievement sound
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      gain.gain.value = 0.12;
      osc.frequency.value = 587; osc.start();
      setTimeout(() => { osc.frequency.value = 740; }, 120);
      setTimeout(() => { osc.frequency.value = 880; }, 240);
      setTimeout(() => { osc.frequency.value = 1175; }, 360);
      setTimeout(() => { osc.stop(); ctx.close(); }, 550);
    } catch {}
  }, [currentIndex]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentIndex + 1 < achievements.length) {
        setVisible(false);
        setTimeout(() => {
          setCurrentIndex(prev => prev + 1);
          setVisible(true);
        }, 400);
      } else {
        setVisible(false);
        setTimeout(onDone, 400);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [currentIndex, achievements.length]);

  if (achievements.length === 0) return null;
  const ach = achievements[currentIndex];
  if (!ach) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex items-start justify-center pt-16">
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: -60, scale: 0.7 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="pointer-events-auto glass-card border-primary/40 px-6 py-4 flex items-center gap-4 shadow-2xl shadow-primary/20 max-w-sm"
          >
            {/* Glow effect */}
            <div className="absolute inset-0 rounded-xl gold-gradient opacity-10" />
            
            {/* Icon with pulse */}
            <motion.div
              animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.8, repeat: 2 }}
              className="relative z-10 text-4xl flex-shrink-0"
            >
              {ach.icon}
            </motion.div>

            <div className="relative z-10 text-right flex-1">
              <motion.p
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="text-xs text-primary font-heading font-bold mb-0.5 flex items-center gap-1 justify-end"
              >
                🏆 إنجاز جديد!
              </motion.p>
              <motion.p
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="text-sm font-heading font-bold text-foreground"
              >
                {ach.title}
              </motion.p>
              <motion.p
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="text-[11px] text-muted-foreground"
              >
                {ach.description}
              </motion.p>
            </div>

            {/* Progress indicator */}
            {achievements.length > 1 && (
              <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
                {achievements.map((_, i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    i <= currentIndex ? "bg-primary" : "bg-muted"
                  }`} />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AchievementToast;
