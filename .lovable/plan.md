

# Lagg till Blekinge tingsratt

## URL-format
`https://www.domstol.se/globalassets/filer/domstol/blekinge_tingsratt/block/veckans-forhandlingar-YYYY/veckans-forhandlingar-vecka-X.pdf`

Notera att Blekinge har en unik mappstruktur med aret i katalognamnet (`veckans-forhandlingar-2026/`) och veckonumret i filnamnet (`vecka-8`).

## Teknisk andring

### `src/lib/courtConfig.ts`

Lagg till ny entry i COURTS-arrayen (efter Attunda, fore Solna -- bokstavsordning: Alingsas, Attunda, **Blekinge**, Solna):

```typescript
{
  id: "blekinge_tingsratt",
  name: "Blekinge tingsrätt",
  buildUrl: (week, year) =>
    `${BASE}/blekinge_tingsratt/block/veckans-forhandlingar-${year}/veckans-forhandlingar-vecka-${week}.pdf`,
},
```

### Fil som andras
- `src/lib/courtConfig.ts` -- lagg till Blekinge tingsratt pa ratt plats i den sorterade listan

