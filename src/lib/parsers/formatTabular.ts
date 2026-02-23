import type { ParserStrategy, ParserContext, RawHearing } from "./types";
import {
  normalize,
  preprocessLines,
  extractShortDate,
  NORMALIZED_TYPES,
  ROOM_REGEX,
} from "./extractors";

/**
 * Regex matching a case number at the start of text (B, T, FT, K, M, F, Ä prefixes).
 */
const CASE_AT_START_REGEX = /^((?:PMT|FT|[TBKMFÄ])\s?\d{1,6}[-–—]\d{2})\b/i;

/**
 * Regex matching a hearing line: YYYY-MM-DD HH:MM - HH:MM <rest>
 */
const HEARING_LINE_REGEX = /(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})\s+(.*)/;

/**
 * Regex matching a time-only line (no date): HH:MM - HH:MM [<rest>]
 * Trailing text is optional to support column-separated PDF output where
 * the time range may be on its own line.
 */
const TIME_ONLY_REGEX = /^(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})(?:\s+(.*))?/;

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
  "huvudförhandling, forts.": "Huvudförhandling",
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
 * Extract case numbers from the end of saken text (PDF column overflow).
 * Mutates the cases array by pushing found case numbers.
 * Returns the cleaned saken text.
 */
function extractTrailingCases(saken: string, cases: string[]): string {
  let s = saken;
  const trailingFound: string[] = [];
  // Iteratively strip case numbers from the end of the text
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const m = s.match(/\s+((?:PMT|FT|[TBKMFÄ])\s?\d{1,6}[-–—]\d{2})\s*$/i);
    if (!m) break;
    trailingFound.unshift(m[1]); // prepend to maintain left-to-right order
    s = s.substring(0, m.index!).trim();
  }
  cases.push(...trailingFound);
  return s;
}

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

    console.log("PDF text first 500 chars:", text.substring(0, 500));

    const rawLines = preprocessLines(text);
    // Convert short dates (e.g., "10-feb") to ISO dates for regex matching
    const lines = rawLines.map(line => {
      if (!/\d{4}-\d{2}-\d{2}/.test(line)) {
        const isoDate = extractShortDate(line);
        if (isoDate) {
          return line.replace(/\b(\d{1,2})[-–](\w{3})\b/i, isoDate);
        }
      }
      return line;
    });
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
          rest = (timeMatch[3] || "").trim();
          // Column-separated output: type may be on the next non-empty line
          if (!rest) {
            for (let k = i + 1; k < lines.length; k++) {
              const peek = lines[k].trim();
              if (!peek || peek.length <= 1) continue;
              if (isContinuationBreak(peek)) break;
              if (DAG_REGEX.test(peek) || HEADER_REGEX.test(peek)) continue;
              rest = peek;
              i = k;
              break;
            }
          }
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
      // Strip "och" prefix only when immediately followed by a case number
      // (PDF column overflow: "Muntlig förberedelse och FT 5275-25" where
      // "och ev hf" was the full type but the case number column interrupted it)
      const ochStripped = afterCase.replace(/^och\s+/i, "");
      if (CASE_AT_START_REGEX.test(ochStripped)) {
        afterCase = ochStripped;
      }
      let caseMatch = afterCase.match(CASE_AT_START_REGEX);
      while (caseMatch) {
        caseNumbers.push(caseMatch[1]);
        afterCase = afterCase.substring(caseMatch[0].length).trim();
        // Strip slash or comma separator between multiple case numbers
        afterCase = afterCase.replace(/^[/,]\s*/, "");
        caseMatch = afterCase.match(CASE_AT_START_REGEX);
      }
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
      let location: string | undefined;

      // Extract trailing case numbers from saken (same-line overflow from
      // the PDF case column, e.g., "misshandel B 2327-24" after room stripping)
      saken = extractTrailingCases(saken, caseNumbers);

      // Always check subsequent lines for continuation text
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j];
        if (isContinuationBreak(nextLine)) break;
        // Skip (dag X/Y) annotations in continuation
        if (DAG_REGEX.test(nextLine)) continue;
        if (nextLine.length > 1) {
          let lineText = nextLine;

          // Extract case number(s) from continuation line (append to existing)
          {
            const caseCont = lineText.match(CASE_AT_START_REGEX);
            if (caseCont) {
              let after = lineText;
              let cm = after.match(CASE_AT_START_REGEX);
              while (cm) {
                caseNumbers.push(cm[1]);
                after = after.substring(cm[0].length).trim();
                after = after.replace(/^[/,]\s*/, "");
                cm = after.match(CASE_AT_START_REGEX);
              }
              // Extract external court reference from continuation
              if (!externalCourt) {
                const courtRef2 = after.match(/^\(([^)]*(?:tingsrätt|tingsratt))\)\s*/i);
                if (courtRef2) {
                  externalCourt = courtRef2[1].trim();
                  after = after.substring(courtRef2[0].length);
                }
              }
              after = after.replace(/^med\s+flera\s*/i, "").replace(/^m\.?fl\.?\s*/i, "");
              lineText = after;
            }
          }

          if (!room) room = extractRoomFromText(lineText);

          // Detect sal-column overflow fragments when room is already found.
          // With simplified row extraction (no column splitting), room/location
          // fragments appear at the END of merged lines since the room column
          // is rightmost. We check for both standalone and trailing patterns.
          if (room) {
            const trimmed = lineText.trim();

            // --- Standalone line patterns (column-separated output) ---
            // Parenthesized room qualifier as entire line
            if (/^\([^)]*(?:sal|lokal|säkerhet)[^)]*\)$/i.test(trimmed)) {
              room = `${room} ${trimmed}`;
              continue;
            }
            // "CityName tingsrätt" as entire line → location
            if (/^\S+\s+tingsrätt$/i.test(trimmed)) {
              if (!location) location = trimmed;
              continue;
            }
            // Standalone "tingsrätt" → sal-column overflow
            if (/^tingsrätt$/i.test(trimmed)) continue;
            // Standalone capitalized word with "tingsrätt" on a later line
            if (/^[A-ZÅÄÖ][a-zåäö]+$/.test(trimmed)) {
              let hasTingsratt = false;
              for (let k = j + 1; k < lines.length; k++) {
                const peek = lines[k].trim();
                if (isContinuationBreak(peek)) break;
                if (/^tingsrätt$/i.test(peek) || /\btingsrätt\s*$/i.test(peek)) { hasTingsratt = true; break; }
              }
              if (hasTingsratt) {
                if (!location) location = `${trimmed} tingsrätt`;
                continue;
              }
            }

            // --- Trailing patterns (merged row output) ---
            // Room qualifier at end of line: "...involverande av (säkerhetssal)"
            const trailingQualifier = trimmed.match(/\s+(\([^)]*(?:sal|lokal|säkerhet)[^)]*\))\s*$/i);
            if (trailingQualifier) {
              room = `${room} ${trailingQualifier[1]}`;
              lineText = trimmed.substring(0, trailingQualifier.index!).trim();
            }
            // Line ends with "tingsrätt": "...förberedelse till tingsrätt"
            const trailingTR = lineText.match(/\s+tingsrätt\s*$/i);
            if (trailingTR) {
              lineText = lineText.substring(0, trailingTR.index!).trim();
            }
            // Line ends with capitalized word that forms "City tingsrätt" with
            // a later line ending in "tingsrätt": "...förberedelse till Malmö"
            const trailingCity = lineText.match(/\s+([A-ZÅÄÖ][a-zåäö]+)\s*$/);
            if (trailingCity) {
              let hasTingsratt = false;
              for (let k = j + 1; k < lines.length; k++) {
                const peek = lines[k].trim();
                if (isContinuationBreak(peek)) break;
                if (/^tingsrätt$/i.test(peek) || /\btingsrätt\s*$/i.test(peek)) { hasTingsratt = true; break; }
              }
              if (hasTingsratt) {
                if (!location) location = `${trailingCity[1]} tingsrätt`;
                lineText = lineText.substring(0, trailingCity.index!).trim();
              }
            }
          }

          const cleaned = stripRoom(lineText);
          if (cleaned && !DAY_ABBREV_REGEX.test(cleaned)) {
            saken = saken ? `${saken} ${cleaned}` : cleaned;
          }
        }
      }

      // Strip location annotations like "(Extern lokal)" from saken
      saken = saken.replace(/\s*\([Ee]xtern\s+lokal\)/g, "").trim();
      // Strip room qualifier annotations that leaked into saken (safety net)
      saken = saken.replace(/\s*\((?:säkerhets|video)?sal(?:en)?\)/gi, "").trim();

      // Strip embedded court name fragments that leaked from the room/location column
      // These appear mid-text when PDF columns are merged, e.g.:
      // "förberedelse till Malmö mordbrand, anstiftan av förberedelse till tingsrätt mordbrand"
      // We strip "CityName tingsrätt" as a pair, then standalone "tingsrätt" fragments
      saken = saken.replace(/\b([A-ZÅÄÖ][a-zåäö]+)\s+tingsrätt\b/g, (match, city) => {
        // Only strip if city looks like a location (not a legal term)
        const legalTerms = ["Huvudförhandling", "Muntlig", "Offentlig", "Enskilt"];
        if (legalTerms.includes(city)) return match;
        if (!location) location = match.trim();
        return " ";
      }).trim();
      // Standalone "tingsrätt" that leaked without its city name
      saken = saken.replace(/\btingsrätt\b/gi, " ").trim();
      // Collapse multiple spaces left after stripping
      saken = saken.replace(/\s{2,}/g, " ").trim();

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
      if (!location) {
        const courtNameAtEnd = saken.match(/\s+(\S+\s+tingsrätt)\s*$/i);
        if (courtNameAtEnd && courtNameAtEnd.index !== undefined) {
          location = courtNameAtEnd[1];
          saken = saken.substring(0, courtNameAtEnd.index).trim();
        }
      }

      // Extract trailing case numbers again (may have been added by continuation text)
      saken = extractTrailingCases(saken, caseNumbers);

      // Clean trailing punctuation from saken
      saken = saken.replace(/^[\s,;:.\-–]+|[\s,;:.\-–]+$/g, "").trim();

      const baseHearing = {
        date,
        time,
        type,
        room: room || "",
        saken: saken || "",
        parties: "",
        ...(externalCourt && { externalCourt }),
        ...(location && { location }),
      };

      // Split multi-case hearings into separate rows (one per case number)
      if (caseNumbers.length > 1) {
        for (const cn of caseNumbers) {
          hearings.push({ ...baseHearing, caseNumber: cn });
        }
      } else {
        hearings.push({ ...baseHearing, caseNumber: caseNumbers[0] || "" });
      }
    }

    return hearings;
  },
};
