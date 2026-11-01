# Changelog

All notable changes to the Tool Management System (TMS) project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-11-01

### Added

#### Core Architecture & Infrastructure
- **Dual-Engine Architecture**: Write-path transactional management powered by Django 4.2 REST Framework and sub-millisecond read queries and real-time Server-Sent Events (SSE) broadcast powered by Go 1.22.
- **Relational & Search Storage**: PostgreSQL 18 transactional database with full schema hierarchy, Redis 7 caching and Pub/Sub messaging, and Meilisearch v1.7 fuzzy-search engine with transactional outbox synchronization.
- **Reverse Proxy & LAN HTTPS**: Traefik v3 reverse proxy with automated multi-SAN TLS certificate generation (`mkcert`) supporting LAN IP, hostname, and mDNS domain resolution.
- **Containerization & Security Hardening**: Non-root container process isolation (`USER tmsuser`, UID 1001), automated database backups with MD5 verification, and hardened startup secret validation.

#### Die Inventory Management & Asset Tracking
- **Physical Grid & Location Tracking**: Physical rack, shelf, and shelf-slot assignment for drawing dies with real-time location conflict prevention.
- **Multi-Type Die Support**: Complete lifecycle tracking for both Round dies and Flat (shaped) dies with casing dimensions, punched sizes, current wear dimensions, and recut histories.
- **Machine & Set Allocation**: Machine inventory organization into categories, production machines, and quick-swap die sets with automated descending series sorting.
- **Stock & Recount Audits**: Physical recount verification, enamel stock tracking, and complete audit trail of every status and location modification.

#### Wire Drawing Workbench & Drafting Pipeline
- **ISO/DIN Vector Technical Data Sheet (TDS) Reporting Engine**:
  - Industrial print reporting engine supporting 3 distinct layout modes: `full-report` (2-page comprehensive engineering data sheet), `visual-pipeline` (1-page shopfloor traveler schematic), and `data-table` (1-page compact reduction schedule).
  - High-contrast pure SVG vector pass charts displaying Elongation per Pass (%) and Area Reduction per Pass (%) with isolated right-gutter average callout badges.
  - Systematic 4-pass-per-row drafting schematic pipeline with visual cross-sectional tapers, centerline guides, and inter-pass deformation metrics.
  - Formal shopfloor sign-off block with signature lines for *Prepared By*, *Checked By*, and *Approved By*, accompanied by official engineering disclaimers.
  - Database print record audit logging (`PrintRecord`) capturing document references (`TDS-YYYYMMDD-XXXX`), work orders, machine assignments, and operator attribution.
- **Interactive Drafting Calculations & In-Place Reverse Solvers**:
  - Instantaneous 0ms client-side calculation engine for area reduction, elongation percentage, drafting ratio, and true strain.
  - In-place interactive reverse solvers allowing engineers to edit any Elongation, Area Reduction, or Ratio cell to dynamically back-calculate upstream and downstream die diameters.
  - Inline die diameter editing, intermediate station insertion/deletion, cross-sectional area display toggle, and full undo/redo (`Ctrl+Z`, `Ctrl+Y`) history.
  - ASTM/ISO color-coded tolerance badges and process consistency indicators.
  - Export capabilities to Excel (XLSX), CSV, vector PDF, and clipboard.
- **3D CAD Bore Visualizer & FEA Stress Heatmap**:
  - Interactive 3D WebGL/Three.js bore geometry visualization showing entrance bell, reduction cone, bearing length, and back relief.
  - Client-side Rust/WebAssembly finite element analysis (FEA) solver calculating von Mises stress tensors, Ludwik-Hollomon flow stress, and adiabatic thermal rise.

#### Security, Authentication & Access Control
- **Role-Based Access Control (RBAC)**: Comprehensive permission tiers (`ROOT`, `ADMIN`, `OPERATOR`, `VIEWER`) with fine-grained per-user tool authorization.
- **Two-Factor Authentication & Single-Use Backup Codes**: SHA-256 hashed recovery backup codes (`UserBackupCode`) with CLI emergency reset capabilities.
- **Session Hardening & Eviction**: Server-side session management with automatic concurrent session eviction and Redis cache invalidation upon privilege modification.
- **Network Protection**: Strict RFC 1918 private subnet matching and reverse proxy client IP attribution (`NUM_PROXIES = 1`).

#### Design System & User Experience
- **Triple-Theme Industrial Design System**: High-contrast Dark Terminal theme, Classic Slate theme, and Precision Light theme optimized for factory shopfloor illumination.
- **Apple HIG-Compliant UI**: Accessible touch targets (≥44px / ≥32px), WCAG AA color contrast (≥7:1 body text), and eliminated visual anti-patterns.
- **Self-Hosted Typography**: 100% self-hosted WOFF2 fonts (Inter and Plus Jakarta Sans) with offline ServiceWorker caching and complete third-party tracker removal.
- **Keyboard-First Navigation**: Global Command Palette (`Ctrl+K`), quick search navigation, and accessible ARIA combobox selection.
