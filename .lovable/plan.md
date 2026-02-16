
# Visa hämtade förhandlingar i presentationsfliken

## Sammanfattning
Koppla ihop flikarna sa att PDF-data som hamtas i "Laddning av data" visas som strukturerade forhandlingar i fliken "Tingsrattsforhandlingar". Detta kraver att:
1. Delat tillstand lyfts upp till Index.tsx
2. PDF-texten parsas till strukturerade rader
3. HearingsTab visar riktig data istallet for mock-data

## Andringar

### 1. Skapa PDF-parser (`src/lib/parseSolnaPdf.ts`)
En funktion som tar ratt PDF-text och extraherar forhandlingsrader. Solna tingsratts PDF-format foljer typiskt ett monster med datum, klockslag, sal, malnummer, typ och parter. Parsern anvander regex for att hitta dessa monster och returnerar en array av strukturerade objekt:

```typescript
interface Hearing {
  date: string;
  time: string;
  court: string;
  caseNumber: string;
  type: string;
  room: string;
  parties: string;
}
```

Parsern behover anpassas efter det faktiska formatet i PDF-texten. Initialt gor vi en best-effort-parsning baserat pa vanliga monster (tider som `09:00`, malnummer som `T 1234-25`, salsnummer).

### 2. Lyft tillstand till Index.tsx
- Skapa ett delat state `fetchedHearings: Hearing[]` i Index.tsx
- Skicka en callback `onHearingsFetched` till DataLoadingTab
- Skicka `hearings`-arrayen till HearingsTab

### 3. Uppdatera DataLoadingTab
- Ta emot `onHearingsFetched` som prop
- Nar data hamtats fardigt, parsa PDF-texten med parsern och anropa callbacken med resultatet
- Samla ihop forhandlingar fran alla tre veckor (foregaende, nuvarande, nasta)

### 4. Uppdatera HearingsTab
- Ta emot `hearings: Hearing[]` som prop istallet for att anvanda MOCK_HEARINGS
- Visa ett meddelande "Hamta data forst" om arrayen ar tom
- Behall alla befintliga filter (sok, tingsratt, typ) - dessa filtrerar nu pa riktig data
- Uppdatera tingsrattsfiltret dynamiskt baserat pa faktiska domstolar i datan
- Uppdatera typfiltret dynamiskt baserat pa faktiska forhandlingstyper

### 5. Uppdatera Index.tsx
- Hantera delat tillstand
- Koppla ihop komponenterna med props

## Tekniska detaljer
- PDF-parsningen sker pa klientsidan (texten ar redan extraherad i edge function)
- Parsern exporteras som en separat modul for testbarhet
- Om parsningen misslyckas for vissa rader visas de som "ostrukturerade" rader
- Filtren i HearingsTab uppdateras dynamiskt baserat pa faktisk data istallet for hardkodade listor
