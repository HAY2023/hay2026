import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContext {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isActivated: boolean;
  profile: {
    display_name: string | null;
    is_activated: boolean;
    tos_accepted: boolean;
    activation_code: string | null;
    version: string | null;
    activation_expires_at: string | null
  } | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthCtx = createContext<AuthContext | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isActivated, setIsActivated] = useState(false);
  const [profile, setProfile] = useState<AuthContext["profile"]>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data: p } = await supabase.from("profiles").select("*").eq("user_id", userId).single();
    if (p) {
      setProfile({
        display_name: p.display_name,
        is_activated: p.is_activated,
        tos_accepted: (p as any).tos_accepted ?? false,
        activation_code: p.activation_code,
        version: (p as any).version ?? "hay",
        activation_expires_at: (p as any).activation_expires_at ?? null
      });
      // Check if activation expired
      const expiresAt = (p as any).activation_expires_at;
      if (p.is_activated && expiresAt && new Date(expiresAt) < new Date()) {
        setIsActivated(false);
      } else {
        setIsActivated(p.is_activated);
      }
    }
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    setIsAdmin(roles?.some((r) => r.role === "admin") ?? false);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setTimeout(() => fetchProfile(sess.user.id), 0);
      } else {
        setProfile(null);
        setIsAdmin(false);
        setIsActivated(false);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) fetchProfile(s.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signUp = async (email: string, password: string, displayName: string) => {
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { display_name: displayName }, emailRedirectTo: window.location.origin }
    });
    return { error: error?.message ?? null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthCtx.Provider value={{ user, session, isAdmin, isActivated, profile, loading, signUp, signIn, signOut }}>
      {children}
    </AuthCtx.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
