import type { ParserStrategy, ParserContext, RawHearing } from "./types";
import {
  cleanSaken,
  CASE_NUMBER_REGEX,
  SHORT_DATE_REGEX,
  extractShortDate,
  extractIsoDate,
  extractSwedishDate,
} from "./extractors";

/**
 * Positional format parser — consumes text produced by the Y-grouped renderer
 * in `api/_lib/renderPositional.cjs`. Each input line corresponds to one
 * visual PDF row, with TABs separating column items.
 *
 * Used for courts whose default pdf-parse linearisation desyncs case# / saken
 * columns when a saken cell wraps to a second physical row (Halmstad, Mora),
 * and for courts whose schedule omits a Målnummer column entirely so we have
 * to anchor hearing rows on the time-range column instead (Södertälje).
 */

const ISO_DATE_RE = /\b(\d{4}-\d{2}-\d{2})\b/;
const TIME_RANGE_RE = /\b(\d{1,2}[:.]\d{2})\s*-\s*(\d{1,2}[:.]\d{2})\b/;
const SAL_RE = /\bSal\s+\S+/i;
// Captures column-as-location values like "Attunda tingsrätt" or
// "Stockholms tingsrätt" sitting in the Sal column when a court borrows
// another court's facility (Södertälje uses Attunda's rooms for some cases).
const EXTERNAL_COURT_AT_END_RE = /([A-ZÅÄÖ][a-zåäö]+\s+tingsrätt)\s*$/;
// "Edgångssmtr" = Edgångssammanträde abbreviated; normalize to canonical form.
const HEARING_TYPE_RE =
  /(Huvudförhandling|Muntlig förberedelse|Konkursförhandling|Häktningsförhandling|Edgångssmtr|Edgångssammanträde|Sammanträde|Förhandling)/i;
const WEEKDAY_RE = /^(må|ti|on|to|fr|lö|sö)\b/i;

function normalizeType(matched: string): string {
  if (/^Edgångssmtr$/i.test(matched)) return "Edgångssammanträde";
  return matched;
}

function looksLikeHeader(line: string): boolean {
  if (/^Förhandlingar\s+i\s+/i.test(line)) return true;
  if (/^Tingsrätten\s+vill\s+framhålla/i.test(line)) return true;
  if (/^Listan\s+är\s+preliminär/i.test(line)) return true;
  if (/^Dag\b.*Datum.*F[öo]rhandlingstid/i.test(line)) return true;
  if (/^Sida\s+\d+\s+av\s+\d+/i.test(line)) return true;
  return false;
}

function isContinuationCandidate(line: string): boolean {
  if (!line || line.length < 2) return false;
  if (CASE_NUMBER_REGEX.test(line)) return false;
  if (ISO_DATE_RE.test(line)) return false;
  if (SHORT_DATE_REGEX.test(line)) return false;
  if (TIME_RANGE_RE.test(line)) return false;
  if (HEARING_TYPE_RE.test(line)) return false;
  if (WEEKDAY_RE.test(line)) return false;
  return true;
}

export const formatPositional: ParserStrategy = {
  name: "Positional",
  formatFamily: "positional",

  parse(ctx: ParserContext): RawHearing[] {
    const { text } = ctx;
    if (!text || text.trim().length === 0) return [];

    const lines = text
      .split("\n")
      .map((l) => l.replace(/[ \t]+$/g, ""))
      .filter((l) => l.length > 0);

    const hearings: RawHearing[] = [];
    // Per-hearing flag: true while the most recent saken fragment ended with a
    // comma — indicates an expected wrap onto a continuation row. cleanSaken
    // strips trailing commas, so we have to track this signal separately.
    const expectsContinuation: boolean[] = [];
    // Raw (uncleaned) saken accumulator — cleanSaken is applied once at the
    // end so continuation merges can use the pre-cleaned text.
    const rawSakenAcc: string[] = [];
    let currentDate = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (looksLikeHeader(line)) continue;

      // Try date formats in priority: short ("18-maj"), ISO, Swedish long.
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

      const caseMatch = line.match(CASE_NUMBER_REGEX);
      const timeMatch = line.match(TIME_RANGE_RE);

      // A row is a "hearing row" if it has either a case# or a time range.
      // Without either it's continuation/noise.
      if (!caseMatch && !timeMatch) {
        const lastIdx = hearings.length - 1;
        if (
          isContinuationCandidate(line) &&
          lastIdx >= 0 &&
          expectsContinuation[lastIdx]
        ) {
          const trimmed = line.replace(/\t+/g, " ").trim();
          rawSakenAcc[lastIdx] = (rawSakenAcc[lastIdx] + " " + trimmed).trim();
          hearings[lastIdx].saken = cleanSaken(rawSakenAcc[lastIdx]);
          expectsContinuation[lastIdx] = trimmed.endsWith(",");
        }
        continue;
      }

      const caseNumber = caseMatch ? caseMatch[0].replace(/\s+/g, " ") : "";
      const time = timeMatch
        ? `${timeMatch[1].replace(".", ":")} - ${timeMatch[2].replace(".", ":")}`
        : "";

      const typeMatch = line.match(HEARING_TYPE_RE);
      const type = typeMatch ? normalizeType(typeMatch[1]) : "Förhandling";

      // Saken sits between (the last of case#/type/time) and the Sal column.
      // Pick the right-most "left-anchor" column we matched.
      const leftAnchors: number[] = [];
      if (caseMatch) leftAnchors.push((caseMatch.index ?? 0) + caseMatch[0].length);
      if (typeMatch) leftAnchors.push((typeMatch.index ?? 0) + typeMatch[0].length);
      if (timeMatch) leftAnchors.push((timeMatch.index ?? 0) + timeMatch[0].length);
      const segmentStart = leftAnchors.length > 0 ? Math.max(...leftAnchors) : 0;

      // Right anchor: Sal column, else external-court suffix, else end of line.
      let segmentEnd = line.length;
      let room = "";
      let externalCourt: string | undefined;
      const salMatch = line.match(SAL_RE);
      if (salMatch) {
        const salIdx = line.indexOf(salMatch[0], segmentStart);
        if (salIdx > segmentStart) {
          room = salMatch[0].replace(/\s+/g, " ");
          segmentEnd = salIdx;
        }
      } else {
        const tailMatch = line.substring(segmentStart).match(EXTERNAL_COURT_AT_END_RE);
        if (tailMatch && tailMatch.index !== undefined) {
          externalCourt = tailMatch[1];
          segmentEnd = segmentStart + tailMatch.index;
        }
      }

      const rawSaken = line
        .substring(segmentStart, segmentEnd)
        .replace(/\t+/g, " ")
        .trim();
      const saken = cleanSaken(rawSaken);

      // Drop rows that yielded no meaningful content (e.g. stray time-only
      // lines in a footer). Require either a case# or some saken text.
      if (!caseNumber && !saken) continue;

      const hearing: RawHearing = {
        date: currentDate,
        time,
        caseNumber,
        type,
        room,
        saken,
        parties: "",
      };
      if (externalCourt) hearing.externalCourt = externalCourt;
      hearings.push(hearing);
      rawSakenAcc.push(rawSaken);
      expectsContinuation.push(rawSaken.endsWith(","));
    }

    return hearings;
  },
};
