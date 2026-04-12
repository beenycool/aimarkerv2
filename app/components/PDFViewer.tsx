'use client';

import React, { useRef, useState, useEffect, useCallback, memo } from 'react';
import { RefreshCw, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Pencil, Highlighter, Eraser, Move } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

// Configure worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Focus-visible utility classes for consistent keyboard accessibility
const focusVisibleClasses = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

interface Point {
    x: number;
    y: number;
}

interface HighlightRect {
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
}

interface DrawAnnotation {
    type: 'draw';
    points: Point[];
}

interface HighlightAnnotation {
    type: 'highlight';
    x: number;
    y: number;
    width: number;
    height: number;
}

type Annotation = DrawAnnotation | HighlightAnnotation;

interface PDFViewerProps {
    file: string | File | ArrayBuffer;
    pageNumber: number;
    scale: number;
    onPageChange: (page: number) => void;
    onScaleChange: (scale: number) => void;
    activePdfTab: string;
    onTabChange: (tab: string) => void;
    hasInsert: boolean;
}

const PDFViewer = memo(({ file, pageNumber, scale, onPageChange, onScaleChange, activePdfTab, onTabChange, hasInsert }: PDFViewerProps) => {
    const annotationCanvasRef = useRef<HTMLCanvasElement>(null);
        const [numPages, setNumPages] = useState<number | null>(null);

    // Annotation state
    const [annotationMode, setAnnotationMode] = useState<'draw' | 'highlight' | null>(null);
    const isDrawingRef = useRef(false);
    const [annotations, setAnnotations] = useState<Record<number, Annotation[]>>({});
    const currentDrawStrokeRef = useRef<Point[]>([]);
    const currentHighlightRectRef = useRef<HighlightRect | null>(null);

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
    }

    // Redraw annotations
    const redrawAnnotations = useCallback(() => {
        if (!annotationCanvasRef.current) return;
        const canvas = annotationCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const pageAnnotations = annotations[pageNumber] || [];
        pageAnnotations.forEach(annotation => {
            if (annotation.type === 'draw') {
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.beginPath();
                if (annotation.points.length > 0) {
                    ctx.moveTo(annotation.points[0].x, annotation.points[0].y);
                    for (let i = 1; i < annotation.points.length; i++) {
                        ctx.lineTo(annotation.points[i].x, annotation.points[i].y);
                    }
                }
                ctx.stroke();
            } else if (annotation.type === 'highlight') {
                ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
                ctx.fillRect(annotation.x, annotation.y, annotation.width, annotation.height);
            }
        });

        // Draw current stroke
        if (isDrawingRef.current) {
            const currentDrawStroke = currentDrawStrokeRef.current;
            const currentHighlightRect = currentHighlightRectRef.current;
            if (annotationMode === 'draw' && currentDrawStroke.length > 0) {
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.beginPath();
                ctx.moveTo(currentDrawStroke[0].x, currentDrawStroke[0].y);
                for (let i = 1; i < currentDrawStroke.length; i++) {
                    ctx.lineTo(currentDrawStroke[i].x, currentDrawStroke[i].y);
                }
                ctx.stroke();
            } else if (annotationMode === 'highlight' && currentHighlightRect) {
                 const x = Math.min(currentHighlightRect.startX, currentHighlightRect.currentX);
                 const y = Math.min(currentHighlightRect.startY, currentHighlightRect.currentY);
                 const width = Math.abs(currentHighlightRect.currentX - currentHighlightRect.startX);
                 const height = Math.abs(currentHighlightRect.currentY - currentHighlightRect.startY);
                 ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
                 ctx.fillRect(x, y, width, height);
            }
        }
    }, [pageNumber, annotations, annotationMode]);

    const onPageLoadSuccess = useCallback(
        (page: any) => {
            if (annotationCanvasRef.current) {
                const viewport = page.getViewport({ scale });
                annotationCanvasRef.current.width = viewport.width;
                annotationCanvasRef.current.height = viewport.height;
                redrawAnnotations();
            }
        },
        [redrawAnnotations, scale]
    );

    // Effect to redraw when page or annotations change
    useEffect(() => {
        redrawAnnotations();
    }, [redrawAnnotations, scale]);

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!annotationMode) return;
        isDrawingRef.current = true;
        const canvas = annotationCanvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);
        
        if (annotationMode === 'draw') {
            currentDrawStrokeRef.current = [{ x, y }];
            currentHighlightRectRef.current = null;
        } else if (annotationMode === 'highlight') {
            currentHighlightRectRef.current = { startX: x, startY: y, currentX: x, currentY: y };
            currentDrawStrokeRef.current = [];
        }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawingRef.current || !annotationMode) return;
        const canvas = annotationCanvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (annotationMode === 'draw') {
            currentDrawStrokeRef.current.push({ x, y });

            // Draw only the new segment
            const stroke = currentDrawStrokeRef.current;
            if (stroke.length > 1) {
                const prev = stroke[stroke.length - 2];
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.beginPath();
                ctx.moveTo(prev.x, prev.y);
                ctx.lineTo(x, y);
                ctx.stroke();
            }
        } else if (annotationMode === 'highlight' && currentHighlightRectRef.current) {
            currentHighlightRectRef.current.currentX = x;
            currentHighlightRectRef.current.currentY = y;
            // Redraw everything to update highlight rect without leaving trails
            redrawAnnotations();
        }
    };

    const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawingRef.current || !annotationMode) return;
        isDrawingRef.current = false;
        
        const canvas = annotationCanvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);

        if (annotationMode === 'draw' && currentDrawStrokeRef.current.length > 1) {
            const finalStroke = [...currentDrawStrokeRef.current];
            setAnnotations(prev => ({
                ...prev,
                [pageNumber]: [...(prev[pageNumber] || []), { type: 'draw', points: finalStroke }]
            }));
        } else if (annotationMode === 'highlight' && currentHighlightRectRef.current) {
            const rectStart = currentHighlightRectRef.current;
            const width = x - rectStart.startX;
            const height = y - rectStart.startY;
            
            if (Math.abs(width) > 5 && Math.abs(height) > 5) {
                setAnnotations(prev => ({
                    ...prev,
                    [pageNumber]: [...(prev[pageNumber] || []), { 
                        type: 'highlight', 
                        x: Math.min(rectStart.startX, x),
                        y: Math.min(rectStart.startY, y),
                        width: Math.abs(width),
                        height: Math.abs(height)
                    }]
                }));
            }
        }
        
        currentDrawStrokeRef.current = [];
        currentHighlightRectRef.current = null;
    };

    const handleMouseLeave = () => {
        if (isDrawingRef.current) {
            isDrawingRef.current = false;
            if (annotationMode === 'draw' && currentDrawStrokeRef.current.length > 1) {
                const finalStroke = [...currentDrawStrokeRef.current];
                setAnnotations(prev => ({
                    ...prev,
                    [pageNumber]: [...(prev[pageNumber] || []), { type: 'draw', points: finalStroke }]
                }));
            }
            currentDrawStrokeRef.current = [];
            currentHighlightRectRef.current = null;
            redrawAnnotations();
        }
    };

    const clearAnnotationsOnPage = () => {
        setAnnotations(prev => ({
            ...prev,
            [pageNumber]: []
        }));
    };



    return (
        <TooltipProvider>
        <div 
            className="bg-muted/30 flex flex-col hidden md:flex h-full w-full"
        >
            <div className="sticky top-0 z-20 shrink-0 bg-card/95 backdrop-blur-sm supports-[backdrop-filter]:bg-card/90 border-b border-border shadow-sm">
            <div
                role="tablist"
                aria-label="PDF source"
                className="p-2 flex gap-2 border-b border-border/60"
            >
                {[
                    { id: 'paper', label: 'Question Paper' },
                    ...(hasInsert ? [{ id: 'insert', label: 'Source Material' }] : []),
                ].map(({ id, label }) => (
                    <button
                        key={id}
                        type="button"
                        role="tab"
                        id={`pdf-tab-${id}`}
                        aria-selected={activePdfTab === id}
                        aria-controls="pdf-panel"
                        onClick={() => onTabChange(id)}
                        className={`flex-1 px-4 py-2 rounded-md text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                            activePdfTab === id
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>
            
            <div className="p-2 flex gap-2 items-center">
                <span className="text-xs text-muted-foreground mr-2">Annotations:</span>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            aria-label="Draw"
                            onClick={() => setAnnotationMode(annotationMode === 'draw' ? null : 'draw')}
                            className={`p-2 rounded transition-colors ${focusVisibleClasses} ${annotationMode === 'draw' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>Draw</TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            aria-label="Highlight"
                            onClick={() => setAnnotationMode(annotationMode === 'highlight' ? null : 'highlight')}
                            className={`p-2 rounded transition-colors ${focusVisibleClasses} ${annotationMode === 'highlight' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                        >
                            <Highlighter className="w-4 h-4" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>Highlight</TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            aria-label="Clear annotations on this page"
                            onClick={clearAnnotationsOnPage}
                            className={`p-2 rounded hover:bg-muted ${focusVisibleClasses}`}
                        >
                            <Eraser className="w-4 h-4" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>Clear annotations on this page</TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            aria-label="Pan mode"
                            onClick={() => setAnnotationMode(null)}
                            className={`p-2 rounded transition-colors ${focusVisibleClasses} ${!annotationMode ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                        >
                            <Move className="w-4 h-4" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>Pan mode</TooltipContent>
                </Tooltip>
            </div>
            </div>
            
            <div 
                id="pdf-panel"
                role="tabpanel"
                className="flex-1 bg-muted/50 relative overflow-auto flex justify-center p-4 h-full"
            >
                <div className="relative">
                    <Document
                        file={file}
                        onLoadSuccess={onDocumentLoadSuccess}
                        loading={<div className="flex flex-col items-center justify-center p-10"><RefreshCw className="w-8 h-8 animate-spin mb-2" /><p>Loading PDF...</p></div>}
                        error={<div className="text-destructive p-4">Failed to load PDF</div>}
                    >
                        <Page
                            pageNumber={pageNumber}
                            scale={scale}
                            onLoadSuccess={onPageLoadSuccess}
                            className="shadow-2xl bg-white"
                            renderAnnotationLayer={true}
                            renderTextLayer={true}
                        />
                    </Document>
                    <canvas 
                        ref={annotationCanvasRef}
                        className="absolute top-0 left-0 pointer-events-auto"
                        style={{ cursor: annotationMode ? 'crosshair' : 'default', touchAction: 'none' }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseLeave}
                    />
                </div>
            </div>
            <div className="bg-card p-3 flex justify-between items-center border-t border-border">
                <div className="flex gap-2">
                <div className="flex gap-2">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button type="button" onClick={() => onPageChange(Math.max(1, pageNumber - 1))} disabled={pageNumber <= 1} className={`p-2 text-foreground hover:bg-muted rounded disabled:opacity-30 ${focusVisibleClasses}`} aria-label="Previous page"><ChevronLeft className="w-5 h-5" /></button>
                        </TooltipTrigger>
                        <TooltipContent>Previous page</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button type="button" onClick={() => onPageChange(numPages ? Math.min(numPages, pageNumber + 1) : pageNumber + 1)} disabled={numPages ? pageNumber >= numPages : false} className={`p-2 text-foreground hover:bg-muted rounded disabled:opacity-30 ${focusVisibleClasses}`} aria-label="Next page"><ChevronRight className="w-5 h-5" /></button>
                        </TooltipTrigger>
                        <TooltipContent>Next page</TooltipContent>
                    </Tooltip>
                </div>
                <span className="text-foreground font-mono font-bold text-sm">Page {pageNumber} {numPages ? `/ ${numPages}` : ''}</span>
                <div className="flex gap-2">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button type="button" onClick={() => onScaleChange(Math.max(0.5, scale - 0.2))} className={`p-2 text-foreground hover:bg-muted rounded ${focusVisibleClasses}`} aria-label="Zoom out"><ZoomOut className="w-5 h-5" /></button>
                        </TooltipTrigger>
                        <TooltipContent>Zoom out</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button type="button" onClick={() => onScaleChange(Math.min(3.0, scale + 0.2))} className={`p-2 text-foreground hover:bg-muted rounded ${focusVisibleClasses}`} aria-label="Zoom in"><ZoomIn className="w-5 h-5" /></button>
                        </TooltipTrigger>
                        <TooltipContent>Zoom in</TooltipContent>
                    </Tooltip>
                </div>
                </div>
            </div>
            

        </div>
        </TooltipProvider>
    );
}, (prev, next) => prev.file === next.file && prev.pageNumber === next.pageNumber && prev.scale === next.scale && prev.activePdfTab === next.activePdfTab && prev.hasInsert === next.hasInsert);

PDFViewer.displayName = 'PDFViewer';
export default PDFViewer;
