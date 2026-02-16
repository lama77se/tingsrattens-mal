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
} from "./extractors";

/**
 * Standard format parser — handles the current 4 courts (Alingsås, Attunda, Blekinge, Solna).
 * Exact same extraction logic as the original monolithic parseCourtPdf.
 */
export const formatStandard: ParserStrategy = {
  name: "Standard",
  formatFamily: "standard",

  parse(ctx: ParserContext): RawHearing[] {
    const { text } = ctx;
    if (!text || text.trim().length === 0) return [];

    console.log("PDF text first 500 chars:", text.substring(0, 500));

    const lines = preprocessLines(text);
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

      // Look for case numbers — this signals a hearing entry
      const caseMatch = line.match(CASE_NUMBER_REGEX);
      if (!caseMatch) continue;

      const caseNumber = caseMatch[1];

      // If current line has no date but previous line does, grab it
      if (i > 0 && !line.match(SHORT_DATE_REGEX)) {
        const prevShortDate = extractShortDate(lines[i - 1]);
        if (prevShortDate) {
          currentDate = prevShortDate;
        }
      }

      // Extract time
      const time = extractTime(line, i > 0 ? lines[i - 1] : undefined);

      // Extract room
      const room = extractRoom(lines, i);

      // Detect hearing type
      const type = extractHearingType(lines, i);

      // Extract "saken" — text after case number on the same line
      let saken = "";
      const afterCase = line.substring(line.indexOf(caseNumber) + caseNumber.length).trim();
      if (afterCase.length > 2) {
        saken = cleanSaken(afterCase);
      }

      // If no saken on case number line, next line is saken
      let sakenFromNextLine = false;
      if (!saken && i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (
          nextLine.length > 1 &&
          !nextLine.match(CASE_NUMBER_REGEX) &&
          !nextLine.match(SHORT_DATE_REGEX) &&
          !nextLine.match(ISO_DATE_REGEX)
        ) {
          saken = nextLine.replace(/\s*(?:[Tt]ings)?[Ss]al\s+\S+\s*$/, "").trim();
          sakenFromNextLine = true;
        }
      }

      // Extract parties from the line AFTER saken
      let parties = "";
      const partiesLineIndex = sakenFromNextLine ? i + 2 : i + 1;
      if (partiesLineIndex < lines.length && !lines[partiesLineIndex].match(CASE_NUMBER_REGEX)) {
        const pLine = lines[partiesLineIndex].trim();
        if (pLine.length > 2 && !pLine.match(SHORT_DATE_REGEX) && !pLine.match(ISO_DATE_REGEX)) {
          // Don't use as parties if it looks like a new hearing line (has time pattern)
          if (!pLine.match(TIME_RANGE_REGEX) || pLine.match(CASE_NUMBER_REGEX)) {
            parties = cleanParties(pLine);
          }
        }
      }

      hearings.push({
        date: currentDate,
        time,
        caseNumber,
        type,
        room,
        saken,
        parties,
      });
    }

    return hearings;
  },
};
