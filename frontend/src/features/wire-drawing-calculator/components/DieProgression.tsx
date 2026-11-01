import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { formatNumber } from '../utils/parsing';

interface DieProgressionProps {
  dies: number[];
  onDiesChange?: (dies: number[]) => void;
}

export default function DieProgression({ dies, onDiesChange }: DieProgressionProps) {
  const [hoveredDieIndex, setHoveredDieIndex] = useState<number | null>(null);
  const [hoveredArrowIndex, setHoveredArrowIndex] = useState<number | null>(null);

  if (dies.length === 0) return null;

  const getArea = (diameter: number) => (Math.PI * diameter * diameter) / 4;

  const removeDie = (index: number) => {
    if (dies.length <= 2 || !onDiesChange) return;
    const nd = dies.filter((_, i) => i !== index);
    onDiesChange(nd);
  };

  const insertBetween = (index: number) => {
    if (!onDiesChange) return;
    const d1 = dies[index];
    const d2 = dies[index + 1];
    const mid = Math.round(((d1 + d2) / 2) * 1000) / 1000;
    const nd = [...dies.slice(0, index + 1), mid, ...dies.slice(index + 1)];
    onDiesChange(nd);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="wdc-panel"
    >
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-[var(--color-border)]">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text)] tracking-tight block">
            Drafting Reduction Pipeline
          </h3>
          <span className="text-[var(--color-text-secondary)] text-xs block mt-0.5 font-mono">
            Sequential cross-section wire reduction • Hover node to delete • Hover taper to insert pass
          </span>
        </div>
        <span className="text-xs font-mono font-bold text-blue-500 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 border border-blue-500/30 rounded">
          {dies.length} STATIONS • {Math.max(0, dies.length - 1)} PASSES
        </span>
      </div>

      <div className="flex items-center justify-start flex-wrap gap-y-4 gap-x-1.5 py-3 overflow-x-auto w-full px-1">
        <AnimatePresence>
          {dies.map((d, i) => {
            const isFirst = i === 0;
            const isLast = i === dies.length - 1;

            let areaRedPercent = 0;
            let elongationPercent = 0;
            if (i < dies.length - 1) {
              const areaBef = getArea(d);
              const areaAft = getArea(dies[i + 1]);
              areaRedPercent = ((areaBef - areaAft) / areaBef) * 100;
              elongationPercent = ((Math.pow(d, 2) / Math.pow(dies[i + 1], 2)) - 1) * 100;
            }

            return (
              <React.Fragment key={`${d}-${i}`}>
                {/* Station Node */}
                <div
                  onMouseEnter={() => setHoveredDieIndex(i)}
                  onMouseLeave={() => setHoveredDieIndex(null)}
                  className={`relative flex flex-col items-center justify-center p-2 rounded border transition-all ${
                    isFirst
                      ? 'bg-blue-500/10 border-blue-500/40 text-blue-600 dark:text-blue-300'
                      : isLast
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-300'
                      : 'bg-[var(--wdc-steel)] border-[var(--color-border-visible)] text-[var(--color-text)]'
                  } min-w-[72px] shadow-xs`}
                >
                  {hoveredDieIndex === i && dies.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeDie(i)}
                      className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full p-0.5 shadow hover:bg-rose-500 transition cursor-pointer"
                      title="Delete station"
                      aria-label="Delete station"
                    >
                      <X className="w-3 h-3" aria-hidden="true" />
                    </button>
                  )}
                  <span className="text-[9.5px] uppercase font-bold text-[var(--color-text-secondary)]">
                    {isFirst ? 'INLET' : isLast ? 'FINISH' : `P${i}`}
                  </span>
                  <span className="text-xs font-mono font-bold mt-0.5 tabular-nums">
                    {formatNumber(d, 3)}
                  </span>
                  <span className="text-[9px] text-[var(--color-text-secondary)] font-mono">mm</span>
                </div>

                {/* Taper Connector between dies */}
                {i < dies.length - 1 && (
                  <div
                    onMouseEnter={() => setHoveredArrowIndex(i)}
                    onMouseLeave={() => setHoveredArrowIndex(null)}
                    onClick={() => insertBetween(i)}
                    className="relative flex flex-col items-center justify-center px-1 cursor-pointer group"
                    title="Click to insert inline intermediate die"
                  >
                    <div className="flex items-center text-[var(--color-text-secondary)] group-hover:text-blue-500 transition">
                      <span className="text-[10px] font-mono font-bold">
                        &rarr;
                      </span>
                    </div>
                    <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold leading-tight tabular-nums">
                      -{areaRedPercent.toFixed(1)}%
                    </span>
                    <span className="text-[8.5px] font-mono text-blue-600 dark:text-blue-400 leading-tight tabular-nums">
                      +{elongationPercent.toFixed(1)}%
                    </span>
                    {hoveredArrowIndex === i && (
                      <span className="absolute -bottom-3 text-[8.5px] text-blue-500 font-mono whitespace-nowrap bg-[var(--color-surface)] px-1 border border-[var(--color-border-visible)] rounded shadow-xs z-10">
                        + Insert
                      </span>
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
