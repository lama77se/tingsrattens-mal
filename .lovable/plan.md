
# Lagg till 17 nya brottstyper i lagrumMappings

## Oversikt
Lagg till 17 nya poster i `src/lib/lagrumMappings.ts`. Inga duplikater finns mot befintliga 28 poster.

## Nya poster

| Nyckel | Sakomrade |
|--------|-----------|
| hot mot tjänsteman | Brott mot allman verksamhet |
| angrepp mot tjänsteman | Brott mot allman verksamhet |
| grov fridskrankning | Brott mot frihet och frid |
| olaga forfoljelse | Brott mot frihet och frid |
| forvandling av boter | Straffverkstallighet |
| undanrojande av strafforelaggande | Straffprocessuella fragor |
| bidragsbrott | Ekonomisk brottslighet |
| brukande av falsk urkund | Urkundsbrott |
| urkundsforfalkning | Urkundsbrott |
| brott mot lagen om forbud betraffande knivar och andra farliga foremal | Vapen- och ordningsbrott |
| brott mot lagen om forbud betraffande knivar och andra farliga foremal, grovt brott | Vapen- och ordningsbrott |
| brott mot lagen om brandfarliga och explosiva varor | Allmanfarliga brott / sarskild straffrätt |
| europeisk utredningsorder | Internationellt straffprocessuellt samarbete |
| bilbaltesforselse | Trafikbrott |
| grov vardslöshet i trafik | Trafikbrott |
| olaga yrkesmassig trafik | Trafik- och naringsregleringsbrott |
| hastighetsoverträdelse | Trafikbrott |

## Tekniska detaljer

**Fil som andras:** `src/lib/lagrumMappings.ts`

De 17 posterna laggs till i `mappings`-objektet fore den avslutande `};` (rad 131). Ingen annan fil behover andras -- matchningslogiken och UI:t fungerar redan generiskt.

Langre nycklar som "brott mot lagen om forbud betraffande knivar och andra farliga foremal, grovt brott" hamnar automatiskt fore kortare varianter tack vare `sortedKeys`-sorteringen.
