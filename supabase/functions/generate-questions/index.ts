
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

    // 1. Auth & Subscription Check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Unauthorized: Missing token');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Unauthorized: Invalid token');

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_activated, activation_expires_at, version')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile || !profile.is_activated) {
      return new Response(JSON.stringify({ error: "حسابك غير مفعل. يرجى إدخال كود التفعيل أولاً." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (profile.activation_expires_at && new Date(profile.activation_expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "انتهت صلاحية اشتراكك. يرجى التجديد." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Process Request
    const { topic, count, type, level, aiMode } = await req.json();

    const levelMap: Record<string, string> = {
      "ابتدائي": "مستوى ابتدائي (سن 6-11)",
      "متوسط": "مستوى متوسط (سن 11-15)",
      "ثانوي": "مستوى ثانوي وبكالوريا (سن 15-18)",
      "جامعي": "مستوى جامع",
    };

    const isAlgerian = aiMode === "algerian";
    const systemPrompt = isAlgerian
      ? "أنت أستاذ جزائري خبير في المنهج الدراسي الرسمي. قم بتوليد أسئلة مطابقة لنمط امتحانات dzexams.com."
      : "أنت محرك أسئلة تعليمي متقدم باللغة العربية. قم بتوليد أسئلة دقيقة وشاملة.";

    const userPrompt = `موضوع الأسئلة: ${topic}
المستوى: ${levelMap[level] || level}
العدد المطلوب: ${count || 10}
نوع الأسئلة: ${type === 'text' ? 'كتابية' : 'اختيار من متعدد'}

ملاحظة هامة: يجب أن تكون الأسئلة باللغة العربية الفصحى (مع لمسة جزائرية إذا كان النمط جزائري).
أجب فقط بصيغة JSON تحتوي على مصفوفة باسم questions.`;

    // 3. Direct Gemini Call
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;

    const geminiResp = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}\n\nيجب أن يكون الرد JSON فقط بهذا الهيكل: {"questions": [{"question_text": "...", "options": ["...", "..."], "correct_answer": "...", "time_limit": 30}]}` }] }],
        generationConfig: { response_mime_type: "application/json" }
      }),
    });

    if (!geminiResp.ok) throw new Error(`Gemini API error: ${geminiResp.statusText}`);

    const geminiData = await geminiResp.json();
    const result = JSON.parse(geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{"questions":[]}');

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: err.message.includes('Unauthorized') ? 401 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
