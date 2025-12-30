'use client';

import React, { useRef, useState, useEffect, memo } from 'react';
import { RefreshCw, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Pencil, Highlighter, Eraser, Move } from 'lucide-react';

/**
 * Memoized PDF Viewer Component with Annotations - Isolates PDF rendering from parent re-renders
 */
const PDFViewer = memo(({ file, pageNumber, scale, onPageChange, onScaleChange, activePdfTab, onTabChange, hasInsert }) => {
    const canvasRef = useRef(null);
    const annotationCanvasRef = useRef(null);
    const containerRef = useRef(null);
    const renderTaskRef = useRef(null);
    const [pdfDoc, setPdfDoc] = useState(null);
    const [pdfLibReady, setPdfLibReady] = useState(false);
    const [pdfViewerWidth, setPdfViewerWidth] = useState(50); // percentage
    const [isResizing, setIsResizing] = useState(false);
    
    // Annotation state
    const [annotationMode, setAnnotationMode] = useState(null); // 'draw', 'highlight', 'erase', null
    const [isDrawing, setIsDrawing] = useState(false);
    const [annotations, setAnnotations] = useState({}); // keyed by pageNumber
    const [currentStroke, setCurrentStroke] = useState([]);

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
                
                // Also update annotation canvas size
                if (annotationCanvasRef.current) {
                    const annotationCanvas = annotationCanvasRef.current;
                    annotationCanvas.width = canvas.width;
                    annotationCanvas.height = canvas.height;
                    annotationCanvas.style.width = canvas.style.width;
                    annotationCanvas.style.height = canvas.style.height;
                    redrawAnnotations();
                }
            } catch (e) { if (e.name !== 'RenderingCancelledException') console.error("Render error:", e); }
        };
        render();
    }, [pdfDoc, pageNumber, scale]);

    // Redraw annotations on current page
    const redrawAnnotations = () => {
        if (!annotationCanvasRef.current) return;
        const canvas = annotationCanvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const pageAnnotations = annotations[pageNumber] || [];
        pageAnnotations.forEach(annotation => {
            if (annotation.type === 'draw') {
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.beginPath();
                annotation.points.forEach((point, i) => {
                    if (i === 0) ctx.moveTo(point.x, point.y);
                    else ctx.lineTo(point.x, point.y);
                });
                ctx.stroke();
            } else if (annotation.type === 'highlight') {
                ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
                ctx.fillRect(annotation.x, annotation.y, annotation.width, annotation.height);
            }
        });
    };

    useEffect(() => {
        redrawAnnotations();
    }, [annotations, pageNumber]);

    // Handle annotation drawing
    const handleMouseDown = (e) => {
        if (!annotationMode || annotationMode === 'erase') return;
        const canvas = annotationCanvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);
        
        setIsDrawing(true);
        if (annotationMode === 'draw') {
            setCurrentStroke([{ x, y }]);
        } else if (annotationMode === 'highlight') {
            setCurrentStroke({ startX: x, startY: y });
        }
    };

    const handleMouseMove = (e) => {
        if (!isDrawing || !annotationMode) return;
        const canvas = annotationCanvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);
        
        if (annotationMode === 'draw') {
            setCurrentStroke(prev => [...prev, { x, y }]);
            // Draw current stroke
            const ctx = canvas.getContext('2d');
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            if (currentStroke.length > 0) {
                const lastPoint = currentStroke[currentStroke.length - 1];
                ctx.beginPath();
                ctx.moveTo(lastPoint.x, lastPoint.y);
                ctx.lineTo(x, y);
                ctx.stroke();
            }
        }
    };

    const handleMouseUp = (e) => {
        if (!isDrawing || !annotationMode) return;
        setIsDrawing(false);
        
        if (annotationMode === 'draw' && currentStroke.length > 1) {
            setAnnotations(prev => ({
                ...prev,
                [pageNumber]: [...(prev[pageNumber] || []), { type: 'draw', points: currentStroke }]
            }));
        } else if (annotationMode === 'highlight' && currentStroke.startX !== undefined) {
            const canvas = annotationCanvasRef.current;
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (canvas.width / rect.width);
            const y = (e.clientY - rect.top) * (canvas.height / rect.height);
            
            const width = x - currentStroke.startX;
            const height = y - currentStroke.startY;
            
            if (Math.abs(width) > 5 && Math.abs(height) > 5) {
                setAnnotations(prev => ({
                    ...prev,
                    [pageNumber]: [...(prev[pageNumber] || []), { 
                        type: 'highlight', 
                        x: Math.min(currentStroke.startX, x), 
                        y: Math.min(currentStroke.startY, y),
                        width: Math.abs(width),
                        height: Math.abs(height)
                    }]
                }));
            }
        }
        
        setCurrentStroke([]);
        redrawAnnotations();
    };

    const clearAnnotationsOnPage = () => {
        setAnnotations(prev => ({
            ...prev,
            [pageNumber]: []
        }));
    };

    // Handle resizing
    const handleResizeStart = (e) => {
        e.preventDefault();
        setIsResizing(true);
    };

    useEffect(() => {
        if (!isResizing) return;
        
        const handleMouseMove = (e) => {
            const containerWidth = window.innerWidth;
            const newWidth = (e.clientX / containerWidth) * 100;
            setPdfViewerWidth(Math.max(30, Math.min(70, newWidth)));
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    return (
        <div 
            className="bg-muted/30 border-r border-border flex flex-col hidden md:flex relative"
            style={{ width: `${pdfViewerWidth}%` }}
        >
            <div className="bg-card border-b border-border p-2 flex gap-2">
                <button onClick={() => onTabChange('paper')} className={`flex-1 px-4 py-2 rounded-md text-sm font-bold transition-colors ${activePdfTab === 'paper' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>Question Paper</button>
                {hasInsert && <button onClick={() => onTabChange('insert')} className={`flex-1 px-4 py-2 rounded-md text-sm font-bold transition-colors ${activePdfTab === 'insert' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>Source Material</button>}
            </div>
            
            {/* Annotation toolbar */}
            <div className="bg-card border-b border-border p-2 flex gap-2 items-center">
                <span className="text-xs text-muted-foreground mr-2">Annotations:</span>
                <button 
                    onClick={() => setAnnotationMode(annotationMode === 'draw' ? null : 'draw')}
                    className={`p-2 rounded transition-colors ${annotationMode === 'draw' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                    title="Draw"
                >
                    <Pencil className="w-4 h-4" />
                </button>
                <button 
                    onClick={() => setAnnotationMode(annotationMode === 'highlight' ? null : 'highlight')}
                    className={`p-2 rounded transition-colors ${annotationMode === 'highlight' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                    title="Highlight"
                >
                    <Highlighter className="w-4 h-4" />
                </button>
                <button 
                    onClick={clearAnnotationsOnPage}
                    className="p-2 rounded hover:bg-muted"
                    title="Clear annotations on this page"
                >
                    <Eraser className="w-4 h-4" />
                </button>
                <button 
                    onClick={() => setAnnotationMode(null)}
                    className={`p-2 rounded transition-colors ${!annotationMode ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                    title="Pan mode"
                >
                    <Move className="w-4 h-4" />
                </button>
            </div>
            
            <div 
                ref={containerRef}
                className="flex-1 bg-muted/50 relative overflow-auto flex justify-center p-4 h-full"
            >
                <div className="relative">
                    <canvas ref={canvasRef} className="shadow-2xl max-w-full h-auto object-contain bg-white" />
                    <canvas 
                        ref={annotationCanvasRef}
                        className="absolute top-0 left-0 shadow-2xl max-w-full h-auto"
                        style={{ cursor: annotationMode ? 'crosshair' : 'default' }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={() => {
                            if (isDrawing) handleMouseUp({ clientX: 0, clientY: 0 });
                        }}
                    />
                </div>
                {!pdfDoc && <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground"><RefreshCw className="w-8 h-8 animate-spin mb-2" /><p>Loading PDF...</p></div>}
            </div>
            <div className="bg-card p-3 flex justify-between items-center border-t border-border">
                <div className="flex gap-2">
                    <button onClick={() => onPageChange(Math.max(1, pageNumber - 1))} disabled={pageNumber <= 1} className="p-2 text-foreground hover:bg-muted rounded disabled:opacity-30"><ChevronLeft className="w-5 h-5" /></button>
                    <button onClick={() => onPageChange(pdfDoc ? Math.min(pdfDoc.numPages, pageNumber + 1) : pageNumber + 1)} disabled={pdfDoc && pageNumber >= pdfDoc.numPages} className="p-2 text-foreground hover:bg-muted rounded disabled:opacity-30"><ChevronRight className="w-5 h-5" /></button>
                </div>
                <span className="text-foreground font-mono font-bold text-sm">Page {pageNumber} {pdfDoc ? `/ ${pdfDoc.numPages}` : ''}</span>
                <div className="flex gap-2">
                    <button onClick={() => onScaleChange(Math.max(0.5, scale - 0.2))} className="p-2 text-foreground hover:bg-muted rounded"><ZoomOut className="w-5 h-5" /></button>
                    <button onClick={() => onScaleChange(Math.min(3.0, scale + 0.2))} className="p-2 text-foreground hover:bg-muted rounded"><ZoomIn className="w-5 h-5" /></button>
                </div>
            </div>
            
            {/* Resize handle */}
            <div 
                className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/50 transition-colors"
                onMouseDown={handleResizeStart}
                style={{ zIndex: 100 }}
            />
        </div>
    );
}, (prev, next) => prev.file === next.file && prev.pageNumber === next.pageNumber && prev.scale === next.scale && prev.activePdfTab === next.activePdfTab && prev.hasInsert === next.hasInsert);

PDFViewer.displayName = 'PDFViewer';
export default PDFViewer;