import { useState } from 'react';
import { motion } from 'framer-motion';
import { GitCompareArrows } from 'lucide-react';
import { calculatePassData, calculateStatistics } from '../utils/calculations';
import { formatNumber, parseDieInput } from '../utils/parsing';

interface ComparePanelProps {
  currentDies: number[];
}

const EXAMPLE_B = '2.49 2.14 1.84 1.58 1.36 1.17 1.01 0.87 0.75 0.65 0.56 0.49 0.43 0.38 0.34 0.309';

export default function ComparePanel({ currentDies }: ComparePanelProps) {
  const [enabled, setEnabled] = useState(false);
  const [inputA, setInputA] = useState(currentDies.join(' '));
  const [inputB, setInputB] = useState(EXAMPLE_B);

  if (!enabled) {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.6 }} className="wdc-panel">
        <button
          type="button"
          onClick={() => setEnabled(true)}
          className="wdc-btn wdc-btn-ghost w-full justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text)] cursor-pointer font-mono"
          aria-label="Compare two die schedules side by side"
        >
          <GitCompareArrows className="w-4 h-4" aria-hidden="true" /> Compare Two Schedules
        </button>
      </motion.div>
    );
  }

  const diesA = parseDieInput(inputA).sort((a, b) => b - a);
  const diesB = parseDieInput(inputB).sort((a, b) => b - a);
  const statsA = calculateStatistics(diesA, calculatePassData(diesA));
  const statsB = calculateStatistics(diesB, calculatePassData(diesB));

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="wdc-panel">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
            <GitCompareArrows className="w-4 h-4 text-violet-400" aria-hidden="true" />
          </div>
          <h3 className="text-[15px] font-semibold text-[var(--color-text)] m-0">Compare Schedules</h3>
        </div>
        <button
          type="button"
          onClick={() => setEnabled(false)}
          className="wdc-btn wdc-btn-ghost text-xs cursor-pointer font-mono"
          aria-label="Close comparison panel"
        >
          Close
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5 font-mono">
        <div>
          <label className="wdc-label text-xs mb-1.5 block">Schedule A</label>
          <textarea value={inputA} onChange={(e) => setInputA(e.target.value)} className="wdc-textarea h-20 text-[11px]" />
        </div>
        <div>
          <label className="wdc-label text-xs mb-1.5 block">Schedule B</label>
          <textarea value={inputB} onChange={(e) => setInputB(e.target.value)} className="wdc-textarea h-20 text-[11px]" />
        </div>
      </div>

      {diesA.length >= 2 && diesB.length >= 2 && (
        <div className="overflow-x-auto font-mono">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider border-b border-[var(--color-border)]">Metric</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-blue-400 uppercase tracking-wider border-b border-[var(--color-border)]">A</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-violet-400 uppercase tracking-wider border-b border-[var(--color-border)]">B</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Passes', String(statsA.totalPasses), String(statsB.totalPasses)],
                ['Starting Die', formatNumber(statsA.startingDie) + ' mm', formatNumber(statsB.startingDie) + ' mm'],
                ['Final Die', formatNumber(statsA.finalDie) + ' mm', formatNumber(statsB.finalDie) + ' mm'],
                ['Avg Elongation', formatNumber(statsA.avgElongation) + '%', formatNumber(statsB.avgElongation) + '%'],
                ['Max Elongation', formatNumber(statsA.maxElongation) + '%', formatNumber(statsB.maxElongation) + '%'],
                ['Min Elongation', formatNumber(statsA.minElongation) + '%', formatNumber(statsB.minElongation) + '%'],
                ['Overall Reduction', formatNumber(statsA.overallAreaReduction) + '%', formatNumber(statsB.overallAreaReduction) + '%'],
                ['Reduction Ratio', formatNumber(statsA.overallReductionRatio), formatNumber(statsB.overallReductionRatio)],
              ].map(([l, a, b]) => (
                <tr key={l} className="border-b border-[var(--color-border)]">
                  <td className="px-3 py-2 text-[var(--color-text-secondary)]">{l}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-blue-400">{a}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-violet-400">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}
