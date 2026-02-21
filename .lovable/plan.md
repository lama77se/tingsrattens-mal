

## Root Cause

The column-gap detection logic I added to `groupItemsIntoRows` in the edge function is the cause. It splits PDF rows into multiple output lines based on x-position gaps, but different PDFs from the same court (different weeks) have slightly different layouts. This causes:

- **Week 7**: Date, time, and hearing type end up on **three separate lines** instead of one. The tabular parser's `HEARING_LINE_REGEX` requires date+time on the same line, so nothing matches and zero hearings are parsed.
- **Week 9**: Date+time end up on one line but with nothing after the end time. The regex requires text after the time range (`\s+(.*)`) so it also fails to match.
- **Week 8**: Everything happens to land on the same line, so parsing works fine.

## Solution

Revert the `groupItemsIntoRows` function to the simpler approach: join all items in a row into a single line (left-to-right by x-coordinate). This restores the previous behavior where date, time, type, saken, and room are on one line for tabular PDFs.

The "Saken" contamination problem (Malmö tingsrätt words mixed into saken) should instead be handled **in the client-side parser** where we have more context about what each field means, rather than in the raw text extraction step.

## Changes

### 1. `supabase/functions/fetch-court-pdf/index.ts` -- Simplify `groupItemsIntoRows`

Remove the column-detection logic (lines 40-103) and replace with simple left-to-right joining:

```typescript
function groupItemsIntoRows(items: TextItem[], yTolerance = 3): string[] {
  const filtered = items.filter((item) => item.str.trim().length > 0);
  if (filtered.length === 0) return [];

  const sorted = [...filtered].sort((a, b) => b.transform[5] - a.transform[5]);

  const rows: { y: number; items: TextItem[] }[] = [];
  for (const item of sorted) {
    const y = item.transform[5];
    const existingRow = rows.find((r) => Math.abs(r.y - y) <= yTolerance);
    if (existingRow) {
      existingRow.items.push(item);
    } else {
      rows.push({ y, items: [item] });
    }
  }

  rows.sort((a, b) => b.y - a.y);

  return rows.map((row) => {
    row.items.sort((a, b) => a.transform[4] - b.transform[4]);
    return row.items.map((item) => item.str).join(" ").trim();
  }).filter(Boolean);
}
```

### 2. Handle Saken/Location contamination in the client-side parser instead

The original problem (Malmö tingsrätt words in saken) will return. To fix it properly, add a cleanup step in `formatTabular.ts` that strips known location patterns from the saken text after extraction:

- Strip patterns like "(säkerhetssal)" from saken
- Strip standalone court names ("Malmö tingsrätt") that appear embedded in saken text
- These patterns are already partially handled by existing `stripRoom` and `courtNameAtEnd` logic but need strengthening

Specifically, add a post-extraction cleanup in `formatTabular.ts` around line 330 that removes location-related fragments from saken:

```typescript
// Strip embedded location fragments that leaked from the room/location column
saken = saken
  .replace(/\s*\(säkerhetssal\)\s*/g, " ")
  .replace(/\s*\(extern\s+lokal\)/gi, " ")
  .trim();
```

And improve the existing trailing court name extraction (line 344) to also catch mid-text court names.

### Why This Approach Is Better

- The edge function should produce **faithful text extraction** -- one line per visual row, preserving the original PDF layout
- Column separation is a **parsing concern**, not an extraction concern -- the parser knows what fields to expect and can split them correctly
- Different PDFs from the same court can have different column gaps, making gap-based splitting unreliable at the extraction level
- The parser already has logic for room extraction, court name detection, etc. -- it just needs minor improvements to handle edge cases

### Deploy

The edge function will auto-redeploy after saving.
