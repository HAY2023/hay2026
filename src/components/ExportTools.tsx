import { Button } from "@/components/ui/button";
import { Download, FileJson, FileText } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options: string[] | null;
  correct_answer: string;
  time_limit: number;
  category_id: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface ExportToolsProps {
  questions: Question[];
  categories: Category[];
  selectedCat: string;
}

const ExportTools = ({ questions, categories, selectedCat }: ExportToolsProps) => {
  const filtered = selectedCat ? questions.filter(q => q.category_id === selectedCat) : questions;
  const catName = categories.find(c => c.id === selectedCat)?.name || "الكل";

  const exportJSON = () => {
    if (filtered.length === 0) { toast.error("لا توجد أسئلة للتصدير"); return; }
    const data = {
      category: catName,
      exportDate: new Date().toISOString(),
      totalQuestions: filtered.length,
      questions: filtered.map(q => ({
        question: q.question_text,
        type: q.question_type,
        options: q.options,
        correctAnswer: q.correct_answer,
        timeLimit: q.time_limit,
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `أسئلة-${catName}.json`; a.click();
    URL.revokeObjectURL(url);
    toast.success("تم تصدير الأسئلة بصيغة JSON");
  };

  const exportPPTX = async () => {
    if (filtered.length === 0) { toast.error("لا توجد أسئلة للتصدير"); return; }
    try {
      const pptxgenjs = await import("pptxgenjs");
      const PptxGenJS = pptxgenjs.default;
      const pptx = new PptxGenJS();
      pptx.layout = "LAYOUT_WIDE";

      // Title slide
      const titleSlide = pptx.addSlide();
      titleSlide.background = { color: "1a1a2e" };
      titleSlide.addText(`📝 ${catName}`, {
        x: 0.5, y: 1.5, w: "90%", h: 1.5,
        fontSize: 44, bold: true, color: "D4AF37", align: "center", fontFace: "Arial",
      });
      titleSlide.addText(`${filtered.length} سؤال`, {
        x: 0.5, y: 3.5, w: "90%", h: 0.8,
        fontSize: 24, color: "FFFFFF", align: "center", fontFace: "Arial",
      });
      titleSlide.addText("Quiz AI - منصة الاختبارات الذكية", {
        x: 0.5, y: 4.8, w: "90%", h: 0.5,
        fontSize: 14, color: "888888", align: "center", fontFace: "Arial",
      });

      // Question slides
      filtered.forEach((q, i) => {
        const slide = pptx.addSlide();
        slide.background = { color: "16213e" };

        // Question number badge
        slide.addText(`${i + 1}`, {
          x: 11.5, y: 0.3, w: 0.8, h: 0.8,
          fontSize: 28, bold: true, color: "1a1a2e", align: "center",
          fill: { color: "D4AF37" }, shape: pptxgenjs.default ? undefined : undefined,
        });

        // Timer
        slide.addText(`⏱ ${q.time_limit}s`, {
          x: 0.3, y: 0.3, w: 1.2, h: 0.5,
          fontSize: 14, color: "D4AF37", fontFace: "Arial",
        });

        // Question type
        const typeLabel = q.question_type === "multiple_choice" ? "اختيار متعدد" : q.question_type === "matching" ? "ربط" : "كتابة";
        slide.addText(typeLabel, {
          x: 0.3, y: 0.8, w: 2, h: 0.4,
          fontSize: 12, color: "888888", fontFace: "Arial",
        });

        // Question text
        slide.addText(q.question_text, {
          x: 0.5, y: 1.5, w: "90%", h: 1.5,
          fontSize: 28, bold: true, color: "FFFFFF", align: "center", fontFace: "Arial",
          rtlMode: true,
        });

        // Options
        if (q.question_type === "multiple_choice" && q.options) {
          const opts = q.options as string[];
          opts.forEach((opt, oi) => {
            const isCorrect = opt.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
            const col = oi % 2 === 0 ? 0.5 : 6.8;
            const row = oi < 2 ? 3.5 : 4.5;
            slide.addText(opt, {
              x: col, y: row, w: 5.5, h: 0.8,
              fontSize: 18, color: isCorrect ? "4ade80" : "FFFFFF",
              fill: { color: isCorrect ? "1a3a2e" : "2a2a4e" },
              align: "center", fontFace: "Arial", rtlMode: true,
            });
          });
        } else {
          // Answer for text/matching
          slide.addText(`✅ ${q.correct_answer}`, {
            x: 0.5, y: 3.5, w: "90%", h: 0.8,
            fontSize: 20, color: "4ade80", align: "center", fontFace: "Arial", rtlMode: true,
            fill: { color: "1a3a2e" },
          });
        }
      });

      // End slide
      const endSlide = pptx.addSlide();
      endSlide.background = { color: "1a1a2e" };
      endSlide.addText("🎉 نهاية الأسئلة", {
        x: 0.5, y: 2, w: "90%", h: 1.5,
        fontSize: 40, bold: true, color: "D4AF37", align: "center", fontFace: "Arial",
      });
      endSlide.addText("بالتوفيق والنجاح! 🌟", {
        x: 0.5, y: 3.8, w: "90%", h: 0.8,
        fontSize: 24, color: "FFFFFF", align: "center", fontFace: "Arial",
      });

      await pptx.writeFile({ fileName: `أسئلة-${catName}.pptx` });
      toast.success("تم تصدير العرض التقديمي بنجاح!");
    } catch (e) {
      console.error("PPTX export error:", e);
      toast.error("حدث خطأ أثناء التصدير");
    }
  };

  return (
    <div className="flex gap-2">
      <motion.div whileTap={{ scale: 0.95 }}>
        <Button onClick={exportJSON} variant="outline" size="sm" className="gap-1 rounded-xl text-xs">
          <FileJson className="w-3.5 h-3.5" /> JSON
        </Button>
      </motion.div>
      <motion.div whileTap={{ scale: 0.95 }}>
        <Button onClick={exportPPTX} variant="outline" size="sm" className="gap-1 rounded-xl text-xs">
          <FileText className="w-3.5 h-3.5" /> PowerPoint
        </Button>
      </motion.div>
    </div>
  );
};

export default ExportTools;
