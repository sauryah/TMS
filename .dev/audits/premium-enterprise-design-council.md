# Premium Enterprise Design Refresh — Council Record

Date: 2026-11-14  
Scope: Frontend visual redesign inspired by the Equipment Ops reference. Existing application behavior, APIs, schemas, authentication, authorization, and routes remain protected.

## Design thesis

TMS should feel like a precise tooling control room: readable at a glance, calm under dense operational data, and clear about status. Use a restrained graphite or warm paper foundation, a copper signal accent, sans-serif interface text, and reserve monospace for serials, measurements, and audit details. Keep the current three themes and the established workflow structure.

## Proposals reviewed

1. **Token refresh only.** Lowest implementation risk, but it would retain the tiny all-monospace hierarchy and leave shared navigation and login presentation behind.
2. **Full shell and page rebuild.** Offers the largest visual departure, but replacing navigation and rebuilding specialized screens creates unnecessary regression risk for established workflows.
3. **Staged hybrid refresh (selected).** Refresh the palette and shared primitives, make app-level typography and navigation more legible, update login and high-use operational page framing, and let specialized tools inherit the refreshed system without rewriting their calculations or print output.

## Peer review summary

- **Architecture perspective:** Keep the current router, page composition, and theme context. Build on shared CSS tokens and UI components; avoid introducing a new framework or changing route ownership.
- **Security perspective:** Treat login styling as presentation only. Preserve request headers, MFA flow, storage handling, role checks, session behavior, and all protected route rules.
- **Performance perspective:** Reuse existing CSS, fonts, and icon package. Avoid new dependencies, heavy effects, or large new runtime components.
- **Ranking:** Proposal 3 first, Proposal 1 second, Proposal 2 third. The staged approach gives the most visible improvement while keeping the change reviewable and reversible.

## Implementation and review gates

- Retain the three existing theme choices and permission to change themes.
- Preserve existing endpoints, data queries, forms, validation, workflows, and business logic.
- Use semantic status text and color; maintain clear contrast, visible keyboard focus, and reduced-motion behavior.
- Do not modify database schema or authentication/authorization behavior.
- Review the app visually at desktop and compact widths, then run frontend lint, type/build checks, and available frontend tests.
