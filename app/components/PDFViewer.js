'use client';

import React, { useRef, useState, useEffect, memo } from 'react';
import { RefreshCw, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

/**
 * Memoized PDF Viewer Component - Isolates PDF rendering from parent re-renders
 */
const PDFViewer = memo(({ file, pageNumber, scale, onPageChange, onScaleChange, activePdfTab, onTabChange, hasInsert }) => {
    const canvasRef = useRef(null);
    const renderTaskRef = useRef(null);
    const [pdfDoc, setPdfDoc] = useState(null);
    const [pdfLibReady, setPdfLibReady] = useState(false);

    // Load pdf.js library with double-load prevention
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (window.pdfjsLib) { setPdfLibReady(true); return; }
        const script = document.createElement('script');
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
        script.async = true;
        script.onload = () => {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
            setPdfLibReady(true);
        };
        document.body.appendChild(script);
    }, []);

    // Load Document only when file changes
    useEffect(() => {
        if (!file || !pdfLibReady || !window.pdfjsLib) return;
        const load = async () => {
            try {
                const arrayBuffer = await file.arrayBuffer();
                const doc = await window.pdfjsLib.getDocument(arrayBuffer).promise;
                setPdfDoc(doc);
            } catch (e) { console.error("Failed to load PDF:", e); }
        };
        load();
    }, [file, pdfLibReady]);

    // Render Page only when doc, page, or scale changes
    useEffect(() => {
        if (!pdfDoc || !canvasRef.current) return;
        const render = async () => {
            if (renderTaskRef.current) { try { await renderTaskRef.current.cancel(); } catch (e) { } }
            try {
                const page = await pdfDoc.getPage(pageNumber);
                const outputScale = window.devicePixelRatio || 1;
                const viewport = page.getViewport({ scale });
                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');
                canvas.width = Math.floor(viewport.width * outputScale);
                canvas.height = Math.floor(viewport.height * outputScale);
                canvas.style.width = `${Math.floor(viewport.width)}px`;
                canvas.style.height = `${Math.floor(viewport.height)}px`;
                const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;
                const renderTask = page.render({ canvasContext: context, transform, viewport });
                renderTaskRef.current = renderTask;
                await renderTask.promise;
            } catch (e) { if (e.name !== 'RenderingCancelledException') console.error("Render error:", e); }
        };
        render();
    }, [pdfDoc, pageNumber, scale]);

    return (
        <div className="w-1/2 bg-slate-800 border-r border-slate-700 flex flex-col hidden md:flex relative">
            <div className="bg-slate-900 border-b border-slate-700 p-2 flex gap-2">
                <button onClick={() => onTabChange('paper')} className={`flex-1 px-4 py-2 rounded-md text-sm font-bold transition-colors ${activePdfTab === 'paper' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>Question Paper</button>
                {hasInsert && <button onClick={() => onTabChange('insert')} className={`flex-1 px-4 py-2 rounded-md text-sm font-bold transition-colors ${activePdfTab === 'insert' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>Source Material</button>}
            </div>
            <div className="flex-1 bg-slate-600 relative overflow-auto flex justify-center p-4 h-full">
                <canvas ref={canvasRef} className="shadow-2xl max-w-full h-auto object-contain bg-white" />
                {!pdfDoc && <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300"><RefreshCw className="w-8 h-8 animate-spin mb-2" /><p>Loading PDF...</p></div>}
            </div>
            <div className="bg-slate-900 p-3 flex justify-between items-center border-t border-slate-700">
                <div className="flex gap-2">
                    <button onClick={() => onPageChange(Math.max(1, pageNumber - 1))} disabled={pageNumber <= 1} className="p-2 text-white hover:bg-slate-700 rounded disabled:opacity-30"><ChevronLeft className="w-5 h-5" /></button>
                    <button onClick={() => onPageChange(pdfDoc ? Math.min(pdfDoc.numPages, pageNumber + 1) : pageNumber + 1)} disabled={pdfDoc && pageNumber >= pdfDoc.numPages} className="p-2 text-white hover:bg-slate-700 rounded disabled:opacity-30"><ChevronRight className="w-5 h-5" /></button>
                </div>
                <span className="text-white font-mono font-bold text-sm">Page {pageNumber} {pdfDoc ? `/ ${pdfDoc.numPages}` : ''}</span>
                <div className="flex gap-2">
                    <button onClick={() => onScaleChange(Math.max(0.5, scale - 0.2))} className="p-2 text-white hover:bg-slate-700 rounded"><ZoomOut className="w-5 h-5" /></button>
                    <button onClick={() => onScaleChange(Math.min(3.0, scale + 0.2))} className="p-2 text-white hover:bg-slate-700 rounded"><ZoomIn className="w-5 h-5" /></button>
                </div>
            </div>
        </div>
    );
}, (prev, next) => prev.file === next.file && prev.pageNumber === next.pageNumber && prev.scale === next.scale && prev.activePdfTab === next.activePdfTab && prev.hasInsert === next.hasInsert);

PDFViewer.displayName = 'PDFViewer';
export default PDFViewer;
