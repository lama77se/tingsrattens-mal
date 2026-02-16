

# Fixa PDF-parsern for formatet "må 16-feb 09:00 - 11:00 Huvudförhandling B 1626-25 ..."

## Problem
Raden `må 16-feb 09:00 - 11:00 Huvudförhandling B 1626-25 Grov olovlig körning` parsas fel pa tre satt:
1. **Datum**: `16-feb` kanns inte igen — parsern hanterar bara ISO-datum (`2026-02-16`) och fullstandiga svenska datum (`16 februari 2026`), inte forkortat format med bindestreck
2. **Tid**: Bara en av tiderna fangas, borde vara `09:00 - 11:00`
3. **Forhandlingstyp**: "Huvudforhandling" tappas och faller tillbaka till default "Forhandling"

## Losning — uppdatera `src/lib/parseCourtPdf.ts`

### 1. Lagg till stod for forkortat datumformat `dd-mmm`
Lagg till en ny regex och en `shortMonthMap` for att matcha `16-feb`, `3-mar`, etc:
```
shortMonthMap: jan->01, feb->02, mar->03, apr->04, maj->05, jun->06, jul->07, aug->08, sep->09, okt->10, nov->11, dec->12
```
Regex: `(\d{1,2})-(jan|feb|mar|apr|maj|jun|jul|aug|sep|okt|nov|dec)`
Aret hamleds fran nuvarande ar (eller fran kontexten i dokumentet om det finns).

### 2. Fanga tidsintervall
Andra fran att bara fanga forsta tiden till att fanga hela intervallet `09:00 - 11:00`:
```
timeRangeRegex: /(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/
```
Om tidsintervall hittas, spara som `"09:00 - 11:00"`. Om bara en tid hittas, anvand den.

### 3. Forhandlingstyp — kontrollera hela raden forst
Flytta typdetekteringen sa att den kor pa hela raden innan vi extraherar case number. Nuvarande logik fungerar i princip, men vi behover sakerstalla att "Huvudforhandling" matchas fore "Forhandling" genom att satta "Forhandling" sist i listan (den ar en substring av "Huvudforhandling").

### 4. Forbattra parties-extraktionen
Rensa bort forhandlingstyp och tidsintervall fran parties-strangen sa att bara "Grov olovlig korning" blir kvar.

## Tekniska detaljer

Alla andringar sker i `src/lib/parseCourtPdf.ts`:
- Ny `shortMonthMap` for `jan`-`dec`
- Ny regex for `dd-mmm` datumformat
- Ny regex for tidsintervall (`HH:MM - HH:MM`)
- Flytta "Forhandling" till sist i `hearingTypes`-listan sa att mer specifika typer matchas forst
- Rensa parties fran typ- och tidsdata

Inga andringar i andra filer behovs.

