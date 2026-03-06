import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { question, userAnswer, correctAnswer, topic, level } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `أنت أستاذ جزائري متخصص في التعليم. تقوم بتصحيح إجابات التلاميذ بطريقة تعليمية.
عند تصحيح كل إجابة:
1. حدد إن كانت صحيحة أو خاطئة
2. اشرح الإجابة الصحيحة بشكل مبسط
3. أضف معلومة إضافية مفيدة
4. شجع التلميذ بأسلوب إيجابي
استخدم إيموجي مناسبة. كن مختصراً ومفيداً.`
          },
          {
            role: "user",
            content: `الموضوع: ${topic || "عام"}
المستوى: ${level || "متوسط"}
السؤال: ${question}
إجابة التلميذ: ${userAnswer}
الإجابة الصحيحة: ${correctAnswer}

صحح هذه الإجابة كأستاذ.`
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز حد الطلبات، حاول لاحقاً" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "يرجى إضافة رصيد" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const correction = data.choices?.[0]?.message?.content || "لم يتم التصحيح";

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
