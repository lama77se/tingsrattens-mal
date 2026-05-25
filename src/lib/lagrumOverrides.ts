import type { LagrumEntry } from "./lagrumMappings";

/**
 * Hand-curated overrides and additions to the auto-generated lagrumMappings.
 *
 * Use for:
 * - Typo tolerance (court PDFs sometimes misspell or truncate crime names)
 * - Procedural terminology courts use that isn't in Brå's crime vocabulary
 * - Fixes for specific known-bad generated entries
 *
 * Consulted BEFORE the generated mappings, so these win ties with the same key.
 */
export const lagrumOverrides: Record<string, LagrumEntry> = {
  // --- Court PDF typos / truncations ---
  // The generated "hemfridsbrott" entry is sakomrade "Övriga brott" with no
  // lagrum; override the correctly-spelled form to the right classification.
  "hemfridsbrott": {
    sakomrade: "Brott mot frihet och frid",
    primart_lagrum: ["BrB 4 kap. 6 §"],
  },
  // "hemfridsbott" (missing 'r') appears in Gävle PDFs
  "hemfridsbott": {
    sakomrade: "Brott mot frihet och frid",
    primart_lagrum: ["BrB 4 kap. 6 §"],
  },
  "grovt hemfridsbott": {
    sakomrade: "Brott mot frihet och frid",
    primart_lagrum: ["BrB 4 kap. 6 §"],
  },

  // --- Procedural terminology (not in Brå's crime classification) ---
  // Verkställighetsärenden — brought under BrB 28 / 34 kap.
  "undanröjande av skyddstillsyn": {
    sakomrade: "Brott mot rättskipningen",
    primart_lagrum: ["BrB 28 kap. 9 §"],
  },
  "undanröjande av villkorlig dom": {
    sakomrade: "Brott mot rättskipningen",
    primart_lagrum: ["BrB 27 kap. 6 §"],
  },
  "förverkande av villkorligt medgiven frihet": {
    sakomrade: "Brott mot rättskipningen",
    primart_lagrum: ["BrB 34 kap. 5 §"],
  },
  "överträdelse av kontaktförbud": {
    sakomrade: "Brott mot frihet och frid",
    primart_lagrum: ["Kontaktförbudslagen (1988:688) 24 §"],
  },

  // --- Commonly used short labels not always in Brå's form ---
  "olaga intrång": {
    sakomrade: "Brott mot frihet och frid",
    primart_lagrum: ["BrB 4 kap. 6 §"],
  },
  "grovt olaga intrång": {
    sakomrade: "Brott mot frihet och frid",
    primart_lagrum: ["BrB 4 kap. 6 §"],
  },
  "häleri": {
    sakomrade: "Förmögenhetsbrott",
    primart_lagrum: ["BrB 9 kap. 6 §"],
  },
  "grovt häleri": {
    sakomrade: "Förmögenhetsbrott",
    primart_lagrum: ["BrB 9 kap. 6 §"],
  },
  "häleriförseelse": {
    sakomrade: "Förmögenhetsbrott",
    primart_lagrum: ["BrB 9 kap. 7 §"],
  },
  // Tillgrepp av fortskaffningsmedel — BrB 8 kap. 7 § (8 § for grovt). Generator
  // only has long compound keys (e.g. "tillgrepp av motordrivet
  // fortskaffningsmedel, bil") mapped to "BrB 8 kap." with no §; pin specifics.
  "tillgrepp av fortskaffningsmedel": {
    sakomrade: "Förmögenhetsbrott",
    primart_lagrum: ["BrB 8 kap. 7 §"],
  },
  "grovt tillgrepp av fortskaffningsmedel": {
    sakomrade: "Förmögenhetsbrott",
    primart_lagrum: ["BrB 8 kap. 8 §"],
  },
  "djurplågeri": {
    sakomrade: "Miljöbrott",
    primart_lagrum: ["BrB 16 kap. 13 §"],
  },
  "allmänfarlig vårdslöshet": {
    sakomrade: "Allmänfarliga brott",
    primart_lagrum: ["BrB 13 kap. 6 §"],
  },
  "olovlig körning": {
    sakomrade: "Trafikbrott",
    primart_lagrum: ["Trafikbrottslagen (1951:649) 3 §"],
  },
  "grov olovlig körning": {
    sakomrade: "Trafikbrott",
    primart_lagrum: ["Trafikbrottslagen (1951:649) 3 §"],
  },
  "ofredande": {
    sakomrade: "Brott mot frihet och frid",
    primart_lagrum: ["BrB 4 kap. 7 §"],
  },
  "penningtvättsbrott": {
    sakomrade: "Ekonomisk brottslighet",
    primart_lagrum: ["Lagen (2014:307) om straff för penningtvättsbrott 3 §"],
  },
  "grovt penningtvättsbrott": {
    sakomrade: "Ekonomisk brottslighet",
    primart_lagrum: ["Lagen (2014:307) om straff för penningtvättsbrott 5 §"],
  },
  // Short form commonly used in court listings
  "penningtvätt": {
    sakomrade: "Ekonomisk brottslighet",
    primart_lagrum: ["Lagen (2014:307) om straff för penningtvättsbrott 3 §"],
  },
  "brott mot vägtrafikskattelagen": {
    sakomrade: "Skattebrott",
    primart_lagrum: ["Vägtrafikskattelagen (2006:227)"],
  },
  "brott mot trafikförordningen": {
    sakomrade: "Trafikbrott",
    primart_lagrum: ["Trafikförordningen (1998:1276)"],
  },
  "hastighetsöverträdelse": {
    sakomrade: "Trafikbrott",
    primart_lagrum: ["Trafikförordningen (1998:1276) 3 kap. 17 §"],
  },
  // Smitning från trafikolycksplats — Trafikbrottslagen 5 §
  "smitning från trafikolycksplats": {
    sakomrade: "Trafikbrott",
    primart_lagrum: ["Trafikbrottslagen (1951:649) 5 §"],
  },
  "obehörigt avvikande från trafikolycksplats": {
    sakomrade: "Trafikbrott",
    primart_lagrum: ["Trafikbrottslagen (1951:649) 5 §"],
  },
  // Skyddslagen (2010:305) — images of protected objects
  "olovlig avbildning av skyddsobjekt": {
    sakomrade: "Brott mot Sveriges säkerhet",
    primart_lagrum: ["Skyddslagen (2010:305) 30 a §"],
  },
  "olovlig avbildning": {
    sakomrade: "Brott mot Sveriges säkerhet",
    primart_lagrum: ["Skyddslagen (2010:305) 30 a §"],
  },
  // Skyddslagen 30 § — unauthorised entry to protected sites
  "obehörigt tillträde till skyddsobjekt": {
    sakomrade: "Brott mot Sveriges säkerhet",
    primart_lagrum: ["Skyddslagen (2010:305) 30 §"],
  },
  // Brott mot livsmedelslagen — Livsmedelslagen (2006:804) 28-29 §
  "brott mot livsmedelslagen": {
    sakomrade: "Övrig speciallagstiftning",
    primart_lagrum: ["Livsmedelslagen (2006:804) 28 §"],
  },
  // Kvarstad i brottmål — säkringsåtgärd, RB 26 kap. 1 §
  "kvarstad": {
    sakomrade: "Brott mot allmän verksamhet",
    primart_lagrum: ["Rättegångsbalken 26 kap. 1 §"],
  },
  // Varumärkesintrång (criminal) — Varumärkeslagen 8 kap. 1 §
  "varumärkesintrång": {
    sakomrade: "Immaterialrättsbrott",
    primart_lagrum: ["Varumärkeslagen (2010:1877) 8 kap. 1 §"],
  },
  // Olovligt förande av vattenskoter — Vattenskoterförordningen (1993:1053) 6 §
  "olovligt förande av vattenskoter": {
    sakomrade: "Sjöfartsbrott",
    primart_lagrum: ["Vattenskoterförordningen (1993:1053) 6 §"],
  },
  // Brott mot hundlagen
  "brott mot lagen om tillsyn över hundar och katter": {
    sakomrade: "Övrig speciallagstiftning",
    primart_lagrum: ["Lag (2007:1150) om tillsyn över hundar och katter"],
  },
  "brott mot hundlagen": {
    sakomrade: "Övrig speciallagstiftning",
    primart_lagrum: ["Lag (2007:1150) om tillsyn över hundar och katter"],
  },
  // Kreditupplysningslagen (1973:1173) 19-21 § — straffbestämmelser
  "brott mot kreditupplysningslagen": {
    sakomrade: "Övrig speciallagstiftning",
    primart_lagrum: ["Kreditupplysningslagen (1973:1173) 19 §"],
  },
  // Totalförsvarsplikten (Blekinge)
  "brott mot totalförsvarsplikten": {
    sakomrade: "Brott mot allmän verksamhet",
    primart_lagrum: ["Lag (1994:1809) om totalförsvarsplikt 10 kap."],
  },
  "brott mot lagen om totalförsvarsplikt": {
    sakomrade: "Brott mot allmän verksamhet",
    primart_lagrum: ["Lag (1994:1809) om totalförsvarsplikt 10 kap."],
  },
  // Trafikförseelse (Halmstad) — generic traffic offense under Trafikförordningen
  "trafikförseelse": {
    sakomrade: "Trafikbrott",
    primart_lagrum: ["Trafikförordningen (1998:1276)"],
  },
  // Brott mot fordonsförordningen (Göteborg)
  "brott mot fordonsförordningen": {
    sakomrade: "Trafikbrott",
    primart_lagrum: ["Fordonsförordningen (2009:211)"],
  },
  // Vistelseförbud — Lag (2024:7) om preventiva vistelseförbud
  "vistelseförbud": {
    sakomrade: "Brott mot frihet och frid",
    primart_lagrum: ["Lag (2024:7) om preventiva vistelseförbud"],
  },
  // Tullbrott / grovt tullbrott — Smugglingslagen 8 § / 10 §
  "tullbrott": {
    sakomrade: "Tull- och smugglingsbrott",
    primart_lagrum: ["Smugglingslagen (2000:1225) 8 §"],
  },
  "grovt tullbrott": {
    sakomrade: "Tull- och smugglingsbrott",
    primart_lagrum: ["Smugglingslagen (2000:1225) 10 §"],
  },
  // Företagsbot — BrB 36 kap. 7 §
  "företagsbot": {
    sakomrade: "Ekonomisk brottslighet",
    primart_lagrum: ["BrB 36 kap. 7 §"],
  },
  // Olaga taxitrafik — Taxitrafiklagen 5 kap. 1 §
  "olaga taxitrafik": {
    sakomrade: "Trafikbrott",
    primart_lagrum: ["Taxitrafiklagen (2012:211) 5 kap. 1 §"],
  },
  // Förgripelse mot tjänsteman — BrB 17 kap. 2 §
  "förgripelse mot tjänsteman": {
    sakomrade: "Brott mot allmän verksamhet",
    primart_lagrum: ["BrB 17 kap. 2 §"],
  },
  "grov förgripelse mot tjänsteman": {
    sakomrade: "Brott mot allmän verksamhet",
    primart_lagrum: ["BrB 17 kap. 2 §"],
  },
  // Angrepp mot tjänsteman — BrB 17 kap. 1 a § (infördes SFS 2023:786)
  "angrepp mot tjänsteman": {
    sakomrade: "Brott mot allmän verksamhet",
    primart_lagrum: ["BrB 17 kap. 1 a §"],
  },
  "grovt angrepp mot tjänsteman": {
    sakomrade: "Brott mot allmän verksamhet",
    primart_lagrum: ["BrB 17 kap. 1 a § 2 st"],
  },
  // Muta — BrB 10 kap. 5a-5c § (mutbrottsreformen 2012). Generator has these
  // entries under BrB 17 kap. which is obsolete; override with correct refs.
  "givande av muta": {
    sakomrade: "Brott mot allmän verksamhet",
    primart_lagrum: ["BrB 10 kap. 5 b §"],
  },
  "grovt givande av muta": {
    sakomrade: "Brott mot allmän verksamhet",
    primart_lagrum: ["BrB 10 kap. 5 e §"],
  },
  "tagande av muta": {
    sakomrade: "Brott mot allmän verksamhet",
    primart_lagrum: ["BrB 10 kap. 5 a §"],
  },
  "grovt tagande av muta": {
    sakomrade: "Brott mot allmän verksamhet",
    primart_lagrum: ["BrB 10 kap. 5 e §"],
  },
  // Köp av sexuella tjänster (plural, Göteborg uses this form)
  "köp av sexuella tjänster": {
    sakomrade: "Sexualbrott",
    primart_lagrum: ["BrB 6 kap. 11 §"],
  },
  // Punktskattepliktiga varor — Lag (1998:506)
  "olovlig befattning med punktskattepliktiga varor": {
    sakomrade: "Tull- och smugglingsbrott",
    primart_lagrum: ["Lag (1998:506) om punktskattekontroll av transporter m.m."],
  },
  "grov olovlig befattning med punktskattepliktiga varor": {
    sakomrade: "Tull- och smugglingsbrott",
    primart_lagrum: ["Lag (1998:506) om punktskattekontroll av transporter m.m."],
  },
  // Europeisk utredningsorder — Lag (2017:1000)
  "europeisk utredningsorder": {
    sakomrade: "Brott mot allmän verksamhet",
    primart_lagrum: ["Lag (2017:1000) om en europeisk utredningsorder"],
  },
  // Överklagande av polisens beslag — Rättegångsbalken 27 kap.
  "överklagande av polisens beslag": {
    sakomrade: "Brott mot allmän verksamhet",
    primart_lagrum: ["Rättegångsbalken 27 kap. 6 §"],
  },
  // Enskilt åtal — privat åtal enligt RB 47 kap.
  "enskilt åtal": {
    sakomrade: "Brott mot allmän verksamhet",
    primart_lagrum: ["Rättegångsbalken 47 kap."],
  },
  // Talan om förverkande — BrB 36 kap.
  "talan om förverkande": {
    sakomrade: "Brott mot allmän verksamhet",
    primart_lagrum: ["BrB 36 kap."],
  },
  // Bevisupptagning åt utländsk domstol — Lag (1946:817). Bare "bevisupptagning"
  // stripped by cleanSaken's hearing-type loop, so primarily targeting the
  // longer compound form that survives the strip.
  "bevisupptagning åt utländsk domstol": {
    sakomrade: "Brott mot allmän verksamhet",
    primart_lagrum: ["Lag (1946:817) om bevisupptagning vid utländsk domstol"],
  },
  "bevisupptagning vid utländsk domstol": {
    sakomrade: "Brott mot allmän verksamhet",
    primart_lagrum: ["Lag (1946:817) om bevisupptagning vid utländsk domstol"],
  },
  // Förargelseväckande beteende — BrB 16 kap. 16 §
  "förargelseväckande beteende": {
    sakomrade: "Brott mot allmän ordning",
    primart_lagrum: ["BrB 16 kap. 16 §"],
  },
  // Olovlig hantering av lustgas — Lag (1999:42) om förbud mot vissa
  // hälsofarliga varor 4 § (lustgas tillkom genom Förordning 2023:535).
  "olovlig hantering av lustgas": {
    sakomrade: "Narkotikabrott",
    primart_lagrum: ["Lag (1999:42) om förbud mot vissa hälsofarliga varor 4 §"],
  },
  // Generisk fallback för "grovt brott" som ensamt saken — i praktiken
  // sällsynt; finns oftast inom en längre sträng som matchar mer specifik
  // nyckel. Övriga brott + tomt lagrum för att inte missleda.
  "grovt brott": {
    sakomrade: "Övriga brott",
    primart_lagrum: [],
  },
  // Verkställighet enligt 21 kap. föräldrabalken — tvångsverkställighet av
  // vårdnad-/boende-/umgängesdom
  "verkställighet enligt 21 kap. föräldrabalken": {
    sakomrade: "Familjerätt",
    primart_lagrum: ["Föräldrabalken 21 kap."],
  },
  // Skaraborg additions (B-routing)
  "överträdelse av tillträdesförbud": {
    sakomrade: "Brott mot frihet och frid",
    primart_lagrum: ["Lag (2021:34) om tillträdesförbud till butiker m.m. 22 §"],
  },
  "otillåten avfallstransport": {
    sakomrade: "Miljöbrott",
    primart_lagrum: ["Miljöbalken (1998:808) 29 kap. 4 a §"],
  },
  // Otillåten miljöverksamhet — Miljöbalken 29 kap. 4 § (generator routes the
  // long compound "miljöbalken, otillåten miljöverksamhet ..." keys to
  // "Händelser (ej brott)" which is wrong; this bare-form override wins.)
  "otillåten miljöverksamhet": {
    sakomrade: "Miljöbrott",
    primart_lagrum: ["Miljöbalken (1998:808) 29 kap. 4 §"],
  },
  "brott mot djurskyddslagen": {
    sakomrade: "Miljöbrott",
    primart_lagrum: ["Djurskyddslagen (2018:1192) 10 kap. 1 §"],
  },
  "bilbältesförseelse": {
    sakomrade: "Trafikbrott",
    primart_lagrum: ["Trafikförordningen (1998:1276) 4 kap. 10 §"],
  },
  // Parser typo: "våld mot mot tjänsteman" — duplicated preposition.
  "våld mot mot tjänsteman": {
    sakomrade: "Brott mot allmän verksamhet",
    primart_lagrum: ["BrB 17 kap. 1 §"],
  },
  // Attunda additions
  // Vapensmuggling — Smugglingslagen 6 a § (specific § for weapons smuggling)
  "vapensmuggling": {
    sakomrade: "Tull- och smugglingsbrott",
    primart_lagrum: ["Smugglingslagen (2000:1225) 6 a §"],
  },
  "grov vapensmuggling": {
    sakomrade: "Tull- och smugglingsbrott",
    primart_lagrum: ["Smugglingslagen (2000:1225) 6 a §"],
  },
  // Brott mot utlänningslagen — chapter 20
  "brott mot utlänningslagen": {
    sakomrade: "Brott mot utlänningslagen",
    primart_lagrum: ["Utlänningslagen (2005:716) 20 kap."],
  },
  // Lag om bevakningsföretag — 14 §
  "brott mot lagen om bevakningsföretag": {
    sakomrade: "Övrig speciallagstiftning",
    primart_lagrum: ["Lag (1974:191) om bevakningsföretag 14 §"],
  },
  // Vägtrafikregisterlagen — Lag (2001:558)
  "brott mot vägtrafikregisterlagen": {
    sakomrade: "Trafikbrott",
    primart_lagrum: ["Lag (2001:558) om vägtrafikregister"],
  },
  // Lag om brandfarliga och explosiva varor — 28-31 §
  "brott mot lagen om brandfarliga och explosiva varor": {
    sakomrade: "Vapenbrott",
    primart_lagrum: ["Lag (2010:1011) om brandfarliga och explosiva varor 28 §"],
  },
  "grovt brott mot lagen om brandfarliga och explosiva varor": {
    sakomrade: "Vapenbrott",
    primart_lagrum: ["Lag (2010:1011) om brandfarliga och explosiva varor 29 a §"],
  },
  // Bötesverkställighetslagen — 15 § förvandling av böter
  "förvandling av böter": {
    sakomrade: "Brott mot rättskipningen",
    primart_lagrum: ["Bötesverkställighetslagen (1979:189) 15 §"],
  },
  // Inbrottsstöld (+ typo variant "inbrottssäld" from Attunda parser)
  "inbrottsstöld": {
    sakomrade: "Förmögenhetsbrott",
    primart_lagrum: ["BrB 8 kap. 4 §"],
  },
  "inbrottssäld": {
    sakomrade: "Förmögenhetsbrott",
    primart_lagrum: ["BrB 8 kap. 4 §"],
  },
  // Prövning av beslut om kontaktförbud — Kontaktförbudslagen
  "prövning av beslut om kontaktförbud": {
    sakomrade: "Brott mot frihet och frid",
    primart_lagrum: ["Kontaktförbudslagen (1988:688)"],
  },
  "överprövning av kontaktförbud": {
    sakomrade: "Brott mot frihet och frid",
    primart_lagrum: ["Kontaktförbudslagen (1988:688) 14 §"],
  },
  // Kränkande fotografering — BrB 4 kap. 6 a §
  "kränkande fotografering": {
    sakomrade: "Brott mot frihet och frid",
    primart_lagrum: ["BrB 4 kap. 6 a §"],
  },
  // Osann försäkran — BrB 15 kap. 10 §
  "osann försäkran": {
    sakomrade: "Brott mot rättskipningen",
    primart_lagrum: ["BrB 15 kap. 10 §"],
  },
  "vårdslös försäkran": {
    sakomrade: "Brott mot rättskipningen",
    primart_lagrum: ["BrB 15 kap. 10 §"],
  },
  // Olovlig hantering av alkohol — Alkohollagen (2010:1622) 11 kap. 9 §
  "olovlig hantering av alkohol": {
    sakomrade: "Alkohol- och punktskattebrott",
    primart_lagrum: ["Alkohollagen (2010:1622) 11 kap. 9 §"],
  },
  "olovligt innehav av alkohol": {
    sakomrade: "Alkohol- och punktskattebrott",
    primart_lagrum: ["Alkohollagen (2010:1622) 11 kap. 6 §"],
  },
  // Vårdslöshet i trafik / grov vårdslöshet i trafik — Trafikbrottslagen 1 §
  "vårdslöshet i trafik": {
    sakomrade: "Trafikbrott",
    primart_lagrum: ["Trafikbrottslagen (1951:649) 1 §"],
  },
  // Felstavad variant (saknar 's') förekommer i vissa PDF:er
  "vårdlöshet i trafik": {
    sakomrade: "Trafikbrott",
    primart_lagrum: ["Trafikbrottslagen (1951:649) 1 §"],
  },
  "grov vårdslöshet i trafik": {
    sakomrade: "Trafikbrott",
    primart_lagrum: ["Trafikbrottslagen (1951:649) 1 § 2 st"],
  },
  // Brott mot ordningslagen — Ordningslagen (1993:1617)
  "brott mot ordningslagen": {
    sakomrade: "Brott mot allmän ordning",
    primart_lagrum: ["Ordningslagen (1993:1617)"],
  },
  // Maskeringsförbudet — Lag (2005:900) om förbud mot maskering i vissa fall 3 §
  "brott mot lagen om förbud mot maskering i vissa fall": {
    sakomrade: "Brott mot allmän ordning",
    primart_lagrum: ["Lag (2005:900) om förbud mot maskering i vissa fall 3 §"],
  },
  // Missbruk av larmanordning — BrB 16 kap. 15 § (generator har felstavad "larmordning")
  "missbruk av larmanordning": {
    sakomrade: "Brott mot allmän ordning",
    primart_lagrum: ["BrB 16 kap. 15 §"],
  },
  // Brott mot taxitrafikförordningen — Taxitrafikförordning (2012:238)
  "brott mot taxitrafikförordningen": {
    sakomrade: "Trafikbrott",
    primart_lagrum: ["Taxitrafikförordning (2012:238)"],
  },
  // Olaga integritetsintrång — BrB 4 kap. 6 c § (related but separate)
  "olaga integritetsintrång": {
    sakomrade: "Brott mot frihet och frid",
    primart_lagrum: ["BrB 4 kap. 6 c §"],
  },
  "grovt olaga integritetsintrång": {
    sakomrade: "Brott mot frihet och frid",
    primart_lagrum: ["BrB 4 kap. 6 d §"],
  },
  // Arbetsmiljöbrott — BrB 3:10 (brott mot liv och hälsa)
  "arbetsmiljöbrott": {
    sakomrade: "Brott mot liv och hälsa",
    primart_lagrum: ["BrB 3 kap. 10 §"],
  },
  "grovt arbetsmiljöbrott": {
    sakomrade: "Brott mot liv och hälsa",
    primart_lagrum: ["BrB 3 kap. 10 §"],
  },
  // Förtal — BrB 5:1 (ärekränkningsbrott); grovt förtal 5:2
  "förtal": {
    sakomrade: "Ärekränkningsbrott",
    primart_lagrum: ["BrB 5 kap. 1 §"],
  },
  "grovt förtal": {
    sakomrade: "Ärekränkningsbrott",
    primart_lagrum: ["BrB 5 kap. 2 §"],
  },
  "förolämpning": {
    sakomrade: "Ärekränkningsbrott",
    primart_lagrum: ["BrB 5 kap. 3 §"],
  },
  // Köp av sexuell handling/tjänst — BrB 6:11 (renamed from "tjänst" to "handling")
  "köp av sexuell tjänst": {
    sakomrade: "Sexualbrott",
    primart_lagrum: ["BrB 6 kap. 11 §"],
  },
  "köp av sexuell handling": {
    sakomrade: "Sexualbrott",
    primart_lagrum: ["BrB 6 kap. 11 §"],
  },
  // Brukande av falsk urkund — BrB 14:9
  "brukande av falsk urkund": {
    sakomrade: "Förfalskningsbrott",
    primart_lagrum: ["BrB 14 kap. 9 §"],
  },
  // Undanröjande av ungdomspåföljder — BrB 32:4
  "undanröjande av ungdomstjänst": {
    sakomrade: "Brott mot rättskipningen",
    primart_lagrum: ["BrB 32 kap. 4 §"],
  },
  "undanröjande av ungdomsvård": {
    sakomrade: "Brott mot rättskipningen",
    primart_lagrum: ["BrB 32 kap. 4 §"],
  },
  // Skattebrott — base 2 §, skatteförseelse 3 §, grovt 4 § (Solna PR covered
  // the two qualified forms; this adds the bare short form).
  "skattebrott": {
    sakomrade: "Skattebrott",
    primart_lagrum: ["Skattebrottslagen (1971:69) 2 §"],
  },
  "grovt skattebrott": {
    sakomrade: "Skattebrott",
    primart_lagrum: ["Skattebrottslagen (1971:69) 4 §"],
  },
  // BrB 16:3 ohörsamhet mot ordningsmakten
  "ohörsamhet mot ordningsmakten": {
    sakomrade: "Brott mot allmän ordning",
    primart_lagrum: ["BrB 16 kap. 3 §"],
  },
  // BrB 15:12 missbruk av urkund
  "missbruk av urkund": {
    sakomrade: "Brott mot rättskipningen",
    primart_lagrum: ["BrB 15 kap. 12 §"],
  },
  // BrB 22:6 folkrättsbrott
  "folkrättsbrott": {
    sakomrade: "Landsförräderi",
    primart_lagrum: ["BrB 22 kap. 6 §"],
  },
  "grovt folkrättsbrott": {
    sakomrade: "Landsförräderi",
    primart_lagrum: ["BrB 22 kap. 6 §"],
  },
  // Narkotikasmuggling — Smugglingslagen 6 §
  "narkotikasmuggling": {
    sakomrade: "Tull- och smugglingsbrott",
    primart_lagrum: ["Smugglingslagen (2000:1225) 6 §"],
  },
  // Näringspenningtvätt — Lagen (2014:307) 7 §
  "näringspenningtvätt": {
    sakomrade: "Ekonomisk brottslighet",
    primart_lagrum: ["Lagen (2014:307) om straff för penningtvättsbrott 7 §"],
  },
  "näringspenningtvättsbrott": {
    sakomrade: "Ekonomisk brottslighet",
    primart_lagrum: ["Lagen (2014:307) om straff för penningtvättsbrott 7 §"],
  },
  "grovt näringspenningtvättsbrott": {
    sakomrade: "Ekonomisk brottslighet",
    primart_lagrum: ["Lagen (2014:307) om straff för penningtvättsbrott 7 §"],
  },
  // Dopningslagen
  "dopningsbrott": {
    sakomrade: "Narkotikabrott",
    primart_lagrum: ["Lagen (1991:1969) om förbud mot vissa dopningsmedel 3 §"],
  },
  "ringa dopningsbrott": {
    sakomrade: "Narkotikabrott",
    primart_lagrum: ["Lagen (1991:1969) om förbud mot vissa dopningsmedel 3 § 2 st"],
  },
  "grovt dopningsbrott": {
    sakomrade: "Narkotikabrott",
    primart_lagrum: ["Lagen (1991:1969) om förbud mot vissa dopningsmedel 3 a §"],
  },
  // Alternative spelling "doping" (lacking the n) used by some courts.
  "dopingbrott (ringa brott)": {
    sakomrade: "Narkotikabrott",
    primart_lagrum: ["Lagen (1991:1969) om förbud mot vissa dopningsmedel 3 § 2 st"],
  },
  "dopingbrott": {
    sakomrade: "Narkotikabrott",
    primart_lagrum: ["Lagen (1991:1969) om förbud mot vissa dopningsmedel 3 §"],
  },
  // Överträdelse av näringsförbud — Lag (2014:836) 47 §
  "överträdelse av näringsförbud": {
    sakomrade: "Ekonomisk brottslighet",
    primart_lagrum: ["Lag (2014:836) om näringsförbud 47 §"],
  },
  // "brott mot vapenlagen" — Vapenlagen 9 kap. (longer form, matches the
  // already-present "vapenbrott" alias but keep explicit for clarity)
  "brott mot vapenlagen": {
    sakomrade: "Vapenbrott",
    primart_lagrum: ["Vapenlagen (1996:67) 9 kap."],
  },
  // Jaktbrott (proactive — Brå doesn't cover directly)
  "jaktbrott": {
    sakomrade: "Miljöbrott",
    primart_lagrum: ["Jaktlagen (1987:259) 43 §"],
  },
  "grovt jaktbrott": {
    sakomrade: "Miljöbrott",
    primart_lagrum: ["Jaktlagen (1987:259) 44 §"],
  },
  // Folkbokföringsbrott — Folkbokföringslagen 42 §
  "folkbokföringsbrott": {
    sakomrade: "Ekonomisk brottslighet",
    primart_lagrum: ["Folkbokföringslagen (1991:481) 42 §"],
  },
  "grovt folkbokföringsbrott": {
    sakomrade: "Ekonomisk brottslighet",
    primart_lagrum: ["Folkbokföringslagen (1991:481) 43 §"],
  },
  // Olovligt anskaffande av alkohol — Alkohollagen 11 kap. 7 §
  "olovligt anskaffande av alkohol": {
    sakomrade: "Alkohol- och punktskattebrott",
    primart_lagrum: ["Alkohollagen (2010:1622) 11 kap. 7 §"],
  },
  "olovligt anskaffande av alkoholdrycker": {
    sakomrade: "Alkohol- och punktskattebrott",
    primart_lagrum: ["Alkohollagen (2010:1622) 11 kap. 7 §"],
  },
  // Vite — civil procedural enforcement, filed as B case
  "talan om utdömande av vite": {
    sakomrade: "Brott mot allmän verksamhet",
    primart_lagrum: ["Lag (1985:206) om viten"],
  },
  "utdömande av vite": {
    sakomrade: "Brott mot allmän verksamhet",
    primart_lagrum: ["Lag (1985:206) om viten"],
  },
  // International judicial assistance (rättslig hjälp)
  "rättslig hjälp åt utländsk domstol": {
    sakomrade: "Brott mot allmän verksamhet",
    primart_lagrum: ["Lag (2000:562) om internationell rättslig hjälp i brottmål"],
  },
  "begäran om rättslig hjälp": {
    sakomrade: "Brott mot allmän verksamhet",
    primart_lagrum: ["Lag (2000:562) om internationell rättslig hjälp i brottmål"],
  },
  // Typo / compressed variants of näringspenningtvätts*
  "näringspenningsbrott": {
    sakomrade: "Ekonomisk brottslighet",
    primart_lagrum: ["Lagen (2014:307) om straff för penningtvättsbrott 7 §"],
  },
  // Base "smuggling" — generator only has compound variants like
  // "smuggling, olovlig in- och utförsel av ..." that don't substring-match.
  "smuggling": {
    sakomrade: "Tull- och smugglingsbrott",
    primart_lagrum: ["Smugglingslagen (2000:1225) 3 §"],
  },
  "grov smuggling": {
    sakomrade: "Tull- och smugglingsbrott",
    primart_lagrum: ["Smugglingslagen (2000:1225) 5 §"],
  },
  "förseelse mot jaktlagen": {
    sakomrade: "Miljöbrott",
    primart_lagrum: ["Jaktlagen (1987:259)"],
  },
  "brott mot knivlagen": {
    sakomrade: "Vapenbrott",
    primart_lagrum: ["Knivlagen (1988:254)"],
  },
  "brott mot lagen om förbud beträffande knivar och andra farliga föremål": {
    sakomrade: "Vapenbrott",
    primart_lagrum: ["Knivlagen (1988:254)"],
  },
  "brott mot lagen beträffande knivar och andra farliga föremål": {
    sakomrade: "Vapenbrott",
    primart_lagrum: ["Knivlagen (1988:254)"],
  },
  "brott mot knivförbudslagen": {
    sakomrade: "Vapenbrott",
    primart_lagrum: ["Knivlagen (1988:254)"],
  },
  "urkundsförfalskning": {
    sakomrade: "Förfalskningsbrott",
    primart_lagrum: ["BrB 14 kap. 1 §"],
  },
  "grov urkundsförfalskning": {
    sakomrade: "Förfalskningsbrott",
    primart_lagrum: ["BrB 14 kap. 3 §"],
  },
  "sexuellt ofredande": {
    sakomrade: "Sexualbrott",
    primart_lagrum: ["BrB 6 kap. 10 §"],
  },

  // --- Crimes where the generator emitted only a chapter reference ---
  // COMMON_ALIASES in the generator didn't overwrite the pass-2 chapter-only
  // entry, so pin the specific paragraph here.
  "vållande till annans död": {
    sakomrade: "Brott mot liv och hälsa",
    primart_lagrum: ["BrB 3 kap. 7 §"],
  },
  "olaga förföljelse": {
    sakomrade: "Brott mot frihet och frid",
    primart_lagrum: ["BrB 4 kap. 4 b §"],
  },
  "grov kvinnofridskränkning": {
    sakomrade: "Brott mot frihet och frid",
    primart_lagrum: ["BrB 4 kap. 4 a §"],
  },
  "grov fridskränkning": {
    sakomrade: "Brott mot frihet och frid",
    primart_lagrum: ["BrB 4 kap. 4 a §"],
  },
  "mordbrand": {
    sakomrade: "Allmänfarliga brott",
    primart_lagrum: ["BrB 13 kap. 1 §"],
  },
  "grov mordbrand": {
    sakomrade: "Allmänfarliga brott",
    primart_lagrum: ["BrB 13 kap. 2 §"],
  },
  "övergrepp i rättssak": {
    sakomrade: "Brott mot allmän verksamhet",
    primart_lagrum: ["BrB 17 kap. 10 §"],
  },

  // --- Reclassification of generator's "Övriga brott" dead bucket ---
  // Terroristbrottslagen (2022:666) — verified paragraphs against lagen.nu
  "terroristbrott": {
    sakomrade: "Terroristbrott",
    primart_lagrum: ["Terroristbrottslagen (2022:666) 4 §"],
  },
  "terroristbrott, förberedelse till terroristbrott": {
    sakomrade: "Terroristbrott",
    primart_lagrum: ["Terroristbrottslagen (2022:666) 11 §"],
  },
  "terroristbrott, försök till terroristbrott": {
    sakomrade: "Terroristbrott",
    primart_lagrum: ["Terroristbrottslagen (2022:666) 11 §"],
  },
  "terroristbrott, stämpling till terroristbrott": {
    sakomrade: "Terroristbrott",
    primart_lagrum: ["Terroristbrottslagen (2022:666) 11 §"],
  },
  "terroristbrott, underlåtenhet att avslöja terroristbrott": {
    sakomrade: "Terroristbrott",
    primart_lagrum: ["Terroristbrottslagen (2022:666) 11 §"],
  },
  "deltagande i en terroristorganisation": {
    sakomrade: "Terroristbrott",
    primart_lagrum: ["Terroristbrottslagen (2022:666) 4 a §"],
  },
  "samröre med en terroristorganisation": {
    sakomrade: "Terroristbrott",
    primart_lagrum: ["Terroristbrottslagen (2022:666) 5 §"],
  },
  "finansiering av en terroristorganisation, eller en person eller sammanslutning av personer som begår eller på annat sätt medverkar till terroristbrott eller särskilt allvarlig brottslighet": {
    sakomrade: "Terroristbrott",
    primart_lagrum: ["Terroristbrottslagen (2022:666) 6 §"],
  },
  "finansiering för att begå eller på annat sätt medverka till terroristbrott": {
    sakomrade: "Terroristbrott",
    primart_lagrum: ["Terroristbrottslagen (2022:666) 6 §"],
  },
  "finansiering för att begå eller på annat sätt medverka till annan särskilt allvarlig brottslighet": {
    sakomrade: "Terroristbrott",
    primart_lagrum: ["Terroristbrottslagen (2022:666) 6 §"],
  },
  "offentlig uppmaning till terrorism eller särskilt allvarlig brottslighet": {
    sakomrade: "Terroristbrott",
    primart_lagrum: ["Terroristbrottslagen (2022:666) 7 §"],
  },
  "rekrytering till terrorism eller särskilt allvarlig brottslighet": {
    sakomrade: "Terroristbrott",
    primart_lagrum: ["Terroristbrottslagen (2022:666) 8 §"],
  },
  "ge utbildning för terrorism eller särskilt allvarlig brottslighet": {
    sakomrade: "Terroristbrott",
    primart_lagrum: ["Terroristbrottslagen (2022:666) 9 §"],
  },
  "ta del av utbildning för terrorism eller särskilt allvarlig brottslighet": {
    sakomrade: "Terroristbrott",
    primart_lagrum: ["Terroristbrottslagen (2022:666) 9 §"],
  },
  "resa för terrorism eller särskilt allvarlig brottslighet": {
    sakomrade: "Terroristbrott",
    primart_lagrum: ["Terroristbrottslagen (2022:666) 10 §"],
  },

  // Skattebrott (specific paragraphs)
  "grovt skattebrott, avseende enbart mervärdesskattelagen, vid gränsöverskridande handel eller både handel inom landet och gränsöverskridande handel": {
    sakomrade: "Skattebrott",
    primart_lagrum: ["Skattebrottslagen (1971:69) 4 §"],
  },
  "grovt skattebrott, avseende enbart mervärdesskattelagen, vid handel endast inom landet": {
    sakomrade: "Skattebrott",
    primart_lagrum: ["Skattebrottslagen (1971:69) 4 §"],
  },
  "grovt skattebrott, avseende övrig skattelagstiftning": {
    sakomrade: "Skattebrott",
    primart_lagrum: ["Skattebrottslagen (1971:69) 4 §"],
  },
  "skattebrott, skatteförseelse, avseende enbart mervärdesskattelagen, vid gränsöverskridande handel eller både handel inom landet och gränsöverskridande handel": {
    sakomrade: "Skattebrott",
    primart_lagrum: ["Skattebrottslagen (1971:69) 3 §"],
  },
  "skattebrott, skatteförseelse, avseende enbart mervärdesskattelagen, vid handel endast inom landet": {
    sakomrade: "Skattebrott",
    primart_lagrum: ["Skattebrottslagen (1971:69) 3 §"],
  },
  "skattebrott, skatteförseelse, avseende övrig skattelagstiftning": {
    sakomrade: "Skattebrott",
    primart_lagrum: ["Skattebrottslagen (1971:69) 3 §"],
  },

  // Upphovsrätt
  "brott mot upphovsrätten ej genom fildelning": {
    sakomrade: "Immaterialrättsbrott",
    primart_lagrum: ["Upphovsrättslagen (1960:729) 53 §"],
  },
  "brott mot upphovsrätten genom fildelning": {
    sakomrade: "Immaterialrättsbrott",
    primart_lagrum: ["Upphovsrättslagen (1960:729) 53 §"],
  },

  // Ordningslagen
  "ordningslagen, brott mot allmänna sammankomster och offentliga tillställningar": {
    sakomrade: "Brott mot allmän ordning",
    primart_lagrum: ["Ordningslagen (1993:1617)"],
  },
  "ordningslagen, obehörigt beträdande av spelplanen eller motsvarande område avsett för idrottsutövning, vid idrottsarrangemang": {
    sakomrade: "Brott mot allmän ordning",
    primart_lagrum: ["Ordningslagen (1993:1617) 5 kap."],
  },
  "ordningslagen, olovligt innehav, användning av pyrotekniska varor vid idrottsarrangemang på idrottsanläggning": {
    sakomrade: "Brott mot allmän ordning",
    primart_lagrum: ["Ordningslagen (1993:1617) 5 kap."],
  },
  "ordningslagen, övriga brott vid idrottsarrangemang": {
    sakomrade: "Brott mot allmän ordning",
    primart_lagrum: ["Ordningslagen (1993:1617) 5 kap."],
  },

  // Family & frid
  "äktenskapstvång": {
    sakomrade: "Brott mot frihet och frid",
    primart_lagrum: ["BrB 4 kap. 4 c §"],
  },
  "barnäktenskapsbrott": {
    sakomrade: "Brott mot frihet och frid",
    primart_lagrum: ["BrB 4 kap. 4 c §"],
  },
  "brott mot lagen med förbud mot könsstympning av kvinnor": {
    sakomrade: "Brott mot liv och hälsa",
    primart_lagrum: ["Lagen (1982:316) med förbud mot könsstympning av kvinnor 2 §"],
  },
  "olovlig avlyssning m.m.": {
    sakomrade: "Brott mot frihet och frid",
    primart_lagrum: ["BrB 4 kap. 9 a §"],
  },

  // "utan misstanke om brott" belongs in the non-crime bucket, not Övriga brott
  "brand utan misstanke om brott": {
    sakomrade: "Händelser (ej brott)",
    primart_lagrum: [],
  },
  "försvunnen person i fjällen": {
    sakomrade: "Händelser (ej brott)",
    primart_lagrum: [],
  },
  "försvunnen person, ej i fjällen": {
    sakomrade: "Händelser (ej brott)",
    primart_lagrum: [],
  },
  "försvunnen person, barn utan vårdnadshavare": {
    sakomrade: "Händelser (ej brott)",
    primart_lagrum: [],
  },
  "personskada utan misstanke om brott till följd av polisverksamhet eller under vistelse i polisarrest": {
    sakomrade: "Händelser (ej brott)",
    primart_lagrum: [],
  },

  // Självständigt förverkande introduced via SFS 2024:783 amending BrB 36 kap.;
  // procedural law is Lagen (2024:782).
  "självständigt förverkande": {
    sakomrade: "Brott mot allmän verksamhet",
    primart_lagrum: ["BrB 36 kap."],
  },
};

/**
 * Tvistemål (T) and förenklat tvistemål (FT) vocabulary. Generated mappings
 * (from Brå) are criminal-only, so civil cases otherwise get no classification.
 */
export const civilLagrumOverrides: Record<string, LagrumEntry> = {
  "skadestånd": {
    sakomrade: "Skadeståndsrätt",
    primart_lagrum: ["Skadeståndslagen (1972:207)"],
  },
  "fordran": {
    sakomrade: "Fordringsrätt",
    primart_lagrum: ["Skuldebrevslagen (1936:81)"],
  },
  "betalningsföreläggande": {
    sakomrade: "Fordringsrätt",
    primart_lagrum: ["Lagen (1990:746) om betalningsföreläggande och handräckning"],
  },
  "konsumenttvist": {
    sakomrade: "Konsumenträtt",
    primart_lagrum: ["Konsumentköplagen (1990:932)"],
  },
  "köp av fast egendom": {
    sakomrade: "Fastighetsrätt",
    primart_lagrum: ["Jordabalken 4 kap."],
  },
  "köp av lös egendom": {
    sakomrade: "Köprätt",
    primart_lagrum: ["Köplagen (1990:931)"],
  },
  "hävning av avtal": {
    sakomrade: "Avtalsrätt",
    primart_lagrum: ["Avtalslagen (1915:218)"],
  },
  "klander av bodelning": {
    sakomrade: "Familjerätt",
    primart_lagrum: ["Äktenskapsbalken 17 kap."],
  },
  "klander av testamente": {
    sakomrade: "Arvsrätt",
    primart_lagrum: ["Ärvdabalken 14 kap."],
  },
  "äganderätt till lös egendom": {
    sakomrade: "Sakrätt",
    primart_lagrum: [],
  },
  // Försäljning enligt samäganderättslagen — Lag (1904:48 s.1) 6 §
  "försäljning enligt lagen om samäganderätt": {
    sakomrade: "Sakrätt",
    primart_lagrum: ["Samäganderättslagen (1904:48 s.1) 6 §"],
  },
  // Arbete på annans egendom — generiskt tjänsteavtal
  "arbete på annans egendom": {
    sakomrade: "Avtalsrätt",
    primart_lagrum: ["Avtalslagen (1915:218)"],
  },
  // Ogiltighet av fastighetsförvärv — Jordabalken 4 kap.
  "ogiltighet av fastighetsförvärv": {
    sakomrade: "Fastighetsrätt",
    primart_lagrum: ["Jordabalken 4 kap."],
  },
  "arbetsrättsligt mål": {
    sakomrade: "Arbetsrätt",
    primart_lagrum: ["Lagen om anställningsskydd (1982:80)"],
  },
  "uppsägning av anställning": {
    sakomrade: "Arbetsrätt",
    primart_lagrum: ["Lagen om anställningsskydd (1982:80) 7 §"],
  },
  "hyrestvist": {
    sakomrade: "Hyresrätt",
    primart_lagrum: ["Jordabalken 12 kap."],
  },
  // Förverkande av hyresrätt — JB 12 kap. 42 § (gör hyresgästen avhysningsbar)
  "förverkande av hyresrätt": {
    sakomrade: "Hyresrätt",
    primart_lagrum: ["Jordabalken 12 kap. 42 §"],
  },
  "avhysning": {
    sakomrade: "Hyresrätt",
    primart_lagrum: ["Jordabalken 12 kap."],
  },
  "hyresfordran": {
    sakomrade: "Hyresrätt",
    primart_lagrum: ["Jordabalken 12 kap."],
  },
  "fel i fastighet": {
    sakomrade: "Fastighetsrätt",
    primart_lagrum: ["Jordabalken 4 kap. 19 §"],
  },
  // "Återvinning" in a T/FT case is overwhelmingly a motion to reopen a
  // default judgment (tredskodom) — underlying matter is usually a debt.
  "återvinning": {
    sakomrade: "Fordringsrätt",
    primart_lagrum: ["Rättegångsbalken 44 kap. 9 §"],
  },
  "ansökan om återvinning": {
    sakomrade: "Fordringsrätt",
    primart_lagrum: ["Rättegångsbalken 44 kap. 9 §"],
  },
  "arbetstvist": {
    sakomrade: "Arbetsrätt",
    primart_lagrum: ["Lagen om anställningsskydd (1982:80)"],
  },
  "varselavgift": {
    sakomrade: "Arbetsrätt",
    primart_lagrum: ["Lag (1974:13) om vissa anställningsfrämjande åtgärder 17 §"],
  },
  "kontrollavgift vid olovlig parkering": {
    sakomrade: "Fordringsrätt",
    primart_lagrum: ["Lag (1984:318) om kontrollavgift vid olovlig parkering"],
  },
  "bättre rätt till aktier": {
    sakomrade: "Sakrätt",
    primart_lagrum: [],
  },
  "bättre rätt till hos länsstyrelsen deponerade medel": {
    sakomrade: "Sakrätt",
    primart_lagrum: ["Lag (1927:56) om nedsättning av pengar hos myndighet"],
  },
  // Kortare variant av samma sak
  "bättre rätt till deponerade medel": {
    sakomrade: "Sakrätt",
    primart_lagrum: ["Lag (1927:56) om nedsättning av pengar hos myndighet"],
  },
  // Personligt betalningsansvar för styrelseledamöter under ABL 25:18 —
  // aktiebolagsrättslig åtgärd; klassificerad som fordringsrätt här.
  "personligt betalningsansvar": {
    sakomrade: "Fordringsrätt",
    primart_lagrum: ["Aktiebolagslagen (2005:551) 25 kap. 18 §"],
  },
  "återgång av gåva": {
    sakomrade: "Arvsrätt",
    primart_lagrum: ["Ärvdabalken 7 kap. 4 §"],
  },
  "jämkning av gåva": {
    sakomrade: "Arvsrätt",
    primart_lagrum: ["Ärvdabalken 7 kap. 4 §"],
  },
  "jämkning av gåvor": {
    sakomrade: "Arvsrätt",
    primart_lagrum: ["Ärvdabalken 7 kap. 4 §"],
  },
  // Ogiltighet av testamentariskt förordnande — ÄB 13 kap. (klanderfristerna i 14 kap.)
  "ogiltighet av testamentesförordnande": {
    sakomrade: "Arvsrätt",
    primart_lagrum: ["Ärvdabalken 13 kap."],
  },
  "förstärkt laglottsskydd": {
    sakomrade: "Arvsrätt",
    primart_lagrum: ["Ärvdabalken 7 kap. 4 §"],
  },
  "arrendetvist": {
    sakomrade: "Arrenderätt",
    primart_lagrum: ["Jordabalken 7-11 kap."],
  },
  "upphovsrätt": {
    sakomrade: "Immaterialrätt",
    primart_lagrum: ["Upphovsrättslagen (1960:729)"],
  },
  "varumärke": {
    sakomrade: "Immaterialrätt",
    primart_lagrum: ["Varumärkeslagen (2010:1877)"],
  },
  "hävning av företagsnamn": {
    sakomrade: "Immaterialrätt",
    primart_lagrum: ["Lag (2018:1653) om företagsnamn"],
  },
  // Arbetsrättsliga saken som tvistemål
  "semesterersättning": {
    sakomrade: "Arbetsrätt",
    primart_lagrum: ["Semesterlagen (1977:480)"],
  },
  "allmänt skadestånd enligt semesterlagen": {
    sakomrade: "Arbetsrätt",
    primart_lagrum: ["Semesterlagen (1977:480) 32 §"],
  },
  "ogiltigförklaring av uppsägning": {
    sakomrade: "Arbetsrätt",
    primart_lagrum: ["Lagen om anställningsskydd (1982:80) 34 §"],
  },
  "ogiltigförklaring av avskedande": {
    sakomrade: "Arbetsrätt",
    primart_lagrum: ["Lagen om anställningsskydd (1982:80) 35 §"],
  },
  // Trunkerad/förkortad variant ("Ogiltigförklaring av avske") som sett i PDF-saken
  "ogiltigförklaring av avske": {
    sakomrade: "Arbetsrätt",
    primart_lagrum: ["Lagen om anställningsskydd (1982:80) 35 §"],
  },
  // Bare word "arbetsrätt" used as saken in FT cases
  "arbetsrätt": {
    sakomrade: "Arbetsrätt",
    primart_lagrum: ["Lagen om anställningsskydd (1982:80)"],
  },
  // Brott mot kollektivavtal — Medbestämmandelagen (1976:580) 54-55 §
  "brott mot kollektivavtal": {
    sakomrade: "Arbetsrätt",
    primart_lagrum: ["Medbestämmandelagen (1976:580) 54 §"],
  },
  // Kvarstad i tvistemål — säkringsåtgärd, RB 15 kap. 1 §
  "kvarstad": {
    sakomrade: "Fordringsrätt",
    primart_lagrum: ["Rättegångsbalken 15 kap. 1 §"],
  },
  // Varumärkesintrång (civil) — Varumärkeslagen
  "varumärkesintrång": {
    sakomrade: "Immaterialrätt",
    primart_lagrum: ["Varumärkeslagen (2010:1877)"],
  },
  // Överträdelse av diskrimineringslagen — Diskrimineringslagen 5 kap. (skadestånd)
  "överträdelse av diskrimineringslagen": {
    sakomrade: "Arbetsrätt",
    primart_lagrum: ["Diskrimineringslagen (2008:567) 5 kap."],
  },
  // Hyra / bostad
  "avflyttning": {
    sakomrade: "Hyresrätt",
    primart_lagrum: ["Jordabalken 12 kap."],
  },
  "fel i bostadsrätt": {
    sakomrade: "Fastighetsrätt",
    primart_lagrum: ["Bostadsrättslagen (1991:614)"],
  },
  "rätt till bankkonto": {
    sakomrade: "Fordringsrätt",
    primart_lagrum: [],
  },
  // Patent- och marknadsdomstolens civil subjects
  "konkurrensskadeavgift": {
    sakomrade: "Konkurrensrätt",
    primart_lagrum: ["Konkurrenslagen (2008:579) 3 kap. 5 §"],
  },
  // Kontraktsrätt — broad contract-law umbrella term used verbatim by Attunda
  "kontraktsrätt": {
    sakomrade: "Avtalsrätt",
    primart_lagrum: ["Avtalslagen (1915:218)"],
  },
  // Fastställelsetalan — RB 13 kap. 2 §
  "fastställelsetalan": {
    sakomrade: "Fordringsrätt",
    primart_lagrum: ["Rättegångsbalken 13 kap. 2 §"],
  },
  // Lönegaranti — statlig lönegaranti vid konkurs
  "lönegaranti": {
    sakomrade: "Arbetsrätt",
    primart_lagrum: ["Lönegarantilagen (1992:497)"],
  },
  "lönegarantimål": {
    sakomrade: "Arbetsrätt",
    primart_lagrum: ["Lönegarantilagen (1992:497)"],
  },
  // Lönefordran — generisk löneanspråk (LAS-baserat eller avtalsgrundad)
  "lönefordran": {
    sakomrade: "Arbetsrätt",
    primart_lagrum: ["Lagen om anställningsskydd (1982:80)"],
  },
  "utebliven lön": {
    sakomrade: "Arbetsrätt",
    primart_lagrum: ["Lagen om anställningsskydd (1982:80)"],
  },
  // Brott mot MBL — Medbestämmandelagen, samma kategori som kollektivavtal
  "brott mot mbl": {
    sakomrade: "Arbetsrätt",
    primart_lagrum: ["Medbestämmandelagen (1976:580) 54 §"],
  },
  // Diskriminering — Diskrimineringslagen (typically arbetsrättslig kontext)
  "diskriminering": {
    sakomrade: "Arbetsrätt",
    primart_lagrum: ["Diskrimineringslagen (2008:567)"],
  },
  // Hävning av köp / obefogad hävning — Köplagen
  "obefogad hävning": {
    sakomrade: "Avtalsrätt",
    primart_lagrum: ["Köplagen (1990:931) 25 §"],
  },
  "hävning": {
    sakomrade: "Avtalsrätt",
    primart_lagrum: ["Köplagen (1990:931) 25 §"],
  },
  // Försäkring
  "försäkringsfall": {
    sakomrade: "Avtalsrätt",
    primart_lagrum: ["Försäkringsavtalslagen (2005:104)"],
  },
  "försäkringsersättning": {
    sakomrade: "Avtalsrätt",
    primart_lagrum: ["Försäkringsavtalslagen (2005:104)"],
  },
  // Patientskada — Patientskadelagen
  "patientskadeersättning": {
    sakomrade: "Skadeståndsrätt",
    primart_lagrum: ["Patientskadelagen (1996:799)"],
  },
  "trafikförsäkring": {
    sakomrade: "Avtalsrätt",
    primart_lagrum: ["Trafikskadelagen (1975:1410)"],
  },
  "trafikförsäkringsavgift": {
    sakomrade: "Fordringsrätt",
    primart_lagrum: ["Trafikskadelagen (1975:1410) 34 §"],
  },
  // Klander av dispasch — Sjölagen 17-18 kap.
  "klander av dispasch": {
    sakomrade: "Sjöfartsbrott",
    primart_lagrum: ["Sjölagen (1994:1009) 17 kap."],
  },
  // Hyra (bare form) — Jordabalken 12 kap.
  "hyra": {
    sakomrade: "Hyresrätt",
    primart_lagrum: ["Jordabalken 12 kap."],
  },
  "hyres- och bostadsrättstvist": {
    sakomrade: "Hyresrätt",
    primart_lagrum: ["Jordabalken 12 kap."],
  },
  "hyres- och bostadssrättstvist": {
    sakomrade: "Hyresrätt",
    primart_lagrum: ["Jordabalken 12 kap."],
  },
  // Återkrav — generic civil claim for recovery of wrongly paid funds
  "återkrav": {
    sakomrade: "Fordringsrätt",
    primart_lagrum: [],
  },
  // Försträckning — loan agreement (civil law). Usually appears in T/FT.
  "försträckning": {
    sakomrade: "Fordringsrätt",
    primart_lagrum: ["Skuldebrevslagen (1936:81)"],
  },
  // Ansökan om konkurs can arrive as a T case too (some courts); route here
  // so civil routing picks it up. K-routing also covers it.
  "ansökan om konkurs": {
    sakomrade: "Konkursrätt",
    primart_lagrum: ["Konkurslagen (1987:672) 2 kap."],
  },
  // Skadestånd enligt aktiebolagslagen (Halmstad)
  "skadestånd enligt aktiebolagslagen": {
    sakomrade: "Skadeståndsrätt",
    primart_lagrum: ["Aktiebolagslagen (2005:551) 29 kap."],
  },
  // Klander av bolagsstämmobeslut — ABL 7 kap. 50 §
  "klander av bolagsstämmobeslut": {
    sakomrade: "Avtalsrätt",
    primart_lagrum: ["Aktiebolagslagen (2005:551) 7 kap. 50 §"],
  },
  "klander av beslut om nyemission": {
    sakomrade: "Avtalsrätt",
    primart_lagrum: ["Aktiebolagslagen (2005:551) 7 kap. 50 §"],
  },
  // Marknadsföringsrätt — Marknadsföringslagen (PMD-mål, broadly avtalsrätt)
  "marknadsföringsrätt": {
    sakomrade: "Avtalsrätt",
    primart_lagrum: ["Marknadsföringslagen (2008:486)"],
  },
  // Entledigande av styrelseledamot — ABL 8 kap. 14 §
  "entledigande av styrelseledamöter": {
    sakomrade: "Avtalsrätt",
    primart_lagrum: ["Aktiebolagslagen (2005:551) 8 kap. 14 §"],
  },
  // Generic civil topic labels used as saken
  "ersättningsrätt": {
    sakomrade: "Skadeståndsrätt",
    primart_lagrum: ["Skadeståndslagen (1972:207)"],
  },
  "fastighetsrätt": {
    sakomrade: "Fastighetsrätt",
    primart_lagrum: ["Jordabalken"],
  },
  // Family-procedural saken also show up on T case numbers in some courts.
  "verkställighet enligt 21 kap. föräldrabalken": {
    sakomrade: "Familjerätt",
    primart_lagrum: ["Föräldrabalken 21 kap."],
  },
  // Nyttjanderättsersättning — civil claim, no specific law; Skadeståndsrätt
  "nyttjanderättsersättning": {
    sakomrade: "Skadeståndsrätt",
    primart_lagrum: [],
  },
  // Jämkning av bodelningsavtal — ÄktB 12 kap.
  "jämkning av bodelningsavtal": {
    sakomrade: "Familjerätt",
    primart_lagrum: ["Äktenskapsbalken 12 kap."],
  },
  // Klander av arvskifte — ÄB 23 kap. 8 §
  "klander av arvskifte": {
    sakomrade: "Arvsrätt",
    primart_lagrum: ["Ärvdabalken 23 kap. 8 §"],
  },
  // Fel i upplåten bostadsrätt — Bostadsrättslagen 7 kap. 1 §
  "fel i upplåten bostadsrätt": {
    sakomrade: "Fastighetsrätt",
    primart_lagrum: ["Bostadsrättslagen (1991:614) 7 kap. 1 §"],
  },
  // Mål om parkering — municipal or private parking fee contest
  "mål om parkering": {
    sakomrade: "Fordringsrätt",
    primart_lagrum: ["Lag (1976:206) om felparkeringsavgift"],
  },
  // Handräckning (överlämnat från kronofogden) — BfL
  "handräckning": {
    sakomrade: "Fordringsrätt",
    primart_lagrum: ["Lag (1990:746) om betalningsföreläggande och handräckning"],
  },
};

/**
 * Familjemål (F) — divorce, custody, support, paternity.
 */
export const familyLagrumOverrides: Record<string, LagrumEntry> = {
  "äktenskapsskillnad": {
    sakomrade: "Familjerätt",
    primart_lagrum: ["Äktenskapsbalken 5 kap. 1 §"],
  },
  "vårdnad": {
    sakomrade: "Familjerätt",
    primart_lagrum: ["Föräldrabalken 6 kap."],
  },
  "vårdnad om barn": {
    sakomrade: "Familjerätt",
    primart_lagrum: ["Föräldrabalken 6 kap."],
  },
  "umgänge": {
    sakomrade: "Familjerätt",
    primart_lagrum: ["Föräldrabalken 6 kap. 15 §"],
  },
  "boende": {
    sakomrade: "Familjerätt",
    primart_lagrum: ["Föräldrabalken 6 kap. 14 a §"],
  },
  "underhåll": {
    sakomrade: "Familjerätt",
    primart_lagrum: ["Föräldrabalken 7 kap."],
  },
  "underhållsbidrag": {
    sakomrade: "Familjerätt",
    primart_lagrum: ["Föräldrabalken 7 kap."],
  },
  "faderskap": {
    sakomrade: "Familjerätt",
    primart_lagrum: ["Föräldrabalken 1 kap."],
  },
  "adoption": {
    sakomrade: "Familjerätt",
    primart_lagrum: ["Föräldrabalken 4 kap."],
  },
  "bodelning": {
    sakomrade: "Familjerätt",
    primart_lagrum: ["Äktenskapsbalken 9-11 kap."],
  },
  // Kvarboenderätt — interimistisk rätt att bo kvar i bostad, ÄktB 14 kap. 7 §
  "kvarboenderätt": {
    sakomrade: "Familjerätt",
    primart_lagrum: ["Äktenskapsbalken 14 kap. 7 §"],
  },
};

/**
 * Ärenden (Ä) — probate, trustee appointments, etc.
 */
export const arendenLagrumOverrides: Record<string, LagrumEntry> = {
  "förordnande av god man": {
    sakomrade: "Förmynderskapsrätt",
    primart_lagrum: ["Föräldrabalken 11 kap."],
  },
  "anordnande av godmanskap": {
    sakomrade: "Förmynderskapsrätt",
    primart_lagrum: ["Föräldrabalken 11 kap. 4 §"],
  },
  "upphörande av godmanskap": {
    sakomrade: "Förmynderskapsrätt",
    primart_lagrum: ["Föräldrabalken 11 kap. 19 §"],
  },
  "förordnande av förvaltare": {
    sakomrade: "Förmynderskapsrätt",
    primart_lagrum: ["Föräldrabalken 11 kap. 7 §"],
  },
  "anordnande av förvaltarskap": {
    sakomrade: "Förmynderskapsrätt",
    primart_lagrum: ["Föräldrabalken 11 kap. 7 §"],
  },
  "utökning av godmanskap till förvaltarskap": {
    sakomrade: "Förmynderskapsrätt",
    primart_lagrum: ["Föräldrabalken 11 kap. 7 §"],
  },
  // Municipal parking fines are contested in tingsrätt as ärenden
  "parkeringsanmärkning": {
    sakomrade: "Fordringsrätt",
    primart_lagrum: ["Lag (1976:206) om felparkeringsavgift"],
  },
  "dödsbodelägare": {
    sakomrade: "Arvsrätt",
    primart_lagrum: ["Ärvdabalken"],
  },
  "boutredningsman": {
    sakomrade: "Arvsrätt",
    primart_lagrum: ["Ärvdabalken 19 kap."],
  },
  "testamente": {
    sakomrade: "Arvsrätt",
    primart_lagrum: ["Ärvdabalken 10-11 kap."],
  },
  "skiftesman": {
    sakomrade: "Arvsrätt",
    primart_lagrum: ["Ärvdabalken 23 kap. 5 §"],
  },
  // Patent- och marknadsdomstolen: PMÄ routes via case-type "Ä"
  "konkurrensskadeavgift": {
    sakomrade: "Konkurrensrätt",
    primart_lagrum: ["Konkurrenslagen (2008:579) 3 kap. 5 §"],
  },
  // Vistelseförbud enforcement — Lag (2024:7). Ärende at tingsrätt.
  "vistelseförbud": {
    sakomrade: "Brott mot frihet och frid",
    primart_lagrum: ["Lag (2024:7) om preventiva vistelseförbud"],
  },
  // Verkställighet enligt 21 kap. FB — tvångsverkställighet av vårdnad/umgänge
  "verkställighet enligt 21 kap. föräldrabalken": {
    sakomrade: "Familjerätt",
    primart_lagrum: ["Föräldrabalken 21 kap."],
  },
  // Företagsrekonstruktion — filed as Ä by some courts
  "företagsrekonstruktion": {
    sakomrade: "Konkursrätt",
    primart_lagrum: ["Lag (2022:964) om företagsrekonstruktion"],
  },
  // Upphörande av förvaltarskap — FB 11:19 (when filed as Ä)
  "upphörande av förvaltarskap": {
    sakomrade: "Förmynderskapsrätt",
    primart_lagrum: ["Föräldrabalken 11 kap. 19 §"],
  },
  // Prövning av beslut om kontaktförbud — also lands as Ä
  "prövning av beslut om kontaktförbud": {
    sakomrade: "Brott mot frihet och frid",
    primart_lagrum: ["Kontaktförbudslagen (1988:688)"],
  },
  // Kvarstad som ärende — RB 15 kap. 1 § (civil säkringsåtgärd)
  "kvarstad": {
    sakomrade: "Fordringsrätt",
    primart_lagrum: ["Rättegångsbalken 15 kap. 1 §"],
  },
  // Försäljning enligt samäganderättslagen — vanligt som ärende (ansökan)
  "försäljning enligt lagen om samäganderätt": {
    sakomrade: "Sakrätt",
    primart_lagrum: ["Samäganderättslagen (1904:48 s.1) 6 §"],
  },
  // Entledigande av styrelseledamot — ABL 8 kap. 14 §, ofta filad som Ä
  "entledigande av styrelseledamöter": {
    sakomrade: "Avtalsrätt",
    primart_lagrum: ["Aktiebolagslagen (2005:551) 8 kap. 14 §"],
  },
};

/**
 * Konkursmål (K) — insolvency.
 */
export const konkursLagrumOverrides: Record<string, LagrumEntry> = {
  "konkurs": {
    sakomrade: "Konkursrätt",
    primart_lagrum: ["Konkurslagen (1987:672)"],
  },
  "konkursansökan": {
    sakomrade: "Konkursrätt",
    primart_lagrum: ["Konkurslagen (1987:672) 2 kap."],
  },
  "företagsrekonstruktion": {
    sakomrade: "Konkursrätt",
    primart_lagrum: ["Lag (2022:964) om företagsrekonstruktion"],
  },
};

/**
 * Fallback lagrum per sakomrade for generated entries that have an empty
 * primart_lagrum. Leaving generic fallback-buckets ("Övriga brott",
 * "Händelser (ej brott)") without a default on purpose — a misleading
 * reference is worse than none.
 */
export const sakomradeDefaultLagrum: Record<string, string> = {
  "Brott mot liv och hälsa": "BrB 3 kap.",
  "Brott mot frihet och frid": "BrB 4 kap.",
  "Ärekränkningsbrott": "BrB 5 kap.",
  "Sexualbrott": "BrB 6 kap.",
  "Brott mot familj": "BrB 7 kap.",
  "Förmögenhetsbrott": "BrB 8 kap.",
  "Brott mot borgenärer / ekonomisk brottslighet": "BrB 11 kap.",
  "Skadegörelsebrott": "BrB 12 kap.",
  "Allmänfarliga brott": "BrB 13 kap.",
  "Förfalskningsbrott": "BrB 14 kap.",
  "Brott mot rättskipningen": "BrB 15 kap.",
  "Brott mot allmän ordning": "BrB 16 kap.",
  "Brott mot allmän verksamhet": "BrB 17 kap.",
  "Högmålsbrott": "BrB 18 kap.",
  "Brott mot Sveriges säkerhet": "BrB 19 kap.",
  "Tjänstebrott": "BrB 20 kap.",
  "Landsförräderi": "BrB 22 kap.",
  "Narkotikabrott": "Narkotikastrafflagen (1968:64)",
  "Trafikbrott": "Trafikbrottslagen (1951:649)",
  "Skattebrott": "Skattebrottslagen (1971:69)",
  "Miljöbrott": "Miljöbalken (1998:808)",
  "Sjöfartsbrott": "Sjölagen (1994:1009)",
  "Tull- och smugglingsbrott": "Smugglingslagen (2000:1225)",
  "Vapenbrott": "Vapenlagen (1996:67)",
  "Alkohol- och punktskattebrott": "Alkohollagen (2010:1622)",
  "Bidragsbrott": "Bidragsbrottslagen (2007:612)",
  "Terroristbrott": "Terroristbrottslagen (2022:666)",
  "Immaterialrättsbrott": "Upphovsrättslagen (1960:729)",
  "Brott mot utlänningslagen": "Utlänningslagen (2005:716)",
};

/**
 * Keys from the auto-generated mappings that should be ignored at match time.
 *
 * These are either single-word qualifiers (e.g. "grov") that substring-match
 * any saken containing the word, or otherwise overly-generic keys that lead
 * to wrong classifications.
 */
export const blockedLagrumKeys: ReadonlySet<string> = new Set([
  "grov", // matched by literally any "grov*" / "grovt *" saken, producing wrong lagrum
]);
