

# Generalisera PDF-parsern

## Sammanfattning
Byt namn pa `parseSolnaPdf.ts` till `parseCourtPdf.ts` och funktionen fran `parseSolnaPdf` till `parseCourtPdf`. Parsern ar redan generisk i sin logik — den letar efter standardmonster som alla svenska tingsratter anvander (malnummer, tider, salar, forhandlingstyper). Det enda som behover andras ar namngivningen.

## Andringar

### 1. Byt namn pa filen och funktionen
- `src/lib/parseSolnaPdf.ts` -> `src/lib/parseCourtPdf.ts`
- Funktionen `parseSolnaPdf()` -> `parseCourtPdf()`
- Uppdatera JSDoc-kommentaren fran "Solna tingsratt" till "Swedish court PDFs"
- Andra default-varde for `court`-parametern fran `"Solna tingsratt"` till att inte ha nagot default (kraver explicit angivelse)

### 2. Uppdatera importerna
- `src/components/DataLoadingTab.tsx`: andra import fran `parseSolnaPdf` till `parseCourtPdf` fran `@/lib/parseCourtPdf`
- `src/pages/Index.tsx`: andra import av `Hearing`-typen fran `@/lib/parseCourtPdf`

### 3. Ta bort gamla filen
- Radera `src/lib/parseSolnaPdf.ts`

## Tekniska detaljer
Inga logikandringar behovs — parsern anvander redan generiska regex-monster for svenska domstolshandlingar:
- Malnummer: `T`, `B`, `FT`, `A` (alla maltyper)
- Datum: ISO-format och svenska datumformat
- Tider, salar, forhandlingstyper — samma over alla tingsratter

Det enda som ar "per tingsratt" ar `court`-parametern som skickas in vid anrop, vilket redan fungerar korrekt.
