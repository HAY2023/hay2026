import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL = "google/gemini-3-flash-preview";
const DZEXAMS_URL = "https://www.dzexams.com/";

type IncomingRequest = {
  topic?: string;
  count?: number;
  type?: string;
  level?: string;
  aiMode?: "algerian" | "general";
};

type AiQuestion = {
  question_text?: string;
  options?: unknown;
  correct_answer?: unknown;
  time_limit?: unknown;
  matching_pairs?: unknown;
};

type AiPayload = {
  questions?: AiQuestion[];
  lessons?: unknown;
  summary?: unknown;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => String(item).trim())
    .filter((item) => item.length > 0);
};

const toCorrectAnswer = (value: unknown): string => {
  if (typeof value === "string") return value.trim();

  if (value && typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }

  return "";
};

const parseJsonLoose = (raw: string): unknown => {
  const trimmed = raw.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    // Fallback below.
  }

  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "");

  try {
    return JSON.parse(withoutFence);
  } catch {
    const start = withoutFence.indexOf("{");
    const end = withoutFence.lastIndexOf("}");

    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(withoutFence.slice(start, end + 1));
    }

    throw new Error("Could not parse AI JSON response");
  }
};

const extractPayload = (data: unknown): AiPayload => {
  const typed = data as Record<string, unknown>;
  const choices = typed?.choices as Array<Record<string, unknown>> | undefined;
  const message = choices?.[0]?.message as Record<string, unknown> | undefined;

  const toolCalls = message?.tool_calls as Array<Record<string, unknown>> | undefined;
  const firstToolCall = toolCalls?.[0] as Record<string, unknown> | undefined;
  const functionObj = firstToolCall?.function as Record<string, unknown> | undefined;
  const args = functionObj?.arguments;

  if (typeof args === "string" && args.trim()) {
    return parseJsonLoose(args) as AiPayload;
  }

  const content = message?.content;
  if (typeof content === "string" && content.trim()) {
    return parseJsonLoose(content) as AiPayload;
  }

  if (Array.isArray(content)) {
    const text = content
      .map((part) => {
        if (part && typeof part === "object" && "text" in part) {
          return String((part as { text: unknown }).text ?? "");
        }

        return "";
      })
      .join(" ")
      .trim();

    if (text) {
      return parseJsonLoose(text) as AiPayload;
    }
  }

  throw new Error("No structured payload returned by AI");
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as IncomingRequest;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const topic = typeof body.topic === "string" ? body.topic.trim() : "";
    if (!topic) throw new Error("Topic is required");

    const requestedType = typeof body.type === "string" ? body.type : "multiple_choice";
    const questionCount = clamp(Math.round(Number(body.count ?? 5) || 5), 1, 30);
    const level = typeof body.level === "string" && body.level.trim() ? body.level.trim() : "ط¹ط§ظ…";
    const isAlgerian = body.aiMode === "algerian";

    const questionTypeLabel =
      requestedType === "text"
        ? "short_answer"
        : requestedType === "matching"
          ? "matching"
          : "multiple_choice";

    const sourceConstraint = isAlgerian
      ? `Primary reference for Algerian exam style: ${DZEXAMS_URL}. Use this style only, and avoid non-Algerian exam phrasing.`
      : "Use clear educational Arabic with consistent difficulty.";

    const systemPrompt = `You are an Arabic educational content generator. ${sourceConstraint}`;

    const matchingHint =
      requestedType === "matching"
        ? "For matching questions: set options as left column items, matching_pairs as right column items, and encode pair mapping in correct_answer as a JSON string object."
        : "";

    const multipleChoiceHint =
      requestedType === "multiple_choice"
        ? "For each question, provide exactly 4 options and one correct answer that matches one option exactly."
        : "";

    const userPrompt =
      requestedType === "lessons_list"
        ? [
            `Task: list key lessons for topic "${topic}" at level "${level}" in the Algerian curriculum.`,
            "Output language: Arabic.",
            isAlgerian ? `Style reference: ${DZEXAMS_URL}.` : "",
            "Return 5 to 10 concise lesson titles.",
            'Return strictly JSON: {"lessons":["..."]}.',
          ]
            .filter(Boolean)
            .join("\n")
        : requestedType === "lesson_summary"
          ? [
              `Task: write a clear study summary for lesson/topic "${topic}" at level "${level}".`,
              "Output language: Arabic.",
              isAlgerian ? `Use Algerian curriculum framing and style from ${DZEXAMS_URL}.` : "",
              'Return strictly JSON: {"summary":"..."}.',
            ]
              .filter(Boolean)
              .join("\n")
          : [
              `Task: generate ${questionCount} ${questionTypeLabel} exam questions in Arabic.`,
              `Topic: "${topic}"`,
              `Level: "${level}"`,
              isAlgerian ? `Reference and style must follow ${DZEXAMS_URL} only.` : "",
              isAlgerian ? "Do not use non-Algerian curriculum framing." : "",
              "Questions must be educational, accurate, and level-appropriate.",
              multipleChoiceHint,
              matchingHint,
              'Return strictly JSON: {"questions":[{"question_text":"...","options":["..."],"correct_answer":"...","time_limit":30,"matching_pairs":["..."]}] }.',
              "For non-matching questions, omit matching_pairs.",
            ]
              .filter(Boolean)
              .join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_payload",
              description: "Generate Arabic educational payload for questions, lessons list, or summary",
              parameters: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question_text: { type: "string" },
                        options: { type: "array", items: { type: "string" } },
                        correct_answer: { type: "string" },
                        time_limit: { type: "number" },
                        matching_pairs: { type: "array", items: { type: "string" } },
                      },
                      required: ["question_text", "correct_answer", "time_limit"],
                      additionalProperties: false,
                    },
                  },
                  lessons: {
                    type: "array",
                    items: { type: "string" },
                  },
                  summary: { type: "string" },
                },
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_payload" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "طھظ… طھط¬ط§ظˆط² ط­ط¯ ط§ظ„ط·ظ„ط¨ط§طھطŒ ط­ط§ظˆظ„ ظ„ط§ط­ظ‚ط§" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "ظٹط±ط¬ظ‰ ط¥ط¶ط§ظپط© ط±طµظٹط¯ ظ„ظ„ظ…ط­ظپط¸ط©" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const responseText = await response.text();
      console.error("generate-questions AI error:", response.status, responseText);
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    const payload = extractPayload(aiData);

    if (requestedType === "lessons_list") {
      const lessons = asStringArray(payload.lessons).slice(0, 10);

      if (!lessons.length) throw new Error("No lessons generated");

      return new Response(JSON.stringify({ lessons }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (requestedType === "lesson_summary") {
      const summary = typeof payload.summary === "string" ? payload.summary.trim() : "";

      if (!summary) throw new Error("No summary generated");

      return new Response(JSON.stringify({ summary }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawQuestions = Array.isArray(payload.questions) ? payload.questions : [];

    const questions = rawQuestions
      .map((question) => {
        const questionText = typeof question.question_text === "string" ? question.question_text.trim() : "";
        const correctAnswer = toCorrectAnswer(question.correct_answer);
        const options = asStringArray(question.options);
        const matchingPairs = asStringArray(question.matching_pairs);
        const timeLimit = clamp(Math.round(Number(question.time_limit) || 30), 15, 120);

        if (!questionText || !correctAnswer) return null;

        if (requestedType === "multiple_choice" && options.length < 2) return null;
        if (requestedType === "matching" && (options.length < 2 || matchingPairs.length < 2)) return null;

        return {
          question_text: questionText,
          options: options.length ? options : undefined,
          correct_answer: correctAnswer,
          time_limit: timeLimit,
          matching_pairs: matchingPairs.length ? matchingPairs : undefined,
        };
      })
      .filter((question): question is NonNullable<typeof question> => question !== null)
      .slice(0, questionCount);

    if (!questions.length) throw new Error("No questions generated");

    return new Response(JSON.stringify({ questions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-questions error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
