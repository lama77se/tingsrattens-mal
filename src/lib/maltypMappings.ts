/**
 * Mappning mellan målnummerprefix och måltyp för svenska tingsrätter.
 */

const tingsrattPrefixes: Record<string, string> = {
  FT: "Förenklat tvistemål (småmål)",
  B: "Brottmål",
  T: "Tvistemål",
  K: "Konkursmål",
  Ä: "Äktenskapsmål",
  F: "Familjemål",
  Ö: "Övriga ärenden",
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
