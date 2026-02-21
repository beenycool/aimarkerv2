// @ts-nocheck
import React, { memo } from 'react';
import { Calculator } from 'lucide-react';

const MathKeyboard = memo(({ onInsert, isOpen, toggleOpen }) => {
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
                <span className="text-xs font-bold text-muted-foreground uppercase">Scientific Symbols</span>
                <button onClick={toggleOpen} className="text-xs text-muted-foreground hover:text-destructive">Close</button>
            </div>
            <div className="grid grid-cols-8 sm:grid-cols-10 gap-1 bg-muted p-2 rounded-lg border border-border">
                {symbols.map(s => (
                    <button key={s} onClick={() => onInsert(s)} className="h-8 bg-card rounded shadow-sm border border-border hover:bg-primary/10 hover:border-primary/30 hover:text-primary font-mono font-bold text-foreground transition-all active:scale-95">{s}</button>
                ))}
            </div>
        </div>
    );
});
MathKeyboard.displayName = 'MathKeyboard';

export default MathKeyboard;
