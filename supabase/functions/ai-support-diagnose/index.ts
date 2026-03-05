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

    const { userMessage, userProfile, ticketSubject } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `أنت مساعد دعم فني ذكي لموقع Quiz AI التعليمي. مهمتك:
1. تحليل مشكلة المستخدم وتشخيصها
2. اقتراح حل مناسب (تفعيل/تعطيل حساب، تغيير نسخة، تمديد مدة، إلخ)
3. إرسال رد مفيد وواضح للمستخدم

معلومات النظام:
- النسخ المتاحة: HAY (أساسية) و PRO (متقدمة مع AI)
- التفعيل يتم بأكواد بصيغة XXXXX-XXXXX-MM-YY
- كل حساب له مدة تفعيل (أيام أو دائم)
- الأدمن يمكنه تفعيل/تعطيل/ترقية الحسابات

معلومات التذكرة:
الموضوع: ${ticketSubject || "غير محدد"}
الرسالة: ${userMessage}
الحساب: ${JSON.stringify(userProfile || {})}

أجب بصيغة JSON حصراً:
{
  "diagnosis": "تشخيص المشكلة",
  "suggestedAction": "none" | "activate" | "deactivate" | "extend" | "upgrade" | "downgrade" | "reset_password",
  "suggestedDays": number,
  "suggestedVersion": "hay" | "pro",
  "replyToUser": "الرد المقترح",
  "confidence": "high" | "medium" | "low"
}`
          }]
        }],
        generationConfig: { response_mime_type: "application/json" }
      }),
    });

    if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) throw new Error("Empty response from AI");

    return new Response(content, {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Internal Error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
