import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';
import { suggestIntermediateDies, calculateElongation, calculateAreaReduction } from '../utils/calculations';
import { formatNumber } from '../utils/parsing';

interface DieSuggesterProps {
  dies: number[];
}

export default function DieSuggester({ dies }: DieSuggesterProps) {
  const [target, setTarget] = useState(25);
  const [show, setShow] = useState(false);

  if (dies.length < 2) return null;

  const suggested = suggestIntermediateDies(dies, target);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.55 }}
      className="wdc-panel"
    >
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Lightbulb className="w-4 h-4 text-amber-500" aria-hidden="true" />
          </div>
          <h3 className="text-[15px] font-semibold text-[var(--color-text)] m-0">Die Suggestions</h3>
        </div>
        <div className="flex items-center gap-2 font-mono">
          <label className="wdc-label text-xs">Target</label>
          <input
            type="number"
            value={target}
            step="0.5"
            onChange={(e) => setTarget(parseFloat(e.target.value) || 25)}
            className="wdc-input w-20 text-center font-mono text-sm"
          />
          <span className="text-xs text-[var(--color-text-secondary)]">%</span>
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="wdc-btn wdc-btn-primary text-xs cursor-pointer"
          >
            {show ? 'Hide' : 'Suggest'}
          </button>
        </div>
      </div>

      {show && (
        <div className="font-mono">
          <p className="text-[12px] text-[var(--color-text-secondary)] mb-4">
            Optimized die schedule for ~{target}% elongation per pass
          </p>

          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-[12px] border-collapse font-mono">
              <thead>
                <tr>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider border-b border-[var(--color-border)]">Pass</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider border-b border-[var(--color-border)]">From</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider border-b border-[var(--color-border)]">To</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider border-b border-[var(--color-border)]">Elong</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider border-b border-[var(--color-border)]">Red</th>
                </tr>
              </thead>
              <tbody>
                {suggested.slice(0, -1).map((d, i) => {
                  const dAfter = suggested[i + 1];
                  const elongation = calculateElongation(d, dAfter);
                  const areaReduction = calculateAreaReduction(d, dAfter);
                  return (
                    <tr key={i} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-2)]">
                      <td className="px-3 py-2 text-[var(--color-text-secondary)] font-medium">{i + 1}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-[var(--color-text)]">{formatNumber(d)}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-[var(--color-text)]">{formatNumber(dAfter)}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-blue-500 dark:text-blue-400 font-semibold">
                        {formatNumber(elongation)}%
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-[var(--color-text-secondary)]">
                        {formatNumber(areaReduction)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 text-[11px] text-[var(--color-text-secondary)] font-mono tabular-nums">
            {suggested.map((d) => formatNumber(d)).join(' → ')} ({suggested.length - 1} passes)
          </div>
        </div>
      )}
    </motion.div>
  );
}
