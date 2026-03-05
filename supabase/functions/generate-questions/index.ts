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

    const { topic, count, type, level, aiMode } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const levelMap: Record<string, string> = {
      "ابتدائي": "مستوى ابتدائي (سن 6-11)",
      "متوسط": "مستوى متوسط (سن 11-15)",
      "ثانوي": "مستوى ثانوي وبكالوريا (سن 15-18)",
      "جامعي": "مستوى جامعي",
    };
    const levelText = levelMap[level] || "جميع المستويات";

    let questionType = "اختيار من متعدد (4 خيارات)";
    let extraInstructions = "";

    if (type === "text") {
      questionType = "كتابة (بدون خيارات)";
    } else if (type === "matching") {
      questionType = "ربط بين جملتين";
      extraInstructions = `لأسئلة الربط: أنشئ أزواجاً من العناصر المتطابقة. 
      يجب أن يكون الرد JSON كالتالي:
      questions: [ { question_text, options: [عناصر اليسار], correct_answer: {"يسار":"يمين"}, matching_pairs: [عناصر اليمين] } ]`;
    }

    const isAlgerian = aiMode === "algerian";
    const systemPrompt = isAlgerian
      ? "أنت مولد أسئلة اختبارات تعليمية باللغة العربية متخصص حصرياً في المنهج الدراسي الجزائري. صغ أسئلتك لتناسب dzexams.com."
      : "أنت مولد أسئلة اختبارات تعليمية متطور باللغة العربية. ركّز على الدقة والعمق.";

    const userPrompt = `أنشئ ${count || 5} أسئلة عن "${topic}" نوع ${questionType} لمستوى ${levelText}.
    ${extraInstructions}
    يجب أن يكون الرد بصيغة JSON فقط:
    { "questions": [ { "question_text": "...", "options": ["...", "..."], "correct_answer": "...", "time_limit": 30 } ] }`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
        generationConfig: { response_mime_type: "application/json" }
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", errText);
      throw new Error(`Gemini API failed with status ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) throw new Error("Empty response from AI");

    const result = JSON.parse(content);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Internal Server Error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
