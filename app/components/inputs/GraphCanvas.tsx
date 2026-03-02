// @ts-nocheck
import React, { memo, useRef, useState, useEffect, useCallback } from 'react';
import { PenTool, Pencil, Type, ImageOff, Trash2 } from 'lucide-react';

const GraphCanvas = memo(({ config, value, onChange, backgroundImage, onClearBackground }) => {
    const canvasRef = useRef(null);
    const [tool, setTool] = useState('point');
    const [isDragging, setIsDragging] = useState(false);
    const [startPoint, setStartPoint] = useState(null);
    const [isSketching, setIsSketching] = useState(false);
    const currentPathRef = useRef([]);
    const [labelText, setLabelText] = useState('');
    const [background, setBackground] = useState(null);

    const state = value || { points: [], lines: [], labels: [], paths: [] };
    const points = state.points || [];
    const lines = state.lines || [];
    const labels = state.labels || [];
    const paths = state.paths || [];
    const xMin = config?.xMin ?? 0;
    const xMax = (config?.xMax ?? 10) > xMin ? (config?.xMax ?? 10) : xMin + 1;
    const yMin = config?.yMin ?? 0;
    const yMax = (config?.yMax ?? 10) > yMin ? (config?.yMax ?? 10) : yMin + 1;
    const xLabel = config?.xLabel ?? "X Axis";
    const yLabel = config?.yLabel ?? "Y Axis";
    const width = 600, height = 400, padding = 50;

    useEffect(() => {
        if (!backgroundImage) {
            setBackground(null);
            return;
        }
        const img = new Image();
        img.onload = () => setBackground(img);
        img.src = backgroundImage;
    }, [backgroundImage]);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        // Use a known background color for the canvas content itself so it's readable
        // Graphs usually need white/light background unless we invert all colors.
        // Let's keep it white for clarity but maybe careful with text.
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        const graphWidth = width - 2 * padding;
        const graphHeight = height - 2 * padding;
        const toCanvasX = (val) => padding + ((val - xMin) / (xMax - xMin)) * graphWidth;
        const toCanvasY = (val) => height - padding - ((val - yMin) / (yMax - yMin)) * graphHeight;

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

        // Grid
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = xMin; i <= xMax; i += (xMax - xMin) / 10) { const x = toCanvasX(i); ctx.moveTo(x, padding); ctx.lineTo(x, height - padding); }
        for (let i = yMin; i <= yMax; i += (yMax - yMin) / 10) { const y = toCanvasY(i); ctx.moveTo(padding, y); ctx.lineTo(width - padding, y); }
        ctx.stroke();

        // Axes
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding, padding); ctx.lineTo(padding, height - padding);
        ctx.moveTo(padding, height - padding); ctx.lineTo(width - padding, height - padding);
        ctx.stroke();

        // Labels
        ctx.fillStyle = '#000';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(xLabel, width / 2, height - 10);
        ctx.save(); ctx.translate(15, height / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(yLabel, 0, 0); ctx.restore();

        // Lines
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2;
        paths.forEach(path => {
            if (!path || path.length < 2) return;
            ctx.beginPath();
            path.forEach((point, index) => {
                if (index === 0) ctx.moveTo(point.x, point.y);
                else ctx.lineTo(point.x, point.y);
            });
            ctx.stroke();
        });

        lines.forEach(line => { ctx.beginPath(); ctx.moveTo(line.x1, line.y1); ctx.lineTo(line.x2, line.y2); ctx.stroke(); });

        // Points
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        points.forEach(p => {
            const cx = toCanvasX(p.x), cy = toCanvasY(p.y), size = 4;
            ctx.beginPath(); ctx.moveTo(cx - size, cy - size); ctx.lineTo(cx + size, cy + size);
            ctx.moveTo(cx + size, cy - size); ctx.lineTo(cx - size, cy + size); ctx.stroke();
        });

        if (labels.length > 0) {
            ctx.fillStyle = '#111827';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            labels.forEach(label => {
                const lx = toCanvasX(label.x);
                const ly = toCanvasY(label.y);
                ctx.fillText(label.text, lx + 6, ly - 6);
            });
        }
    }, [points, lines, labels, paths, xMin, xMax, yMin, yMax, xLabel, yLabel, background]);

    useEffect(() => { draw(); }, [draw]);

    const getGraphCoordinates = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
        const graphWidth = width - 2 * padding, graphHeight = height - 2 * padding;
        return { x: ((cx - padding) / graphWidth) * (xMax - xMin) + xMin, y: ((height - padding - cy) / graphHeight) * (yMax - yMin) + yMin, cx, cy };
    };

    const handleMouseDown = (e) => {
        const coords = getGraphCoordinates(e);
        if (coords.cx < padding || coords.cx > width - padding || coords.cy < padding || coords.cy > height - padding) return;
        if (tool === 'point') { onChange({ ...state, points: [...points, { x: coords.x, y: coords.y }] }); }
        else if (tool === 'line') { setIsDragging(true); setStartPoint({ cx: coords.cx, cy: coords.cy }); }
        else if (tool === 'sketch') { setIsSketching(true); currentPathRef.current = [{ x: coords.cx, y: coords.cy }]; }
        else if (tool === 'label') {
            const trimmed = labelText.trim();
            if (trimmed) onChange({ ...state, labels: [...labels, { x: coords.x, y: coords.y, text: trimmed }] });
        }
    };

    const handleMouseMove = (e) => {
        if (!isDragging || tool !== 'line') return;
        const coords = getGraphCoordinates(e);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        draw();
        ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 2; ctx.beginPath();
        ctx.moveTo(startPoint.cx, startPoint.cy); ctx.lineTo(coords.cx, coords.cy); ctx.stroke();
    };

    const handleMouseUp = (e) => {
        if (isDragging && tool === 'line') {
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
        draw();
    };

    const handleSketchMove = (e) => {
        if (!isSketching || tool !== 'sketch') return;
        const coords = getGraphCoordinates(e);
        currentPathRef.current = [...currentPathRef.current, { x: coords.cx, y: coords.cy }];
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        draw();
        ctx.strokeStyle = '#16a34a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        currentPathRef.current.forEach((point, index) => {
            if (index === 0) ctx.moveTo(point.x, point.y);
            else ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
    };

    const handleMouseLeave = () => {
        if (isSketching && tool === 'sketch' && currentPathRef.current.length > 1) {
            onChange({ ...state, paths: [...paths, currentPathRef.current] });
        }
        setIsDragging(false);
        setIsSketching(false);
        setStartPoint(null);
        currentPathRef.current = [];
        draw();
    };

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 bg-muted/50 p-2 rounded-lg border border-border">
                <button aria-label="Add Point tool" title="Add Point" onClick={() => setTool('point')} className={`p-2 rounded ${tool === 'point' ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'}`}>
                    <div className="flex items-center gap-1 text-xs font-bold"><span className="text-lg">×</span> Point</div>
                </button>
                <button aria-label="Add Line tool" title="Add Line" onClick={() => setTool('line')} className={`p-2 rounded ${tool === 'line' ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'}`}>
                    <div className="flex items-center gap-1 text-xs font-bold"><PenTool className="w-4 h-4" /> Line</div>
                </button>
                <button aria-label="Sketch tool" title="Freehand Sketch" onClick={() => setTool('sketch')} className={`p-2 rounded ${tool === 'sketch' ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'}`}>
                    <div className="flex items-center gap-1 text-xs font-bold"><Pencil className="w-4 h-4" /> Sketch</div>
                </button>
                <button aria-label="Add Label tool" title="Add Text Label" onClick={() => setTool('label')} className={`p-2 rounded ${tool === 'label' ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'}`}>
                    <div className="flex items-center gap-1 text-xs font-bold"><Type className="w-4 h-4" /> Label</div>
                </button>
                {tool === 'label' && (
                    <input
                        type="text"
                        aria-label="Label text input"
                        title="Text for label"
                        value={labelText}
                        onChange={(e) => setLabelText(e.target.value)}
                        placeholder="Label text"
                        className="h-8 w-32 rounded border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                )}
                <div className="h-6 w-px bg-border mx-2"></div>
                {backgroundImage && onClearBackground && (
                    <button aria-label="Remove background image" onClick={onClearBackground} className="p-2 rounded hover:bg-muted text-muted-foreground" title="Remove figure background">
                        <ImageOff className="w-4 h-4" />
                    </button>
                )}
                <button aria-label="Clear all canvas contents" title="Clear Canvas" onClick={() => onChange({ points: [], lines: [], labels: [], paths: [] })} className="p-2 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="w-4 h-4" /></button>
            </div>
            <div className="border border-border rounded-lg overflow-hidden shadow-inner bg-white self-start">
                <canvas ref={canvasRef} width={width} height={height} onMouseDown={handleMouseDown} onMouseMove={(e) => { handleMouseMove(e); handleSketchMove(e); }} onMouseUp={handleMouseUp} onMouseLeave={handleMouseLeave} className="cursor-crosshair block" />
            </div>
        </div>
    );
});
GraphCanvas.displayName = 'GraphCanvas';

export default GraphCanvas;
