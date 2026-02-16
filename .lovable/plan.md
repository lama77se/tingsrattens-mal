
# Ta bort Sal/Parter, lagg till Lagrum och Flera sakfragor

## Oversikt
- Ta bort kolumnerna "Sal" och "Parter" fran tabellen (behall i parsern, dold i UI)
- Lagg till nytt falt "Primart tillamligt lagrum" (tomt for nu, mappningar kommer senare)
- Lagg till nytt falt "Flera sakfragor forekommer" (checkbox, sant om saken innehaller "mm", "m.m." eller "m m")
- Lagg till filter for lagrum och checkbox-filter for flera sakfragor

## Andringar

### 1. `src/lib/parseCourtPdf.ts`
- Utoka `Hearing`-interfacet med tva nya falt:
  - `lagrum: string` (tomt for nu, satt till `""`)
  - `fleraSakfragor: boolean` (sant om saken matchar `/\bm\.?\s*m\.?\b/i` dvs "mm", "m.m.", "m m")
- Berakna `fleraSakfragor` vid parsning baserat pa `saken`-faltet
- Behall `room` och `parties` i interfacet (ignoreras bara i UI)

### 2. `src/components/HearingsTab.tsx`
- **Ta bort kolumner**: Ta bort "Sal" och "Parter" fran tabellhuvud och tabellrader (6 kolumner kvar + 2 nya = 8 kolumner)
- **Lagg till kolumner**: "Primart tillamplit lagrum" och "Flera sakfragor" i tabellen
- "Flera sakfragor" visas som en kryssruta (read-only Checkbox-komponent)
- **Nytt filter**: Dropdown for lagrum (tom for nu, bara "Alla" tills mappningar finns)
- **Nytt filter**: Checkbox-filter "Visa bara med flera sakfragor" som filtrerar pa `fleraSakfragor === true`
- Uppdatera `filtered`-logiken med de nya filtren
- Uppdatera grid fran `lg:grid-cols-4` till `lg:grid-cols-5` for att fa plats med det nya filtret

## Tekniska detaljer

**`Hearing`-interface (parseCourtPdf.ts):**
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
  fleraSakfragor: boolean;
}
```

**Flera sakfragor-detektion (parseCourtPdf.ts):**
```typescript
const fleraSakfragorRegex = /\bm\s*\.?\s*m\s*\.?\b/i;
const fleraSakfragor = fleraSakfragorRegex.test(saken);
```

**Nytt filter i HearingsTab.tsx:**
```typescript
const [fleraSakfragorFilter, setFleraSakfragorFilter] = useState(false);
// I filtered:
const matchesFleraSakfragor = !fleraSakfragorFilter || h.fleraSakfragor;
```

**Tabell-kolumner (HearingsTab.tsx):**
- Datum, Tid, Tingsratt, Malnummer, Typ, Saken, Lagrum, Flera sakfragor
- Sal och Parter tas bort fran renderingen

Inga andringar i andra filer.
