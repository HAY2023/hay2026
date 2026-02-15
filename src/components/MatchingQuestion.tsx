import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";

interface MatchingQuestionProps {
  leftItems: string[];
  rightItems: string[];
  correctPairs: Record<string, string>;
  onComplete: (isCorrect: boolean) => void;
  disabled: boolean;
}

const COLORS = ["#D4AF37", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8"];

const MatchingQuestion = ({ leftItems, rightItems, correctPairs, onComplete, disabled }: MatchingQuestionProps) => {
  const [connections, setConnections] = useState<Record<string, string>>({});
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const leftRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const rightRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [lines, setLines] = useState<{ x1: number; y1: number; x2: number; y2: number; color: string; left: string; right: string }[]>([]);

  const shuffledRight = useRef(
    [...rightItems].sort(() => Math.random() - 0.5)
  ).current;

  const updateLines = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const newLines = Object.entries(connections).map(([left, right], i) => {
      const leftEl = leftRefs.current[left];
      const rightEl = rightRefs.current[right];
      if (!leftEl || !rightEl) return null;
      const lr = leftEl.getBoundingClientRect();
      const rr = rightEl.getBoundingClientRect();
      return {
        x1: lr.left - rect.left,
        y1: lr.top - rect.top + lr.height / 2,
        x2: rr.right - rect.left,
        y2: rr.top - rect.top + rr.height / 2,
        color: COLORS[i % COLORS.length],
        left,
        right,
      };
    }).filter(Boolean) as any[];
    setLines(newLines);
  }, [connections]);

  useEffect(() => { updateLines(); }, [connections, updateLines]);
  useEffect(() => { window.addEventListener("resize", updateLines); return () => window.removeEventListener("resize", updateLines); }, [updateLines]);

  const handleLeftClick = (item: string) => {
    if (disabled || submitted) return;
    if (selectedLeft === item) { setSelectedLeft(null); return; }
    // Remove existing connection for this left item
    if (connections[item]) {
      setConnections(prev => { const n = { ...prev }; delete n[item]; return n; });
    }
    setSelectedLeft(item);
  };

  const handleRightClick = (item: string) => {
    if (disabled || submitted || !selectedLeft) return;
    // Remove any existing connection TO this right item
    const existing = Object.entries(connections).find(([, v]) => v === item);
    const newConns = { ...connections };
    if (existing) delete newConns[existing[0]];
    newConns[selectedLeft] = item;
    setConnections(newConns);
    setSelectedLeft(null);

    // Auto-submit when all connected
    if (Object.keys(newConns).length === leftItems.length) {
      setTimeout(() => {
        setSubmitted(true);
        const allCorrect = leftItems.every(l => newConns[l] === correctPairs[l]);
        onComplete(allCorrect);
      }, 500);
    }
  };

  const getItemState = (item: string, side: "left" | "right") => {
    if (!submitted) {
      if (side === "left" && selectedLeft === item) return "selected";
      if (side === "left" && connections[item]) return "connected";
      if (side === "right" && Object.values(connections).includes(item)) return "connected";
      return "default";
    }
    // After submit
    if (side === "left") {
      return connections[item] === correctPairs[item] ? "correct" : "wrong";
    }
    const leftKey = Object.entries(connections).find(([, v]) => v === item)?.[0];
    if (!leftKey) return "default";
    return connections[leftKey] === correctPairs[leftKey] ? "correct" : "wrong";
  };

  const stateClasses: Record<string, string> = {
    default: "border-border/50 bg-secondary/30",
    selected: "border-primary bg-primary/20 ring-2 ring-primary/30",
    connected: "border-primary/50 bg-primary/10",
    correct: "border-green-500 bg-green-500/10",
    wrong: "border-destructive bg-destructive/10",
  };

  return (
    <div ref={containerRef} className="relative" dir="rtl">
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
        {lines.map((line, i) => (
          <line key={i} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}
            stroke={submitted ? (connections[line.left] === correctPairs[line.left] ? "#4ade80" : "#ef4444") : line.color}
            strokeWidth="3" strokeLinecap="round" opacity={0.8} />
        ))}
      </svg>
      <div className="flex justify-between gap-6">
        <div className="flex-1 space-y-3">
          {leftItems.map((item, i) => (
            <motion.div key={item} ref={el => { leftRefs.current[item] = el; }}
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
              onClick={() => handleLeftClick(item)}
              className={`p-3 rounded-xl border-2 cursor-pointer text-center font-body transition-all ${stateClasses[getItemState(item, "left")]}`}
            >
              {item}
            </motion.div>
          ))}
        </div>
        <div className="flex-1 space-y-3">
          {shuffledRight.map((item, i) => (
            <motion.div key={item} ref={el => { rightRefs.current[item] = el; }}
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
              onClick={() => handleRightClick(item)}
              className={`p-3 rounded-xl border-2 cursor-pointer text-center font-body transition-all ${stateClasses[getItemState(item, "right")]}`}
            >
              {item}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MatchingQuestion;
