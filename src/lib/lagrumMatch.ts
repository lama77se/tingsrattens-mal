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

export interface LagrumMatch {
  lagrum: string;
  sakomrade: string;
  /** Additional crimes found in the same saken (#6). Primary stays in lagrum/sakomrade. */
  additional?: { lagrum: string; sakomrade: string }[];
}

const WORD_CHAR_RE = /[0-9A-Za-zÅÄÖåäö_]/;

/** Minimum key length for Levenshtein-distance-1 fuzzy fallback (#4). */
const LEVENSHTEIN_MIN_LENGTH = 7;

/** Minimum token length in saken to consider for Levenshtein fallback. */
const LEVENSHTEIN_MIN_TOKEN_LENGTH = 6;

/** Separators used when splitting a saken into crime fragments (#6). */
const FRAGMENT_SEPARATORS_RE = /\s*[;,]\s*|\s+och\s+|\s+samt\s+|\s+jämte\s+/i;

/**
 * Fuzzy normalization: lowercase, strip diacritics, collapse duplicated letters.
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

/** Bounded Levenshtein distance — short-circuits at > max. */
function levenshteinAtMost(a: string, b: string, max: number): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n <= max ? n : max + 1;
  if (n === 0) return m <= max ? m : max + 1;

  let prev = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  const curr = new Array(n + 1);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost
      );
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > max) return max + 1;
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return prev[n];
}

function pickAggravated(data: LagrumEntry): string | null {
  if (!data.alternativa_lagrum) return null;
  const match = data.alternativa_lagrum.find((alt) =>
    alt.toLowerCase().includes("grov")
  );
  return match ? match.replace(/\s*\(.*\)\s*$/, "").trim() : null;
}

interface IndexedMap {
  keys: string[];
  fuzzyKeys: Map<string, string>;
  /** Single-word keys (no spaces) of length ≥ LEVENSHTEIN_MIN_LENGTH — candidates for #4. */
  fuzzableKeys: string[];
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
  const fuzzableKeys = keys.filter(
    (k) => k.length >= LEVENSHTEIN_MIN_LENGTH && !k.includes(" ")
  );
  return { keys, fuzzyKeys, fuzzableKeys, map };
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
  // Patent- och marknadsdomstolen prefixes map to their "mother" case types.
  // Using lookahead with non-letter char (not \b) so Å/Ä/Ö work correctly.
  const sep = "(?=\\s|$|[^A-ZÅÄÖa-zåäö])";
  if (new RegExp(`^PMFT${sep}`).test(trimmed)) return "FT";
  if (new RegExp(`^PMT${sep}`).test(trimmed)) return "T";
  if (new RegExp(`^PMÄ${sep}`).test(trimmed)) return "Ä";
  if (new RegExp(`^PMB${sep}`).test(trimmed)) return "B";
  if (new RegExp(`^FT${sep}`).test(trimmed)) return "FT";
  const first = trimmed.charAt(0);
  if (first === "B") return "B";
  if (first === "T") return "T";
  if (first === "F") return "F";
  if (first === "Ä") return "Ä";
  if (first === "K") return "K";
  return "";
}

/**
 * Some parsers put the case-type prefix inside the saken field instead of the
 * caseNumber field ("PMÄ 8348-25 konkurrensskadeavgift"). Detect that pattern
 * so we can route correctly.
 */
const SAKEN_PREFIX_CASE_RE = /^(PMFT|PMT|PMÄ|PMB|FT|B|T|F|Ä|K)\s+\d+-\d+\s*/i;

function extractCaseTypeFromSaken(saken: string): CaseType {
  const m = saken.trim().match(SAKEN_PREFIX_CASE_RE);
  if (!m) return "";
  return caseTypeFromCaseNumber(m[1]);
}

function indexesForCaseType(caseType: CaseType): IndexedMap[] {
  switch (caseType) {
    case "B":
    case "":
      return [INDEX_OVERRIDES_B, INDEX_GENERATED_B];
    case "T":
    case "FT":
      // Some courts (e.g. Nyköping) file custody disputes as T rather than F,
      // so let tvistemål also fall through to the family vocabulary.
      return [INDEX_CIVIL, INDEX_FAMILY];
    case "F":
      return [INDEX_FAMILY];
    case "Ä":
      return [INDEX_ARENDEN];
    case "K":
      return [INDEX_KONKURS];
  }
}

/**
 * Find an "aggravated twin" of the matched key (#5).
 * If saken contains "grov"/"grovt" and a more specific "grov {key}" entry
 * exists in the same indexes, prefer it.
 */
function findAggravatedTwin(
  matchedKey: string,
  isAggravated: boolean,
  indexes: IndexedMap[]
): LagrumEntry | null {
  if (!isAggravated) return null;
  const candidates = [`grov ${matchedKey}`, `grovt ${matchedKey}`];
  for (const index of indexes) {
    for (const cand of candidates) {
      if (index.map[cand]) return index.map[cand];
    }
  }
  return null;
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
  if (!lagrum && data.sakomrade && sakomradeDefaultLagrum[data.sakomrade]) {
    lagrum = sakomradeDefaultLagrum[data.sakomrade];
  }
  return { lagrum, sakomrade: data.sakomrade };
}

interface FindHit {
  entry: LagrumEntry;
  key: string;
}

function findInIndex(
  index: IndexedMap,
  cleanSaken: string,
  fuzzySaken: string,
  sakenTokens: string[]
): FindHit | null {
  for (const key of index.keys) {
    if (hasWordBoundaryOccurrence(cleanSaken, key)) {
      return { entry: index.map[key], key };
    }
  }
  for (const key of index.keys) {
    const fuzzyKey = index.fuzzyKeys.get(key);
    if (!fuzzyKey || fuzzyKey === key) continue;
    if (hasWordBoundaryOccurrence(fuzzySaken, fuzzyKey)) {
      return { entry: index.map[key], key };
    }
  }
  // #4: Levenshtein-distance-1 fallback for single-word keys.
  for (const key of index.fuzzableKeys) {
    for (const token of sakenTokens) {
      if (token.length < LEVENSHTEIN_MIN_TOKEN_LENGTH) continue;
      if (Math.abs(token.length - key.length) > 1) continue;
      if (levenshteinAtMost(token, key, 1) <= 1) {
        return { entry: index.map[key], key };
      }
    }
  }
  return null;
}

function tokenize(s: string): string[] {
  return s.split(/[^a-zåäöÅÄÖ]+/).filter((t) => t.length > 0);
}

function findOnce(
  cleanSaken: string,
  caseType: CaseType
): { entry: LagrumEntry; key: string; indexes: IndexedMap[] } | null {
  const indexes = indexesForCaseType(caseType);
  const fuzzySaken = fuzzyNormalize(cleanSaken);
  const sakenTokens = tokenize(cleanSaken);
  for (const index of indexes) {
    const hit = findInIndex(index, cleanSaken, fuzzySaken, sakenTokens);
    if (hit) return { ...hit, indexes };
  }
  return null;
}

function cleanFragment(s: string): string {
  return s
    .toLowerCase()
    // Strip saken-embedded case refs like "PMÄ 8348-25 ..." or "pmft 19315-25 ..."
    .replace(/^(pmft|pmt|pmä|pmb|ft|b|t|f|ä|k)\s+\d+-\d+\s+/i, "")
    // Strip room/venue artefacts that some court parsers leave in the saken
    // field (e.g. Nyköping's "... Tingssal", Halmstad's "... Sal 3").
    .replace(/\s+(tingssal|tingsrätten)\s*$/i, "")
    .replace(/\s+sal\s*\d*\s*$/i, "")
    .replace(/m\.?\s*m\.?\s*$/, "")
    .replace(/\s+(tingssal|tingsrätten)\s*$/i, "")
    .replace(/\s+sal\s*\d*\s*$/i, "")
    .trim();
}

function matchFragment(
  fragment: string,
  caseType: CaseType
): { lagrum: string; sakomrade: string } | null {
  const hit = findOnce(fragment, caseType);
  if (!hit) return null;
  const isAggravated =
    hasWordBoundaryOccurrence(fragment, "grov") ||
    hasWordBoundaryOccurrence(fragment, "grovt");
  let entry = hit.entry;
  const twin = findAggravatedTwin(hit.key, isAggravated, hit.indexes);
  if (twin) entry = twin;
  return resolve(entry, isAggravated);
}

export function matchLagrum(saken: string, caseNumber: string): LagrumMatch {
  const empty: LagrumMatch = { lagrum: "", sakomrade: "" };

  let caseType = caseTypeFromCaseNumber(caseNumber);
  // Fall back to a saken-embedded case ref ("PMÄ 8348-25 konkurrensskadeavgift")
  // when the parser couldn't extract the caseNumber field.
  if (!caseType) caseType = extractCaseTypeFromSaken(saken);
  const cleanSaken = cleanFragment(saken);
  if (!cleanSaken) return empty;

  // Try fragment-based matching first (#6). Only applies if we actually
  // split on a separator — otherwise treat saken as single.
  const rawFragments = saken.split(FRAGMENT_SEPARATORS_RE);
  if (rawFragments.length > 1) {
    const fragments = rawFragments
      .map(cleanFragment)
      .filter((f) => f.length > 2);

    let primary: { lagrum: string; sakomrade: string } | null = null;
    const additional: { lagrum: string; sakomrade: string }[] = [];
    const seen = new Set<string>();

    for (const fragment of fragments) {
      const resolved = matchFragment(fragment, caseType);
      if (!resolved) continue;
      const k = `${resolved.sakomrade}|${resolved.lagrum}`;
      if (seen.has(k)) continue;
      seen.add(k);
      if (!primary) primary = resolved;
      else additional.push(resolved);
    }

    if (primary) {
      return additional.length > 0 ? { ...primary, additional } : primary;
    }
    // Fragment matching produced nothing (e.g. the "och" is part of a crime
    // phrase like "knivar och andra farliga föremål") — fall through to a
    // whole-saken match below.
  }

  const fullMatch = matchFragment(cleanSaken, caseType);
  return fullMatch ?? empty;
}
