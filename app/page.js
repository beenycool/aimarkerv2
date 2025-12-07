'use client';

import React, { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Brain, 
  ChevronRight, 
  ChevronLeft,
  RefreshCw, 
  BarChart2, 
  Maximize2, 
  Minimize2, 
  Image as ImageIcon,
  BookOpen,
  Sparkles,
  Lightbulb,
  GraduationCap,
  Table as TableIcon,
  Save,
  Trash2,
  PenTool,
  Eraser,
  MousePointer2,
  Type,
  SkipForward,
  LayoutGrid,
  Eye,
  ZoomIn,
  ZoomOut,
  MessageCircle,
  Send,
  Calculator,
  Key
} from 'lucide-react';

const apiKey = process.env.NEXT_PUBLIC_GEMINI_KEY || ""; // Your Gemini API key. If empty, the app will ask the user to input one.
const hackClubApiKeyDefault = process.env.NEXT_PUBLIC_HACKCLUB_KEY || ""; // Optional default for Hack Club API (marking).

// --- FILE TO BASE64 HELPER ---
async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// --- HELPER: CLEAN AI JSON ---
function cleanGeminiJSON(text) {
  if (!text) return "";
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return text.substring(firstBrace, lastBrace + 1);
  }
  return text.replace(/```json\n?|```/g, '').trim();
}

// --- HELPER: SIMPLE MARKDOWN RENDERER ---
const MarkdownText = ({ text, className = "" }) => {
  if (!text) return null;

  const sanitized = DOMPurify.sanitize(text, {
    ALLOWED_TAGS: ['strong', 'em', 'span', 'br'],
    ALLOWED_ATTR: ['class']
  });

  let html = sanitized
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\$(.*?)\$/g, "<span class='font-mono bg-slate-100 text-indigo-700 px-1 rounded text-xs'>$1</span>")
    .replace(/\\n/g, "<br/>")
    .replace(/\n/g, "<br/>");

  return (
    <div 
      className={`whitespace-pre-wrap leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: html }} 
    />
  );
};

// --- GEMINI API HELPERS ---
async function callGeminiWithFiles(prompt, files, keyToUse) {
  const effectiveKey = keyToUse || apiKey;
  if (!effectiveKey) throw new Error("API Key is missing. Please enter your Google Gemini API Key.");

  try {
    const parts = [{ text: prompt }];
    files.forEach(file => {
      parts.push({
        inlineData: {
          mimeType: file.mimeType || 'application/pdf',
          data: file.data
        }
      });
    });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${effectiveKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 16384
          }
        })
      }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API Error ${response.status}: ${errorText}`);
    }

    const text = await response.text();
    const data = JSON.parse(text);
    return data.candidates?.[0]?.content?.parts?.[0]?.text;
  } catch (error) {
    console.error("Gemini API Call Failed:", error);
    throw error;
  }
}

// Specialized extractor using Flash Lite for long PDFs (lower temperature for accuracy)
async function parsePdfWithGeminiLite(prompt, files, keyToUse) {
  const effectiveKey = keyToUse || apiKey;
  if (!effectiveKey) throw new Error("API Key is missing. Please enter your Google Gemini API Key.");

  const parts = [{ text: prompt }];
  files.forEach(file => {
    parts.push({
      inlineData: {
        mimeType: file.mimeType || 'application/pdf',
        data: file.data
      }
    });
  });

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${effectiveKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 16384
        }
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API Error ${response.status}: ${errorText}`);
  }

  const text = await response.text();
  const data = JSON.parse(text);
  return data.candidates?.[0]?.content?.parts?.[0]?.text;
}

// Simple text-only Gemini call (Tutor)
async function callGemini(prompt, keyToUse, model = "gemini-2.0-flash") {
  const effectiveKey = keyToUse || apiKey;
  if (!effectiveKey) throw new Error("API Key is missing. Please enter your Google Gemini API Key.");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${effectiveKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024
        }
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API Error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text;
}

// --- PROMPTS ---
const EXTRACTION_PROMPT = `You are an expert GCSE English Literature paper analyzer. Extract EVERY question, including those referencing extracts or figures.

For EACH question found, output JSON in this EXACT format:
{
  "questions": [
    {
      "id": "1",
      "section": "Section name",
      "type": "multiple_choice|short_text|long_text|list|numerical|table|graph_drawing",
      "marks": 4,
      "pageNumber": 5, 
      "question": "The EXACT full question text",
      "options": ["A) option", "B) option"],
      "listCount": 3,
      "tableStructure": {
        "headers": ["Header A", "Header B"],
        "initialData": [["Pre-filled Item 1", null]]
      },
      "graphConfig": {
        "xLabel": "Concentration (mol/dm3)",
        "yLabel": "Change in Mass (%)",
        "xMin": 0, "xMax": 10,
        "yMin": -5, "yMax": 10
      },
      "context": {
        "type": "text",
        "title": "Source A",
        "content": "Source text...",
        "lines": "1-5"
      },
      "relatedFigure": "Description of image",
      "figurePage": 5,
      "markingRegex": "^(correct answer|answer)$" 
    }
  ]
}

CRITICAL RULES:
1. Extract EVERY question (including sub-questions for poetry/novel extracts).
2. **pageNumber**: The PDF page number where this question appears.
3. **context**: When an extract is referenced, capture a short snippet + line numbers so students can quote evidence.
4. **markingRegex**: If a 1-mark question has a definitive simple answer, provide a Javascript-compatible Regex.
5. Return ONLY the JSON object. Do NOT use markdown formatting blocks.`;

const MARK_SCHEME_PROMPT = `Analyze this mark scheme PDF and extract marking criteria for each question.
Output JSON: { "markScheme": { "1": { "totalMarks": 4, "criteria": ["Point 1"], "acceptableAnswers": ["Ans 1"] } } }
Return ONLY JSON.`;

const GRADER_SYSTEM_PROMPT = `You are a Senior Chief Examiner for GCSE English Literature.
Your job: assign precise marks using the supplied mark scheme. Be strict, never exceed the available marks.

PHASE 1: GENRE & CALIBRATION
- Novels/Plays: expect sustained argument tied to the extract and whole text.
- Poetry: reward concise, dense analysis over length.

PHASE 2: GATEKEEPER CHECKS
- If AO3 context is missing for set texts/anthology -> CAP at Level 4.
- If the answer mostly retells plot -> CAP at Level 2.

OUTPUT JSON ONLY:
{"score": number, "max_mark": number, "AO_breakdown": {"AO1": string, "AO2": string, "AO3": string}, "primary_flaw": "short title of main weakness"}`;

// --- HACK CLUB CHAT COMPLETIONS ---
async function callHackClub(messages, keyToUse, modelOverride) {
  const effectiveKey = keyToUse || hackClubApiKeyDefault;
  if (!effectiveKey) throw new Error("Hack Club API Key is missing. Please enter your key to enable marking.");
  const model = modelOverride || "qwen/qwen3-32b";

  try {
    const response = await fetch(process.env.NEXT_PUBLIC_HACKCLUB_API_URL || "https://ai.hackclub.com/proxy/v1/chat/completions", {
      method: "POST",
      headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${effectiveKey}`
        },
        body: JSON.stringify({
        model,
        messages,
        temperature: 0.2
        })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Hack Club API Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (error) {
    console.error("Hack Club API Call Failed:", error);
    throw error;
  }
}

// --- LOCAL HELPERS FOR NON-GEMINI FLOWS ---
const normalizeText = (text) => (text || '').toString().toLowerCase().replace(/\s+/g, ' ').trim();

const stringifyAnswer = (answer) => {
  if (answer === undefined || answer === null) return '';
  if (typeof answer === 'string' || typeof answer === 'number') return String(answer);
  if (Array.isArray(answer)) {
    if (answer.length && Array.isArray(answer[0])) return answer.map(row => row.join(' | ')).join('\n');
    return answer.join('\n');
  }
  if (typeof answer === 'object' && answer.points) {
    return `Graph submission: points ${JSON.stringify(answer.points)} lines ${JSON.stringify(answer.lines || [])}`;
  }
  return JSON.stringify(answer);
};

const evaluateAnswerLocally = (question, answer, scheme) => {
  const totalMarks = question.marks || scheme?.totalMarks || 0;
  const answerText = stringifyAnswer(answer);
  const normalized = normalizeText(answerText);

  if (!normalized) {
    return { score: 0, totalMarks, text: "No answer provided.", rewrite: "" };
  }

  if (question.markingRegex) {
    try {
      const re = new RegExp(question.markingRegex, 'i');
      if (re.test(normalized)) {
        return { score: totalMarks, totalMarks, text: "Matched expected answer via regex.", rewrite: `**${answerText}**` };
      }
    } catch (e) {}
  }

  if (scheme) {
    const acceptable = scheme.acceptableAnswers || [];
    const criteria = scheme.criteria || [];
    const matches = [];
    let score = 0;

    acceptable.forEach(ans => {
      if (normalized.includes(normalizeText(ans))) {
        matches.push(ans);
        score += 1;
      }
    });

    criteria.forEach(crit => {
      if (normalized.includes(normalizeText(crit))) {
        matches.push(crit);
        score += 0.5;
      }
    });

    const cappedScore = Math.min(totalMarks, Math.max(0, Math.round(score)));
    const uniqueMatches = Array.from(new Set(matches)).slice(0, 5);
    const feedbackParts = [];

    if (uniqueMatches.length) feedbackParts.push(`Matched mark scheme points: ${uniqueMatches.join('; ')}.`);
    if (criteria.length && !uniqueMatches.length) feedbackParts.push("Include the key points from the mark scheme to gain marks.");
    if (acceptable.length && cappedScore < totalMarks) feedbackParts.push("Try to mirror the sample answers more closely.");

    return {
      score: cappedScore,
      totalMarks,
      text: feedbackParts.join(' ') || "Partial credit awarded based on keyword matches.",
      rewrite: acceptable[0] ? `Model answer idea: **${acceptable[0]}**` : answerText
    };
  }

  return {
    score: 0,
    totalMarks,
    text: "Mark scheme unavailable. Compare your answer against the question requirements.",
    rewrite: answerText
  };
};

const buildHintFromScheme = (question, scheme) => {
  const hints = [];
  if (question.context?.content) hints.push(`Re-read the provided context: "${question.context.content.slice(0, 160)}..."`);
  if (scheme?.criteria?.length) hints.push(`Checklist: ${scheme.criteria.slice(0, 3).join('; ')}`);
  if (question.type === 'multiple_choice' && question.options?.length) hints.push("Eliminate clearly wrong options before choosing.");
  if (question.type === 'long_text') hints.push("Plan your answer with bullet points before writing full sentences.");
  if (!hints.length) hints.push("Focus on the command words and allocate your marks accordingly.");
  return hints.map(h => `• ${h}`).join('\n');
};

const buildExplanationFromFeedback = (question, answer, feedback, scheme) => {
  const lines = [
    `You scored ${feedback.score}/${feedback.totalMarks}.`,
    feedback.text || "Review the expected points for this question."
  ];
  if (scheme?.criteria?.length) lines.push(`Key points to include next time: ${scheme.criteria.join('; ')}`);
  const answerText = stringifyAnswer(answer);
  if (answerText) lines.push(`Your answer: ${answerText}`);
  return lines.join('\n\n');
};

const buildFollowUpReply = (userText, question, feedback) => {
  return `On "${question.question}", remember: ${feedback.text || 'focus on the required points.'} Regarding "${userText}", revisit the missing points and rewrite your answer with them included.`;
};

const extractModelParagraph = (markdown) => {
  if (!markdown) return null;
  const match = markdown.match(/Model Paragraph[:\\-]*\\s*([\\s\\S]*)/i);
  if (!match) return null;
  const chunk = match[1].split(/\n\s*\n/)[0];
  return chunk?.trim() || null;
};

const buildStudyPlan = (percentage, weaknessCounts) => {
  const sortedWeaknesses = Object.entries(weaknessCounts || {}).sort((a, b) => b[1] - a[1]);
  const topWeaknesses = sortedWeaknesses.slice(0, 3);
  const focusList = topWeaknesses.length
    ? topWeaknesses.map(([weak, count]) => `- ${weak} (seen ${count}x): drill 2 short paragraphs per day that fix this flaw.`).join('\n')
    : '- Mixed weaknesses: keep practicing timed extracts + quick AO3 notes.';

  return `### Quick Study Plan\n\nCurrent performance: ${percentage}%.\n\nFocus areas:\n${focusList}\n\nDaily loop:\n1) 15 mins: revisit a model paragraph and annotate techniques\n2) 15 mins: write a fresh paragraph fixing the listed weakness\n3) 10 mins: self-mark against AO1/AO2/AO3 and refine`;
};

// --- MATH KEYBOARD COMPONENT ---
const MathKeyboard = ({ onInsert, isOpen, toggleOpen }) => {
  const symbols = [
    '²','³','½','¼','√','∞',
    '×','÷','±','≈','≠','≡',
    '≤','≥','°','℃','℉',
    'µ','π','Ω','λ','Δ','Σ',
    '→','←','↔','↑','↓'
  ];

  if (!isOpen) {
    return (
      <button 
        onClick={toggleOpen}
        className="mt-2 text-xs font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition-colors"
      >
        <Calculator className="w-3 h-3" /> Show Math Keyboard
      </button>
    );
  }

  return (
    <div className="mt-2 animate-in slide-in-from-top-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-bold text-slate-400 uppercase">Scientific Symbols</span>
        <button onClick={toggleOpen} className="text-xs text-slate-400 hover:text-red-500">Close</button>
      </div>
      <div className="grid grid-cols-8 sm:grid-cols-10 gap-1 bg-slate-100 p-2 rounded-lg border border-slate-200">
        {symbols.map(s => (
          <button 
            key={s} 
            onClick={() => onInsert(s)}
            className="h-8 bg-white rounded shadow-sm border border-slate-200 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 font-mono font-bold text-slate-700 transition-all active:scale-95"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
};

// --- GRAPH COMPONENT ---
const GraphCanvas = ({ config, value, onChange }) => {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState('point'); 
  const [isDragging, setIsDragging] = useState(false);
  const [startPoint, setStartPoint] = useState(null);

  const state = value || { points: [], lines: [] };
  const rawXMin = config?.xMin ?? 0;
  const rawXMax = config?.xMax ?? 10;
  const rawYMin = config?.yMin ?? 0;
  const rawYMax = config?.yMax ?? 10;
  const xMin = rawXMin;
  const xMax = rawXMax > rawXMin ? rawXMax : rawXMin + 1;
  const yMin = rawYMin;
  const yMax = rawYMax > rawYMin ? rawYMax : rawYMin + 1;
  const xLabel = config?.xLabel ?? "X Axis";
  const yLabel = config?.yLabel ?? "Y Axis";

  const width = 600;
  const height = 400;
  const padding = 50;

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const graphWidth = width - 2 * padding;
    const graphHeight = height - 2 * padding;
    
    const toCanvasX = (val) => padding + ((val - xMin) / (xMax - xMin)) * graphWidth;
    const toCanvasY = (val) => height - padding - ((val - yMin) / (yMax - yMin)) * graphHeight;

    // Grid
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = xMin; i <= xMax; i += (xMax-xMin)/10) {
      const x = toCanvasX(i);
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
    }
    for (let i = yMin; i <= yMax; i += (yMax-yMin)/10) {
      const y = toCanvasY(i);
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
    }
    ctx.stroke();

    // Axes
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#000';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(xLabel, width / 2, height - 10);
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();

    // User Lines
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2;
    state.lines.forEach(line => {
      ctx.beginPath();
      ctx.moveTo(line.x1, line.y1);
      ctx.lineTo(line.x2, line.y2);
      ctx.stroke();
    });

    // User Points
    ctx.strokeStyle = '#ef4444'; 
    ctx.lineWidth = 2;
    state.points.forEach(p => {
        const cx = toCanvasX(p.x);
        const cy = toCanvasY(p.y);
        const size = 4;
        ctx.beginPath();
        ctx.moveTo(cx - size, cy - size);
        ctx.lineTo(cx + size, cy + size);
        ctx.moveTo(cx + size, cy - size);
        ctx.lineTo(cx - size, cy + size);
        ctx.stroke();
    });
  };

  useEffect(() => { draw(); }, [state, config]);

  const getGraphCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const graphWidth = width - 2 * padding;
    const graphHeight = height - 2 * padding;
    const rawX = ((cx - padding) / graphWidth) * (xMax - xMin) + xMin;
    const rawY = ((height - padding - cy) / graphHeight) * (yMax - yMin) + yMin;
    return { x: rawX, y: rawY, cx, cy };
  };

  const handleMouseDown = (e) => {
    const coords = getGraphCoordinates(e);
    if (coords.cx < padding || coords.cx > width - padding || coords.cy < padding || coords.cy > height - padding) return;
    if (tool === 'point') {
        const newPoints = [...state.points, { x: coords.x, y: coords.y }];
        onChange({ ...state, points: newPoints });
    } else if (tool === 'line') {
        setIsDragging(true);
        setStartPoint({ cx: coords.cx, cy: coords.cy });
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging || tool !== 'line') return;
    const coords = getGraphCoordinates(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    draw(); 
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startPoint.cx, startPoint.cy);
    ctx.lineTo(coords.cx, coords.cy);
    ctx.stroke();
  };

  const handleMouseUp = (e) => {
    if (isDragging && tool === 'line') {
        const coords = getGraphCoordinates(e);
        const newLines = [...state.lines, { x1: startPoint.cx, y1: startPoint.cy, x2: coords.cx, y2: coords.cy }];
        onChange({ ...state, lines: newLines });
    }
    setIsDragging(false);
    setStartPoint(null);
    draw(); 
  };

  const clearCanvas = () => { onChange({ points: [], lines: [] }); };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
        <button onClick={() => setTool('point')} className={`p-2 rounded ${tool === 'point' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-200 text-slate-600'}`}>
          <div className="flex items-center gap-1 text-xs font-bold"><span className="text-lg">×</span> Point</div>
        </button>
        <button onClick={() => setTool('line')} className={`p-2 rounded ${tool === 'line' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-200 text-slate-600'}`}>
          <div className="flex items-center gap-1 text-xs font-bold"><PenTool className="w-4 h-4"/> Line</div>
        </button>
        <div className="h-6 w-px bg-slate-300 mx-2"></div>
        <button onClick={clearCanvas} className="p-2 rounded hover:bg-red-100 text-red-600"><Trash2 className="w-4 h-4"/></button>
      </div>
      <div className="border border-slate-300 rounded-lg overflow-hidden shadow-inner bg-white self-start">
        <canvas ref={canvasRef} width={width} height={height} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={() => setIsDragging(false)} className="cursor-crosshair block"/>
      </div>
    </div>
  );
};

// --- FILE UPLOAD ---
const FileUploadZone = ({ label, onUpload, file }) => (
  <div className="flex flex-col items-center justify-center w-full mb-4">
    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-slate-50 border-slate-300 transition-colors group">
      <div className="flex flex-col items-center justify-center pt-5 pb-6">
        {file ? (
          <>
            <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
            <p className="text-sm text-slate-700 font-medium">{file.name}</p>
          </>
        ) : (
          <>
            <Upload className="w-8 h-8 text-slate-400 mb-2 group-hover:text-indigo-500 transition-colors" />
            <p className="text-sm text-slate-500"><span className="font-semibold">Click to upload</span> {label}</p>
            <p className="text-xs text-slate-400">PDF only</p>
          </>
        )}
      </div>
      <input type="file" className="hidden" accept=".pdf" onChange={(e) => onUpload(e.target.files[0])} />
    </label>
  </div>
);

// --- INPUTS ---
const AdaptiveInput = ({ type, options, listCount, tableStructure, graphConfig, value, onChange }) => {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  const handleSymbolInsert = (symbol) => {
    const newValue = (value || "") + symbol;
    onChange(newValue);
  };

  if (type === 'multiple_choice') {
    return (
      <div className="space-y-2">
        {options.map((opt, idx) => (
          <label key={idx} className={`flex items-center p-3 rounded-lg border cursor-pointer hover:bg-blue-50 transition-all ${value === opt ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-200'}`}>
            <input type="radio" name="mcq" className="w-4 h-4 text-blue-600 focus:ring-blue-500" checked={value === opt} onChange={() => onChange(opt)} />
            <span className="ml-3 text-slate-700 font-medium">{opt}</span>
          </label>
        ))}
      </div>
    );
  }

  if (type === 'list') {
    const listValues = Array.isArray(value) ? value : Array(listCount).fill('');
    const handleListChange = (idx, text) => {
      const newList = [...listValues];
      newList[idx] = text;
      onChange(newList);
    };
    return (
      <div className="space-y-3">
        {Array.from({ length: listCount }).map((_, idx) => (
          <div key={idx} className="flex items-center">
            <span className="text-slate-400 font-bold mr-3 w-6 text-right">{idx + 1})</span>
            <input type="text" className="flex-1 p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" value={listValues[idx] || ''} onChange={(e) => handleListChange(idx, e.target.value)} placeholder={`Point ${idx + 1}`} />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'table') {
    const headers = tableStructure?.headers || ['Column 1', 'Column 2'];
    const initialData = tableStructure?.initialData || [];
    const rowCount = initialData.length > 0 ? initialData.length : (tableStructure?.rows || 3);
    const currentData = Array.isArray(value) ? value : (initialData.length > 0 ? initialData.map(row => row.map(cell => cell === null ? '' : cell)) : Array(rowCount).fill().map(() => Array(headers.length).fill('')));
    const handleCellChange = (rowIndex, colIndex, val) => {
      const newData = currentData.map(r => [...r]);
      newData[rowIndex][colIndex] = val;
      onChange(newData);
    };
    return (
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
          <TableIcon className="w-4 h-4" /> Table Input
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50/50">
              <tr>{headers.map((h, i) => (<th key={i} className="px-6 py-3 border-b border-slate-200 min-w-[150px]">{h}</th>))}</tr>
            </thead>
            <tbody>
              {currentData.map((row, rIndex) => (
                <tr key={rIndex} className="bg-white border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                  {row.map((cell, cIndex) => {
                    const isPrefilled = initialData.length > 0 && initialData[rIndex] && initialData[rIndex][cIndex] !== null;
                    return (
                      <td key={cIndex} className="p-0 border-r border-slate-100 last:border-0 relative">
                        {isPrefilled ? (
                          <div className="w-full h-full px-6 py-4 bg-slate-50 text-slate-500 font-medium select-none">{initialData[rIndex][cIndex]}</div>
                        ) : (
                          <input type="text" className="w-full h-full px-6 py-4 bg-transparent outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 text-slate-700 placeholder-slate-300" value={cell} onChange={(e) => handleCellChange(rIndex, cIndex, e.target.value)} placeholder="Type..." />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (type === 'graph_drawing') {
      return (
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="mb-2 flex items-center gap-2 text-indigo-700 font-bold text-sm"><BarChart2 className="w-4 h-4" /> Interactive Graph Paper</div>
              <GraphCanvas config={graphConfig} value={value} onChange={onChange} />
          </div>
      )
  }

  // --- TEXT INPUTS WITH MATH KEYBOARD ---
  if (type === 'long_text') {
    return (
      <div className="relative">
         <div className="absolute top-2 right-2 bg-slate-100 text-xs px-2 py-1 rounded text-slate-500 font-mono">LaTeX Supported</div>
        <textarea 
          className="w-full h-48 p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none font-serif leading-relaxed" 
          placeholder="Type your answer here..." 
          value={value || ''} 
          onChange={(e) => onChange(e.target.value)} 
        />
        <MathKeyboard onInsert={handleSymbolInsert} isOpen={isKeyboardOpen} toggleOpen={() => setIsKeyboardOpen(!isKeyboardOpen)} />
      </div>
    );
  }

  return (
    <div>
        <input 
            type="text" 
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
            placeholder="Type your answer here..." 
            value={value || ''} 
            onChange={(e) => onChange(e.target.value)} 
        />
        <MathKeyboard onInsert={handleSymbolInsert} isOpen={isKeyboardOpen} toggleOpen={() => setIsKeyboardOpen(!isKeyboardOpen)} />
    </div>
  );
};

// --- FEEDBACK & FOLLOW-UP COMPONENT ---
const FeedbackBlock = ({ feedback, onNext, explanation, onExplain, explaining, questionId, onFollowUp, followUpChat, sendingFollowUp }) => {
  const [followUpText, setFollowUpText] = useState("");

  if (!feedback) return null;

  const handleSend = () => {
      if (!followUpText.trim()) return;
      onFollowUp(followUpText);
      setFollowUpText("");
  };

  return (
    <div className="mt-6 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-indigo-600 p-4 flex justify-between items-center text-white">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5" />
          <h3 className="font-bold">Marking Analysis</h3>
        </div>
        <div className="font-mono bg-indigo-800 px-3 py-1 rounded-full text-sm">
          Score: {feedback.score}/{feedback.totalMarks}
        </div>
      </div>
      
      <div className="p-5 space-y-4">
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Feedback</h4>
          <div className="text-slate-700 text-sm">
             <MarkdownText text={feedback.text} />
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Improved Answer (Changes in Bold)</h4>
          <div className="text-slate-800 font-serif text-sm">
             <MarkdownText text={feedback.rewrite} />
          </div>
        </div>

        {!explanation && (
          <button onClick={onExplain} disabled={explaining} className="w-full py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-indigo-100 transition-colors">
             {explaining ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4" />}
             {explaining ? "Preparing explanation..." : "Explain Why"}
          </button>
        )}

        {explanation && (
          <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg animate-in fade-in">
            <h4 className="flex items-center gap-2 text-indigo-800 font-bold text-sm mb-2"><Sparkles className="w-4 h-4" /> Explanation</h4>
            <div className="text-indigo-900 text-sm leading-relaxed">
                <MarkdownText text={explanation} />
            </div>
          </div>
        )}

        <div className="border-t border-slate-100 pt-4 mt-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Ask a Follow-up Question</h4>
            {followUpChat && followUpChat.length > 0 && (
                <div className="space-y-3 mb-3 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-lg">
                    {followUpChat.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-2 rounded-lg text-sm ${msg.role === 'user' ? 'bg-indigo-100 text-indigo-800' : 'bg-white border border-slate-200 text-slate-700'}`}>
                                <MarkdownText text={msg.text} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <div className="flex gap-2">
                <input type="text" value={followUpText} onChange={(e) => setFollowUpText(e.target.value)} placeholder="e.g., Why was my answer wrong?" className="flex-1 text-sm border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" onKeyDown={(e) => e.key === 'Enter' && handleSend()} />
                <button onClick={handleSend} disabled={sendingFollowUp || !followUpText.trim()} className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                    {sendingFollowUp ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4" />}
                </button>
            </div>
        </div>

        <button onClick={onNext} className="w-full mt-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors">
          Next Question <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// --- MAIN APP ---
export default function GCSEMarkerApp() {
  const [phase, setPhase] = useState('upload'); 
  const [files, setFiles] = useState({ paper: null, scheme: null, insert: null });
  
  const [activePdfTab, setActivePdfTab] = useState('paper');
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pdfScale, setPdfScale] = useState(1.5); // Increase initial scale for better quality
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null); 

  const [error, setError] = useState(null);
  const [insertContent, setInsertContent] = useState(null);
  const [parsedMarkScheme, setParsedMarkScheme] = useState({});
  const [activeQuestions, setActiveQuestions] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [feedbacks, setFeedbacks] = useState({});
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [parsingStatus, setParsingStatus] = useState('');

  const [hintData, setHintData] = useState({ loading: false, text: null });
  const [explanationData, setExplanationData] = useState({ loading: false, text: null });
  const [studyPlan, setStudyPlan] = useState({ loading: false, content: null });
  const [skippedQuestions, setSkippedQuestions] = useState(new Set());
  const [followUpChats, setFollowUpChats] = useState({});
  const [sendingFollowUp, setSendingFollowUp] = useState(false);
  const [quoteDrafts, setQuoteDrafts] = useState({});
  const [customApiKey, setCustomApiKey] = useState("");
  const [hackClubApiKey, setHackClubApiKey] = useState(hackClubApiKeyDefault);
  const [hasSavedSession, setHasSavedSession] = useState(false);
  const restoredSessionRef = useRef(false);

  const updateApiKey = (k) => {
    setCustomApiKey(k);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('gemini_api_key', k);
    }
  };
  const updateHackClubKey = (k) => {
    setHackClubApiKey(k);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('hackclub_api_key', k);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedKey = window.localStorage.getItem('gemini_api_key');
    if (storedKey) setCustomApiKey(storedKey);
    const storedHackKey = window.localStorage.getItem('hackclub_api_key');
    if (storedHackKey) setHackClubApiKey(storedHackKey);

    const savedData = window.localStorage.getItem('gcse_marker_state');
    if (savedData) {
      setHasSavedSession(true);
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.activeQuestions && parsed.activeQuestions.length > 0 && !restoredSessionRef.current) {
          setActiveQuestions(parsed.activeQuestions);
          setUserAnswers(parsed.userAnswers || {});
          setFeedbacks(parsed.feedbacks || {});
          setInsertContent(parsed.insertContent);
          setCurrentQIndex(parsed.currentQIndex || 0);
          if (parsed.skippedQuestions) setSkippedQuestions(new Set(parsed.skippedQuestions));
          if (parsed.followUpChats) setFollowUpChats(parsed.followUpChats);
          restoredSessionRef.current = true;
          setPhase('exam');
        }
      } catch (err) {
        console.error('Failed to restore saved session', err);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.pdfjsLib) return;
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    };
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
      if (typeof window === 'undefined') return;
      const loadDoc = async () => {
          const file = activePdfTab === 'paper' ? files.paper : files.insert;
          if (!file || !window.pdfjsLib) return;
          try {
            const arrayBuffer = await file.arrayBuffer();
            const doc = await window.pdfjsLib.getDocument(arrayBuffer).promise;
            setPdfDoc(doc);
            setPdfPage(1); 
          } catch (e) {
            console.error("Failed to load PDF", e);
          }
      };
      loadDoc();
  }, [files.paper, files.insert, activePdfTab]);

  useEffect(() => {
      if (typeof window === 'undefined') return;
      const render = async () => {
          if (!pdfDoc || !canvasRef.current) return;
          
          if (renderTaskRef.current) {
              await renderTaskRef.current.cancel();
          }

          try {
            const page = await pdfDoc.getPage(pdfPage);
            
            const outputScale = window.devicePixelRatio || 1;
            const viewport = page.getViewport({ scale: pdfScale });
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            
            canvas.width = Math.floor(viewport.width * outputScale);
            canvas.height = Math.floor(viewport.height * outputScale);
            
            canvas.style.width = `${Math.floor(viewport.width)}px`;
            canvas.style.height = `${Math.floor(viewport.height)}px`;
            
            const transform = outputScale !== 1 
              ? [outputScale, 0, 0, outputScale, 0, 0] 
              : null;

            const renderContext = {
              canvasContext: context,
              transform: transform,
              viewport: viewport
            };
            
            const renderTask = page.render(renderContext);
            renderTaskRef.current = renderTask; 
            
            await renderTask.promise;
          } catch (e) {
            if (e.name !== 'RenderingCancelledException') {
                console.error("Failed to render page", e);
            }
          }
      };
      render();
  }, [pdfDoc, pdfPage, pdfScale]);

  useEffect(() => {
    if (phase === 'exam' && activeQuestions.length > 0 && typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('gcse_marker_state', JSON.stringify({
          activeQuestions,
          userAnswers,
          feedbacks,
          insertContent,
          currentQIndex,
          skippedQuestions: Array.from(skippedQuestions),
          followUpChats,
          timestamp: Date.now()
        }));
        setHasSavedSession(true);
      } catch (err) {
        console.error('Failed to persist session', err);
      }
    }
  }, [activeQuestions, userAnswers, feedbacks, insertContent, currentQIndex, phase, skippedQuestions, followUpChats]);

  const clearSaveData = () => { 
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem('gcse_marker_state'); 
    setHasSavedSession(false);
    window.location.reload(); 
  };

  const resumeSavedSession = () => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem('gcse_marker_state');
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      if (parsed.activeQuestions && parsed.activeQuestions.length > 0) {
        setActiveQuestions(parsed.activeQuestions);
        setUserAnswers(parsed.userAnswers || {});
        setFeedbacks(parsed.feedbacks || {});
        setInsertContent(parsed.insertContent);
        setCurrentQIndex(parsed.currentQIndex || 0);
        if (parsed.skippedQuestions) setSkippedQuestions(new Set(parsed.skippedQuestions));
        if (parsed.followUpChats) setFollowUpChats(parsed.followUpChats);
        setHasSavedSession(true);
        setPhase('exam');
      }
    } catch (err) {
      console.error('Failed to resume saved session', err);
    }
  };
  const jumpToPdfPage = (pageNumber, type = 'paper') => { setActivePdfTab(type); setPdfPage(pageNumber); };
  const advanceToQuestionPage = (index) => { if (index < activeQuestions.length && activeQuestions[index].pageNumber) { setActivePdfTab('paper'); setPdfPage(activeQuestions[index].pageNumber); } };

  const handleStartParsing = async () => {
    if (!files.paper) return;
    setPhase('parsing');
    setError(null);
    setActiveQuestions([]);
    try {
      setParsingStatus('Reading PDF file...');
      const paperBase64 = await fileToBase64(files.paper);
      let insertBase64 = null;
      if (files.insert) {
        setParsingStatus('Reading insert/source material...');
        insertBase64 = await fileToBase64(files.insert);
      }
      setParsingStatus('AI analyzing exam paper...');
      let extractionPrompt = EXTRACTION_PROMPT;
      const filesToSend = [{ mimeType: files.paper.type || 'application/pdf', data: paperBase64 }];
      if (insertBase64) {
        extractionPrompt += "\n\nNOTE: An insert/source booklet is also provided as the second file.";
        filesToSend.push({ mimeType: files.insert.type || 'application/pdf', data: insertBase64 });
      }
      const responseText = await parsePdfWithGeminiLite(extractionPrompt, filesToSend, customApiKey);
      if (!responseText) throw new Error('No response from AI.');
      const cleanedJson = cleanGeminiJSON(responseText);
      setParsingStatus('Processing extracted questions...');
      let questions = [];
      try { const parsed = JSON.parse(cleanedJson); questions = parsed.questions || []; } catch (e) { 
        console.error('Parse error:', e);
        throw new Error('Failed to parse AI response.'); 
      }
      if (questions.length === 0) throw new Error('No questions were extracted.');
      if (insertBase64) {
        try { const insertRes = await parsePdfWithGeminiLite("Extract ALL text from this insert/source PDF so a student can quote from it. Output plain text only.", [{ mimeType: files.insert.type || 'application/pdf', data: insertBase64 }], customApiKey); setInsertContent(insertRes); } catch (e) {}
      }
      if (files.scheme) {
        try { 
            const schemeBase64 = await fileToBase64(files.scheme);
            const schemeRes = await callGeminiWithFiles(MARK_SCHEME_PROMPT, [{ mimeType: files.scheme.type || 'application/pdf', data: schemeBase64 }], customApiKey);
            const cleanedScheme = cleanGeminiJSON(schemeRes);
            const parsed = JSON.parse(cleanedScheme);
            setParsedMarkScheme(parsed.markScheme || {});
        } catch (e) {}
      }
      setParsingStatus('Loading questions...');
      for (let i = 0; i < questions.length; i++) { await new Promise(r => setTimeout(r, 100)); setActiveQuestions(prev => [...prev, questions[i]]); }
      setParsingStatus('Ready!');
      await new Promise(r => setTimeout(r, 500));
      setPhase('exam');
      if (questions[0]?.pageNumber) setPdfPage(questions[0].pageNumber);
    } catch (err) { setError(err.message); setPhase('upload'); }
  };

  const handleSkip = () => {
    const q = activeQuestions[currentQIndex];
    setSkippedQuestions(prev => { const newSet = new Set(prev); newSet.add(q.id); return newSet; });
    const nextIdx = currentQIndex < activeQuestions.length - 1 ? currentQIndex + 1 : -1;
    if (nextIdx !== -1) { setCurrentQIndex(nextIdx); advanceToQuestionPage(nextIdx); } else { setPhase('summary'); }
  };

  const updateQuoteDraft = (questionId, text) => {
    setQuoteDrafts(prev => ({ ...prev, [questionId]: text }));
  };

  const insertQuoteIntoAnswer = (questionId) => {
    const quote = (quoteDrafts[questionId] || '').trim();
    if (!quote) return;
    const existing = userAnswers[questionId] || '';
    const newAnswer = existing ? `${existing}\n\n"${quote}"` : `"${quote}"`;
    setUserAnswers(prev => ({ ...prev, [questionId]: newAnswer }));
    setQuoteDrafts(prev => ({ ...prev, [questionId]: "" }));
  };

  const handleSubmitAnswer = async () => {
    const q = activeQuestions[currentQIndex];
    const answer = userAnswers[q.id];
    let hasContent = false;
    if (q.type === 'graph_drawing') hasContent = answer && (answer.points.length > 0 || answer.lines.length > 0);
    else hasContent = Array.isArray(answer) ? answer.flat().some(cell => cell && String(cell).trim() !== '') : (answer !== undefined && answer !== null && String(answer).trim() !== '');
    if (!hasContent) return;

    if (skippedQuestions.has(q.id)) { setSkippedQuestions(prev => { const newSet = new Set(prev); newSet.delete(q.id); return newSet; }); }

    // Regex Check
    if (q.markingRegex && (typeof answer === 'string' || typeof answer === 'number')) {
        try {
            const re = new RegExp(q.markingRegex, 'i');
            if (re.test(String(answer).trim())) {
                setFeedbacks(prev => ({ ...prev, [q.id]: { score: q.marks, totalMarks: q.marks, text: "Correct! (Auto-verified)", rewrite: `**${answer}**` } }));
                return;
            }
        } catch (e) {}
    }

    setLoadingFeedback(true);
    setExplanationData({ loading: false, text: null });

    try {
      const scheme = parsedMarkScheme[q.id];
      const keyToUse = hackClubApiKey || hackClubApiKeyDefault;
      if (!keyToUse) throw new Error("Hack Club API key missing for marking.");

      const studentAnswerText = stringifyAnswer(answer);

      // STEP 1: strict grader (Kimi/Qwen)
      const graderMessages = [
        { role: "system", content: GRADER_SYSTEM_PROMPT },
        { role: "user", content: `Question (${q.marks} marks): ${q.question}\nScheme: ${JSON.stringify(scheme)}\nStudent: ${studentAnswerText}` }
      ];

      let graderResponseText = "";
      try {
        graderResponseText = await callHackClub(graderMessages, keyToUse, "moonshotai/kimi-k2-thinking");
      } catch (primaryErr) {
        graderResponseText = await callHackClub(graderMessages, keyToUse); // fallback to default model
      }

      const cleanedGrader = cleanGeminiJSON(graderResponseText);
      const localEval = evaluateAnswerLocally(q, answer, scheme);
      let parsedGrader = {};
      try { parsedGrader = JSON.parse(cleanedGrader); } catch (e) {}

      const numericScore = Math.min(q.marks, Number(parsedGrader.score ?? localEval.score ?? 0));
      const primaryFlaw = parsedGrader.primary_flaw ?? parsedGrader.primaryFlaw ?? "Missing analysis or contextual insight.";

      // STEP 2: tutor (Gemini)
      const tutorPrompt = `You are an expert English Literature tutor.\n\nSTUDENT SCORE: ${numericScore}/${q.marks}\nEXAMINER'S CRITICISM: "${primaryFlaw}"\nQUESTION: "${q.question}"\nSTUDENT ANSWER: "${studentAnswerText}"\n\nTASK:\n1) Tell the student their score.\n2) Explain why they got this score (cite the criticism).\n3) Write a short Model Paragraph that fixes the flaw.\n4) Keep it concise, encouraging, Markdown formatted.`;

      let tutorText = "";
      try {
        tutorText = await callGemini(tutorPrompt, customApiKey);
      } catch (tutorErr) {
        tutorText = `${localEval.text}\n\n(Model paragraph unavailable. Focus on: ${primaryFlaw})`;
      }

      const rewrite = extractModelParagraph(tutorText) || localEval.rewrite || "Model paragraph included in feedback.";

      setFeedbacks(prev => ({ 
        ...prev, 
        [q.id]: { 
          score: numericScore, 
          totalMarks: q.marks, 
          text: tutorText, 
          rewrite, 
          primaryFlaw 
        } 
      }));
    } catch (err) {
      const scheme = parsedMarkScheme[q.id];
      const fallback = evaluateAnswerLocally(q, answer, scheme);
      const message = err?.message?.includes("Hack Club") ? "Add a Hack Club API key to enable marking. Showing local estimate." : "Marking failed. Showing local estimate.";
      setFeedbacks(prev => ({ ...prev, [q.id]: { score: Math.min(fallback.score || 0, q.marks), totalMarks: q.marks, text: `${message} ${fallback.text}`, rewrite: fallback.rewrite } }));
    }
    setLoadingFeedback(false);
  };

  const handleGetHint = async () => {
    const q = activeQuestions[currentQIndex];
    setHintData({ loading: true, text: null });
    const scheme = parsedMarkScheme[q.id];
    const keyToUse = hackClubApiKey || hackClubApiKeyDefault;
    if (!keyToUse) {
      const hint = buildHintFromScheme(q, scheme);
      setHintData({ loading: false, text: hint });
      return;
    }
    try {
      const messages = [
        { role: "system", content: "Provide a short, exam-specific hint. Do NOT give the full answer." },
        { role: "user", content: `Question: ${q.question}\nContext: ${q.context?.content || 'N/A'}\nMark scheme: ${JSON.stringify(scheme)}` }
      ];
      const response = await callHackClub(messages, keyToUse);
      setHintData({ loading: false, text: response });
    } catch (e) {
      const hint = buildHintFromScheme(q, scheme);
      setHintData({ loading: false, text: hint });
    }
  };

  const handleExplainFeedback = async () => {
    const q = activeQuestions[currentQIndex];
    const answer = userAnswers[q.id];
    const feedback = feedbacks[q.id];
    setExplanationData({ loading: true, text: null });
    const scheme = parsedMarkScheme[q.id];
    const keyToUse = hackClubApiKey || hackClubApiKeyDefault;
    if (!keyToUse) {
      const explanation = buildExplanationFromFeedback(q, answer, feedback, scheme);
      setExplanationData({ loading: false, text: explanation });
      return;
    }
    try {
      const messages = [
        { role: "system", content: "Explain the marking decision briefly in Markdown. Focus on what was missing relative to the mark scheme." },
        { role: "user", content: `Question: ${q.question}\nStudent answer: ${stringifyAnswer(answer)}\nFeedback: ${feedback.text}\nMark scheme: ${JSON.stringify(scheme)}\nScore: ${feedback.score}/${feedback.totalMarks}` }
      ];
      const response = await callHackClub(messages, keyToUse);
      setExplanationData({ loading: false, text: response });
    } catch (e) {
      const explanation = buildExplanationFromFeedback(q, answer, feedback, scheme);
      setExplanationData({ loading: false, text: explanation });
    }
  };

  const handleFollowUp = async (userText) => {
      const q = activeQuestions[currentQIndex];
      const qId = q.id;
      const currentChat = followUpChats[qId] || [];
      const newChat = [...currentChat, { role: 'user', text: userText }];
      setFollowUpChats(prev => ({ ...prev, [qId]: newChat }));
      setSendingFollowUp(true);
      const feedback = feedbacks[q.id] || {};
      const keyToUse = hackClubApiKey || hackClubApiKeyDefault;
      if (!keyToUse) {
        const response = buildFollowUpReply(userText, q, feedback);
        setFollowUpChats(prev => ({ ...prev, [qId]: [...newChat, { role: 'ai', text: response }] }));
        setSendingFollowUp(false);
        return;
      }
      try {
          const history = newChat.map(m => `${m.role}: ${m.text}`).join('\n');
          const messages = [
            { role: "system", content: "Act as a friendly tutor. Keep replies concise and practical." },
            { role: "user", content: `Question: ${q.question}\nStudent answer: ${stringifyAnswer(userAnswers[q.id])}\nFeedback: ${feedback.text}\nChat so far:\n${history}` }
          ];
          const response = await callHackClub(messages, keyToUse);
          setFollowUpChats(prev => ({ ...prev, [qId]: [...newChat, { role: 'ai', text: response }] }));
      } catch (e) {
          const response = buildFollowUpReply(userText, q, feedback);
          setFollowUpChats(prev => ({ ...prev, [qId]: [...newChat, { role: 'ai', text: response }] }));
      }
      setSendingFollowUp(false);
  };

  const handleNext = () => {
    setHintData({ loading: false, text: null }); 
    setExplanationData({ loading: false, text: null }); 
    const nextIdx = currentQIndex < activeQuestions.length - 1 ? currentQIndex + 1 : -1;
    if (nextIdx !== -1) { setCurrentQIndex(nextIdx); advanceToQuestionPage(nextIdx); } else { setPhase('summary'); }
  };

  const handleGenerateStudyPlan = async (percentage) => {
    setStudyPlan({ loading: true, content: null });
    const weaknessCounts = Object.values(feedbacks || {}).reduce((acc, fb) => {
      if (fb?.primaryFlaw) acc[fb.primaryFlaw] = (acc[fb.primaryFlaw] || 0) + 1;
      return acc;
    }, {});
    const weaknessSummary = Object.entries(weaknessCounts).map(([k, v]) => `"${k}" (${v}x)`).join(', ');
    const keyToUse = hackClubApiKey || hackClubApiKeyDefault;
    if (!keyToUse) {
      const plan = buildStudyPlan(percentage, weaknessCounts);
      setStudyPlan({ loading: false, content: plan });
      return;
    }
    try {
      const messages = [
        { role: "system", content: "Create a concise 3-step revision plan in Markdown that targets the repeated weaknesses listed." },
        { role: "user", content: `Student scored ${percentage}%. Repeated weaknesses: ${weaknessSummary || 'Not enough data yet.'}. Total questions: ${activeQuestions.length}.` }
      ];
      const response = await callHackClub(messages, keyToUse);
      setStudyPlan({ loading: false, content: response });
    } catch (e) {
      const plan = buildStudyPlan(percentage, weaknessCounts);
      setStudyPlan({ loading: false, content: plan });
    }
  };

  useEffect(() => { let timer; if (phase === 'exam') timer = setInterval(() => setTimeElapsed(p => p + 1), 1000); return () => clearInterval(timer); }, [phase]);
  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (phase === 'upload') {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center font-sans">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 relative">
          {hasSavedSession && (
            <div className="absolute top-4 right-4 animate-in fade-in">
              <button onClick={resumeSavedSession} className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2 hover:bg-green-200 transition-colors"><Save className="w-4 h-4" /> Resume Session</button>
            </div>
          )}
          <div className="text-center mb-10"><h1 className="text-3xl font-bold text-slate-900">AI GCSE Marker</h1><p className="text-slate-500 mt-2">Upload your past papers.</p></div>
          {error && <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 text-sm">{error}</div>}
          
          {/* API KEY INPUT */}
          {!apiKey && (
            <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">Google Gemini API Key</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Key className="h-5 w-5 text-slate-400" />
                    </div>
                    <input 
                        type="password" 
                        value={customApiKey}
                        onChange={(e) => updateApiKey(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-white placeholder-slate-500 focus:outline-none focus:placeholder-slate-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Enter your API Key to start"
                    />
                </div>
                <p className="mt-1 text-xs text-slate-500">Your key is stored locally in your browser.</p>
            </div>
          )}
          <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Hack Club API Key (Marking)</label>
              <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Key className="h-5 w-5 text-slate-400" />
                  </div>
                  <input 
                      type="password" 
                      value={hackClubApiKey}
                      onChange={(e) => updateHackClubKey(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-white placeholder-slate-500 focus:outline-none focus:placeholder-slate-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Enter Hack Club key for marking (qwen)"
                  />
              </div>
              <p className="mt-1 text-xs text-slate-500">Used for marking/hints. Stored locally.</p>
          </div>

          <div className="space-y-2"><FileUploadZone label="Question Paper" file={files.paper} onUpload={(f) => setFiles(prev => ({...prev, paper: f}))} /><div className="grid grid-cols-2 gap-4"><FileUploadZone label="Mark Scheme" file={files.scheme} onUpload={(f) => setFiles(prev => ({...prev, scheme: f}))} /><FileUploadZone label="Insert / Source" file={files.insert} onUpload={(f) => setFiles(prev => ({...prev, insert: f}))} /></div></div>
          <button disabled={!files.paper || (!apiKey && !customApiKey)} onClick={handleStartParsing} className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all ${files.paper && (apiKey || customApiKey) ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'}`}>Start AI Analysis</button>
        </div>
      </div>
    );
  }

  if (phase === 'parsing') return <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 font-mono"><div className="flex items-center gap-3 text-indigo-400"><RefreshCw className="w-6 h-6 animate-spin" /><span className="text-xl font-semibold">{parsingStatus}</span></div></div>;

  if (phase === 'exam') {
    const question = activeQuestions[currentQIndex];
    const hasFeedback = !!feedbacks[question.id];

    return (
      <div className="min-h-screen bg-slate-100 flex flex-col h-screen overflow-hidden font-sans">
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center shadow-sm z-10">
          <div className="flex items-center gap-4"><div className="bg-indigo-600 text-white font-bold px-3 py-1 rounded">GCSE Mock</div><h2 className="text-slate-700 font-semibold hidden sm:block">{files.paper?.name || "Mock Paper 2024"}</h2></div>
          <div className="flex items-center gap-6">
             <div className="flex flex-col items-end"><span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Time</span><span className="font-mono text-xl text-slate-800 font-bold">{formatTime(timeElapsed)}</span></div>
             <div className="flex flex-col items-end"><span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Q</span><span className="text-sm font-semibold text-slate-700">{currentQIndex + 1} / {activeQuestions.length}</span></div>
             <button onClick={clearSaveData} className="text-slate-400 hover:text-red-500" title="Reset Session"><Trash2 className="w-5 h-5" /></button>
          </div>
        </header>

        <main className="flex-1 flex overflow-hidden">
          <div className="w-1/2 bg-slate-800 border-r border-slate-700 flex flex-col hidden md:flex relative">
            <div className="bg-slate-900 border-b border-slate-700 p-2 flex gap-2">
                <button onClick={() => setActivePdfTab('paper')} className={`flex-1 px-4 py-2 rounded-md text-sm font-bold transition-colors ${activePdfTab === 'paper' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>Question Paper</button>
                {files.insert && <button onClick={() => setActivePdfTab('insert')} className={`flex-1 px-4 py-2 rounded-md text-sm font-bold transition-colors ${activePdfTab === 'insert' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>Source Material</button>}
            </div>
            <div className="flex-1 bg-slate-600 relative overflow-auto flex justify-center p-4">
                <canvas ref={canvasRef} className="shadow-2xl max-w-full h-auto object-contain bg-white" />
                {!pdfDoc && <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300"><RefreshCw className="w-8 h-8 animate-spin mb-2" /><p>Loading PDF Renderer...</p></div>}
            </div>
            <div className="bg-slate-900 p-3 flex justify-between items-center border-t border-slate-700">
                <div className="flex gap-2">
                    <button onClick={() => setPdfPage(p => Math.max(1, p - 1))} disabled={pdfPage <= 1} className="p-2 text-white hover:bg-slate-700 rounded disabled:opacity-30"><ChevronLeft className="w-5 h-5" /></button>
                    <button onClick={() => setPdfPage(p => (pdfDoc ? Math.min(pdfDoc.numPages, p + 1) : p + 1))} disabled={pdfDoc && pdfPage >= pdfDoc.numPages} className="p-2 text-white hover:bg-slate-700 rounded disabled:opacity-30"><ChevronRight className="w-5 h-5" /></button>
                </div>
                <span className="text-white font-mono font-bold text-sm">Page {pdfPage} {pdfDoc ? `/ ${pdfDoc.numPages}` : ''}</span>
                <div className="flex gap-2">
                    <button onClick={() => setPdfScale(s => Math.max(0.5, s - 0.2))} className="p-2 text-white hover:bg-slate-700 rounded"><ZoomOut className="w-5 h-5" /></button>
                    <button onClick={() => setPdfScale(s => Math.min(3.0, s + 0.2))} className="p-2 text-white hover:bg-slate-700 rounded"><ZoomIn className="w-5 h-5" /></button>
                </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-y-auto bg-white relative">
            <div className="max-w-3xl mx-auto w-full p-6 md:p-10 pb-32">
              <div className="mb-8 relative">
                 <div className="flex items-center justify-between mb-4">
                    <div className="flex gap-3">
                      <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-sm font-medium">{question.section}</span>
                      <span className="bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-sm font-medium border border-orange-100">{question.marks} Marks</span>
                    </div>
                    {!hasFeedback && (
                      <button onClick={handleGetHint} disabled={hintData.loading || hintData.text} className="flex items-center gap-2 text-sm text-amber-600 hover:bg-amber-50 px-3 py-1 rounded-full transition-colors disabled:opacity-50">
                         {hintData.loading ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Lightbulb className="w-4 h-4" />}{hintData.text ? "Hint Used" : "Get Hint"}
                      </button>
                    )}
                 </div>
                 
                 <div className="flex justify-between items-start gap-4">
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight"><span className="text-slate-300 mr-2">{question.id}.</span>{question.question}</h1>
                    {question.pageNumber && (
                        <button onClick={() => jumpToPdfPage(question.pageNumber)} className="flex-shrink-0 bg-slate-100 hover:bg-slate-200 text-slate-600 p-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-colors" title={`View Page ${question.pageNumber}`}><Eye className="w-5 h-5" /><span>Page {question.pageNumber}</span></button>
                    )}
                 </div>

                 {question.relatedFigure && (
                    <div className="mt-4 bg-blue-50 border border-blue-200 p-4 rounded-xl flex justify-between items-center">
                        <div className="flex items-center gap-3"><ImageIcon className="w-5 h-5 text-blue-500" /><div><p className="text-sm font-bold text-blue-900">Figure Referenced</p><p className="text-xs text-blue-700">{question.relatedFigure}</p></div></div>
                        {question.figurePage && <button onClick={() => jumpToPdfPage(question.figurePage)} className="bg-white text-blue-600 px-3 py-2 rounded-lg text-xs font-bold shadow-sm hover:shadow-md transition-all border border-blue-100">View Figure (Pg {question.figurePage})</button>}
                    </div>
                 )}
                 {hintData.text && (
                    <div className="mt-4 bg-amber-50 border border-amber-200 p-3 rounded-lg flex gap-3 animate-in slide-in-from-top-2">
                       <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                       <div className="text-amber-800 text-sm font-medium"><MarkdownText text={hintData.text} /></div>
                    </div>
                 )}
              </div>

              <div className={`transition-opacity duration-300 ${hasFeedback ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
                <AdaptiveInput type={question.type} options={question.options} listCount={question.listCount} tableStructure={question.tableStructure} graphConfig={question.graphConfig} value={userAnswers[question.id]} onChange={(val) => setUserAnswers(prev => ({...prev, [question.id]: val}))} />
                {question.type === 'long_text' && (
                  <div className="mt-4 p-4 rounded-lg border border-slate-200 bg-slate-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700"><BookOpen className="w-4 h-4 text-indigo-600" /> Quote Scratchpad</div>
                      <span className="text-xs text-slate-500">Paste lines from the PDF, then insert.</span>
                    </div>
                    <textarea 
                      className="w-full h-20 p-3 rounded-md border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white" 
                      placeholder="Copy a key quote or stage direction here..."
                      value={quoteDrafts[question.id] || ''}
                      onChange={(e) => updateQuoteDraft(question.id, e.target.value)}
                    />
                    <div className="flex justify-end mt-2">
                      <button onClick={() => insertQuoteIntoAnswer(question.id)} disabled={!quoteDrafts[question.id]?.trim()} className="text-xs bg-indigo-600 text-white px-3 py-2 rounded-md font-bold hover:bg-indigo-700 disabled:opacity-50">Insert Quote into Answer</button>
                    </div>
                  </div>
                )}
              </div>

              {!hasFeedback && (
                <div className="mt-8 flex justify-end gap-3">
                   <button onClick={handleSkip} className="px-6 py-3 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-2">Skip <SkipForward className="w-5 h-5" /></button>
                   <button onClick={handleSubmitAnswer} disabled={!userAnswers[question.id] || loadingFeedback} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold text-lg shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                    {loadingFeedback ? <><RefreshCw className="w-5 h-5 animate-spin" /> Marking...</> : <><CheckCircle className="w-5 h-5" /> Submit Answer</>}
                   </button>
                </div>
              )}

              <FeedbackBlock 
                feedback={feedbacks[question.id]} 
                onNext={handleNext}
                onExplain={handleExplainFeedback}
                explaining={explanationData.loading}
                explanation={explanationData.text}
                questionId={question.id}
                onFollowUp={handleFollowUp}
                followUpChat={followUpChats[question.id]}
                sendingFollowUp={sendingFollowUp}
              />
            </div>
            
            <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-300">
                    {activeQuestions.map((q, idx) => {
                        const isDone = !!feedbacks[q.id];
                        const isSkipped = skippedQuestions.has(q.id);
                        const isCurrent = currentQIndex === idx;
                        let bgColor = "bg-slate-100 text-slate-500 hover:bg-slate-200";
                        if (isCurrent) bgColor = "bg-indigo-600 text-white shadow-md ring-2 ring-indigo-200";
                        else if (isDone) bgColor = "bg-green-100 text-green-700 border border-green-200";
                        else if (isSkipped) bgColor = "bg-amber-100 text-amber-700 border border-amber-200";
                        return <button key={q.id} onClick={() => { setCurrentQIndex(idx); advanceToQuestionPage(idx); }} className={`flex-shrink-0 w-10 h-10 rounded-lg font-bold text-sm flex items-center justify-center transition-all ${bgColor}`}>{q.id}</button>
                    })}
                </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (phase === 'summary') {
    const totalScore = Object.values(feedbacks).reduce((acc, curr) => acc + curr.score, 0);
    const totalPossible = activeQuestions.reduce((acc, curr) => acc + curr.marks, 0);
    const percentage = totalPossible > 0
      ? Math.round((totalScore / totalPossible) * 100)
      : 0;
    let grade = 'U'; if (percentage >= 90) grade = '9'; else if (percentage >= 80) grade = '8'; else if (percentage >= 70) grade = '7'; else if (percentage >= 50) grade = '5'; else if (percentage >= 40) grade = '4';
    const weaknessCounts = Object.values(feedbacks || {}).reduce((acc, fb) => {
      if (fb?.primaryFlaw) acc[fb.primaryFlaw] = (acc[fb.primaryFlaw] || 0) + 1;
      return acc;
    }, {});
    const weaknessList = Object.entries(weaknessCounts).sort((a, b) => b[1] - a[1]);

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
          <div className="md:w-1/3 bg-indigo-600 p-8 text-white flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-indigo-500 opacity-20" style={{backgroundImage: 'radial-gradient(circle at 20px 20px, white 2px, transparent 0)', backgroundSize: '40px 40px'}}></div>
            <div className="relative z-10"><h2 className="text-2xl font-bold mb-1">Result Summary</h2><p className="text-indigo-200">GCSE Mock Paper</p></div>
            <div className="relative z-10 text-center py-10"><div className="w-32 h-32 rounded-full border-8 border-indigo-400 mx-auto flex items-center justify-center mb-4 bg-indigo-700"><span className="text-5xl font-bold">{grade}</span></div><p className="font-bold text-xl uppercase tracking-widest">Grade</p></div>
            <div className="relative z-10"><div className="flex justify-between border-b border-indigo-500 pb-2 mb-2"><span>Raw Marks</span><span className="font-bold">{totalScore} / {totalPossible}</span></div><div className="flex justify-between"><span>Percentage</span><span className="font-bold">{percentage}%</span></div></div>
          </div>
          <div className="md:w-2/3 p-8 md:p-12 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center gap-2 mb-6"><BarChart2 className="w-6 h-6 text-indigo-600" /><h3 className="text-2xl font-bold text-slate-800">Performance Breakdown</h3></div>
            <div className="space-y-3 mb-8">
              {weaknessList.length ? weaknessList.map(([name, count]) => (
                <div key={name} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
                  <div className="text-sm font-semibold text-slate-700">{name}</div>
                  <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full">{count}x</span>
                </div>
              )) : (
                <p className="text-sm text-slate-400">Not enough data to detect repeated weaknesses yet.</p>
              )}
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6"><div className="flex items-center justify-between mb-4"><h4 className="font-bold text-slate-800 flex items-center gap-2"><GraduationCap className="w-5 h-5 text-indigo-600" /> Next Steps</h4>{!studyPlan.content && (<button onClick={() => handleGenerateStudyPlan(percentage)} disabled={studyPlan.loading} className="text-xs bg-indigo-600 text-white px-3 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200">{studyPlan.loading ? <RefreshCw className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3" />} Generate Study Plan</button>)}</div>{studyPlan.loading && <div className="text-slate-500 text-sm flex items-center gap-2 animate-pulse"><Brain className="w-4 h-4" /> Analyzing your weaknesses...</div>}{studyPlan.content ? (<div className="prose prose-sm prose-indigo text-slate-600 animate-in fade-in"><MarkdownText text={studyPlan.content} /></div>) : (!studyPlan.loading && <p className="text-sm text-slate-400 italic">Click the button above to auto-generate a short revision strategy.</p>)}</div>
            <div className="mt-8 flex justify-end"><button onClick={() => window.location.reload()} className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors">Upload Another Paper</button></div>
          </div>
        </div>
      </div>
    );
  }
  return null;
}
