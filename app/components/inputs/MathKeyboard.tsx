// @ts-nocheck
import React, { memo, useId } from 'react';
import { Calculator } from 'lucide-react';

const MathKeyboard = memo(({ onInsert, isOpen, toggleOpen }) => {
    const panelId = useId();
    const symbols = [
        { value: '²', label: 'squared' },
        { value: '³', label: 'cubed' },
        { value: '½', label: 'one half' },
        { value: '¼', label: 'one quarter' },
        { value: '√', label: 'square root' },
        { value: '∞', label: 'infinity' },
        { value: '×', label: 'multiplication sign' },
        { value: '÷', label: 'division sign' },
        { value: '±', label: 'plus or minus' },
        { value: '≈', label: 'approximately equal to' },
        { value: '≠', label: 'not equal to' },
        { value: '≡', label: 'identical to' },
        { value: '≤', label: 'less than or equal to' },
        { value: '≥', label: 'greater than or equal to' },
        { value: '°', label: 'degree symbol' },
        { value: '℃', label: 'degrees Celsius' },
        { value: '℉', label: 'degrees Fahrenheit' },
        { value: 'µ', label: 'mu' },
        { value: 'π', label: 'pi' },
        { value: 'Ω', label: 'omega' },
        { value: 'λ', label: 'lambda' },
        { value: 'Δ', label: 'delta' },
        { value: 'Σ', label: 'sigma' },
        { value: '→', label: 'right arrow' },
        { value: '←', label: 'left arrow' },
        { value: '↔', label: 'left right arrow' },
        { value: '↑', label: 'up arrow' },
        { value: '↓', label: 'down arrow' },
    ];

    return (
        <>
            <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={toggleOpen}
                className="mt-2 text-xs font-bold text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-primary rounded"
            >
                <Calculator className="w-3 h-3" /> {isOpen ? 'Close' : 'Show Math Keyboard'}
            </button>
            <div
                id={panelId}
                hidden={!isOpen}
                aria-hidden={!isOpen}
                className="mt-2 animate-in slide-in-from-top-2"
            >
                <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-muted-foreground uppercase">Scientific Symbols</span>
                    <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        onClick={toggleOpen}
                        className="text-xs text-muted-foreground hover:text-destructive focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-primary rounded"
                    >
                        Close
                    </button>
                </div>
                <div className="grid grid-cols-8 sm:grid-cols-10 gap-1 bg-muted p-2 rounded-lg border border-border">
                    {symbols.map(({ value, label }) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => onInsert(value)}
                            className="h-8 bg-card rounded shadow-sm border border-border hover:bg-primary/10 hover:border-primary/30 hover:text-primary font-mono font-bold text-foreground transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            aria-label={`Insert ${label}`}
                        >
                            {value}
                        </button>
                    ))}
                </div>
            </div>
        </>
    );
});
MathKeyboard.displayName = 'MathKeyboard';

export default MathKeyboard;
