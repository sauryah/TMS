import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import type { ConsistencyData } from '../types';
import { formatNumber } from '../utils/parsing';

interface PassConsistencyProps {
  consistency: ConsistencyData;
}

export default function PassConsistency({ consistency }: PassConsistencyProps) {
  if (consistency.qualityRating === 'N/A') return null;

  const gaugeWidth = Math.min(100, Math.max(0, 100 - consistency.variation * 10));
  const gaugeColor =
    consistency.stars >= 4 ? '#22C55E' :
    consistency.stars >= 3 ? '#F59E0B' :
    consistency.stars >= 2 ? '#F97316' : '#EF4444';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
      className="wdc-panel"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-[14px] font-semibold text-[var(--color-text)] m-0">Pass Consistency</h3>
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`w-3.5 h-3.5 ${
                i < consistency.stars
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-[var(--color-border-visible)]'
              }`}
              aria-hidden="true"
            />
          ))}
          <span className="text-xs font-bold text-[var(--color-text)] ml-1 font-mono">
            {consistency.qualityRating}
          </span>
        </div>
      </div>

      <div className="space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between">
          <span className="text-[var(--color-text-secondary)]">Average Elongation</span>
          <span className="font-semibold text-blue-500 dark:text-blue-400 tabular-nums">
            {formatNumber(consistency.avgElongation)}%
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[var(--color-text-secondary)]">Maximum Deviation</span>
          <span className="font-semibold text-amber-500 dark:text-amber-400 tabular-nums">
            &plusmn;{formatNumber(consistency.variation)}%
          </span>
        </div>

        {/* Consistency Score Bar */}
        <div>
          <div className="flex justify-between text-[10px] text-[var(--color-text-secondary)] mb-1">
            <span>Uniformity Metric</span>
            <span className="tabular-nums">{gaugeWidth.toFixed(0)} / 100</span>
          </div>
          <div className="h-1.5 bg-[var(--color-border-visible)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${gaugeWidth}%`, backgroundColor: gaugeColor }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
