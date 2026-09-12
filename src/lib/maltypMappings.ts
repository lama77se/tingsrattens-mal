/**
 * Mappning mellan målnummerprefix och måltyp för svenska tingsrätter.
 */

const tingsrattPrefixes: Record<string, string> = {
  FT: "Förenklat tvistemål (småmål)",
  B: "Brottmål",
  T: "Tvistemål",
  K: "Konkursmål",
  // Ä = Ärende (general non-contested court matters: god man, förvaltarskap,
  // boutredning, entledigande av styrelseledamot, etc.). NOT Äktenskapsmål —
  // divorce is filed under F (Familjemål).
  Ä: "Ärende",
  F: "Familjemål",
  Ö: "Övriga ärenden",
  // Patent- och marknadsdomstolen (PMD, vid Stockholms tingsrätt) — särskild
  // domstol för patent-, varumärkes-, mönster-, upphovsrätts-, konkurrens- och
  // marknadsföringsrättsliga mål. Målnummerprefixen kombinerar "PM" med den
  // vanliga måltypsbeteckningen; lagrumMatch.ts routar redan dessa till sin
  // "mor"-måltyp (PMT → T, PMFT → FT, PMÄ → Ä, PMB → B) för lagrumsökning.
  PMT: "Patent- och marknadsdomstolens tvistemål",
  PMFT: "Patent- och marknadsdomstolens förenklade tvistemål",
  PMÄ: "Patent- och marknadsdomstolens ärenden",
  PMB: "Patent- och marknadsdomstolens brottmål",
};

// Sort keys longest-first so "FT" is tested before "F"
const sortedPrefixes = Object.keys(tingsrattPrefixes).sort(
  (a, b) => b.length - a.length
);

/**
 * Extract måltyp from a case number string, e.g. "B 1234-25" → "Brottmål".
 * Returns empty string if no match.
 */
export function getMaltyp(caseNumber: string): string {
  const trimmed = caseNumber.trim().toUpperCase();
  for (const prefix of sortedPrefixes) {
    if (trimmed.startsWith(prefix.toUpperCase())) {
      return tingsrattPrefixes[prefix];
    }
  }
  return "";
}
