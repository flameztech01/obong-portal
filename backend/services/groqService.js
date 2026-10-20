// services/groqService.js
import Groq from "groq-sdk";
import { PDFParse } from "pdf-parse";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const splitEnv = (v) =>
  String(v || "").split(",").map((s) => s.trim()).filter(Boolean);

const unique = (arr) => [...new Set(arr.filter(Boolean))];

const TEXT_CANDIDATES = unique([
  process.env.GROQ_TEXT_MODEL,
  ...splitEnv(process.env.GROQ_TEXT_MODELS),
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.8-27b",
  "llama-3.3-70b-versatile", 
  "llama-3.1-8b-instant", 
]);

const VISION_CANDIDATES = unique([
  process.env.GROQ_VISION_MODEL,
  ...splitEnv(process.env.GROQ_VISION_MODELS),
  "llama-3.2-90b-vision-preview",
  "llama-3.2-11b-vision-preview",
  "qwen/qwen3.8-27b",
]);

const VISION_ID_PATTERN = /vision|qwen3\.\d+-\d+b|muse-spark|llama-4/i;
const NON_CHAT_PATTERN =
  /whisper|tts|playai|guard|safeguard|embed|orpheus|compound/i;

const MODEL_MAX_COMPLETION = {
  "qwen/qwen3.8-27b": 16384,
  "openai/gpt-oss-120b": 65536,
  "openai/gpt-oss-20b": 65536,
  "llama-3.3-70b-versatile": 32768,
};

const DEFAULT_MAX_TOKENS = 8192;
const DEFAULT_TEMPERATURE = 0.2;
const MAX_DOC_CHARS = Number(process.env.GROQ_MAX_DOC_CHARS) || 60000;

const MODEL_LIST_TTL_MS = 10 * 60 * 1000;
const DEAD_MODEL_TTL_MS = 10 * 60 * 1000;

/* ============================================================
   LIVE MODEL DISCOVERY + HEALTH TRACKING
   ============================================================ */

let modelListCache = { at: 0, ids: null };
const deadModels = new Map();

const getAvailableModelIds = async () => {
  const now = Date.now();
  if (modelListCache.ids && now - modelListCache.at < MODEL_LIST_TTL_MS) {
    return modelListCache.ids;
  }
  try {
    const res = await groq.models.list();
    const ids = (res?.data || [])
      .filter((m) => m?.id && m.active !== false)
      .map((m) => m.id);
    modelListCache = { at: now, ids };
    return ids;
  } catch (err) {
    console.warn("[groq] could not list models:", err?.message || err);
    return modelListCache.ids;
  }
};

const isDead = (id) => {
  const at = deadModels.get(id);
  if (!at) return false;
  if (Date.now() - at > DEAD_MODEL_TTL_MS) {
    deadModels.delete(id);
    return false;
  }
  return true;
};

const markDead = (id) => deadModels.set(id, Date.now());

const resolveCandidates = async (kind) => {
  const preferred = kind === "vision" ? VISION_CANDIDATES : TEXT_CANDIDATES;
  const available = await getAvailableModelIds();

  let list;
  if (available && available.length) {
    list = preferred.filter((id) => available.includes(id));
    const discovered = available.filter((id) => {
      if (list.includes(id) || NON_CHAT_PATTERN.test(id)) return false;
      return kind === "vision" ? VISION_ID_PATTERN.test(id) : /gpt-oss|qwen/i.test(id);
    });
    list = [...list, ...discovered];
  } else {
    list = [...preferred];
  }

  const alive = list.filter((id) => !isDead(id));
  return alive.length ? alive : list;
};

/* ============================================================
   ERROR CLASSIFICATION
   ============================================================ */

const errInfo = (err) => {
  const status = err?.status ?? err?.response?.status;
  const code = err?.error?.error?.code || err?.error?.code || err?.code || "";
  const message = String(
    err?.error?.error?.message || err?.error?.message || err?.message || ""
  );
  return { status, code: String(code), message };
};

const shouldSwitchModel = (err) => {
  const { status, code, message } = errInfo(err);
  if (status === 404 || status === 413 || status === 429) return true;
  if (status && status >= 500) return true;
  if (status === 403) return true;
  if (status === 400) {
    return /model_decommissioned|model_not_found|decommission|does not exist|not supported|no longer supported|context.?length|too large/i.test(
      `${code} ${message}`
    );
  }
  return false;
};

const isModelGone = (err) => {
  const { status, code, message } = errInfo(err);
  return (
    status === 404 ||
    /model_not_found|model_decommissioned|decommission|does not exist|no longer supported/i.test(
      `${code} ${message}`
    )
  );
};

const isJsonModeProblem = (err) => {
  const { status, code, message } = errInfo(err);
  return (
    status === 400 &&
    /json_validate_failed|response_format|json_object|json mode/i.test(
      `${code} ${message}`
    )
  );
};

const isExtraParamProblem = (err) => {
  const { status, message } = errInfo(err);
  return status === 400 && /reasoning|unsupported parameter|unknown parameter/i.test(message);
};

/* ============================================================
   FILE → MODEL INPUT
   ============================================================ */

const extractPdfText = async (buffer) => {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return result?.text || "";
  } finally {
    await parser.destroy();
  }
};

const fetchPdfText = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch PDF (HTTP ${res.status})`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const text = (await extractPdfText(buffer)).trim();
  if (text.length < 10) {
    throw new Error(
      "PDF appears to be a scanned image (no extractable text). Upload a clear photo instead."
    );
  }
  return text.length > MAX_DOC_CHARS
    ? `${text.slice(0, MAX_DOC_CHARS)}\n\n[...document truncated...]`
    : text;
};

const urlToDataUri = async (url, mimeType) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image (HTTP ${res.status})`);
  const buffer = Buffer.from(await res.arrayBuffer());
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
};

const buildDocumentUserMessage = async (fileUrl, mimeType, prompt) => {
  if (mimeType?.startsWith("image/")) {
    return {
      kind: "vision",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: fileUrl } },
          ],
        },
      ],
      imageFallback: { fileUrl, mimeType, prompt },
    };
  }
  if (mimeType === "application/pdf") {
    const text = await fetchPdfText(fileUrl);
    return {
      kind: "text",
      messages: [
        {
          role: "user",
          content: `${prompt}\n\n--- DOCUMENT TEXT ---\n${text}`,
        },
      ],
    };
  }
  throw new Error(`Unsupported file type: ${mimeType}`);
};

/* ============================================================
   CORE CHAT
   ============================================================ */

const cleanOutput = (text) =>
  String(text ?? "").replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

const clampTokens = (model, tokens) =>
  Math.min(tokens, MODEL_MAX_COMPLETION[model] || tokens);

const extrasFor = (model) =>
  /^openai\/gpt-oss/.test(model) ? { reasoning_effort: "low" } : {};

const callGroq = async ({ model, messages, jsonMode, maxTokens, temperature, useExtras }) => {
  const completion = await groq.chat.completions.create({
    model,
    messages,
    max_tokens: clampTokens(model, maxTokens),
    temperature,
    ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    ...(useExtras ? extrasFor(model) : {}),
  });
  const choice = completion.choices?.[0];
  return {
    content: cleanOutput(choice?.message?.content),
    finishReason: choice?.finish_reason,
  };
};

const runChat = async ({
  kind = "text",
  messages,
  jsonMode = false,
  maxTokens = DEFAULT_MAX_TOKENS,
  temperature = DEFAULT_TEMPERATURE,
  imageFallback = null,
}) => {
  const candidates = await resolveCandidates(kind);

  if (!candidates.length) {
    throw new Error(
      kind === "vision"
        ? "No vision-capable Groq model is available right now. Upload a text-based PDF instead, or set GROQ_VISION_MODEL to a valid model."
        : "No Groq text model is available. Set GROQ_TEXT_MODEL to a valid model."
    );
  }

  let lastError = null;

  for (const model of candidates) {
    let currentMessages = messages;
    let currentMaxTokens = maxTokens;
    let useJsonMode = jsonMode;
    let useExtras = true;
    let triedDataUri = false;
    let triedMoreTokens = false;

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const { content, finishReason } = await callGroq({
          model,
          messages: currentMessages,
          jsonMode: useJsonMode,
          maxTokens: currentMaxTokens,
          temperature,
          useExtras,
        });

        if (!content && finishReason === "length" && !triedMoreTokens) {
          triedMoreTokens = true;
          currentMaxTokens = currentMaxTokens * 2;
          continue;
        }
        if (!content) throw new Error(`Model ${model} returned an empty response`);

        if (model !== candidates[0]) {
          console.warn(`[groq] using fallback ${kind} model: ${model}`);
        }
        return content;
      } catch (err) {
        lastError = err;
        const { status, message } = errInfo(err);

        if (useJsonMode && isJsonModeProblem(err)) {
          useJsonMode = false;
          continue;
        }

        if (useExtras && Object.keys(extrasFor(model)).length && isExtraParamProblem(err)) {
          useExtras = false;
          continue;
        }

        if (
          kind === "vision" &&
          imageFallback &&
          !triedDataUri &&
          status === 400 &&
          /image|url|fetch|download/i.test(message)
        ) {
          triedDataUri = true;
          try {
            const dataUri = await urlToDataUri(imageFallback.fileUrl, imageFallback.mimeType);
            currentMessages = [
              {
                role: "user",
                content: [
                  { type: "text", text: imageFallback.prompt },
                  { type: "image_url", image_url: { url: dataUri } },
                ],
              },
            ];
            continue;
          } catch (fetchErr) {
            lastError = fetchErr;
            break;
          }
        }

        if (shouldSwitchModel(err)) {
          if (isModelGone(err)) markDead(model);
          console.warn(
            `[groq] ${model} failed (${status || "?"}): ${message.slice(0, 160)}. Trying next model...`
          );
          break;
        }

        if (/returned an empty response/.test(message)) break;

        throw err;
      }
    }
  }

  throw lastError || new Error("All Groq models failed");
};

const safeJsonParse = (raw) => {
  const trimmed = String(raw).trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const body = fenced ? fenced[1] : trimmed;
  try {
    return JSON.parse(body);
  } catch {
    const start = body.indexOf("{");
    const end = body.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(body.slice(start, end + 1));
      } catch {
        /* fall through */
      }
    }
    throw new Error("AI did not return valid JSON");
  }
};

/* ============================================================
   NORMALIZERS (session / semester)
   ============================================================ */

const normalizeSession = (value) => {
  if (value === null || value === undefined) return null;
  const m = String(value).match(/(\d{4})\s*[\/\\\-]\s*(\d{2,4})/);
  if (!m) return null;
  const start = m[1];
  let end = m[2];
  if (end.length === 2) end = `${start.slice(0, 2)}${end}`;
  return `${start}/${end}`;
};

const normalizeSemester = (value) => {
  if (value === null || value === undefined) return null;
  const s = String(value).toLowerCase();
  if (/\b(1st|first|1)\b/.test(s)) return "first";
  if (/\b(2nd|second|2)\b/.test(s)) return "second";
  return null;
};

const mostCommon = (arr) => {
  const counts = new Map();
  for (const v of arr) {
    if (!v) continue;
    counts.set(v, (counts.get(v) || 0) + 1);
  }
  let best = null;
  let bestCount = 0;
  for (const [v, c] of counts.entries()) {
    if (c > bestCount) {
      best = v;
      bestCount = c;
    }
  }
  return best;
};

/* ============================================================
   PUBLIC METHODS
   ============================================================ */

export const parseCalendarDocument = async ({ fileUrl, mimeType }) => {
  const prompt = `You are parsing a university academic calendar.
Extract the following dates. Return ONLY valid JSON in this exact shape (use null for any date you cannot find):
{
  "closingDate": "YYYY-MM-DD" | null,
  "resumptionDate": "YYYY-MM-DD" | null,
  "examStartDate": "YYYY-MM-DD" | null,
  "examEndDate": "YYYY-MM-DD" | null,
  "semesterBreakStart": "YYYY-MM-DD" | null,
  "semesterBreakEnd": "YYYY-MM-DD" | null,
  "notes": "any other important info or ambiguities"
}
Rules:
- ISO format YYYY-MM-DD only.
- If a year is ambiguous, infer from other dates in the document.
- If multiple semesters are present, use the most recent/current semester.
- Return ONLY the JSON object.`;

  const { kind, messages, imageFallback } = await buildDocumentUserMessage(fileUrl, mimeType, prompt);
  const raw = await runChat({ kind, messages, jsonMode: true, imageFallback });
  const parsed = safeJsonParse(raw);

  const pickDate = (key) => {
    const v = parsed?.[key];
    if (!v || typeof v !== "string") return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  };

  return {
    closingDate: pickDate("closingDate"),
    resumptionDate: pickDate("resumptionDate"),
    examStartDate: pickDate("examStartDate"),
    examEndDate: pickDate("examEndDate"),
    semesterBreakStart: pickDate("semesterBreakStart"),
    semesterBreakEnd: pickDate("semesterBreakEnd"),
    notes: typeof parsed?.notes === "string" ? parsed.notes : null,
  };
};

export const parseResultDocument = async ({ fileUrl, mimeType, mode, courseCode, courseTitle, units }) => {
  const isLecturer = mode === "lecturer";

  const context = isLecturer
    ? `This is a result sheet for ONE specific course: ${courseCode}. Every row is for the SAME course.`
    : `This is a student transcript covering MULTIPLE courses. The document may contain multiple tables (e.g., 1st Semester, 2nd Semester) and possibly multiple academic sessions.`;

  const prompt = `You are an expert OCR AI parsing a university transcript. ${context}

Extract every student result row from the data tables. Return ONLY valid JSON:

{
  "rows": [
    {
      "session": "YYYY/YYYY" | null,
      "semester": "first" | "second" | null,
      "courseCode": "string | null",
      "courseTitle": "string | null",
      "units": number | null,
      "score": number | null,
      "grade": "A" | "B" | "C" | "D" | "E" | "F" | null
    }
  ]
}

🚨 CRITICAL RULES — READ CAREFULLY:
1. EXTRACT EVERY SINGLE ROW: Do NOT skip any courses. If there are two tables (1ST SEMESTER and 2ND SEMESTER), you must extract the rows from BOTH tables.
2. UNITS vs S/N: The transcript has a column for "S/N" (Serial Number) and a column for "COURSE UNIT". DO NOT confuse them. "S/N" is 1, 2, 3... The "COURSE UNIT" is usually 2 or 3. Use the "COURSE UNIT" column for the "units" field.
3. SELF-CHECK: Before you finish, count the number of course rows you extracted. Check if it matches the total number of courses on the page (e.g., if there are 15 rows, your JSON must have exactly 15 objects).
4. Look for columns like "COURSE CODE", "COURSE TITLE", "COURSE UNIT", "GRADE (100)" (or "SCORE"), and "LETTER GRADE" (or "GRADE").
5. Map the numerical score (e.g. 78) to the "score" field. Map the letter (e.g. A) to the "grade" field.
6. ${isLecturer ? `Use "${courseCode}" and "${units}" for every row.` : `Extract the real code and units printed on the page.`}
7. SESSION: find the academic session printed on the document (e.g. "SESSION: 2023/2024") and put it in every row's "session" as "YYYY/YYYY".
8. SEMESTER: "1ST SEMESTER" / "FIRST SEMESTER" → "first". "2ND SEMESTER" / "SECOND SEMESTER" → "second".
9. Ignore the grading-scale / classification tables at the bottom of the page (e.g., the table showing 76-100 = A = 5.00). They are NOT course rows.
10. Return ONLY the JSON object. No markdown, no comments.`;

  const { kind, messages, imageFallback } = await buildDocumentUserMessage(fileUrl, mimeType, prompt);
  const raw = await runChat({ kind, messages, jsonMode: true, maxTokens: 16384, imageFallback });
  const parsed = safeJsonParse(raw);

  const rawRows = Array.isArray(parsed?.rows) ? parsed.rows : [];

  const documentSession = mostCommon(rawRows.map((r) => normalizeSession(r?.session)));

  const rows = rawRows.map((r) => {
    const scoreNum =
      r.score !== null && r.score !== undefined && r.score !== "" && !Number.isNaN(Number(r.score))
        ? Number(r.score)
        : null;
    const gradeRaw = r.grade ? String(r.grade).toUpperCase().trim() : null;
    const grade = ["A", "B", "C", "D", "E", "F"].includes(gradeRaw) ? gradeRaw : null;

    return {
      matricNumber: null,
      courseCode: isLecturer ? courseCode : r.courseCode ? String(r.courseCode).toUpperCase().replace(/\s+/g, "").trim() : null,
      courseTitle: r.courseTitle ? String(r.courseTitle).trim() : isLecturer ? courseTitle || null : null,
      units: isLecturer ? units : r.units != null ? Number(r.units) : null,
      score: scoreNum,
      grade,
      session: isLecturer ? null : normalizeSession(r.session) || documentSession,
      semester: isLecturer ? null : normalizeSemester(r.semester),
      matched: false,
      warnings: [],
    };
  });

  return { rows, warnings: [] };
};

export const summarizeContent = async ({ fileUrl, mimeType, title }) => {
  const prompt = `Summarize the study material titled "${title}". Return JSON: { "summary": "", "keyPoints": [], "definitions": [{"term": "", "definition": ""}], "questionsToConsider": [] }`;
  const { kind, messages, imageFallback } = await buildDocumentUserMessage(fileUrl, mimeType, prompt);
  const raw = await runChat({ kind, messages, jsonMode: true, maxTokens: 8192, imageFallback });
  return safeJsonParse(raw);
};

export const chatAboutContent = async ({ fileUrl, mimeType, materialTitle, history, userMessage }) => {
  const systemPrompt = `You are a friendly study assistant for "${materialTitle}".`;
  let contextContent;
  let kind;
  let imageFallback = null;

  if (mimeType?.startsWith("image/")) {
    kind = "vision";
    contextContent = [{ type: "text", text: "Here is the material:" }, { type: "image_url", image_url: { url: fileUrl } }];
    imageFallback = { fileUrl, mimeType, prompt: "Here is the material:" };
  } else if (mimeType === "application/pdf") {
    kind = "text";
    contextContent = `Here is the material:\n\n${await fetchPdfText(fileUrl)}`;
  } else {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }

  const safeHistory = Array.isArray(history) ? history.slice(-20) : [];
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: contextContent },
    ...safeHistory,
    { role: "user", content: String(userMessage).slice(0, 4000) },
  ];

  return runChat({ kind, messages, maxTokens: 4096, temperature: 0.4, imageFallback });
};

export const generateQuizQuestions = async ({ fileUrl, mimeType, materialTitle, count = 5, types = ["mcq"], marksPerQuestion = 1 }) => {
  const prompt = `Generate ${count} quiz questions from "${materialTitle}". Return JSON: { "questions": [{ "type": "mcq" | "theory", "question": "", "options": [], "correctAnswer": "", "modelAnswer": "", "marks": ${marksPerQuestion} }] }`;
  const { kind, messages, imageFallback } = await buildDocumentUserMessage(fileUrl, mimeType, prompt);
  const raw = await runChat({ kind, messages, jsonMode: true, maxTokens: 8192, imageFallback });
  const parsed = safeJsonParse(raw);
  return Array.isArray(parsed?.questions) ? parsed.questions : [];
};

/* ============================================================
   NEW: PARSE COURSE ALLOCATION DOCUMENT
   ============================================================ */
export const parseCourseAllocationDocument = async ({ fileUrl, mimeType, session, semester }) => {
  const prompt = `You are parsing a university course allocation document.
  
Context:
- Academic Session: ${session}
- Semester: ${semester}

Extract every course listed in the tables. Return ONLY valid JSON:

{
  "courses": [
    {
      "level": 100 | 200 | 300 | 400 | 500,
      "code": "string",
      "title": "string",
      "units": number
    }
  ]
}

🚨 CRITICAL RULES:
1. Look for headings like "YEAR ONE", "YEAR TWO", "100 LEVEL", "200 LEVEL". Map "YEAR ONE" to 100, "YEAR TWO" to 200, "YEAR THREE" to 300, "YEAR FOUR" to 400, "YEAR FIVE" to 500.
2. Extract the Course Code (e.g. GST 111, CSC 211), Course Title, and Credit Units.
3. Do NOT use the "S/N" (Serial Number) column for units. The units are under the "Credit Unit" or "Units" column. Usually, this is a small number like 2, 3, or 1.
4. Ignore lecturer names (e.g. Mr. Uduak Etim) completely.
5. Do NOT include the "Total" rows at the bottom of the tables.
6. Return ONLY the JSON object. No markdown, no comments.`;

  const { kind, messages, imageFallback } = await buildDocumentUserMessage(fileUrl, mimeType, prompt);
  
  const raw = await runChat({ kind, messages, jsonMode: true, maxTokens: 8192, imageFallback });
  const parsed = safeJsonParse(raw);
  
  return Array.isArray(parsed?.courses) ? parsed.courses : [];
};