import React, { memo, useRef, useState, useEffect, useCallback } from 'react';
import { PenTool, Pencil, Type, ImageOff, Trash2 } from 'lucide-react';
import type { GraphDrawingValue, GraphLineSeg, GraphPoint } from './graphDrawingTypes';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/app/components/ui/tooltip';

type GraphConfig = {
    xMin?: number;
    xMax?: number;
    yMin?: number;
    yMax?: number;
    xLabel?: string;
    yLabel?: string;
};

type GraphCanvasProps = {
    config?: GraphConfig;
    value: GraphDrawingValue | null | undefined;
    onChange: (v: GraphDrawingValue) => void;
    backgroundImage?: string | null;
    onClearBackground?: () => void;
};

const emptyState: GraphDrawingValue = { points: [], lines: [], labels: [], paths: [] };

const GraphCanvas = memo(({ config, value, onChange, backgroundImage, onClearBackground }: GraphCanvasProps) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const bgDirtyRef = useRef(true);
    const [tool, setTool] = useState('point');
    const [isDragging, setIsDragging] = useState(false);
    const [startPoint, setStartPoint] = useState<{ cx: number; cy: number } | null>(null);
    const [isSketching, setIsSketching] = useState(false);
    const currentPathRef = useRef<GraphPoint[]>([]);
    const [labelText, setLabelText] = useState('');
    const [background, setBackground] = useState<HTMLImageElement | null>(null);

    const state = value || emptyState;
    const points = state.points || [];
    const lines = state.lines || [];
    const labels = state.labels || [];
    const paths = state.paths || [];
    const xMin = config?.xMin ?? 0;
    const xMax = (config?.xMax ?? 10) > xMin ? (config?.xMax ?? 10) : xMin + 1;
    const yMin = config?.yMin ?? 0;
    const yMax = (config?.yMax ?? 10) > yMin ? (config?.yMax ?? 10) : yMin + 1;
    const xLabel = config?.xLabel ?? 'X Axis';
    const yLabel = config?.yLabel ?? 'Y Axis';
    const width = 600,
        height = 400,
        padding = 50;

    useEffect(() => {
        if (!backgroundImage) {
            setBackground(null);
            return;
        }
        const img = new Image();
        img.onload = () => setBackground(img);
        img.src = backgroundImage;
    }, [backgroundImage]);

    useEffect(() => {
        bgDirtyRef.current = true;
    }, [backgroundImage, background, xMin, xMax, yMin, yMax, xLabel, yLabel]);

    const ensureBgCanvas = useCallback(() => {
        let c = bgCanvasRef.current;
        if (!c) {
            c = document.createElement('canvas');
            c.width = width;
            c.height = height;
            bgCanvasRef.current = c;
        }
        return c;
    }, [width, height]);

    const renderStaticLayer = useCallback(() => {
        const bgCanvas = ensureBgCanvas();
        const ctx = bgCanvas.getContext('2d');
        if (!ctx) return;

        const graphWidth = width - 2 * padding;
        const graphHeight = height - 2 * padding;
        const toCanvasX = (val: number) => padding + ((val - xMin) / (xMax - xMin)) * graphWidth;
        const toCanvasY = (val: number) => height - padding - ((val - yMin) / (yMax - yMin)) * graphHeight;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        if (background) {
            const imageAspect = background.width / background.height;
            let drawWidth = graphWidth;
            let drawHeight = graphWidth / imageAspect;
            if (drawHeight > graphHeight) {
                drawHeight = graphHeight;
                drawWidth = graphHeight * imageAspect;
            }
            const offsetX = padding + (graphWidth - drawWidth) / 2;
            const offsetY = padding + (graphHeight - drawHeight) / 2;
            ctx.save();
            ctx.globalAlpha = 0.35;
            ctx.drawImage(background, offsetX, offsetY, drawWidth, drawHeight);
            ctx.restore();
        }

        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = xMin; i <= xMax; i += (xMax - xMin) / 10) {
            const x = toCanvasX(i);
            ctx.moveTo(x, padding);
            ctx.lineTo(x, height - padding);
        }
        for (let i = yMin; i <= yMax; i += (yMax - yMin) / 10) {
            const y = toCanvasY(i);
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
        }
        ctx.stroke();

        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        const yAxisX = xMin <= 0 && 0 <= xMax ? toCanvasX(0) : padding;
        const xAxisY = yMin <= 0 && 0 <= yMax ? toCanvasY(0) : height - padding;
        ctx.beginPath();
        ctx.moveTo(yAxisX, padding);
        ctx.lineTo(yAxisX, height - padding);
        ctx.moveTo(padding, xAxisY);
        ctx.lineTo(width - padding, xAxisY);
        ctx.stroke();

        ctx.fillStyle = '#000';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(xLabel, width / 2, height - 10);
        ctx.save();
        ctx.translate(15, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(yLabel, 0, 0);
        ctx.restore();
    }, [background, xMin, xMax, yMin, yMax, xLabel, yLabel, ensureBgCanvas, width, height, padding]);

    const drawVectors = useCallback(
        (
            ctx: CanvasRenderingContext2D,
            toCanvasX: (v: number) => number,
            toCanvasY: (v: number) => number,
            previewLine: GraphLineSeg | null
        ) => {
            ctx.strokeStyle = '#2563eb';
            ctx.lineWidth = 2;
            paths.forEach((path) => {
                if (!path || path.length < 2) return;
                ctx.beginPath();
                path.forEach((point, index) => {
                    if (index === 0) ctx.moveTo(point.x, point.y);
                    else ctx.lineTo(point.x, point.y);
                });
                ctx.stroke();
            });

            lines.forEach((line) => {
                ctx.beginPath();
                ctx.moveTo(line.x1, line.y1);
                ctx.lineTo(line.x2, line.y2);
                ctx.stroke();
            });

            if (previewLine) {
                ctx.beginPath();
                ctx.moveTo(previewLine.x1, previewLine.y1);
                ctx.lineTo(previewLine.x2, previewLine.y2);
                ctx.stroke();
            }

            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            points.forEach((p) => {
                const cx = toCanvasX(p.x),
                    cy = toCanvasY(p.y),
                    size = 4;
                ctx.beginPath();
                ctx.moveTo(cx - size, cy - size);
                ctx.lineTo(cx + size, cy + size);
                ctx.moveTo(cx + size, cy - size);
                ctx.lineTo(cx - size, cy + size);
                ctx.stroke();
            });

            if (labels.length > 0) {
                ctx.fillStyle = '#111827';
                ctx.font = '12px sans-serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                labels.forEach((label) => {
                    const lx = toCanvasX(label.x);
                    const ly = toCanvasY(label.y);
                    ctx.fillText(label.text, lx + 6, ly - 6);
                });
            }
        },
        [points, lines, labels, paths]
    );

    const paint = useCallback(
        (previewLine: GraphLineSeg | null = null, sketchStroke: GraphPoint[] | null = null) => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const graphWidth = width - 2 * padding;
            const graphHeight = height - 2 * padding;
            const toCanvasX = (val: number) => padding + ((val - xMin) / (xMax - xMin)) * graphWidth;
            const toCanvasY = (val: number) => height - padding - ((val - yMin) / (yMax - yMin)) * graphHeight;

            if (bgDirtyRef.current) {
                renderStaticLayer();
                bgDirtyRef.current = false;
            }

            const bg = bgCanvasRef.current;
            if (bg) {
                ctx.clearRect(0, 0, width, height);
                ctx.drawImage(bg, 0, 0);
            } else {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, height);
            }

            drawVectors(ctx, toCanvasX, toCanvasY, previewLine);

            if (sketchStroke && sketchStroke.length > 0) {
                ctx.strokeStyle = '#16a34a';
                ctx.lineWidth = 2;
                ctx.beginPath();
                sketchStroke.forEach((point, index) => {
                    if (index === 0) ctx.moveTo(point.x, point.y);
                    else ctx.lineTo(point.x, point.y);
                });
                ctx.stroke();
            }
        },
        [drawVectors, renderStaticLayer, width, height, padding, xMin, xMax, yMin, yMax]
    );

    useEffect(() => {
        paint(null, null);
    }, [paint, points, lines, labels, paths]);

    const getGraphCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0, cx: 0, cy: 0 };
        const rect = canvas.getBoundingClientRect();
        const cx = e.clientX - rect.left,
            cy = e.clientY - rect.top;
        const graphWidth = width - 2 * padding,
            graphHeight = height - 2 * padding;
        return {
            x: ((cx - padding) / graphWidth) * (xMax - xMin) + xMin,
            y: ((height - padding - cy) / graphHeight) * (yMax - yMin) + yMin,
            cx,
            cy,
        };
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const coords = getGraphCoordinates(e);
        if (coords.cx < padding || coords.cx > width - padding || coords.cy < padding || coords.cy > height - padding)
            return;
        if (tool === 'point') {
            onChange({ ...state, points: [...points, { x: coords.x, y: coords.y }] });
        } else if (tool === 'line') {
            setIsDragging(true);
            setStartPoint({ cx: coords.cx, cy: coords.cy });
        } else if (tool === 'sketch') {
            setIsSketching(true);
            currentPathRef.current = [{ x: coords.cx, y: coords.cy }];
        } else if (tool === 'label') {
            const trimmed = labelText.trim();
            if (trimmed) onChange({ ...state, labels: [...labels, { x: coords.x, y: coords.y, text: trimmed }] });
        }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDragging || tool !== 'line' || !startPoint) return;
        const coords = getGraphCoordinates(e);
        paint({ x1: startPoint.cx, y1: startPoint.cy, x2: coords.cx, y2: coords.cy }, null);
    };

    const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (isDragging && tool === 'line' && startPoint) {
            const coords = getGraphCoordinates(e);
            onChange({ ...state, lines: [...lines, { x1: startPoint.cx, y1: startPoint.cy, x2: coords.cx, y2: coords.cy }] });
        }
        if (isSketching && tool === 'sketch') {
            if (currentPathRef.current.length > 1) {
                onChange({ ...state, paths: [...paths, currentPathRef.current] });
            }
        }
        setIsDragging(false);
        setIsSketching(false);
        setStartPoint(null);
        currentPathRef.current = [];
        paint(null, null);
    };

    const handleSketchMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isSketching || tool !== 'sketch') return;
        const coords = getGraphCoordinates(e);
        currentPathRef.current = [...currentPathRef.current, { x: coords.cx, y: coords.cy }];
        paint(null, currentPathRef.current);
    };

    const handleMouseLeave = () => {
        if (isSketching && tool === 'sketch' && currentPathRef.current.length > 1) {
            onChange({ ...state, paths: [...paths, currentPathRef.current] });
        }
        setIsDragging(false);
        setIsSketching(false);
        setStartPoint(null);
        currentPathRef.current = [];
        paint(null, null);
    };

    return (
        <TooltipProvider delayDuration={300}>
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 bg-muted/50 p-2 rounded-lg border border-border">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            aria-pressed={tool === 'point'}
                            aria-label="Add Point tool"
                            onClick={() => setTool('point')}
                            className={`p-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${tool === 'point' ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'}`}
                        >
                            <div className="flex items-center gap-1 text-xs font-bold">
                                <span className="text-lg">×</span> Point
                            </div>
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>Add Point</TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            aria-pressed={tool === 'line'}
                            aria-label="Add Line tool"
                            onClick={() => setTool('line')}
                            className={`p-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${tool === 'line' ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'}`}
                        >
                            <div className="flex items-center gap-1 text-xs font-bold">
                                <PenTool className="w-4 h-4" /> Line
                            </div>
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>Add Line</TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            aria-pressed={tool === 'sketch'}
                            aria-label="Sketch tool"
                            onClick={() => setTool('sketch')}
                            className={`p-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${tool === 'sketch' ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'}`}
                        >
                            <div className="flex items-center gap-1 text-xs font-bold">
                                <Pencil className="w-4 h-4" /> Sketch
                            </div>
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>Freehand Sketch</TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            aria-pressed={tool === 'label'}
                            aria-label="Add Label tool"
                            onClick={() => setTool('label')}
                            className={`p-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${tool === 'label' ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'}`}
                        >
                            <div className="flex items-center gap-1 text-xs font-bold">
                                <Type className="w-4 h-4" /> Label
                            </div>
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>Add Text Label</TooltipContent>
                </Tooltip>

                {tool === 'label' && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <input
                                type="text"
                                aria-label="Label text input"
                                value={labelText}
                                onChange={(e) => setLabelText(e.target.value)}
                                placeholder="Label text"
                                className="h-8 w-32 rounded border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </TooltipTrigger>
                        <TooltipContent>Text for label</TooltipContent>
                    </Tooltip>
                )}
                <div className="h-6 w-px bg-border mx-2"></div>
                {backgroundImage && onClearBackground && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                aria-label="Remove background image"
                                onClick={onClearBackground}
                                className="p-2 rounded hover:bg-muted text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                                <ImageOff className="w-4 h-4" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent>Remove figure background</TooltipContent>
                    </Tooltip>
                )}

                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            aria-label="Clear all canvas contents"
                            onClick={() => onChange(emptyState)}
                            className="p-2 rounded hover:bg-destructive/10 text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>Clear Canvas</TooltipContent>
                </Tooltip>
            </div>
            <div className="border border-border rounded-lg overflow-hidden shadow-inner bg-white self-start">
                <canvas
                    ref={canvasRef}
                    width={width}
                    height={height}
                    onMouseDown={handleMouseDown}
                    onMouseMove={(e) => {
                        handleMouseMove(e);
                        handleSketchMove(e);
                    }}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseLeave}
                    className="cursor-crosshair block"
                />
            </div>
        </div>
        </TooltipProvider>
    );
});
GraphCanvas.displayName = 'GraphCanvas';

export default GraphCanvas;
