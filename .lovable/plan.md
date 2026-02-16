

# Fix: Filter fungerar inte (duplikat-nycklar)

## Problem
Filtren (datum, sakområde, typ, tingsrätt) verkar inte fungera -- listan uppdateras inte visuellt när man väljer ett filtervärde.

## Grundorsak
Funktionen `parseCourtPdf` anropas tre gånger (en per vecka) och varje anrop börjar sin `idCounter` på 0. Det innebär att flera förhandlingar får samma ID (t.ex. `parsed-1` förekommer tre gånger). React använder `key={h.id}` för att hålla reda på rader i tabellen, och med duplicerade nycklar kan React inte korrekt uppdatera vilka rader som ska visas/döljas vid filtrering.

Konsolloggarna bekräftar: *"Encountered two children with the same key: parsed-49"*.

## Lösning

### Ändring i `src/components/DataLoadingTab.tsx`
Ge varje förhandling ett globalt unikt ID genom att lägga till ett prefix baserat på veckoindex när resultaten samlas ihop:

```typescript
if (r1?.success && r1.text) {
  const parsed = parseCourtPdf(r1.text, "Solna tingsrätt");
  parsed.forEach((h, i) => { h.id = `w0-${i}`; });
  allHearings.push(...parsed);
}
// Samma för r2 (w1-) och r3 (w2-)
```

Alternativt kan man generera ett unikt ID direkt i `parseCourtPdf` med `crypto.randomUUID()` eller en kombination av datum+tid+målnummer, men den enklaste fixen är att prefixa med veckoindex i DataLoadingTab.

### Ingen ändring behövs i HearingsTab
Filtreringslogiken är redan korrekt. Problemet är enbart att React inte kan spåra raderna p.g.a. duplicerade nycklar.

## Tekniska detaljer

**Fil som ändras:** `src/components/DataLoadingTab.tsx` (rad 147-163)

Ersätt den nuvarande insamlingen av hearings med version som ger unika ID:n per vecka. Tre block ändras:

```typescript
const allHearings: Hearing[] = [];

const r1 = await fetchWeek(0, previous.week, previous.year);
if (r1?.success && r1.text) {
  const parsed = parseCourtPdf(r1.text, "Solna tingsrätt");
  parsed.forEach((h, i) => { h.id = `w0-${i}`; });
  allHearings.push(...parsed);
}

const r2 = await fetchWeek(1, current.week, current.year);
if (r2?.success && r2.text) {
  const parsed = parseCourtPdf(r2.text, "Solna tingsrätt");
  parsed.forEach((h, i) => { h.id = `w1-${i}`; });
  allHearings.push(...parsed);
}

const r3 = await fetchWeek(2, next.week, next.year);
if (r3?.success && r3.text) {
  const parsed = parseCourtPdf(r3.text, "Solna tingsrätt");
  parsed.forEach((h, i) => { h.id = `w2-${i}`; });
  allHearings.push(...parsed);
}
```

