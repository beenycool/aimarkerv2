import { NextResponse } from 'next/server';
import { rateLimit } from '../../_lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_PDF_BYTES = 25 * 1024 * 1024; // 25MB

function jsonError(message, status = 400, extra = {}) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

/**
 * Extract page-by-page text from a PDF.
 *
 * Request: multipart/form-data
 * - file: PDF file
 */
export async function POST(request) {
  const rl = rateLimit(request, { keyPrefix: 'pdf-text', limit: 12, windowMs: 60_000 });
  if (!rl.ok) {
    return jsonError('Rate limit exceeded. Please slow down.', 429, {
      limit: rl.limit,
      windowMs: rl.windowMs,
    });
  }

  let formData;
  try {
    formData = await request.formData();
  } catch (e) {
    return jsonError('Expected multipart/form-data with a PDF file.', 400);
  }

  const file = formData.get('file');
  if (!file) return jsonError('Missing "file" field in form data.', 400);

  // Next.js returns a Web File object here.
  if (file.type && file.type !== 'application/pdf') {
    return jsonError('Only PDF files are supported.', 400, { receivedType: file.type });
  }

  if (typeof file.size === 'number' && file.size > MAX_PDF_BYTES) {
    return jsonError('PDF is too large.', 413, { maxBytes: MAX_PDF_BYTES, receivedBytes: file.size });
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);

    // Dynamic import keeps the route lightweight and avoids bundler edge cases.
    // pdfjs-dist legacy build is the most reliable for Node environments.
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

    const loadingTask = pdfjs.getDocument({
      data,
      // Node-side parsing is more stable without a worker.
      disableWorker: true,
      stopAtErrors: true,
      // Some PDFs require system fonts; this can improve extraction.
      useSystemFonts: true,
    });

    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;

    const pages = [];
    for (let pageNumber = 1; pageNumber <= numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const strings = (textContent.items || [])
        .map((it) => (typeof it?.str === 'string' ? it.str : ''))
        .filter(Boolean);

      // Basic whitespace normalization.
      const text = strings.join(' ').replace(/\s+/g, ' ').trim();
      pages.push({ pageNumber, text });
    }

    const fullText = pages.map((p) => `--- Page ${p.pageNumber} ---\n${p.text}`).join('\n\n');

    return NextResponse.json({
      numPages,
      pages,
      fullText,
    });
  } catch (error) {
    console.error('PDF text extraction failed:', error);
    return jsonError('Failed to extract text from PDF. The PDF may be scanned or malformed.', 500);
  }
}
