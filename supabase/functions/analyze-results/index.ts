import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized access");

    const { score, total, percentage, categoryName, timeTaken } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `أنت محلل أداء ذكي لتطبيق اختبارات. قدم تحليلاً مختصراً وممتعاً بالعربية مع إيموجي. كن مشجعاً ومحفزاً.

بيانات اللاعب:
- النتيجة: ${score} من ${total} (${percentage}%)
- القسم: ${categoryName || "كوكتيل (جميع الأقسام)"}
- الوقت المستغرق: ${timeTaken} ثانية

المطلوب:
1. تقييم عام للأداء (جملة واحدة).
2. نقاط القوة (أهم 2-3 ملاحظات).
3. نصائح عملية للتحسين.
4. جملة تشجيعية ختامية بلهجة جزائرية محفزة.

اجعل الرد مختصراً وممتعاً جداً.`
          }]
        }]
      }),
    });

    if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);

    const data = await response.json();
    const analysis = data.candidates?.[0]?.content?.parts?.[0]?.text || "لم يتم التحليل";

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Internal Error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
