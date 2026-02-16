

# Nytt falt: Maltyp (baserat pa malnummerprefix)

## Oversikt
Lagga till ett nytt falt "Maltyp" som automatiskt harlds fran prefixet i malnumret (t.ex. "B 1234-25" ger prefix "B" som mappas till "Brottmal"). Dessutom laggs ett filter till for Maltyp i forhandlingstabellen.

## Andringar

### 1. Ny fil: `src/lib/maltypMappings.ts`
Skapar en mappningsfil med tingsrattsprefixen:

| Prefix | Maltyp |
|--------|--------|
| B | Brottmal |
| T | Tvistemal |
| FT | Forenklat tvistemal (smamal) |
| K | Konkursmal |
| A (for a-bokstav) | Aktenskapsmal |
| F | Familjemal |
| O (for o-bokstav) | Ovriga arenden |

En funktion `getMaltyp(caseNumber)` extraherar bokstavsprefixet fran malnumret och returnerar ratt maltyp. Flerbokstaviga prefix som "FT" matchas fore enbokstaviga.

### 2. Uppdatera `src/lib/parseCourtPdf.ts`
- Lagga till `maltyp: string` i `Hearing`-interfacet
- Anropa `getMaltyp(caseNumber)` vid parsning och satt faltet pa varje hearing-objekt

### 3. Uppdatera `src/components/HearingsTab.tsx`
- Lagga till ett nytt Select-filter for "Maltyp" (samma monster som befintliga filter)
- Lagga till en kolumn "Maltyp" i tabellen
- Filtreringslogiken utvidgas med `maltypFilter`

### Tekniska detaljer

**Prefix-extraktion:** Malnummer har formatet `[PREFIX] [siffror]-[ar]`, t.ex. "B 1234-25" eller "FT 123-25". Funktionen tar bort siffror och mellanslag fran borjan av malnumret for att fa prefixet. Langre prefix (FT) testas fore kortare (F) for att undvika felaktig matchning.

**Filter-layout:** Det befintliga gridet andras fran `lg:grid-cols-6` till `lg:grid-cols-7` for att rymma det nya filtret, som placeras efter Typ-filtret.

