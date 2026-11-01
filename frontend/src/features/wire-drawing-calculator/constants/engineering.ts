/**
 * Industrial Wire Drawing Engineering Constants & Quality Thresholds
 * Standard reference parameters aligned with ASTM, DIN, and ISO 9001 drafting specifications.
 */

export const ENGINEERING_CONSTANTS = {
  // Elongation Percentage Limits (%)
  ELONGATION: {
    MIN_CRITICAL: 12.0,
    OPTIMAL_MIN: 20.0,
    OPTIMAL_MAX: 24.0,
    ACCEPTABLE_MAX: 28.0,
    MAX_CRITICAL: 32.0,
    DEFAULT_TARGET: 25.0,
    DEFAULT_TOLERANCE: 3.0,
  },

  // Area Reduction Percentage Limits (%)
  AREA_REDUCTION: {
    MIN_CRITICAL: 10.0,
    OPTIMAL_MIN: 12.0,
    OPTIMAL_MAX: 20.0,
    ACCEPTABLE_MAX: 25.0,
    MAX_CRITICAL: 30.0,
  },

  // Maximum recommended pass elongation variation deviation (%)
  CONSISTENCY_DEVIATION: {
    EXCELLENT: 1.0,
    VERY_GOOD: 2.0,
    GOOD: 3.0,
    FAIR: 5.0,
  },

  // Default Equipment and Operational Metadata
  DEFAULTS: {
    WORK_ORDER: 'WDC-JOB-2026-001',
    MACHINE_NAME: 'Multi-Wire Drawing Line 01',
    MATERIAL_PROFILE: 'Standard High-Tensile Carbon Steel / ETP Copper',
    OPERATOR_FALLBACK: 'OPERATOR',
    DOC_PREFIX: 'TDS',
    DOC_TYPE: 'WIRE_DRAWING_TDS',
    STANDARD_NOTES:
      'Production drafting schedule verified within standard elongation tolerances. No central burst defect risk detected.',
  },

  // Supported Material Alloys
  MATERIAL_PROFILES: [
    { id: 'cs-high', name: 'High Carbon Steel (C > 0.60%)', defaultElongation: 22.0 },
    { id: 'cs-low', name: 'Low / Mild Carbon Steel', defaultElongation: 25.0 },
    { id: 'ss-304', name: 'Stainless Steel AISI 304 / 316', defaultElongation: 20.0 },
    { id: 'cu-etp', name: 'Electrolytic Tough Pitch Copper (ETP)', defaultElongation: 26.0 },
    { id: 'cu-ofhc', name: 'Oxygen-Free High Conductivity Copper (OFHC)', defaultElongation: 25.5 },
    { id: 'al-ec', name: 'EC Grade Aluminum (1xxx / 6xxx)', defaultElongation: 28.0 },
    { id: 'brass-7030', name: 'Cartridge Brass (70/30 Cu-Zn)', defaultElongation: 24.0 },
  ],
} as const;

/**
 * Returns Tailwind CSS badge classes for Elongation metrics
 */
export function getElongationBadgeClass(val: number): string {
  const { OPTIMAL_MIN, OPTIMAL_MAX, ACCEPTABLE_MAX } = ENGINEERING_CONSTANTS.ELONGATION;
  if (val < OPTIMAL_MIN) {
    return 'bg-blue-500/15 text-blue-400 border-blue-500/20';
  }
  if (val <= OPTIMAL_MAX) {
    return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20';
  }
  if (val <= ACCEPTABLE_MAX) {
    return 'bg-amber-500/15 text-amber-400 border-amber-500/20';
  }
  return 'bg-red-500/15 text-red-400 border-red-500/20';
}

/**
 * Returns Tailwind CSS badge classes for Area Reduction metrics
 */
export function getReductionBadgeClass(val: number): string {
  const { OPTIMAL_MIN, OPTIMAL_MAX, ACCEPTABLE_MAX } = ENGINEERING_CONSTANTS.AREA_REDUCTION;
  if (val < OPTIMAL_MIN) {
    return 'bg-blue-500/15 text-blue-400 border-blue-500/20';
  }
  if (val <= OPTIMAL_MAX) {
    return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20';
  }
  if (val <= ACCEPTABLE_MAX) {
    return 'bg-amber-500/15 text-amber-400 border-amber-500/20';
  }
  return 'bg-red-500/15 text-red-400 border-red-500/20';
}
