

# Fix: Forbearbeta Blekinges ihopklistrade PDF-text

## Bakgrund

Biblioteket `pdf-parse` extraherar text baserat pa PDF:ens interna textlager. Nar man tittar pa en PDF i webblasaren laggs visuella mellanslag till av renderaren baserat pa textfragmentens koordinater, men `pdf-parse` far inte alltid med dessa som faktiska mellanslagstecken. Loggen visar den faktiska strangen som parsern jobbar med, sa `HuvudforhandlingT 3535-24` ar verkligen vad koden ser.

## Losning

Lagg till ett forbearbetningssteg i `parseCourtPdf` som infogar mellanslag fore malnummerprefix nar de ar ihopklistrade med foregaende text.

### Andring i `src/lib/parseCourtPdf.ts`

**Rad 54** (efter `lines` skapas): Lagg till en rad som normaliserar varje rad:

```typescript
const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

// Pre-process: insert space before case number prefixes glued to text
// e.g. "HuvudförhandlingT 3535-24" -> "Huvudförhandling T 3535-24"
const processedLines = lines.map(line =>
  line.replace(/([a-zA-ZåäöÅÄÖ])((?:FT|[TBKÄ])\s?\d{1,6}[-–—]\d{2})/gi, "$1 $2")
);
```

**Rad 103** (for-loopen): Byt `lines` till `processedLines`:

```typescript
for (let i = 0; i < processedLines.length; i++) {
  const line = processedLines[i];
```

**Alla ovriga referenser till `lines[i-1]`, `lines[i+1]` etc** (rad 139, 155, 159, 173, 193, 203, 231-233, 241-246): Byt till `processedLines[...]`.

Regexen `([a-zA-ZåäöÅÄÖ])((?:FT|[TBKÄ])\s?\d{1,6}[-–—]\d{2})` ar precis och riskfri:
- Den triggas bara nar en bokstav direkt foljs av ett malnummermonstret (T/B/FT/K/A + siffror + bindestreck + 2 siffror)
- Om texten redan har mellanslag handlar ingenting
- Den paverkar inte nagon annan domstols data

### Fil som andras
- `src/lib/parseCourtPdf.ts`

