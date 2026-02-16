

# Fixa datum, typ och lagg till "Saken"-kolumn

## Problem
Raden `ma 16-feb 09:00 - 11:00 Huvudforhandling B 1626-25 Grov olovlig korning` parsas fel:
- **A) Datum** visar `2026-02-12` istallet for `2026-02-16`
- **B) Typ** visar "Forhandling" istallet for "Huvudforhandling"
- **C) Saken** saknas som eget falt — "Grov olovlig korning" hamnar i "Parter"-kolumnen

## Losning

### 1. Robust datum-parsning (`parseCourtPdf.ts`)
Datumet `16-feb` borde fångas av `shortDateRegex` men det verkar finnas ett problem med matchningsordningen eller med att ISO-regexen falskt matchar nagot pa raden. Fix:
- Flytta short date-matchningen FORE den generella logiken sa att `dd-mmm` format alltid fangas
- Gor matchningen mer explicit med en combined regex som testar alla datumformat i ratt ordning
- Lagg till loggning/fallback sa att om shortDateRegex matchar, den ALLTID anvands oavsett andra matchningar

### 2. Robust typ-detektion (`parseCourtPdf.ts`)
"Huvudforhandling" matchas inte, troligen for att PDF-extraherad text kan ha annorlunda tecken (t.ex. ligatures eller specialtecken for o, a). Fix:
- Normalisera bade raden och hearing types innan jamforelse (ersatt accenterade tecken)
- Alternativt: anvand en regex per typ som tillater valfri variant av svenska tecken

### 3. Nytt falt "saken" i Hearing-interfacet
Lagg till `saken: string` i `Hearing`-interfacet. I PDF-formatet ar "Saken" texten som beskriver brottet/tvisten, t.ex. "Grov olovlig korning". Parsern ska extrahera detta fran texten efter malnumret (och skilja det fran "parter" som ar namnen pa parterna).

### 4. Visa "Saken" i tabellen (`HearingsTab.tsx`)
Lagg till en ny kolumn "Saken" i tabellen mellan "Typ" och "Sal".

## Tekniska detaljer

### Filandringar

**`src/lib/parseCourtPdf.ts`**:
- Lagg till `saken: string` i `Hearing`-interfacet
- Refaktorera datumextraktionen: testa `shortDateRegex` forst pa raden INNAN ISO/svenska datum, eftersom formatet `dd-mmm` ar vanligt och entydigt
- For typ-detektion: normalisera strangarna genom att gora case-insensitive jamforelse och hantera potentiella encoding-skillnader fran PDF-text
- Extrahera "saken" fran texten efter malnumret. I formatet `B 1626-25 Grov olovlig korning` ar "Grov olovlig korning" saken. Nuvarande logik laggar detta i `parties` — det ska istallet ga till `saken`
- `parties` hamtas fran nasta rad eller annan kontext (om tillgangligt)

**`src/components/HearingsTab.tsx`**:
- Lagg till kolumnhuvud "Saken" i tabellen
- Visa `h.saken` i en ny cell
- Uppdatera sokfiltret att aven soka i `saken`-faltet
- Uppdatera `colSpan` fran 7 till 8 for tom-raden

**`src/pages/Index.tsx`**: Inga andringar behovs (Hearing-typen importeras redan fran parseCourtPdf).

