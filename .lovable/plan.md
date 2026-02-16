

# Fix parser to match actual PDF text structure

## Root Causes (from console log)

The PDF text looks like this:
```
må 16-feb09:00 - 11:00 Huvudförhandling
B 1626-25
Grov olovlig körning
```

Three problems:
1. `shortDateRegex` has `\b` at end, but `feb` runs directly into `09` (both word chars = no boundary = no match)
2. Case number `B 1626-25` is on its own line -- time, type, date are on the PREVIOUS line, but the parser only checks current + next lines for type
3. Line after case number is "saken" (the matter), not "parties"

## Changes in `src/lib/parseCourtPdf.ts`

### 1. Fix shortDateRegex
Remove trailing `\b` and use a non-capturing lookahead or simply allow the month to be followed by anything:
```
Before: /\b(\d{1,2})[-\u2013\u2014](jan|feb|...)\b/i
After:  /(?:^|[\s])(\d{1,2})[-\u2013\u2014](jan|feb|...)(?=\d|\s|$)/i
```
This allows `16-feb09:00` to match by accepting a digit after the month abbreviation.

### 2. Look at PREVIOUS line for time, type, and date
When a case number is found on a line, the parser already checks the previous line for time. Extend this to also check the previous line for:
- **Type**: Check normalized previous line for hearing type keywords
- **Date**: Check previous line for short date pattern (so `må 16-feb09:00...` sets `currentDate` correctly even if the case number is on the next line)

### 3. Fix saken extraction
The line immediately after the case number line is "saken" (the matter/charge), not parties. Change the logic:
- Line after case number = `saken`
- Line two after case number = `parties` (if it exists and doesn't look like a new hearing/date)

### 4. Also check previous line for date when processing case number
Before creating the hearing object, if `currentDate` wasn't updated on the case number line, re-check the previous line(s) for a short date to ensure the correct date is captured.

## Technical Details

All changes in `src/lib/parseCourtPdf.ts`:

**shortDateRegex** (line 40): Change to remove trailing `\b`:
```typescript
const shortDateRegex = /(\d{1,2})[-\u2013\u2014](jan|feb|mar|apr|maj|jun|jul|aug|sep|okt|nov|dec)/i;
```

**Date extraction in loop** (lines 86-109): Also process date on previous lines when a case number is found. Before the hearing object creation, if the case number line itself had no date, scan back to the previous 1-2 lines for a short date match.

**Type detection** (lines 152-170): Already checks next line. Add check for PREVIOUS line as well (since case number is often on the line after the type):
```typescript
if (type === "Forhandling" && i > 0) {
  const prevNormalized = normalize(lines[i - 1]);
  for (const nt of normalizedTypes) {
    if (prevNormalized.includes(nt.normalized)) {
      type = nt.original;
      break;
    }
  }
}
```

**Saken extraction** (lines 172-186): When there's no text after the case number on the same line, check the NEXT line as "saken" instead of "parties":
```typescript
// If no saken on case number line, next line is saken
if (!saken && i + 1 < lines.length && !lines[i+1].match(caseNumberRegex)) {
  saken = lines[i + 1].trim();
  // Then parties come from line i+2
}
```

**Parties extraction** (lines 188-207): Shift to line i+2 when saken was taken from line i+1.

No changes to other files.
