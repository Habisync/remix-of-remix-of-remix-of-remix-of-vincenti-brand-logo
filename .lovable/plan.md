## Goal

Make the public site render from block arrays saved by the admin canvas, so every page (Home, Owners, Properties, Property Detail, Contact, etc.) is fully editable from `/admin` — drag, drop, reorder, inline-edit — and changes appear immediately on the live site.

## Current state (audit findings)

- `src/components/admin/LiveBlocks.jsx` already exports 40+ block renderers (`LIVE_BLOCKS`), categories, and per-page templates (`LIVE_PAGE_TEMPLATES`).
- The admin canvas (`AdminPage.jsx`) currently previews via an iframe pointing at `localhost:3000` and edits inline through `EditModeBridge`, but **does not persist a block array per page** — there is no `page:home` row in `cms_content`.
- Public pages (`LandingPage`, `PropertyOwnersPage`, `PropertiesPage`, …) are hand-coded JSX, not block-driven.
- Stale CRA env vars (`process.env.REACT_APP_BACKEND_URL`) are sprinkled across ~15 files; the iframe URL is hardcoded to `localhost:3000`.

## Plan (3 phases — ship phase 1 first, confirm, then continue)

### Phase 1 — Block runtime + Home & Owners pages
1. Add `src/lib/cmsPages.js` with `loadPageBlocks(slug)` / `savePageBlocks(slug, blocks)` reading `cms_content` rows keyed `page:<slug>`, seeded from `LIVE_PAGE_TEMPLATES`.
2. Add `src/components/PageRenderer.jsx` — public renderer that fetches blocks for a slug and maps each `{type,data}` through `LIVE_BLOCKS` (read-only, no `onEdit`). Wrap each in `BlockErrorBoundary`.
3. Rewrite `src/pages/LandingPage.jsx` and `src/pages/PropertyOwnersPage.jsx` as `<PageRenderer slug="home"/>` / `slug="owners"`.
4. Replace stale `process.env.REACT_APP_BACKEND_URL` with the existing api-adapter convention (relative `/api/...`) in all touched files.
5. Fix admin iframe URL to use `window.location.origin` instead of `localhost:3000`.

### Phase 2 — Admin canvas → real block editor
1. Replace the iframe-only canvas in `AdminPage.jsx` with a true block list per page: add/remove/reorder, inline-edit via existing `InlineText`, save to `cms_content` via `savePageBlocks`.
2. Keep iframe as a secondary "preview" tab.
3. Wire `BlockLibrary` + `BLOCK_CATEGORIES` add-panel to the new canvas.

### Phase 3 — Remaining pages + polish
1. Convert `PropertiesPage`, `PropertyDetailPage`, `ConfirmationPage`, `MapPage`, `CheckoutPage` to block-driven where it makes sense (Checkout/Detail keep their dynamic logic blocks but wrap them in editable surrounding blocks).
2. Add new block types as needed (PropertyDetailHero, CheckoutSummary, ConfirmationHero).
3. Final pass: a11y, SEO metadata per page (stored under `page:<slug>.seo`), and remove dead CRA shim code.

## Technical notes

- Data model: one row per page in `cms_content`, `section_key = "page:home"`, `content = { blocks: [{type, data}, ...], seo: {...} }`.
- Re-uses `LIVE_BLOCKS` registry as the single source of truth — no duplicated renderers between admin and public.
- `BlockErrorBoundary` guarantees one broken block never takes down a page.
- No schema migration needed (cms_content already supports arbitrary `jsonb` content and existing RLS allows public read + admin/editor write).

## Out of scope for this plan

- Guesty token / OAuth work (already handled in previous turn).
- Visual redesign — keeping current `LiveBlocks` aesthetics.
- Multi-language routing (`/en/...` keeps working through the same renderer).

Reply **"go phase 1"** and I'll implement steps 1–5 above in one pass.