

# Extrahera annan domstol fran saken-faltet

## Bakgrund
Ibland listar en tingsratts veckolista forhandlingar som egentligen tillhor en annan domstol (t.ex. Uppsala tingsratt eller Svea hovratt). Dessa syns i saken-faltet med formatet "Uppsala tingsratt - mord m.m.".

## Vad som ska handa
Nar saken innehaller ett monster som "Uppsala tingsratt - mord m.m.":
- **Tingsratt-faltet** andras till "Uppsala tingsratt (plats: Attunda tingsratt)"
- **Saken-faltet** andras till "mord m.m." (bara brottsbeskrivningen)

## Teknisk losning

### Andring i `src/lib/parseCourtPdf.ts`

Efter att saken har extraherats och rensats (runt rad 226-236), lagg till en kontroll:

```typescript
// Detect another court in saken: "Uppsala tingsrätt - mord m.m."
const courtInSakenRegex = /^(.+(?:tingsrätt|hovrätt|kammarrätt))\s*[-–—]\s*(.+)$/i;
let resolvedCourt = court;
const courtInSaken = saken.match(courtInSakenRegex);
if (courtInSaken) {
  const otherCourt = courtInSaken[1].trim();
  saken = courtInSaken[2].trim();
  resolvedCourt = `${otherCourt} (plats: ${court})`;
}
```

Sedan anvands `resolvedCourt` istallet for `court` i hearing-objektet (rad 276).

### Sammanfattning av andringar
- Lagg till regex-matchning efter saken-rensning
- Uppdatera `court`-faltet i hearing-objektet till `resolvedCourt`
- Ingen andring i `Hearing`-interfacet eller `HearingsTab.tsx` behovs -- court-faltet ar redan en strang

### Fil som andras
- `src/lib/parseCourtPdf.ts`

