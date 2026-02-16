import type { ParserStrategy, RawHearing, ParserContext } from "./types";

/**
 * Parser for Gävle tingsrätt format.
 *
 * pdf-parse produces text with NO whitespace between fields:
 *   to2026-02-0509:00 - 09:30brott mot knivlagenSal 5
 *
 * We preprocess each line to insert spaces at known boundaries,
 * then parse with a standard regex.
 *
 * No case numbers, no explicit hearing type labels.
 * All entries are assumed to be "Huvudförhandling".
 */

const DAY_ABBREVS = "(?:må|ti|on|to|fr|lö|sö)";

/**
 * Matches a hearing line (after preprocessing):
 *   Group 1: date (YYYY-MM-DD)
 *   Group 2: start time (HH:MM)
 *   Group 3: end time (HH:MM)
 *   Group 4: rest of line (crime + room)
 */
const HEARING_LINE_REGEX = new RegExp(
  `^${DAY_ABBREVS}\\s+(\\d{4}-\\d{2}-\\d{2})\\s+(\\d{1,2}:\\d{2})\\s*[-–—]\\s*(\\d{1,2}:\\d{2})\\s+(.+)$`,
  "i"
);

/** Also match lines without day abbreviation prefix (just date) */
const HEARING_LINE_NO_DAY_REGEX =
  /^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})\s+(.+)$/i;

/** Room at end of line (with or without room number for truncated PDFs) */
const ROOM_AT_END_REGEX = /(Sal\s*\d*)\s*$/i;

/**
 * Preprocess a line to insert spaces where pdf-parse glues fields together.
 *
 * Handles patterns like:
 *   to2026-02-05  →  to 2026-02-05
 *   2026-02-0509:00  →  2026-02-05 09:00
 *   09:30brott  →  09:30 brott
 *   knivlagenSal 5  →  knivlagen Sal 5
 */
function normalizeSpacing(line: string): string {
  return line
    // Day abbrev glued to date: to2026 → to 2026
    .replace(/((?:må|ti|on|to|fr|lö|sö))(\d{4})/gi, "$1 $2")
    // Date glued to time: 2026-02-0509:00 → 2026-02-05 09:00
    .replace(/(\d{4}-\d{2}-\d{2})(\d{1,2}:\d{2})/g, "$1 $2")
    // End time glued to text: 09:30brott → 09:30 brott
    .replace(/(\d{1,2}:\d{2})([a-zA-ZåäöÅÄÖ])/g, "$1 $2")
    // Text glued to Sal: knivlagenSal → knivlagen Sal
    .replace(/([a-zA-ZåäöÅÄÖ.,])(Sal)/g, "$1 $2");
}

function parseHearingLine(rest: string): { saken: string; room: string } {
  const roomMatch = rest.match(ROOM_AT_END_REGEX);
  if (roomMatch) {
    const saken = rest.substring(0, roomMatch.index!).trim();
    // Normalize "Sal5" → "Sal 5"
    const room = roomMatch[1].replace(/Sal(\d)/i, "Sal $1").trim();
    if (saken.length > 0) {
      return { saken, room };
    }
  }
  return { saken: rest.trim(), room: "" };
}

function parse(ctx: ParserContext): RawHearing[] {
  const { text } = ctx;
  if (!text.trim()) return [];

  console.log("PDF text first 500 chars:", text.substring(0, 500));

  const lines = text.split(/\r?\n/);
  const hearings: RawHearing[] = [];

  for (const line of lines) {
    const trimmed = normalizeSpacing(line.trim());
    if (!trimmed) continue;

    // Try with day abbreviation prefix first, then without
    let match = trimmed.match(HEARING_LINE_REGEX);
    const dateIdx = 1;
    if (!match) {
      match = trimmed.match(HEARING_LINE_NO_DAY_REGEX);
    }
    if (!match) continue;

    const date = match[dateIdx];
    const startTime = match[dateIdx + 1];
    const endTime = match[dateIdx + 2];
    const rest = match[dateIdx + 3];

    const { saken, room } = parseHearingLine(rest);

    hearings.push({
      date,
      time: `${startTime} - ${endTime}`,
      caseNumber: "",
      type: "Huvudförhandling",
      room,
      saken: saken || "",
      parties: "",
    });
  }

  return hearings;
}

export const formatGavle: ParserStrategy = {
  name: "Gävle",
  formatFamily: "gavle",
  parse,
};
