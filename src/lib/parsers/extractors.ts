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

export const FLERA_SAKFRAGOR_REGEX = /m\s*\.?\s*m\s*\.?\s*$/i;

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
 * Pre-process PDF text into clean, trimmed, non-empty lines with case number prefix fixes.
 *
 * Handles two opposite pdf-parse failure modes:
 * 1. Field-per-line splitting: date, time, type on separate lines → rejoin into hearing lines
 * 2. Page boundary concatenation: multiple hearings on one line → split apart
 */
export function preprocessLines(text: string): string[] {
  const rawLines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Phase 1: Rejoin tokens split across lines by pdf-parse
  // "2026-02-" + "16" → "2026-02-16", "09:00 -" + "16:00" → "09:00 - 16:00"
  const tokenJoined: string[] = [];
  for (const line of rawLines) {
    const prev = tokenJoined.length > 0 ? tokenJoined[tokenJoined.length - 1] : "";
    if (/\d{4}[-–—]\d{2}[-–—]$/.test(prev) && /^\d{1,2}$/.test(line)) {
      tokenJoined[tokenJoined.length - 1] += line;
    } else if (/\d{1,2}:\d{2}\s*[-–—]\s*$/.test(prev) && /^\d{1,2}:\d{2}/.test(line)) {
      tokenJoined[tokenJoined.length - 1] += " " + line;
    } else {
      tokenJoined.push(line);
    }
  }

  // Phase 1.5: Split page boundary concatenations within lines.
  // pdf-parse can join content across page breaks without newlines, producing lines like
  // "konkurs Sal 1ti 2026-02-10" or "narkotikabrott on 2026-02-11 09:00..."
  // Split before embedded day-abbreviation + date patterns (only when preceded by non-letter).
  const pageSplit: string[] = [];
  for (const line of tokenJoined) {
    const split = line.replace(
      /([\d\s.,;:)])\s*((?:må|ma|ti|on|to|fr|lö|lo|sö|so))\s*(\d{4}[-–—]\d{2}[-–—]\d{2})/gi,
      "$1\n$2 $3"
    );
    for (const part of split.split("\n")) {
      const trimmed = part.trim();
      if (trimmed) pageSplit.push(trimmed);
    }
  }

  // Phase 2: Rejoin hearing fields split across lines (field-per-line PDF structure).
  // DAY_DATE_RE is checked BEFORE COMPLETE_HEARING_RE because Phase 1 can join
  // day+date+time onto one line (e.g., "ti 2026-02-10 09:00 - 10:00") while the
  // hearing type and saken remain on subsequent lines.  Pushing such a line directly
  // would orphan those fields; using a buffer accumulates them correctly.
  // Lines matching COMPLETE_HEARING_RE without a day abbreviation (e.g., from Phase 4
  // transforms) are still pushed directly since they lack subsequent field lines.
  const DAY_DATE_RE = /^(?:må|ma|ti|on|to|fr|lö|lo|sö|so)\s*\d{4}[-–—]\d{2}[-–—]\d{2}/i;
  const COMPLETE_HEARING_RE = /\d{4}[-–—]\d{2}[-–—]\d{2}\s*\d{1,2}:\d{2}\s*[-–—]\s*\d{1,2}:\d{2}/;
  const TIME_RANGE_RE = /^\d{1,2}:\d{2}\s*[-–—]\s*\d{1,2}:\d{2}/;
  const HAS_TIME_RE = /\d{1,2}:\d{2}\s*[-–—]\s*\d{1,2}:\d{2}/;
  // Page headers that appear at page boundaries — flush buffer and discard
  const PAGE_HEADER_RE = /^(uppropslista|dag\s*datum|datum\s+tid|förhandlingar\b|listan\s)/i;

  // A line ending with a room (Sal/Tingssal + number) is truly complete.
  const ENDS_WITH_ROOM_RE = /(?:Tings)?[Ss]al\s+\S+\s*$/;

  const hearingJoined: string[] = [];
  let buffer = "";
  for (const line of pageSplit) {
    if (PAGE_HEADER_RE.test(line)) {
      // Page header — flush buffer (don't include header in output)
      if (buffer) { hearingJoined.push(buffer); buffer = ""; }
      continue;
    }
    if (DAY_DATE_RE.test(line)) {
      // Day abbreviation + date line.  Determine whether the hearing is fully
      // contained on THIS line (push directly) or continues on subsequent lines
      // (buffer to accumulate).  A line ending with a room is truly self-contained;
      // otherwise, saken/room/extra case numbers may follow on subsequent lines.
      const cm = line.match(COMPLETE_HEARING_RE);
      if (cm && ENDS_WITH_ROOM_RE.test(line)) {
        // Has date+time AND ends with room — truly complete, push directly
        if (buffer) { hearingJoined.push(buffer); buffer = ""; }
        hearingJoined.push(line);
      } else {
        // Needs accumulation (no room at end, or no time yet)
        if (buffer) hearingJoined.push(buffer);
        buffer = line;
      }
    } else if (COMPLETE_HEARING_RE.test(line)) {
      // Date + time without day abbreviation — self-contained, output directly
      if (buffer) { hearingJoined.push(buffer); buffer = ""; }
      hearingJoined.push(line);
    } else if (TIME_RANGE_RE.test(line) && buffer && HAS_TIME_RE.test(buffer)) {
      // Time range but buffer already has one — new hearing on same day
      hearingJoined.push(buffer);
      buffer = line;
    } else if (buffer) {
      buffer += " " + line;
    } else {
      hearingJoined.push(line);
    }
  }
  if (buffer) hearingJoined.push(buffer);

  // Phase 3: Re-join bare room numbers split across lines at page boundaries:
  // "...Sal" + "10" → "...Sal 10"
  const joined: string[] = [];
  for (const line of hearingJoined) {
    if (
      /^\d{1,3}$/.test(line) &&
      joined.length > 0 &&
      /(?:Tings)?[Ss]al\s*$/i.test(joined[joined.length - 1])
    ) {
      joined[joined.length - 1] += " " + line;
    } else {
      joined.push(line);
    }
  }

  // Phase 4: Per-line transforms
  return joined.map((line) =>
      line
        // Normalize en-dashes/em-dashes to hyphens in ISO dates (some PDFs use –)
        .replace(/(\d{4})[-–—](\d{2})[-–—](\d{2})/g, "$1-$2-$3")
        // pdf-parse gluing fixes: insert spaces at known boundaries
        // Day abbreviation glued to date: to2026 → to 2026, ma16 → ma 16
        .replace(/((?:må|ma|ti|on|to|fr|lö|lo|sö|so))(\d)/gi, "$1 $2")
        // Short date to ISO: 17-feb → 2026-02-17 (must come before date-time glue fix)
        .replace(/\b(\d{1,2})[-–—](jan|feb|mar|apr|maj|jun|jul|aug|sep|okt|nov|dec)/gi, (_m, day, month) => {
          const mm = SHORT_MONTH_MAP[month.toLowerCase()];
          return mm ? `${new Date().getFullYear()}-${mm}-${String(day).padStart(2, "0")}` : _m;
        })
        // Strip (dag X/Y) annotations early — before date-time glue fix, because
        // stripping "(dag 1/2)" between date and time creates new adjacency: 2026-02-1709:00
        .replace(/\s*\(dag\s+\d+\/\d+\)/gi, "")
        // Date glued to time: 2026-02-1609:00 → 2026-02-16 09:00
        .replace(/(\d{4}-\d{2}-\d{2})(\d{1,2}:\d{2})/g, "$1 $2")
        // Month abbreviation glued to time: feb09:00 → feb 09:00
        .replace(/(jan|feb|mar|apr|maj|jun|jul|aug|sep|okt|nov|dec)(\d{1,2}:\d{2})/gi, "$1 $2")
        // Time glued to text: 09:45Huvudförhandling → 09:45 Huvudförhandling
        .replace(/(\d{1,2}:\d{2})([a-zA-ZåäöÅÄÖ])/g, "$1 $2")
        // Text glued to case number prefix ((?<!F) prevents splitting "FT"; (?<!PM) prevents splitting "PMT")
        .replace(/([a-zA-ZåäöÅÄÖ])((?:PMT|FT|(?<!(?:F|PM))[TBKÄ])\s?\d{1,6}[-–—]\d{2})/gi, "$1 $2")
        // Case number glued to text
        .replace(/(\d{2}[-–—]\d{2})([a-zA-ZåäöÅÄÖ])/g, "$1 $2")
        // Text glued to Sal/Tingssal: knivlagenSal → knivlagen Sal, textTingssal → text Tingssal
        .replace(/([a-zA-ZåäöÅÄÖ.,)])(Tingssal|Sal)/g, "$1 $2")
        // Text glued to court name: konkursUppsala tingsrätt → konkurs Uppsala tingsrätt
        .replace(/([a-zåäö.])([A-ZÅÄÖ]\w*\s+tingsrätt)/g, "$1 $2")
        // Case number space before dash: B 784 -25 → B 784-25
        .replace(/([TBFTKÄ]\s?\d{1,6})\s+([-–—]\d{2})/gi, "$1$2")
        // Bare sal number glued to text at end of line: Konkurs21 → Konkurs Sal 21, m.m.10 → m.m. Sal 10
        .replace(/([a-zA-ZåäöÅÄÖ.])(\d{1,2})$/, "$1 Sal $2")
        // Strip pagination footers: "1-81 visas av 81" (Swedish "X-Y shown of Z")
        .replace(/\s*\d+[-–—]\d+\s+visas\s+av\s+\d+\s*$/, "")
    ).flatMap((line) => {
      // Phase 5: Split lines containing multiple hearings concatenated together.
      // Step 1: Split before day abbreviation + ISO date (cross-day page boundaries).
      const dayParts = line.split(/\s+(?=(?:må|ma|ti|on|to|fr|lö|lo|sö|so)\s+\d{4}-\d{2}-\d{2})/i);
      // Step 2: Split each part at subsequent time ranges (2nd+ occurrence).
      // Handles same-day hearings on one line: "09:00-10:00 Type1 saken1 Sal 1 09:00-11:00 Type2 saken2 Sal 2"
      return dayParts.flatMap((part) => {
        const timeRe = /\d{1,2}:\d{2}\s*[-–—]\s*\d{1,2}:\d{2}/g;
        let match;
        let first = true;
        const positions: number[] = [];
        while ((match = timeRe.exec(part)) !== null) {
          if (first) { first = false; continue; }
          positions.push(match.index);
        }
        if (positions.length === 0) return [part];
        const result: string[] = [];
        let start = 0;
        for (const pos of positions) {
          result.push(part.substring(start, pos).trim());
          start = pos;
        }
        result.push(part.substring(start).trim());
        return result.filter(Boolean);
      });
    });
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
