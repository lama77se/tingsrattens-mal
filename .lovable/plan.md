

# Lagg till datumfilter, fixa typfilter och lagg till etiketter

## Andringar i `src/components/HearingsTab.tsx`

### 1. Etiketter ovanfor filtren
Lagg till en `label`-text ovanfor varje filter sa att anvandaren ser vad filtret gar:
- "Sok" ovanfor sokfaltet
- "Tingsratt" ovanfor tingsratts-dropdown
- "Typ" ovanfor typ-dropdown
- "Datum" ovanfor det nya datumfiltret

### 2. Nytt datumfilter
Lagg till en Select-dropdown for datum som listar alla unika datum fran hearings-datan, med "Alla" som default. Filtret jamfor `h.date` med det valda vardet.

### 3. Fixa typfiltret
Typfiltret anvander exakt strangmatchning (`h.type === typeFilter`). Om den parsade typen innehaller annorlunda tecken (t.ex. Unicode-varianter av svenska tecken) sa matchar inte filtret. Fix:
- Anvand `normalize()`-funktionen (eller `.trim()` + case-insensitive) vid bade listning av unika typer OCH vid filtrering
- Trimma alla typvarden for att ta bort eventuella osynliga tecken

## Tekniska detaljer

**`src/components/HearingsTab.tsx`:**
- Ny state: `const [dateFilter, setDateFilter] = useState("Alla")`
- Ny useMemo for unika datum: `const dates = useMemo(() => ["Alla", ...unique.sort()], [hearings])`
- Uppdatera `filtered`-funktionen: lagg till `const matchesDate = dateFilter === "Alla" || h.date === dateFilter`
- For typfiltret: trimma och normalisera typstrangar vid bade generering av listan och filtrering: `h.type.trim() === typeFilter.trim()`
- Wrappa varje filter i en `div` med en `Label`-komponent ovanfor
- Importera `Label` fran `@/components/ui/label`
- Lagg till den nya datum-Select-komponenten med kalenderikon

Inga andringar i andra filer.
