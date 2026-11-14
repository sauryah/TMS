import React from 'react';
import type { PassData, Statistics, ConsistencyData, PrintLayoutMode } from '../types';
import { PrintSchematicPipeline } from './PrintSchematicPipeline';
import { PrintPassChart } from './PrintPassChart';

interface WireDrawingPrintReportProps {
  passes: PassData[];
  stats: Statistics | null;
  dies: number[];
  consistency?: ConsistencyData | null;
  docRef?: string;
  workOrder?: string;
  machineName?: string;
  toolingSet?: string;
  notes?: string;
  operator?: string;
  preparedByTitle?: string;
  preparedBySubtitle?: string;
  checkedByTitle?: string;
  checkedBySubtitle?: string;
  approvedByTitle?: string;
  approvedBySubtitle?: string;
  printMode?: PrintLayoutMode;
}

export const WireDrawingPrintReport: React.FC<WireDrawingPrintReportProps> = ({
  passes,
  stats,
  dies,
  consistency,
  docRef,
  workOrder = 'WDC-JOB-2026-001',
  machineName = 'Multi-Wire Drawing Line 01',
  toolingSet,
  notes = 'Production drafting schedule verified within standard elongation tolerances. No central burst risk detected.',
  operator = 'ADMIN',
  preparedByTitle = 'Prepared By:',
  preparedBySubtitle = 'Originator',
  checkedByTitle = 'Checked By:',
  checkedBySubtitle = 'Technical Reviewer',
  approvedByTitle = 'Approved By:',
  approvedBySubtitle = 'Authorised Signatory',
  printMode = 'full-report',
}) => {
  if (dies.length === 0 || !stats) return null;

  const dateStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = new Date().toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const effectiveDocRef = docRef || `TDS-${dateStr.replace(/ /g, '')}`;
  const effectiveToolingSet = toolingSet || machineName || 'Set 01';
  const reductions = passes.map((p) => p.areaReduction);
  const minRed = reductions.length > 0 ? Math.min(...reductions) : 0;
  const maxRed = reductions.length > 0 ? Math.max(...reductions) : 0;

  // =========================================================================
  // SUB-COMPONENT: REUSABLE HEADER BLOCK
  // =========================================================================
  const renderHeader = (subtitle: string, pageIndicator?: string) => (
    <div className="border-b-2 border-slate-900 pb-2 mb-3">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="bg-slate-900 text-white px-1.5 py-0.2 text-[9px] font-bold tracking-wider rounded-xs font-mono">
              TMS
            </span>
          </div>
          <h1 className="text-[13px] font-extrabold text-slate-950 uppercase tracking-tight m-0 leading-tight">
            Wire Drawing Technical Data Sheet (TDS) & Drafting Schedule
          </h1>
          <p className="text-[9px] text-slate-600 mt-0.5 font-mono">
            {subtitle}
          </p>
        </div>

        <div className="text-right border border-slate-300 bg-slate-50 px-2 py-1 rounded-xs min-w-[190px] shrink-0 font-mono">
          <div className="flex justify-between items-center text-[8.5px] text-slate-500 uppercase font-semibold">
            <span>Doc Reference</span>
            {pageIndicator && <span className="font-bold text-blue-700">{pageIndicator}</span>}
          </div>
          <div className="text-[11px] font-bold text-slate-900 leading-tight">{effectiveDocRef}</div>
          <div className="text-[8px] text-slate-600 mt-0.5">
            {dateStr} • {timeStr}
          </div>
        </div>
      </div>

      {/* Operational Context Strip */}
      <div className="grid grid-cols-4 gap-2 mt-2 pt-1.5 border-t border-slate-200 text-[9px] font-mono">
        <div>
          <span className="text-slate-500 uppercase font-semibold block">Work Order:</span>
          <span className="font-bold text-slate-900 truncate block">{workOrder}</span>
        </div>
        <div>
          <span className="text-slate-500 uppercase font-semibold block">Tooling Set:</span>
          <span className="font-bold text-slate-900 truncate block">{effectiveToolingSet}</span>
        </div>
        <div>
          <span className="text-slate-500 uppercase font-semibold block">Prepared By:</span>
          <span className="font-bold text-slate-800 truncate block">{operator}</span>
        </div>
        <div>
          <span className="text-slate-500 uppercase font-semibold block">Quality Status:</span>
          <span className="font-bold text-emerald-700 truncate block">
            {consistency ? `${consistency.qualityRating} (${consistency.stars}★)` : 'ISO 9001 VERIFIED'}
          </span>
        </div>
      </div>
    </div>
  );

  // =========================================================================
  // SUB-COMPONENT: HIGH-LEVEL KPI METRICS BAR
  // =========================================================================
  const renderKPIs = () => (
    <div className="grid grid-cols-6 gap-1.5 text-center mb-3 font-mono">
      <div className="bg-white border border-slate-200 py-1 px-1 rounded-xs">
        <span className="text-[8px] text-slate-500 uppercase block">Inlet Size</span>
        <span className="text-[10px] font-bold text-slate-900 block leading-tight">Ø {stats.startingDie.toFixed(3)} mm</span>
      </div>
      <div className="bg-white border border-slate-200 py-1 px-1 rounded-xs">
        <span className="text-[8px] text-slate-500 uppercase block">Finish Size</span>
        <span className="text-[10px] font-bold text-slate-900 block leading-tight">Ø {stats.finalDie.toFixed(3)} mm</span>
      </div>
      <div className="bg-white border border-slate-200 py-1 px-1 rounded-xs">
        <span className="text-[8px] text-slate-500 uppercase block">Total Area Red.</span>
        <span className="text-[10px] font-bold text-emerald-700 block leading-tight">
          {stats.overallAreaReduction.toFixed(2)} %
        </span>
      </div>
      <div className="bg-white border border-slate-200 py-1 px-1 rounded-xs">
        <span className="text-[8px] text-slate-500 uppercase block">Total Ratio</span>
        <span className="text-[10px] font-bold text-blue-700 block leading-tight">
          {stats.overallReductionRatio.toFixed(2)}
        </span>
      </div>
      <div className="bg-white border border-slate-200 py-1 px-1 rounded-xs">
        <span className="text-[8px] text-slate-500 uppercase block">Avg Elongation</span>
        <span className="text-[10px] font-bold text-purple-700 block leading-tight">
          {stats.avgElongation.toFixed(2)} %
        </span>
      </div>
      <div className="bg-white border border-slate-200 py-1 px-1 rounded-xs">
        <span className="text-[8px] text-slate-500 uppercase block">Avg Area Red.</span>
        <span className="text-[10px] font-bold text-slate-900 block leading-tight">
          {stats.avgAreaReduction.toFixed(2)} %
        </span>
      </div>
    </div>
  );

  // =========================================================================
  // SUB-COMPONENT: FULL PASS DATA TABLE
  // =========================================================================
  const renderTable = (_compact = false) => (
    <div className="border border-slate-300 rounded-sm bg-white mb-3 shadow-xs font-mono">
      <div className="flex justify-between items-center px-2.5 py-1 border-b border-slate-300 bg-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-extrabold text-slate-900 uppercase tracking-wider">
            Pass-By-Pass Dimensional Reduction & Elongation Schedule
          </span>
          <span className="text-[8.5px] text-slate-700 bg-white px-1.5 py-0.2 rounded border border-slate-300 font-bold">
            {passes.length} PASSES
          </span>
        </div>
        <span className="text-[8.5px] text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-300 font-semibold">
          UNITS: mm, mm², % • ISO 240 / ASTM B1
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-[10px] leading-tight font-mono">
          <thead>
            <tr className="bg-slate-100 text-slate-950 font-extrabold border-b border-slate-300 text-[9px] uppercase tracking-wider">
              <th className="py-1 px-1.5 border-r border-slate-300 text-center w-8">PASS</th>
              <th className="py-1 px-2 border-r border-slate-300 text-right">FROM (Ø mm)</th>
              <th className="py-1 px-2 border-r border-slate-300 text-right">TO (Ø mm)</th>
              <th className="py-1 px-2 border-r border-slate-300 text-right">AREA IN (mm²)</th>
              <th className="py-1 px-2 border-r border-slate-300 text-right">AREA OUT (mm²)</th>
              <th className="py-1 px-2 border-r border-slate-300 text-right bg-emerald-50 text-emerald-950 font-black">
                AREA RED. ΔA (%)
              </th>
              <th className="py-1 px-2 border-r border-slate-300 text-right bg-blue-50 text-blue-950 font-black">
                ELONGATION E (%)
              </th>
              <th className="py-1 px-2 text-right">RATIO R</th>
            </tr>
          </thead>
          <tbody>
            {passes.map((p, idx) => (
              <tr
                key={p.pass}
                className={`border-b border-slate-200 ${
                  idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'
                }`}
              >
                <td className="border-r border-slate-200 text-center font-bold text-slate-700 bg-slate-50/40 py-0.5 px-1">
                  P{p.pass < 10 ? `0${p.pass}` : p.pass}
                </td>
                <td className="border-r border-slate-200 text-right font-medium text-slate-700 py-0.5 px-2">
                  {p.fromDie.toFixed(3)}
                </td>
                <td className="border-r border-slate-200 text-right font-bold text-slate-950 text-[10.5px] py-0.5 px-2">
                  Ø {p.toDie.toFixed(3)}
                </td>
                <td className="border-r border-slate-200 text-right text-slate-600 py-0.5 px-2">
                  {p.areaBefore.toFixed(3)}
                </td>
                <td className="border-r border-slate-200 text-right text-slate-600 py-0.5 px-2">
                  {p.areaAfter.toFixed(3)}
                </td>
                <td className="border-r border-slate-200 text-right font-bold text-emerald-800 bg-emerald-50/50 text-[10.5px] py-0.5 px-2">
                  -{p.areaReduction.toFixed(2)} %
                </td>
                <td className="border-r border-slate-200 text-right font-bold text-blue-800 bg-blue-50/50 text-[10.5px] py-0.5 px-2">
                  +{p.elongation.toFixed(2)} %
                </td>
                <td className="text-right text-slate-700 font-semibold py-0.5 px-2">
                  {p.reductionRatio.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            {/* Average Row */}
            <tr className="bg-slate-100 font-bold border-t-2 border-slate-400 text-slate-900 text-[9px]">
              <td className="py-1 px-1.5 border-r border-slate-300 text-center uppercase">AVG</td>
              <td className="py-1 px-2 border-r border-slate-300 text-right text-slate-400">—</td>
              <td className="py-1 px-2 border-r border-slate-300 text-right text-slate-400">—</td>
              <td className="py-1 px-2 border-r border-slate-300 text-right text-slate-400">—</td>
              <td className="py-1 px-2 border-r border-slate-300 text-right text-slate-400">—</td>
              <td className="py-1 px-2 border-r border-slate-300 text-right text-emerald-900 bg-emerald-100/60 font-black">
                -{stats.avgAreaReduction.toFixed(2)} %
              </td>
              <td className="py-1 px-2 border-r border-slate-300 text-right text-blue-900 bg-blue-100/60 font-black">
                +{stats.avgElongation.toFixed(2)} %
              </td>
              <td className="py-1 px-2 text-right font-bold">
                {(passes.reduce((s, p) => s + p.reductionRatio, 0) / passes.length).toFixed(2)}
              </td>
            </tr>
            {/* Range Row */}
            <tr className="bg-slate-50 font-semibold border-t border-slate-200 text-slate-700 text-[8.5px]">
              <td className="py-0.5 px-1.5 border-r border-slate-300 text-center uppercase">RANGE</td>
              <td className="py-0.5 px-2 border-r border-slate-300 text-right text-slate-400">—</td>
              <td className="py-0.5 px-2 border-r border-slate-300 text-right text-slate-400">—</td>
              <td className="py-0.5 px-2 border-r border-slate-300 text-right text-slate-400">—</td>
              <td className="py-0.5 px-2 border-r border-slate-300 text-right text-slate-400">—</td>
              <td className="py-0.5 px-2 border-r border-slate-300 text-right text-slate-800 font-bold">
                {minRed.toFixed(1)}% – {maxRed.toFixed(1)}%
              </td>
              <td className="py-0.5 px-2 border-r border-slate-300 text-right text-slate-800 font-bold">
                +{stats.minElongation.toFixed(1)}% – +{stats.maxElongation.toFixed(1)}%
              </td>
              <td className="py-0.5 px-2 text-right text-slate-400">—</td>
            </tr>
            {/* Total / Overall Row */}
            <tr className="bg-slate-200 font-extrabold border-t border-slate-300 text-slate-950 text-[9px]">
              <td className="py-1 px-1.5 border-r border-slate-300 text-center uppercase">TOTAL</td>
              <td className="py-1 px-2 border-r border-slate-300 text-right font-bold">Ø {stats.startingDie.toFixed(3)}</td>
              <td className="py-1 px-2 border-r border-slate-300 text-right font-black">Ø {stats.finalDie.toFixed(3)}</td>
              <td className="py-1 px-2 border-r border-slate-300 text-right text-slate-700">
                {passes[0]?.areaBefore.toFixed(3)}
              </td>
              <td className="py-1 px-2 border-r border-slate-300 text-right text-slate-700">
                {passes[passes.length - 1]?.areaAfter.toFixed(3)}
              </td>
              <td className="py-1 px-2 border-r border-slate-300 text-right text-emerald-950 bg-emerald-200/60 font-black">
                -{stats.overallAreaReduction.toFixed(2)} %
              </td>
              <td className="py-1 px-2 border-r border-slate-300 text-right text-blue-950 bg-blue-200/60 font-black">
                +{((stats.overallReductionRatio - 1) * 100).toFixed(1)} %
              </td>
              <td className="py-1 px-2 text-right font-black">
                {stats.overallReductionRatio.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );

  // =========================================================================
  // SUB-COMPONENT: OPERATIONAL SIGN-OFF BLOCK
  // =========================================================================
  const renderSignOff = (compact = false) => (
    <div className="border border-slate-300 rounded-sm p-2.5 bg-slate-50/70 mb-2 font-mono">
      <div className="text-[9px] font-bold text-slate-900 uppercase tracking-wider mb-1.5 pb-1 border-b border-slate-200 flex justify-between items-center">
        <span>Engineering Verification & Sign-Off</span>
        <span className="text-[8px] text-slate-500 font-normal">Job: [{workOrder}] • Tooling: [{effectiveToolingSet}]</span>
      </div>

      {!compact && notes && (
        <div className="mb-2 text-[8.5px]">
          <span className="text-slate-500 font-semibold block mb-0.5">Shopfloor Notes & Instructions:</span>
          <p className="text-slate-800 bg-white p-1.5 border border-slate-200 rounded-xs leading-normal m-0">
            {notes}
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 pt-1 text-[8.5px]">
        <div>
          <span className="text-slate-500 uppercase block font-semibold">{preparedByTitle}</span>
          <div className="h-5 border-b border-slate-400 mt-1" />
          <div className="mt-0.5">
            <span className="text-slate-900 font-bold block leading-tight">{operator}</span>
            <span className="text-slate-500 text-[8px] block">{preparedBySubtitle}</span>
          </div>
        </div>
        <div>
          <span className="text-slate-500 uppercase block font-semibold">{checkedByTitle}</span>
          <div className="h-5 border-b border-slate-400 mt-1" />
          <span className="text-slate-500 text-[8px] mt-0.5 block">{checkedBySubtitle}</span>
        </div>
        <div>
          <span className="text-slate-500 uppercase block font-semibold">{approvedByTitle}</span>
          <div className="h-5 border-b border-slate-400 mt-1" />
          <span className="text-slate-500 text-[8px] mt-0.5 block">{approvedBySubtitle}</span>
        </div>
      </div>
    </div>
  );

  // =========================================================================
  // SUB-COMPONENT: OFFICIAL ENGINEERING DISCLAIMER
  // =========================================================================
  const renderDisclaimer = (compact = false) => (
    <div className="p-2 border border-slate-300 rounded-sm bg-slate-50/50 text-[8px] text-slate-600 leading-tight font-mono">
      <div className="font-bold text-slate-800 uppercase tracking-wider mb-0.5 flex items-center justify-between">
        <span>Engineering Disclaimer — Wire Drawing Workbench</span>
        <span className="font-mono text-[7.5px] text-slate-500">Notice ID: ENG-DISC-01</span>
      </div>
      <p className="mb-0.5 text-slate-700">
        Wire Drawing Workbench is an engineering calculation and drafting aid. It does not replace qualified engineering
        judgment, independent verification, applicable standards, or factory-specific procedures.
      </p>
      <p className="font-semibold text-slate-800 m-0">
        Users are responsible for verifying all input data, units, formulas, assumptions, tolerances, drawing dimensions,
        and calculated outputs before using them for tooling decisions, machine setup, or manufacturing.
        {!compact && (
          <span className="font-normal text-slate-600 ml-1">
            The software does not itself certify a product, process, calculation, or factory as compliant with ISO 9001,
            DIN standards, or any other standard.
          </span>
        )}
      </p>
    </div>
  );

  // =========================================================================
  // LAYOUT MODE: VISUAL PIPELINE TRAVELER (1 PAGE)
  // =========================================================================
  if (printMode === 'visual-pipeline') {
    return (
      <div className="print-page select-text font-mono text-[10px] bg-white text-slate-900 p-4 sm:p-6 print:p-0 print:m-0 max-w-[900px] mx-auto">
        {renderHeader('Visual Drafting Traveler & Die Reduction Sequence', 'Page 1 of 1')}
        {renderKPIs()}

        {/* Complete Systematic Draughting Pipeline */}
        <div className="mb-3">
          <PrintSchematicPipeline dies={dies} passes={passes} />
        </div>

        {renderSignOff(false)}
        {renderDisclaimer(true)}

        <div className="mt-2 text-center text-[8px] text-slate-400 font-mono">
          TMS Wire Drawing Workbench • Visual Drafting Traveler • Ref: {effectiveDocRef}
        </div>
      </div>
    );
  }

  // =========================================================================
  // LAYOUT MODE: DATA TABLE TRAVELER (1 PAGE)
  // =========================================================================
  if (printMode === 'data-table') {
    return (
      <div className="print-page select-text font-mono text-[10px] bg-white text-slate-900 p-4 sm:p-6 print:p-0 print:m-0 max-w-[900px] mx-auto">
        {renderHeader('Numerical Drafting Schedule & Cross-Sectional Analysis', 'Page 1 of 1')}
        {renderKPIs()}
        {renderTable(true)}
        {renderSignOff(true)}
        {renderDisclaimer(true)}

        <div className="mt-2 text-center text-[8px] text-slate-400 font-mono">
          TMS Wire Drawing Workbench • Numerical Pass Schedule • Ref: {effectiveDocRef}
        </div>
      </div>
    );
  }

  // =========================================================================
  // LAYOUT MODE: FULL REPORT (2 PAGES)
  // =========================================================================
  return (
    <div className="select-text font-mono text-[10px] bg-white text-slate-900 max-w-[900px] mx-auto">
      {/* -------------------------------------------------------------------
          PAGE 1 OF 2: PASS TABLE & PROCESS SCHEDULE
          ------------------------------------------------------------------- */}
      <div className="print-page print-page-break p-4 sm:p-6 print:p-0 print:m-0">
        {renderHeader('Process Pass Schedule & Reduction Analysis', 'Page 1 of 2')}
        {renderKPIs()}

        {/* Complete Die Series Sequence */}
        <div className="mb-2.5">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[9px] font-bold text-slate-800 uppercase tracking-wider">
              Complete Die Series Sequence ({dies.length} Stations):
            </span>
            <span className="text-[8px] text-slate-500 font-mono">
              Inlet: Ø {stats.startingDie.toFixed(3)} mm ➔ Finish: Ø {stats.finalDie.toFixed(3)} mm
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1 bg-white border border-slate-300 p-1.5 rounded-xs text-[9px] font-mono">
            {dies.map((d, i) => (
              <React.Fragment key={i}>
                <span
                  className={`px-1 py-0.2 rounded border font-bold ${
                    i === 0
                      ? 'bg-blue-50 text-blue-900 border-blue-300'
                      : i === dies.length - 1
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                      : 'bg-slate-100 text-slate-900 border-slate-300'
                  }`}
                >
                  Ø {d.toFixed(3)}
                </span>
                {i < dies.length - 1 && <span className="text-slate-400 font-bold text-[8px]">→</span>}
              </React.Fragment>
            ))}
          </div>
        </div>

        {renderTable(false)}
        {renderSignOff(false)}

        <div className="mt-2 flex justify-between text-[8px] text-slate-400 font-mono border-t border-slate-200 pt-1">
          <span>TMS Wire Drawing Workbench TDS</span>
          <span>Doc Ref: {effectiveDocRef}</span>
          <span className="font-bold text-slate-600">PAGE 1 OF 2</span>
        </div>
      </div>

      {/* -------------------------------------------------------------------
          PAGE 2 OF 2: SCHEMATIC PIPELINE & QUALITY CHARTS
          ------------------------------------------------------------------- */}
      <div className="print-page print-page-2 p-4 sm:p-6 print:p-0 print:m-0 mt-8 print:mt-0">
        {/* Page 2 Running Header */}
        <div className="border-b-2 border-slate-900 pb-2 mb-3 flex justify-between items-center font-mono">
          <div>
            <h2 className="text-[12px] font-extrabold text-slate-950 uppercase tracking-tight m-0">
              Wire Drawing TDS — Schematic Pipeline & Graphical Analysis
            </h2>
            <p className="text-[8.5px] text-slate-600 font-mono m-0">
              Deformation Taper Mechanics, Elongation Profile & Quality Governance
            </p>
          </div>
          <div className="text-right text-[8.5px] font-mono">
            <span className="text-slate-500">Job: {workOrder} • Tooling: {effectiveToolingSet} • </span>
            <span className="font-bold text-blue-700">PAGE 2 OF 2</span>
          </div>
        </div>

        {/* Section 02: Systematic Draughting Pipeline (4 passes per row) */}
        <div className="mb-3">
          <PrintSchematicPipeline dies={dies} passes={passes} />
        </div>

        {/* Section 04: Vector Charts (Full Width Stacked) */}
        <div className="space-y-2.5 mb-3">
          <PrintPassChart
            title="Elongation per Pass (%)"
            metric="elongation"
            passes={passes}
            barColor="#3b82f6"
            targetMin={20}
            targetMax={28}
          />
          <PrintPassChart
            title="Area Reduction per Pass (%)"
            metric="areaReduction"
            passes={passes}
            barColor="#10b981"
            targetMin={18}
            targetMax={24}
          />
        </div>

        {/* Section 06: Official Engineering Disclaimer */}
        {renderDisclaimer(false)}

        <div className="mt-3 flex justify-between text-[8px] text-slate-400 font-mono border-t border-slate-200 pt-1">
          <span>TMS Wire Drawing Workbench TDS</span>
          <span>Doc Ref: {effectiveDocRef}</span>
          <span className="font-bold text-slate-600">PAGE 2 OF 2</span>
        </div>
      </div>
    </div>
  );
};

export default WireDrawingPrintReport;
