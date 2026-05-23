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

export const CASE_NUMBER_REGEX = /(?<![A-Za-z\u00c4\u00e4])((?:PMT|FT|[TBKMF\u00c4])\s?\d{1,6}[-\u2013\u2014]\d{2})\b/i;

export const TIME_RANGE_REGEX = /(\d{1,2}:\d{2})\s*[-\u2013\u2014]\s*(\d{1,2}:\d{2})/;

export const TIME_REGEX = /\b(\d{1,2}:\d{2})\b/;

export const ROOM_REGEX = /(?:sessions|tings)?sal\s+(\S+)/i;

export function roomPrefix(matched: string): string {
  const lower = matched.toLowerCase();
  if (lower.startsWith("sessions")) return "Sessionssal";
  if (lower.startsWith("tings")) return "Tingssal";
  return "Sal";
}

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
 * With unpdf coordinate-based extraction, most courts get proper visual rows
 * with correct field spacing. Some PDFs (e.g., Blekinge) store text without
 * inter-field spaces, requiring targeted degluing patterns.
 */
export function preprocessLines(text: string): string[] {
  // Hässleholm's PDF embeds a font whose ToUnicode CMap maps digits 0-9 to
  // U+0267..U+0270 (Latin IPA letters ɧ ɨ ɩ ɪ ɫ ɬ ɭ ɮ ɯ ɰ). Restore real digits.
  const decoded = text.replace(/[ɧ-ɰ]/g, (c) =>
    String(c.charCodeAt(0) - 0x0267)
  );
  const trimmed = decoded
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Norrköping (cell-per-line PDFs): the table layout puts each cell on its
  // own line, with a date prefix like "må 2026-05-" (trailing dash) followed
  // by lines holding the day, time, type, case, saken, and room. Detect this
  // pattern and merge each row's lines into one canonical line so the rest of
  // the parser sees a normal "<day> <date> <times> <type> <case> ..." line.
  const NK_DATE_PREFIX = /^(?:m[åaö]|ti|on|to|fr|lö|sö)\s+\d{4}-\d{2}-\s*$/i;
  let preMerged = trimmed;
  if (trimmed.some((l) => NK_DATE_PREFIX.test(l))) {
    const rows: string[] = [];
    let buffer: string[] | null = null;
    for (const line of trimmed) {
      if (NK_DATE_PREFIX.test(line)) {
        if (buffer) rows.push(buffer.join(" "));
        buffer = [line];
      } else if (buffer) {
        buffer.push(line);
      } else {
        rows.push(line);
      }
    }
    if (buffer) rows.push(buffer.join(" "));
    preMerged = rows;
  }

  // Merge split-date lines (Norrköping-style PDFs).
  // Some PDFs render dates across two rows:
  //   Line N:   "må 2026 - 02 - 09:00 - Huvudförhandling ..."
  //   Line N+1: "16 16:00"
  // The day number (16) belongs to the date (2026-02-16) but ended up on the
  // next line due to table column layout. We detect partial dates (YYYY-MM-
  // followed by a time instead of a day) and merge the day from the next line.
  const SPLIT_DATE_LINE = /^(.*\b\d{4}\s*[-–—]\s*\d{2}\s*[-–—]\s*)(\d{1,2}:\d{2}\b.*)$/;
  const NEXT_LINE_DAY = /^(\d{1,2})\b(.*)/;
  const merged: string[] = [];
  for (let i = 0; i < preMerged.length; i++) {
    const splitMatch = preMerged[i].match(SPLIT_DATE_LINE);
    if (splitMatch && i + 1 < preMerged.length) {
      const nextDayMatch = preMerged[i + 1].match(NEXT_LINE_DAY);
      if (nextDayMatch) {
        // Reconstruct: "må 2026 - 02 - 16 09:00 - 16:00 Huvudförhandling ..."
        const datePart = splitMatch[1]; // "må 2026 - 02 - "
        const day = nextDayMatch[1];     // "16"
        const timeAndRest = splitMatch[2]; // "09:00 - Huvudförhandling ..."
        const nextRemainder = nextDayMatch[2].trim(); // "16:00" or "16:00 (extra text)"
        // Insert end time into the time range if present
        let reconstructed = `${datePart}${day} ${timeAndRest}`;
        // If the next line had an end time (e.g., "16 16:00"), inject it after the start time
        if (nextRemainder) {
          const startTimeMatch = timeAndRest.match(/^(\d{1,2}:\d{2})\s*[-–—]\s*/);
          const endTimeMatch = nextRemainder.match(/^(\d{1,2}:\d{2})\b\s*(.*)/);
          if (startTimeMatch && endTimeMatch) {
            const afterStartTime = timeAndRest.substring(startTimeMatch[0].length);
            reconstructed = `${datePart}${day} ${startTimeMatch[1]} - ${endTimeMatch[1]} ${afterStartTime}`;
            // Append any leftover text from the next line (rare)
            if (endTimeMatch[2]) {
              reconstructed += ` ${endTimeMatch[2]}`;
            }
          }
        }
        merged.push(reconstructed);
        i++; // skip the next line since we merged it
        continue;
      }
    }
    merged.push(preMerged[i]);
  }

  return merged
    .map((line) =>
      line
        // Normalize ISO dates: collapse spaces around dashes and convert en/em-dashes
        // Handles "2026 - 02 - 23" → "2026-02-23"
        .replace(/(\d{4})\s*[-–—]\s*(\d{2})\s*[-–—]\s*(\d{2})/g, "$1-$2-$3")
        // Strip (dag X/Y) annotations
        .replace(/\s*\(dag\s+\d+\/\d+\)/gi, "")
        // Fix split case numbers: when a case number's year part overflowed to
        // the next PDF row and got appended at the line's end after split-date merge.
        // "FT 4434 - fordran Sal 1 25" → "FT 4434 - 25 fordran Sal 1"
        // [^\d\s] ensures the text after the dash starts with a letter (not a digit
        // or space), preventing false matches on complete case numbers like "T 3297 - 25".
        .replace(/((?:PMT|FT|[TBKÄ])\s?\d{1,6}\s*[-–—]\s*)([^\d\s].*?)\s+(\d{2})\s*$/i, "$1$3 $2")
        // Case number spaces around dash: B 784 - 25 / B 784 -25 → B 784-25
        .replace(/((?:PMT|FT|[TBKÄ])\s?\d{1,6})\s*([-–—])\s*(\d{2})/gi, "$1$2$3")
        // Strip pagination footers: "1-81 visas av 81" or "1 - 81 visas av 81"
        .replace(/\s*\d+\s*[-–—]\s*\d+\s+visas\s+av\s+\d+\s*$/, "")
        // --- Deglue patterns for PDFs with missing inter-field spaces ---
        // Day abbreviation before date: "fr20-feb" → "fr 20-feb"
        .replace(/^(m[åaö]|ma|ti|on|to|fr|lö|lo|sö|so)(\d)/i, "$1 $2")
        // ISO date glued to time: "2026-02-0509:00" → "2026-02-05 09:00"
        .replace(/(\d{4}-\d{2}-\d{2})(\d)/g, "$1 $2")
        // Lowercase before time digit: "feb09:00" → "feb 09:00"
        .replace(/([a-zåäö])(\d{1,2}:\d{2})/g, "$1 $2")
        // Time before uppercase: "12:00Huvudförhandling" → "12:00 Huvudförhandling"
        .replace(/(\d{2}:\d{2})([A-ZÅÄÖ])/g, "$1 $2")
        // Digit before lowercase: "25fordran" → "25 fordran" (fixes \b in case regex)
        .replace(/(\d)([a-zåäö])/g, "$1 $2")
        // Lowercase before Sal/Tingssal/Sessionssal: "verksamhetSal 4" → "verksamhet Sal 4"
        .replace(/([a-zåäö.])([ST](?:ingssal|essionssal|al)\s*\d)/g, "$1 $2")
        // Lowercase before case prefix: "HuvudförhandlingB 14" → "Huvudförhandling B 14"
        .replace(/([a-zåäö.])(?=(?:PMT|FT|[TBKÄ])\s?\d)/g, "$1 ")
        // "Hf i förenklad form" glued to saken: "formöverflyttande" → "form överflyttande"
        .replace(/\bform([a-zåäö])/g, "form $1")
    )
    .filter(Boolean);
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
    const prefix = roomPrefix(roomMatch[0]);
    return `${prefix} ${roomMatch[1]}`;
  }

  // Prefer forward lines (room is often after case number) over backward
  for (let j = index + 1; j <= Math.min(lines.length - 1, index + 2); j++) {
    const rm = lines[j].match(ROOM_REGEX);
    if (rm) {
      const prefix = roomPrefix(rm[0]);
      return `${prefix} ${rm[1]}`;
    }
  }

  for (let j = Math.max(0, index - 2); j < index; j++) {
    const rm = lines[j].match(ROOM_REGEX);
    if (rm) {
      const prefix = roomPrefix(rm[0]);
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
  // The PDF header line "Förhandlingar i <court> tingsrätt, vecka N" sometimes
  // leaks into the saken field for hearings that lack a proper saken column.
  // Returning empty here avoids matching the header text as a hearing subject.
  if (
    /^\s*F[öo]rhandlingar\s+i\s+[\wåäöÅÄÖ]+\s+tingsr[äa]tt/i.test(text)
  ) {
    return "";
  }
  let saken = text
    .replace(ROOM_REGEX, "")
    .replace(/\s*(?:sessions|tings)?sal\s+\S+\s*$/i, "")
    .replace(TIME_RANGE_REGEX, "")
    .replace(TIME_REGEX, "")
    .trim();
  for (const ht of HEARING_TYPES) {
    // Word-boundary-aware: don't strip "Förhandling" when it's actually
    // "Förhandlingar" (e.g. in header lines).
    saken = saken
      .replace(
        new RegExp(
          `(?<![a-zåäöA-ZÅÄÖ])${ht}(?![a-zåäöA-ZÅÄÖ])`,
          "gi"
        ),
        ""
      )
      .trim();
  }
  // Strip trailing court name used as location (e.g., "... Attunda tingsrätt"
  // or "...narkotikasmugglingAttunda tr." where the PDF glued the court name
  // onto the saken with no separator and used the "tr." abbreviation).
  // Anchored on a capitalised proper-noun start so the split lands between
  // the lowercase saken text and the court name.
  saken = saken.replace(
    /\s*[A-ZÅÄÖ][a-zåäö]+\s+(?:tingsr[äa]tt|tr\.?)\s*$/,
    ""
  ).trim();
  // Strip a trailing 1-2-digit room number glued directly to the end of saken
  // (Helsingborg's PDF puts "Sal" in a separate column that pdf-parse fuses
  // into the saken text, e.g. "misshandel1", "fordran20", "våldtäkt m.m.13").
  saken = saken.replace(/([A-Za-zÅÄÖåäö.])(\d{1,2})\s*$/, "$1").trim();
  // Strip leading/trailing junk punctuation, but preserve trailing "." so
  // abbreviations like "m.m." survive.
  return saken
    .replace(/^[\s,;:.\-–]+/, "")
    .replace(/[\s,;:\-–]+$/, "")
    .trim();
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
