# AI GCSE Marker (Next.js)

An AI-powered exam marking assistant for GCSE-style papers.

This project parses PDF exam papers (and optional inserts + mark schemes), extracts questions, and uses LLMs to mark student answers with feedback, model answers, and follow-up tutoring.

## What's new in this refactor

- **Text-first PDF pipeline** (server-side): PDFs are now parsed to *page-by-page text* via a Next.js Route Handler (`/api/pdf/text`) and only then structured by the LLM. This is **faster, cheaper, and far more reliable** than sending full PDFs to multimodal models for every task.
- **Structured output / JSON mode** for OpenRouter tasks where possible, reducing brittle JSON parsing.
- **Rate limiting + timeouts** on API routes (OpenRouter, Hack Club, PDF text extraction) to prevent accidental UI loops or abuse.
- **Better marking robustness**: local deterministic fallback, conservative score clamping, optional regex auto-verification, and an **audit trail** (models + request ids) per question.

## Quick start

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill in keys.

## Environment variables

Server-side (recommended):
- `OPENROUTER_API_KEY` — used for parsing/structuring PDFs and some tutor tasks
- `HACKCLUB_API_KEY` — used for grading + follow-up tutoring

Client-side (optional):
- `NEXT_PUBLIC_APP_URL` — used for OpenRouter ranking headers

Optional (Paper Library feature):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Key routes

- `POST /api/pdf/text` — accepts `multipart/form-data` `{ file: <PDF> }` and returns page-by-page extracted text
- `POST /api/openrouter` — OpenRouter proxy route used by the client
- `POST /api/hackclub` — Hack Club AI proxy route used by the client
- `GET /api/config` — returns booleans describing which server keys are configured

## Notes

- For scanned (image-only) PDFs, text extraction may return very little. The app will attempt a vision fallback, but your best results come from providing text-based PDFs or running OCR first.
- This app stores BYOK keys in `localStorage` for convenience. For production deployments, prefer server-side keys.
