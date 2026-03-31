# Lagrum Bulk Import from Brå Klassificering av brott

## Goal

Replace the hand-maintained `lagrumMappings.ts` (201 entries) with a comprehensive, authoritative mapping generated from Brå's "Klassificering av brott" PDF (~550 crime codes). Clean slate — no entries carried over from the old file.

## Source

Brå (Brottsförebyggande rådet) publishes "Klassificering av brott" annually. The PDF contains tabular data mapping ~550 four-digit crime codes to:
- Crime description (brottsrubricering)
- Legal paragraph reference (lagrum)
- Penalty range

Latest known version: v13.1 (2025), available at bra.se.

## What the script produces

A complete `src/lib/lagrumMappings.ts` file with:
- **Key**: normalized crime description (lowercase), e.g. `"misshandel"`
- **sakomrade**: derived from BrB chapter number or special law name
- **primart_lagrum**: the primary legal paragraph, e.g. `["BrB 3 kap. 5 §"]`
- **alternativa_lagrum**: aggravated/mitigated variants when Brå lists them under the same rubric
- **No kommentar field** — Brå doesn't provide commentary

## Architecture

### Script: `scripts/generate-lagrum.cjs`

Standalone CommonJS Node.js script (same pattern as `debug-pdf.cjs`). Uses `pdf-parse` (already installed) for text extraction.

**Steps:**
1. Download the Brå PDF (URL passed as argument, or default to latest known URL)
2. Extract text using pdf-parse
3. Parse the tabular structure: each row has crime code, description, lagrum, penalty
4. Normalize crime descriptions (lowercase, trim "m.m.", handle variants)
5. Build sakomrade from a BrB chapter lookup table
6. Write the TypeScript file to stdout (pipe to file for review)

### BrB chapter → sakomrade mapping

A hardcoded lookup table in the script:

| Chapter | sakomrade |
|---------|-----------|
| 3 kap. | Brott mot liv och hälsa |
| 4 kap. | Brott mot frihet och frid |
| 5 kap. | Ärekränkningsbrott |
| 6 kap. | Sexualbrott |
| 7 kap. | Brott mot familj |
| 8 kap. | Förmögenhetsbrott |
| 9 kap. | Förmögenhetsbrott |
| 10 kap. | Förmögenhetsbrott |
| 11 kap. | Brott mot borgenärer / ekonomisk brottslighet |
| 12 kap. | Skadegörelsebrott |
| 13 kap. | Allmänfarliga brott |
| 14 kap. | Förfalskningsbrott |
| 15 kap. | Menedsbrott / brott mot rättskipningen |
| 16 kap. | Brott mot allmän ordning |
| 17 kap. | Brott mot allmän verksamhet |
| 20 kap. | Tjänstebrott |

### Special law handling

For crimes outside BrB (narkotikastrafflagen, vapenlagen, smugglingslagen, trafikbrottslagen, etc.), the sakomrade is derived from the law name:

- Narkotikastrafflagen → "Narkotikabrott"
- Vapenlagen → "Vapenbrott"
- Trafikbrottslagen → "Trafikbrott"
- Smugglingslagen → "Tull- och smugglingsbrott"
- etc.

A mapping table of ~15-20 common special laws covers most cases. Unknown laws get the law name as sakomrade.

### Deduplication strategy

Brå lists multiple crime codes for the same crime description at different severity levels (e.g. "Misshandel" appears as both code 9304 and 9306 for different degrees). The script groups these:
- First occurrence becomes `primart_lagrum`
- Subsequent severity variants (grov, ringa) become `alternativa_lagrum`
- Or: separate entries with qualified keys ("grov misshandel", "ringa misshandel")

Decision: **separate entries** — matches how the current lookup works (longest match first).

## Output format

The generated file matches the existing interface exactly:

```typescript
interface LagrumEntry {
  sakomrade: string;
  primart_lagrum: string[];
  alternativa_lagrum?: string[];
}
```

No `kommentar` field (Brå doesn't provide this). The `matchLagrum` function and enrichment pipeline remain unchanged.

## Usage

```bash
node scripts/generate-lagrum.cjs [bra-pdf-url-or-file] > src/lib/lagrumMappings.ts
```

Or with a local PDF:
```bash
node scripts/generate-lagrum.cjs klassificering-av-brott-v13.1.pdf > src/lib/lagrumMappings.ts
```

## Success criteria

- 400+ mapped crime descriptions (up from 201)
- All entries have valid sakomrade
- All entries have at least one primart_lagrum
- Existing `matchLagrum` function works unchanged
- All tests pass after replacing the file
- Script is repeatable: can re-run when Brå publishes a new version

## Risks

- **PDF structure may vary between Brå versions** — the parser may need adjustment for future releases
- **Text extraction quality** — pdf-parse may not perfectly extract the tabular layout; may need row-reassembly logic similar to court PDF parsing
- **Edge cases** — some crimes reference multiple laws or have complex rubrics that don't map cleanly to a single key
