import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDownWideNarrow, MoveHorizontal, Plus, X } from 'lucide-react';
import './DieProgression.css';

interface DieProgressionProps {
  dies: number[];
  onDiesChange?: (dies: number[]) => void;
}

export default function DieProgression({ dies, onDiesChange }: DieProgressionProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [hoveredDieIndex, setHoveredDieIndex] = useState<number | null>(null);
  const [hoveredArrowIndex, setHoveredArrowIndex] = useState<number | null>(null);

  if (dies.length === 0) return null;

  const isSortedDescending =
    dies.length <= 1 || dies.every((val, i, arr) => i === 0 || arr[i - 1] >= val);

  const handleSortDescending = () => {
    if (!onDiesChange) return;
    onDiesChange([...dies].sort((a, b) => b - a));
  };

  const getArea = (diameter: number) => Math.PI * Math.pow(diameter / 2, 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="die-progression rounded-2xl border p-4 sm:p-5 lg:p-6 shadow-xl"
    >
      <div className="die-progression__content">
        <div className="die-progression__header">
          <div className="die-progression__title-group">
            <span className="die-progression__section-number" aria-hidden="true">02</span>
            <div>
              <h3 className="die-progression__title">Schematic Drafting Pipeline</h3>
              <span className="die-progression__subtitle">
                Drag to sequence passes · Use + to insert a die · Remove a die from its card
              </span>
            </div>
          </div>
          <div className="die-progression__toolbar">
            {onDiesChange && dies.length > 1 && (
              <button
                type="button"
                onClick={handleSortDescending}
                data-testid="sort-descending-btn"
                className={`die-progression__sort ${!isSortedDescending ? 'die-progression__sort--warning' : ''}`}
                title={
                  !isSortedDescending
                    ? 'Passes are out of sequential reduction order. Sort from largest inlet to smallest finish.'
                    : 'Sort passes in descending order (largest to smallest gauge)'
                }
                aria-label="Sort passes descending from largest to smallest gauge"
              >
                <ArrowDownWideNarrow className="h-4 w-4" aria-hidden="true" />
                <span>Sort largest to smallest</span>
              </button>
            )}
            <span className="die-progression__schedule-count" aria-label={`${dies.length} pass schedule`}>
              <span className="die-progression__count-value">{dies.length}{' '}</span>
              <span>PASS SCHEDULE</span>
            </span>
          </div>
        </div>

        <div className="die-progression__viewport" role="region" aria-label="Die pass sequence">
          <div className="die-progression__track" role="list">
            <AnimatePresence initial={false}>
              {dies.map((d, i) => {
                const isDragging = draggedIndex === i;
                const wireRadiusLeft = 16;
                let areaRedPercent = 0;
                let elongationPercent = 0;
                let wireRadiusRight = wireRadiusLeft;

                if (i < dies.length - 1) {
                  const nextDie = dies[i + 1];
                  const areaBef = getArea(d);
                  const areaAft = getArea(nextDie);
                  areaRedPercent = ((areaBef - areaAft) / areaBef) * 100;
                  elongationPercent = ((Math.pow(d, 2) / Math.pow(nextDie, 2)) - 1) * 100;
                  wireRadiusRight = Math.max(5, Math.min(24, wireRadiusLeft * (nextDie / d)));
                }

                const isNegativeReduction = areaRedPercent < 0;
                const reductionFormatted = isNegativeReduction
                  ? `+${Math.abs(areaRedPercent).toFixed(1)}%`
                  : `-${areaRedPercent.toFixed(1)}%`;
                const stationType = i === 0
                  ? 'INLET'
                  : i === dies.length - 1
                    ? 'FINISH'
                    : 'DIE STATION';

                return (
                  <motion.div
                    key={`${d}-${i}`}
                      layout
                      draggable={Boolean(onDiesChange)}
                      role="listitem"
                      aria-label={`Pass ${i + 1}, ${stationType.toLowerCase()}, ${d.toFixed(3)} millimeters`}
                      data-testid={`die-card-${i}`}
                      onDragStart={() => setDraggedIndex(i)}
                      onDragEnter={() => {
                        if (draggedIndex === null || draggedIndex === i || !onDiesChange) return;
                        const updated = [...dies];
                        const [movedItem] = updated.splice(draggedIndex, 1);
                        updated.splice(i, 0, movedItem);
                        setDraggedIndex(i);
                        onDiesChange(updated);
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDragEnd={() => setDraggedIndex(null)}
                      onMouseEnter={() => setHoveredDieIndex(i)}
                      onMouseLeave={() => setHoveredDieIndex(null)}
                      className={`die-progression__die ${
                        isDragging ? 'die-progression__die--dragging' : ''
                      } ${hoveredDieIndex === i ? 'die-progression__die--hovered' : ''}`}
                    >
                      <div className="die-progression__die-heading">
                        <span className="die-progression__die-number">{String(i + 1).padStart(2, '0')}</span>
                        <span className="die-progression__die-type">{stationType}</span>
                        {onDiesChange && dies.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDiesChange(dies.filter((_, idx) => idx !== i));
                            }}
                            className="die-progression__remove"
                            title="Remove Pass"
                            aria-label={`Remove pass ${i + 1}`}
                          >
                            <X className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </div>

                      <div className="die-progression__gauge-label">DIE GAUGE</div>
                      <div className="die-progression__gauge">
                        <span>Ø {d.toFixed(3)}</span>
                        <span className="die-progression__unit">mm</span>
                      </div>

                      {i < dies.length - 1 ? (
                        <div
                          data-testid={`die-connector-${i}`}
                          onMouseEnter={() => setHoveredArrowIndex(i)}
                          onMouseLeave={() => setHoveredArrowIndex(null)}
                          className={`die-progression__connector ${hoveredArrowIndex === i ? 'die-progression__connector--active' : ''} ${isNegativeReduction ? 'die-progression__connector--reverse' : ''}`}
                        >
                          <div className="die-progression__transition-heading">
                            <span>PASS {String(i + 1).padStart(2, '0')} REDUCTION</span>
                            <span>TO STATION {String(i + 2).padStart(2, '0')}</span>
                          </div>
                          <div className="die-progression__wire-wrap">
                            <svg
                              viewBox="0 0 92 38"
                              className="die-progression__wire"
                              role="img"
                              aria-label={`Wire reduction from ${d.toFixed(3)} to ${dies[i + 1].toFixed(3)} millimeters`}
                            >
                              <defs>
                                <linearGradient id={`die-wire-gradient-${i}`} x1="0" y1="0" x2="1" y2="0">
                                  <stop offset="0%" stopColor="var(--dp-accent)" stopOpacity="0.3" />
                                  <stop offset="100%" stopColor="var(--dp-copper)" stopOpacity="0.42" />
                                </linearGradient>
                              </defs>
                              <path
                                d={`M 2 ${19 - wireRadiusLeft / 2} L 90 ${19 - wireRadiusRight / 2} L 90 ${19 + wireRadiusRight / 2} L 2 ${19 + wireRadiusLeft / 2} Z`}
                                fill={`url(#die-wire-gradient-${i})`}
                                stroke="var(--dp-accent)"
                                strokeOpacity="0.3"
                                strokeWidth="0.7"
                              />
                              <line
                                x1="2"
                                y1="19"
                                x2="90"
                                y2="19"
                                className="die-progression__wire-centerline"
                              />
                            </svg>

                            {onDiesChange && (
                              <button
                                type="button"
                                onClick={() => {
                                  const midVal = Math.round(((d + dies[i + 1]) / 2) * 1000) / 1000;
                                  const updated = [...dies];
                                  updated.splice(i + 1, 0, midVal);
                                  onDiesChange(updated);
                                }}
                                className="die-progression__insert"
                                title={`Insert pass size between ${d} and ${dies[i + 1]}`}
                                aria-label={`Insert pass size between ${d} and ${dies[i + 1]}`}
                              >
                                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                            )}
                          </div>

                          <div className="die-progression__connector-metrics">
                            <div>
                              <span>AREA RED.</span>
                              <strong>{reductionFormatted}</strong>
                            </div>
                            <div>
                              <span>ELONG.</span>
                              <strong>+{elongationPercent.toFixed(1)}%</strong>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="die-progression__die-footer">
                          <span>FINAL OUTPUT · {d.toFixed(3)} mm</span>
                          {onDiesChange && <MoveHorizontal className="h-3.5 w-3.5" aria-hidden="true" />}
                        </div>
                      )}
                    </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        <div className="die-progression__footer">
          <span>SEQUENCE FLOWS LEFT TO RIGHT · THEN TOP TO BOTTOM</span>
          <span>{onDiesChange ? 'Drag stations to change the sequence' : 'Each station shows its outgoing reduction'}</span>
        </div>
      </div>
    </motion.div>
  );
}
