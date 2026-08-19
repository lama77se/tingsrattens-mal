import type { ParserStrategy, ParserContext, RawHearing } from "./types";
import {
  extractShortDate,
  extractIsoDate,
  extractSwedishDate,
  extractTime,
  extractRoom,
  extractHearingType,
  cleanSaken,
  cleanParties,
  preprocessLines,
  SHORT_DATE_REGEX,
  ISO_DATE_REGEX,
  CASE_NUMBER_REGEX,
  TIME_RANGE_REGEX,
  TIME_REGEX,
  ROOM_REGEX,
} from "./extractors";

// A case number can appear as a *reference* to another case inside a saken
// phrase ("avskilt skadeståndsanspråk i mål B 7028-25 och B 4949-25"), not as a
// new hearing. Swedish schedules introduce such references with "mål"/"mål nr"
// (REF_LEAD); further cases in the list are joined with "och"/"samt"/comma
// (REF_JOIN). The `\b` in REF_LEAD is load-bearing: it must NOT fire inside
// case-type words that also end in "mål" — "Brottmål"/"Tvistemål"/"Familjemål"
// — which legitimately sit right before a real case number in merged rows.
// (Parenthesized references are handled separately by the paren check below.)
const REF_LEAD = /\bm[åa]l(?:\s*nr\.?)?\s*$/i;
const REF_JOIN = /(?:\boch|\bsamt|[,;])\s*$/i;

/**
 * Check if a line has a "real" case number — one that starts a new hearing,
 * not a parenthesized/prose reference to another case ("...i mål T 14184-24").
 */
function hasRealCaseNumber(line: string): RegExpMatchArray | null {
  return findAllRealCaseNumbers(line).length > 0 ? line.match(CASE_NUMBER_REGEX) : null;
}

/**
 * Find ALL real case numbers on a line — excluding parenthesized cross-
 * references and in-prose references introduced by "i mål ... och ...".
 * Returns array with case number text and position info.
 */
function findAllRealCaseNumbers(
  line: string
): Array<{ caseNumber: string; index: number; endIndex: number }> {
  const results: Array<{ caseNumber: string; index: number; endIndex: number }> = [];
  const re = new RegExp(CASE_NUMBER_REGEX.source, "gi");
  let m;
  let sawReference = false;
  while ((m = re.exec(line)) !== null) {
    if (m.index === undefined) continue;
    const before = line.substring(0, m.index);
    const after = line.substring(m.index + m[0].length).trim();
    const openParens = (before.match(/\(/g) || []).length;
    const closeParens = (before.match(/\)/g) || []).length;
    if (openParens > closeParens) continue;
    if (after.startsWith(")")) continue;
    // In-prose case reference ("...i mål B 7028-25 och B 4949-25") — the case
    // number describes the subject, it is not a hearing of its own.
    if (REF_LEAD.test(before) || (sawReference && REF_JOIN.test(before))) {
      sawReference = true;
      continue;
    }
    results.push({
      caseNumber: m[1],
      index: m.index,
      endIndex: m.index + m[0].length,
    });
  }
  return results;
}

/**
 * Standard format parser — handles courts with multi-line date/case/parties layout (Alingsås, Attunda, Blekinge).
 * Exact same extraction logic as the original monolithic parseCourtPdf.
 */
export const formatStandard: ParserStrategy = {
  name: "Standard",
  formatFamily: "standard",

  parse(ctx: ParserContext): RawHearing[] {
    const { text } = ctx;
    if (!text || text.trim().length === 0) return [];


    let lines = preprocessLines(text);

    // Detect tabular "Sal" column header (e.g., Helsingborg):
    // header ends with "Sal", data rows have bare room numbers at end.
    // Insert "Sal " prefix so extractRoom/cleanSaken work correctly.
    // Skip lines that already contain a room pattern (e.g., Alingsås "...Sal 2").
    if (lines.some((l) => /\bSal\s*$/i.test(l))) {
      lines = lines.map((l) =>
        /\bSal\s*$/i.test(l) || ROOM_REGEX.test(l)
          ? l
          : l.replace(/\s(\d{1,3})\s*$/, " Sal $1"),
      );
    }

    const hearings: RawHearing[] = [];
    let currentDate = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // --- Date extraction: try short date FIRST, then ISO, then Swedish long ---
      const shortDate = extractShortDate(line);
      if (shortDate) {
        currentDate = shortDate;
      } else {
        const isoDate = extractIsoDate(line);
        if (isoDate) {
          currentDate = isoDate;
        } else {
          const swedishDate = extractSwedishDate(line);
          if (swedishDate) currentDate = swedishDate;
        }
      }

      // Find ALL real case numbers on this line (handles merged PDF rows)
      const allCases = findAllRealCaseNumbers(line);
      if (allCases.length === 0) continue;

      // If current line has no date but previous line does, grab it
      if (i > 0 && !line.match(SHORT_DATE_REGEX)) {
        const prevShortDate = extractShortDate(lines[i - 1]);
        if (prevShortDate) {
          currentDate = prevShortDate;
        }
      }

      // Shared extractions from the full line (time, room, type)
      const lineTime = extractTime(line, i > 0 ? lines[i - 1] : undefined);
      const lineRoom = extractRoom(lines, i);
      const lineType = extractHearingType(lines, i);

      for (let c = 0; c < allCases.length; c++) {
        const { caseNumber, endIndex } = allCases[c];
        const isLast = c === allCases.length - 1;

        // First case on line gets the extracted time; spilled cases lose it
        const time = c === 0 ? lineTime : "";

        // Extract "saken" — text after this case number up to the next one
        let saken = "";
        const segmentEnd = isLast ? line.length : allCases[c + 1].index;
        const afterCase = line.substring(endIndex, segmentEnd).trim()
          .replace(/^(?:m\.?\s*fl\.?|med\s+flera)\s*/i, "").trim();

        if (afterCase.length > 2) {
          saken = cleanSaken(afterCase);
        }

        // If no saken and this is the last case on line, check next line
        let sakenFromNextLine = false;
        if (!saken && isLast && i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          if (
            nextLine.length > 1 &&
            !hasRealCaseNumber(nextLine) &&
            !nextLine.match(SHORT_DATE_REGEX) &&
            !nextLine.match(ISO_DATE_REGEX)
          ) {
            saken = cleanSaken(nextLine);
            sakenFromNextLine = true;
          }
        }

        // If still no saken and the line is a bare case number (no time/date),
        // inherit from previous hearing (secondary case on its own row, e.g.
        // Hälsinglands). Conditions:
        // - previous hearing must have saken (don't propagate empty);
        // - previous hearing must share this case's time slot. Without the
        //   time match, a bare case# that just happens to follow another
        //   hearing (different time) wrongly inherits — e.g. Halmstad's
        //   B 1216-26 inheriting B 488-26's saken.
        if (
          !saken &&
          hearings.length > 0 &&
          hearings[hearings.length - 1].saken &&
          hearings[hearings.length - 1].time === time &&
          !line.match(TIME_RANGE_REGEX) &&
          !line.match(TIME_REGEX)
        ) {
          saken = hearings[hearings.length - 1].saken;
        }

        // Skip rows that have no time and no saken — these are continuation-day
        // markers / bare case-number lists that carry no new scheduling info.
        if (!time && !saken) {
          continue;
        }

        // Extract parties only for the last case on the line
        let parties = "";
        if (isLast) {
          const partiesLineIndex = sakenFromNextLine ? i + 2 : i + 1;
          if (partiesLineIndex < lines.length && !hasRealCaseNumber(lines[partiesLineIndex])) {
            const pLine = lines[partiesLineIndex].trim();
            if (pLine.length > 2 && !pLine.match(SHORT_DATE_REGEX) && !pLine.match(ISO_DATE_REGEX)) {
              if (!pLine.match(TIME_RANGE_REGEX) || pLine.match(CASE_NUMBER_REGEX)) {
                parties = cleanParties(pLine);
              }
            }
          }
        }

        hearings.push({
          date: currentDate,
          time,
          caseNumber,
          type: lineType,
          room: lineRoom,
          saken,
          parties,
        });
      }
    }

    return hearings;
  },
};
