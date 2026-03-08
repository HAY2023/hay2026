import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { subject, year, level, lessonNumber } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // If lessonNumber is provided, generate summary for that specific lesson
    // Otherwise, generate the list of lessons first
    const isLessonRequest = typeof lessonNumber === "number";

    const systemPrompt = isLessonRequest
      ? `أنت معلم جزائري متخصص. أنشئ ملخصاً مفصلاً ومنظماً للدرس رقم ${lessonNumber} من كتاب "${subject}" لمستوى "${year}" - ${level}.
الملخص يجب أن يتضمن:
- عنوان الدرس
- المفاهيم الأساسية
- النقاط المهمة للامتحانات
- أمثلة وتطبيقات
- نصائح للمراجعة
اكتب بالعربية الفصحى.`
      : `أنت معلم جزائري متخصص. أعطني قائمة بجميع دروس/وحدات كتاب "${subject}" لمستوى "${year}" - ${level} حسب المنهج الدراسي الجزائري الرسمي.
أعد القائمة بصيغة JSON فقط بدون أي نص إضافي. الصيغة:
[{"number": 1, "title": "عنوان الدرس"}, {"number": 2, "title": "عنوان الدرس"}]
أعد فقط JSON بدون أي شرح.`;

    const userPrompt = isLessonRequest
      ? `لخص الدرس رقم ${lessonNumber} من كتاب "${subject}" لمستوى "${year}" - ${level}.`
      : `أعطني قائمة دروس كتاب "${subject}" لمستوى "${year}" - ${level}.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: isLessonRequest ? 2000 : 1000,
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI error:", response.status, t);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز حد الطلبات، حاول لاحقاً" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "رصيد غير كافٍ" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    if (isLessonRequest) {
      return new Response(JSON.stringify({ summary: content }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      // Parse lessons list
      try {
        // Extract JSON from response (might have markdown code blocks)
        let jsonStr = content;
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) jsonStr = jsonMatch[0];
        const lessons = JSON.parse(jsonStr);
        return new Response(JSON.stringify({ lessons }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        console.error("Failed to parse lessons:", content);
        return new Response(JSON.stringify({ error: "خطأ في تحليل قائمة الدروس", raw: content }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
  } catch (e) {
    console.error("generate-book-summary error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
