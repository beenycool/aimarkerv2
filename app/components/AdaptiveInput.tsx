'use client';

import React, { useState, useRef, useEffect, memo, useCallback } from 'react';
import { TableIcon, BarChart2 } from 'lucide-react';
import MathKeyboard from './inputs/MathKeyboard';
import GraphCanvas from './inputs/GraphCanvas';

/**
 * AdaptiveInput - Renders the appropriate input type based on question type
 * IMPORTANT: Use key={question.id} when rendering this component to prevent state bleeding
 */
const AdaptiveInput = memo(({ type, options, listCount, tableStructure, graphConfig, value, onChange, graphFigure }) => {
    const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
    const [figureBackground, setFigureBackground] = useState(null);

    const handleSymbolInsert = useCallback((symbol) => {
        onChange((value || "") + symbol);
    }, [value, onChange]);

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
                {options.map((opt, idx) => (
                    <label key={idx} className={`flex items-center p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-all ${value === opt ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-border'}`}>
                        <input type="radio" name="mcq" className="w-4 h-4 text-primary focus:ring-primary" checked={value === opt} onChange={() => onChange(opt)} />
                        <span className="ml-3 text-foreground font-medium">{opt}</span>
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
                        <span className="text-muted-foreground font-bold mr-3 w-6 text-right">{idx + 1})</span>
                        <input type="text" className="flex-1 p-2 border border-input bg-background rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none" value={listValues[idx] || ''} onChange={(e) => handleListChange(idx, e.target.value)} placeholder={`Point ${idx + 1}`} />
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
            <div className="border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="bg-muted border-b border-border px-4 py-2 flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider"><TableIcon className="w-4 h-4" /> Table Input</div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-muted/50"><tr>{headers.map((h, i) => (<th key={i} className="px-6 py-3 border-b border-border min-w-[150px]">{h}</th>))}</tr></thead>
                        <tbody>
                            {currentData.map((row, rIndex) => (
                                <tr key={rIndex} className="bg-card border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                                    {row.map((cell, cIndex) => {
                                        const isPrefilled = initialData.length > 0 && initialData[rIndex] && initialData[rIndex][cIndex] !== null;
                                        return (
                                            <td key={cIndex} className="p-0 border-r border-border last:border-0 relative">
                                                {isPrefilled ? (<div className="w-full h-full px-6 py-4 bg-muted/40 text-muted-foreground font-medium select-none">{initialData[rIndex][cIndex]}</div>) : (
                                                    <input type="text" className="w-full h-full px-6 py-4 bg-transparent outline-none focus:ring-2 focus:ring-inset focus:ring-primary text-foreground placeholder-muted-foreground/50" value={cell} onChange={(e) => handleCellChange(rIndex, cIndex, e.target.value)} placeholder="Type..." />
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
                    value={value}
                    onChange={onChange}
                    backgroundImage={figureBackground}
                    onClearBackground={() => setFigureBackground(null)}
                />
            </div>
        );
    }

    if (type === 'long_text') {
        return (
            <div className="relative">

                <textarea className="w-full h-48 p-4 border border-input bg-background rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none resize-none font-serif leading-relaxed text-foreground" placeholder="Type your answer here..." value={value || ''} onChange={(e) => onChange(e.target.value)} />
                <MathKeyboard onInsert={handleSymbolInsert} isOpen={isKeyboardOpen} toggleOpen={() => setIsKeyboardOpen(!isKeyboardOpen)} />
            </div>
        );
    }

    return (
        <div>
            <input type="text" className="w-full p-3 border border-input bg-background rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-foreground" placeholder="Type your answer here..." value={value || ''} onChange={(e) => onChange(e.target.value)} />
            <MathKeyboard onInsert={handleSymbolInsert} isOpen={isKeyboardOpen} toggleOpen={() => setIsKeyboardOpen(!isKeyboardOpen)} />
        </div>
    );
});

AdaptiveInput.displayName = 'AdaptiveInput';
export default AdaptiveInput;
