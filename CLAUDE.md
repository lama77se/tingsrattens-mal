# Tingsrättens Mål - Project Guide

## What This Is
Swedish Court Hearings Aggregator — fetches PDF schedules from domstol.se, extracts hearing data, and presents them in a searchable/filterable UI. Built with Lovable, also developed locally with Claude Code.

## Tech Stack
- **Frontend**: React 18 + TypeScript + Vite (port 5174)
- **Styling**: Tailwind CSS + shadcn-ui (Radix primitives)
- **State/Data**: TanStack React Query, React Hook Form + Zod
- **Backend**: Supabase (edge functions, auth) — project ID: `adjhjnlxcfkqbmlzgslj`
- **PDF Parsing**: Deno edge function using pdf-parse
- **Routing**: React Router v6 (single page with tabs)

## Commands
- `npm run dev` — Dev server on http://localhost:5174
- `npm run build` — Production build
- `npm run lint` — ESLint
- `npm test` — Vitest

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
    api/courtPdf.ts        — Supabase edge function caller
  integrations/supabase/   — Client + auto-generated types
supabase/functions/
  fetch-court-pdf/index.ts — Deno edge function: fetch + parse PDFs
```

## PDF Troubleshooting Tool
```
node debug-pdf.cjs <pdf-url-or-file>              # download, parse, show results
node debug-pdf.cjs <pdf-url-or-file> --raw         # output raw extracted text
node debug-pdf.cjs <pdf-url-or-file> --lines       # numbered lines of extracted text
node debug-pdf.cjs <pdf-url-or-file> --court solna  # override auto-detected court
node debug-pdf.cjs <url> --edge                    # use production edge function for text extraction
node debug-pdf.cjs <url> --edge --raw              # see exact text the production pipeline produces
```

When the user provides a PDF URL that fails parsing:
1. Run `node debug-pdf.cjs <url> --edge` to test with the **production text extraction** (pdfjs-serverless)
2. Compare with `node debug-pdf.cjs <url>` (local pdf-parse) to spot text extraction differences
3. Run with `--raw` or `--lines` to inspect raw text structure
4. Fix the parser in `src/lib/parsers/` for the court's `formatFamily`, re-run to verify

**Important:** Local pdf-parse and the production edge function (pdfjs-serverless) extract text differently. Always verify fixes with `--edge` to test the real pipeline.

The tool auto-detects the court from the URL/filename and uses proxy fallback for domstol.se downloads. Court→format mapping is duplicated in the script — keep it in sync with `courtConfig.ts`.

## Key Patterns
- Courts defined in `courtConfig.ts` — each has unique PDF URL pattern
- PDF parsing is regex-heavy with Swedish character normalization (ä→a, ö→o, å→a)
- DataLoadingTab uses ref-based state accumulation across multiple fetches
- 4 courts: Alingsås, Attunda, Blekinge, Solna tingsrätter
- Case types: B=Brottmål, T=Tvistemål, FT=Förenklat tvistemål, etc.

## Port Allocation (c:\dev projects)
- 5173 — sverige-handelser
- 5174 — tingsrattens-mal (this project)
- 8080 — sweden-transit-wonderland-mapper

## Working with Lovable
This project is also edited in Lovable. Always pull before starting work to get latest changes. Don't restructure the project layout or rename files that Lovable manages without good reason.
