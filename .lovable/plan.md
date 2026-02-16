

# Lagg till Attunda tingsratt och sortera tingsratter

## 1. Lagg till Attunda tingsratt i `src/lib/courtConfig.ts`

Attundas URL-format ar mer komplext: `v.[vecka]-YYYY-MM-DD-DD` dar datumen representerar mandag och fredag i den aktuella veckan.

Exempel: vecka 7 2026 -> `webb-forhandlingar-v.7-2026-02-09-13.pdf`
- 2026-02-09 ar mandag
- 13 ar fredagens dag (den 13:e)

For att bygga URL:en behovs en hjalp-funktion som beraknar mandagens datum for en given ISO-vecka och ar, samt fredagens dag.

```typescript
import { startOfISOWeek, addDays, format } from "date-fns";

// Hjalp-funktion for att fa mandagens datum fran ISO vecka+ar
function getISOWeekMonday(week: number, year: number): Date {
  // Jan 4 ar alltid i vecka 1
  const jan4 = new Date(year, 0, 4);
  const startOfWeek1 = startOfISOWeek(jan4);
  return addDays(startOfWeek1, (week - 1) * 7);
}
```

Ny court-entry:
```typescript
{
  id: "attunda_tingsratt",
  name: "Attunda tingsrätt",
  buildUrl: (week, year) => {
    const monday = getISOWeekMonday(week, year);
    const friday = addDays(monday, 4);
    const monStr = format(monday, "yyyy-MM-dd");
    const friDay = format(friday, "dd");
    return `${BASE}/attunda_tingsratt/veckans-forhandlingar/webb-forhandlingar-v.${week}-${monStr}-${friDay}.pdf`;
  },
}
```

## 2. Sortera alla tingsratter i bokstavsordning

Ordningen blir: Alingsas, Attunda, Solna. Sorteringen gors statiskt i COURTS-arrayen.

## 3. Uppdatera parsern for "Tingssal"

Attundas PDF anvander "Tingssal 16" istallet for "Sal 4". Det befintliga `roomRegex` (`\b[Ss]al\s+(\S+)`) matchar delvis men ger fel resultat -- det fångar "Sal" inuti "Tingssal" men missar numret korrekt.

Andring i `src/lib/parseCourtPdf.ts`:
- Uppdatera `roomRegex` till att matcha bade "Sal" och "Tingssal": `/(?:Tings)?[Ss]al\s+(\S+)/`
- Uppdatera cleanup-regex for saken till att aven ta bort "Tingssal X": `/\s*(?:[Tt]ings)?[Ss]al\s+\S+\s*$/`
- Uppdatera room-visningen sa att "Tingssal 16" visas korrekt (behall prefix fran matchningen)

## Filer som andras

1. **`src/lib/courtConfig.ts`** -- lagg till import av date-fns, hjalp-funktion, ny tingsratt, sortera arrayen
2. **`src/lib/parseCourtPdf.ts`** -- uppdatera roomRegex och cleanup-regex for att hantera "Tingssal"

