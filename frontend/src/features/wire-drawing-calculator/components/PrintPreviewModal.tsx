import React, { useState } from 'react';
import { X, Printer, FileText, SlidersHorizontal, Loader2, Layers, Eye, Table } from 'lucide-react';
import type { PassData, Statistics, ConsistencyData, PrintRecord, PrintLayoutMode } from '../types';
import { WireDrawingPrintReport } from './WireDrawingPrintReport';
import { useApi } from '../../../hooks/useApi';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  passes: PassData[];
  stats: Statistics | null;
  dies: number[];
  consistency?: ConsistencyData | null;
  docRef?: string;
  onDocRefChange?: (val: string) => void;
  workOrder?: string;
  onWorkOrderChange?: (val: string) => void;
  machineName?: string;
  onMachineNameChange?: (val: string) => void;
  notes?: string;
  onNotesChange?: (val: string) => void;
  operator?: string;
  onOperatorChange?: (val: string) => void;
  printMode?: PrintLayoutMode;
  onPrintModeChange?: (mode: PrintLayoutMode) => void;
  onPrintCompleted?: () => void;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  passes,
  stats,
  dies,
  consistency,
  docRef,
  onDocRefChange,
  workOrder: externalWorkOrder,
  onWorkOrderChange,
  machineName: externalMachineName,
  onMachineNameChange,
  notes: externalNotes,
  onNotesChange,
  operator: externalOperator,
  onOperatorChange,
  printMode: externalPrintMode,
  onPrintModeChange,
  onPrintCompleted,
}) => {
  const { request } = useApi();
  const [internalOperator, setInternalOperator] = useState(externalOperator || 'OPERATOR');
  const [internalWorkOrder, setInternalWorkOrder] = useState('WDC-JOB-2026-001');
  const [internalMachineName, setInternalMachineName] = useState('Multi-Wire Drawing Line 01');
  const [internalNotes, setInternalNotes] = useState(
    'Production drafting schedule verified within standard elongation tolerances. No central burst defect risk detected.'
  );
  const [isSaving, setIsSaving] = useState(false);
  const [internalPrintMode, setInternalPrintMode] = useState<PrintLayoutMode>('full-report');

  const effectivePrintMode = externalPrintMode ?? internalPrintMode;
  const setEffectivePrintMode = onPrintModeChange ?? setInternalPrintMode;

  const effectiveOperator = externalOperator ?? internalOperator;
  const setEffectiveOperator = onOperatorChange ?? setInternalOperator;

  const workOrder = externalWorkOrder ?? internalWorkOrder;
  const setWorkOrder = onWorkOrderChange ?? setInternalWorkOrder;
  const machineName = externalMachineName ?? internalMachineName;
  const setMachineName = onMachineNameChange ?? setInternalMachineName;
  const notes = externalNotes ?? internalNotes;
  const setNotes = onNotesChange ?? setInternalNotes;

  const [showConfig, setShowConfig] = useState(false);

  if (!isOpen) return null;

  const handlePrint = async () => {
    setIsSaving(true);
    try {
      const docType =
        effectivePrintMode === 'visual-pipeline'
          ? 'VISUAL_TRAVELER_1PAGE'
          : effectivePrintMode === 'data-table'
          ? 'DATA_TABLE_1PAGE'
          : 'WIRE_DRAWING_TDS_2PAGE';

      const payload = {
        doc_type: docType,
        doc_ref: docRef || undefined,
        work_order: workOrder,
        machine_name: machineName,
        material_profile: 'Standard Wire Drawing',
        quality_status: consistency ? `${consistency.qualityRating} (${consistency.stars}★)` : 'VERIFIED',
        notes: notes,
        inlet_size: stats?.startingDie ? stats.startingDie.toFixed(3) : null,
        finish_size: stats?.finalDie ? stats.finalDie.toFixed(3) : null,
        total_passes: passes.length,
        overall_reduction: stats?.overallAreaReduction ? stats.overallAreaReduction.toFixed(2) : null,
        avg_elongation: stats?.avgElongation ? stats.avgElongation.toFixed(2) : null,
        dies: dies,
        passes_data: passes,
      };

      const res = await request<PrintRecord>('/api/history/print-records/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res && res.doc_ref && onDocRefChange) {
        onDocRefChange(res.doc_ref);
      }
    } catch (err) {
      console.warn('Could not record print to backend (proceeding with local print):', err);
    } finally {
      setIsSaving(false);
      window.print();
      onPrintCompleted?.();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="print-preview-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 print:hidden"
    >
      <div className="bg-[var(--color-surface)] border border-[var(--color-border-visible)] rounded-sm w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl text-[var(--color-text)]">
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-400" aria-hidden="true" />
            <span id="print-preview-title" className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text)] font-mono">
              Print Preview
            </span>
          </div>

          {/* Print Layout Mode 1-Click Switcher */}
          <div className="flex items-center bg-[var(--wdc-steel)] p-0.5 rounded-sm border border-[var(--color-border)] text-xs font-mono">
            <button
              type="button"
              onClick={() => setEffectivePrintMode('full-report')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xs transition cursor-pointer text-[11px] ${
                effectivePrintMode === 'full-report'
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--wdc-steel-light)]'
              }`}
              title="Full 2-Page Technical Data Sheet: Table on Page 1, Schematic Pipeline & Charts on Page 2"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Full Report (2 Pages)</span>
            </button>
            <button
              type="button"
              onClick={() => setEffectivePrintMode('visual-pipeline')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xs transition cursor-pointer text-[11px] ${
                effectivePrintMode === 'visual-pipeline'
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--wdc-steel-light)]'
              }`}
              title="Single-Page Visual Traveler: Systematic Draughting Pipeline (4 passes per line) on 1 sheet"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Visual Pipeline (1 Page)</span>
            </button>
            <button
              type="button"
              onClick={() => setEffectivePrintMode('data-table')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xs transition cursor-pointer text-[11px] ${
                effectivePrintMode === 'data-table'
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--wdc-steel-light)]'
              }`}
              title="Single-Page Numerical Schedule: Full 24-Pass Engineering Data Table on 1 sheet"
            >
              <Table className="w-3.5 h-3.5" />
              <span>Data Table (1 Page)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs border border-[var(--color-border-visible)] bg-[var(--wdc-steel)] hover:bg-[var(--wdc-steel-light)] rounded-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition cursor-pointer font-mono"
              title="Configure Document Header"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Job Info</span>
            </button>

            <button
              onClick={handlePrint}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase border border-blue-500/60 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-sm shadow-xs transition cursor-pointer font-mono"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Printer className="h-3.5 w-3.5" />
              )}
              <span>
                {isSaving
                  ? 'Printing...'
                  : effectivePrintMode === 'full-report'
                  ? 'Print (2 Pages)'
                  : 'Print (1 Page)'}
              </span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 min-w-[28px] min-h-[28px] flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--wdc-steel-light)] rounded-sm transition cursor-pointer"
              title="Close Preview"
              aria-label="Close Print Preview"
              type="button"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Optional Collapsible Job / Metadata Configuration Drawer */}
        {showConfig && (
          <div className="p-3 bg-[var(--color-surface-2)] border-b border-[var(--color-border)] grid grid-cols-1 sm:grid-cols-5 gap-2.5 text-xs animate-fadeIn font-mono">
            <div>
              <label className="text-[10px] text-[var(--color-text-secondary)] uppercase block mb-1">Doc Reference</label>
              <input
                type="text"
                value={docRef || ''}
                onChange={(e) => onDocRefChange?.(e.target.value)}
                placeholder="Auto-generated"
                className="w-full bg-[var(--wdc-input)] border border-[var(--color-border-visible)] rounded-sm px-2 py-1 text-xs text-blue-500 dark:text-blue-400 font-bold focus:outline-none focus:border-blue-500 uppercase font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-[var(--color-text-secondary)] uppercase block mb-1">Prepared By</label>
              <input
                type="text"
                value={effectiveOperator}
                onChange={(e) => setEffectiveOperator(e.target.value)}
                className="w-full bg-[var(--wdc-input)] border border-[var(--color-border-visible)] rounded-sm px-2 py-1 text-xs text-[var(--color-text)] focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-[var(--color-text-secondary)] uppercase block mb-1">Work Order / Batch #</label>
              <input
                type="text"
                value={workOrder}
                onChange={(e) => setWorkOrder(e.target.value)}
                className="w-full bg-[var(--wdc-input)] border border-[var(--color-border-visible)] rounded-sm px-2 py-1 text-xs text-[var(--color-text)] focus:outline-none focus:border-blue-500 uppercase font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-[var(--color-text-secondary)] uppercase block mb-1">Tooling Set / Machine</label>
              <input
                type="text"
                value={machineName}
                onChange={(e) => setMachineName(e.target.value)}
                className="w-full bg-[var(--wdc-input)] border border-[var(--color-border-visible)] rounded-sm px-2 py-1 text-xs text-[var(--color-text)] focus:outline-none focus:border-blue-500 uppercase font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-[var(--color-text-secondary)] uppercase block mb-1">Shopfloor Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-[var(--wdc-input)] border border-[var(--color-border-visible)] rounded-sm px-2 py-1 text-xs text-[var(--color-text)] focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>
        )}

        {/* 1:1 Paper Viewport Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200 dark:bg-[var(--color-bg)]">
          <div className="max-w-[850px] mx-auto bg-white rounded-xs shadow-2xl overflow-hidden border border-slate-300">
            <WireDrawingPrintReport
              passes={passes}
              stats={stats}
              dies={dies}
              consistency={consistency}
              docRef={docRef}
              workOrder={workOrder}
              machineName={machineName}
              toolingSet={machineName}
              notes={notes}
              operator={effectiveOperator}
              printMode={effectivePrintMode}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintPreviewModal;
