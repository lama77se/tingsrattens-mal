import type { ParserStrategy, RawHearing, ParserContext } from "./types";
import { preprocessLines } from "./extractors";

/**
 * Parser for Gävle tingsrätt format.
 *
 * With unpdf coordinate-based extraction, fields arrive with proper spacing:
 *   to 2026-02-05 09:00 - 09:30 brott mot knivlagen Sal 5
 *
 * No case numbers, no explicit hearing type labels.
 * All entries are assumed to be "Huvudförhandling".
 */

const DAY_ABBREVS = "(?:må|ti|on|to|fr|lö|sö)";

/**
 * Matches a hearing line:
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

  const lines = preprocessLines(text);
  const hearings: RawHearing[] = [];

  for (const line of lines) {

    // Try with day abbreviation prefix first, then without
    let match = line.match(HEARING_LINE_REGEX);
    const dateIdx = 1;
    if (!match) {
      match = line.match(HEARING_LINE_NO_DAY_REGEX);
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
