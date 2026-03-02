import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Bell, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

const NotificationBell = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showPanel, setShowPanel] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await supabase.from("notifications").select("*")
      .eq("user_id", user.id).eq("is_read", false)
      .order("created_at", { ascending: false }).limit(10);
    if (data) setNotifications(data as Notification[]);
  };

  useEffect(() => { fetchNotifications(); }, [user]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('user-notifications')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, () => fetchNotifications())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const markAllRead = async () => {
    for (const n of notifications) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
    }
    setNotifications([]);
  };

  if (!user) return null;

  return (
    <div className="relative">
      <button onClick={() => setShowPanel(!showPanel)} className="relative p-2 rounded-xl hover:bg-secondary/50 transition-colors">
        <Bell className="w-5 h-5 text-muted-foreground" />
        {notifications.length > 0 && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-bold">
            {notifications.length}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {showPanel && (
          <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute left-0 top-12 w-72 glass-card p-3 z-50 max-h-80 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-heading text-sm font-bold text-foreground">الإشعارات</h4>
              {notifications.length > 0 && (
                <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                  قراءة الكل
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">لا توجد إشعارات جديدة</p>
            ) : (
              <div className="space-y-2">
                {notifications.map(n => (
                  <motion.div key={n.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="bg-secondary/30 rounded-xl p-3 text-right relative">
                    <button onClick={() => markRead(n.id)} className="absolute top-2 left-2 text-muted-foreground hover:text-foreground">
                      <X className="w-3 h-3" />
                    </button>
                    <p className="font-heading text-xs font-bold text-foreground pr-0 pl-4">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{n.message}</p>
                    <p className="text-xs text-muted-foreground/50 mt-1">{new Date(n.created_at).toLocaleDateString("ar")}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
