import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL = "google/gemini-3-flash-preview";
const DZEXAMS_URL = "https://www.dzexams.com/";

type RequestedType = "multiple_choice" | "text" | "matching" | "lessons_list" | "lesson_summary";

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

type PairMap = Record<string, string>;

type QuestionOutput = {
  question_text: string;
  options?: string[];
  correct_answer: string;
  time_limit: number;
  matching_pairs?: string[];
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const normalizeRequestedType = (value: string | undefined): RequestedType => {
  switch (value) {
    case "text":
      return "text";
    case "matching":
      return "matching";
    case "lessons_list":
      return "lessons_list";
    case "lesson_summary":
      return "lesson_summary";
    default:
      return "multiple_choice";
  }
};

const normalizeLevel = (value: string | undefined): string => {
  const clean = typeof value === "string" ? value.trim() : "";
  return clean || "general";
};

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => String(item).trim())
    .filter((item) => item.length > 0);
};

const dedupeStrings = (items: string[]): string[] => {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const item of items) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }

  return output;
};

const equalsIgnoreCase = (a: string, b: string): boolean => a.trim().toLowerCase() === b.trim().toLowerCase();

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
    // Continue to fallback parsers.
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

  // Try Gemini format first
  const candidates = typed?.candidates as Array<Record<string, unknown>> | undefined;
  if (candidates && candidates.length > 0) {
    const parts = (candidates[0].content as Record<string, unknown>)?.parts as Array<Record<string, unknown>> | undefined;
    const text = parts?.[0]?.text;
    if (typeof text === "string" && text.trim()) {
      return parseJsonLoose(text) as AiPayload;
    }
  }

  // Fallback to OpenAI format if needed
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

  throw new Error("No structured payload returned by AI");
};

const toPairMap = (value: unknown): PairMap | null => {
  if (!value) return null;

  let parsed: unknown = value;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return null;
    }
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }

  const output: PairMap = {};

  for (const [left, right] of Object.entries(parsed as Record<string, unknown>)) {
    const leftText = String(left).trim();
    const rightText = String(right ?? "").trim();

    if (!leftText || !rightText) continue;
    output[leftText] = rightText;
  }

  return Object.keys(output).length > 0 ? output : null;
};

const normalizeQuestion = (
  question: AiQuestion,
  requestedType: RequestedType,
  fallbackTimeLimit: number,
): QuestionOutput | null => {
  const questionText = typeof question.question_text === "string" ? question.question_text.trim() : "";
  if (!questionText) return null;

  const timeLimit = clamp(Math.round(Number(question.time_limit) || fallbackTimeLimit || 30), 15, 120);

  if (requestedType === "text") {
    const correctAnswer = toCorrectAnswer(question.correct_answer);
    if (!correctAnswer) return null;

    return {
      question_text: questionText,
      correct_answer: correctAnswer,
      time_limit: timeLimit,
    };
  }

  if (requestedType === "matching") {
    let options = asStringArray(question.options);
    let matchingPairs = asStringArray(question.matching_pairs);
    let pairMap = toPairMap(question.correct_answer);

    if (!pairMap && options.length >= 2 && matchingPairs.length >= 2) {
      const pairCount = Math.min(options.length, matchingPairs.length);
      pairMap = {};

      for (let i = 0; i < pairCount; i += 1) {
        pairMap[options[i]] = matchingPairs[i];
      }
    }

    if (!pairMap) return null;

    if (!options.length || !matchingPairs.length) {
      options = Object.keys(pairMap);
      matchingPairs = options.map((left) => pairMap![left]);
    }

    const pairCount = Math.min(options.length, matchingPairs.length);
    if (pairCount < 2) return null;

    options = options.slice(0, pairCount);
    matchingPairs = matchingPairs.slice(0, pairCount);

    const orderedMap: PairMap = {};

    for (let i = 0; i < pairCount; i += 1) {
      orderedMap[options[i]] = matchingPairs[i];
    }

    return {
      question_text: questionText,
      options,
      correct_answer: JSON.stringify(orderedMap),
      time_limit: timeLimit,
      matching_pairs: matchingPairs,
    };
  }

  let options = dedupeStrings(asStringArray(question.options));
  let correctAnswer = toCorrectAnswer(question.correct_answer);

  if (!correctAnswer && options.length > 0) {
    [correctAnswer] = options;
  }

  if (!correctAnswer) return null;

  if (!options.some((option) => equalsIgnoreCase(option, correctAnswer))) {
    options = [correctAnswer, ...options];
  }

  if (options.length > 4) {
    const withoutAnswer = options.filter((option) => !equalsIgnoreCase(option, correctAnswer));
    options = [correctAnswer, ...withoutAnswer].slice(0, 4);
  }

  if (options.length < 2) return null;

  return {
    question_text: questionText,
    options,
    correct_answer: correctAnswer,
    time_limit: timeLimit,
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as IncomingRequest;
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const topic = typeof body.topic === "string" ? body.topic.trim() : "";
    if (!topic) {
      throw new Error("Topic is required");
    }

    const requestedType = normalizeRequestedType(body.type);
    const questionCount = clamp(Math.round(Number(body.count ?? 5) || 5), 1, 30);
    const level = normalizeLevel(body.level);

    const isAlgerian =
      body.aiMode === "algerian" ||
      requestedType === "lessons_list" ||
      requestedType === "lesson_summary";

    const systemPrompt = isAlgerian
      ? [
        "You are an Arabic educational content generator specialized in Algerian curriculum content.",
        `هام جداً ورئيسي: استعن حصرياً بموقع الاختبارات الجزائري ${DZEXAMS_URL}. يجب أن تكون الأسئلة مستوحاة حرفياً من الفروض والاختبارات الحقيقية الموجودة في ذلك الموقع للمستوى المطلوب. يُمنع منعاً باتاً اختلاق أو تأليف أسئلة من خيالك.`,
        "Keep tone exam-like, clear, and aligned with Algerian official curriculum conventions.",
        "Do not use non-Algerian curriculum framing.",
        "Always output Arabic educational content.",
      ].join("\n")
      : [
        "You are an Arabic educational content generator.",
        "Generate high-quality and level-appropriate educational material in Arabic.",
      ].join("\n");

    const userPrompt =
      requestedType === "lessons_list"
        ? [
          `Task: List key lessons for topic "${topic}" at level "${level}".`,
          isAlgerian ? "CRITICAL: The lessons list must be exactly the ones from the official Algerian curriculum as seen on dzexams.com. Do not invent lessons." : "",
          "Return 5 to 10 concise lesson titles.",
          "Return JSON only with this shape:",
          '{"lessons":["..."]}',
        ].filter(Boolean).join("\n")
        : requestedType === "lesson_summary"
          ? [
            `Task: Write a concise study summary for lesson/topic "${topic}" at level "${level}".`,
            isAlgerian ? "CRITICAL: Content must be accurately derived from real Algerian lessons on dzexams.com without hallucinations, using accurate educational terms." : "",
            "Summary should be clear and structured for revision.",
            "Return JSON only with this shape:",
            '{"summary":"..."}',
          ].filter(Boolean).join("\n")
          : [
            `Task: Generate ${questionCount} Arabic questions.`,
            `Topic: "${topic}"`,
            `Level: "${level}"`,
            `Question type: "${requestedType}"`,
            isAlgerian ? "CRITICAL: You MUST extract and provide verbatim questions exactly as they appear on actual Algerian exams from dzexams.com for this topic/level. Do NOT hallucinate, invent or create your own questions." : "",
            requestedType === "multiple_choice"
              ? "For each question, provide exactly 4 options and one correct answer equal to one option."
              : "",
            requestedType === "text"
              ? "For text questions, omit options and provide a concise correct answer."
              : "",
            requestedType === "matching"
              ? "For matching questions, provide options (left list), matching_pairs (right list), and correct_answer as a JSON string map."
              : "",
            "Return JSON only with this shape:",
            '{"questions":[{"question_text":"...","options":["..."],"correct_answer":"...","time_limit":30,"matching_pairs":["..."]}]}',
          ]
            .filter(Boolean)
            .join("\n");

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
          }
        ],
        generationConfig: {
          temperature: isAlgerian ? 0.2 : 0.4,
          response_mime_type: "application/json"
        }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests, try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Please add wallet credits." }), {
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
      const lessons = dedupeStrings(asStringArray(payload.lessons)).slice(0, 10);

      if (!lessons.length) {
        throw new Error("No lessons generated");
      }

      return new Response(JSON.stringify({ lessons }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (requestedType === "lesson_summary") {
      const summary = typeof payload.summary === "string" ? payload.summary.trim() : "";

      if (!summary) {
        throw new Error("No summary generated");
      }

      return new Response(JSON.stringify({ summary }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawQuestions = Array.isArray(payload.questions) ? payload.questions : [];

    const questions = rawQuestions
      .map((question) => normalizeQuestion(question, requestedType, 30))
      .filter((question): question is QuestionOutput => question !== null)
      .slice(0, questionCount);

    if (!questions.length) {
      throw new Error("No questions generated");
    }

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
