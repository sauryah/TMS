import React from 'react';
import type { PassData } from '../types';

interface PrintSchematicPipelineProps {
  dies: number[];
  passes?: PassData[];
}

export const PrintSchematicPipeline: React.FC<PrintSchematicPipelineProps> = ({
  dies,
  passes = [],
}) => {
  if (dies.length === 0) return null;

  const totalPasses = dies.length - 1;
  if (totalPasses <= 0) return null;

  // Strictly 4 passes per row
  const CHUNK_SIZE = 4;
  const numRows = Math.ceil(totalPasses / CHUNK_SIZE);

  return (
    <div className="bg-white border border-slate-300 rounded-sm p-3 font-mono print:border-slate-400 space-y-2.5">
      <div className="flex justify-between items-center pb-1.5 border-b border-slate-200">
        <div>
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
            02. Systematic Draughting Pipeline
          </span>
          <span className="text-[9.5px] text-slate-500 block mt-0.5">
            Sequential pass reduction schedule with entry/exit gauges, deformation ratios and elongation metrics
          </span>
        </div>
        <span className="text-[10.5px] font-bold text-slate-800 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded">
          {dies.length} STATIONS • {totalPasses} DRAFT PASSES
        </span>
      </div>

      <div className="space-y-2">
        {Array.from({ length: numRows }).map((_, rowIndex) => {
          const startPassIndex = rowIndex * CHUNK_SIZE;
          const endPassIndex = Math.min(startPassIndex + CHUNK_SIZE, totalPasses);
          const rowPassIndices: number[] = [];
          for (let p = startPassIndex; p < endPassIndex; p++) {
            rowPassIndices.push(p);
          }

          return (
            <div key={rowIndex} className="flex items-center flex-nowrap gap-2 w-full">
              {rowPassIndices.map((passIdx, idxInRow) => {
                const passNum = passIdx + 1;
                const isLast = passIdx === totalPasses - 1;
                const stageNum = rowIndex + 1;
                const passData = passes[passIdx];

                const entryD = dies[passIdx];
                const exitD = dies[passIdx + 1];

                const areaReduction = passData
                  ? passData.areaReduction
                  : ((Math.pow(entryD, 2) - Math.pow(exitD, 2)) / Math.pow(entryD, 2)) * 100;

                const elongation = passData
                  ? passData.elongation
                  : ((Math.pow(entryD, 2) / Math.pow(exitD, 2)) - 1) * 100;

                return (
                  <React.Fragment key={passIdx}>
                    {/* Pass Reduction Card */}
                    <div className="flex-1 min-w-0 border border-slate-300 bg-slate-50/80 rounded-sm p-1.5 flex flex-col justify-between shadow-xs print:border-slate-400">
                      <div className="flex justify-between items-center border-b border-slate-200 pb-1 mb-1">
                        <span className="text-[9px] font-bold text-slate-700 uppercase">
                          PASS {passNum.toString().padStart(2, '0')}
                        </span>
                        <span
                          className={`text-[8px] px-1 py-0.2 rounded font-bold ${
                            isLast
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {isLast ? 'FINAL' : `STAGE ${stageNum}`}
                        </span>
                      </div>

                      <div className="text-[11px] font-bold text-slate-900 leading-tight mb-1 whitespace-nowrap">
                        Ø {entryD.toFixed(3)} <span className="text-slate-400 font-normal">➔</span> {exitD.toFixed(3)}
                        <span className="text-[8px] text-slate-500 font-normal ml-0.5">mm</span>
                      </div>

                      <div className="flex justify-between items-center text-[8.5px] border-t border-slate-200/80 pt-1">
                        <span className="text-slate-600">
                          Red:{' '}
                          <span className="font-bold text-emerald-700">
                            -{areaReduction.toFixed(1)}%
                          </span>
                        </span>
                        <span className="text-slate-600">
                          Elg:{' '}
                          <span className="font-bold text-amber-700">
                            +{elongation.toFixed(1)}%
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Arrow between passes in the same row */}
                    {idxInRow < rowPassIndices.length - 1 && (
                      <div className="flex items-center justify-center text-slate-400 select-none px-0.5">
                        <svg width="14" height="12" viewBox="0 0 14 12" fill="none">
                          <path
                            d="M1 6H12M12 6L8 2M12 6L8 10"
                            stroke="#94a3b8"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}

              {/* If last row has fewer than 4 passes, fill with placeholders to keep widths identical */}
              {rowPassIndices.length < CHUNK_SIZE &&
                Array.from({ length: CHUNK_SIZE - rowPassIndices.length }).map((_, phIdx) => (
                  <React.Fragment key={`ph-${phIdx}`}>
                    <div className="flex items-center justify-center opacity-0 select-none px-0.5">
                      <div className="w-[14px]" />
                    </div>
                    <div className="flex-1 min-w-0 opacity-0 pointer-events-none" />
                  </React.Fragment>
                ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PrintSchematicPipeline;
