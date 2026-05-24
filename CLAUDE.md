# Tingsrättens Mål - Project Guide

## What This Is
Swedish Court Hearings Aggregator — fetches PDF schedules from domstol.se, extracts hearing data, and presents them in a searchable/filterable UI. Public repo, live at https://rattegang.app (Vercel auto-deploys from `main`; the auto-URL https://tingsrattens-mal.vercel.app also serves the same deployment).

## Repo Workflow
- `main` is branch-protected: changes go through a PR, CI must pass, no direct pushes.
- Standard flow: create a feature branch (`feat/...`, `fix/...`, `chore/...`), commit, push, `gh pr create`, then `gh pr merge <n> --merge --delete-branch` after CI is green. Pull main after.
- CI runs install + typecheck + lint + tests on every PR and on pushes to `main` (`.github/workflows/ci.yml`).
- External contributors fork the repo and PR from their fork — they can't push directly. See `README.md` for the contributor-facing version.

## Tech Stack
- **Frontend**: React 18 + TypeScript + Vite (port 5174)
- **Styling**: Tailwind CSS + shadcn-ui (Radix primitives)
- **State/Data**: TanStack React Query, React Hook Form + Zod
- **Backend**: Vercel serverless function (PDF fetch + text extraction via pdf-parse)
- **Hosting**: Vercel
- **Routing**: React Router v6 (single page with tabs)

## Commands
- `npm run dev` — Dev server on http://localhost:5174
- `npm run build` — Production build
- `npm run lint` — ESLint
- `npm test` — Vitest
- `node scripts/generate-lagrum.cjs [pdf-url-or-file]` — Regenerate lagrumMappings.ts from Brå PDF

## Project Structure
```
src/
  pages/Index.tsx          — Main page (tabbed: hearings + data loading)
  components/
    DataLoadingTab.tsx     — Multi-court PDF fetch UI with progress
    HearingsTab.tsx        — Filterable hearings table (10 columns)
    ui/                    — shadcn-ui components (don't edit manually)
  lib/
    courtConfig.ts         — Court definitions + PDF URL builders
    parseCourtPdf.ts       — Core PDF→hearing parser (~300 lines, regex-based)
    lagrumMappings.ts      — Legal statute → subject area mappings
    maltypMappings.ts      — Case number prefix → case type
    weekUtils.ts           — ISO week calculations
    api/courtPdf.ts        — Vercel API caller
api/
  fetch-court-pdf.ts       — Vercel serverless function: fetch + parse PDFs
```

## PDF Troubleshooting Tool
```
node debug-pdf.cjs <pdf-url-or-file>              # download, parse, show results
node debug-pdf.cjs <pdf-url-or-file> --raw         # output raw extracted text
node debug-pdf.cjs <pdf-url-or-file> --lines       # numbered lines of extracted text
node debug-pdf.cjs <pdf-url-or-file> --court solna  # override auto-detected court
node debug-pdf.cjs <url> --edge                    # use production Vercel function for text extraction
node debug-pdf.cjs <url> --edge --raw              # see exact text the production pipeline produces
```

When the user provides a PDF URL that fails parsing:
1. Run `node debug-pdf.cjs <url>` to parse locally
2. Run with `--raw` or `--lines` to inspect raw text structure
3. Fix the parser in `src/lib/parsers/` for the court's `formatFamily`, re-run to verify
4. Optionally run with `--edge` to verify the deployed Vercel function produces the same result

Local and production both use pdf-parse, so text extraction is identical.

The tool auto-detects the court from the URL/filename and uses proxy fallback for domstol.se downloads. Court→format mapping is duplicated in the script — keep it in sync with `courtConfig.ts`.

## Key Patterns
- Courts defined in `courtConfig.ts` — each has unique PDF URL pattern
- PDF parsing is regex-heavy with Swedish character normalization (ä→a, ö→o, å→a)
- DataLoadingTab uses ref-based state accumulation across multiple fetches
- 30+ courts configured (some disabled — no online schedules)
- Case types: B=Brottmål, T=Tvistemål, FT=Förenklat tvistemål, etc.

## Port Allocation (c:\dev projects)
- 5173 — sverige-handelser
- 5174 — tingsrattens-mal (this project)
- 8080 — sweden-transit-wonderland-mapper

