

# Berika lagrum och lagg till sakomrade for B-mal

## Oversikt
- Skapa en JSON-mappningsfil for att koppla "saken" till primart lagrum och sakomrade for brottmal (B-mal)
- Implementera matchningslogik som fuzzy-matchar saken mot mappningslistan, inklusive hantering av graderingar (t.ex. "grov" -> alternativa lagrum)
- Lagg till "Sakomrade" som nytt falt i tabellen och som filtrerbart falt
- Populera "Lagrum"-faltet automatiskt baserat pa matchningen

## Nya filer

### `src/lib/lagrumMappings.ts`
En ny fil som exporterar mappnings-JSON:en som ett TypeScript-objekt plus en funktion `matchLagrum(saken: string, caseNumber: string)` som returnerar `{ lagrum: string, sakomrade: string }`.

**Matchningslogik:**
1. Kontrollera att malnumret borjar med "B" (brottmal), annars returnera tomma strangar
2. Normalisera saken till lowercase och trimma bort "m m", "m.m." fran slutet
3. For varje nyckel i mappningen, kontrollera om saken innehaller nyckeln (substring-match, case-insensitive)
4. Om match hittas: anvand `primart_lagrum` som default
5. Om saken aven innehaller graderingsord ("grov", "grovt") OCH `alternativa_lagrum` finns med graderingsord -> anvand alternativt lagrum istallet
6. Returnera forsta matchande lagrum och sakomrade

**Exempel:**
- Saken: "Grov olovlig korning" -> matchar "olovlig korning", men "grov" finns ej i alternativa -> primart lagrum "Trafikbrottslagen 3 §"
- Saken: "Grovt ran" -> matchar "ran", "grovt" matchar alternativa "BrB 8 kap. 6 § (grovt ran)" -> anvander alternativt lagrum
- Saken: "Bedrägeri" -> matchar "bedrageri" -> primart lagrum "BrB 9 kap. 1 §"

## Andringar i befintliga filer

### `src/lib/parseCourtPdf.ts`
- Lagg till `sakomrade: string` i `Hearing`-interfacet
- Importera `matchLagrum` fran `lagrumMappings`
- Anropa `matchLagrum(saken, caseNumber)` efter att saken extraherats
- Satt `lagrum` och `sakomrade` pa hearing-objektet

### `src/components/HearingsTab.tsx`
- Lagg till ny tabellkolumn "Sakomrade" (mellan Saken och Lagrum)
- Lagg till `sakomradeFilter` state med dropdown-filter
- Berakna unika sakomraden fran hearings (exkludera tomma)
- Uppdatera `filtered`-logiken med `matchesSakomrade`
- Uppdatera filtergridet till `lg:grid-cols-6` for att rymma det nya filtret

## Tekniska detaljer

**Hearing-interface utokat:**
```typescript
export interface Hearing {
  id: string;
  date: string;
  time: string;
  court: string;
  caseNumber: string;
  type: string;
  room: string;
  saken: string;
  parties: string;
  lagrum: string;
  sakomrade: string;
  fleraSakfragor: boolean;
}
```

**matchLagrum-funktionens signatur:**
```typescript
export function matchLagrum(
  saken: string, 
  caseNumber: string
): { lagrum: string; sakomrade: string }
```

**Matchningsalgoritm (pseudokod):**
```text
1. Om caseNumber inte borjar med "B" -> return { lagrum: "", sakomrade: "" }
2. cleanSaken = saken.toLowerCase().replace(/m\.?\s*m\.?\s*$/, "").trim()
3. For varje (nyckel, data) i mappningen:
   a. Om cleanSaken innehaller nyckel:
      - lagrum = data.primart_lagrum[0]
      - sakomrade = data.sakomrade
      - Om cleanSaken matchar /grov|grovt/ OCH data.alternativa_lagrum finns:
        - For varje alt i alternativa_lagrum:
          - Om alt.toLowerCase() innehaller "grov":
            - lagrum = alt (ta bort eventuell parentes-kommentar)
      - return { lagrum, sakomrade }
4. return { lagrum: "", sakomrade: "" }
```

Sortera mappningsnycklarna langst-forst sa att "grov misshandel" matchas fore "misshandel".

**Tabellordning (kolumner):**
Datum | Tid | Tingsratt | Malnummer | Typ | Saken | Sakomrade | Lagrum | Flera

Tre filer andras/skapas: `src/lib/lagrumMappings.ts` (ny), `src/lib/parseCourtPdf.ts`, `src/components/HearingsTab.tsx`.
