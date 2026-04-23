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
