# CAD Visualizer and Light Theme Contrast Review

**Date:** 2026-11-14  
**Scope:** Reversible frontend presentation changes; no API, data, permission, or drawing-calculation changes.

## Problem Statement

The CAD Visualizer uses fixed dark canvas, SVG grid, dimension label, and control colors. Its surrounding panel adapts to the selected theme, leaving Light mode with mismatched drawing colors. Other legacy gray text utilities can also render too faintly on light surfaces. The redesign should use less vertical space and retain the existing dimension interaction, zoom/pan behavior, and ROOT-only view controls.

## Stage 1 Proposals

- **Proposal A — Renderer-only theme tokens (presentation perspective):** Scope theme variables and refreshed layout to `CadRenderer.tsx` and a component stylesheet. This directly fixes the named visualizer and keeps blast radius low. It does not address low-contrast legacy utility text elsewhere in Light mode.
- **Proposal B — Broad light palette normalization (consistency perspective):** Override all light-mode text utilities to the main text token. This could improve contrast quickly, but risks flattening semantic status colors and creating unintended changes throughout the app; the hard-coded SVG colors would still need separate changes.
- **Proposal C — Scoped CAD redesign plus restrained neutral-text mapping (balanced perspective):** Add a compact, theme-aware blueprint surface using CSS custom properties, then adjust only neutral legacy text utilities in Light mode. Keep semantic colors and interactions intact; avoid global font/element resets.

## Stage 2 Anonymized Peer Review

- **Reviewer 1:** A cleanly contains risk but leaves the general Light-mode text concern unresolved. B has the widest blast radius and could erase status meaning. C solves both symptoms while limiting overrides to neutral classes. **FINAL RANKING: 1. Proposal C, 2. Proposal A, 3. Proposal B.**
- **Reviewer 2:** A appropriately retains feature controls but should not rely on global legacy mappings. B can produce unreadable white-on-light controls and inconsistent semantic states. C should preserve contrast for action buttons and colored statuses explicitly. **FINAL RANKING: 1. Proposal C, 2. Proposal A, 3. Proposal B.**
- **Reviewer 3:** A is low-cost but incomplete. B risks style regressions and requires a broad visual audit. C keeps SVG rendering efficient and theme-bound, and can reduce the oversized visualizer wrapper without changing drawing geometry. **FINAL RANKING: 1. Proposal C, 2. Proposal A, 3. Proposal B.**

## Stage 3 Chairman Synthesis

- **Consensus:** Use theme tokens for the CAD canvas and labels; keep changes to static presentation; retain keyboard and pointer interactions; protect semantic colors from blanket neutral overrides.
- **Aggregate rankings (3 points for first, 2 for second, 1 for third):** Proposal C — 9; Proposal A — 6; Proposal B — 3.
- **Verdict:** Implement Proposal C. The CAD visualizer gets a compact drafting-style frame and explicit Terminal, Classic, and Light drawing palettes. Light mode receives targeted contrast mappings only for neutral gray/slate/zinc text classes and legacy gray hex utilities. Colored status and action text remain semantically styled.

## Actionable Implementation Steps

1. Replace hard-coded drawing colors with scoped CSS custom properties for both round and flat SVG views.
2. Redesign the visualizer header, compact view controls, responsive viewport, and metadata footer while preserving ROOT-only zoom/pan and dimension tooltip behavior.
3. Tighten the calculator card around the drawing and display pass metrics as compact labels.
4. Add restrained Light-theme mappings for low-contrast neutral text utilities, update frontend documentation and task tracking, then run the frontend checks.
