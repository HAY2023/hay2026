import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { score, total, percentage, categoryName, timeTaken } = await req.json();
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) throw new Error("GEMINI_API_KEY is not configured");

    const systemPrompt = `أنت محلل ومرشد أكاديمي في منصة HAY 2026. مهمتك تقديم تحليل ذكي، مرح، ومفيد لنتائج التلميذ.
خطواتك:
1. الجملة الافتتاحية: عبر عن فخرك بنتيجته (سواء كانت ممتازة أو تحتاج تحسين) بعبارة مشوقة.
2. نقاط القوة: استخرج نقطتي قوة بناءً على نتيجته والوقت المستغرق.
3. التوجيه العملي: أعطه نصيحتين أو 3 نصائح ذهبية ذكية للتحسين في المرات القادمة (تتعلق بالمادة، أو طريقة الحل، أو إدارة الوقت).
4. الختام التحفيزي: اختم بعبارة حماسية تدفعه للاستمرار في التعلم مع إيموجي.
الرد يجب أن يكون منظماً في فقرات قصيرة جداً (لا تزد عن 5-6 أسطر إجمالاً).`;

    const userPrompt = `حلل الأداء التالي:
- المادة/القسم: ${categoryName || "كوكتيل (مختلط)"}
- النتيجة: ${score} من ${total} (نسبة ${percentage}%)
- وقت الحل: ${timeTaken} ثانية`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }]
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    const analysis = data.candidates?.[0]?.content?.parts?.[0]?.text || "عذراً، لم أتمكن من إعداد التحليل حالياً.";

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-results error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
