import type { ParserStrategy, RawHearing, ParserContext } from "./types";

/**
 * Parser for Gävle tingsrätt format.
 *
 * Three layouts are supported. All entries are assumed to be "Huvudförhandling".
 *
 * V1 (single-line per hearing, no case numbers):
 *   to 2026-02-05 09:00 - 09:30 brott mot knivlagen Sal 5
 *
 * V2 (multi-line per hearing, with case numbers):
 *   grovt hemfridsbott m mSal 5må2026-04-2009:00 -
 *   12:00
 *   B 4490-24
 *
 * V3 (2026-06+, pipe-separated with stateful date/room from headers):
 *   Schema - Förhandlingar (Sal 5)         ← room from header
 *   Torsdag 4 juni 2026                    ← Swedish weekday + date
 *   09:00–10:00 | B 1964-26 | Brott mot trafikförordningen
 *   10:00–11:15 | B 2002-26 | Ringa stöld
 */

const DAY_ABBREVS = "må|ti|on|to|fr|lö|sö";

const SWEDISH_MONTHS: Record<string, string> = {
  januari: "01",
  februari: "02",
  mars: "03",
  april: "04",
  maj: "05",
  juni: "06",
  juli: "07",
  augusti: "08",
  september: "09",
  oktober: "10",
  november: "11",
  december: "12",
};

/** V3 header: `Schema - Förhandlingar (Sal 5)` — sets the default room. */
const V3_HEADER_ROOM_RE =
  /^Schema\s*[-–—]\s*Förhandlingar\s*\(\s*(Sal\s*\d+)\s*\)\s*$/i;

/** V3 Swedish date line: `Torsdag 4 juni 2026` — sets the current date. */
const V3_DATE_RE = new RegExp(
  `^(?:Måndag|Tisdag|Onsdag|Torsdag|Fredag|Lördag|Söndag)\\s+(\\d{1,2})\\s+(${Object.keys(SWEDISH_MONTHS).join("|")})\\s+(\\d{4})\\s*$`,
  "i"
);

/** V3 hearing: `09:00–10:00 | B 1964-26 | Brott mot trafikförordningen`. */
const V3_HEARING_RE =
  /^(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})\s*\|\s*([^|]+?)\s*\|\s*(.+)$/;

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

  // V3 stateful context: date is set by a Swedish date line, room by the
  // `Schema - Förhandlingar (Sal N)` header. Both persist across blank lines.
  let v3Date = "";
  let v3Room = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // --- V3: header carrying the default room ---
    const v3Header = line.match(V3_HEADER_ROOM_RE);
    if (v3Header) {
      v3Room = v3Header[1].replace(/Sal\s*(\d)/i, "Sal $1");
      continue;
    }

    // --- V3: Swedish date line sets the current date ---
    const v3DateMatch = line.match(V3_DATE_RE);
    if (v3DateMatch) {
      const day = v3DateMatch[1].padStart(2, "0");
      const month = SWEDISH_MONTHS[v3DateMatch[2].toLowerCase()];
      const year = v3DateMatch[3];
      v3Date = `${year}-${month}-${day}`;
      continue;
    }

    // --- V3: pipe-separated hearing using stateful date + room ---
    const v3Hearing = v3Date ? line.match(V3_HEARING_RE) : null;
    if (v3Hearing) {
      const startTime = v3Hearing[1];
      const endTime = v3Hearing[2];
      // Joined cases like "B 1882-26 & B 2066-26" stay as one hearing
      // (one time slot, one room) — the court consolidates them deliberately.
      const caseNumber = v3Hearing[3].replace(/\s+/g, " ").trim();
      const saken = v3Hearing[4].replace(/\s+/g, " ").trim();
      hearings.push({
        date: v3Date,
        time: `${startTime} - ${endTime}`,
        caseNumber,
        type: "Huvudförhandling",
        room: v3Room,
        saken,
        parties: "",
      });
      continue;
    }

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
