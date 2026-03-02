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
  Settings, Bell, MessageCircle, Clock, RefreshCw, Crown
} from "lucide-react";
import { motion } from "framer-motion";

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
  const [activationDays, setActivationDays] = useState(30);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [replyText, setReplyText] = useState("");
  const [ticketMessages, setTicketMessages] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);

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

  // Realtime for support messages
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

  const toggleActivation = async (p: Profile) => {
    const updates: any = { is_activated: !p.is_activated };
    if (!p.is_activated && activationDays > 0) {
      const expires = new Date();
      expires.setDate(expires.getDate() + activationDays);
      updates.activation_expires_at = expires.toISOString();
    }
    if (p.is_activated) {
      updates.activation_expires_at = null;
    }
    await supabase.from("profiles").update(updates).eq("id", p.id);
    toast.success(p.is_activated ? "تم تعطيل الحساب" : `تم تفعيل الحساب (${activationDays} يوم)`);
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
    const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
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
            {/* Activation duration selector */}
            <div className="glass-card p-3 mb-4 flex items-center gap-3 justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">مدة التفعيل:</span>
                <select value={activationDays} onChange={e => setActivationDays(parseInt(e.target.value))}
                  className="bg-secondary/50 border border-border/50 rounded-lg p-1.5 text-foreground text-xs">
                  <option value={7}>7 أيام</option>
                  <option value={15}>15 يوم</option>
                  <option value={30}>30 يوم</option>
                  <option value={90}>3 أشهر</option>
                  <option value={180}>6 أشهر</option>
                  <option value={365}>سنة</option>
                  <option value={0}>دائم</option>
                </select>
              </div>
              <span className="text-xs text-muted-foreground">{users.length} مستخدم</span>
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
                      <Button variant="ghost" size="sm" onClick={() => {
                        sendNotification(u.user_id, "إشعار من الإدارة", "تم تحديث حسابك", "info");
                        toast.success("تم إرسال إشعار");
                      }} className="rounded-xl text-xs gap-1">
                        <Bell className="w-3 h-3" /> إشعار
                      </Button>
                    </div>
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

          {/* Support Tickets Tab */}
          <TabsContent value="tickets" className="space-y-4">
            {selectedTicket ? (
              <div className="space-y-4">
                <Button variant="ghost" onClick={() => { setSelectedTicket(null); setTicketMessages([]); }} className="gap-1 rounded-xl text-xs">
                  <ArrowRight className="w-3.5 h-3.5" /> رجوع
                </Button>
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
                {tickets.map(t => (
                  <motion.div key={t.id} variants={item}
                    className="glass-card p-4 flex items-center justify-between cursor-pointer hover:border-primary/30 transition-colors"
                    onClick={() => { setSelectedTicket(t.id); fetchTicketMessages(t.id); }}>
                    <div>
                      <p className="font-heading font-bold text-foreground text-sm">{t.subject}</p>
                      <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString("ar")}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${t.status === "open" ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}`}>
                      {t.status === "open" ? "مفتوح" : "مغلق"}
                    </span>
                  </motion.div>
                ))}
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
              <h3 className="font-heading font-bold text-foreground text-right">إعدادات التفعيل</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">مدة التفعيل الافتراضية</label>
                  <select value={activationDays} onChange={e => setActivationDays(parseInt(e.target.value))}
                    className="w-full bg-secondary/50 border border-border/50 rounded-xl p-3 text-foreground text-right">
                    <option value={7}>7 أيام</option>
                    <option value={15}>15 يوم</option>
                    <option value={30}>30 يوم (افتراضي)</option>
                    <option value={90}>3 أشهر</option>
                    <option value={180}>6 أشهر</option>
                    <option value={365}>سنة كاملة</option>
                    <option value={0}>دائم (بدون انتهاء)</option>
                  </select>
                </div>
              </div>
            </div>

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
