import { useRef, useCallback, useEffect, useState, useMemo, Suspense } from 'react';
import { useUndo } from '../features/wire-drawing-calculator/hooks/useUndo';
import { useApi } from '../hooks/useApi';
import Header from '../features/wire-drawing-calculator/components/Header';
import InputPanel from '../features/wire-drawing-calculator/components/InputPanel';
import ResultsTable from '../features/wire-drawing-calculator/components/ResultsTable';
import DieProgression from '../features/wire-drawing-calculator/components/DieProgression';
import StatisticsPanel from '../features/wire-drawing-calculator/components/StatisticsPanel';
import ExportPanel from '../features/wire-drawing-calculator/components/ExportPanel';
import SaveLoad from '../features/wire-drawing-calculator/components/SaveLoad';
import TargetChecker from '../features/wire-drawing-calculator/components/TargetChecker';
import DieSuggester from '../features/wire-drawing-calculator/components/DieSuggester';
import ComparePanel from '../features/wire-drawing-calculator/components/ComparePanel';
import { useAuth } from '../contexts/AuthContext';
import PassConsistency from '../features/wire-drawing-calculator/components/PassConsistency';
import WireDrawingPrintReport from '../features/wire-drawing-calculator/components/WireDrawingPrintReport';
import PrintPreviewModal from '../features/wire-drawing-calculator/components/PrintPreviewModal';
import {
  calculatePassData,
  calculateStatistics,
  calculateConsistency,
} from '../features/wire-drawing-calculator/utils/calculations';
import type { PrintRecordNextRefResponse, PrintLayoutMode } from '../features/wire-drawing-calculator/types';
import { lazyWithRetry } from '../utils/lazyWithRetry';

// Skeleton loading fallbacks
const ChartSkeleton = () => (
  <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm p-4 h-[260px] flex flex-col justify-between animate-pulse font-mono">
    <div className="h-3 w-1/3 bg-[var(--color-surface-2)]" />
    <div className="h-36 bg-[var(--color-bg)] flex items-center justify-center">
      <div className="w-5 h-5 border border-[var(--color-border)] border-t-blue-500 animate-spin" />
    </div>
    <div className="h-3 w-2/3 bg-[var(--color-surface-2)]" />
  </div>
);

const BlueprintSkeleton = () => (
  <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm p-4 h-[240px] flex items-center justify-center animate-pulse">
    <div className="w-6 h-6 border border-[var(--color-border)] border-t-blue-500 animate-spin" />
  </div>
);

const PanelSkeleton = () => (
  <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm p-4 h-[300px] flex items-center justify-center animate-pulse">
    <div className="w-6 h-6 border border-[var(--color-border)] border-t-blue-500 animate-spin" />
  </div>
);

// Lazy components using automatic chunk failure recovery wrapper
const DieBlueprint = lazyWithRetry(() =>
  import('../features/inventory/components/CadRenderer').then((m) => ({ default: m.DieBlueprint }))
);
const ElongationChart = lazyWithRetry(() =>
  import('../features/wire-drawing-calculator/components/ElongationChart')
);
const AreaReductionChart = lazyWithRetry(() =>
  import('../features/wire-drawing-calculator/components/AreaReductionChart')
);
const TheoryPanel = lazyWithRetry(() =>
  import('../features/wire-drawing-calculator/components/TheoryPanel')
);
const StressHeatmap3D = lazyWithRetry(() =>
  import('../features/wire-drawing-calculator/components/StressHeatmap3D')
);

const DEFAULT_DIES = [
  3.000, 2.673, 2.381, 2.121, 1.890, 1.683, 1.500, 1.336, 1.190, 1.060,
  0.945, 0.842, 0.750, 0.668, 0.595, 0.530, 0.472, 0.421, 0.375, 0.334,
  0.297, 0.265, 0.236, 0.210, 0.206,
];

export function WireDrawingCalculatorPage() {
  const { role, username, authorizedTools = [], refetchPermissions } = useAuth();
  const defaultOperator = username ? `${username.toUpperCase()} / ${role || 'OPERATOR'}` : 'TOOL ROOM / ADMIN';
  const { state: dies, set: setDies, undo, redo, canUndo, canRedo } = useUndo<number[]>(DEFAULT_DIES);
  const [selectedPassIdx, setSelectedPassIdx] = useState<number | null>(0);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [docRef, setDocRef] = useState('');
  const [workOrder, setWorkOrder] = useState('WDC-JOB-2026-001');
  const [machineName, setMachineName] = useState('Multi-Wire Drawing Line 01');
  const [notes, setNotes] = useState(
    'Production drafting schedule verified within standard elongation tolerances. No central burst defect risk detected.'
  );
  const [operator, setOperator] = useState(defaultOperator);
  const [printMode, setPrintMode] = useState<PrintLayoutMode>('full-report');
  const printRef = useRef<HTMLDivElement>(null);

  // Sync latest permissions on page load
  useEffect(() => {
    refetchPermissions?.();
  }, [refetchPermissions]);

  // Keep operator updated when auth loaded
  useEffect(() => {
    if (defaultOperator && operator === 'TOOL ROOM / ADMIN') {
      setOperator(defaultOperator);
    }
  }, [defaultOperator, operator]);

  const isRoot = role === 'ROOT';
  const canAccess3DHeatmap = isRoot || authorizedTools.includes('3d-stress-heatmap');
  const canAccessTheory = isRoot || authorizedTools.includes('engineering-theory');

  const { request } = useApi();

  // Pure client-side instantaneous calculation (0ms latency)
  const passes = useMemo(() => calculatePassData(dies), [dies]);
  const stats = useMemo(() => calculateStatistics(dies, passes), [dies, passes]);
  const consistency = useMemo(() => calculateConsistency(passes), [passes]);

  const handleParse = useCallback((d: number[]) => setDies(d), [setDies]);
  const handleDiesChange = useCallback((d: number[]) => setDies(d), [setDies]);

  const handleOpenPrintPreview = useCallback(async () => {
    try {
      const res = await request<PrintRecordNextRefResponse>('/api/history/print-records/next-ref/');
      if (res) {
        if (res.doc_ref) setDocRef(res.doc_ref);
        if (res.default_work_order && workOrder === 'WDC-JOB-2026-001') {
          setWorkOrder(res.default_work_order);
        }
      }
    } catch (err) {
      console.warn('Could not fetch next print ref, using fallback:', err);
    }
    setIsPrintModalOpen(true);
  }, [request, workOrder]);

  const handlePrintCompleted = useCallback(async () => {
    try {
      const res = await request<PrintRecordNextRefResponse>('/api/history/print-records/next-ref/');
      if (res?.doc_ref) {
        setDocRef(res.doc_ref);
      }
    } catch {
      // ignore
    }
  }, [request]);

  // Global Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y hotkeys for undo/redo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        const target = e.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.tagName === 'SELECT' ||
            target.isContentEditable)
        ) {
          return;
        }
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        const target = e.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.tagName === 'SELECT' ||
            target.isContentEditable)
        ) {
          return;
        }
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  const selectedPass =
    selectedPassIdx !== null && selectedPassIdx < passes.length ? passes[selectedPassIdx] : null;

  const simulatedDie = selectedPass
    ? {
        die_type: 'ROUND',
        die_id: `PASS-${selectedPass.pass}`,
        punched_size: selectedPass.toDie.toString(),
        current_size: selectedPass.toDie.toString(),
        inlet_size: selectedPass.fromDie.toString(),
        status: 'RUNNING',
        casing: 'Standard Carbide',
      }
    : null;

  return (
    <>
      {/* Main Interactive Screen UI (Hidden during Print) */}
      <div className="min-h-[calc(100vh-64px)] bg-[var(--color-bg)] text-[var(--color-text)] py-6 px-4 sm:px-6 lg:px-8 font-mono print:hidden transition-colors duration-150">
        <div className="max-w-[1400px] mx-auto space-y-6" ref={printRef}>
          <Header />

          <InputPanel onParse={handleParse} currentDies={dies} />

          {passes.length > 0 && (
            <>
              {/* Results Table (Full width) */}
              <ResultsTable
                passes={passes}
                dies={dies}
                onDiesChange={handleDiesChange}
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={undo}
                onRedo={redo}
                selectedPassIdx={selectedPassIdx}
                onSelectPass={setSelectedPassIdx}
              />

              {/* Pass CAD Visualizer */}
              {simulatedDie && selectedPass && (
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-4 rounded-sm shadow-xs font-mono">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2 mb-3">
                    <span className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">
                      Pass #{selectedPass.pass} CAD Visualizer (Ø {selectedPass.toDie.toFixed(3)} mm)
                    </span>
                    <span className="text-xs text-[var(--color-text-secondary)]">
                      Inlet: Ø {selectedPass.fromDie.toFixed(3)} mm &bull; Reduction:{' '}
                      <span className="text-emerald-500 font-bold">-{selectedPass.areaReduction.toFixed(2)}%</span> &bull;
                      Elongation: <span className="text-blue-500 font-bold">+{selectedPass.elongation.toFixed(2)}%</span> &bull;
                      Ratio: <span className="font-bold text-[var(--color-text)]">{selectedPass.reductionRatio.toFixed(2)}</span>
                    </span>
                  </div>
                  <div className="max-w-md mx-auto">
                    <Suspense fallback={<BlueprintSkeleton />}>
                      <DieBlueprint die={simulatedDie} activeHighlight={null} onHoverDim={() => {}} />
                    </Suspense>
                  </div>
                </div>
              )}

              {/* Graphical Die Progression & Reduction Taper Pipeline */}
              <DieProgression dies={dies} onDiesChange={handleDiesChange} />

              {/* Side-by-Side Drafting Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Suspense fallback={<ChartSkeleton />}>
                  <ElongationChart passes={passes} />
                </Suspense>
                <Suspense fallback={<ChartSkeleton />}>
                  <AreaReductionChart passes={passes} />
                </Suspense>
              </div>

              {/* Summary Telemetry & Quick Action Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {stats && <StatisticsPanel stats={stats} />}
                <div className="space-y-4">
                  {consistency && <PassConsistency consistency={consistency} />}
                  {stats && (
                    <ExportPanel
                      passes={passes}
                      stats={stats}
                      dies={dies}
                      onOpenPrintPreview={handleOpenPrintPreview}
                    />
                  )}
                  <SaveLoad dies={dies} onLoad={setDies} />
                </div>
              </div>

              {/* Tolerance Target Monitoring & Die Progression Suggester */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <TargetChecker passes={passes} />
                <DieSuggester dies={dies} />
              </div>

              {/* Schedule Side-by-Side Comparison Matrix */}
              <ComparePanel currentDies={dies} />
            </>
          )}

          {/* 3D Stress Heatmap Module */}
          {canAccess3DHeatmap && passes.length > 0 && (
            <Suspense fallback={<PanelSkeleton />}>
              <StressHeatmap3D passes={passes} />
            </Suspense>
          )}

          {/* Theory & Fundamentals Module */}
          {canAccessTheory && (
            <Suspense fallback={<PanelSkeleton />}>
              <TheoryPanel />
            </Suspense>
          )}
        </div>
      </div>

      {/* Dedicated Technical Data Sheet Document (ISO/DIN Vector Print Layout) */}
      <div className="hidden print:block w-full bg-white text-slate-900">
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
          operator={operator}
          printMode={printMode}
        />
      </div>

      {/* Interactive Print Preview & Document Settings Modal */}
      <PrintPreviewModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        passes={passes}
        stats={stats}
        dies={dies}
        consistency={consistency}
        docRef={docRef}
        onDocRefChange={setDocRef}
        workOrder={workOrder}
        onWorkOrderChange={setWorkOrder}
        machineName={machineName}
        onMachineNameChange={setMachineName}
        notes={notes}
        onNotesChange={setNotes}
        operator={operator}
        onOperatorChange={setOperator}
        printMode={printMode}
        onPrintModeChange={setPrintMode}
        onPrintCompleted={handlePrintCompleted}
      />
    </>
  );
}

export default WireDrawingCalculatorPage;
