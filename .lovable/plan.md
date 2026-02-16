

# Fixa parsern: hantera dash-varianter och debugging

## Rotorsak
`pdf-parse` extraherar troligen texten med **en-dash (–, U+2013)** eller **em-dash (—, U+2014)** istallet for vanligt bindestreck (-) i datum som `17-feb`. Darfor matchar inte `shortDateRegex` (som anvander `-`), och datumet faller tillbaka till vad som satts av en tidigare rad (t.ex. `2026-02-12`).

Samma problem kan paverka typ-detekteringen om PDF-texten innehaller ovanliga Unicode-tecken for svenska bokstaver som `normalize()` inte hanterar.

## Losning

### 1. Gor alla regex dash-agnostiska (`parseCourtPdf.ts`)
Ersatt alla literala `-` i regex-monster med en teckengrupp som matchar bindestreck, en-dash och em-dash: `[-–—]`

Paverkade regex:
- `shortDateRegex`: `(\d{1,2})[-–—](jan|feb|...)`
- `caseNumberRegex`: `([TBFTA]\s?\d{1,6}[-–—]\d{2})`
- `timeRangeRegex`: `(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})`
- `isoDateRegex`: `(\d{4}[-–—]\d{2}[-–—]\d{2})`

### 2. Lagg till console.log for debugging (`parseCourtPdf.ts`)
Logga de forsta 20 raderna av den extraherade texten sa vi kan se exakt vad pdf-parse producerar. Detta gor framtida debugging mycket enklare. Logga aven varje giltigt hearing-objekt.

### 3. Normalisera bindestreck i output
Nar datumet sparas, ersatt eventuella en-dash/em-dash med vanligt bindestreck i ISO-datumstrangen sa att `currentDate` alltid ar i format `2026-02-17`.

## Tekniska detaljer

Alla andringar i `src/lib/parseCourtPdf.ts`:

**Regex-uppdateringar:**
```
shortDateRegex:  /\b(\d{1,2})[-\u2013\u2014](jan|feb|mar|apr|maj|jun|jul|aug|sep|okt|nov|dec)\b/i
caseNumberRegex: /\b([TBFT\u00c4]\s?\d{1,6}[-\u2013\u2014]\d{2})\b/i
timeRangeRegex:  /(\d{1,2}:\d{2})\s*[-\u2013\u2014]\s*(\d{1,2}:\d{2})/
isoDateRegex:    /(\d{4}[-\u2013\u2014]\d{2}[-\u2013\u2014]\d{2})/
```

**Debug-loggning:**
- `console.log("PDF text first 500 chars:", text.substring(0, 500))` i borjan av funktionen
- `console.log("Parsed hearing:", hearing)` for varje hearing

**Normalisering av output:**
- Ersatt alla dash-varianter med `-` i `currentDate` efter extraktion

Inga andringar i andra filer.
