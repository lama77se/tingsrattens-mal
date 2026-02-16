
# Lagg till flera tingsratter med individuella hamtningsknappar

## Oversikt
Utoka systemet fran en enda tingsratt (Solna) till att stodja flera, borjande med Alingsas tingsratt. Varje tingsratt far en egen "Hamta"-knapp, plus en overgripande "Hamta alla"-knapp.

## Viktigt: Olika URL-monster

Solna och Alingsas har olika URL-struktur:
- **Solna**: `.../solna_tingsratt/veckans-forhandlingar/v7.2026.pdf`
- **Alingsas**: `.../alingsas_tingsratt/veckans-brottmal/veckans-forhandlingar-vecka-7-2026.pdf`

Darfor behover vi en konfiguration per tingsratt som inkluderar en URL-byggare.

## Andringar

### 1. Ny fil: `src/lib/courtConfig.ts`
Central konfiguration for alla tingsratter:

```text
CourtConfig {
  id: string              // t.ex. "solna_tingsratt"
  name: string            // t.ex. "Solna tingsratt"
  buildUrl(week, year)    // returnerar ratt PDF-URL
}
```

Tva poster:
- **solna_tingsratt**: URL-monster `v${week}.${year}.pdf`
- **alingsas_tingsratt**: URL-monster `veckans-forhandlingar-vecka-${week}-${year}.pdf`

### 2. Uppdatera edge function: `supabase/functions/fetch-court-pdf/index.ts`
- Utoka `courtPathMap` med `alingsas_tingsratt`
- Andra URL-bygglogiken sa att den tar emot en `urlPattern`-parameter fran klienten, ELLER bygga URL:en baserat pa courtId (mer robust). Enklast: lat klienten skicka hela PDF-URL:en direkt istallet for att bygga den i edge function.

Basta approach: Klienten skickar `pdfUrl` direkt till edge function. Edge function behover da bara hamta och parsa PDF:en -- den behover inte kanna till URL-monstren. Detta gor det enkelt att lagga till fler tingsratter utan att andra edge function.

### 3. Uppdatera `src/lib/weekUtils.ts`
- Ta bort `buildPdfUrl` (ersatts av `courtConfig.buildUrl`)
- Behall vecko-funktionerna

### 4. Uppdatera `src/lib/api/courtPdf.ts`
- Andra `fetchCourtPdf` att skicka `pdfUrl` istallet for `courtId` + vecka/ar
- Alternativt: skicka bade URL och metadata

### 5. Stor omskrivning: `src/components/DataLoadingTab.tsx`
Ny struktur:

```text
+------------------------------------------+
| [Hamta alla]                             |
+------------------------------------------+
| Solna tingsratt              [Hamta]     |
|   Vecka 6  [steg...]                     |
|   Vecka 7  [steg...]                     |
|   Vecka 8  [steg...]                     |
+------------------------------------------+
| Alingsas tingsratt           [Hamta]     |
|   Vecka 6  [steg...]                     |
|   Vecka 7  [steg...]                     |
|   Vecka 8  [steg...]                     |
+------------------------------------------+
```

- Iterera over `COURTS` fran courtConfig
- Varje tingsratt har sin egen "Hamta"-knapp som hamtar 3 veckor for just den tingsratten
- "Hamta alla" overst startar hamtning for alla tingsratter (sekventiellt per tingsratt)
- State-hantering: `Record<courtId, WeekFetch[]>` istallet for en flat array
- Hearings-aggregering: samlar alla hearings fran alla tingsratter och skickar via `onHearingsFetched`

### 6. Edge function: Generalisera URL-hantering
Anda edge function till att acceptera `pdfUrl` direkt:

```typescript
const { pdfUrl } = await req.json();
// Validera att URL:en ar fran domstol.se
if (!pdfUrl.startsWith('https://www.domstol.se/')) {
  return error;
}
// Hamta och parsa...
```

Detta eliminerar behovet av `courtPathMap` i edge function och gor det trivialt att lagga till fler tingsratter i framtiden -- bara frontend-konfigurationen behover andras.

## Tekniska detaljer

**Filer som andras:**
1. `src/lib/courtConfig.ts` -- ny fil
2. `supabase/functions/fetch-court-pdf/index.ts` -- acceptera pdfUrl direkt
3. `src/lib/api/courtPdf.ts` -- skicka pdfUrl
4. `src/lib/weekUtils.ts` -- ta bort buildPdfUrl
5. `src/components/DataLoadingTab.tsx` -- stor omskrivning for multi-court

**Filer som inte andras:** HearingsTab, parseCourtPdf, Index -- dessa ar redan generiska.
