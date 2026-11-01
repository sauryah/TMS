import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Undo2, Redo2 } from 'lucide-react';
import type { PassData } from '../types';
import { formatNumber } from '../utils/parsing';
import {
  calculateDieFromElongation,
  calculateDieFromReduction,
  calculateDieFromRatio,
} from '../utils/calculations';
import { getElongationBadgeClass, getReductionBadgeClass } from '../constants/engineering';

interface ResultsTableProps {
  passes: PassData[];
  dies: number[];
  onDiesChange: (dies: number[]) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  selectedPassIdx?: number | null;
  onSelectPass?: (idx: number | null) => void;
}

type EditingField =
  | { type: 'die'; pass: number; field: 'fromDie' | 'toDie' }
  | { type: 'calc'; pass: number; field: 'elongation' | 'reduction' | 'ratio' };

export default function ResultsTable({
  passes,
  dies,
  onDiesChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  selectedPassIdx,
  onSelectPass,
}: ResultsTableProps) {
  const [editing, setEditing] = useState<EditingField | null>(null);
  const [editVal, setEditVal] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  const saveDieEdit = () => {
    if (!editing || editing.type !== 'die') return;
    const v = parseFloat(editVal);
    if (isNaN(v) || v <= 0) {
      setEditing(null);
      return;
    }
    const nd = [...dies];
    const idx = editing.field === 'fromDie' ? editing.pass - 1 : editing.pass;
    if (idx >= 0 && idx < nd.length) nd[idx] = Math.round(v * 1000) / 1000;
    onDiesChange(nd);
    setEditing(null);
  };

  const saveCalcEdit = () => {
    if (!editing || editing.type !== 'calc') return;
    const v = parseFloat(editVal);
    if (isNaN(v) || v <= 0) {
      setEditing(null);
      return;
    }

    const passIdx = editing.pass - 1;
    const dBefore = dies[passIdx];
    if (!dBefore) {
      setEditing(null);
      return;
    }

    let newToDie = 0;
    if (editing.field === 'elongation') newToDie = calculateDieFromElongation(dBefore, v);
    else if (editing.field === 'reduction') newToDie = calculateDieFromReduction(dBefore, v);
    else if (editing.field === 'ratio') newToDie = calculateDieFromRatio(dBefore, v);

    if (newToDie > 0) {
      const nd = [...dies];
      nd[passIdx + 1] = Math.round(newToDie * 1000) / 1000;
      onDiesChange(nd);
    }
    setEditing(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (editing?.type === 'die') saveDieEdit();
      else saveCalcEdit();
    } else if (e.key === 'Escape') {
      setEditing(null);
    }
  };

  const removePass = (passNum: number) => {
    if (dies.length <= 2) return;
    const nd = dies.filter((_, i) => i !== passNum);
    onDiesChange(nd);
  };

  const addPassAfter = (passNum: number) => {
    const d1 = dies[passNum - 1];
    const d2 = dies[passNum];
    if (d1 === undefined || d2 === undefined) return;
    const mid = Math.round(((d1 + d2) / 2) * 1000) / 1000;
    const nd = [...dies.slice(0, passNum), mid, ...dies.slice(passNum)];
    onDiesChange(nd);
  };

  if (passes.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="wdc-panel"
    >
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h3 className="text-[15px] font-semibold text-[var(--color-text)] m-0">Pass Results</h3>
          <span className="text-xs text-[var(--color-text-secondary)] font-mono">
            {passes.length} passes &bull; Click values to edit inline
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="wdc-btn wdc-btn-ghost text-xs p-1.5 min-w-[28px] min-h-[28px] flex items-center justify-center cursor-pointer"
            title="Undo (Ctrl+Z)"
            aria-label="Undo last die change (Ctrl+Z)"
            type="button"
          >
            <Undo2 className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="wdc-btn wdc-btn-ghost text-xs p-1.5 min-w-[28px] min-h-[28px] flex items-center justify-center cursor-pointer"
            title="Redo (Ctrl+Y)"
            aria-label="Redo last die change (Ctrl+Y)"
            type="button"
          >
            <Redo2 className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="wdc-btn wdc-btn-secondary text-xs cursor-pointer font-mono"
            aria-label={showDetails ? 'Hide calculated cross-section areas' : 'Show calculated cross-section areas'}
            type="button"
          >
            {showDetails ? 'Hide Areas' : 'Show Areas'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto -mx-5 px-5">
        <table className="w-full text-xs border-collapse font-mono">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              <th className="py-2.5 px-3 text-left font-medium text-[var(--color-text-secondary)] uppercase tracking-wider text-[11px]">Pass</th>
              <th className="py-2.5 px-3 text-right font-medium text-[var(--color-text-secondary)] uppercase tracking-wider text-[11px]">From (mm)</th>
              <th className="py-2.5 px-3 text-right font-medium text-[var(--color-text-secondary)] uppercase tracking-wider text-[11px]">To (mm)</th>
              {showDetails && (
                <>
                  <th className="py-2.5 px-3 text-right font-medium text-[var(--color-text-secondary)] uppercase tracking-wider text-[11px]">Area Bef</th>
                  <th className="py-2.5 px-3 text-right font-medium text-[var(--color-text-secondary)] uppercase tracking-wider text-[11px]">Area Aft</th>
                </>
              )}
              <th className="py-2.5 px-3 text-right font-medium text-[var(--color-text-secondary)] uppercase tracking-wider text-[11px]">Reduction %</th>
              <th className="py-2.5 px-3 text-right font-medium text-[var(--color-text-secondary)] uppercase tracking-wider text-[11px]">Elongation %</th>
              <th className="py-2.5 px-3 text-right font-medium text-[var(--color-text-secondary)] uppercase tracking-wider text-[11px]">Ratio</th>
              <th className="py-2.5 px-3 text-center font-medium text-[var(--color-text-secondary)] uppercase tracking-wider text-[11px] w-16">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {passes.map((p, idx) => {
              const isSelected = selectedPassIdx === idx;
              return (
                <tr
                  key={p.pass}
                  onClick={() => onSelectPass?.(idx)}
                  className={`transition-colors cursor-pointer ${
                    isSelected ? 'bg-blue-500/10' : 'hover:bg-[var(--color-surface-2)]'
                  }`}
                >
                  <td className="py-2 px-3 font-medium text-[var(--color-text)]">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-blue-500/10 text-blue-500 font-semibold text-[10px] font-mono">
                      {p.pass}
                    </span>
                  </td>

                  {/* From Die */}
                  <td className="py-2 px-3 text-right font-mono">
                    {editing?.type === 'die' && editing.pass === p.pass && editing.field === 'fromDie' ? (
                      <input
                        type="number" step="0.001" value={editVal} autoFocus
                        onChange={(e) => setEditVal(e.target.value)}
                        onBlur={saveDieEdit} onKeyDown={handleKeyDown}
                        className="wdc-input w-20 text-right py-0.5 px-1 text-xs"
                      />
                    ) : (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing({ type: 'die', pass: p.pass, field: 'fromDie' });
                          setEditVal(p.fromDie.toString());
                        }}
                        className="hover:text-blue-400 hover:underline cursor-pointer"
                        title="Click to edit die diameter"
                      >
                        {formatNumber(p.fromDie, 3)}
                      </span>
                    )}
                  </td>

                  {/* To Die */}
                  <td className="py-2 px-3 text-right font-mono font-medium text-[var(--color-text)]">
                    {editing?.type === 'die' && editing.pass === p.pass && editing.field === 'toDie' ? (
                      <input
                        type="number" step="0.001" value={editVal} autoFocus
                        onChange={(e) => setEditVal(e.target.value)}
                        onBlur={saveDieEdit} onKeyDown={handleKeyDown}
                        className="wdc-input w-20 text-right py-0.5 px-1 text-xs"
                      />
                    ) : (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing({ type: 'die', pass: p.pass, field: 'toDie' });
                          setEditVal(p.toDie.toString());
                        }}
                        className="hover:text-blue-500 hover:underline cursor-pointer text-[var(--color-text)] font-semibold"
                        title="Click to edit die diameter"
                      >
                        {formatNumber(p.toDie, 3)}
                      </span>
                    )}
                  </td>

                  {showDetails && (
                    <>
                      <td className="py-2 px-3 text-right font-mono text-[var(--color-text-secondary)]">{formatNumber(p.areaBefore, 3)}</td>
                      <td className="py-2 px-3 text-right font-mono text-[var(--color-text-secondary)]">{formatNumber(p.areaAfter, 3)}</td>
                    </>
                  )}

                  {/* Area Reduction */}
                  <td className="py-2 px-3 text-right font-mono">
                    {editing?.type === 'calc' && editing.pass === p.pass && editing.field === 'reduction' ? (
                      <input
                        type="number" step="0.1" value={editVal} autoFocus
                        onChange={(e) => setEditVal(e.target.value)}
                        onBlur={saveCalcEdit} onKeyDown={handleKeyDown}
                        className="wdc-input w-16 text-right py-0.5 px-1 text-xs"
                      />
                    ) : (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing({ type: 'calc', pass: p.pass, field: 'reduction' });
                          setEditVal(p.areaReduction.toFixed(1));
                        }}
                        className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-medium border cursor-pointer ${getReductionBadgeClass(p.areaReduction)}`}
                        title="Click to set target reduction"
                      >
                        {formatNumber(p.areaReduction, 2)}%
                      </span>
                    )}
                  </td>

                  {/* Elongation */}
                  <td className="py-2 px-3 text-right font-mono">
                    {editing?.type === 'calc' && editing.pass === p.pass && editing.field === 'elongation' ? (
                      <input
                        type="number" step="0.1" value={editVal} autoFocus
                        onChange={(e) => setEditVal(e.target.value)}
                        onBlur={saveCalcEdit} onKeyDown={handleKeyDown}
                        className="wdc-input w-16 text-right py-0.5 px-1 text-xs"
                      />
                    ) : (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing({ type: 'calc', pass: p.pass, field: 'elongation' });
                          setEditVal(p.elongation.toFixed(1));
                        }}
                        className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-medium border cursor-pointer ${getElongationBadgeClass(p.elongation)}`}
                        title="Click to set target elongation"
                      >
                        {formatNumber(p.elongation, 2)}%
                      </span>
                    )}
                  </td>

                  {/* Ratio */}
                  <td className="py-2 px-3 text-right font-mono text-[var(--color-text-secondary)]">
                    {editing?.type === 'calc' && editing.pass === p.pass && editing.field === 'ratio' ? (
                      <input
                        type="number" step="0.01" value={editVal} autoFocus
                        onChange={(e) => setEditVal(e.target.value)}
                        onBlur={saveCalcEdit} onKeyDown={handleKeyDown}
                        className="wdc-input w-16 text-right py-0.5 px-1 text-xs"
                      />
                    ) : (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing({ type: 'calc', pass: p.pass, field: 'ratio' });
                          setEditVal(p.reductionRatio.toFixed(2));
                        }}
                        className="hover:text-blue-400 hover:underline cursor-pointer"
                        title="Click to set target ratio"
                      >
                        {formatNumber(p.reductionRatio, 2)}
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => addPassAfter(p.pass)}
                        className="p-1 min-w-[24px] min-h-[24px] flex items-center justify-center text-[var(--color-text-secondary)] hover:text-emerald-400 rounded transition cursor-pointer"
                        title="Insert intermediate die after this pass"
                        aria-label={`Insert intermediate die after pass ${p.pass}`}
                      >
                        <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removePass(p.pass)}
                        disabled={dies.length <= 2}
                        className="p-1 min-w-[24px] min-h-[24px] flex items-center justify-center text-[var(--color-text-secondary)] hover:text-rose-400 disabled:opacity-30 disabled:cursor-not-allowed rounded transition cursor-pointer text-sm font-bold leading-none"
                        title="Delete this die"
                        aria-label={`Delete pass ${p.pass} die`}
                      >
                        <span aria-hidden="true">&times;</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
