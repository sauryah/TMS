# Wire Drawing Workbench Model Alignment Council

**Date:** 2026-11-14
**Scope:** Improve the workbench's calculation-to-render consistency, scientific labeling, process assumptions, and control density without changing its engineering equations.

## Problem Statement

The workbench labels an equation-based Rust/WASM nodal field as FEA, renders separate hand-shaped stress and temperature profiles, and computes some displayed values using fixed copper-like constants regardless of the selected material. The settings also compete with the canvas for space. The change must reuse existing calculations, preserve formulas and authorization, and avoid implying validated finite-element accuracy.

## Stage 1: Divergent Proposals

- **Proposal A — Minimal disclosure:** Rename FEA/thermal labels, disclose that the model is an estimate, and keep current render equations and sidebar values. This minimizes implementation risk but leaves visibly separate calculations and inconsistent material assumptions.
- **Proposal B — Shared model outputs:** Render stress and temperature from the existing generated nodal field, show WASM pass physics for telemetry, use the selected material/friction/speed inputs consistently, add process controls, and move secondary controls into a disclosure. Preserve current equations and clearly identify the result as an analytical estimate, not validated FEM.
- **Proposal C — Replace the model:** Introduce a calibrated numerical FEM implementation and redesign the 3D renderer around it. This could improve physical fidelity after validation but requires validated material/process data and a much larger domain review.

## Stage 2: Anonymized Peer Review

### Proposal A

- **Strength:** Small, reversible UI change with low performance risk.
- **Failure mode:** The rendered map and telemetry would continue to disagree; material selection would still change appearance without changing some displayed calculations.
- **Ranking:** Architect 2; Safety 2; Domain/Performance 2.

### Proposal B

- **Strength:** Aligns the rendered scalar field and displayed pass telemetry with the existing engine and selected assumptions. The UI can state exactly what the model represents.
- **Failure mode:** The engine returns a zero-copy view backed by shared WASM memory; consumers must not retain it across subsequent mesh computations. The sample dimensions must be explicit, stale async results must not overwrite newer inputs, and no labels should imply calibrated or validated accuracy.
- **Mitigations:** Copy the mesh result for React state or consume it before the next mesh call; include mesh dimensions; test deterministic field sampling; gate the view on valid/current results; do not alter equations or claim FEM validation.
- **Ranking:** Architect 1; Safety 1; Domain/Performance 1.

### Proposal C

- **Strength:** Could address model fidelity if supported by validated constitutive laws, boundary conditions, and test data.
- **Failure mode:** Replacing equations without those inputs risks adding a more sophisticated but still unvalidated model, expanding scope and changing deterministic engineering behavior.
- **Ranking:** Architect 3; Safety 3; Domain/Performance 3.

### Consensus and Aggregate Ranking

All perspectives ranked B first, A second, and C third. Using 3/2/1 points for first/second/third place:

1. **Proposal B — 9 points**
2. **Proposal A — 6 points**
3. **Proposal C — 3 points**

Consensus: improve provenance and consistency using the current equations; do not represent the output as validated FEM or introduce new physics without calibration evidence.

## Stage 3: Chairman Verdict

Proceed with Proposal B, with the shared-memory and stale-result safeguards listed above. Preserve the existing physics formulas. Render generated node stress/temperature values in the single-die visualization, source telemetry from the same engine/configuration, expose friction and line speed as shared assumptions, and put secondary controls behind an accessible disclosure. Use factual labels such as “Stress estimate” and “Analytical estimate · not validated FEM.”

## Actionable Steps

1. Add mesh dimensions and safe sampling/copy behavior to the WASM bridge, with unit coverage.
2. Wire the existing WASM field and pass results into the renderer, hover values, and sidebar; keep selected material, friction, and speed synchronized.
3. Simplify visible controls, remove unsupported performance/model claims, update architecture/module documentation, record progress, and run frontend checks.
