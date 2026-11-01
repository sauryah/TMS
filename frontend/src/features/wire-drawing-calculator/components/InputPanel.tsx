import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ClipboardPaste, Wand2, Eraser, ArrowRight } from 'lucide-react';
import { parseDieInput } from '../utils/parsing';

interface InputPanelProps {
  onParse: (dies: number[]) => void;
  currentDies: number[];
}

const EXAMPLE = `3.000 2.673 2.381 2.121 1.890 1.683 1.500 1.336 1.190 1.060 0.945 0.842 0.750 0.668 0.595 0.530 0.472 0.421 0.375 0.334 0.297 0.265 0.236 0.210 0.206`;

export default function InputPanel({ onParse, currentDies }: InputPanelProps) {
  const [text, setText] = useState(
    currentDies.length > 0 ? currentDies.join('  ') : ''
  );
  const [error, setError] = useState('');

  useEffect(() => {
    if (currentDies.length > 0) {
      setText(currentDies.join('  '));
    }
  }, [currentDies]);

  const handleParse = () => {
    if (!text.trim()) {
      setError('Enter die diameters to calculate');
      return;
    }
    const numbers = parseDieInput(text);
    if (numbers.length < 2) {
      setError('Need at least 2 die diameters');
      return;
    }
    setError('');
    onParse(numbers);
    setText(numbers.join('  '));
  };

  const handlePaste = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      setText(clipText);
      setError('');
    } catch {
      /* clipboard read may fail */
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="wdc-panel"
    >
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <label className="wdc-label flex items-center gap-2">
          <span>Die Schedule Input (mm)</span>
          <span className="text-[11px] text-[var(--color-text-secondary)] normal-case font-mono">
            — Space, tab, comma, or newline separated
          </span>
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setText(EXAMPLE);
              setError('');
            }}
            className="wdc-btn wdc-btn-ghost text-xs py-1 px-2.5 text-blue-400 hover:text-blue-300 cursor-pointer"
            aria-label="Load example die schedule"
          >
            <Wand2 className="w-3.5 h-3.5" aria-hidden="true" /> Example
          </button>
          <button
            type="button"
            onClick={handlePaste}
            className="wdc-btn wdc-btn-ghost text-xs py-1 px-2.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] cursor-pointer"
            aria-label="Paste die diameters from clipboard"
          >
            <ClipboardPaste className="w-3.5 h-3.5" aria-hidden="true" /> Paste
          </button>
          <button
            type="button"
            onClick={() => {
              setText('');
              setError('');
            }}
            className="wdc-btn wdc-btn-ghost text-xs py-1 px-2.5 text-[var(--color-text-secondary)] hover:text-rose-400 cursor-pointer"
            aria-label="Clear die input field"
          >
            <Eraser className="w-3.5 h-3.5" aria-hidden="true" /> Clear
          </button>
        </div>
      </div>

      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (error) setError('');
        }}
        placeholder="Enter diameters: e.g. 3.000 2.673 2.381 2.121 1.890 1.683 1.500 1.336 1.190 1.060..."
        rows={3}
        className="wdc-textarea"
        aria-label="Die Schedule Diameters in millimeters"
      />

      {error && (
        <p className="text-red-400 text-xs mt-2 font-mono" role="alert">{error}</p>
      )}

      <div className="flex justify-between items-center mt-3">
        <span className="text-[11px] text-[var(--color-text-secondary)] font-mono tabular-nums">
          {currentDies.length} dies loaded &bull; {Math.max(0, currentDies.length - 1)} passes
        </span>
        <button
          type="button"
          onClick={handleParse}
          className="wdc-btn wdc-btn-primary cursor-pointer"
          aria-label="Calculate wire drafting schedule"
        >
          <span>Calculate Schedule</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </motion.div>
  );
}
