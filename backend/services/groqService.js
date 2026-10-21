// services/groqService.js
import Groq from "groq-sdk";
import { PDFParse } from "pdf-parse";

// Optional: image pre-processing (auto-rotate, resize, sharpen). `npm i sharp`
let sharp = null;
try {
  sharp = (await import("sharp")).default;
} catch {
  /* sharp not installed: images are sent as-is */
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const splitEnv = (v) =>
  String(v || "").split(",").map((s) => s.trim()).filter(Boolean);

const unique = (arr) => [...new Set(arr.filter(Boolean))];

const TEXT_CANDIDATES = unique([
  process.env.GROQ_TEXT_MODEL,
  ...splitEnv(process.env.GROQ_TEXT_MODELS),
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-20b",
]);

// (llama-3.2-*-vision-preview removed: decommissioned)
const VISION_CANDIDATES = unique([
  process.env.GROQ_VISION_MODEL,
  ...splitEnv(process.env.GROQ_VISION_MODELS),
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

// 🚨 LOWERED TO FIT WITHIN GROQ'S 8000 TPM FREE TIER LIMIT
const DEFAULT_MAX_TOKENS = 2048;
const MIN_MAX_TOKENS = 512;
const DEFAULT_TEMPERATURE = 0.2;

// 🚨 MAX CHARACTERS FOR PDF TEXT (~3,000 tokens) so we don't exceed the 8k limit
const MAX_DOC_CHARS = 12000; 

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
      return kind === "vision" ? VISION_ID_PATTERN.test(id) : /gpt-oss|qwen|llama/i.test(id);
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

const isTooLarge = (err) => {
  const { status, message } = errInfo(err);
  return (
    status === 413 ||
    /request too large|reduce your message size|requested \d+/i.test(message)
  );
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
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        `Could not download PDF (HTTP ${res.status}). Cloudinary may be blocking PDF delivery — enable "Allow delivery of PDF and ZIP files" in Cloudinary Settings > Security.`
      );
    }
    throw new Error(`Failed to fetch PDF (HTTP ${res.status})`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const text = (await extractPdfText(buffer)).trim();
  if (text.length < 10) {
    throw new Error(
      "PDF appears to be a scanned image (no extractable text). Upload a clear photo instead."
    );
  }
  
  // Truncate heavily to avoid 413 Payload Too Large errors on Groq
  return text.length > MAX_DOC_CHARS
    ? `${text.slice(0, MAX_DOC_CHARS)}\n\n[...document truncated to fit AI limits...]`
    : text;
};

const urlToDataUri = async (url, fallbackMime = "image/jpeg") => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image (HTTP ${res.status})`);
  const mime = res.headers.get("content-type")?.split(";")[0] || fallbackMime;
  const buffer = Buffer.from(await res.arrayBuffer());
  return `data:${mime};base64,${buffer.toString("base64")}`;
};

// Replace every remote image URL in the messages with an inline base64 data URI.
const inlineRemoteImages = async (messages) => {
  const out = [];
  for (const m of messages) {
    if (!Array.isArray(m.content)) {
      out.push(m);
      continue;
    }
    const content = [];
    for (const part of m.content) {
      const url = part?.type === "image_url" ? part.image_url?.url : null;
      if (url && /^https?:\/\//i.test(url)) {
        content.push({ type: "image_url", image_url: { url: await urlToDataUri(url) } });
      } else {
        content.push(part);
      }
    }
    out.push({ ...m, content });
  }
  return out;
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
    };
  }
  if (mimeType === "application/pdf") {
    const text = await fetchPdfText(fileUrl);
    return {
      kind: "text",
      messages: [
        { role: "user", content: `${prompt}\n\n--- DOCUMENT TEXT ---\n${text}` },
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
  const failures = [];

  for (const model of candidates) {
    let currentMessages = messages;
    let currentMaxTokens = maxTokens;
    let useJsonMode = jsonMode;
    let useExtras = true;
    let triedDataUri = false;
    let triedMoreTokens = false;

    for (let attempt = 0; attempt < 6; attempt++) {
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

        // Model couldn't fetch the remote image URL -> send images inline as base64
        if (
          kind === "vision" &&
          !triedDataUri &&
          status === 400 &&
          /image|url|fetch|download/i.test(message)
        ) {
          triedDataUri = true;
          try {
            currentMessages = await inlineRemoteImages(currentMessages);
            continue;
          } catch (fetchErr) {
            lastError = fetchErr;
            failures.push(`${model}: ${fetchErr.message}`);
            break;
          }
        }

        // Request too big for this tier: shrink reserved output before abandoning the model
        if (isTooLarge(err) && currentMaxTokens > MIN_MAX_TOKENS) {
          currentMaxTokens = Math.max(Math.floor(currentMaxTokens / 2), MIN_MAX_TOKENS);
          console.warn(`[groq] ${model} request too large, retrying with max_tokens=${currentMaxTokens}`);
          continue;
        }

        if (shouldSwitchModel(err)) {
          if (isModelGone(err)) markDead(model);
          const line = `${model} failed (${status || "?"}): ${message.slice(0, 200)}`;
          failures.push(line);
          console.warn(`[groq] ${line}. Trying next model...`);
          break;
        }

        if (/returned an empty response/.test(message)) {
          failures.push(`${model}: empty response`);
          break;
        }

        throw err;
      }
    }
  }

  console.error("[groq] ALL MODELS FAILED:\n - " + failures.join("\n - "));
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
   NORMALIZERS (session / semester / level)
   ============================================================ */

// "2023/2024", "2023-2024", "2023/24", "SESSION: 2023/2024" → "2023/2024"
const normalizeSession = (value) => {
  if (value === null || value === undefined) return null;
  const m = String(value).match(/(\d{4})\s*[\/\\\-]\s*(\d{2,4})/);
  if (!m) return null;
  const start = m[1];
  let end = m[2];
  if (end.length === 2) end = `${start.slice(0, 2)}${end}`;
  return `${start}/${end}`;
};

// "1ST SEMESTER", "SEMESTER ONE", "First" → "first" ; "2ND", "SEMESTER TWO" → "second"
const normalizeSemester = (value) => {
  if (value === null || value === undefined) return null;
  const s = String(value).toLowerCase();
  if (/\b(1st|first|one|1)\b/.test(s)) return "first";
  if (/\b(2nd|second|two|2)\b/.test(s)) return "second";
  return null;
};

// "LEVEL 100", "EVEL 200", 300, "400L" → 100..500
const normalizeLevel = (value) => {
  if (value === null || value === undefined) return null;
  const m = String(value).match(/([1-5])\s*0\s*0/);
  return m ? Number(`${m[1]}00`) : null;
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
   TRANSCRIPT PAGE LOADING (images + PDFs → one image per page)
   ============================================================ */

const fetchBuffer = async (url) => {
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        `Could not download file (HTTP ${res.status}). For PDFs enable "Allow delivery of PDF and ZIP files" in Cloudinary Settings > Security.`
      );
    }
    throw new Error(`Failed to fetch file (HTTP ${res.status})`);
  }
  return Buffer.from(await res.arrayBuffer());
};

// Auto-rotate (EXIF), cap resolution, boost contrast/sharpness, return a base64 data URI.
const prepareImageDataUri = async (buffer, fallbackMime = "image/jpeg") => {
  if (!sharp) return `data:${fallbackMime};base64,${buffer.toString("base64")}`;
  try {
    const out = await sharp(buffer)
      .rotate()
      .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
      .normalize()
      .sharpen()
      .jpeg({ quality: 88 })
      .toBuffer();
    return `data:image/jpeg;base64,${out.toString("base64")}`;
  } catch (err) {
    console.warn("[image] preprocessing failed, sending original:", err.message);
    return `data:${fallbackMime};base64,${buffer.toString("base64")}`;
  }
};

// Render PDF pages to images (needs @napi-rs/canvas for pdf-parse v2 screenshots)
const pdfBufferToImageUris = async (buffer, { maxPages = 8, scale = 2 } = {}) => {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const shots = await parser.getScreenshot({ scale, first: maxPages });
    const uris = [];
    for (const p of shots?.pages || []) {
      uris.push(await prepareImageDataUri(Buffer.from(p.data), "image/png"));
    }
    return uris;
  } finally {
    await parser.destroy();
  }
};

// → [{ imageUri } | { text }]  (one entry per page / image)
const loadPageSources = async (fileList) => {
  const pages = [];
  for (const f of fileList) {
    const url = f?.url || f?.secure_url || f?.fileUrl;
    const mime = String(f?.mimeType || f?.mimetype || "").toLowerCase();
    if (!url) continue;

    const isPdf = mime === "application/pdf" || /\.pdf($|\?)/i.test(url);
    const isImg = mime.startsWith("image/") || /\.(jpe?g|jfif|png|webp)($|\?)/i.test(url);

    if (isImg) {
      pages.push({ imageUri: await prepareImageDataUri(await fetchBuffer(url)) });
    } else if (isPdf) {
      const buf = await fetchBuffer(url);
      try {
        const uris = await pdfBufferToImageUris(buf);
        if (!uris.length) throw new Error("no pages rendered");
        uris.forEach((u) => pages.push({ imageUri: u }));
      } catch (e) {
        console.warn("[pdf] render failed, falling back to text:", e.message);
        const text = (await extractPdfText(buf)).trim();
        if (text.length < 10) {
          throw new Error(
            "PDF has no readable text and could not be rendered to images. Upload clear photos instead."
          );
        }
        pages.push({ text: text.slice(0, MAX_DOC_CHARS) });
      }
    } else {
      throw new Error(`Unsupported file type: ${mime || "unknown"}`);
    }
  }
  return pages;
};

/* ============================================================
   TRANSCRIPT COMPLETENESS CHECKS + PER-PAGE PARSING
   ============================================================ */

const findParseProblems = ({ rows, totals }) => {
  const problems = [];

  // S/N continuity (e.g. IRSBACCOM numbers rows 1..N across both semesters)
  const sns = rows.map((r) => Number(r?.sn)).filter((n) => Number.isInteger(n) && n > 0);
  if (sns.length >= Math.max(3, rows.length * 0.7)) {
    const have = new Set(sns);
    const missing = [];
    for (let n = 1; n <= Math.max(...sns); n++) if (!have.has(n)) missing.push(n);
    if (missing.length) problems.push(`Rows with S/N ${missing.join(", ")} are missing.`);
  }

  // Printed semester credits vs parsed units
  const sums = new Map();
  for (const r of rows) {
    const key = `${normalizeLevel(r?.level) || ""}|${normalizeSemester(r?.semester) || ""}`;
    sums.set(key, (sums.get(key) || 0) + (Number(r?.units) || 0));
  }
  for (const t of totals) {
    const sem = normalizeSemester(t?.semester);
    const credits = Number(t?.credits);
    if (!sem || !credits) continue;
    const key = `${normalizeLevel(t?.level) || ""}|${sem}`;
    if (sums.has(key) && sums.get(key) !== credits) {
      problems.push(
        `${sem} semester: printed credits are ${credits} but parsed rows add up to ${sums.get(key)}.`
      );
    }
  }
  return problems;
};

const parseOnePage = async (page, prompt, pageNo, total) => {
  const run = async (extra = "") => {
    const text = `${prompt}${extra}\n\n(This is page ${pageNo} of ${total}.)`;
    const { kind, messages } = page.imageUri
      ? {
          kind: "vision",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text },
                { type: "image_url", image_url: { url: page.imageUri } },
              ],
            },
          ],
        }
      : {
          kind: "text",
          messages: [{ role: "user", content: `${text}\n\n--- DOCUMENT TEXT ---\n${page.text}` }],
        };

    const raw = await runChat({ kind, messages, jsonMode: true, maxTokens: 4096, temperature: 0 });
    const parsed = safeJsonParse(raw);
    return {
      rows: Array.isArray(parsed?.rows) ? parsed.rows : [],
      totals: Array.isArray(parsed?.printedTotals) ? parsed.printedTotals : [],
    };
  };

  let best = await run();
  let problems = findParseProblems(best);

  if (problems.length) {
    try {
      const retry = await run(
        `\n\nIMPORTANT: your previous answer was incomplete: ${problems.join(
          " "
        )} Re-read every table row by row, top to bottom (the last row directly above a totals line is a real course), and return the COMPLETE list again.`
      );
      const retryProblems = findParseProblems(retry);
      if (
        retry.rows.length > best.rows.length ||
        (retry.rows.length === best.rows.length && retryProblems.length < problems.length)
      ) {
        best = retry;
        problems = retryProblems;
      }
    } catch (e) {
      console.warn(`[parse] retry failed on page ${pageNo}:`, e.message);
    }
  }

  return { ...best, problems };
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

  const { kind, messages } = await buildDocumentUserMessage(fileUrl, mimeType, prompt);
  const raw = await runChat({ kind, messages, jsonMode: true, maxTokens: 2048 });
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

// Accepts multiple files (pages): files = [{ url, mimeType }, ...]
// Also still accepts legacy single { fileUrl, mimeType }.
// Each page/image is parsed in its own request, then merged.
export const parseResultDocument = async ({
  files,
  fileUrl,
  mimeType,
  mode,
  courseCode,
  courseTitle,
  units,
}) => {
  const isLecturer = mode === "lecturer";

  const fileList =
    Array.isArray(files) && files.length
      ? files
      : fileUrl
      ? [{ url: fileUrl, mimeType }]
      : [];

  if (!fileList.length) throw new Error("No files were provided to parse.");

  const context = isLecturer
    ? `This is a result sheet for ONE specific course: ${courseCode}. Every row is for the SAME course.`
    : `This is a student transcript covering MULTIPLE courses. Each page may contain a "SEMESTER ONE" table and a "SEMESTER TWO" table, often placed SIDE BY SIDE (left table = semester one, right table = semester two), or one below the other.`;

  const prompt = `You are an expert OCR AI parsing a university transcript. ${context}

Extract every course row from the data tables on this page. Return ONLY valid JSON:

{
  "rows": [
    {
      "sn": number | null,
      "level": 100 | 200 | 300 | 400 | 500 | null,
      "session": "YYYY/YYYY" | null,
      "semester": "first" | "second" | null,
      "matricNumber": "string | null",
      "courseCode": "string | null",
      "courseTitle": "string | null",
      "units": number | null,
      "score": number | null,
      "grade": "A" | "B" | "C" | "D" | "E" | "F" | null
    }
  ],
  "printedTotals": [ { "level": number | null, "semester": "first" | "second" | null, "credits": number } ]
}

CRITICAL RULES:
1. You MUST extract every single course row from ALL tables on the page. Do not skip rows. The LAST row directly above a totals/summary line is still a real course row.
2. Look for columns like "COURSE CODE", "COURSE TITLE", "COURSE UNIT" / "CREDIT UNIT" (or "UNIT"), "GRADE (100)" (or "SCORE"), and "LETTER GRADE" (or "GRADE"). Ignore the "GP" / "CP" / "GRADE POINT" columns.
3. Map the numerical score (e.g. 78) to "score", the letter (e.g. A) to "grade", and the credit unit (e.g. 2) to "units". If only one of score/grade exists, leave the other null.
4. ${
    isLecturer
      ? `Use "${courseCode}" and "${units}" for every row. Read each student's matric/registration number into "matricNumber".`
      : `Extract the real code and units printed on the page. "matricNumber" must be null.`
  }
5. LEVEL: read the level heading of the page or section (e.g. "LEVEL 100", "EVEL 200" which is a typo for LEVEL 200, "100 LEVEL", "YEAR ONE" = 100, "YEAR TWO" = 200). Put it in every row's "level" as 100, 200, 300, 400 or 500. If no level is printed, use null.
6. SESSION: ONLY set "session" if an academic session such as "2023/2024" is actually PRINTED on the page, written as "YYYY/YYYY". A session printed once near the top applies to every table below it on that page. If no session is printed, set "session" to null. NEVER guess or invent a session.
7. SEMESTER: use the heading above each table. "1ST SEMESTER" / "FIRST SEMESTER" / "SEMESTER ONE" (even if prefixed by words like "PREPARATORY:") → "first". "2ND SEMESTER" / "SECOND SEMESTER" / "SEMESTER TWO" → "second". Ignore decorative text on the same line as the heading (e.g. "RESEARCH ACTIVITY"). Every row in a table gets that table's semester.
8. SERIAL NUMBERS: if the table has an S/N column, put it in "sn" for every row. S/N often continues across semesters (1-8, then 9-15); include all of them.
9. "printedTotals": copy ONLY the semester credit totals that are printed (e.g. "SEMESTER'S CREDITS: 24"). Do not compute anything.
10. Ignore summary lines (semester credits, grade points, GPA, CGPA), the year/CGPA summary table and the grading-scale legend as course rows. They are NOT course rows.
11. Return ONLY the JSON object. No markdown, no comments.`;

  const pages = await loadPageSources(fileList);
  if (!pages.length) throw new Error("No readable files were provided.");

  const rawRows = [];
  const warnings = [];

  for (let i = 0; i < pages.length; i++) {
    const page = await parseOnePage(pages[i], prompt, i + 1, pages.length);

    // Fill missing sessions from the same page (same level first)
    const pageSession = mostCommon(page.rows.map((r) => normalizeSession(r?.session)));
    for (const r of page.rows) {
      const lvl = normalizeLevel(r?.level);
      const lvlSession = mostCommon(
        page.rows
          .filter((x) => normalizeLevel(x?.level) === lvl)
          .map((x) => normalizeSession(x?.session))
      );
      r.session = normalizeSession(r?.session) || lvlSession || pageSession || null;
      rawRows.push(r);
    }

    page.problems.forEach((p) => warnings.push(`Page ${i + 1}: ${p}`));
  }

  // Fallback session is chosen PER LEVEL, so different levels never get merged into one session.
  // Rows with no level fall back to the most common session overall.
  const sessionByLevel = new Map();
  const levels = [...new Set(rawRows.map((r) => normalizeLevel(r?.level)).filter(Boolean))];
  for (const lvl of levels) {
    sessionByLevel.set(
      lvl,
      mostCommon(
        rawRows
          .filter((r) => normalizeLevel(r?.level) === lvl)
          .map((r) => normalizeSession(r?.session))
      )
    );
  }
  // FIX: previously null whenever any row had a level, which left level-less rows without a session
  const globalSession = mostCommon(rawRows.map((r) => normalizeSession(r?.session)));

  const rows = rawRows.map((r) => {
    const scoreNum =
      r.score !== null && r.score !== undefined && r.score !== "" && !Number.isNaN(Number(r.score))
        ? Number(r.score)
        : null;
    const gradeRaw = r.grade ? String(r.grade).toUpperCase().trim() : null;
    const grade = ["A", "B", "C", "D", "E", "F"].includes(gradeRaw) ? gradeRaw : null;
    const level = isLecturer ? null : normalizeLevel(r.level);

    return {
      // FIX: lecturer sheets can now carry matric numbers so students get matched
      matricNumber:
        isLecturer && r.matricNumber
          ? String(r.matricNumber).toUpperCase().replace(/\s+/g, "").trim()
          : null,
      courseCode: isLecturer
        ? courseCode
        : r.courseCode
        ? String(r.courseCode).toUpperCase().replace(/\s+/g, "").trim()
        : null,
      courseTitle: r.courseTitle
        ? String(r.courseTitle).trim()
        : isLecturer
        ? courseTitle || null
        : null,
      units: isLecturer ? units : r.units != null ? Number(r.units) : null,
      score: scoreNum,
      grade,
      level,
      session: isLecturer
        ? null
        : normalizeSession(r.session) ||
          (level ? sessionByLevel.get(level) : globalSession) ||
          null,
      semester: isLecturer ? null : normalizeSemester(r.semester),
      matched: false,
      warnings: [],
    };
  });

  return { rows, warnings };
};

export const summarizeContent = async ({ fileUrl, mimeType, title }) => {
  const prompt = `Summarize the study material titled "${title}". Return JSON: { "summary": "", "keyPoints": [], "definitions": [{"term": "", "definition": ""}], "questionsToConsider": [] }`;
  const { kind, messages } = await buildDocumentUserMessage(fileUrl, mimeType, prompt);
  const raw = await runChat({ kind, messages, jsonMode: true, maxTokens: 2048 });
  return safeJsonParse(raw);
};

export const chatAboutContent = async ({ fileUrl, mimeType, materialTitle, history, userMessage }) => {
  // 🚨 FORCE CONVERSATIONAL FORMATTING (no markdown headers, no textbook dumps)
  const systemPrompt = `You are a helpful, friendly study assistant for "${materialTitle}". 
Answer the user's questions clearly and naturally. 
Use short, conversational paragraphs. 
Do NOT use markdown headers (like ###), huge bulleted lists, or textbook-style structures unless the user explicitly asks for a list. 
Keep your answers concise and focused on exactly what the user asked.`;

  let contextContent;
  let kind;

  if (mimeType?.startsWith("image/")) {
    kind = "vision";
    contextContent = [
      { type: "text", text: "Here is the material:" },
      { type: "image_url", image_url: { url: fileUrl } },
    ];
  } else if (mimeType === "application/pdf") {
    kind = "text";
    contextContent = `Here is the material:\n\n${await fetchPdfText(fileUrl)}`;
  } else {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }

  // Only keep the last 4 messages to save tokens
  const safeHistory = Array.isArray(history) ? history.slice(-4) : [];
  
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: contextContent },
    ...safeHistory,
    { role: "user", content: String(userMessage).slice(0, 1000) },
  ];

  // maxTokens is set to 2048 to leave enough room for the input context
  return runChat({ kind, messages, maxTokens: 2048, temperature: 0.4 });
};

export const generateQuizQuestions = async ({ fileUrl, mimeType, materialTitle, count = 5, types = ["mcq"], marksPerQuestion = 1 }) => {
  const prompt = `Generate ${count} quiz questions from "${materialTitle}". Return JSON: { "questions": [{ "type": "mcq" | "theory", "question": "", "options": [], "correctAnswer": "", "modelAnswer": "", "marks": ${marksPerQuestion} }] }`;
  const { kind, messages } = await buildDocumentUserMessage(fileUrl, mimeType, prompt);
  const raw = await runChat({ kind, messages, jsonMode: true, maxTokens: 2048 });
  const parsed = safeJsonParse(raw);
  return Array.isArray(parsed?.questions) ? parsed.questions : [];
};

/* ============================================================
   PARSE COURSE ALLOCATION DOCUMENT
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

CRITICAL RULES:
1. Look for headings like "YEAR ONE", "YEAR TWO", "100 LEVEL", "200 LEVEL". Map "YEAR ONE" to 100, "YEAR TWO" to 200, "YEAR THREE" to 300, "YEAR FOUR" to 400, "YEAR FIVE" to 500.
2. Extract the Course Code (e.g. GST 111, CSC 211), Course Title, and Credit Units.
3. Do NOT use the "S/N" (Serial Number) column for units. The units are under the "Credit Unit" or "Units" column. Usually, this is a small number like 2, 3, or 1.
4. Ignore lecturer names (e.g. Mr. Uduak Etim) completely.
5. Do NOT include the "Total" rows at the bottom of the tables.
6. Return ONLY the JSON object. No markdown, no comments.`;

  const { kind, messages } = await buildDocumentUserMessage(fileUrl, mimeType, prompt);
  const raw = await runChat({ kind, messages, jsonMode: true, maxTokens: 2048 });
  const parsed = safeJsonParse(raw);

  return Array.isArray(parsed?.courses) ? parsed.courses : [];
};