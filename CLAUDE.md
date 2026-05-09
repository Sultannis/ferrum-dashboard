# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Vite dev server (port 5173)
npm run build        # Type-check + build for production
npm run build-only   # Build without type-checking
npm run preview      # Preview production build
npm run type-check   # Vue TSC incremental type checking
npm run lint         # Run oxlint + eslint with --fix
npm run format       # Prettier formatting for src/
```

No test runner is configured.

## Architecture

**Ferrum Dashboard** is a Vue 3 SPA for managing video processing jobs and YouTube channels. It calls a REST backend expected at `http://localhost:3000` (configured via `VITE_BASE_API_URL` in `.env`; proxied from `/api` in Vite dev).

### Data flow

```
src/api.ts (Axios instance)
    ↓
Views (fetch on mount, hold state in local refs)
    ↓
Child components (receive data via props, emit events to trigger API calls)
```

State is mostly **local component `ref`s** — Pinia is present (`src/stores/counter.ts`) but not used for domain data.

### Routes (`src/router/index.ts`)

| Path | View | Purpose |
|------|------|---------|
| `/` | → `/channels` | Redirect |
| `/channels` | `ChannelsView.vue` | Channel CRUD + content generation |
| `/jobs` | `JobsView.vue` | Job list + creation modal |
| `/jobs/:id` | `JobDetailView.vue` | Multi-panel job editor |

### Key views & components

- **`ChannelsView.vue`** — create/edit channels, trigger generation of descriptions, keywords, profile images, banners, outros.
- **`JobsView.vue`** — list jobs (response shape `{ data: Job[] }`), open creation dialog.
- **`JobDetailView.vue`** — tabbed detail page; renders panel components for each pipeline stage.
- **`PipelinePanel.vue`** — step-by-step job processing UI; each step has a status and action button, steps depend on prior completion.
- Other panels (`AudioPanel`, `YoutubePanel`, `ThumbnailPanel`, `TranscriptEditor`, `ChunksPanel`, `JobDetailsEditor`) receive job data via props and emit updates.

### UI framework

PrimeVue 4 with the Aura dark preset. Components used heavily: `DataTable`, `Dialog`, `Button`, `InputText`, `Select`, `Tag`, `Toast`. Cache-bust media URLs with `?t=${Date.now()}` when refreshing generated assets.

### Error handling convention

All API calls use try/catch and extract the message from `error.response?.data?.message`. Feedback is shown via PrimeVue `useToast()`.

### Path alias

`@/` resolves to `src/` (configured in both `vite.config.ts` and `tsconfig.app.json`).
