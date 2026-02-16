

# Lagg till 9 nya brottstyper i lagrumMappings

## Oversikt
Lagg till 9 nya poster i mappningen i `src/lib/lagrumMappings.ts`. Inga duplikater finns -- alla nya nycklar ar unika jamfort med de 19 befintliga.

## Nya poster att lagga till

| Nyckel | Sakomrade |
|--------|-----------|
| grovt sabotage mot blaljusverksamhet | Allmanfarliga brott |
| folkrattsbrott, grovt brott | Brott mot internationell ratt (folkratt) |
| grovt bokforingsbrott | Brott mot borgenarer / ekonomisk brottslighet |
| bokforingsbrott | Brott mot borgenarer / ekonomisk brottslighet |
| manniskorov | Brott mot frihet och frid |
| tillgrepp av fortskaffningsmedel | Formogenhetsbrott |
| olovligt forande av vattenskoter | Trafikbrott |
| djurplageri | Brott mot allman ordning (brott mot djur) |
| grovt olovligt forfogande | Formogenhetsbrott |

## Andring

### `src/lib/lagrumMappings.ts`
Lagg till de 9 posterna i `mappings`-objektet. Viktigt: "grovt bokforingsbrott" och "grovt olovligt forfogande" maste ligga fore sina kortare varianter ("bokforingsbrott" resp. eventuellt framtida "olovligt forfogande") -- detta hanteras redan automatiskt av `sortedKeys` som sorterar langst-forst.

Inga andra filer behover andras. Matchningslogiken och UI:t fungerar redan generiskt.

