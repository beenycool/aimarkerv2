'use client';

import React, { useState, useRef, useEffect, memo, useCallback } from 'react';
import { TableIcon, BarChart2, PenTool, Trash2, Calculator } from 'lucide-react';

// Math Keyboard Component
const MathKeyboard = memo(({ onInsert, isOpen, toggleOpen }) => {
    const symbols = ['²', '³', '½', '¼', '√', '∞', '×', '÷', '±', '≈', '≠', '≡', '≤', '≥', '°', '℃', '℉', 'µ', 'π', 'Ω', 'λ', 'Δ', 'Σ', '→', '←', '↔', '↑', '↓'];

    if (!isOpen) {
        return (
            <button onClick={toggleOpen} className="mt-2 text-xs font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition-colors">
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
                    <button key={s} onClick={() => onInsert(s)} className="h-8 bg-white rounded shadow-sm border border-slate-200 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 font-mono font-bold text-slate-700 transition-all active:scale-95">{s}</button>
                ))}
            </div>
        </div>
    );
});
MathKeyboard.displayName = 'MathKeyboard';

// Graph Canvas Component
const GraphCanvas = memo(({ config, value, onChange }) => {
    const canvasRef = useRef(null);
    const [tool, setTool] = useState('point');
    const [isDragging, setIsDragging] = useState(false);
    const [startPoint, setStartPoint] = useState(null);

    const state = value || { points: [], lines: [] };
    const xMin = config?.xMin ?? 0;
    const xMax = (config?.xMax ?? 10) > xMin ? (config?.xMax ?? 10) : xMin + 1;
    const yMin = config?.yMin ?? 0;
    const yMax = (config?.yMax ?? 10) > yMin ? (config?.yMax ?? 10) : yMin + 1;
    const xLabel = config?.xLabel ?? "X Axis";
    const yLabel = config?.yLabel ?? "Y Axis";
    const width = 600, height = 400, padding = 50;

    const draw = useCallback(() => {
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
        state.lines.forEach(line => { ctx.beginPath(); ctx.moveTo(line.x1, line.y1); ctx.lineTo(line.x2, line.y2); ctx.stroke(); });

        // Points
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        state.points.forEach(p => {
            const cx = toCanvasX(p.x), cy = toCanvasY(p.y), size = 4;
            ctx.beginPath(); ctx.moveTo(cx - size, cy - size); ctx.lineTo(cx + size, cy + size);
            ctx.moveTo(cx + size, cy - size); ctx.lineTo(cx - size, cy + size); ctx.stroke();
        });
    }, [state, xMin, xMax, yMin, yMax, xLabel, yLabel]);

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
        if (tool === 'point') { onChange({ ...state, points: [...state.points, { x: coords.x, y: coords.y }] }); }
        else if (tool === 'line') { setIsDragging(true); setStartPoint({ cx: coords.cx, cy: coords.cy }); }
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
            onChange({ ...state, lines: [...state.lines, { x1: startPoint.cx, y1: startPoint.cy, x2: coords.cx, y2: coords.cy }] });
        }
        setIsDragging(false); setStartPoint(null); draw();
    };

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                <button onClick={() => setTool('point')} className={`p-2 rounded ${tool === 'point' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-200 text-slate-600'}`}>
                    <div className="flex items-center gap-1 text-xs font-bold"><span className="text-lg">×</span> Point</div>
                </button>
                <button onClick={() => setTool('line')} className={`p-2 rounded ${tool === 'line' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-200 text-slate-600'}`}>
                    <div className="flex items-center gap-1 text-xs font-bold"><PenTool className="w-4 h-4" /> Line</div>
                </button>
                <div className="h-6 w-px bg-slate-300 mx-2"></div>
                <button onClick={() => onChange({ points: [], lines: [] })} className="p-2 rounded hover:bg-red-100 text-red-600"><Trash2 className="w-4 h-4" /></button>
            </div>
            <div className="border border-slate-300 rounded-lg overflow-hidden shadow-inner bg-white self-start">
                <canvas ref={canvasRef} width={width} height={height} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={() => setIsDragging(false)} className="cursor-crosshair block" />
            </div>
        </div>
    );
});
GraphCanvas.displayName = 'GraphCanvas';

/**
 * AdaptiveInput - Renders the appropriate input type based on question type
 * IMPORTANT: Use key={question.id} when rendering this component to prevent state bleeding
 */
const AdaptiveInput = memo(({ type, options, listCount, tableStructure, graphConfig, value, onChange }) => {
    const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

    const handleSymbolInsert = useCallback((symbol) => {
        onChange((value || "") + symbol);
    }, [value, onChange]);

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
        const handleListChange = (idx, text) => { const newList = [...listValues]; newList[idx] = text; onChange(newList); };
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
        const handleCellChange = (rowIndex, colIndex, val) => { const newData = currentData.map(r => [...r]); newData[rowIndex][colIndex] = val; onChange(newData); };
        return (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider"><TableIcon className="w-4 h-4" /> Table Input</div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-50/50"><tr>{headers.map((h, i) => (<th key={i} className="px-6 py-3 border-b border-slate-200 min-w-[150px]">{h}</th>))}</tr></thead>
                        <tbody>
                            {currentData.map((row, rIndex) => (
                                <tr key={rIndex} className="bg-white border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                                    {row.map((cell, cIndex) => {
                                        const isPrefilled = initialData.length > 0 && initialData[rIndex] && initialData[rIndex][cIndex] !== null;
                                        return (
                                            <td key={cIndex} className="p-0 border-r border-slate-100 last:border-0 relative">
                                                {isPrefilled ? (<div className="w-full h-full px-6 py-4 bg-slate-50 text-slate-500 font-medium select-none">{initialData[rIndex][cIndex]}</div>) : (
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
        );
    }

    if (type === 'long_text') {
        return (
            <div className="relative">
                <div className="absolute top-2 right-2 bg-slate-100 text-xs px-2 py-1 rounded text-slate-500 font-mono">LaTeX Supported</div>
                <textarea className="w-full h-48 p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none font-serif leading-relaxed" placeholder="Type your answer here..." value={value || ''} onChange={(e) => onChange(e.target.value)} />
                <MathKeyboard onInsert={handleSymbolInsert} isOpen={isKeyboardOpen} toggleOpen={() => setIsKeyboardOpen(!isKeyboardOpen)} />
            </div>
        );
    }

    return (
        <div>
            <input type="text" className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="Type your answer here..." value={value || ''} onChange={(e) => onChange(e.target.value)} />
            <MathKeyboard onInsert={handleSymbolInsert} isOpen={isKeyboardOpen} toggleOpen={() => setIsKeyboardOpen(!isKeyboardOpen)} />
        </div>
    );
});

AdaptiveInput.displayName = 'AdaptiveInput';
export default AdaptiveInput;
