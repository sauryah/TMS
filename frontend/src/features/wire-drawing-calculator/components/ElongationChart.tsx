import React from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { PassData } from '../types';

interface ElongationChartProps {
  passes: PassData[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: PassData }>;
  label?: string | number;
}

function barColor(val: number) {
  if (val < 20) return '#3B82F6';
  if (val <= 24) return '#22C55E';
  if (val <= 28) return '#F59E0B';
  return '#EF4444';
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as PassData;
    return (
      <div className="bg-[var(--color-surface)] border border-[var(--color-border-visible)] p-2.5 rounded shadow-xl font-mono text-xs text-[var(--color-text)]">
        <p className="font-bold text-blue-500 dark:text-blue-400 mb-1">{`Pass ${label}`}</p>
        <p className="text-[11px] text-[var(--color-text-secondary)]">
          Draft: <span className="text-[var(--color-text)] font-semibold">{data.fromDie.toFixed(3)} &rarr; {data.toDie.toFixed(3)} mm</span>
        </p>
        <p className="text-[11px] text-emerald-500 dark:text-emerald-400">
          Elongation: <span className="font-bold">{data.elongation.toFixed(2)}%</span>
        </p>
        <p className="text-[11px] text-[var(--color-text-secondary)]">
          Ratio: <span className="text-[var(--color-text)] font-semibold">{data.reductionRatio.toFixed(2)}</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function ElongationChart({ passes }: ElongationChartProps) {
  if (passes.length === 0) return null;

  const avg = passes.reduce((s, p) => s + p.elongation, 0) / passes.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
      className="wdc-panel"
    >
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-[14px] font-semibold text-[var(--color-text)] m-0">Elongation per Pass (%)</h3>
        <span className="text-xs font-mono text-blue-500 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 border border-blue-500/30 rounded">
          AVG: {avg.toFixed(2)}%
        </span>
      </div>

      <div className="h-[230px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={passes} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="pass"
              stroke="var(--color-text-secondary)"
              tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }}
              tickFormatter={(v) => `P${v}`}
            />
            <YAxis
              stroke="var(--color-text-secondary)"
              tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }}
              unit="%"
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={avg} stroke="#8B5CF6" strokeDasharray="4 4" strokeWidth={1.5} />
            <ReferenceLine y={20} stroke="var(--color-border-visible)" strokeDasharray="2 2" />
            <ReferenceLine y={28} stroke="var(--color-border-visible)" strokeDasharray="2 2" />
            <Bar
              dataKey="elongation"
              radius={[3, 3, 0, 0]}
            >
              {passes.map((p) => (
                <Cell key={`elong-cell-${p.pass}`} fill={barColor(p.elongation)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
