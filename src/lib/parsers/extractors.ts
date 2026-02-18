/**
 * Shared extraction functions and regex constants for court PDF parsing.
 * Extracted from the monolithic parseCourtPdf to enable strategy-based parsing.
 */

// --- Normalize ---

export function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[\u00e4\u00e0\u00e1\u00e2\u00e3]/g, "a")  // ä, à, á, â, ã → a
    .replace(/[\u00f6\u00f2\u00f3\u00f4\u00f5]/g, "o")  // ö, ò, ó, ô, õ → o
    .replace(/[\u00e5]/g, "a")                            // å → a
    .replace(/[\u00e9\u00e8\u00ea\u00eb]/g, "e");         // é, è, ê, ë → e
}

// --- Regex constants ---

export const SHORT_DATE_REGEX = /(\d{1,2})[-\u2013\u2014](jan|feb|mar|apr|maj|jun|jul|aug|sep|okt|nov|dec)/i;

export const SHORT_MONTH_MAP: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04",
  maj: "05", jun: "06", jul: "07", aug: "08",
  sep: "09", okt: "10", nov: "11", dec: "12",
};

export const ISO_DATE_REGEX = /(\d{4}[-\u2013\u2014]\d{2}[-\u2013\u2014]\d{2})/;

export const SWEDISH_DATE_REGEX = /(\d{1,2})\s+(januari|februari|mars|april|maj|juni|juli|augusti|september|oktober|november|december)\s+(\d{4})/i;

export const MONTH_MAP: Record<string, string> = {
  januari: "01", februari: "02", mars: "03", april: "04",
  maj: "05", juni: "06", juli: "07", augusti: "08",
  september: "09", oktober: "10", november: "11", december: "12",
};

export const CASE_NUMBER_REGEX = /\b((?:PMT|FT|[TBK\u00c4])\s?\d{1,6}[-\u2013\u2014]\d{2})\b/i;

export const TIME_RANGE_REGEX = /(\d{1,2}:\d{2})\s*[-\u2013\u2014]\s*(\d{1,2}:\d{2})/;

export const TIME_REGEX = /\b(\d{1,2}:\d{2})\b/;

export const ROOM_REGEX = /(?:Tings)?[Ss]al\s+(\S+)/;

export const HEARING_TYPES = [
  "Huvudförhandling",
  "Häktningsförhandling",
  "Konkursförhandling",
  "Muntlig förberedelse",
  "Muntlig förhandling",
  "Borgenärssammanträde",
  "Förlikningssammanträde",
  "Edgångssammanträde",
  "Plansammanträde",
  "Sammanträde",
  "Bevisupptagning",
  "Föredragning",
  "Tredskodom",
  "Avgörande",
  "Förhandling",
];

export const NORMALIZED_TYPES = HEARING_TYPES.map((ht) => ({
  original: ht,
  normalized: normalize(ht),
}));

export const COURT_IN_SAKEN_REGEX = /^(.+(?:tingsrätt|hovrätt|kammarrätt))\s*[-–—]\s*(.+)$/i;

export const FLERA_SAKFRAGOR_REGEX = /\bm\s*\.?\s*m\b\.?/i;

// --- Extraction functions ---

export function extractShortDate(line: string): string | null {
  const m = line.match(SHORT_DATE_REGEX);
  if (m) {
    const day = m[1].padStart(2, "0");
    const month = SHORT_MONTH_MAP[m[2].toLowerCase()];
    if (month) return `${new Date().getFullYear()}-${month}-${day}`;
  }
  return null;
}

export function extractIsoDate(line: string): string | null {
  const m = line.match(ISO_DATE_REGEX);
  if (m) return m[1].replace(/[\u2013\u2014]/g, "-");
  return null;
}

export function extractSwedishDate(line: string): string | null {
  const m = line.match(SWEDISH_DATE_REGEX);
  if (m) {
    const day = m[1].padStart(2, "0");
    const month = MONTH_MAP[m[2].toLowerCase()];
    const year = m[3];
    if (month) return `${year}-${month}-${day}`;
  }
  return null;
}

/**
 * Pre-process PDF text into clean, trimmed, non-empty lines.
 *
 * With unpdf coordinate-based extraction, text arrives as proper visual rows
 * with correct field spacing. Only minimal normalization is needed.
 */
export function preprocessLines(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) =>
      line
        // Normalize en-dashes/em-dashes to hyphens in ISO dates
        .replace(/(\d{4})[-–—](\d{2})[-–—](\d{2})/g, "$1-$2-$3")
        // Strip (dag X/Y) annotations
        .replace(/\s*\(dag\s+\d+\/\d+\)/gi, "")
        // Case number space before dash: B 784 -25 → B 784-25
        .replace(/((?:PMT|FT|[TBKÄ])\s?\d{1,6})\s+([-–—]\d{2})/gi, "$1$2")
        // Strip pagination footers: "1-81 visas av 81"
        .replace(/\s*\d+[-–—]\d+\s+visas\s+av\s+\d+\s*$/, "")
    );
}

export function extractTime(line: string, prevLine?: string): string {
  const rangeMatch = line.match(TIME_RANGE_REGEX);
  if (rangeMatch) return `${rangeMatch[1]} - ${rangeMatch[2]}`;

  const timeMatch = line.match(TIME_REGEX);
  if (timeMatch) return timeMatch[1];

  if (prevLine) {
    const prevRange = prevLine.match(TIME_RANGE_REGEX);
    if (prevRange) return `${prevRange[1]} - ${prevRange[2]}`;

    const prevTimeMatch = prevLine.match(TIME_REGEX);
    if (prevTimeMatch) return prevTimeMatch[1];
  }

  return "";
}

export function extractRoom(lines: string[], index: number): string {
  const roomMatch = lines[index].match(ROOM_REGEX);
  if (roomMatch) {
    const prefix = roomMatch[0].toLowerCase().startsWith("tings") ? "Tingssal" : "Sal";
    return `${prefix} ${roomMatch[1]}`;
  }

  // Prefer forward lines (room is often after case number) over backward
  for (let j = index + 1; j <= Math.min(lines.length - 1, index + 2); j++) {
    const rm = lines[j].match(ROOM_REGEX);
    if (rm) {
      const prefix = rm[0].toLowerCase().startsWith("tings") ? "Tingssal" : "Sal";
      return `${prefix} ${rm[1]}`;
    }
  }

  for (let j = Math.max(0, index - 2); j < index; j++) {
    const rm = lines[j].match(ROOM_REGEX);
    if (rm) {
      const prefix = rm[0].toLowerCase().startsWith("tings") ? "Tingssal" : "Sal";
      return `${prefix} ${rm[1]}`;
    }
  }

  return "";
}

export function extractHearingType(lines: string[], index: number): string {
  const normalizedLine = normalize(lines[index]);
  for (const nt of NORMALIZED_TYPES) {
    if (normalizedLine.includes(nt.normalized)) return nt.original;
  }

  if (index > 0) {
    const prevNormalized = normalize(lines[index - 1]);
    for (const nt of NORMALIZED_TYPES) {
      if (prevNormalized.includes(nt.normalized)) return nt.original;
    }
  }

  if (index + 1 < lines.length) {
    const nextNormalized = normalize(lines[index + 1]);
    for (const nt of NORMALIZED_TYPES) {
      if (nextNormalized.includes(nt.normalized)) return nt.original;
    }
  }

  return "Förhandling";
}

/**
 * Clean raw saken text by removing room, time, hearing type artifacts.
 */
export function cleanSaken(text: string): string {
  let saken = text
    .replace(ROOM_REGEX, "")
    .replace(/\s*(?:[Tt]ings)?[Ss]al\s+\S+\s*$/, "")
    .replace(TIME_RANGE_REGEX, "")
    .replace(TIME_REGEX, "")
    .trim();
  for (const ht of HEARING_TYPES) {
    saken = saken.replace(new RegExp(ht, "gi"), "").trim();
  }
  // Strip trailing court name used as location (e.g., "... Attunda tingsrätt")
  saken = saken.replace(/\s+\S+\s+tingsrätt\s*$/i, "").trim();
  return saken.replace(/^[\s,;:.\-–]+|[\s,;:.\-–]+$/g, "").trim();
}

/**
 * Clean raw parties text by removing room, time, hearing type artifacts.
 */
export function cleanParties(text: string): string {
  let parties = text
    .replace(ROOM_REGEX, "")
    .replace(TIME_RANGE_REGEX, "")
    .replace(TIME_REGEX, "")
    .trim();
  for (const ht of HEARING_TYPES) {
    parties = parties.replace(new RegExp(ht, "gi"), "").trim();
  }
  return parties.replace(/^[\s,;:.\-–]+|[\s,;:.\-–]+$/g, "");
}
