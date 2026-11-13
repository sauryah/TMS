# Schematic Pipeline Reorder Motion Review

**Date:** 2026-11-14  
**Scope:** Reversible frontend interaction fix; no data or calculation changes.

## Problem Statement

Dragging a die through the Schematic Drafting Pipeline can look like a flicker. Cards include their array index in their React key, so changing the order changes card identity and remounts them. In addition, `dragenter` bubbles from nested card content and can invoke the reorder handler repeatedly. The fix should preserve the existing array contract, drag behavior, add/remove/sort actions, theme styling, and reduced-motion support.

## Stage 1 Proposals

- **Proposal A — Stable card identity:** Key cards by gauge value and occurrence among equal gauges; animate only their positions with a short, explicit tween. This prevents remount flashes, but repeated nested `dragenter` events can still move cards more than once per pointer crossing.
- **Proposal B — Filter repeated drag-enter events:** Ignore `dragenter` when the previous target is already inside the card. This prevents child-to-child retriggers, but cards still remount after reorder because their keys change with their index.
- **Proposal C — Combine identity, event, and animation fixes:** Use a stable gauge/duplicate-occurrence key, ignore `dragenter` events whose related target is within the same card, remove CSS transform transitions from Framer Motion layout elements, and animate position with a restrained tween that respects the OS reduced-motion preference.

## Stage 2 Anonymized Peer Review

- **Reviewer 1:** A fixes the visible remount issue but leaves event bubbling. B fixes event noise but not unstable component identity. C closes both causes without altering the data model or pass calculations. **FINAL RANKING: 1. Proposal C, 2. Proposal A, 3. Proposal B.**
- **Reviewer 2:** A's occurrence-based key is appropriate for an array of numeric gauges; equal gauges are indistinguishable in the available data. B needs a related-target containment check, not a timing debounce. C also removes competition between CSS transform transitions and Framer Motion layout transforms. **FINAL RANKING: 1. Proposal C, 2. Proposal B, 3. Proposal A.**
- **Reviewer 3:** A improves motion continuity but could still stutter under nested drag targets. B removes those repeat events but visible cards may still flash on every committed reorder. C combines stable keys, event filtering, a finite tween, and reduced-motion behavior with no extra dependency. **FINAL RANKING: 1. Proposal C, 2. Proposal A, 3. Proposal B.**

## Stage 3 Chairman Synthesis

- **Consensus:** Preserve card identity when gauges move; prevent a drag event inside the same card from triggering a second move; let one animation system own positional transforms.
- **Aggregate rankings (3 points for first, 2 for second, 1 for third):** Proposal C — 9; Proposal A — 5; Proposal B — 4.
- **Verdict:** Implement Proposal C. Generate keys from gauge value plus duplicate occurrence, skip nested `dragenter` events using `relatedTarget` containment, use position-only layout animation, and disable layout tweening when reduced motion is requested. Remove the CSS transform transition from the same motion element.

## Actionable Implementation Steps

1. Make each rendered card's key independent of its current array index, including duplicate gauges.
2. Filter nested drag-enter events before applying the existing reorder operation.
3. Use an explicit position-only tween and keep drag feedback from setting CSS transforms on the animated card.
4. Update frontend documentation and task tracking, then run the permitted frontend checks.
