import React from 'react';
import { motion } from 'framer-motion';
import type { Statistics } from '../types';
import { formatNumber } from '../utils/parsing';

interface StatisticsPanelProps {
  stats: Statistics;
}

export default function StatisticsPanel({ stats }: StatisticsPanelProps) {
  if (stats.totalPasses === 0) return null;

  const items = [
    { label: 'Total Passes', value: stats.totalPasses.toString(), color: 'text-blue-500 dark:text-blue-400' },
    { label: 'Starting Die', value: formatNumber(stats.startingDie, 3) + ' mm', color: 'text-[var(--color-text)]' },
    { label: 'Final Die', value: formatNumber(stats.finalDie, 3) + ' mm', color: 'text-[var(--color-text)]' },
    { label: 'Avg Elongation', value: formatNumber(stats.avgElongation) + '%', color: 'text-blue-500 dark:text-blue-400' },
    { label: 'Max Elongation', value: formatNumber(stats.maxElongation) + '%', color: 'text-amber-500 dark:text-amber-400' },
    { label: 'Min Elongation', value: formatNumber(stats.minElongation) + '%', color: 'text-emerald-500 dark:text-emerald-400' },
    { label: 'Avg Area Reduction', value: formatNumber(stats.avgAreaReduction) + '%', color: 'text-emerald-500 dark:text-emerald-400' },
    { label: 'Overall Reduction', value: formatNumber(stats.overallAreaReduction) + '%', color: 'text-violet-500 dark:text-violet-400' },
    { label: 'Reduction Ratio', value: formatNumber(stats.overallReductionRatio), color: 'text-[var(--color-text)]' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.35 }}
      className="wdc-panel"
    >
      <h3 className="text-[14px] font-semibold text-[var(--color-text)] m-0 mb-4">
        Drafting Statistics & Summary
      </h3>
      <div className="grid grid-cols-3 gap-3">
        {items.map((it) => (
          <div
            key={it.label}
            className="bg-[var(--wdc-steel)] border border-[var(--color-border-visible)] rounded p-2.5 flex flex-col justify-between"
          >
            <span className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-wider font-semibold">
              {it.label}
            </span>
            <span className={`text-[13px] font-mono tabular-nums font-bold mt-1 ${it.color}`}>
              {it.value}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
