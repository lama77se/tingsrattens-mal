
# Lagg till foregaende vecka i datahämtningen

## Sammanfattning
Lagg till en `getPreviousWeek()`-funktion och uppdatera `DataLoadingTab` sa att den hamtar tre veckor: foregaende, nuvarande och nasta.

## Andringar

### 1. `src/lib/weekUtils.ts`
Lagg till en ny funktion `getPreviousWeek()` som anvander `addWeeks(new Date(), -1)` for att berakna foregaende veckas ISO-veckonummer och ar.

### 2. `src/components/DataLoadingTab.tsx`
- Importera `getPreviousWeek` fran weekUtils
- Lagg till foregaende vecka som forsta element i `weeks`-arrayen (index 0 = foregaende, 1 = nuvarande, 2 = nasta)
- Uppdatera badge-logiken: index 0 far badge "Foregaende", index 1 far "Nuvarande", index 2 far "Nasta"
- Uppdatera `handleFetchAll` sa den aterställer och hamtar alla tre veckor sekventiellt
- Uppdatera grid-layouten till `md:grid-cols-3` for att visa tre kort

## Tekniska detaljer
- Anvander samma `addWeeks`-funktion fran `date-fns` som redan anvands for nasta vecka
- Ingen andringar behovs i Edge Function eller API-klienten - samma anrop fungerar for vilken vecka som helst
