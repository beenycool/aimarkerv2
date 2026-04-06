'use client';

import React, { useState, useId, memo, useCallback, useMemo } from 'react';
import { TableIcon, BarChart2 } from 'lucide-react';
import MathKeyboard from './inputs/MathKeyboard';
import GraphCanvas from './inputs/GraphCanvas';
import type { GraphDrawingValue } from './inputs/graphDrawingTypes';

export type AdaptiveInputValue = string | string[] | string[][] | GraphDrawingValue;

interface TableStructure {
    headers?: string[];
    initialData?: (string | null)[][];
    rows?: number;
}

interface GraphConfig {
    type?: string;
    width?: number;
    height?: number;
    gridSize?: number;
    showAxes?: boolean;
    xMin?: number;
    xMax?: number;
    yMin?: number;
    yMax?: number;
    xLabel?: string;
    yLabel?: string;
}

interface AdaptiveInputProps {
    type: string;
    options?: string[];
    listCount?: number;
    tableStructure?: TableStructure;
    graphConfig?: GraphConfig;
    value: AdaptiveInputValue;
    onChange: (value: AdaptiveInputValue) => void;
    graphFigure?: string | null;
    /** Called when the student clears the figure background (sync with parent state). */
    onClearGraphFigure?: () => void;
    /** Shown as `<legend>` for multiple-choice groups (e.g. question stem) for screen readers. */
    multipleChoiceLegend?: string;
}

const emptyGraph: GraphDrawingValue = { points: [], lines: [], labels: [], paths: [] };

function normalizeGraphValue(v: AdaptiveInputValue): GraphDrawingValue {
    if (v && typeof v === 'object' && !Array.isArray(v) && 'points' in v) {
        const g = v as GraphDrawingValue;
        return {
            points: g.points || [],
            lines: g.lines || [],
            labels: g.labels || [],
            paths: g.paths || [],
        };
    }
    return { ...emptyGraph };
}

/**
 * AdaptiveInput - Renders the appropriate input type based on question type
 * IMPORTANT: Use key={question.id} when rendering this component to prevent state bleeding
 */
const AdaptiveInput = memo(
    ({
        type,
        options,
        listCount,
        tableStructure,
        graphConfig,
        value,
        onChange,
        graphFigure,
        onClearGraphFigure,
        multipleChoiceLegend,
    }: AdaptiveInputProps) => {
        const radioGroupId = useId();
        const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

        const normalizedGraph = useMemo(() => normalizeGraphValue(value), [value]);

        const handleSymbolInsert = useCallback(
            (symbol: string) => {
                const current = typeof value === 'string' ? value : '';
                onChange(current + symbol);
            },
            [value, onChange]
        );

        if (type === 'multiple_choice') {
            const legendText =
                (multipleChoiceLegend || '').replace(/\*\*/g, '').trim() || 'Choose one answer';
            return (
                <fieldset className="space-y-2 border-0 p-0 m-0">
                    <legend className="sr-only">{legendText}</legend>
                    {(options || []).map((opt, idx) => (
                        <label
                            key={idx}
                            className={`flex items-center p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-all ${value === opt ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-border'}`}
                        >
                            <input
                                type="radio"
                                name={`mcq-${radioGroupId}`}
                                className="w-4 h-4 text-primary focus:ring-primary"
                                checked={value === opt}
                                onChange={() => onChange(opt)}
                            />
                            <span className="ml-3 text-foreground font-medium">{opt}</span>
                        </label>
                    ))}
                </fieldset>
            );
        }

        if (type === 'list') {
            const n = listCount ?? 1;
            const listValues =
                Array.isArray(value) && value.every((x) => typeof x === 'string')
                    ? (value as string[])
                    : Array(n).fill('');
            const handleListChange = (idx: number, text: string) => {
                const newList = [...listValues];
                newList[idx] = text;
                onChange(newList);
            };
            return (
                <div className="space-y-3">
                    {Array.from({ length: n }).map((_, idx) => (
                        <div key={idx} className="flex items-center">
                            <span className="text-muted-foreground font-bold mr-3 w-6 text-right">{idx + 1})</span>
                            <input
                                type="text"
                                aria-label={`Point ${idx + 1}`}
                                className="flex-1 p-2 border border-input bg-background rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                                value={listValues[idx] || ''}
                                onChange={(e) => handleListChange(idx, e.target.value)}
                                placeholder={`Point ${idx + 1}`}
                            />
                        </div>
                    ))}
                </div>
            );
        }

        if (type === 'table') {
            const headers = tableStructure?.headers || ['Column 1', 'Column 2'];
            const initialData = tableStructure?.initialData || [];
            const rowCount = initialData.length > 0 ? initialData.length : tableStructure?.rows || 3;
            const currentData =
                Array.isArray(value) && value.length > 0 && Array.isArray((value as unknown[])[0])
                    ? (value as string[][])
                : initialData.length > 0
                  ? initialData.map((row) => row.map((cell) => (cell === null ? '' : cell)))
                  : Array(rowCount)
                        .fill(null)
                        .map(() => Array(headers.length).fill(''));
            const handleCellChange = (rowIndex: number, colIndex: number, val: string) => {
                const newData = currentData.map((r) => [...r]);
                newData[rowIndex][colIndex] = val;
                onChange(newData);
            };
            return (
                <div className="border border-border rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-muted border-b border-border px-4 py-2 flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        <TableIcon className="w-4 h-4" /> Table Input
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                                <tr>
                                    {headers.map((h, i) => (
                                        <th key={i} className="px-6 py-3 border-b border-border min-w-[150px]">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {currentData.map((row, rIndex) => (
                                    <tr
                                        key={rIndex}
                                        className="bg-card border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                                    >
                                        {row.map((cell, cIndex) => {
                                            const isPrefilled =
                                                initialData.length > 0 &&
                                                initialData[rIndex] &&
                                                initialData[rIndex][cIndex] !== null;
                                            return (
                                                <td key={cIndex} className="p-0 border-r border-border last:border-0 relative">
                                                    {isPrefilled ? (
                                                        <div className="w-full h-full px-6 py-4 bg-muted/40 text-muted-foreground font-medium select-none">
                                                            {initialData[rIndex][cIndex]}
                                                        </div>
                                                    ) : (
                                                        <input
                                                            type="text"
                                                            aria-label={`Input for ${headers[cIndex]} at row ${rIndex + 1}`}
                                                            className="w-full h-full px-6 py-4 bg-transparent outline-none focus:ring-2 focus:ring-inset focus:ring-primary text-foreground placeholder-muted-foreground/50"
                                                            value={cell}
                                                            onChange={(e) =>
                                                                handleCellChange(rIndex, cIndex, e.target.value)
                                                            }
                                                            placeholder="Type..."
                                                        />
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
                    <div className="mb-2 flex items-center gap-2 text-primary font-bold text-sm">
                        <BarChart2 className="w-4 h-4" /> Interactive Graph Paper
                    </div>
                    <GraphCanvas
                        config={graphConfig}
                        value={normalizedGraph}
                        onChange={(g) => onChange(g)}
                        backgroundImage={graphFigure ?? null}
                        onClearBackground={onClearGraphFigure}
                    />
                </div>
            );
        }

        if (type === 'long_text') {
            return (
                <div className="relative">
                    <textarea
                        aria-label="Long text answer"
                        className="w-full min-h-[12rem] p-4 border border-input bg-background rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none resize-y font-serif leading-relaxed text-foreground"
                        placeholder="Type your answer here..."
                        value={typeof value === 'string' ? value : ''}
                        onChange={(e) => {
                            onChange(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                        onFocus={(e) => {
                            e.target.style.height = 'auto';
                            e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                    />
                    <MathKeyboard
                        onInsert={handleSymbolInsert}
                        isOpen={isKeyboardOpen}
                        toggleOpen={() => setIsKeyboardOpen(!isKeyboardOpen)}
                    />
                </div>
            );
        }

        return (
            <div>
                <input
                    type="text"
                    aria-label="Answer"
                    className="w-full p-3 border border-input bg-background rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-foreground"
                    placeholder="Type your answer here..."
                    value={typeof value === 'string' ? value : ''}
                    onChange={(e) => onChange(e.target.value)}
                />
                <MathKeyboard
                    onInsert={handleSymbolInsert}
                    isOpen={isKeyboardOpen}
                    toggleOpen={() => setIsKeyboardOpen(!isKeyboardOpen)}
                />
            </div>
        );
    }
);

AdaptiveInput.displayName = 'AdaptiveInput';
export default AdaptiveInput;
