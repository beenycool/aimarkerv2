'use client';

import React, { useRef, useState, useEffect, memo } from 'react';
import { RefreshCw, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Pencil, Highlighter, Eraser, Move } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
    const containerRef = useRef<HTMLDivElement>(null);
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pdfViewerWidth, setPdfViewerWidth] = useState(50);
    const [isResizing, setIsResizing] = useState(false);
    
    // Annotation state
    const [annotationMode, setAnnotationMode] = useState<'draw' | 'highlight' | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [annotations, setAnnotations] = useState<Record<number, Annotation[]>>({});
    const [currentDrawStroke, setCurrentDrawStroke] = useState<Point[]>([]);
    const [currentHighlightRect, setCurrentHighlightRect] = useState<HighlightRect | null>(null);

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
    }

    function onPageLoadSuccess(page: any) {
        if (annotationCanvasRef.current) {
             const viewport = page.getViewport({ scale });
             annotationCanvasRef.current.width = viewport.width;
             annotationCanvasRef.current.height = viewport.height;
             redrawAnnotations();
        }
    }

    // Redraw annotations
    const redrawAnnotations = () => {
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
        if (isDrawing) {
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
    };

    // Effect to redraw when page or annotations change
    useEffect(() => {
        redrawAnnotations();
    }, [pageNumber, annotations, currentDrawStroke, currentHighlightRect, scale]);

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!annotationMode) return;
        setIsDrawing(true);
        const canvas = annotationCanvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);
        
        if (annotationMode === 'draw') {
            setCurrentDrawStroke([{ x, y }]);
            setCurrentHighlightRect(null);
        } else if (annotationMode === 'highlight') {
            setCurrentHighlightRect({ startX: x, startY: y, currentX: x, currentY: y });
            setCurrentDrawStroke([]);
        }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !annotationMode) return;
        const canvas = annotationCanvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);
        
        if (annotationMode === 'draw') {
            setCurrentDrawStroke(prev => [...prev, { x, y }]);
        } else if (annotationMode === 'highlight' && currentHighlightRect) {
            setCurrentHighlightRect(prev => prev ? { ...prev, currentX: x, currentY: y } : null);
        }
    };

    const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !annotationMode) return;
        setIsDrawing(false);
        
        const canvas = annotationCanvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);

        if (annotationMode === 'draw' && currentDrawStroke.length > 1) {
            setAnnotations(prev => ({
                ...prev,
                [pageNumber]: [...(prev[pageNumber] || []), { type: 'draw', points: currentDrawStroke }]
            }));
        } else if (annotationMode === 'highlight' && currentHighlightRect) {
            const width = x - currentHighlightRect.startX;
            const height = y - currentHighlightRect.startY;
            
            if (Math.abs(width) > 5 && Math.abs(height) > 5) {
                setAnnotations(prev => ({
                    ...prev,
                    [pageNumber]: [...(prev[pageNumber] || []), { 
                        type: 'highlight', 
                        x: Math.min(currentHighlightRect.startX, x), 
                        y: Math.min(currentHighlightRect.startY, y),
                        width: Math.abs(width),
                        height: Math.abs(height)
                    }]
                }));
            }
        }
        
        setCurrentDrawStroke([]);
        setCurrentHighlightRect(null);
    };

    const handleMouseLeave = () => {
        if (isDrawing) {
            setIsDrawing(false);
            if (annotationMode === 'draw' && currentDrawStroke.length > 1) {
                setAnnotations(prev => ({
                    ...prev,
                    [pageNumber]: [...(prev[pageNumber] || []), { type: 'draw', points: currentDrawStroke }]
                }));
            }
            setCurrentDrawStroke([]);
            setCurrentHighlightRect(null);
        }
    };

    const clearAnnotationsOnPage = () => {
        setAnnotations(prev => ({
            ...prev,
            [pageNumber]: []
        }));
    };

    // Resize logic
    const handleResizeStart = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    };

    useEffect(() => {
        if (!isResizing) return;
        
        const handleMouseMove = (e: MouseEvent) => {
            const parentContainer = containerRef.current?.parentElement?.parentElement;
            const containerWidth = parentContainer ? parentContainer.offsetWidth : window.innerWidth;
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
            
            <div className="bg-card border-b border-border p-2 flex gap-2 items-center">
                <span className="text-xs text-muted-foreground mr-2">Annotations:</span>
                <button 
                    aria-label="Draw"
                    onClick={() => setAnnotationMode(annotationMode === 'draw' ? null : 'draw')}
                    className={`p-2 rounded transition-colors ${annotationMode === 'draw' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                    title="Draw"
                >
                    <Pencil className="w-4 h-4" />
                </button>
                <button 
                    aria-label="Highlight"
                    onClick={() => setAnnotationMode(annotationMode === 'highlight' ? null : 'highlight')}
                    className={`p-2 rounded transition-colors ${annotationMode === 'highlight' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                    title="Highlight"
                >
                    <Highlighter className="w-4 h-4" />
                </button>
                <button 
                    aria-label="Clear annotations on this page"
                    onClick={clearAnnotationsOnPage}
                    className="p-2 rounded hover:bg-muted"
                    title="Clear annotations on this page"
                >
                    <Eraser className="w-4 h-4" />
                </button>
                <button 
                    aria-label="Pan mode"
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
                    <button aria-label="Previous page" onClick={() => onPageChange(Math.max(1, pageNumber - 1))} disabled={pageNumber <= 1} className="p-2 text-foreground hover:bg-muted rounded disabled:opacity-30"><ChevronLeft className="w-5 h-5" /></button>
                    <button aria-label="Next page" onClick={() => onPageChange(numPages ? Math.min(numPages, pageNumber + 1) : pageNumber + 1)} disabled={numPages ? pageNumber >= numPages : false} className="p-2 text-foreground hover:bg-muted rounded disabled:opacity-30"><ChevronRight className="w-5 h-5" /></button>
                </div>
                <span className="text-foreground font-mono font-bold text-sm">Page {pageNumber} {numPages ? `/ ${numPages}` : ''}</span>
                <div className="flex gap-2">
                    <button aria-label="Zoom out" onClick={() => onScaleChange(Math.max(0.5, scale - 0.2))} className="p-2 text-foreground hover:bg-muted rounded"><ZoomOut className="w-5 h-5" /></button>
                    <button aria-label="Zoom in" onClick={() => onScaleChange(Math.min(3.0, scale + 0.2))} className="p-2 text-foreground hover:bg-muted rounded"><ZoomIn className="w-5 h-5" /></button>
                </div>
            </div>
            
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
