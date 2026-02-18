import type { ParserStrategy, ParserContext, RawHearing } from "./types";
import {
  normalize,
  preprocessLines,
  NORMALIZED_TYPES,
  ROOM_REGEX,
} from "./extractors";

/**
 * Regex matching a case number at the start of text (B, T, FT, K, Ä prefixes).
 */
const CASE_AT_START_REGEX = /^((?:PMT|FT|[TBKÄ])\s?\d{1,6}[-–—]\d{2})\b/i;

/**
 * Regex matching a hearing line: YYYY-MM-DD HH:MM - HH:MM <rest>
 */
const HEARING_LINE_REGEX = /(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})\s+(.*)/;

/**
 * Regex matching a time-only line (no date): HH:MM - HH:MM <rest>
 */
const TIME_ONLY_REGEX = /^(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})\s+(.*)/;

/**
 * Regex matching a day-abbreviation + time line (no date): "fr 09:00 - 16:00 <rest>"
 * Used for multi-day hearings that lack an explicit date.
 */
const DAY_TIME_REGEX = /^(m[åaö]|ma|ti|on|to|fr|lö|lo|sö|so)\s*(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})\s+(.*)/i;

/**
 * Regex matching a date-only line (possibly with day abbreviation): "må 2026-02-09"
 */
const DATE_ONLY_REGEX = /(\d{4}-\d{2}-\d{2})\s*$/;

/**
 * Regex matching (dag X/Y) annotations for multi-day hearings.
 */
const DAG_REGEX = /^\(dag\s+\d+\/\d+\)/i;

/**
 * Regex matching page headers to skip.
 */
const HEADER_REGEX = /^(uppropslista|datum\s+tid|förhandlingar\b|listan\s|dagdatum|dag\s+datum)/i;

/**
 * Day abbreviations (Swedish) — standalone lines to skip.
 * Includes common PDF encoding variants (må → mö, etc.)
 */
const DAY_ABBREV_REGEX = /^(m[åaö]|ti|on|to|fr|lö|sö)$/i;

/**
 * Aliases mapping non-standard hearing type names to canonical types.
 */
const TYPE_ALIASES: Record<string, string> = {
  "muntlig förberedelse, eventuell huvudförhandling": "Muntlig förberedelse",
  "muntlig förberedelse, eventuell huvuförhandling": "Muntlig förberedelse",
  "huvudförhandling i förenklad form": "Huvudförhandling",
  "fortsatt muntlig förberedelse": "Muntlig förberedelse",
  "förberedande förhandling": "Förhandling",
  "annan förhandling": "Förhandling",
  "fortsatt hf": "Huvudförhandling",
  "hf i förenklad form": "Huvudförhandling",
  "fortsatt muntlig förb": "Muntlig förberedelse",
  "muntlig förberedelse och ev hf": "Muntlig förberedelse",
  "edgångssmtr": "Edgångssammanträde",
  "förlikningssmtr": "Förlikningssammanträde",
  "sammantr.de": "Sammanträde",
};

// Pre-sorted aliases longest first for correct prefix matching
const SORTED_ALIASES = Object.entries(TYPE_ALIASES)
  .map(([alias, canonical]) => ({ alias, canonical, normalizedAlias: normalize(alias) }))
  .sort((a, b) => b.normalizedAlias.length - a.normalizedAlias.length);

// Pre-sorted longest first so "Muntlig förberedelse" matches before partial hits
const SORTED_TYPES = [...NORMALIZED_TYPES].sort(
  (a, b) => b.normalized.length - a.normalized.length
);

/**
 * Alias suffixes for cleaning up cross-line alias fragments.
 * E.g., "Muntlig förberedelse och ev\nhf" → type "Muntlig förberedelse", saken starts with "och ev hf"
 */
const ALIAS_SUFFIXES: { canonical: string; normalizedSuffix: string }[] = [];
for (const { canonical, normalizedAlias } of SORTED_ALIASES) {
  const nCanonical = normalize(canonical);
  if (normalizedAlias.startsWith(nCanonical) && normalizedAlias.length > nCanonical.length) {
    ALIAS_SUFFIXES.push({
      canonical,
      normalizedSuffix: normalizedAlias.substring(nCanonical.length).trim(),
    });
  }
}
ALIAS_SUFFIXES.sort((a, b) => b.normalizedSuffix.length - a.normalizedSuffix.length);

/**
 * Map day abbreviations to weekday offsets (0=Monday).
 */
const DAY_OFFSET: Record<string, number> = {
  "må": 0, "ma": 0, "mö": 0,
  "ti": 1, "on": 2, "to": 3, "fr": 4,
  "lö": 5, "lo": 5, "sö": 6, "so": 6,
};

/**
 * Compute an ISO date from a day abbreviation and the Monday of the week.
 */
function computeDateFromDay(dayAbbrev: string, weekMonday: Date): string {
  const offset = DAY_OFFSET[dayAbbrev.toLowerCase()] ?? 0;
  const d = new Date(weekMonday);
  d.setDate(weekMonday.getDate() + offset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function extractTypeFromText(text: string): { type: string; remainder: string } {
  const normalized = normalize(text);

  // Check aliases first (longest alias first)
  for (const { alias, canonical, normalizedAlias } of SORTED_ALIASES) {
    if (normalized.startsWith(normalizedAlias)) {
      return { type: canonical, remainder: text.substring(alias.length).trim() };
    }
  }

  // Check known types
  for (const nt of SORTED_TYPES) {
    if (normalized.startsWith(nt.normalized)) {
      return { type: nt.original, remainder: text.substring(nt.original.length).trim() };
    }
  }

  return { type: "Förhandling", remainder: text };
}

function extractRoomFromText(text: string): string {
  const m = text.match(ROOM_REGEX);
  if (!m) return "";
  const prefix = m[0].toLowerCase().startsWith("tings") ? "Tingssal" : "Sal";
  return `${prefix} ${m[1]}`;
}

function stripRoom(text: string): string {
  return text.replace(ROOM_REGEX, "").replace(/\s*(?:[Tt]ings)?[Ss]al\s+\S+\s*$/, "").trim();
}

/**
 * Regex matching a bare date+time line (no content after the time range).
 * Safety net for lines like "ti 2026-02-10 09:00 - 10:00" that lack trailing text.
 */
const BARE_DATE_TIME_REGEX = /\d{4}-\d{2}-\d{2}.*\d{1,2}:\d{2}\s*[-–—]\s*\d{1,2}:\d{2}\s*$/;

/**
 * Check if a line should stop the continuation loop.
 */
function isContinuationBreak(line: string): boolean {
  return (
    !!line.match(HEARING_LINE_REGEX) ||
    DAY_ABBREV_REGEX.test(line) ||
    DATE_ONLY_REGEX.test(line) ||
    !!line.match(TIME_ONLY_REGEX) ||
    HEADER_REGEX.test(line) ||
    BARE_DATE_TIME_REGEX.test(line) ||
    !!line.match(DAY_TIME_REGEX)
  );
}

/**
 * Tabular format parser — for courts like Eksjö and Hässleholm that publish
 * table-style PDFs with columns: Dag, Datum, Tid, Mötestyp, Saken, Sal/Lokal.
 *
 * No case numbers or parties in this format.
 * Handles both single-line entries and multi-line entries where date, (dag X/Y),
 * and time are on separate lines.
 */
export const formatTabular: ParserStrategy = {
  name: "Tabular",
  formatFamily: "tabular",

  parse(ctx: ParserContext): RawHearing[] {
    const { text } = ctx;
    if (!text || text.trim().length === 0) return [];

    const lines = preprocessLines(text);
    const hearings: RawHearing[] = [];
    let currentDate = "";

    // Determine week Monday from first ISO date found in document.
    // Used to compute dates for day-only entries (multi-day hearings without dates).
    let weekMonday: Date | null = null;
    for (const line of lines) {
      const dm = line.match(/(\d{4}-\d{2}-\d{2})/);
      if (dm) {
        const d = new Date(dm[1] + "T12:00:00");
        const dow = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
        const mondayOffset = dow === 0 ? -6 : 1 - dow;
        weekMonday = new Date(d);
        weekMonday.setDate(d.getDate() + mondayOffset);
        break;
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip (dag X/Y) annotations and header lines
      if (DAG_REGEX.test(line) || HEADER_REGEX.test(line)) continue;

      // Check for date-only line (day abbrev + ISO date, no time)
      const dateOnly = line.match(DATE_ONLY_REGEX);
      if (dateOnly && !line.match(HEARING_LINE_REGEX)) {
        currentDate = dateOnly[1];
        continue;
      }

      let date: string;
      let time: string;
      let rest: string;

      // Check for full hearing line (date + time on same line)
      const fullMatch = line.match(HEARING_LINE_REGEX);
      if (fullMatch) {
        date = fullMatch[1];
        time = `${fullMatch[2]} - ${fullMatch[3]}`;
        rest = fullMatch[4].trim();
        currentDate = date;
      } else {
        // Check for time-only line (needs tracked date)
        const timeMatch = line.match(TIME_ONLY_REGEX);
        if (timeMatch && currentDate) {
          date = currentDate;
          time = `${timeMatch[1]} - ${timeMatch[2]}`;
          rest = timeMatch[3].trim();
        } else {
          // Check for day abbreviation + time (no date, e.g., multi-day hearings)
          const dayTimeMatch = line.match(DAY_TIME_REGEX);
          if (dayTimeMatch && weekMonday) {
            date = computeDateFromDay(dayTimeMatch[1], weekMonday);
            time = `${dayTimeMatch[2]} - ${dayTimeMatch[3]}`;
            rest = dayTimeMatch[4].trim();
          } else {
            continue;
          }
        }
      }

      // Strip inline (dag X/Y) annotations from rest text
      rest = rest.replace(/\s*\(dag\s+\d+\/\d+\)/gi, "").trim();

      // Extract hearing type from the text after the time range
      const { type, remainder } = extractTypeFromText(rest);

      // Extract case number(s) if present at start of remainder
      const caseNumbers: string[] = [];
      let afterCase = remainder;
      let caseMatch = afterCase.match(CASE_AT_START_REGEX);
      while (caseMatch) {
        caseNumbers.push(caseMatch[1]);
        afterCase = afterCase.substring(caseMatch[0].length).trim();
        // Strip slash or comma separator between multiple case numbers
        afterCase = afterCase.replace(/^[/,]\s*/, "");
        caseMatch = afterCase.match(CASE_AT_START_REGEX);
      }
      const caseNumber = caseNumbers.join(", ");

      // Extract external court reference "(X tingsrätt)" after case numbers
      let externalCourt: string | undefined;
      const courtRef = afterCase.match(/^\(([^)]*(?:tingsrätt|tingsratt))\)\s*/i);
      if (courtRef) {
        externalCourt = courtRef[1].trim();
        afterCase = afterCase.substring(courtRef[0].length);
      }
      afterCase = afterCase.replace(/^med\s+flera\s*/i, "");

      // Extract room and saken from the text after type (and case number)
      let room = extractRoomFromText(afterCase);
      let saken = stripRoom(afterCase);

      // Always check subsequent lines for continuation text
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j];
        if (isContinuationBreak(nextLine)) break;
        // Skip (dag X/Y) annotations in continuation
        if (DAG_REGEX.test(nextLine)) continue;
        if (nextLine.length > 1) {
          if (!room) room = extractRoomFromText(nextLine);
          const cleaned = stripRoom(nextLine);
          if (cleaned && !DAY_ABBREV_REGEX.test(cleaned)) {
            saken = saken ? `${saken} ${cleaned}` : cleaned;
          }
        }
      }

      // Strip location annotations like "(Extern lokal)" from saken
      saken = saken.replace(/\s*\([Ee]xtern\s+lokal\)/g, "").trim();

      // Strip alias suffixes that span across lines
      // e.g., "Muntlig förberedelse och ev\nhf" → type "Muntlig förberedelse", saken "och ev hf ..."
      const nSaken = normalize(saken);
      for (const { canonical, normalizedSuffix } of ALIAS_SUFFIXES) {
        if (type === canonical && nSaken.startsWith(normalizedSuffix)) {
          saken = saken.substring(normalizedSuffix.length).trim();
          break;
        }
      }

      // Extract trailing court name as location (Uppsala-style "Lokal" field)
      let location: string | undefined;
      const courtNameAtEnd = saken.match(/\s+(\S+\s+tingsrätt)\s*$/i);
      if (courtNameAtEnd && courtNameAtEnd.index !== undefined) {
        location = courtNameAtEnd[1];
        saken = saken.substring(0, courtNameAtEnd.index).trim();
      }

      // Clean trailing punctuation from saken
      saken = saken.replace(/^[\s,;:.\-–]+|[\s,;:.\-–]+$/g, "").trim();

      hearings.push({
        date,
        time,
        caseNumber,
        type,
        room: room || "",
        saken: saken || "",
        parties: "",
        ...(externalCourt && { externalCourt }),
        ...(location && { location }),
      });
    }

    return hearings;
  },
};
