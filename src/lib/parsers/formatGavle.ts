import type { ParserStrategy, RawHearing, ParserContext } from "./types";

/**
 * Parser for Gävle tingsrätt format.
 *
 * Two layouts are supported:
 *
 * OLD (single-line per hearing, no case numbers):
 *   to 2026-02-05 09:00 - 09:30 brott mot knivlagen Sal 5
 *
 * NEW (multi-line per hearing, with case numbers):
 *   grovt hemfridsbott m mSal 5må2026-04-2009:00 -
 *   12:00
 *   B 4490-24
 *
 *   or, when "saken" wraps across lines:
 *   brott mot lagen om förbud beträffande
 *   knivar och andra farliga föremål
 *   Sal 5
 *   to2026-04-1609:00 -
 *   09:45
 *   B 1273-26
 *
 * All entries are assumed to be "Huvudförhandling".
 */

const DAY_ABBREVS = "må|ti|on|to|fr|lö|sö";

/** Anchor line with end time on the SAME line (old format). */
const INLINE_ANCHOR_RE = new RegExp(
  `(?:(?:${DAY_ABBREVS})\\s*)?(\\d{4}-\\d{2}-\\d{2})\\s*(\\d{1,2}:\\d{2})\\s*[-–—]\\s*(\\d{1,2}:\\d{2})\\b`,
  "i"
);

/** Anchor line with end time on a FOLLOWING line (new format): dash is at end. */
const TRAILING_ANCHOR_RE = new RegExp(
  `(?:(?:${DAY_ABBREVS})\\s*)?(\\d{4}-\\d{2}-\\d{2})\\s*(\\d{1,2}:\\d{2})\\s*[-–—]\\s*$`,
  "i"
);

/** Detects any line that contains a hearing anchor (date+time+dash). */
const ANY_ANCHOR_RE = new RegExp(
  `\\d{4}-\\d{2}-\\d{2}\\s*\\d{1,2}:\\d{2}\\s*[-–—]`
);

const END_TIME_RE = /^\d{1,2}:\d{2}$/;
const CASE_NUMBER_RE = /^[A-ZÅÄÖ]+\s+\d+\s*-\s*\d+$/i;
const ROOM_AT_END_RE = /^(.*?)\s*(Sal\s*\d*)\s*$/i;

function extractSakenAndRoom(text: string): { saken: string; room: string } {
  const m = text.match(ROOM_AT_END_RE);
  if (m) {
    const saken = m[1].replace(/\s+/g, " ").trim();
    const room = m[2].replace(/Sal\s*(\d)/i, "Sal $1").trim();
    return { saken, room };
  }
  return { saken: text.replace(/\s+/g, " ").trim(), room: "" };
}

function isBoundaryLine(line: string): boolean {
  if (!line) return true;
  if (END_TIME_RE.test(line)) return true;
  if (CASE_NUMBER_RE.test(line)) return true;
  if (ANY_ANCHOR_RE.test(line)) return true;
  return false;
}

function parse(ctx: ParserContext): RawHearing[] {
  const { text } = ctx;
  if (!text.trim()) return [];

  // Preserve blank lines so they act as hearing separators.
  const lines = text.split("\n").map((l) => l.trim());
  const hearings: RawHearing[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // --- Old layout: end time on same line ---
    const inline = line.match(INLINE_ANCHOR_RE);
    if (inline) {
      const date = inline[1];
      const startTime = inline[2];
      const endTime = inline[3];
      const afterIdx = (inline.index ?? 0) + inline[0].length;
      const after = line.substring(afterIdx).trim();
      const { saken, room } = extractSakenAndRoom(after);
      hearings.push({
        date,
        time: `${startTime} - ${endTime}`,
        caseNumber: "",
        type: "Huvudförhandling",
        room,
        saken,
        parties: "",
      });
      continue;
    }

    // --- New layout: dash at end, end time on following line ---
    const trailing = line.match(TRAILING_ANCHOR_RE);
    if (!trailing) continue;

    const date = trailing[1];
    const startTime = trailing[2];
    const beforeDate = line.substring(0, trailing.index ?? 0).trim();

    let saken = "";
    let room = "";
    if (beforeDate) {
      ({ saken, room } = extractSakenAndRoom(beforeDate));
    } else {
      // Look back for saken + Sal wrapped across lines
      const preceding: string[] = [];
      for (let j = i - 1; j >= 0; j--) {
        const prev = lines[j];
        if (isBoundaryLine(prev)) break;
        preceding.unshift(prev);
      }
      if (preceding.length) {
        ({ saken, room } = extractSakenAndRoom(preceding.join(" ")));
      }
    }

    // End time: next non-blank line
    let k = i + 1;
    while (k < lines.length && !lines[k]) k++;
    let endTime = "";
    if (k < lines.length && END_TIME_RE.test(lines[k])) {
      endTime = lines[k];
      k++;
    }

    // Case number: next non-blank line
    while (k < lines.length && !lines[k]) k++;
    let caseNumber = "";
    if (k < lines.length && CASE_NUMBER_RE.test(lines[k])) {
      caseNumber = lines[k].replace(/\s+/g, " ").trim();
      k++;
    }

    // Newer Gävle layout puts saken+Sal AFTER the case number instead of
    // before the anchor. If saken still empty, look forward one non-blank,
    // non-boundary line.
    if (!saken) {
      while (k < lines.length && !lines[k]) k++;
      if (k < lines.length && !isBoundaryLine(lines[k])) {
        const extracted = extractSakenAndRoom(lines[k]);
        saken = extracted.saken;
        if (!room) room = extracted.room;
      }
    }

    hearings.push({
      date,
      time: endTime ? `${startTime} - ${endTime}` : startTime,
      caseNumber,
      type: "Huvudförhandling",
      room,
      saken,
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
