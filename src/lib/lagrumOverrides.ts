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
};

/**
 * Ärenden (Ä) — probate, trustee appointments, etc.
 */
export const arendenLagrumOverrides: Record<string, LagrumEntry> = {
  "förordnande av god man": {
    sakomrade: "Förmynderskapsrätt",
    primart_lagrum: ["Föräldrabalken 11 kap."],
  },
  "förordnande av förvaltare": {
    sakomrade: "Förmynderskapsrätt",
    primart_lagrum: ["Föräldrabalken 11 kap. 7 §"],
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
