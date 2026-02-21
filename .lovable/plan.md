

## Problem

The PDF has a tabular layout where "Saken" text wraps across multiple lines in a left column, and room/location info ("Sal 14 (säkerhetssal) Malmö tingsrätt") sits in a right column at the same vertical positions. The `groupItemsIntoRows` function in the edge function merges all items at the same y-coordinate into one line, causing "(säkerhetssal)", "Malmö", and "tingsrätt" to be injected into the middle of the saken text.

## Solution

Add column-gap detection to `groupItemsIntoRows`. After sorting items left-to-right within a row, if there is a large horizontal gap between consecutive items (indicating a column boundary), split the row into separate output lines. This keeps the saken column and the room/location column as distinct lines.

## File to Change

### `supabase/functions/fetch-court-pdf/index.ts` -- `groupItemsIntoRows` function (lines 18-44)

Replace the final mapping step (lines 40-43) that joins all items into one string. Instead, detect x-gaps and split:

```typescript
function groupItemsIntoRows(items: TextItem[], yTolerance = 3): string[] {
  // ... existing filtering, sorting, and row grouping logic stays the same ...

  const result: string[] = [];
  for (const row of rows) {
    row.items.sort((a, b) => a.transform[4] - b.transform[4]);

    // Detect large horizontal gaps to split columns
    const segments: TextItem[][] = [[]];
    for (let i = 0; i < row.items.length; i++) {
      if (i > 0) {
        const prevItem = row.items[i - 1];
        const prevEnd = prevItem.transform[4] + (prevItem.str.length * 5); // approximate end x
        const currentX = row.items[i].transform[4];
        const gap = currentX - prevEnd;
        if (gap > 40) {
          // Large gap = new column segment
          segments.push([]);
        }
      }
      segments[segments.length - 1].push(row.items[i]);
    }

    // Each segment becomes its own line
    for (const segment of segments) {
      const text = segment.map((item) => item.str).join(" ").trim();
      if (text) result.push(text);
    }
  }
  return result;
}
```

The gap threshold of 40 units is conservative -- typical character width in PDFs is about 5-7 units, so 40 units represents roughly 6-8 character widths of empty space, which reliably indicates a column boundary rather than a normal word space.

### Why This Works

- Normal word spacing within the saken column has small x-gaps (under 10 units)
- The gap between the saken column and the room/location column is much larger (50+ units)
- By splitting at large gaps, "Sal 14 (säkerhetssal) Malmö tingsrätt" becomes its own line(s), separate from the saken text
- The existing parser logic in `cleanSaken` already knows how to strip room info and court names when they appear on their own lines
- This fix benefits all courts, not just Hassleholm -- any PDF with column layouts will be handled correctly

### Technical Details

- The `prevEnd` approximation uses `str.length * 5` as a rough character width. This does not need to be exact -- we only need to distinguish between normal word gaps (~5-15 units) and column gaps (~50+ units)
- The threshold of 40 is chosen to avoid false positives (splitting normal text) while catching real column boundaries
- Edge function will auto-redeploy after the change
