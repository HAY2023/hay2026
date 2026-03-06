import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { question, userAnswer, correctAnswer, topic, level } = await req.json();
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) throw new Error("GEMINI_API_KEY is not configured");

    const systemPrompt = `أنت أستاذ وموجه تعليمي ذكي (AI Teacher) في منصة HAY 2026. مهمتك تصحيح إجابات التلاميذ بأسلوب علمي، دقيق، ومحفز جداً.
خطواتك:
1. التقييم: هل الإجابة صحيحة كلياً، جزئياً، أم خاطئة؟
2. التصحيح المبسط: اشرح الإجابة الصحيحة بأسلوب يناسب مستوى التلميذ (ابتدائي يستدعي لغة بسيطة، ثانوي يستدعي مصطلحات دقيقة).
3. الفائدة الإضافية: قدّم "معلومة ذهبية" أو "سر للنجاح" مرتبط بالسؤال.
4. التشجيع: استخدم إيموجي وحفز التلميذ للتقدم.
ملاحظة: كن مباشراً ولا تطل الشرح كثيراً، بل اجعله مركزاً وعملياً.`;

    const userPrompt = `الموضوع: ${topic || "عام"}
المستوى: ${level || "متوسط"}
السؤال: ${question}
إجابة التلميذ: ${userAnswer}
الإجابة النموذجية (للمرجع فقط): ${correctAnswer}

قم بالرد مباشرة باللغة العربية الفصحى.`;

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
    const correction = data.candidates?.[0]?.content?.parts?.[0]?.text || "عذراً، لم أتمكن من التصحيح في هذا الوقت.";

    return new Response(JSON.stringify({ correction }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-teacher-correct error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
