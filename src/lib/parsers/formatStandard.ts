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
  ROOM_REGEX,
} from "./extractors";

/**
 * Check if a line's first case number match is "real" — not inside parentheses.
 * Parenthesized references like "(återvinning av tredskodom i T 14184-24)"
 * should not be treated as new hearings.
 */
function hasRealCaseNumber(line: string): RegExpMatchArray | null {
  const match = line.match(CASE_NUMBER_REGEX);
  if (!match || match.index === undefined) return null;
  const before = line.substring(0, match.index);
  const after = line.substring(match.index + match[0].length).trim();
  const openParens = (before.match(/\(/g) || []).length;
  const closeParens = (before.match(/\)/g) || []).length;
  // Case number is inside unclosed parentheses
  if (openParens > closeParens) return null;
  // Closing paren right after case number — continuation from previous line's parens
  if (after.startsWith(")")) return null;
  return match;
}

/**
 * Find ALL real (non-parenthesized) case numbers on a line.
 * Returns array with case number text and position info.
 */
function findAllRealCaseNumbers(
  line: string
): Array<{ caseNumber: string; index: number; endIndex: number }> {
  const results: Array<{ caseNumber: string; index: number; endIndex: number }> = [];
  const re = new RegExp(CASE_NUMBER_REGEX.source, "gi");
  let m;
  while ((m = re.exec(line)) !== null) {
    if (m.index === undefined) continue;
    const before = line.substring(0, m.index);
    const after = line.substring(m.index + m[0].length).trim();
    const openParens = (before.match(/\(/g) || []).length;
    const closeParens = (before.match(/\)/g) || []).length;
    if (openParens > closeParens) continue;
    if (after.startsWith(")")) continue;
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

    console.log("PDF text first 500 chars:", text.substring(0, 500));

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
        console.log("Short date matched:", currentDate, "from line:", line);
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
            saken = nextLine.replace(/\s*(?:[Tt]ings)?[Ss]al\s+\S+\s*$/, "").trim();
            sakenFromNextLine = true;
          }
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
