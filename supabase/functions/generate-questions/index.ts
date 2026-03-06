import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { topic, count, type, level, aiMode } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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
      في حقل options ضع العناصر في العمود الأيسر (مثلاً: ["الجزائر", "تونس", "المغرب"])
      في حقل correct_answer ضع الأزواج الصحيحة بصيغة JSON مثل: {"الجزائر":"الدينار","تونس":"الدينار","المغرب":"الدرهم"}
      في حقل matching_pairs ضع العناصر في العمود الأيمن (مثلاً: ["الدينار", "الدرهم", "الدينار"])`;
    }

    const isAlgerian = aiMode === "algerian";

    const systemPrompt = isAlgerian
<<<<<<< HEAD
      ? "أنت أستاذ جزائري خبير في المنهج الدراسي الرسمي. اجعل إجاباتك دقيقة وحسب البرنامج الجزائري."
      : "أنت محرك أسئلة ومساعد تعليمي متقدم باللغة العربية. اجعل إجاباتك دقيقة وشاملة.";

    let userPrompt = "";
    let expectedOutput = "";

    if (type === 'lessons_list') {
      userPrompt = `أعطني قائمة بأهم الدروس المقررة في مادة "${topic}" لـ ${levelMap[level] || level}.
المطلوب: قائمة بأسماء الدروس فقط (بين 5 إلى 10 دروس أساسية).`;
      expectedOutput = `{"lessons": ["اسم الدرس الأول", "اسم الدرس الثاني"]}`;
    } else if (type === 'lesson_summary') {
      userPrompt = `قم بإعداد ملخص شامل وذكي لدرس "${topic}" لـ ${levelMap[level] || level}.
المطلوب: ملخص مقسم إلى نقاط واضحة، سهلة الفهم، تغطي جميع الأفكار الأساسية للدرس.`;
      expectedOutput = `{"summary": "النص الكامل للملخص هنا..."}`;
    } else {
      userPrompt = `موضوع الأسئلة: ${topic}
المستوى: ${levelMap[level] || level}
العدد المطلوب: ${count || 10}
نوع الأسئلة: ${type === 'text' ? 'كتابية' : 'اختيار من متعدد'}

ملاحظة هامة: يجب أن تكون الأسئلة باللغة العربية الفصحى.`;
      expectedOutput = `{"questions": [{"question_text": "...", "options": ["...", "..."], "correct_answer": "...", "time_limit": 30}]}`;
    }

    // 3. Direct Gemini Call
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;

    const geminiResp = await fetch(geminiUrl, {
=======
      ? `أنت مولد أسئلة اختبارات تعليمية باللغة العربية متخصص حصرياً في المنهج الدراسي الجزائري.
ركّز فقط على المواضيع المتعلقة بالتعليم في الجزائر والمنهج الجزائري الرسمي.
استخدم المصطلحات والمفاهيم المعتمدة في الكتب المدرسية الجزائرية.
أنشئ أسئلة بنفس أسلوب ونمط الامتحانات الرسمية الجزائرية الموجودة على موقع dzexams.com.
اعتمد على نماذج البكالوريا والشهادات الرسمية الجزائرية كمرجع.
أنشئ أسئلة دقيقة وتعليمية ومناسبة للمستوى المطلوب حسب البرنامج الجزائري.
${extraInstructions}`
      : `أنت مولد أسئلة اختبارات تعليمية قوي ومتقدم باللغة العربية.
أنشئ أسئلة عميقة ودقيقة وشاملة عن أي موضوع.
ركّز على الجودة العالية والتنوع في الأسئلة مع تغطية جوانب مختلفة من الموضوع.
اجعل الأسئلة تحفّز التفكير النقدي والتحليلي.
${extraInstructions}`;

    const userPrompt = isAlgerian
      ? `أنشئ ${count || 5} أسئلة عن موضوع "${topic}" من نوع ${questionType} لمستوى ${levelText} حسب المنهج الدراسي الجزائري بأسلوب امتحانات dzexams.com.\n\nكل سؤال يجب أن يكون بهذا الشكل بالضبط.`
      : `أنشئ ${count || 5} أسئلة متقدمة وعميقة عن موضوع "${topic}" من نوع ${questionType}.\n\nكل سؤال يجب أن يكون بهذا الشكل بالضبط.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
>>>>>>> 57102494f92267d7a5cb68389e0ab2d8a1b990fc
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
<<<<<<< HEAD
        contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}\n\nيجب أن يكون الرد JSON فقط بهذا الهيكل:\n${expectedOutput}` }] }],
        generationConfig: { response_mime_type: "application/json" }
=======
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_questions",
              description: "Generate quiz questions in Arabic for Algerian curriculum",
              parameters: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question_text: { type: "string", description: "نص السؤال بالعربية" },
                        options: { type: "array", items: { type: "string" }, description: "4 خيارات (اختيار متعدد) أو عناصر العمود الأيسر (ربط)" },
                        correct_answer: { type: "string", description: "الإجابة الصحيحة أو JSON للأزواج (ربط)" },
                        time_limit: { type: "number", description: "المؤقت بالثواني (15-60)" },
                        matching_pairs: { type: "array", items: { type: "string" }, description: "عناصر العمود الأيمن (فقط لأسئلة الربط)" }
                      },
                      required: ["question_text", "correct_answer", "time_limit"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["questions"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_questions" } }
>>>>>>> 57102494f92267d7a5cb68389e0ab2d8a1b990fc
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز حد الطلبات، حاول لاحقاً" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "يرجى إضافة رصيد للمحفظة" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");
    
    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-questions error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
