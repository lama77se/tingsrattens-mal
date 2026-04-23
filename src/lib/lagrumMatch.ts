import { mappings as generatedMappings, type LagrumEntry } from "./lagrumMappings";
import { blockedLagrumKeys, lagrumOverrides } from "./lagrumOverrides";

/**
 * Word-character test that treats Swedish letters (Å/Ä/Ö, å/ä/ö) as word chars.
 * The built-in \w / \b does not — which breaks boundary checks around words
 * that start or end with those letters.
 */
const WORD_CHAR_RE = /[0-9A-Za-zÅÄÖåäö_]/;

function hasWordBoundaryOccurrence(haystack: string, needle: string): boolean {
  if (!needle) return false;
  let idx = 0;
  while ((idx = haystack.indexOf(needle, idx)) !== -1) {
    const before = idx === 0 ? "" : haystack[idx - 1];
    const after =
      idx + needle.length >= haystack.length ? "" : haystack[idx + needle.length];
    const beforeOk = !before || !WORD_CHAR_RE.test(before);
    const afterOk = !after || !WORD_CHAR_RE.test(after);
    if (beforeOk && afterOk) return true;
    idx += 1;
  }
  return false;
}

function pickAggravated(data: LagrumEntry): string | null {
  if (!data.alternativa_lagrum) return null;
  const match = data.alternativa_lagrum.find((alt) =>
    alt.toLowerCase().includes("grov")
  );
  return match ? match.replace(/\s*\(.*\)\s*$/, "").trim() : null;
}

function resolve(
  key: string,
  data: LagrumEntry,
  isAggravated: boolean
): { lagrum: string; sakomrade: string } {
  let lagrum = data.primart_lagrum[0] || "";
  if (isAggravated) {
    const aggravated = pickAggravated(data);
    if (aggravated) lagrum = aggravated;
  }
  return { lagrum, sakomrade: data.sakomrade };
}

// Candidate keys to search, longest first so more specific keys win.
// Override keys are searched before generated keys on ties in length.
const overrideKeys = Object.keys(lagrumOverrides).sort(
  (a, b) => b.length - a.length
);
const generatedKeys = Object.keys(generatedMappings)
  .filter((k) => !blockedLagrumKeys.has(k))
  .sort((a, b) => b.length - a.length);

export function matchLagrum(
  saken: string,
  caseNumber: string
): { lagrum: string; sakomrade: string } {
  const empty = { lagrum: "", sakomrade: "" };

  const trimmedCase = caseNumber.trim().toUpperCase();
  if (trimmedCase && !trimmedCase.startsWith("B")) return empty;

  const cleanSaken = saken
    .toLowerCase()
    .replace(/m\.?\s*m\.?\s*$/, "")
    .trim();

  if (!cleanSaken) return empty;

  const isAggravated = hasWordBoundaryOccurrence(cleanSaken, "grov") ||
    hasWordBoundaryOccurrence(cleanSaken, "grovt");

  // 1) Overrides win
  for (const key of overrideKeys) {
    if (hasWordBoundaryOccurrence(cleanSaken, key)) {
      return resolve(key, lagrumOverrides[key], isAggravated);
    }
  }

  // 2) Generated mappings (blocked keys filtered out)
  for (const key of generatedKeys) {
    if (hasWordBoundaryOccurrence(cleanSaken, key)) {
      return resolve(key, generatedMappings[key], isAggravated);
    }
  }

  return empty;
}
