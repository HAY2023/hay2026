import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { userMessage, userProfile, ticketSubject } = await req.json();
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) throw new Error("GEMINI_API_KEY is not configured");

    const systemPrompt = `أنت مساعد دعم فني ذكي و محترف لموقع HAY 2026 التعليمي (الجزائر). مهمتك:
1. تحليل مشكلة المستخدم بدقة واحترافية.
2. اقتراح الإجراء الإداري المناسب في النظام (تفعيل/تعطيل الحساب، تغيير النسخة إلى PRO أو HAY، تمديد مدة الاستخدام).
3. صياغة رد لبق وإيجابي للمستخدم يخفف من انزعاجه أو يوضح له سبب المشكلة.

معلومات النظام:
- النسخ: HAY (نسخة عادية/مجانية) و PRO (نسخة مدفوعة تحتوي ميزات الذكاء الاصطناعي).
- التفعيل: يتم عن طريق قسم الإدارة. يمكن أن يكون لمدة أيام معينة أو تفعيل دائم.

أجب فقط وحصراً بصيغة JSON بالتنسيق التالي:
{
  "diagnosis": "شرح المشكلة داخلياً للقسم الإداري",
  "suggestedAction": "none" | "activate" | "deactivate" | "extend" | "upgrade" | "downgrade" | "reset_password",
  "suggestedDays": 30,
  "suggestedVersion": "hay" | "pro",
  "replyToUser": "الرد الاحترافي المقترح إرساله للمستخدم لحل مشكلته بأسلوب جزائري لبق",
  "confidence": "high" | "medium" | "low"
}`;

    const userPrompt = `موضوع التذكرة: ${ticketSubject || "غير محدد"}
رسالة المستخدم: ${userMessage}
معلومات حساب المستخدم في النظام: ${JSON.stringify(userProfile || {})}`;

    // 3. Direct Gemini Call
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}\n\nيجب أن يكون الرد JSON فقط بهذا الهيكل: {"diagnosis": "...", "suggestedAction": "none", "suggestedDays": 0, "suggestedVersion": "hay", "replyToUser": "...", "confidence": "high"}` }] }],
        generationConfig: { response_mime_type: "application/json" }
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
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
