import { useState, useEffect, useRef } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StarsBackground from "@/components/StarsBackground";
import { toast } from "sonner";
import {
  ArrowRight, Mail, MessageCircle, HelpCircle, Shield, Zap,
  Send, Plus, Loader2, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Ticket {
  id: string;
  subject: string;
  status: string;
  created_at: string;
}

interface Message {
  id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

const Support = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [creating, setCreating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchTickets = async () => {
    if (!user) return;
    const { data } = await supabase.from("support_tickets").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (data) setTickets(data as Ticket[]);
  };

  const fetchMessages = async (ticketId: string) => {
    const { data } = await supabase.from("support_messages").select("*").eq("ticket_id", ticketId).order("created_at", { ascending: true });
    if (data) setMessages(data as Message[]);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  useEffect(() => { if (user) fetchTickets(); }, [user]);

  // Realtime messages
  useEffect(() => {
    if (!selectedTicket) return;
    const channel = supabase.channel(`ticket-${selectedTicket}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `ticket_id=eq.${selectedTicket}` }, () => {
        fetchMessages(selectedTicket);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedTicket]);

  const createTicket = async () => {
    if (!newSubject.trim() || !user) return;
    setCreating(true);
    const { data, error } = await supabase.from("support_tickets").insert({ user_id: user.id, subject: newSubject }).select().single();
    if (error) { toast.error("خطأ في إنشاء التذكرة"); setCreating(false); return; }
    setNewSubject("");
    setShowNewTicket(false);
    fetchTickets();
    if (data) { setSelectedTicket(data.id); fetchMessages(data.id); }
    toast.success("تم إنشاء تذكرة الدعم");
    setCreating(false);
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !selectedTicket || !user) return;
    await supabase.from("support_messages").insert({
      ticket_id: selectedTicket,
      sender_id: user.id,
      message: newMsg,
      is_admin: false,
    });
    setNewMsg("");
    fetchMessages(selectedTicket);
  };

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const faqItems = [
    { q: "كيف أفعّل حسابي؟", a: "أدخل كود التفعيل في صفحة الانتظار. الكود بصيغة XXXXX-XXXXX-MM-YY. تواصل مع الأدمن للحصول على كود." },
    { q: "ما الفرق بين HAY و PRO؟", a: "HAY: الأساسية. PRO: تضيف AI متقدم مع توليد نماذج اختبارات وتصحيح كالأستاذ." },
    { q: "كيف أستخدم الذكاء الاصطناعي؟", a: "إدارة أسئلتي > توليد AI. لمستخدمي PRO: اختبار PRO." },
    { q: "هل يمكنني تصدير أسئلتي؟", a: "نعم! إدارة أسئلتي > تصدير بصيغة JSON أو PowerPoint." },
  ];

  // Chat view
  if (selectedTicket) {
    const ticket = tickets.find(t => t.id === selectedTicket);
    return (
      <div className="min-h-screen relative">
        <StarsBackground />
        <div className="relative z-10 max-w-lg mx-auto p-4 md:p-6 flex flex-col h-screen">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="sm" onClick={() => { setSelectedTicket(null); setMessages([]); }} className="gap-1 rounded-xl">
              <ArrowRight className="w-4 h-4" /> رجوع
            </Button>
            <div className="text-right">
              <p className="font-heading text-sm font-bold text-foreground">{ticket?.subject}</p>
              <span className={`text-xs ${ticket?.status === "open" ? "text-green-400" : "text-muted-foreground"}`}>
                {ticket?.status === "open" ? "مفتوح" : "مغلق"}
              </span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-3 mb-4">
            {messages.length === 0 && (
              <div className="text-center text-sm text-muted-foreground mt-10">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>ابدأ المحادثة بإرسال رسالتك الأولى</p>
              </div>
            )}
            {messages.map((m) => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                className={`max-w-[80%] ${m.is_admin ? "mr-auto" : "ml-auto"}`}>
                <div className={`rounded-2xl p-3 ${m.is_admin ? "glass-card border-primary/30" : "bg-primary/20 border border-primary/30"}`}>
                  <p className="text-sm text-foreground text-right leading-relaxed">{m.message}</p>
                </div>
                <div className={`flex items-center gap-1 mt-1 text-xs text-muted-foreground ${m.is_admin ? "" : "justify-end"}`}>
                  <span>{m.is_admin ? "🛡️ الدعم" : "أنت"}</span>
                  <span>·</span>
                  <span>{new Date(m.created_at).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </motion.div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          {ticket?.status === "open" && (
            <div className="flex gap-2">
              <Input value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="اكتب رسالتك..."
                className="bg-secondary/50 text-right rounded-xl flex-1"
                onKeyDown={e => e.key === "Enter" && sendMessage()} />
              <Button onClick={sendMessage} className="gold-gradient text-background rounded-xl" disabled={!newMsg.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

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

        {/* New ticket button */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <AnimatePresence>
            {showNewTicket ? (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="glass-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading text-sm font-bold text-foreground">تذكرة دعم جديدة</h3>
                  <Button variant="ghost" size="icon" onClick={() => setShowNewTicket(false)} className="rounded-xl h-8 w-8">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <Input value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="موضوع المشكلة..."
                  className="bg-secondary/50 text-right rounded-xl" />
                <Button onClick={createTicket} disabled={creating || !newSubject.trim()}
                  className="gold-gradient text-background gap-1 rounded-xl w-full">
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  إرسال
                </Button>
              </motion.div>
            ) : (
              <Button onClick={() => setShowNewTicket(true)}
                className="gold-gradient text-background gap-2 rounded-xl w-full shadow-lg shadow-primary/15">
                <Plus className="w-4 h-4" /> تواصل مع الدعم الفني
              </Button>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Existing tickets */}
        {tickets.length > 0 && (
          <div className="mb-6">
            <h3 className="font-heading text-sm font-bold text-muted-foreground mb-3">تذاكر الدعم</h3>
            <motion.div variants={container} initial="hidden" animate="show" className="space-y-2">
              {tickets.map(t => (
                <motion.div key={t.id} variants={item}
                  onClick={() => { setSelectedTicket(t.id); fetchMessages(t.id); }}
                  className="glass-card-hover p-4 flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="font-heading font-bold text-foreground text-sm">{t.subject}</p>
                    <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString("ar")}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${t.status === "open" ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}`}>
                    {t.status === "open" ? "مفتوح" : "مغلق"}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        )}

        {/* FAQ */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h2 className="font-heading text-sm font-bold gold-text mb-3 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-primary" /> الأسئلة الشائعة
          </h2>
          <div className="space-y-2">
            {faqItems.map((f, i) => (
              <div key={i} className="glass-card p-3 text-right">
                <h4 className="font-heading font-bold text-foreground text-xs mb-1">{f.q}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          <div className="flex items-center justify-center gap-2">
            <Zap className="w-3 h-3 text-primary" />
            <span>Quiz AI v2.0</span>
          </div>
          <p className="mt-1">© 2026 HAY</p>
        </div>
      </div>
    </div>
  );
};

export default Support;
