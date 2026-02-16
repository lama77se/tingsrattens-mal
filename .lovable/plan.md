
# Fix: Bevara alla tingsratters data vid enskild hamtning

## Problem
Nar man hamtar data for en tingsratt (t.ex. Alingsas) efter att redan ha hamtat en annan (t.ex. Solna) forsvinner den forsta tingsrattens data fran tabellen. Bugg finns i `handleFetchCourt` i `DataLoadingTab.tsx`.

## Orsak
1. `onHearingsFetched` anropas inuti en `setCourtWeeks` state-updater (rad 190) -- en sidoeffekt i en state-updater, vilket ar opaalitligt i React
2. Merge-logiken re-parsar text fran state for andra tingsratter, men React-batchning kan gora att state inte ar uppdaterat an

## Losning
Infor en separat `useRef` som lagrar parsade hearings per tingsratt. Nar en tingsratt hamtas uppdateras refen for just den tingsratten, sedan slas alla ihop och skickas via `onHearingsFetched` -- utanfor state-updaters.

### Andring i `src/components/DataLoadingTab.tsx`

1. **Lagg till en ref for hearings per tingsratt:**
```typescript
const hearingsRef = useRef<Record<string, Hearing[]>>({});
```

2. **Uppdatera `handleFetchCourt`** (rad 166-199):
   - Spara den hamtade tingsrattens hearings i `hearingsRef.current[court.id]`
   - Sla ihop alla hearings fran refen: `Object.values(hearingsRef.current).flat()`
   - Anropa `onHearingsFetched(allHearings)` direkt -- inte inuti en state-updater
   - Ta bort hela `setCourtWeeks`-blocket (rad 171-192) som anvandes for merge

3. **Uppdatera `handleFetchAll`** (rad 201-220):
   - Rensa `hearingsRef.current = {}` forst
   - Spara varje tingsratts hearings i refen under loopen
   - Anropa `onHearingsFetched` med alla samlade hearings i slutet

4. **Uppdatera `fetchCourt`** (rad 148-164):
   - Behall som den ar, den returnerar hearings korrekt redan

### Resulterande kod i `handleFetchCourt`:
```typescript
const handleFetchCourt = async (court: CourtConfig) => {
  setFetchingCourts((prev) => new Set(prev).add(court.id));
  const courtHearings = await fetchCourt(court);

  // Store in ref and merge all courts
  hearingsRef.current[court.id] = courtHearings;
  const allHearings = Object.values(hearingsRef.current).flat();
  onHearingsFetched(allHearings);

  setFetchingCourts((prev) => {
    const next = new Set(prev);
    next.delete(court.id);
    return next;
  });
};
```

### Resulterande kod i `handleFetchAll`:
```typescript
const handleFetchAll = async () => {
  setIsFetchingAll(true);
  setCourtWeeks(initAllCourts());
  hearingsRef.current = {};
  await delay(50);

  for (const court of COURTS) {
    setFetchingCourts((prev) => new Set(prev).add(court.id));
    const hearings = await fetchCourt(court);
    hearingsRef.current[court.id] = hearings;
    setFetchingCourts((prev) => {
      const next = new Set(prev);
      next.delete(court.id);
      return next;
    });
  }

  const allHearings = Object.values(hearingsRef.current).flat();
  onHearingsFetched(allHearings);
  setIsFetchingAll(false);
};
```

## Fil som andras
- `src/components/DataLoadingTab.tsx` -- lagg till `useRef`, forenkla merge-logiken
