
# Ta bort "Sal X" fran Saken-faltet vid parsning

## Problem
Nar Alingsas tingsratts PDF parsas hamnar "Sal 4" (eller liknande) i slutet av saken-faltet. Trots att parsern redan forsoker ta bort sal-information fran saken sa fungerar det inte tillrackligt robust, troligtvis pa grund av teckenkodningsproblem i PDF-texten (t.ex. att `\b` word boundary inte matchar ratt).

## Losning
Gora sal-rensningen mer robust i `src/lib/parseCourtPdf.ts` genom att anvanda ett bredare regex-monster som inte forlitar sig pa `\b` word boundary.

### Andring i `src/lib/parseCourtPdf.ts`

Vid saken-rensningen (rad 214-222), lagga till en extra explicit rensning av "Sal" foljt av ett sal-nummer i slutet av strangen:

```typescript
saken = afterCase
  .replace(roomRegex, "")
  .replace(/\s*[Ss]al\s+\S+\s*$/, "")   // extra: ta bort "Sal X" i slutet
  .replace(timeRangeRegex, "")
  .replace(timeRegex, "")
  .trim();
```

Dessutom gors samma rensning pa saken som hamtas fran nasta rad (rad 227-233):

```typescript
if (!saken && i + 1 < lines.length) {
  const nextLine = lines[i + 1].trim();
  if (...) {
    saken = nextLine.replace(/\s*[Ss]al\s+\S+\s*$/, "").trim();
    sakenFromNextLine = true;
  }
}
```

### Tekniska detaljer

- Det extra regexet `/\s*[Ss]al\s+\S+\s*$/` matchar "Sal" foljt av valfritt sal-ID (t.ex. "4", "A", "12") i slutet av strangen, oavsett teckenkodning kring ordgranser
- Det befintliga `roomRegex` behalls for extraktion av sal-information till room-faltet -- den nya rensningen ar ett komplement
- Bara en fil andras: `src/lib/parseCourtPdf.ts`
