
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceRole);

    // 1. Auth & Subscription Check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Unauthorized: Missing token');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Unauthorized: Invalid token');

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_activated, activation_expires_at')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile || !profile.is_activated) {
      return new Response(JSON.stringify({ error: "حسابك غير مفعل." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (profile.activation_expires_at && new Date(profile.activation_expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "انتهت صلاحية اشتراكك." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Process Request
    const { score, total, percentage, categoryName, timeTaken } = await req.json();

    // 3. Direct Gemini Call
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;

    const geminiResp = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `أنت محلل أداء ذكي لتطبيق اختبارات تعليمي. قدم تحليلاً مختصراً ومحفزاً بالعربية.
أداء اللاعب:
- النتيجة: ${score} من ${total} (${percentage}%)
- القسم: ${categoryName || "عام"}
- الوقت: ${timeTaken} ثانية

المطلوب:
1. تقييم سريع ومرح.
2. نصيحة عملية للتحسين.
أجب بأسلوب شيق ومختصر جداً بالعربية مع إيموجي.` }]
        }],
      }),
    });

    if (!geminiResp.ok) throw new Error(`Gemini API error: ${geminiResp.statusText}`);

    const geminiData = await geminiResp.json();
    const analysis = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "لم يتم التحليل";

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: err.message.includes('Unauthorized') ? 401 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
