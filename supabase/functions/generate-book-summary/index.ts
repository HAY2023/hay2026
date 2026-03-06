import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { subject, year, level } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `أنت معلم جزائري متخصص في إنشاء ملخصات شاملة للكتب المدرسية الجزائرية.
أنشئ ملخصاً مفصلاً ومنظماً للكتاب المدرسي المطلوب يتضمن:
- أهم المحاور والوحدات في الكتاب
- المفاهيم الأساسية في كل وحدة
- النقاط المهمة للامتحانات
- نصائح للمراجعة
اكتب بالعربية الفصحى واستخدم التنسيق المناسب.`
          },
          {
            role: "user",
            content: `أنشئ ملخصاً شاملاً لكتاب "${subject}" لمستوى "${year}" - ${level} حسب المنهج الدراسي الجزائري الرسمي.`
          }
        ],
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content || "لم يتم توليد الملخص";

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-book-summary error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
