
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceRole);

    // 1. Auth Check (Admin Only)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Unauthorized: Missing token');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Unauthorized: Invalid token');

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = roles?.some((r) => r.role === "admin");
    if (!isAdmin) throw new Error('Forbidden: Admin access required');

    // 2. Process Request
    const { userMessage, userProfile, ticketSubject } = await req.json();

    // 3. Direct Gemini Call
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;

    const systemPrompt = `أنت مساعد دعم فني ذكي لموقع Quiz AI التعليمي. مهمتك:
1. تحليل مشكلة المستخدم وتشخيصها.
2. اقتراح حل مناسب (تفعيل، تمديد مدة، ترقية، إلخ).
3. إرسال رد مفيد للمستخدم.
أجب فقط بصيغة JSON:
{
  "diagnosis": "...",
  "suggestedAction": "none" | "activate" | "deactivate" | "extend" | "upgrade" | "downgrade",
  "suggestedDays": number,
  "suggestedVersion": "hay" | "pro",
  "replyToUser": "...",
  "confidence": "high" | "medium" | "low"
}`;

    const userPrompt = `موضوع التذكرة: ${ticketSubject || "غير محدد"}
رسالة المستخدم: ${userMessage}
معلومات الحساب: ${JSON.stringify(userProfile || {})}`;

    const geminiResp = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
        generationConfig: { response_mime_type: "application/json" }
      }),
    });

    if (!geminiResp.ok) throw new Error(`Gemini API error: ${geminiResp.statusText}`);

    const geminiData = await geminiResp.json();
    const result = JSON.parse(geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}');

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: err.message.includes('Unauthorized') ? 401 : (err.message.includes('Forbidden') ? 403 : 500),
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
