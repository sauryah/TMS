# React Frontend SPA (frontend.md)

## Purpose
High-density manufacturing telemetry dashboard, CAD vector blueprint renderer, analytical stress and temperature field viewer, Sachs' slab theory deformation simulator, Rust/Wasm wire-drawing model, process-estimate PDF reporting, shopfloor machine allocation views, Wire Drawing Elongation Calculator, die series generator, and spreadsheet import interfaces.

---

## Design System & Triple-Theme Architecture

### 1. Supported Themes
The application supports three global visual modes managed via `ThemeContext.tsx` and CSS root tokens:
- **Terminal / Graphite Operations** (`data-theme="terminal"`, default):
  - **Canvas & Surfaces**: `#111719` canvas, `#182124` panels, `#202B2F` raised surfaces.
  - **Borders & Dividers**: `#29363A` subtle / `#3A4A4E` visible.
  - **Accent**: Copper `#FF946B` for primary actions and keyboard focus.
- **Classic / Deep Slate Operations** (`data-theme="classic"`):
  - **Canvas & Surfaces**: `#121D22` canvas, `#1A282D` panels, `#233339` raised surfaces.
  - **Borders & Dividers**: `#2E3D42` subtle / `#44565C` visible.
  - **Accent**: Warm copper `#FF9B70` with semantic status colors.
- **Light / Paper Operations** (`data-theme="light"`):
  - **Canvas & Surfaces**: `#F2F4F1` canvas, `#FFFFFF` panels, `#F7F8F5` raised surfaces.
  - **Borders & Dividers**: `#D9E0DC` subtle / `#B8C5BE` visible.
  - **Accent**: Deep copper `#A94324` for readable primary actions and focus.
- **Typography**: Self-hosted `Inter` and `Plus Jakarta Sans` WOFF2 for interface text and headings; reserve the system monospace stack for identifiers, measurements, and audit data. Status colors remain semantic and use text labels.
- **Compatibility**: `index.css` maps legacy fixed-palette utilities to each theme so existing screens receive the refreshed colors without rewriting their workflows. Print rules remain separate.

### 2. Access Control Rule: ROOT-Only Theme Switching
- **Security Constraint**: Only authenticated users with `role === 'ROOT'` have permission to alter the system-wide visual theme.
- **Enforcement**:
  - `ThemeContext.tsx` checks `role === 'ROOT'`.
  - Non-root users (`ADMIN`, `OPERATOR`, `REGULAR`) have theme toggles hidden in the Navbar and receive a disabled read-only lock in `SettingsPage.tsx`.
  - The active theme is synchronized across browser tabs using `localStorage.getItem('tms_app_theme')`.

---

## Key Components & Architecture
- **Theme Management**: `ThemeContext.tsx` (`useTheme()`) providing `theme`, `setTheme`, `toggleTheme`, and `canChangeTheme`.
- **State Management**: `useInventoryState.ts` for inventory selection, tree navigation, search filters; `@tanstack/react-query` for API query caching.
- **Resilience**: `lazyWithRetry.ts` for dynamic chunk recovery on new deployments; `ErrorBoundary.tsx` update fallback.
- **3D Workbench**: `StressHeatmap3D.tsx` (Canvas 2D die and train view, generated nodal stress/temperature field, cutaway view, and equation-based pass telemetry). Stress and temperature fields are analytical estimates, not validated FEM results. `StressHeatmap3D.css` applies the workbench's blueprint palette, teal/copper accents, and drafting-style focus treatment; the renderer uses a finer major/minor grid and responsive viewport/sidebar proportions.
- **Interactive Die Progression**: `DieProgression.tsx` and `DieProgression.css` render the editable pass sequence as a compact, theme-aware card grid with gauge stations, tapered wire connectors, and area-reduction/elongation metrics. The full sequence stays visible without horizontal scrolling; sort, drag, insert, and remove actions remain in the React component.
- **CAD Visualizer**: `CadRenderer.tsx` and `CadRenderer.css` render the round/flat die drawing and pass metrics with Terminal, Classic, and Light palettes. Theme tokens reach the SVG grid, geometry, dimension labels, controls, and tooltips; Light mode also maps low-contrast neutral legacy text utilities to readable theme text colors.
- **Rust/WebAssembly Drawing Model**: `wasm_drawing_engine` compiled with `wasm-pack` and bridged via `useWasmFeaSolver.ts` / `WasmBridge.ts` for client-side pass mechanics and a simplified axisymmetric analytical field. The bridge returns mesh dimensions and a stable copy for sampling/rendering.
- **TDS Vector Print Engine**: `WireDrawingPrintReport.tsx`, `PrintSchematicPipeline.tsx`, `PrintPassChart.tsx`, and `PrintPreviewModal.tsx` providing ISO/DIN-compliant vector printouts with drafting pipelines and elongation/area-reduction pass curves.
- **Inventory Set Series Auto-Sorting**: Set detail views automatically order assigned dies in descending sequence (big to small) via `compareDiesBySize` and `getDieSize` in `dieHelpers.ts`.
- **Theory Workbench**: `TheoryPanel.tsx` (CAD die inspector SVG, math deformation simulator force equations).
- **Permissions**: `UserManager.tsx` (indented sub-feature permissions tree) & `AuthContext.tsx` (live background permission auto-sync).
- **MFA Recovery**: `BackupCodesModal.tsx` allowing users to view, generate, and copy hashed single-use recovery codes.
- **Rollup Code-Splitting**: Manual vendor chunk isolation in `vite.config.ts` (`vendor-core`, `vendor-ui`, `vendor-charts`, `vendor-three`, `vendor-icons`).

---

## Important Files
- [App.tsx](file:///frontend/src/App.tsx): Application router and shell layout with provider hierarchy (`AuthProvider` ➔ `ThemeProvider` ➔ `ToastProvider` ➔ `NotificationProvider` ➔ `AnnouncementProvider`).
- [SessionTimeoutManager.tsx](file:///frontend/src/components/SessionTimeoutManager.tsx): Session lifecycle manager enforcing idle timeouts, server-backed session lock (`/api/v1/auth/lock/`), multi-tab broadcast sync, and in-place re-authentication.
- [ThemeContext.tsx](file:///frontend/src/contexts/ThemeContext.tsx): Triple-theme state (`terminal`, `classic`, `light`), persistence, and ROOT access control.
- [index.css](file:///frontend/src/index.css): Theme design tokens, CSS variables, CAD blueprint filters, `@font-face` definitions, and print rules.
- [WireDrawingPrintReport.tsx](file:///frontend/src/features/wire-drawing-calculator/components/WireDrawingPrintReport.tsx): Technical Data Sheet engineering report template for drafting pipeline and charts.
- [useWasmFeaSolver.ts](file:///frontend/src/features/wire-drawing-calculator/hooks/useWasmFeaSolver.ts): Hook interfacing React with the WebAssembly drawing solver.
- [dieHelpers.ts](file:///frontend/src/utils/dieHelpers.ts): Die sizing normalization and big-to-small descending series comparison logic.
- [Navbar.tsx](file:///frontend/src/components/Navbar.tsx): Top header with ROOT quick-toggle theme switcher.
- [SettingsPage.tsx](file:///frontend/src/pages/SettingsPage.tsx): System Appearance settings tab with live preview cards.
- [CommandPalette.tsx](file:///frontend/src/components/CommandPalette.tsx): Global `Ctrl+K` command palette with ROOT theme actions.
- [useInventoryState.ts](file:///frontend/src/features/inventory/hooks/useInventoryState.ts): Central inventory state management hook.
- [lazyWithRetry.ts](file:///frontend/src/utils/lazyWithRetry.ts): Dynamic import chunk recovery utility.
