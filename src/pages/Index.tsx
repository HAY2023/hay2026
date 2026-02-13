import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import StarsBackground from "@/components/StarsBackground";
import { Brain, LogOut, Settings, Sparkles, Trophy, PenTool, Play } from "lucide-react";

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

const Index = () => {
  const { user, isActivated, isAdmin, loading, signOut, profile } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (user && isActivated) {
      supabase.from("categories").select("*").then(({ data }) => {
        if (data) setCategories(data as Category[]);
      });
    }
  }, [user, isActivated]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="gold-text text-2xl font-heading">جاري التحميل...</div></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isActivated) return <Navigate to="/pending" replace />;

  return (
    <div className="min-h-screen relative">
      <StarsBackground />
      <div className="relative z-10">
        {/* Header */}
        <header className="flex items-center justify-between p-4 md:p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center">
              <Brain className="w-5 h-5 text-background" />
            </div>
            <div>
              <h1 className="font-heading text-xl font-bold gold-text">Quiz AI</h1>
              <p className="text-xs text-muted-foreground">مرحباً {profile?.display_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => navigate("/admin")} className="gap-1">
                <Settings className="w-4 h-4" /> إدارة الحسابات
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Hero */}
        <div className="text-center py-6 md:py-8 px-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-body">مدعوم بالذكاء الاصطناعي</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-heading font-bold gold-text mb-2">اختر قسماً وابدأ التحدي!</h2>
          <p className="text-muted-foreground">اختبر معلوماتك بأسئلتك الخاصة</p>
        </div>

        {/* Action buttons */}
        <div className="max-w-4xl mx-auto px-4 mb-6">
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={() => navigate("/dashboard")} className="gold-gradient text-background gap-2 h-14 text-base font-heading">
              <PenTool className="w-5 h-5" /> إدارة أسئلتي
            </Button>
            <Button onClick={() => navigate("/results")} variant="outline" className="gap-2 h-14 text-base font-heading">
              <Trophy className="w-5 h-5" /> نتائجي
            </Button>
          </div>
        </div>

        {/* Categories grid */}
        <div className="max-w-4xl mx-auto px-4 pb-8">
          {categories.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <p className="text-muted-foreground mb-4">لم تضف أي أقسام بعد. أنشئ أقسامك وأسئلتك من لوحة إدارة الأسئلة!</p>
              <Button onClick={() => navigate("/dashboard")} className="gold-gradient text-background gap-2">
                <PenTool className="w-4 h-4" /> إنشاء أقسام وأسئلة
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {/* Cocktail - all questions */}
              <button
                onClick={() => navigate("/play/all")}
                className="glass-card p-6 text-center hover:border-primary/50 transition-all duration-300 hover:scale-105 animate-glow-pulse col-span-2 md:col-span-3"
              >
                <div className="text-4xl mb-2">🍸</div>
                <h3 className="font-heading text-lg font-bold gold-text">كوكتيل</h3>
                <p className="text-xs text-muted-foreground">جميع الأقسام</p>
              </button>

              {categories.map((cat, i) => (
                <button
                  key={cat.id}
                  onClick={() => navigate(`/play/${cat.id}`)}
                  className="glass-card p-6 text-center hover:border-primary/50 transition-all duration-300 hover:scale-105"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div className="text-3xl mb-2">{cat.icon}</div>
                  <h3 className="font-heading text-sm font-bold text-foreground">{cat.name}</h3>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
