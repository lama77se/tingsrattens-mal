import type { ParserStrategy, RawHearing, ParserContext } from "./types";

/**
 * Parser for Gävle tingsrätt format.
 *
 * Each hearing is a single line:
 *   <day> <YYYY-MM-DD> <HH:MM> - <HH:MM> <crime_description>   Sal <N>
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

/** Room at end of line, separated by 2+ spaces or clearly at end */
const ROOM_REGEX = /\s{2,}(Sal\s+\d+)\s*$/i;

/** Room merged into text (PDF corruption): e.g. "ochSaanld5ra" */
const ROOM_FALLBACK_REGEX = /(Sal\s+\d+)\s*$/i;

function parseHearingLine(rest: string): { saken: string; room: string } {
  // Try to extract room separated by multiple spaces first
  const roomMatch = rest.match(ROOM_REGEX);
  if (roomMatch) {
    return {
      saken: rest.substring(0, roomMatch.index!).trim(),
      room: roomMatch[1].trim(),
    };
  }

  // Fallback: room at end with single space
  const fallback = rest.match(ROOM_FALLBACK_REGEX);
  if (fallback) {
    const before = rest.substring(0, fallback.index!).trim();
    // Only use if there's actual saken text before the room
    if (before.length > 0) {
      return { saken: before, room: fallback[1].trim() };
    }
  }

  return { saken: rest.trim(), room: "" };
}

function parse(ctx: ParserContext): RawHearing[] {
  const { text } = ctx;
  if (!text.trim()) return [];

  const lines = text.split(/\r?\n/);
  const hearings: RawHearing[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Try with day abbreviation prefix first, then without
    let match = trimmed.match(HEARING_LINE_REGEX);
    let dateIdx = 1;
    if (!match) {
      match = trimmed.match(HEARING_LINE_NO_DAY_REGEX);
      dateIdx = 1;
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
      type: "Huvudförhandling", // Gävle doesn't specify type
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
