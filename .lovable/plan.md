
# Fix: Saktext ihopklistrad med malnummer-suffix

## Problem
PDF-texten saknar mellanslag mellan malnumrets artal och sakbeskrivningen, t.ex.:
- `K 2940-25ansökan om konkurs` -- `\b` matchar INTE mellan `5` och `a` (bada ar `\w`)
- `T 3535-24äktenskapsskillnad` -- `\b` matchar mellan `4` och `ä` (ä ar inte `\w`)

Darfor parsas bara forhandlingar dar saken borjar med ett icke-ASCII-tecken (a, o, a).

## Losning

Lagg till ytterligare en `.replace()` i `processedLines`-preprocessningen (rad 58-60) som infogar mellanslag efter malnummermonstret nar det foljs direkt av en bokstav:

```typescript
const processedLines = lines.map(line =>
  line
    .replace(/([a-zA-ZåäöÅÄÖ])((?:FT|[TBKÄ])\s?\d{1,6}[-–—]\d{2})/gi, "$1 $2")
    .replace(/(\d{2}[-–—]\d{2})([a-zA-ZåäöÅÄÖ])/g, "$1 $2")
);
```

Den nya regexen `(\d{2}[-–—]\d{2})([a-zA-ZåäöÅÄÖ])` matchar:
- Tva siffror, bindestreck, tva siffror (slutet av ett malnummer)
- Direkt foljt av en bokstav (borjan av saktext)

Och infogar ett mellanslag emellan. T.ex.:
- `K 2940-25ansökan` blir `K 2940-25 ansökan`
- `B 1267-24misshandel` blir `B 1267-24 misshandel`

Redan separerade rader paverkas inte.

### Fil som andras
- `src/lib/parseCourtPdf.ts` -- lagg till en andra `.replace()` i processedLines (rad 58-60)
