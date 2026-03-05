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

    const { question, userAnswer, correctAnswer, topic, level } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `أنت أستاذ جزائري متخصص في التعليم. تقوم بتصحيح إجابات التلاميذ بطريقة تعليمية مشجعة.
عند تصحيح كل إجابة:
1. حدد إن كانت صحيحة أو خاطئة.
2. اشرح الإجابة الصحيحة بشكل مبسط جداً.
3. أضف معلومة إضافية مفيدة تتعلق بالموضوع.
4. شجع التلميذ بأسلوب إيجابي جزائري (مثلاً: "برافو"، "يعطيك الصحة"، "واصل يا بطل").
استخدم إيموجي مناسبة. كن مختصراً ومفيداً.

السياق:
الموضوع: ${topic || "عام"}
المستوى: ${level || "متوسط"}
السؤال: ${question}
إجابة التلميذ: ${userAnswer}
الإجابة الصحيحة: ${correctAnswer}

أجب بنص التصحيح فقط.`
          }]
        }]
      }),
    });

    if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);

    const data = await response.json();
    const correction = data.candidates?.[0]?.content?.parts?.[0]?.text || "لم يتم التصحيح";

    return new Response(JSON.stringify({ correction }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Internal Error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
