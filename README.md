# Tingsrättens Mål

[![CI](https://github.com/lama77se/tingsrattens-mal/actions/workflows/ci.yml/badge.svg)](https://github.com/lama77se/tingsrattens-mal/actions/workflows/ci.yml)

Swedish Court Hearings Aggregator — fetches PDF schedules from domstol.se, extracts hearing data, and presents them in a searchable/filterable UI. Useful if you want to see what's being heard at any Swedish tingsrätt this week without clicking through 40+ separate PDFs.

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

Dev server runs on http://localhost:5174. The `/api/*` routes are proxied to the live production handler at `tingsrattens-mal.vercel.app` so you don't need to run the serverless function locally for normal frontend work.

## Commands

- `npm run dev` — Development server
- `npm run build` — Production build
- `npm run lint` — ESLint
- `npm test` — Vitest

## Contributing

Contributions are welcome. The repo is solo-maintained, so response time may vary — please be patient.

To submit a change:

1. **Fork** the repo on GitHub.
2. **Branch** on your fork: `git checkout -b fix/short-description` (or `feat/...`, `chore/...`).
3. **Code.** Keep commits focused and descriptive.
4. **Verify locally** before opening a PR:
   ```sh
   npm test -- --run
   npx tsc --noEmit
   npm run lint
   npm run build
   ```
5. **Open a pull request** against `main`. CI runs all of the above automatically on every PR.
6. Wait for review. `main` is branch-protected — nothing lands without a PR and CI passing.

A few project-specific notes that may help if you're touching the parsers:

- Court definitions live in `src/lib/courtConfig.ts`. Each court has a `formatFamily` (`standard` / `tabular` / `gavle` / `schema` / `positional`) that picks the parser strategy in `src/lib/parsers/`.
- `node debug-pdf.cjs <pdf-url>` parses a court PDF locally and shows results. `--lines` dumps numbered raw text, `--positional` uses the Y-coordinate row grouping (used by Halmstad / Mora / Södertälje), `--edge` runs the production text-extraction pipeline for comparison.
- Lagrum (legal statute) overrides go in `src/lib/lagrumOverrides.ts`. Always grep for the key before adding to avoid duplicates.

For bug reports and feature ideas, open a [GitHub Issue](https://github.com/lama77se/tingsrattens-mal/issues).

## Security

For vulnerability reports, see [SECURITY.md](SECURITY.md). Please don't open a public issue for security problems.

## License

[MIT](LICENSE).
