

# Hämta Solna tingsrätts förhandlingar via PDF

## Sammanfattning

Bygga en riktig datahämtning som laddar ner PDF-filer med veckans forhandlingar fran Solna tingsratt via domstol.se. Hämtningen sker for nuvarande vecka och nasta vecka, med ett detaljerat statusflode som visar varje steg.

## Arkitektur

Eftersom PDF-filerna ligger pa domstol.se och inte kan hamtas direkt fran webblasaren (CORS), behovs en Supabase Edge Function som mellanhand:

```text
[Frontend]  -->  [Edge Function: fetch-court-pdf]  -->  [domstol.se PDF]
                        |
                  Hamtar PDF, extraherar text,
                  returnerar radata till frontend
```

URL-monster for Solna: `https://www.domstol.se/globalassets/filer/domstol/solna_tingsratt/veckans-forhandlingar/v{vecka}.{ar}.pdf`

## Statusflode som visas for anvandaren

For varje vecka (nuvarande + nasta) visas stegen:

1. **Vantar** - Annu ej startad
2. **Beraknar URL** - Bygger PDF-lanken baserat pa veckonummer
3. **Hamtar PDF** - Laddar ner fran domstol.se
4. **Bearbetar** - Extraherar text fran PDF
5. **Klar** / **Fel** - Resultat med antal hittade forhandlingar eller felmeddelande

## Detaljerad plan

### Steg 1: Satt upp Supabase (Lovable Cloud)

Aktivera Lovable Cloud-backend for att kunna skapa Edge Functions.

### Steg 2: Skapa Edge Function `fetch-court-pdf`

**Fil:** `supabase/functions/fetch-court-pdf/index.ts`

- Tar emot `{ courtId, weekNumber, year }` i request body
- Bygger PDF-URL baserat pa courtId (for Solna: `solna_tingsratt`)
- Hamtar PDF:en fran domstol.se
- Extraherar texten fran PDF med `pdf-parse` eller returnerar radata
- Returnerar `{ success, text, url, weekNumber, year }`

### Steg 3: Skriv om DataLoadingTab.tsx

**Fil:** `src/components/DataLoadingTab.tsx`

Byt ut alla mockade tingsratter mot enbart Solna tingsratt. Designen andras till:

- Visar tva kort: ett for **Vecka N (nuvarande)** och ett for **Vecka N+1 (nasta)**
- Varje kort har ett steg-for-steg-statusflode med ikoner:
  - Gra cirkel = vantar
  - Snurrande = pagaende
  - Gron bock = klart
  - Rod varning = fel
- Knappen "Hamta data" startar hämtningen for bada veckorna
- Varje steg uppdateras i realtid nar det gar vidare
- Vid lyckat resultat visas antal hittade forhandlingar och en forhandsvisning av radata

### Steg 4: Skapa hjalp-funktion for veckonummerberakning

**Fil:** `src/lib/weekUtils.ts`

- `getCurrentWeek()` - returnerar nuvarande ISO-veckonummer
- `getNextWeek()` - returnerar nasta veckonummer
- `buildPdfUrl(courtId, week, year)` - bygger URL

### Steg 5: Skapa API-klient

**Fil:** `src/lib/api/courtPdf.ts`

- Funktion som anropar Edge Function med ratt parametrar
- Hanterar felfall (404 = PDF finns inte annu, nätverksfel, etc.)

## Tekniska detaljer

- **PDF-text-extraktion**: Edge Function hamtar PDF som arraybuffer. For initial version returneras radata/texten. Parsning av forhandlingsrader gors i nasta steg.
- **Veckonummerberakning**: Anvander `date-fns` (redan installerat) med `getISOWeek` och `getISOWeekYear`.
- **Felhantering**: Om PDF inte finns (vanligt for nasta vecka tidigt i veckan) visas tydligt meddelande "PDF inte publicerad annu".

