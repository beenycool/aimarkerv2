import React, { memo, useEffect, useId, useRef } from 'react';
import { Calculator } from 'lucide-react';

interface MathKeyboardProps {
  onInsert: (char: string) => void;
  isOpen: boolean;
  toggleOpen: () => void;
}

const symbolLabels = {
  '²': 'Squared',
  '³': 'Cubed',
  '½': 'One half',
  '¼': 'One quarter',
  '√': 'Square root',
  '∞': 'Infinity',
  '×': 'Multiply',
  '÷': 'Divide',
  '±': 'Plus or minus',
  '≈': 'Approximately equal',
  '≠': 'Not equal to',
  '≡': 'Identical to',
  '≤': 'Less than or equal to',
  '≥': 'Greater than or equal to',
  '°': 'Degrees',
  '℃': 'Degrees Celsius',
  '℉': 'Degrees Fahrenheit',
  'µ': 'Micro',
  'π': 'Pi',
  'Ω': 'Omega',
  'λ': 'Lambda',
  'Δ': 'Delta',
  'Σ': 'Sigma',
  '→': 'Right arrow',
  '←': 'Left arrow',
  '↔': 'Left right arrow',
  '↑': 'Up arrow',
  '↓': 'Down arrow'
};

const symbols = Object.keys(symbolLabels);

const MathKeyboard = memo(({ onInsert, isOpen, toggleOpen }: MathKeyboardProps) => {
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(isOpen);

  useEffect(() => {
    if (wasOpenRef.current && !isOpen) {
      triggerRef.current?.focus();
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        aria-expanded={false}
        aria-controls={panelId}
        className="mt-2 text-xs font-bold text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
      >
        <Calculator className="w-3 h-3" /> Show Math Keyboard
      </button>
    );
  }

  return (
    <div id={panelId} className="mt-2 animate-in slide-in-from-top-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-bold text-muted-foreground uppercase">Scientific Symbols</span>
        <button
          type="button"
          onClick={toggleOpen}
          aria-expanded={true}
          aria-controls={panelId}
          className="text-xs text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded px-1"
        >
          Close
        </button>
      </div>
      <div className="grid grid-cols-8 sm:grid-cols-10 gap-1 bg-muted p-2 rounded-lg border border-border">
        {symbols.map(s => (
          <button
            key={s}
            type="button"
            aria-label={`Insert ${symbolLabels[s] || s}`}
            title={symbolLabels[s]}
            onClick={() => onInsert(s)}
            className="h-8 bg-card rounded shadow-sm border border-border hover:bg-primary/10 hover:border-primary/30 hover:text-primary font-mono font-bold text-foreground transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
});
MathKeyboard.displayName = 'MathKeyboard';

export default MathKeyboard;
