# Tingsrättens Mål

Swedish Court Hearings Aggregator — fetches PDF schedules from domstol.se, extracts hearing data, and presents them in a searchable/filterable UI.

**Live:** https://rattegang.app

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn-ui
- **Backend**: Vercel serverless function (PDF fetch + text extraction)
- **Hosting**: Vercel

## Getting Started

```sh
npm install
npm run dev
```

Dev server runs on http://localhost:5174

## Commands

- `npm run dev` — Development server
- `npm run build` — Production build
- `npm run lint` — ESLint
- `npm test` — Vitest
