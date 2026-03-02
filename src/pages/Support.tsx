import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import StarsBackground from "@/components/StarsBackground";
import { ArrowRight, Mail, MessageCircle, HelpCircle, Shield, Zap } from "lucide-react";
import { motion } from "framer-motion";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

const Support = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const supportItems = [
    { icon: <Mail className="w-6 h-6" />, title: "البريد الإلكتروني", desc: "تواصل معنا عبر البريد", action: "mailto:support@hay2026.app", color: "text-primary" },
    { icon: <MessageCircle className="w-6 h-6" />, title: "الدردشة المباشرة", desc: "محادثة فورية مع فريق الدعم", action: "#", color: "text-green-400" },
    { icon: <HelpCircle className="w-6 h-6" />, title: "الأسئلة الشائعة", desc: "إجابات على الأسئلة المتكررة", action: "#faq", color: "text-blue-400" },
  ];

  const faqItems = [
    { q: "كيف أفعّل حسابي؟", a: "أدخل كود التفعيل في صفحة الانتظار. الكود بصيغة XXXXX-XXXXX-MM-YY. تواصل مع الأدمن للحصول على كود." },
    { q: "ما الفرق بين HAY و PRO؟", a: "HAY: النسخة الأساسية لإنشاء الأسئلة واللعب. PRO: تضيف ميزات AI متقدمة مثل توليد نماذج اختبارات وتصحيح كالأستاذ." },
    { q: "كيف أستخدم الذكاء الاصطناعي؟", a: "اذهب لإدارة أسئلتي > توليد AI واختر الموضوع والمستوى. لمستخدمي PRO: استخدم اختبار PRO للتجربة الكاملة." },
    { q: "هل يمكنني تصدير أسئلتي؟", a: "نعم! من إدارة أسئلتي > تصدير يمكنك تصدير بصيغة JSON أو PowerPoint بدون إجابات." },
    { q: "نسيت كلمة المرور", a: "اضغط على 'نسيت كلمة المرور' في صفحة تسجيل الدخول وأدخل بريدك الإلكتروني." },
  ];

  return (
    <div className="min-h-screen relative">
      <StarsBackground />
      <div className="relative z-10 max-w-lg mx-auto p-4 md:p-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-heading font-bold gold-text">الدعم الفني</h1>
          </div>
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-1 rounded-xl">
            <ArrowRight className="w-4 h-4" /> العودة
          </Button>
        </motion.div>

        {/* Contact methods */}
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-3 mb-8">
          {supportItems.map((s, i) => (
            <motion.a key={i} variants={item} href={s.action}
              className="glass-card-hover p-4 flex items-center gap-4 block">
              <div className={`w-12 h-12 rounded-xl bg-secondary/50 flex items-center justify-center ${s.color}`}>
                {s.icon}
              </div>
              <div>
                <h3 className="font-heading font-bold text-foreground">{s.title}</h3>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
            </motion.a>
          ))}
        </motion.div>

        {/* FAQ */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h2 className="font-heading text-lg font-bold gold-text mb-4 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-primary" /> الأسئلة الشائعة
          </h2>
          <div className="space-y-3">
            {faqItems.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.05 }}
                className="glass-card p-4 text-right">
                <h4 className="font-heading font-bold text-foreground text-sm mb-1">{f.q}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.a}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Version info */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
          className="mt-8 text-center text-xs text-muted-foreground space-y-1">
          <div className="flex items-center justify-center gap-2">
            <Zap className="w-3 h-3 text-primary" />
            <span>Quiz AI - النسخة 2.0</span>
          </div>
          <p>© 2026 HAY. جميع الحقوق محفوظة.</p>
        </motion.div>
      </div>
    </div>
  );
};

export default Support;
