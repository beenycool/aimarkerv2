'use client';

/**
 * AI Service abstraction layer
 *
 * Goals:
 * - Centralize all AI/network calls
 * - Prefer text-first PDF extraction for cost/speed/reliability
 * - Use structured JSON outputs when available
 * - Be defensive: retries, timeouts, schema normalization
 */

// Default model for tasks
export const DEFAULT_MODELS = {
  vision: 'google/gemini-2.0-flash-001', // For PDF parsing when vision is required
  chat: 'google/gemini-2.0-flash-001',   // For text-only tutoring/explanations
};

// ---- JSON EXTRACTION HELPERS ----

/**
 * Legacy helper name kept for compatibility.
 * Prefer extractFirstJson + parseJsonWithFixes for robustness.
 */
export function cleanGeminiJSON(text) {
  if (!text) return '';
  const stripped = stripCodeFences(text).trim();
  const extracted = extractFirstJson(stripped);
  return extracted ?? stripped;
}

function stripCodeFences(text) {
  return (text || '')
    .replace(/```(?:json|javascript|js|txt)?/gi, '```')
    .replace(/```/g, '')
    .trim();
}

/**
 * Extract the first top-level JSON object/array from a string.
 * Handles extra prose before/after, and braces inside strings.
 */
function extractFirstJson(text) {
  if (!text) return null;

  const s = stripCodeFences(text);
  const startObj = s.indexOf('{');
  const startArr = s.indexOf('[');
  const start =
    startObj === -1 ? startArr : startArr === -1 ? startObj : Math.min(startObj, startArr);
  if (start === -1) return null;

  const opening = s[start];
  const closing = opening === '{' ? '}' : ']';

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < s.length; i++) {
    const ch = s[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === '\\') {
      if (inString) escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === opening) depth++;
    if (ch === closing) depth--;

    if (depth === 0) {
      return s.slice(start, i + 1).trim();
    }
  }

  return null;
}

function parseJsonWithFixes(text) {
  const candidate = extractFirstJson(text) ?? text;
  if (!candidate) return { ok: false, error: 'No JSON found', data: null };

  // First attempt: strict JSON
  try {
    return { ok: true, data: JSON.parse(candidate), error: null };
  } catch (e1) {
    // Second attempt: remove trailing commas
    const noTrailingCommas = candidate
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'");

    try {
      return { ok: true, data: JSON.parse(noTrailingCommas), error: null };
    } catch (e2) {
      return { ok: false, error: e2?.message || e1?.message || 'Invalid JSON', data: null };
    }
  }
}

// ---- FILE HELPERS ----

export async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = String(result).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function fingerprintFile(file) {
  if (!file) return 'nofile';
  return [file.name, file.size, file.lastModified].join('|');
}

// In-memory cache (per-tab) to avoid duplicate parsing for the same File object.
const pdfTextCache = new Map();

async function getPdfText(file) {
  if (!file) return null;

  const key = fingerprintFile(file);
  if (pdfTextCache.has(key)) return pdfTextCache.get(key);

  const form = new FormData();
  form.append('file', file);

  const res = await fetch('/api/pdf/text', {
    method: 'POST',
    body: form,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `PDF text extraction failed (${res.status}).`);
  }

  const payload = {
    numPages: data.numPages || 0,
    pages: Array.isArray(data.pages) ? data.pages : [],
    fullText: typeof data.fullText === 'string' ? data.fullText : '',
  };

  pdfTextCache.set(key, payload);
  return payload;
}

// ---- PROMPTS ----

export const PROMPTS = {
  EXTRACTION_TEXT: `You are an expert exam paper parser.

You will receive extracted PDF text with explicit page markers like:
--- Page 1 ---
...text...

TASK:
1) Extract EVERY question and sub-question in order.
2) For each question, identify:
   - id (use the printed question number when possible)
   - section (Paper section name if available)
   - type (multiple_choice|short_text|long_text|list|numerical|table|graph_drawing)
   - marks (integer)
   - pageNumber (the page where the question starts; use the page marker)
   - question (exact full question text)
   - options (for multiple choice)
   - listCount (for list questions)
   - tableStructure (for tables: headers + optional initialData)
   - graphConfig (labels and axis min/max if present)
   - context (only if an extract/source text is referenced; include a short snippet)
   - relatedFigure + figurePage (if the question references a figure/diagram)
   - markingRegex (ONLY for 1-mark questions with an unambiguous short answer)

OUTPUT:
Return a single JSON object ONLY (no markdown, no extra text):
{
  "metadata": {
    "subject": string,
    "board": string,
    "year": number,
    "season": string,
    "paperNumber": string
  },
  "questions": [ ... ]
}

IMPORTANT:
- If you are uncertain about a field, omit it instead of guessing.
- Do not invent questions.
- Do not exceed the provided marks.
`,

  EXTRACTION_VISION: `You are an expert exam paper parser.

The user will provide a PDF (and optionally an insert/source booklet). Extract EVERY question and sub-question.

Output JSON ONLY in this shape:
{
  "metadata": {
    "subject": string,
    "board": string,
    "year": number,
    "season": string,
    "paperNumber": string
  },
  "questions": [
    {
      "id": "1",
      "section": "Section name",
      "type": "multiple_choice|short_text|long_text|list|numerical|table|graph_drawing",
      "marks": 4,
      "pageNumber": 5,
      "question": "Exact full question text",
      "options": ["A) ...", "B) ..."],
      "listCount": 3,
      "tableStructure": { "headers": ["..."], "initialData": [["...", null]] },
      "graphConfig": { "xLabel": "...", "yLabel": "...", "xMin": 0, "xMax": 10, "yMin": 0, "yMax": 10 },
      "context": { "type": "text", "title": "Source A", "content": "snippet", "lines": "1-5" },
      "relatedFigure": "Description",
      "figurePage": 5,
      "markingRegex": "^(correct answer|answer)$"
    }
  ]
}

Rules:
- Extract EVERY question.
- pageNumber must match the PDF page.
- markingRegex only for unambiguous 1-mark questions.
- Return ONLY JSON.
`,

  MARK_SCHEME_TEXT: `You are an expert examiner.

You will receive extracted mark scheme text with page markers.

TASK:
- Build a JSON object mapping question id -> marking details.
- For each question, include:
  - totalMarks (integer)
  - criteria (array of short bullet points describing mark-earning elements)
  - acceptableAnswers (array of short acceptable answers / key phrases)

OUTPUT JSON ONLY:
{ "markScheme": { "1": { "totalMarks": 4, "criteria": [...], "acceptableAnswers": [...] } } }

IMPORTANT:
- Do not guess question ids that do not appear.
- Prefer concise criteria points.
`,

  MARK_SCHEME_VISION: `Analyze this mark scheme PDF and extract marking criteria for each question.
Output JSON: { "markScheme": { "1": { "totalMarks": 4, "criteria": ["Point 1"], "acceptableAnswers": ["Ans 1"] } } }
Return ONLY JSON.`,

  GRADER_SYSTEM: `You are a Senior Chief Examiner.
Your job: assign precise marks using the supplied mark scheme. Be strict, never exceed the available marks.

OUTPUT JSON ONLY:
{
  "score": number,
  "max_mark": number,
  "AO_breakdown": { "AO1": string, "AO2": string, "AO3": string },
  "primary_flaw": string
}

Rules:
- score must be an integer from 0..max_mark
- Never award marks not supported by the mark scheme
- If mark scheme is vague, err on the conservative side
`,
};

// ---- NETWORK HELPERS (with retries) ----

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function postJsonWithRetries(url, body, { retries = 2, retryBaseMs = 700 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) return { ok: true, status: res.status, data };

      const msg = data?.error || `HTTP ${res.status}`;

      // Retry on common transient errors
      const retryable = res.status === 429 || (res.status >= 500 && res.status <= 599);
      if (retryable && attempt < retries) {
        const wait = retryBaseMs * Math.pow(2, attempt) + Math.floor(Math.random() * 120);
        await sleep(wait);
        continue;
      }

      return { ok: false, status: res.status, data, error: msg };
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        const wait = retryBaseMs * Math.pow(2, attempt);
        await sleep(wait);
        continue;
      }
    }
  }

  return { ok: false, status: 0, data: null, error: lastErr?.message || 'Network error' };
}

async function callOpenRouterAPI({ prompt, files = [], apiKey = null, model = null, temperature = 0.2, maxTokens = 16384, responseFormat = null }) {
  const body = {
    prompt,
    files,
    apiKey,
    model: model || DEFAULT_MODELS.vision,
    temperature,
    maxTokens,
    ...(responseFormat ? { responseFormat } : {}),
  };

  const res = await postJsonWithRetries('/api/openrouter', body, { retries: 2 });
  if (!res.ok) throw new Error(res.error || 'OpenRouter request failed');
  return res.data;
}

async function callHackClubAPI({ messages, apiKey = null, model = 'qwen/qwen3-32b', temperature = 0.2, responseFormat = null }) {
  const body = {
    messages,
    apiKey,
    model,
    temperature,
    ...(responseFormat ? { responseFormat } : {}),
  };

  const res = await postJsonWithRetries('/api/hackclub', body, { retries: 2 });
  if (!res.ok) throw new Error(res.error || 'Hack Club request failed');
  return res.data;
}

// ---- NORMALIZATION / VALIDATION ----

function coerceInt(v, { min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY } = {}) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  return Math.min(max, Math.max(min, i));
}

function normalizeQuestion(raw, fallbackId) {
  if (!raw || typeof raw !== 'object') return null;

  const id = String(raw.id ?? fallbackId ?? '').trim() || String(fallbackId ?? '');
  const question = typeof raw.question === 'string' ? raw.question.trim() : '';
  if (!id || !question) return null;

  const marks = coerceInt(raw.marks, { min: 0, max: 200 }) ?? 0;
  const pageNumber = coerceInt(raw.pageNumber, { min: 1, max: 10_000 });

  const type = typeof raw.type === 'string' ? raw.type : inferType(raw);

  const q = {
    id,
    section: typeof raw.section === 'string' ? raw.section : 'Section',
    type,
    marks,
    pageNumber: pageNumber ?? null,
    question,
  };

  if (Array.isArray(raw.options)) q.options = raw.options.map(String);
  if (Number.isFinite(Number(raw.listCount))) q.listCount = Math.max(1, Math.trunc(Number(raw.listCount)));
  if (raw.tableStructure && typeof raw.tableStructure === 'object') q.tableStructure = raw.tableStructure;
  if (raw.graphConfig && typeof raw.graphConfig === 'object') q.graphConfig = raw.graphConfig;
  if (raw.context && typeof raw.context === 'object') q.context = raw.context;
  if (typeof raw.relatedFigure === 'string') q.relatedFigure = raw.relatedFigure;
  if (Number.isFinite(Number(raw.figurePage))) q.figurePage = Math.trunc(Number(raw.figurePage));
  if (typeof raw.markingRegex === 'string') q.markingRegex = raw.markingRegex;

  return q;
}

function inferType(raw) {
  if (Array.isArray(raw.options) && raw.options.length) return 'multiple_choice';
  if (raw.tableStructure) return 'table';
  if (raw.graphConfig) return 'graph_drawing';
  if (Number(raw.listCount) > 1) return 'list';

  // Heuristic: longer marks => long_text
  const marks = Number(raw.marks);
  if (Number.isFinite(marks) && marks >= 6) return 'long_text';
  return 'short_text';
}

function normalizeExtractionResult(parsed) {
  const metadata = parsed && typeof parsed === 'object' && parsed.metadata && typeof parsed.metadata === 'object'
    ? parsed.metadata
    : {};

  const rawQs = parsed && typeof parsed === 'object' ? parsed.questions : [];
  const questions = Array.isArray(rawQs)
    ? rawQs.map((q, idx) => normalizeQuestion(q, idx + 1)).filter(Boolean)
    : [];

  // If ids are duplicated or empty, renumber sequentially
  const seen = new Set();
  const renumbered = questions.map((q, idx) => {
    const id = String(q.id || idx + 1);
    const unique = !seen.has(id);
    seen.add(unique ? id : String(idx + 1));
    return unique ? q : { ...q, id: String(idx + 1) };
  });

  return { metadata, questions: renumbered };
}

// ---- CORE SERVICE ----

export const AIService = {
  /**
   * Prefer this over calling provider APIs just to detect server keys.
   */
  checkServerKey: async () => {
    try {
      const res = await fetch('/api/config', { method: 'GET' });
      const data = await res.json();
      return Boolean(data?.hasOpenRouterKey);
    } catch {
      return false;
    }
  },

  checkHackClubServerKey: async () => {
    try {
      const res = await fetch('/api/config', { method: 'GET' });
      const data = await res.json();
      return Boolean(data?.hasHackClubKey);
    } catch {
      return false;
    }
  },

  /**
   * Extract questions from PDF files.
   *
   * Strategy:
   * 1) Extract PDF text server-side (fast, cheap).
   * 2) Ask the LLM to structure questions from the extracted text.
   * 3) If that fails (e.g. scanned PDF), fallback to vision mode.
   */
  extractQuestions: async (paperFile, insertFile, customApiKey, model) => {
    const effectiveModel = model || DEFAULT_MODELS.chat;

    // 1) Text-first extraction
    try {
      const paperText = await getPdfText(paperFile);
      const insertText = insertFile ? await getPdfText(insertFile) : null;

      const combined = [
        `PAPER TEXT:\n${paperText?.fullText || ''}`,
        insertText?.fullText ? `\n\nINSERT / SOURCE TEXT:\n${insertText.fullText}` : '',
      ].join('');

      // If the PDF is scanned, pdf.js may extract almost nothing.
      if ((paperText?.fullText || '').trim().length < 250) {
        throw new Error('Low extracted text volume; likely scanned PDF.');
      }

      const prompt = `${PROMPTS.EXTRACTION_TEXT}\n\n${combined}`;

      const { text: responseText } = await callOpenRouterAPI({
        prompt,
        files: [],
        apiKey: customApiKey,
        model: effectiveModel,
        temperature: 0.1,
        responseFormat: { type: 'json_object' },
      });

      const parsed = parseJsonWithFixes(responseText);
      if (!parsed.ok) throw new Error(`AI JSON parse failed: ${parsed.error}`);

      const normalized = normalizeExtractionResult(parsed.data);
      if (!normalized.questions.length) throw new Error('No questions extracted.');

      return { ...normalized, method: 'text' };
    } catch (textErr) {
      // Fallback to vision
      console.warn('[extractQuestions] Text-first failed, falling back to vision:', textErr);
    }

    // 2) Vision fallback (original approach)
    const paperBase64 = await fileToBase64(paperFile);
    const filesToSend = [{ mimeType: paperFile.type || 'application/pdf', data: paperBase64 }];

    if (insertFile) {
      const insertBase64 = await fileToBase64(insertFile);
      filesToSend.push({ mimeType: insertFile.type || 'application/pdf', data: insertBase64 });
    }

    try {
      const { text: responseText } = await callOpenRouterAPI({
        prompt: PROMPTS.EXTRACTION_VISION,
        files: filesToSend,
        apiKey: customApiKey,
        model: model || DEFAULT_MODELS.vision,
        temperature: 0.1,
        responseFormat: { type: 'json_object' },
      });

      const parsed = parseJsonWithFixes(responseText);
      if (!parsed.ok) throw new Error(`AI JSON parse failed: ${parsed.error}`);

      const normalized = normalizeExtractionResult(parsed.data);
      return { ...normalized, method: 'vision' };
    } catch (visionErr) {
      console.error('[extractQuestions] Vision fallback failed:', visionErr);
      throw new Error(
        'Failed to extract questions. If this is a scanned PDF (image-only), please run OCR or use a text-based PDF.'
      );
    }
  },

  /**
   * Extract insert content for student reference.
   * Prefer PDF text extraction (no LLM call) for speed + cost.
   */
  extractInsertContent: async (insertFile, customApiKey, model) => {
    try {
      const insertText = await getPdfText(insertFile);
      const text = (insertText?.fullText || '').trim();
      if (text.length >= 50) return text;
      // If extraction is too small (likely scanned), fall back to LLM.
    } catch (e) {
      // ignore and fallback
    }

    // Fallback to LLM extraction
    const insertBase64 = await fileToBase64(insertFile);
    const { text } = await callOpenRouterAPI({
      prompt: 'Extract ALL text from this insert/source PDF so a student can quote from it. Output plain text only.',
      files: [{ mimeType: insertFile.type || 'application/pdf', data: insertBase64 }],
      apiKey: customApiKey,
      model: model || DEFAULT_MODELS.vision,
      temperature: 0.1,
    });

    return text || '';
  },

  /**
   * Parse mark scheme PDF into a per-question marking object.
   */
  parseMarkScheme: async (schemeFile, customApiKey, model) => {
    const effectiveModel = model || DEFAULT_MODELS.chat;

    // Text-first
    try {
      const schemeText = await getPdfText(schemeFile);
      if ((schemeText?.fullText || '').trim().length < 250) throw new Error('Low extracted scheme text.');

      const prompt = `${PROMPTS.MARK_SCHEME_TEXT}\n\nMARK SCHEME TEXT:\n${schemeText.fullText}`;

      const { text: schemeRes } = await callOpenRouterAPI({
        prompt,
        files: [],
        apiKey: customApiKey,
        model: effectiveModel,
        temperature: 0.2,
        responseFormat: { type: 'json_object' },
      });

      const parsed = parseJsonWithFixes(schemeRes);
      if (!parsed.ok) throw new Error(`Mark scheme JSON parse failed: ${parsed.error}`);
      return parsed.data?.markScheme || {};
    } catch (textErr) {
      console.warn('[parseMarkScheme] Text-first failed, falling back to vision:', textErr);
    }

    // Vision fallback
    const schemeBase64 = await fileToBase64(schemeFile);
    const { text: schemeRes } = await callOpenRouterAPI({
      prompt: PROMPTS.MARK_SCHEME_VISION,
      files: [{ mimeType: schemeFile.type || 'application/pdf', data: schemeBase64 }],
      apiKey: customApiKey,
      model: model || DEFAULT_MODELS.vision,
      temperature: 0.2,
      responseFormat: { type: 'json_object' },
    });

    const parsed = parseJsonWithFixes(schemeRes);
    if (!parsed.ok) throw new Error(`Mark scheme JSON parse failed: ${parsed.error}`);
    return parsed.data?.markScheme || {};
  },

  /**
   * Grade a student's answer.
   *
   * Quality features:
   * - strict examiner JSON output
   * - conservative score clamping
   * - local fallback evaluation when AI fails
   * - audit metadata (models/requestIds) for debugging
   */
  markQuestion: async (question, answer, scheme, hackClubKey, customApiKey, model) => {
    const studentAnswerText = stringifyAnswer(answer);

    // Local fast-path for regex-markable 1-mark answers
    if (question?.markingRegex && (typeof answer === 'string' || typeof answer === 'number')) {
      if (checkRegex(question.markingRegex, String(answer).trim())) {
        return {
          score: question.marks,
          totalMarks: question.marks,
          text: 'Correct! (Auto-verified)',
          rewrite: `**${String(answer).trim()}**`,
          primaryFlaw: '—',
          audit: { method: 'regex' },
        };
      }
    }

    const localFallback = evaluateAnswerLocally(question, answer, scheme);

    // STEP 1: Strict examiner (Hack Club)
    const graderMessages = [
      { role: 'system', content: PROMPTS.GRADER_SYSTEM },
      {
        role: 'user',
        content: [
          `Question (${question.marks} marks): ${question.question}`,
          question.context?.content ? `Context snippet: ${question.context.content}` : null,
          question.relatedFigure ? `Figure: ${question.relatedFigure}` : null,
          `Mark scheme JSON: ${JSON.stringify(scheme || {})}`,
          `Student answer: ${studentAnswerText || '(no answer)'}`,
        ].filter(Boolean).join('\n'),
      },
    ];

    let graderModelUsed = 'moonshotai/kimi-k2-thinking';
    let grader;

    try {
      grader = await callHackClubAPI({
        messages: graderMessages,
        apiKey: hackClubKey,
        model: graderModelUsed,
        temperature: 0.2,
        responseFormat: { type: 'json_object' },
      });
    } catch (e) {
      // Fallback model
      graderModelUsed = 'qwen/qwen3-32b';
      grader = await callHackClubAPI({
        messages: graderMessages,
        apiKey: hackClubKey,
        model: graderModelUsed,
        temperature: 0.2,
      });
    }

    const graderText = grader?.content || '';
    const graderJson = parseJsonWithFixes(graderText);

    const maxMark = question.marks;
    let numericScore = 0;
    let primaryFlaw = 'Missing analysis or key mark scheme points.';
    let aoBreakdown = null;

    if (graderJson.ok && graderJson.data && typeof graderJson.data === 'object') {
      const rawScore = coerceInt(graderJson.data.score, { min: 0, max: maxMark });
      numericScore = rawScore ?? 0;
      if (typeof graderJson.data.primary_flaw === 'string') primaryFlaw = graderJson.data.primary_flaw;
      if (graderJson.data.AO_breakdown && typeof graderJson.data.AO_breakdown === 'object') {
        aoBreakdown = graderJson.data.AO_breakdown;
      }
    } else {
      // If JSON parsing failed, fall back to local estimate rather than trust prose.
      numericScore = Math.min(maxMark, localFallback.score || 0);
      primaryFlaw = 'AI output could not be parsed reliably; using local estimate.';
    }

    // STEP 2: Tutor explanation (OpenRouter)
    const tutorModelUsed = model || DEFAULT_MODELS.chat;

    const tutorPrompt = `You are an expert tutor.

STUDENT SCORE: ${numericScore}/${maxMark}
PRIMARY WEAKNESS: "${primaryFlaw}"

QUESTION: "${question.question}"
MARK SCHEME (JSON): ${JSON.stringify(scheme || {})}

STUDENT ANSWER:
${studentAnswerText || '(no answer)'}

TASK:
1) State the score.
2) Briefly explain why (tie to the mark scheme).
3) Give 2-4 bullet-point improvements.
4) Provide a short "Model Paragraph" that would score higher.

FORMAT:
- Use concise Markdown.
- Put the model paragraph under a heading "Model Paragraph".
- Bold the key improvements inside the model paragraph.
`;

    let tutor;
    try {
      tutor = await callOpenRouterAPI({
        prompt: tutorPrompt,
        files: [],
        apiKey: customApiKey,
        model: tutorModelUsed,
        temperature: 0.3,
        maxTokens: 1200,
      });
    } catch (e) {
      tutor = { text: `Score: ${numericScore}/${maxMark}. Focus on: ${primaryFlaw}` };
    }

    const tutorText = tutor?.text || '';
    const rewrite = extractModelParagraph(tutorText) || 'Model paragraph included in feedback.';

    return {
      score: numericScore,
      totalMarks: maxMark,
      text: tutorText,
      rewrite,
      primaryFlaw,
      ...(aoBreakdown ? { aoBreakdown } : {}),
      audit: {
        graderModel: graderModelUsed,
        tutorModel: tutorModelUsed,
        openRouterRequestId: tutor?.requestId,
        hackClubRequestId: grader?.requestId,
        method: 'llm',
      },
    };
  },

  getHint: async (question, scheme, hackClubKey) => {
    const messages = [
      { role: 'system', content: 'Provide a short, exam-specific hint. Do NOT give the full answer.' },
      {
        role: 'user',
        content: `Question: ${question.question}\nContext: ${question.context?.content || 'N/A'}\nMark scheme: ${JSON.stringify(scheme || {})}`,
      },
    ];

    const { content } = await callHackClubAPI({ messages, apiKey: hackClubKey });
    return content;
  },

  explainFeedback: async (question, answer, feedback, scheme, hackClubKey) => {
    const messages = [
      {
        role: 'system',
        content:
          'Explain the marking decision briefly in Markdown. Focus on what was missing relative to the mark scheme.',
      },
      {
        role: 'user',
        content: `Question: ${question.question}\nStudent answer: ${stringifyAnswer(answer)}\nFeedback: ${feedback.text}\nMark scheme: ${JSON.stringify(
          scheme || {}
        )}\nScore: ${feedback.score}/${feedback.totalMarks}`,
      },
    ];

    const { content } = await callHackClubAPI({ messages, apiKey: hackClubKey });
    return content;
  },

  followUp: async (question, answer, feedback, chatHistory, hackClubKey) => {
    const history = (chatHistory || []).map((m) => `${m.role}: ${m.text}`).join('\n');
    const messages = [
      { role: 'system', content: 'Act as a friendly tutor. Keep replies concise and practical.' },
      {
        role: 'user',
        content: `Question: ${question.question}\nStudent answer: ${stringifyAnswer(answer)}\nFeedback: ${feedback.text}\nChat so far:\n${history}`,
      },
    ];

    const { content } = await callHackClubAPI({ messages, apiKey: hackClubKey });
    return content;
  },

  generateStudyPlan: async (percentage, weaknessCounts, questionCount, hackClubKey) => {
    const weaknessSummary = Object.entries(weaknessCounts || {})
      .map(([k, v]) => `"${k}" (${v}x)`)
      .join(', ');

    const messages = [
      {
        role: 'system',
        content: 'Create a concise 3-step revision plan in Markdown that targets the repeated weaknesses listed.',
      },
      {
        role: 'user',
        content: `Student scored ${percentage}%. Repeated weaknesses: ${weaknessSummary || 'Not enough data yet.'}. Total questions: ${questionCount}.`,
      },
    ];

    const { content } = await callHackClubAPI({ messages, apiKey: hackClubKey });
    return content;
  },
};

// ---- LOCAL HELPERS ----

const normalizeText = (text) => (text || '').toString().toLowerCase().replace(/\s+/g, ' ').trim();

export const stringifyAnswer = (answer) => {
  if (answer === undefined || answer === null) return '';
  if (typeof answer === 'string' || typeof answer === 'number') return String(answer);
  if (Array.isArray(answer)) {
    if (answer.length && Array.isArray(answer[0])) return answer.map((row) => row.join(' | ')).join('\n');
    return answer.join('\n');
  }
  if (typeof answer === 'object' && answer.points) {
    return `Graph submission: points ${JSON.stringify(answer.points)} lines ${JSON.stringify(answer.lines || [])}`;
  }
  return JSON.stringify(answer);
};

const extractModelParagraph = (markdown) => {
  if (!markdown) return null;
  const match = markdown.match(/Model Paragraph[:\-]*\s*([\s\S]*)/i);
  if (!match) return null;
  const chunk = match[1].split(/\n\s*\n/)[0];
  return chunk?.trim() || null;
};

/**
 * Safe regex checker with try/catch to handle invalid AI-generated patterns
 */
export const checkRegex = (regexStr, value) => {
  try {
    const re = new RegExp(regexStr, 'i');
    return re.test(String(value).trim());
  } catch (e) {
    console.warn('Invalid Regex provided by AI:', regexStr, e);
    return false;
  }
};

/**
 * Evaluate answer locally when API is unavailable.
 *
 * This is intentionally conservative and deterministic.
 */
export const evaluateAnswerLocally = (question, answer, scheme) => {
  const totalMarks = question.marks || scheme?.totalMarks || 0;
  const answerText = stringifyAnswer(answer);
  const normalized = normalizeText(answerText);

  if (!normalized) {
    return { score: 0, totalMarks, text: 'No answer provided.', rewrite: '' };
  }

  // Regex (highest-confidence)
  if (question.markingRegex && checkRegex(question.markingRegex, normalized)) {
    return { score: totalMarks, totalMarks, text: 'Matched expected answer via regex.', rewrite: `**${answerText}**` };
  }

  const acceptable = Array.isArray(scheme?.acceptableAnswers) ? scheme.acceptableAnswers : [];
  const criteria = Array.isArray(scheme?.criteria) ? scheme.criteria : [];

  // Simple exact-ish match for short answers
  if (totalMarks <= 2 && acceptable.length) {
    const exact = acceptable.find((a) => normalizeText(a) === normalized);
    if (exact) {
      return { score: totalMarks, totalMarks, text: 'Matched an acceptable answer.', rewrite: `**${answerText}**` };
    }
  }

  // Keyword / point matching for partial credit
  const points = [...acceptable, ...criteria].filter(Boolean);
  if (!points.length) {
    return {
      score: 0,
      totalMarks,
      text: 'Mark scheme unavailable or too vague for local marking. Use AI marking for best results.',
      rewrite: answerText,
    };
  }

  const hits = [];
  for (const p of points) {
    const pn = normalizeText(p);
    if (!pn) continue;
    if (pn.length <= 3) continue;
    if (normalized.includes(pn)) hits.push(p);
  }

  const perPoint = totalMarks / Math.max(points.length, 1);
  const rawScore = hits.length * perPoint;
  const score = Math.min(totalMarks, Math.max(0, Math.round(rawScore)));

  const uniqueHits = Array.from(new Set(hits)).slice(0, 5);
  const missing = points.filter((p) => !uniqueHits.includes(p)).slice(0, 3);

  const feedbackParts = [];
  if (uniqueHits.length) feedbackParts.push(`Matched: ${uniqueHits.join('; ')}.`);
  if (missing.length) feedbackParts.push(`To improve, include: ${missing.join('; ')}.`);

  return {
    score,
    totalMarks,
    text: feedbackParts.join(' ') || 'Partial credit awarded based on keyword matches.',
    rewrite: acceptable[0] ? `Model answer idea: **${acceptable[0]}**` : answerText,
  };
};

export const buildHintFromScheme = (question, scheme) => {
  const hints = [];
  if (question.context?.content) hints.push(`Re-read the provided context: "${question.context.content.slice(0, 160)}..."`);
  if (scheme?.criteria?.length) hints.push(`Checklist: ${scheme.criteria.slice(0, 3).join('; ')}`);
  if (question.type === 'multiple_choice' && question.options?.length) hints.push('Eliminate clearly wrong options before choosing.');
  if (question.type === 'long_text') hints.push('Plan your answer with bullet points before writing full sentences.');
  if (!hints.length) hints.push('Focus on the command words and allocate your marks accordingly.');
  return hints.map((h) => `• ${h}`).join('\n');
};

export const buildExplanationFromFeedback = (question, answer, feedback, scheme) => {
  const lines = [`You scored ${feedback.score}/${feedback.totalMarks}.`, feedback.text || 'Review the expected points for this question.'];
  if (scheme?.criteria?.length) lines.push(`Key points to include next time: ${scheme.criteria.join('; ')}`);
  const answerText = stringifyAnswer(answer);
  if (answerText) lines.push(`Your answer: ${answerText}`);
  return lines.join('\n\n');
};

export const buildFollowUpReply = (userText, question, feedback) => {
  return `On "${question.question}", remember: ${feedback.text || 'focus on the required points.'} Regarding "${userText}", revisit the missing points and rewrite your answer with them included.`;
};

export const buildStudyPlan = (percentage, weaknessCounts) => {
  const sortedWeaknesses = Object.entries(weaknessCounts || {}).sort((a, b) => b[1] - a[1]);
  const topWeaknesses = sortedWeaknesses.slice(0, 3);
  const focusList = topWeaknesses.length
    ? topWeaknesses
        .map(([weak, count]) => `- ${weak} (seen ${count}x): drill 2 short paragraphs per day that fix this flaw.`)
        .join('\n')
    : '- Mixed weaknesses: keep practicing timed extracts + quick AO3 notes.';

  return `### Quick Study Plan\n\nCurrent performance: ${percentage}%.\n\nFocus areas:\n${focusList}\n\nDaily loop:\n1) 15 mins: revisit a model paragraph and annotate techniques\n2) 15 mins: write a fresh paragraph fixing the listed weakness\n3) 10 mins: self-mark against AO1/AO2/AO3 and refine`;
};

export default AIService;