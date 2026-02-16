import type { ParserStrategy, ParserContext, RawHearing } from "./types";
import {
  normalize,
  preprocessLines,
  NORMALIZED_TYPES,
  ROOM_REGEX,
} from "./extractors";

/**
 * Regex matching a hearing line: YYYY-MM-DD HH:MM - HH:MM <rest>
 */
const HEARING_LINE_REGEX = /(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})\s+(.*)/;

/**
 * Day abbreviations (Swedish) — standalone lines to skip.
 * Includes common PDF encoding variants (må → mö, etc.)
 */
const DAY_ABBREV_REGEX = /^(m[åaö]|ti|on|to|fr|lö|sö)$/i;

/**
 * Aliases mapping non-standard hearing type names to canonical types.
 */
const TYPE_ALIASES: Record<string, string> = {
  "fortsatt hf": "Huvudförhandling",
};

// Pre-sorted longest first so "Muntlig förberedelse" matches before partial hits
const SORTED_TYPES = [...NORMALIZED_TYPES].sort(
  (a, b) => b.normalized.length - a.normalized.length
);

function extractTypeFromText(text: string): { type: string; remainder: string } {
  const normalized = normalize(text);

  // Check aliases first (longest alias first)
  for (const [alias, canonical] of Object.entries(TYPE_ALIASES)) {
    const normalizedAlias = normalize(alias);
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
 * Tabular format parser — for courts like Eksjö that publish table-style PDFs
 * with columns: Dag, Datum, Tid, Mötestyp, Saken, Sal.
 *
 * No case numbers or parties in this format.
 */
export const formatTabular: ParserStrategy = {
  name: "Tabular",
  formatFamily: "tabular",

  parse(ctx: ParserContext): RawHearing[] {
    const { text } = ctx;
    if (!text || text.trim().length === 0) return [];

    console.log("PDF text first 500 chars:", text.substring(0, 500));

    const lines = preprocessLines(text);
    const hearings: RawHearing[] = [];

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(HEARING_LINE_REGEX);
      if (!match) continue;

      const date = match[1];
      const time = `${match[2]} - ${match[3]}`;
      const rest = match[4].trim();

      // Extract hearing type from the text after the time range
      const { type, remainder } = extractTypeFromText(rest);

      // Extract room and saken from the remainder
      let room = extractRoomFromText(remainder);
      let saken = stripRoom(remainder);

      // Always check subsequent lines for continuation text
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j];
        // Stop at the next hearing line, day abbreviation, or header
        if (nextLine.match(HEARING_LINE_REGEX) || DAY_ABBREV_REGEX.test(nextLine)) break;
        if (nextLine.length > 1) {
          if (!room) room = extractRoomFromText(nextLine);
          const cleaned = stripRoom(nextLine);
          if (cleaned && !DAY_ABBREV_REGEX.test(cleaned)) {
            saken = saken ? `${saken} ${cleaned}` : cleaned;
          }
        }
      }

      // Clean trailing punctuation from saken
      saken = saken.replace(/^[\s,;:.\-–]+|[\s,;:.\-–]+$/g, "").trim();

      hearings.push({
        date,
        time,
        caseNumber: "",
        type,
        room: room || "",
        saken: saken || "",
        parties: "",
      });
    }

    return hearings;
  },
};
