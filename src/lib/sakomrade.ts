/**
 * Canonical list of subject areas ("sakområden") used by the lagrum matcher.
 *
 * All entries in lagrumMappings.ts (auto-generated) and lagrumOverrides.ts
 * (hand-maintained) must set `sakomrade` to one of these exact strings — the
 * `Sakomrade` union type below enforces this at compile time.
 *
 * Adding a new sakomrade:
 *   1. Add the exact string literal to the array below.
 *   2. If the generator should emit the new value, update the relevant
 *      BRB_CHAPTER_SAKOMRADE / SPECIAL_LAW_MAP / classifyCode branch in
 *      scripts/generate-lagrum.cjs so regeneration stays consistent.
 */
export const SAKOMRADEN = [
  // Brottsbalken
  "Brott mot liv och hälsa",
  "Brott mot frihet och frid",
  "Ärekränkningsbrott",
  "Sexualbrott",
  "Brott mot familj",
  "Förmögenhetsbrott",
  "Brott mot borgenärer / ekonomisk brottslighet",
  "Skadegörelsebrott",
  "Allmänfarliga brott",
  "Förfalskningsbrott",
  "Brott mot rättskipningen",
  "Brott mot allmän ordning",
  "Brott mot allmän verksamhet",
  "Högmålsbrott",
  "Brott mot Sveriges säkerhet",
  "Tjänstebrott",
  "Landsförräderi",
  // Special criminal laws
  "Narkotikabrott",
  "Trafikbrott",
  "Skattebrott",
  "Miljöbrott",
  "Sjöfartsbrott",
  "Tull- och smugglingsbrott",
  "Vapenbrott",
  "Alkohol- och punktskattebrott",
  "Bidragsbrott",
  "Terroristbrott",
  "Immaterialrättsbrott",
  "Brott mot utlänningslagen",
  "Ekonomisk brottslighet",
  // Fallback buckets from generator
  "Övrig speciallagstiftning",
  "Övriga brott",
  "Händelser (ej brott)",
  // Civil law (tvistemål / förenklat tvistemål)
  "Skadeståndsrätt",
  "Fordringsrätt",
  "Konsumenträtt",
  "Fastighetsrätt",
  "Köprätt",
  "Avtalsrätt",
  "Sakrätt",
  "Arbetsrätt",
  "Hyresrätt",
  "Arrenderätt",
  "Immaterialrätt",
  "Konkurrensrätt",
  // Family / ärenden / konkurs
  "Familjerätt",
  "Arvsrätt",
  "Förmynderskapsrätt",
  "Konkursrätt",
] as const;

export type Sakomrade = (typeof SAKOMRADEN)[number];

const SAKOMRADE_SET: ReadonlySet<string> = new Set(SAKOMRADEN);

/** Runtime check — use in tests/linting to catch drift in auto-generated data. */
export function isKnownSakomrade(value: string): value is Sakomrade {
  return SAKOMRADE_SET.has(value);
}
