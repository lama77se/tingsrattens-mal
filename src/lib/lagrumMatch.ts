import { mappings as generatedMappings, type LagrumEntry } from "./lagrumMappings";
import {
  arendenLagrumOverrides,
  blockedLagrumKeys,
  civilLagrumOverrides,
  familyLagrumOverrides,
  konkursLagrumOverrides,
  lagrumOverrides,
  sakomradeDefaultLagrum,
} from "./lagrumOverrides";

export type CaseType = "B" | "T" | "FT" | "F" | "Ä" | "K" | "";

/**
 * Word-character test that treats Swedish letters (Å/Ä/Ö, å/ä/ö) as word chars.
 * The built-in \w / \b does not — which breaks boundary checks around words
 * that start or end with those letters.
 */
const WORD_CHAR_RE = /[0-9A-Za-zÅÄÖåäö_]/;

/**
 * Fuzzy normalization: lowercase, strip diacritics, collapse duplicated letters.
 * Used as a fallback after exact word-boundary match fails — catches inconsistent
 * diacritics and double-letter variants (e.g. "missshandel" → "mishandel").
 */
function fuzzyNormalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[åäáàâã]/g, "a")
    .replace(/[öóòôõ]/g, "o")
    .replace(/[éèêë]/g, "e")
    .replace(/[üúùû]/g, "u")
    .replace(/(.)\1+/g, "$1");
}

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
  data: LagrumEntry,
  isAggravated: boolean
): { lagrum: string; sakomrade: string } {
  let lagrum = data.primart_lagrum[0] || "";
  if (isAggravated) {
    const aggravated = pickAggravated(data);
    if (aggravated) lagrum = aggravated;
  }
  // D: fall back to sakomrade default when the mapping has no lagrum
  if (!lagrum && data.sakomrade && sakomradeDefaultLagrum[data.sakomrade]) {
    lagrum = sakomradeDefaultLagrum[data.sakomrade];
  }
  return { lagrum, sakomrade: data.sakomrade };
}

// Pre-compute sorted key lists (longest first) and their fuzzy-normalized forms
// so we can reuse them across lookups.
interface IndexedMap {
  keys: string[];
  fuzzyKeys: Map<string, string>; // original key → fuzzy form
  map: Record<string, LagrumEntry>;
}

function buildIndex(
  map: Record<string, LagrumEntry>,
  exclude?: ReadonlySet<string>
): IndexedMap {
  const keys = Object.keys(map)
    .filter((k) => !exclude?.has(k))
    .sort((a, b) => b.length - a.length);
  const fuzzyKeys = new Map<string, string>();
  for (const k of keys) fuzzyKeys.set(k, fuzzyNormalize(k));
  return { keys, fuzzyKeys, map };
}

const INDEX_OVERRIDES_B = buildIndex(lagrumOverrides);
const INDEX_GENERATED_B = buildIndex(generatedMappings, blockedLagrumKeys);
const INDEX_CIVIL = buildIndex(civilLagrumOverrides);
const INDEX_FAMILY = buildIndex(familyLagrumOverrides);
const INDEX_ARENDEN = buildIndex(arendenLagrumOverrides);
const INDEX_KONKURS = buildIndex(konkursLagrumOverrides);

function caseTypeFromCaseNumber(caseNumber: string): CaseType {
  const trimmed = caseNumber.trim().toUpperCase();
  if (!trimmed) return "";
  // Two-letter prefixes first (FT before F)
  if (/^FT\b/.test(trimmed)) return "FT";
  const first = trimmed.charAt(0);
  if (first === "B") return "B";
  if (first === "T") return "T";
  if (first === "F") return "F";
  if (first === "Ä") return "Ä";
  if (first === "K") return "K";
  return "";
}

function indexesForCaseType(caseType: CaseType): IndexedMap[] {
  switch (caseType) {
    case "B":
    case "": // unknown → assume criminal, matches most common use
      return [INDEX_OVERRIDES_B, INDEX_GENERATED_B];
    case "T":
    case "FT":
      return [INDEX_CIVIL];
    case "F":
      return [INDEX_FAMILY];
    case "Ä":
      return [INDEX_ARENDEN];
    case "K":
      return [INDEX_KONKURS];
  }
}

function findInIndex(
  index: IndexedMap,
  cleanSaken: string,
  fuzzySaken: string
): LagrumEntry | null {
  // C: exact word-boundary match first
  for (const key of index.keys) {
    if (hasWordBoundaryOccurrence(cleanSaken, key)) {
      return index.map[key];
    }
  }
  // C: fuzzy-normalized word-boundary fallback
  for (const key of index.keys) {
    const fuzzyKey = index.fuzzyKeys.get(key);
    if (!fuzzyKey || fuzzyKey === key) continue; // only if normalization differs
    if (hasWordBoundaryOccurrence(fuzzySaken, fuzzyKey)) {
      return index.map[key];
    }
  }
  return null;
}

export function matchLagrum(
  saken: string,
  caseNumber: string
): { lagrum: string; sakomrade: string } {
  const empty = { lagrum: "", sakomrade: "" };

  const caseType = caseTypeFromCaseNumber(caseNumber);

  const cleanSaken = saken
    .toLowerCase()
    .replace(/m\.?\s*m\.?\s*$/, "")
    .trim();

  if (!cleanSaken) return empty;

  const fuzzySaken = fuzzyNormalize(cleanSaken);
  const isAggravated =
    hasWordBoundaryOccurrence(cleanSaken, "grov") ||
    hasWordBoundaryOccurrence(cleanSaken, "grovt");

  for (const index of indexesForCaseType(caseType)) {
    const entry = findInIndex(index, cleanSaken, fuzzySaken);
    if (entry) return resolve(entry, isAggravated);
  }

  return empty;
}
