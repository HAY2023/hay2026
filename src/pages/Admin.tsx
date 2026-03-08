import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StarsBackground from "@/components/StarsBackground";
import { toast } from "sonner";
import {
  ArrowRight, Check, X, Users, Shield, KeyRound, Copy, Plus,
  Settings, Bell, MessageCircle, Clock, Crown, Bot, Loader2,
  CheckCircle, XCircle, ArrowUpCircle, Trash2, Calendar
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  is_activated: boolean;
  version: string | null;
  activation_expires_at: string | null;
}

interface ActivationCode {
  id: string;
  code: string;
  version: string;
  is_used: boolean;
  used_by: string | null;
  created_at: string;
}

interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  status: string;
  created_at: string;
}

interface AIDiagnosis {
  diagnosis: string;
  suggestedAction: string;
  suggestedDays?: number;
  suggestedVersion?: string;
  replyToUser: string;
  confidence: string;
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, x: 20 }, show: { opacity: 1, x: 0 } };

const generateCode = (version: string): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const rand = (len: number) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yy = String(now.getFullYear()).slice(-2);
  return `${rand(5)}-${rand(5)}-${mm}-${yy}`;
};

const Admin = () => {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<Profile[]>([]);
  const [codes, setCodes] = useState<ActivationCode[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [tab, setTab] = useState<"users" | "codes" | "tickets" | "settings">("users");
  const [genVersion, setGenVersion] = useState<"hay" | "pro">("hay");
  const [genCount, setGenCount] = useState(1);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [userActivationDays, setUserActivationDays] = useState<Record<string, number>>({});
  const [replyText, setReplyText] = useState("");
  const [ticketMessages, setTicketMessages] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [aiDiagnosis, setAiDiagnosis] = useState<AIDiagnosis | null>(null);
  const [diagnosing, setDiagnosing] = useState(false);
  const [applyingAction, setApplyingAction] = useState(false);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [activationDates, setActivationDates] = useState<Record<string, { from: string; to: string }>>({});

  const fetchUsers = async () => {
    const { data } = await supabase.from("profiles").select("*");
    if (data) setUsers(data as Profile[]);
  };

  const fetchCodes = async () => {
    const { data } = await supabase.from("activation_codes").select("*").order("created_at", { ascending: false });
    if (data) setCodes(data as ActivationCode[]);
  };

  const fetchTickets = async () => {
    const { data } = await supabase.from("support_tickets").select("*").order("created_at", { ascending: false });
    if (data) setTickets(data as SupportTicket[]);
  };

  const fetchTicketMessages = async (ticketId: string) => {
    const { data } = await supabase.from("support_messages").select("*").eq("ticket_id", ticketId).order("created_at", { ascending: true });
    if (data) setTicketMessages(data);
  };

  useEffect(() => {
    if (isAdmin) { fetchUsers(); fetchCodes(); fetchTickets(); }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase.channel('admin-support')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages' }, () => {
        if (selectedTicket) fetchTicketMessages(selectedTicket);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_tickets' }, () => {
        fetchTickets();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAdmin, selectedTicket]);

  const getUserDays = (userId: string) => userActivationDays[userId] ?? 30;
  const setUserDays = (userId: string, days: number) => setUserActivationDays(prev => ({ ...prev, [userId]: days }));

  const toggleActivation = async (p: Profile) => {
    const days = getUserDays(p.id);
    const updates: any = { is_activated: !p.is_activated };
    if (!p.is_activated && days > 0) {
      const expires = new Date();
      expires.setDate(expires.getDate() + days);
      updates.activation_expires_at = expires.toISOString();
    }
    if (!p.is_activated && days === 0) {
      updates.activation_expires_at = null;
    }
    if (p.is_activated) {
      updates.activation_expires_at = null;
    }
    await supabase.from("profiles").update(updates).eq("id", p.id);
    toast.success(p.is_activated ? "تم تعطيل الحساب" : `تم تفعيل الحساب (${days === 0 ? "دائم" : days + " يوم"})`);
    fetchUsers();
  };

  const changeVersion = async (p: Profile, newVersion: string) => {
    await supabase.from("profiles").update({ version: newVersion }).eq("id", p.id);
    toast.success(`تم تغيير النسخة إلى ${newVersion.toUpperCase()}`);
    fetchUsers();
  };

  const sendNotification = async (userId: string, title: string, message: string, type: string = "info") => {
    await supabase.from("notifications").insert({ user_id: userId, title, message, type });
  };

  const generateCodes = async () => {
    const newCodes = Array.from({ length: genCount }, () => ({
      code: generateCode(genVersion),
      version: genVersion,
    }));
    const { error } = await supabase.from("activation_codes").insert(newCodes);
    if (error) { toast.error("خطأ في إنشاء الأكواد"); return; }
    toast.success(`تم إنشاء ${genCount} كود ${genVersion.toUpperCase()}`);
    fetchCodes();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("تم نسخ الكود");
  };

  const deleteCode = async (id: string) => {
    await supabase.from("activation_codes").delete().eq("id", id);
    toast.success("تم حذف الكود");
    fetchCodes();
  };

  const replyToTicket = async () => {
    if (!replyText.trim() || !selectedTicket || !user) return;
    await supabase.from("support_messages").insert({
      ticket_id: selectedTicket,
      sender_id: user.id,
      message: replyText,
      is_admin: true,
    });
    setReplyText("");
    fetchTicketMessages(selectedTicket);
    toast.success("تم إرسال الرد");
  };

  const closeTicket = async (id: string) => {
    await supabase.from("support_tickets").update({ status: "closed" }).eq("id", id);
    toast.success("تم إغلاق التذكرة");
    fetchTickets();
  };

  const getDaysRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  const deleteUser = async (p: Profile) => {
    if (!confirm(`هل تريد حذف المستخدم "${p.display_name || "بدون اسم"}" نهائياً؟ لا يمكن التراجع.`)) return;
    setDeletingUser(p.id);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ user_id: p.user_id }),
      });
      if (!resp.ok) { const err = await resp.json(); throw new Error(err.error); }
      toast.success("تم حذف المستخدم نهائياً");
      fetchUsers();
    } catch (e: any) { toast.error(e.message || "خطأ في حذف المستخدم"); }
    setDeletingUser(null);
  };

  const setActivationRange = async (p: Profile) => {
    const dates = activationDates[p.id];
    if (!dates?.from || !dates?.to) { toast.error("حدد تاريخ البداية والنهاية"); return; }
    const from = new Date(dates.from);
    const to = new Date(dates.to);
    if (to <= from) { toast.error("تاريخ النهاية يجب أن يكون بعد البداية"); return; }
    await supabase.from("profiles").update({
      is_activated: true,
      activation_expires_at: to.toISOString(),
    }).eq("id", p.id);
    toast.success(`تم تفعيل الحساب من ${dates.from} إلى ${dates.to}`);
    fetchUsers();
  };

  // AI Diagnose for support ticket
  const diagnoseWithAI = async () => {
    if (!selectedTicket) return;
    const ticket = tickets.find(t => t.id === selectedTicket);
    const ticketUser = users.find(u => u.user_id === ticket?.user_id);
    const lastUserMsg = ticketMessages.filter(m => !m.is_admin).pop();
    
    if (!lastUserMsg) { toast.error("لا توجد رسائل من المستخدم"); return; }
    
    setDiagnosing(true);
    setAiDiagnosis(null);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-support-diagnose`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({
          userMessage: lastUserMsg.message,
          userProfile: ticketUser ? {
            display_name: ticketUser.display_name,
            is_activated: ticketUser.is_activated,
            version: ticketUser.version,
            activation_expires_at: ticketUser.activation_expires_at,
          } : null,
          ticketSubject: ticket?.subject,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setAiDiagnosis(data);
      } else {
        toast.error("خطأ في تحليل AI");
      }
    } catch { toast.error("خطأ في الاتصال"); }
    setDiagnosing(false);
  };

  // Apply AI suggested action
  const applyAIAction = async () => {
    if (!aiDiagnosis || !selectedTicket) return;
    const ticket = tickets.find(t => t.id === selectedTicket);
    const ticketUser = users.find(u => u.user_id === ticket?.user_id);
    if (!ticketUser) { toast.error("لم يتم العثور على المستخدم"); return; }

    setApplyingAction(true);
    try {
      const action = aiDiagnosis.suggestedAction;
      if (action === "activate") {
        const days = aiDiagnosis.suggestedDays || 30;
        const updates: any = { is_activated: true };
        if (days > 0) {
          const expires = new Date();
          expires.setDate(expires.getDate() + days);
          updates.activation_expires_at = expires.toISOString();
        }
        await supabase.from("profiles").update(updates).eq("id", ticketUser.id);
        toast.success(`تم تفعيل حساب ${ticketUser.display_name} (${days} يوم)`);
      } else if (action === "deactivate") {
        await supabase.from("profiles").update({ is_activated: false, activation_expires_at: null }).eq("id", ticketUser.id);
        toast.success("تم تعطيل الحساب");
      } else if (action === "extend") {
        const days = aiDiagnosis.suggestedDays || 30;
        const currentExpiry = ticketUser.activation_expires_at ? new Date(ticketUser.activation_expires_at) : new Date();
        if (currentExpiry < new Date()) currentExpiry.setTime(Date.now());
        currentExpiry.setDate(currentExpiry.getDate() + days);
        await supabase.from("profiles").update({ activation_expires_at: currentExpiry.toISOString(), is_activated: true }).eq("id", ticketUser.id);
        toast.success(`تم تمديد ${days} يوم`);
      } else if (action === "upgrade") {
        await supabase.from("profiles").update({ version: aiDiagnosis.suggestedVersion || "pro" }).eq("id", ticketUser.id);
        toast.success("تم الترقية إلى PRO");
      } else if (action === "downgrade") {
        await supabase.from("profiles").update({ version: "hay" }).eq("id", ticketUser.id);
        toast.success("تم التخفيض إلى HAY");
      }

      // Send AI reply
      if (aiDiagnosis.replyToUser) {
        await supabase.from("support_messages").insert({
          ticket_id: selectedTicket,
          sender_id: user!.id,
          message: aiDiagnosis.replyToUser,
          is_admin: true,
        });
        fetchTicketMessages(selectedTicket);
      }

      fetchUsers();
      setAiDiagnosis(null);
    } catch { toast.error("خطأ في تطبيق الإجراء"); }
    setApplyingAction(false);
  };

  if (loading) return null;
  if (!user || !isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen relative">
      <StarsBackground />
      <div className="relative z-10 max-w-2xl mx-auto p-4 md:p-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-heading font-bold gold-text">لوحة الإدارة</h1>
          </div>
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-1 rounded-xl">
            <ArrowRight className="w-4 h-4" /> العودة
          </Button>
        </motion.div>

        <Tabs value={tab} onValueChange={v => setTab(v as any)} className="w-full">
          <TabsList className="glass-card w-full justify-start mb-6 p-1 rounded-xl">
            <TabsTrigger value="users" className="gap-1 font-heading rounded-lg text-xs"><Users className="w-3.5 h-3.5" /> المستخدمون</TabsTrigger>
            <TabsTrigger value="codes" className="gap-1 font-heading rounded-lg text-xs"><KeyRound className="w-3.5 h-3.5" /> الأكواد</TabsTrigger>
            <TabsTrigger value="tickets" className="gap-1 font-heading rounded-lg text-xs"><MessageCircle className="w-3.5 h-3.5" /> الدعم</TabsTrigger>
            <TabsTrigger value="settings" className="gap-1 font-heading rounded-lg text-xs"><Settings className="w-3.5 h-3.5" /> الإعدادات</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <div className="glass-card p-3 mb-4 flex items-center gap-3 justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {users.length} مستخدم</span>
            </div>

            <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
              {users.map((u) => {
                const daysLeft = getDaysRemaining(u.activation_expires_at);
                return (
                  <motion.div key={u.id} variants={item} className="glass-card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-heading font-bold text-foreground truncate">{u.display_name || "بدون اسم"}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          <span>{u.is_activated ? "✅ مفعّل" : "⏳ غير مفعّل"}</span>
                          {u.version && <span className={`px-2 py-0.5 rounded-full font-bold ${u.version === "pro" ? "bg-purple-500/20 text-purple-400" : "bg-primary/10 text-primary"}`}>{u.version.toUpperCase()}</span>}
                          {daysLeft !== null && daysLeft > 0 && (
                            <span className={`flex items-center gap-1 ${daysLeft <= 7 ? "text-destructive" : "text-muted-foreground"}`}>
                              <Clock className="w-3 h-3" /> {daysLeft} يوم
                            </span>
                          )}
                          {daysLeft !== null && daysLeft <= 0 && (
                            <span className="text-destructive font-bold">⚠️ منتهي</span>
                          )}
                          {!u.activation_expires_at && u.is_activated && (
                            <span className="text-green-400 text-xs">♾️ دائم</span>
                          )}
                        </div>
                      </div>
                    </div>
                     <div className="flex items-center gap-2 flex-wrap">
                      <Button variant={u.is_activated ? "outline" : "default"} size="sm" onClick={() => toggleActivation(u)}
                        className={`rounded-xl text-xs ${u.is_activated ? "" : "gold-gradient text-background shadow-lg shadow-primary/15"}`}>
                        {u.is_activated ? <><X className="w-3.5 h-3.5 ml-1" /> تعطيل</> : <><Check className="w-3.5 h-3.5 ml-1" /> تفعيل</>}
                      </Button>
                      <select value={u.version || "hay"} onChange={e => changeVersion(u, e.target.value)}
                        className="bg-secondary/50 border border-border/50 rounded-lg p-1.5 text-foreground text-xs">
                        <option value="hay">HAY</option>
                        <option value="pro">PRO</option>
                      </select>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedUser(selectedUser?.id === u.id ? null : u)} className="rounded-xl text-xs gap-1">
                        <Bell className="w-3 h-3" /> إشعار
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteUser(u)} disabled={deletingUser === u.id}
                        className="rounded-xl text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10">
                        {deletingUser === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />} حذف
                      </Button>
                    </div>
                    <AnimatePresence>
                    {selectedUser?.id === u.id && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-3 space-y-3 border-t border-border/30 pt-3">
                        {/* Duration dropdown */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Clock className="w-3.5 h-3.5 text-primary" />
                          <span className="text-xs text-muted-foreground">مدة تفعيل سريعة:</span>
                          <select value={getUserDays(u.id)} onChange={e => setUserDays(u.id, parseInt(e.target.value))}
                            className="bg-secondary/50 border border-border/50 rounded-lg p-1 text-foreground text-xs">
                            <option value={7}>7 أيام</option>
                            <option value={15}>15 يوم</option>
                            <option value={30}>30 يوم</option>
                            <option value={90}>3 أشهر</option>
                            <option value={180}>6 أشهر</option>
                            <option value={365}>سنة</option>
                            <option value={0}>دائم</option>
                          </select>
                        </div>
                        {/* Date range activation */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Calendar className="w-3.5 h-3.5 text-primary" />
                          <span className="text-xs text-muted-foreground">أو حدد المدة:</span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex-1 min-w-[120px]">
                            <label className="text-[10px] text-muted-foreground block mb-0.5">من</label>
                            <Input type="date" value={activationDates[u.id]?.from || ""} onChange={e => setActivationDates(prev => ({ ...prev, [u.id]: { ...prev[u.id], from: e.target.value, to: prev[u.id]?.to || "" } }))}
                              className="bg-secondary/50 text-xs h-8 rounded-lg" />
                          </div>
                          <div className="flex-1 min-w-[120px]">
                            <label className="text-[10px] text-muted-foreground block mb-0.5">إلى</label>
                            <Input type="date" value={activationDates[u.id]?.to || ""} onChange={e => setActivationDates(prev => ({ ...prev, [u.id]: { from: prev[u.id]?.from || "", to: e.target.value } }))}
                              className="bg-secondary/50 text-xs h-8 rounded-lg" />
                          </div>
                          <Button size="sm" onClick={() => setActivationRange(u)} className="rounded-xl text-xs gold-gradient text-background mt-4">
                            <Check className="w-3 h-3 ml-1" /> تطبيق
                          </Button>
                        </div>
                        {/* Notification */}
                        <Input id={`notif-title-${u.id}`} placeholder="عنوان الإشعار" className="bg-secondary/50 text-right rounded-xl text-xs h-9" />
                        <Input id={`notif-msg-${u.id}`} placeholder="نص الإشعار" className="bg-secondary/50 text-right rounded-xl text-xs h-9" />
                        <Button size="sm" onClick={async () => {
                          const title = (document.getElementById(`notif-title-${u.id}`) as HTMLInputElement)?.value;
                          const msg = (document.getElementById(`notif-msg-${u.id}`) as HTMLInputElement)?.value;
                          if (!title || !msg) { toast.error("أكمل الحقول"); return; }
                          await sendNotification(u.user_id, title, msg, "info");
                          toast.success("تم إرسال الإشعار");
                          setSelectedUser(null);
                        }} className="gold-gradient text-background gap-1 rounded-xl text-xs">
                          <Bell className="w-3 h-3" /> إرسال إشعار
                        </Button>
                      </motion.div>
                    )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
              {users.length === 0 && (
                <div className="glass-card p-10 text-center">
                  <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">لا يوجد مستخدمون بعد</p>
                </div>
              )}
            </motion.div>
          </TabsContent>

          {/* Codes Tab */}
          <TabsContent value="codes" className="space-y-4">
            <div className="glass-card p-5 space-y-4">
              <h3 className="font-heading font-bold text-foreground text-right">إنشاء أكواد تفعيل عامة</h3>
              <div className="flex gap-3 items-end flex-wrap">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">النسخة</label>
                  <select value={genVersion} onChange={e => setGenVersion(e.target.value as "hay" | "pro")}
                    className="bg-secondary/50 border border-border/50 rounded-xl p-2.5 text-foreground">
                    <option value="hay">HAY</option>
                    <option value="pro">PRO</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">العدد</label>
                  <Input type="number" value={genCount} onChange={e => setGenCount(Math.max(1, parseInt(e.target.value) || 1))}
                    min={1} max={50} className="w-20 bg-secondary/50 rounded-xl" />
                </div>
                <Button onClick={generateCodes} className="gold-gradient text-background gap-1 rounded-xl shadow-lg shadow-primary/15">
                  <Plus className="w-4 h-4" /> إنشاء
                </Button>
              </div>
            </div>

            <motion.div variants={container} initial="hidden" animate="show" className="space-y-2">
              {codes.map(c => (
                <motion.div key={c.id} variants={item} className={`glass-card p-3 flex items-center justify-between gap-2 ${c.is_used ? "opacity-50" : ""}`}>
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${c.version === "pro" ? "bg-purple-500/20 text-purple-400" : "bg-primary/10 text-primary"}`}>
                      {c.version.toUpperCase()}
                    </span>
                    <code className="text-sm font-mono text-foreground truncate" dir="ltr">{c.code}</code>
                    {c.is_used && <span className="text-xs text-muted-foreground">✅ مستخدم</span>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!c.is_used && (
                      <Button variant="ghost" size="icon" onClick={() => copyCode(c.code)} className="rounded-xl h-8 w-8">
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => deleteCode(c.id)} className="rounded-xl h-8 w-8 text-destructive">
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </motion.div>
              ))}
              {codes.length === 0 && (
                <div className="glass-card p-8 text-center">
                  <KeyRound className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground text-sm">لا توجد أكواد بعد</p>
                </div>
              )}
            </motion.div>
          </TabsContent>

          {/* Support Tickets Tab with AI */}
          <TabsContent value="tickets" className="space-y-4">
            {selectedTicket ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Button variant="ghost" onClick={() => { setSelectedTicket(null); setTicketMessages([]); setAiDiagnosis(null); }} className="gap-1 rounded-xl text-xs">
                    <ArrowRight className="w-3.5 h-3.5" /> رجوع
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={diagnoseWithAI} disabled={diagnosing} className="gap-1 rounded-xl text-xs border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
                      {diagnosing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
                      تحليل AI
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => closeTicket(selectedTicket)} className="gap-1 rounded-xl text-xs text-destructive">
                      <XCircle className="w-3.5 h-3.5" /> إغلاق
                    </Button>
                  </div>
                </div>

                {/* AI Diagnosis Card */}
                <AnimatePresence>
                  {aiDiagnosis && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                      className="glass-card p-4 border-purple-500/30 space-y-3">
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-sm font-heading text-purple-400">تشخيص AI</span>
                        <Bot className="w-4 h-4 text-purple-400" />
                      </div>
                      <div className="text-right space-y-2">
                        <div>
                          <span className="text-xs text-muted-foreground">التشخيص:</span>
                          <p className="text-sm text-foreground">{aiDiagnosis.diagnosis}</p>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">الإجراء المقترح:</span>
                          <p className="text-sm text-foreground flex items-center gap-1 justify-end">
                            {aiDiagnosis.suggestedAction === "activate" && "✅ تفعيل الحساب"}
                            {aiDiagnosis.suggestedAction === "deactivate" && "❌ تعطيل الحساب"}
                            {aiDiagnosis.suggestedAction === "extend" && `⏰ تمديد ${aiDiagnosis.suggestedDays} يوم`}
                            {aiDiagnosis.suggestedAction === "upgrade" && "⬆️ ترقية إلى PRO"}
                            {aiDiagnosis.suggestedAction === "downgrade" && "⬇️ تخفيض إلى HAY"}
                            {aiDiagnosis.suggestedAction === "none" && "💬 رد فقط"}
                            {aiDiagnosis.suggestedAction === "reset_password" && "🔑 إعادة تعيين كلمة المرور"}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">الرد المقترح:</span>
                          <p className="text-sm text-foreground bg-secondary/30 p-2 rounded-lg">{aiDiagnosis.replyToUser}</p>
                        </div>
                        <div className="flex items-center gap-1 justify-end">
                          <span className="text-xs text-muted-foreground">الثقة:</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            aiDiagnosis.confidence === "high" ? "bg-green-500/20 text-green-400" :
                            aiDiagnosis.confidence === "medium" ? "bg-yellow-500/20 text-yellow-400" :
                            "bg-red-500/20 text-red-400"
                          }`}>{aiDiagnosis.confidence === "high" ? "عالية" : aiDiagnosis.confidence === "medium" ? "متوسطة" : "منخفضة"}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => setAiDiagnosis(null)} variant="outline" size="sm" className="flex-1 rounded-xl text-xs">
                          <XCircle className="w-3 h-3 ml-1" /> رفض
                        </Button>
                        <Button onClick={applyAIAction} disabled={applyingAction} size="sm" className="flex-1 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs gap-1">
                          {applyingAction ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                          موافقة وتطبيق
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {ticketMessages.map((m: any) => (
                    <div key={m.id} className={`glass-card p-3 ${m.is_admin ? "border-primary/30 mr-6" : "ml-6"}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold ${m.is_admin ? "text-primary" : "text-muted-foreground"}`}>
                          {m.is_admin ? "🛡️ الأدمن" : "👤 المستخدم"}
                        </span>
                        <span className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString("ar")}</span>
                      </div>
                      <p className="text-sm text-foreground text-right">{m.message}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="اكتب ردك..."
                    className="bg-secondary/50 text-right rounded-xl flex-1"
                    onKeyDown={e => e.key === "Enter" && replyToTicket()} />
                  <Button onClick={replyToTicket} className="gold-gradient text-background rounded-xl">إرسال</Button>
                </div>
              </div>
            ) : (
              <motion.div variants={container} initial="hidden" animate="show" className="space-y-2">
                {tickets.map(t => {
                  const ticketUser = users.find(u => u.user_id === t.user_id);
                  return (
                  <motion.div key={t.id} variants={item}
                    className="glass-card p-4 flex items-center justify-between cursor-pointer hover:border-primary/30 transition-colors"
                    onClick={() => { setSelectedTicket(t.id); fetchTicketMessages(t.id); }}>
                    <div>
                      <p className="font-heading font-bold text-foreground text-sm">{t.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {ticketUser?.display_name || "مستخدم"} · {new Date(t.created_at).toLocaleDateString("ar")}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${t.status === "open" ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}`}>
                      {t.status === "open" ? "مفتوح" : "مغلق"}
                    </span>
                  </motion.div>
                  );
                })}
                {tickets.length === 0 && (
                  <div className="glass-card p-8 text-center">
                    <MessageCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-muted-foreground text-sm">لا توجد تذاكر دعم</p>
                  </div>
                )}
              </motion.div>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <div className="glass-card p-5 space-y-4">
              <h3 className="font-heading font-bold text-foreground text-right">إرسال إشعار جماعي</h3>
              <Input id="notif-title" placeholder="عنوان الإشعار" className="bg-secondary/50 text-right rounded-xl" />
              <Input id="notif-msg" placeholder="نص الإشعار" className="bg-secondary/50 text-right rounded-xl" />
              <Button onClick={async () => {
                const title = (document.getElementById("notif-title") as HTMLInputElement)?.value;
                const msg = (document.getElementById("notif-msg") as HTMLInputElement)?.value;
                if (!title || !msg) { toast.error("أكمل الحقول"); return; }
                for (const u of users) {
                  await sendNotification(u.user_id, title, msg, "announcement");
                }
                toast.success(`تم إرسال الإشعار لـ ${users.length} مستخدم`);
              }} className="gold-gradient text-background gap-1 rounded-xl w-full">
                <Bell className="w-4 h-4" /> إرسال للجميع
              </Button>
            </div>

            <div className="glass-card p-5 space-y-3">
              <h3 className="font-heading font-bold text-foreground text-right">ترقية جماعية</h3>
              <p className="text-xs text-muted-foreground text-right">ترقية جميع مستخدمي HAY إلى PRO</p>
              <Button variant="outline" onClick={async () => {
                const hayUsers = users.filter(u => u.version === "hay" && u.is_activated);
                for (const u of hayUsers) {
                  await supabase.from("profiles").update({ version: "pro" }).eq("id", u.id);
                }
                toast.success(`تم ترقية ${hayUsers.length} مستخدم إلى PRO`);
                fetchUsers();
              }} className="gap-1 rounded-xl w-full">
                <Crown className="w-4 h-4" /> ترقية الجميع إلى PRO
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
