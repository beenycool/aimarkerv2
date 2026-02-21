'use client';

import React, { useState, useRef, useEffect, memo, useCallback } from 'react';
import { TableIcon, BarChart2, PenTool, Trash2, Calculator, Pencil, Type, ImageOff } from 'lucide-react';

// Type definitions
interface MathKeyboardProps {
  onInsert: (symbol: string) => void;
  isOpen: boolean;
  toggleOpen: () => void;
}

interface GraphCanvasProps {
  config?: {
    xMin?: number;
    xMax?: number;
    yMin?: number;
    yMax?: number;
    xLabel?: string;
    yLabel?: string;
  };
  value?: {
    points?: Array<{ x: number; y: number }>;
    lines?: Array<{ x1: number; y1: number; x2: number; y2: number }>;
    labels?: Array<{ x: number; y: number; text: string }>;
    paths?: Array<Array<{ x: number; y: number }>>;
  };
  onChange: (value: any) => void;
  backgroundImage?: string;
  onClearBackground?: () => void;
}

interface AdaptiveInputProps {
  type: "table" | "list" | "multiple_choice" | "long_text" | "short_text" | "graph_drawing";
  options?: string[];
  listCount?: number;
  tableStructure?: {
    headers?: string[];
    rows?: number;
    initialData?: (string | null)[][];
  };
  graphConfig?: {
    xMin?: number;
    xMax?: number;
    yMin?: number;
    yMax?: number;
    xLabel?: string;
    yLabel?: string;
  };
  value: any;
  onChange: (val: any) => void;
  graphFigure?: string;
}

// Math Keyboard Component
const MathKeyboard = memo(({ onInsert, isOpen, toggleOpen }: MathKeyboardProps) => {
    const symbols = ['²', '³', '½', '¼', '√', '∞', '×', '÷', '±', '≈', '≠', '≡', '≤', '≥', '°', '℃', '℉', 'µ', 'π', 'Ω', 'λ', 'Δ', 'Σ', '→', '←', '↔', '↑', '↓'];

    if (!isOpen) {
        return (
            <button onClick={toggleOpen} className="mt-2 text-xs font-bold text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
                <Calculator className="w-3 h-3" /> Show Math Keyboard
            </button>
        );
    }

    return (
        <div className="mt-2 animate-in slide-in-from-top-2">
            <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-muted-foreground">Math Symbols</span>
                <button onClick={toggleOpen} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
            </div>
            <div className="grid grid-cols-7 gap-1 p-2 bg-muted/50 rounded-lg border border-border">
                {symbols.map(s => (
                    <button key={s} onClick={() => onInsert(s)} className="p-1 hover:bg-background hover:text-foreground rounded text-center text-sm font-medium transition-colors">
                        {s}
                    </button>
                ))}
            </div>
        </div>
    );
});
MathKeyboard.displayName = 'MathKeyboard';

const GraphCanvas = memo(({ config, value, onChange, backgroundImage, onClearBackground }: GraphCanvasProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [background, setBackground] = useState<HTMLImageElement | null>(null);
    const [tool, setTool] = useState('point'); // point, line, sketch, label
    const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
    const [labelText, setLabelText] = useState("");

    const points = value?.points || [];
    const lines = value?.lines || [];
    const labels = value?.labels || [];
    const paths = value?.paths || []; // array of point arrays

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
        if (!ctx) return;
        // Use a known background color for the canvas content itself so it's readable
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        const graphWidth = width - 2 * padding;
        const graphHeight = height - 2 * padding;
        const toCanvasX = (val: number) => padding + ((val - xMin) / (xMax - xMin)) * graphWidth;
        const toCanvasY = (val: number) => height - padding - ((val - yMin) / (yMax - yMin)) * graphHeight;

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

        lines.forEach(line => { ctx.beginPath(); ctx.moveTo(toCanvasX(line.x1), toCanvasY(line.y1)); ctx.lineTo(toCanvasX(line.x2), toCanvasY(line.y2)); ctx.stroke(); });

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
                ctx.fillText(label.text, toCanvasX(label.x), toCanvasY(label.y));
            });
        }

    }, [points, lines, labels, paths, xMin, xMax, yMin, yMax, xLabel, yLabel, background]);

    useEffect(() => {
        draw();
    }, [draw]);

    const getGraphCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0, valX: 0, valY: 0 };
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        const graphWidth = width - 2 * padding;
        const graphHeight = height - 2 * padding;
        const valX = xMin + ((x - padding) / graphWidth) * (xMax - xMin);
        const valY = yMin + ((height - padding - y) / graphHeight) * (yMax - yMin);
        return { x, y, valX, valY }; // Return raw canvas coords (x,y) and graph values (valX, valY)
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const { x, y, valX, valY } = getGraphCoordinates(e);
        if (x < padding || x > width - padding || y < padding || y > height - padding) return;

        if (tool === 'point') {
            onChange({ ...value, points: [...points, { x: valX, y: valY }] });
        } else if (tool === 'line') {
            setStartPoint({ x: valX, y: valY });
            setIsDrawing(true);
        } else if (tool === 'sketch') {
            setIsDrawing(true);
            onChange({ ...value, paths: [...paths, [{ x, y }]] });
        } else if (tool === 'label' && labelText) {
             onChange({ ...value, labels: [...labels, { x: valX, y: valY, text: labelText }] });
             setLabelText("");
        }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const { x, y, valX, valY } = getGraphCoordinates(e);

        if (tool === 'sketch') {
            const currentPath = paths[paths.length - 1];
            // Only add point if moved enough to avoid spam
            const last = currentPath[currentPath.length - 1];
            if (Math.abs(x - last.x) > 2 || Math.abs(y - last.y) > 2) {
                const newPaths = [...paths];
                newPaths[newPaths.length - 1] = [...currentPath, { x, y }];
                onChange({ ...value, paths: newPaths });
            }
        } else if (tool === 'line' && startPoint) {
            // Draw temporary preview line for better UX
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    draw(); // Redraw base state
                    // Draw temporary line from start point to current position
                    const startX = padding + ((startPoint.x - xMin) / (xMax - xMin)) * (width - 2 * padding);
                    const startY = height - padding - ((startPoint.y - yMin) / (yMax - yMin)) * (height - 2 * padding);
                    ctx.strokeStyle = '#2563eb';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(startX, startY);
                    ctx.lineTo(x, y);
                    ctx.stroke();
                }
            }
        }
    };

    const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        setIsDrawing(false);
        const { valX, valY } = getGraphCoordinates(e);

        if (tool === 'line' && startPoint) {
            onChange({ ...value, lines: [...lines, { x1: startPoint.x, y1: startPoint.y, x2: valX, y2: valY }] });
            setStartPoint(null);
        }
    };

    const handleMouseLeave = () => {
        if (isDrawing) setIsDrawing(false);
    };

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 bg-muted/50 p-2 rounded-lg border border-border">
                <button onClick={() => setTool('point')} className={`p-2 rounded ${tool === 'point' ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'}`}>
                    <div className="flex items-center gap-1 text-xs font-bold"><span className="text-lg">×</span> Point</div>
                </button>
                <button onClick={() => setTool('line')} className={`p-2 rounded ${tool === 'line' ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'}`}>
                    <div className="flex items-center gap-1 text-xs font-bold"><PenTool className="w-4 h-4" /> Line</div>
                </button>
                <button onClick={() => setTool('sketch')} className={`p-2 rounded ${tool === 'sketch' ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'}`}>
                    <div className="flex items-center gap-1 text-xs font-bold"><Pencil className="w-4 h-4" /> Sketch</div>
                </button>
                <button onClick={() => setTool('label')} className={`p-2 rounded ${tool === 'label' ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'}`}>
                    <div className="flex items-center gap-1 text-xs font-bold"><Type className="w-4 h-4" /> Label</div>
                </button>
                {tool === 'label' && (
                    <input
                        type="text"
                        value={labelText}
                        onChange={(e) => setLabelText(e.target.value)}
                        placeholder="Label text"
                        className="h-8 w-32 rounded border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                )}
                <div className="h-6 w-px bg-border mx-2"></div>
                {backgroundImage && onClearBackground && (
                    <button onClick={onClearBackground} className="p-2 rounded hover:bg-muted text-muted-foreground" title="Remove figure background">
                        <ImageOff className="w-4 h-4" />
                    </button>
                )}
                <button onClick={() => onChange({ points: [], lines: [], labels: [], paths: [] })} className="p-2 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="w-4 h-4" /></button>
            </div>
            <div className="border border-border rounded-lg overflow-hidden shadow-inner bg-white self-start">
                <canvas ref={canvasRef} width={width} height={height} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseLeave} className="cursor-crosshair block" />
            </div>
        </div>
    );
});
GraphCanvas.displayName = 'GraphCanvas';

/**
 * AdaptiveInput - Renders the appropriate input type based on question type
 * IMPORTANT: Use key={question.id} when rendering this component to prevent state bleeding
 */
const AdaptiveInput = memo(({ type, options, listCount, tableStructure, graphConfig, value, onChange, graphFigure }: AdaptiveInputProps) => {
    const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
    const [figureBackground, setFigureBackground] = useState<string | null>(null);

    // Local state for debouncing
    const [localValue, setLocalValue] = useState(value);
    const lastPropValue = useRef(value);
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);

    // Sync local state if external prop changes (and it's not our own update)
    useEffect(() => {
        if (value !== lastPropValue.current) {
            setLocalValue(value);
            lastPropValue.current = value;
        }
    }, [value]);

    // Handle local change and debounce propagation
    const handleLocalChange = useCallback((newValue: any) => {
        setLocalValue(newValue);

        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        debounceTimer.current = setTimeout(() => {
            lastPropValue.current = newValue; // Update ref so we don't overwrite ourselves
            onChange(newValue);
        }, 1000); // 1 second debounce
    }, [onChange]);

    // Handle blur to commit immediately
    const handleBlur = useCallback(() => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        if (localValue !== lastPropValue.current) {
             lastPropValue.current = localValue;
             onChange(localValue);
        }
    }, [localValue, onChange]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
        };
    }, []);

    const handleSymbolInsert = useCallback((symbol: string) => {
        handleLocalChange((localValue || "") + symbol);
    }, [localValue, handleLocalChange]);

    useEffect(() => {
        if (!graphFigure) {
            setFigureBackground(null);
            return;
        }
        setFigureBackground(graphFigure);
    }, [graphFigure]);

    if (type === 'multiple_choice') {
        return (
            <div className="space-y-2">
                {options?.map((opt, idx) => (
                    <label key={idx} className={`flex items-center p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-all ${localValue === opt ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-border'}`}>
                        <input type="radio" name="mcq" className="w-4 h-4 text-primary focus:ring-primary" checked={localValue === opt} onChange={() => handleLocalChange(opt)} />
                        <span className="ml-3 text-foreground font-medium">{opt}</span>
                    </label>
                ))}
            </div>
        );
    }

    if (type === 'list') {
        const listValues = Array.isArray(localValue) ? localValue : Array(listCount).fill('');
        const handleListChange = (idx: number, text: string) => { const newList = [...listValues]; newList[idx] = text; handleLocalChange(newList); };
        return (
            <div className="space-y-3">
                {Array.from({ length: listCount || 0 }).map((_, idx) => (
                    <div key={idx} className="flex items-center">
                        <span className="text-muted-foreground font-bold mr-3 w-6 text-right">{idx + 1})</span>
                        <input type="text" className="flex-1 p-2 border border-input bg-background rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none" value={listValues[idx] || ''} onChange={(e) => handleListChange(idx, e.target.value)} onBlur={handleBlur} placeholder={`Point ${idx + 1}`} />
                    </div>
                ))}
            </div>
        );
    }

    if (type === 'table') {
        const headers = tableStructure?.headers || ['Column 1', 'Column 2'];
        const initialData = tableStructure?.initialData || [];
        const rowCount = initialData.length > 0 ? initialData.length : (tableStructure?.rows || 3);
        const currentData = Array.isArray(localValue) ? localValue : (initialData.length > 0 ? initialData.map(row => row.map(cell => cell === null ? '' : cell)) : Array(rowCount).fill(null).map(() => Array(headers.length).fill('')));
        const handleCellChange = (rowIndex: number, colIndex: number, val: string) => { const newData = currentData.map(r => [...r]); newData[rowIndex][colIndex] = val; handleLocalChange(newData); };
        return (
            <div className="border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="bg-muted border-b border-border px-4 py-2 flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider"><TableIcon className="w-4 h-4" /> Table Input</div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-muted/50"><tr>{headers.map((h, i) => (<th key={i} className="px-6 py-3 border-b border-border min-w-[150px]">{h}</th>))}</tr></thead>
                        <tbody>
                            {currentData.map((row, rIndex) => (
                                <tr key={rIndex} className="bg-card border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                                    {row.map((cell: string, cIndex: number) => {
                                        const isPrefilled = initialData.length > 0 && initialData[rIndex] && initialData[rIndex][cIndex] !== null;
                                        return (
                                            <td key={cIndex} className="p-0 border-r border-border last:border-0 relative">
                                                {isPrefilled ? (<div className="w-full h-full px-6 py-4 bg-muted/40 text-muted-foreground font-medium select-none">{initialData[rIndex][cIndex]}</div>) : (
                                                    <input type="text" className="w-full h-full px-6 py-4 bg-transparent outline-none focus:ring-2 focus:ring-inset focus:ring-primary text-foreground placeholder-muted-foreground/50" value={cell} onChange={(e) => handleCellChange(rIndex, cIndex, e.target.value)} onBlur={handleBlur} placeholder="Type..." />
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
            <div className="bg-card p-4 rounded-xl border border-border">
                <div className="mb-2 flex items-center gap-2 text-primary font-bold text-sm"><BarChart2 className="w-4 h-4" /> Interactive Graph Paper</div>
                <GraphCanvas
                    config={graphConfig}
                    value={localValue}
                    onChange={handleLocalChange}
                    backgroundImage={figureBackground || undefined}
                    onClearBackground={() => setFigureBackground(null)}
                />
            </div>
        );
    }

    if (type === 'long_text') {
        return (
            <div className="relative">

                <textarea className="w-full h-48 p-4 border border-input bg-background rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none resize-none font-serif leading-relaxed text-foreground" placeholder="Type your answer here..." value={localValue || ''} onChange={(e) => handleLocalChange(e.target.value)} onBlur={handleBlur} />
                <MathKeyboard onInsert={handleSymbolInsert} isOpen={isKeyboardOpen} toggleOpen={() => setIsKeyboardOpen(!isKeyboardOpen)} />
            </div>
        );
    }

    return (
        <div>
            <input type="text" className="w-full p-3 border border-input bg-background rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-foreground" placeholder="Type your answer here..." value={localValue || ''} onChange={(e) => handleLocalChange(e.target.value)} onBlur={handleBlur} />
            <MathKeyboard onInsert={handleSymbolInsert} isOpen={isKeyboardOpen} toggleOpen={() => setIsKeyboardOpen(!isKeyboardOpen)} />
        </div>
    );
});

AdaptiveInput.displayName = 'AdaptiveInput';
export default AdaptiveInput;
