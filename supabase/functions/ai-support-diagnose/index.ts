import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { userMessage, userProfile, ticketSubject } = await req.json();
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
            content: `أنت مساعد دعم فني ذكي لموقع Quiz AI التعليمي. مهمتك:
1. تحليل مشكلة المستخدم وتشخيصها
2. اقتراح حل مناسب (تفعيل/تعطيل حساب، تغيير نسخة، تمديد مدة، إلخ)
3. إرسال رد مفيد وواضح للمستخدم

معلومات النظام:
- النسخ المتاحة: HAY (أساسية) و PRO (متقدمة مع AI)
- التفعيل يتم بأكواد بصيغة XXXXX-XXXXX-MM-YY
- كل حساب له مدة تفعيل (أيام أو دائم)
- الأدمن يمكنه تفعيل/تعطيل/ترقية الحسابات

أجب بصيغة JSON:
{
  "diagnosis": "تشخيص المشكلة باختصار",
  "suggestedAction": "none" | "activate" | "deactivate" | "extend" | "upgrade" | "downgrade" | "reset_password",
  "suggestedDays": number (إذا كان الإجراء extend أو activate),
  "suggestedVersion": "hay" | "pro" (إذا كان الإجراء upgrade/downgrade),
  "replyToUser": "الرد المقترح للمستخدم",
  "confidence": "high" | "medium" | "low"
}`
          },
          {
            role: "user",
            content: `موضوع التذكرة: ${ticketSubject || "غير محدد"}
رسالة المستخدم: ${userMessage}
معلومات الحساب: ${JSON.stringify(userProfile || {})}`
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "حد الطلبات، حاول لاحقاً" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse JSON from AI response
    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { diagnosis: content, suggestedAction: "none", replyToUser: content, confidence: "low" };
    } catch {
      result = { diagnosis: content, suggestedAction: "none", replyToUser: content, confidence: "low" };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-support-diagnose error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
