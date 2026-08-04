# Migrate PDF text extraction off `pdf-parse` → `unpdf`

> **For agentic workers:** implement task-by-task in order. **Task 0 is a premise spike — do it first and stop if it fails.** Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** Scoping / not yet started.
**Author:** scoped 2026-07-20, follow-up to PR #199.

## Goal

Replace `pdf-parse@1.1.1` (which bundles the abandoned **pdf.js v1.10.100**, from 2017) with a maintained PDF text-extraction stack (**`unpdf`**, which wraps a current serverless `pdfjs-dist` build), so PDF parsing keeps working as the Node runtime advances — without regressing any court parser.

## Why now

PR #199 was a **stopgap**: it pinned the Vercel runtime to `engines.node = "22.x"` because pdf.js v1.10.100 fails on **Node 24** (`FormatError: Unknown compression method in flate stream` → `Invalid PDF structure`, 500 on every court). See `memory: project-node24-breaks-pdfparse`.

That pin buys time but does not fix the root cause:
- Node 22 reaches end-of-life ~**April 2027**; Vercel will eventually drop it, and we'll be forced onto Node 24+ again.
- `pdf-parse@1.1.1` is unmaintained (last publish 2019) and pins a 2017 pdf.js. It will keep breaking on new runtimes.
- We're one Vercel default-bump away from another full outage.

This migration removes the pin's expiry date.

## Current architecture (what we're replacing)

`pdf-parse` is required in three places. Only the first is production:

| Consumer | Path | Uses |
|---|---|---|
| **Serverless fetch+parse** | `api/fetch-court-pdf.ts` | `pdfParse(buf)` (default) **and** `pdfParse(buf, { pagerender: renderPositional })` (positional) |
| Local debug tool | `debug-pdf.cjs` | same two modes, via `require(".../pdf-parse")` |
| Lagrum generator (one-off) | `scripts/generate-lagrum.cjs` | `pdfParse(buf)` default only, against a Brå PDF |

There are **two extraction modes**, and the migration risk is very different for each:

### 1. Default mode (used by ~19 courts)

Format families `standard`, `tabular`, `gavle`, `schema`, `formatD`, `formatE` all consume `pdf-parse`'s **default** `render_page`. That algorithm is tiny (`node_modules/pdf-parse/lib/pdf-parse.js`):

```js
for (let item of textContent.items) {
  if (lastY == item.transform[5] || !lastY) text += item.str;   // same visual line
  else text += '\n' + item.str;                                  // new line on Y change
  lastY = item.transform[5];
}
```

i.e. it walks pdf.js's text items **in iteration order**, concatenating `str`, and inserts `\n` whenever the Y coordinate (`transform[5]`) changes.

**This is the risk surface.** Modern `pdfjs-dist` produces the same *geometry* but differs in item *segmentation*, iteration order, whitespace items, and adds `hasEOL`/marked-content items. So a verbatim port of `render_page` will produce *similar but not byte-identical* text — and every `standard`/`tabular`/`gavle`/`schema`/`formatD`/`formatE` regex parser is tuned to the current exact output.

### 2. Positional mode (used by ~11 courts)

`formatFamily === "positional"` courts request `mode=positional` (`DataLoadingTab.tsx:264`, `api/fetch-court-pdf.ts:73`), which swaps in the custom `renderPositional` pagerender (`api/_lib/renderPositional.cjs`). That renderer only uses **stable geometry**: `item.transform[4]` (x), `item.transform[5]` (y), `item.width`, `item.str`. It sorts by Y then X, groups rows by a Y tolerance, and TAB-separates columns by an X-gap threshold.

**This is the low-risk surface.** The `transform`/`width`/`str` text-item API is stable across pdf.js major versions, so reimplementing `renderPositional` on modern pdfjs should yield near-identical output.

## Target library: `unpdf`

- Maintained by unjs; ships a serverless-optimized `pdfjs-dist` build (no worker, no canvas, no filesystem) — a clean fit for Vercel Functions.
- ESM-native, which matches `api/` (`"type": "module"`).
- Key APIs we need:
  - `extractText(pdf, { mergePages })` — high-level default text (we likely won't use this directly; see strategy).
  - `getDocumentProxy(uint8array)` → a `PDFDocumentProxy` whose `page.getTextContent()` returns items with `.str` / `.transform` / `.width`. **This is what lets us port both `render_page` and `renderPositional` ourselves and keep control of the output.**
  - `getResolvedPDFJS()` / `configureUnPDF` if we need a specific build.

> Confirm exact `unpdf` version API before Task 1 — pin a specific version and read its README; do not assume the surface from this doc.

Alternative considered: depend on `pdfjs-dist` directly (legacy serverless build). `unpdf` is preferred because it pre-solves the serverless packaging (worker/canvas stubbing) that is the main footgun of raw `pdfjs-dist` on Vercel. If `unpdf` proves awkward, falling back to `pdfjs-dist` legacy build is the escape hatch — the porting work below is identical either way.

## Migration strategy

**Own the render, not the library's linearization.** Rather than depend on `unpdf.extractText`'s opaque output, port *our two known render functions* onto `unpdf`'s `getDocumentProxy().getPage().getTextContent()`:

1. **`renderDefault`** — a faithful port of pdf-parse's `render_page` (the Y-change-newline loop above), so `standard`/`tabular`/`gavle`/`schema`/`formatD`/`formatE` output stays as close as possible to today's.
2. **`renderPositional`** — the existing geometry renderer, repointed at modern text items.

This keeps extraction deterministic and under our control, and concentrates any divergence in one small, testable function per mode instead of a third-party black box.

### Validation is the hard part, not the code

The code change is ~1 file. The real work is **proving no court regressed**. Plan:

1. **Build a golden corpus first (before changing anything).** For every enabled court in `courtConfig.ts`, fetch its current live PDF(s) and save both the raw bytes (`fixtures/pdfs/<court>.pdf`) and the current pdf-parse text output (`fixtures/text/<court>.txt`) as golden files. Do this on Node 22 (current prod) so the golden text reflects production truth.
2. **Diff new vs. golden text** per court. Expect whitespace/line-break churn. Triage each diff: cosmetic (safe) vs. structural (will break the parser).
3. **Diff parsed hearings**, which matters more than raw text: run `parseCourtPdf` on both old and new text for each court and compare hearing **count** and every field (`date`, `time`, `caseNumber`, `type`, `room`, `saken`). Zero diffs = court is safe. Any diff = retune that court's parser or its renderer.
4. **Retune parsers** where structural diffs appear — per `memory: feedback-extend-parsers-dont-add`, adjust the existing strategy, don't fork a new one.
5. Only flip production once every enabled court shows **zero hearing-level diffs** (or a diff we've explicitly reviewed and accepted).

This golden-corpus harness is the deliverable that makes the migration safe and repeatable; it should live under `scripts/` or `src/test/` so it can re-run on future library bumps.

## Task breakdown

- [ ] **Task 0 — Node-24 premise spike (do first; abort on failure).** The entire migration exists to make extraction work on Node 24+. **Validate that premise before investing in the renderer port and parser retuning.** On a Node-24 binary (download a portable build as in PR #199), install the pinned `unpdf`, fetch one real domstol.se PDF, and run both `extractText` and `getDocumentProxy().getPage(1).getTextContent()`. Confirm neither throws `Invalid PDF structure` and that text comes out. If `unpdf`/modern pdfjs *also* fails on Node 24, stop — the whole approach is wrong and we need a different library. Cheap now (~30 min); saves the entire investment if the premise is false. This is the same "verify the premise before building on it" lesson that produced PR #199.
- [ ] **Task 1 — Golden corpus harness.** Script that iterates `COURTS`, fetches live PDF(s) via the existing `fetchDomstol` proxy chain, and writes `fixtures/pdfs/*.pdf` + `fixtures/text/*.txt` (current pdf-parse output, both modes as appropriate). Commit the fixtures. This is the regression baseline — build it on Node 22 (current prod) so golden text reflects production truth.
- [ ] **Task 2 — Add `unpdf`; build `renderDefault` + `renderPositional` on it.** New module (e.g. `api/_lib/extractText.ts`) exposing `extract(bytes, mode)`. Port `render_page` faithfully; repoint `renderPositional`. Pin the `unpdf` version. **Watch the stale `getTextContent` options:** both current renderers pass `{ normalizeWhitespace: false, disableCombineTextItems: false }`. `normalizeWhitespace` was **removed** in modern pdfjs (~v3) and combine behavior changed — so those options are silently no-ops and item segmentation *will* differ from the old build. This is the primary expected source of text drift; don't assume a "faithful" port is byte-identical.
- [ ] **Task 3 — Text-diff gate.** Harness that runs the new extractor over `fixtures/pdfs/*` and diffs against `fixtures/text/*`. Categorize diffs; capture a report.
- [ ] **Task 4 — Hearing-diff gate.** Run `parseCourtPdf` over old vs. new text for every court; assert identical hearing arrays. This is the real pass/fail. Wire it as a Vitest so CI enforces it.
- [ ] **Task 5 — Retune parsers** for any court with structural diffs, re-running Task 4 until green.
- [ ] **Task 6 — Swap the serverless function** (`api/fetch-court-pdf.ts`) to the new extractor; keep the `fetchDomstol` + `validatePdf` fetch layer unchanged (that part works). Remove the `createRequire`/`pdf-parse/lib/pdf-parse.js` shim.
- [ ] **Task 7 — Update `debug-pdf.cjs`** to the new extractor (it's CJS — use dynamic `import()` of the ESM module, or convert). Keep local/prod extraction identical per CLAUDE.md.
- [ ] **Task 8 — `scripts/generate-lagrum.cjs`.** Lowest priority (one-off, run manually). Migrate or leave on a locally-pinned old Node; note the decision.
- [ ] **Task 9 — Drop the Node pin?** Once extraction is on modern pdfjs, re-confirm Node 24 with the full function (Task 0 only spiked the library), then relax `engines.node` from `22.x`. Re-run the concurrent-burst check from PR #199 (single request is not enough — Node 24 failed even single, but concurrency was the amplifier). Keep CI on the same version as prod.
- [ ] **Task 10 — Docs.** Update `CLAUDE.md` (Tech Stack + PDF Troubleshooting sections still say pdf-parse) and `memory: project-vercel-migration` / `project-node24-breaks-pdfparse`.

## Risks & mitigations

- **Silent parser regressions** — the whole reason for the golden-corpus + hearing-diff gates (Tasks 1/3/4). Do not skip Task 1; without a pre-change baseline there's nothing to diff against.
- **`unpdf` output drift on positional courts** — low, but covered by the same hearing-diff gate.
- **Serverless bundle size / cold start** — `pdfjs-dist` is larger than the old build; verify the function still deploys and cold-starts acceptably.
- **Summer-recess sparse PDFs** — several courts currently list 0–1 hearings (e.g. Alingsås wk30). A court with 0 hearings can't prove its parser survived; note which courts had thin corpora and re-validate them when schedules refill.

## Rollback

Each task is independently revertable; production only flips at Task 6. If a regression surfaces post-deploy, revert the `api/fetch-court-pdf.ts` swap — the `pdf-parse` dependency and the Node-22 pin stay in place until Task 9, so reverting Task 6 fully restores the PR #199 state.

## Out of scope

- Changing the fetch/proxy layer (`fetchDomstol`, `validatePdf`) — it works and is orthogonal.
- Parser logic changes beyond what's needed to absorb extraction drift.
- New court onboarding.
