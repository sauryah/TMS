import { motion } from 'framer-motion';
import { FileSpreadsheet, FileText, FileDown, Copy, Printer } from 'lucide-react';
import type { PassData, Statistics } from '../types';
import { exportCSV, exportExcel, exportPDF, copyResultsToClipboard } from '../utils/export';
import { useToast } from '../../../contexts';

interface ExportPanelProps {
  passes: PassData[];
  stats: Statistics;
  dies: number[];
  onOpenPrintPreview?: () => void;
}

export default function ExportPanel({ passes, stats, dies, onOpenPrintPreview }: ExportPanelProps) {
  const { showToast } = useToast();

  const handleCopy = async () => {
    await copyResultsToClipboard(passes, stats);
    showToast('Copied summary to clipboard', 'success');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.45 }}
      className="wdc-panel"
    >
      <h3 className="text-[15px] font-semibold text-[var(--color-text)] m-0 mb-4">Export & Actions</h3>
      <div className="flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={() => {
            if (onOpenPrintPreview) {
              onOpenPrintPreview();
            } else {
              window.print();
            }
          }}
          className="wdc-btn wdc-btn-primary text-xs font-semibold py-1.5 px-3 cursor-pointer"
          title="Open Technical Data Sheet Print Preview (ISO 9001 Traveler)"
          aria-label="Open Technical Data Sheet Print Preview"
        >
          <Printer className="w-3.5 h-3.5" aria-hidden="true" /> Print TDS Report
        </button>

        <button
          type="button"
          onClick={handleCopy}
          className="wdc-btn wdc-btn-secondary text-xs py-1.5 px-3 cursor-pointer"
          aria-label="Copy calculation summary to clipboard"
          title="Copy tab-separated schedule summary to clipboard"
        >
          <Copy className="w-3.5 h-3.5" aria-hidden="true" /> Copy Summary
        </button>

        <button
          type="button"
          onClick={() => exportExcel(passes, stats, dies)}
          className="wdc-btn wdc-btn-ghost text-xs py-1.5 px-2.5 cursor-pointer"
          title="Export schedule to Microsoft Excel format"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" aria-hidden="true" /> Excel
        </button>

        <button
          type="button"
          onClick={() => exportCSV(passes, stats)}
          className="wdc-btn wdc-btn-ghost text-xs py-1.5 px-2.5 cursor-pointer"
          title="Export schedule to CSV format"
        >
          <FileText className="w-3.5 h-3.5" aria-hidden="true" /> CSV
        </button>

        <button
          type="button"
          onClick={() => exportPDF(passes, stats, dies)}
          className="wdc-btn wdc-btn-ghost text-xs py-1.5 px-2.5 cursor-pointer"
          title="Export schedule to PDF format"
        >
          <FileDown className="w-3.5 h-3.5" aria-hidden="true" /> PDF
        </button>
      </div>
    </motion.div>
  );
}
