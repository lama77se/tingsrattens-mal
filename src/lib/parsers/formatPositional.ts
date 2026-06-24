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
// Eskilstuna stacks the time range vertically: the start ("09:00 -") sits on
// the hearing row and the end ("16:00") wraps to the next physical row. Match
// a half-open start (a time + dash NOT followed by another time) so the end
// can be picked up from the continuation row.
const TIME_OPEN_RE = /\b(\d{1,2}[:.]\d{2})\s*-\s*(?!\d)/;
const BARE_TIME_RE = /^\d{1,2}[:.]\d{2}$/;
// Sal pattern — accepts an optional "Tingsrättens" / "Tingsrätt" / "Sessions"
// / "Tings" / "Högsäkerhets" prefix and an optional ", City" suffix
// (Ångermanlands writes "Tingsrättens sal 1, Örnsköldsvik" in the Sal column).
const SAL_RE = /\b(?:Tingsrättens\s+|Tingsrätt\s+)?(?:Sessions|Tings|Högsäkerhets)?Sal\s+\S+(?:,\s*[A-ZÅÄÖ][a-zåäö]+)?/i;
// Captures column-as-location values like "Attunda tingsrätt" or
// "Stockholms tingsrätt" sitting in the Sal column when a court borrows
// another court's facility (Södertälje uses Attunda's rooms for some cases).
const EXTERNAL_COURT_AT_END_RE = /([A-ZÅÄÖ][a-zåäö]+\s+tingsrätt)\s*$/;
// "Edgångssmtr" = Edgångssammanträde abbreviated; normalize to canonical form.
const HEARING_TYPE_RE =
  /(Huvudförhandling|Muntlig förberedelse|Konkursförhandling|Häktningsförhandling|Edgångssmtr|Edgångssammanträde|Sammanträde|Förhandling)/i;
const WEEKDAY_RE = /^(må|ti|on|to|fr|lö|sö)\b/i;
// "(dag X/Y)" — multi-day hearing annotation; never part of the saken cell.
const DAG_ANNOTATION_RE = /^\(dag\s+\d+\/\d+\)$/i;
// Standalone fragments that are wraps from the type column, not saken:
// "Muntlig\nförberedelse", "Konkursförhandlin\ng". Värmland's PDF wraps the
// type cell across two physical rows when it doesn't fit, leaving an orphan
// segment on the continuation row that must NOT be appended to saken.
const TYPE_WRAP_COMPLETION_RE = /^(förberedelse|g)$/i;

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

/**
 * Returns true when the accumulated raw saken signals that a continuation
 * row is expected next: it ends with a comma (mid-list wrap) OR has an
 * unbalanced opening paren (e.g. "...tvist (återvinning av" → the next
 * physical row will carry the closing paren).
 */
function hasOpenContinuation(rawSaken: string): boolean {
  if (rawSaken.endsWith(",")) return true;
  const opens = (rawSaken.match(/\(/g) || []).length;
  const closes = (rawSaken.match(/\)/g) || []).length;
  return opens > closes;
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
    // Per-hearing flag: true when neither Sal nor location was found — meaning
    // the saken cell consumed the entire line to EOL with no right anchor.
    // In that case the next physical row likely continues the saken cell
    // (Värmland's PDF lacks a Sal column entirely and wraps long sakens this
    // way without any in-text marker). When true we merge continuation lines
    // even without an explicit comma/paren signal.
    const lacksRightAnchor: boolean[] = [];
    // Per-hearing flag: true when the hearing row carried only a half-open
    // time range ("09:00 -") and the end time still has to be picked up from
    // the next physical row (Eskilstuna stacks the end time below the start).
    const needsEndTime: boolean[] = [];
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

      const rawCaseMatch = line.match(CASE_NUMBER_REGEX);
      const timeMatch = line.match(TIME_RANGE_RE);
      const typeMatchEarly = line.match(HEARING_TYPE_RE);

      // Filter out false-positive case-number matches:
      // (a) Paren reference — "...återvinning av tredskodom i T 1234-25)"
      //     The case# is part of an in-saken parenthesised reference, NOT a
      //     new hearing. Signal: char immediately after the case# is ')'.
      // (b) Bare alias — the line is JUST a case# with nothing else (e.g.
      //     "B 2106-23" alone after a B 1287-23 row). Halmstad uses this for
      //     co-defendants in joint trials; the previous hearing carries the
      //     real time/saken/sal.
      let caseMatch: RegExpMatchArray | null = rawCaseMatch;
      if (rawCaseMatch) {
        const afterCase = line.substring(
          (rawCaseMatch.index ?? 0) + rawCaseMatch[0].length
        );
        const isParenRef = afterCase.startsWith(")");
        const isBareAlias =
          !timeMatch && !typeMatchEarly && afterCase.trim() === "";
        if (isParenRef || isBareAlias) caseMatch = null;
      }

      // A row is a "hearing row" if it has either a case# or a time range.
      // Without either it's continuation/noise.
      if (!caseMatch && !timeMatch) {
        const lastIdx = hearings.length - 1;
        if (lastIdx < 0) continue;

        // Complete a half-open time range whose end time wrapped to this row.
        if (needsEndTime[lastIdx]) {
          const endMatch = line.match(/\b(\d{1,2}[:.]\d{2})\b/);
          if (endMatch) {
            hearings[lastIdx].time = hearings[lastIdx].time.replace(
              /-\s*$/,
              `- ${endMatch[1].replace(".", ":")}`
            );
            needsEndTime[lastIdx] = false;
          }
        }

        if (rawCaseMatch) {
          // Bare-alias or paren-ref line. Fold the closing-paren case into the
          // previous saken when the saken has an open paren; otherwise drop
          // (bare-alias case numbers aren't currently linked back as aliases).
          const afterCase = line.substring(
            (rawCaseMatch.index ?? 0) + rawCaseMatch[0].length
          );
          if (
            afterCase.startsWith(")") &&
            hasOpenContinuation(rawSakenAcc[lastIdx])
          ) {
            const trimmed = line.replace(/\t+/g, " ").trim();
            const merged = (rawSakenAcc[lastIdx] + " " + trimmed).trim();
            rawSakenAcc[lastIdx] = merged;
            hearings[lastIdx].saken = cleanSaken(merged);
            expectsContinuation[lastIdx] = hasOpenContinuation(merged);
          }
          continue;
        }

        // Pure continuation row (no case#, no time). Strip annotation and
        // type-wrap-completion segments before deciding whether to merge into
        // the previous saken.
        const segments = line
          .split(/\t+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        const kept: string[] = [];
        for (const seg of segments) {
          if (DAG_ANNOTATION_RE.test(seg)) continue;
          if (TYPE_WRAP_COMPLETION_RE.test(seg)) continue;
          if (BARE_TIME_RE.test(seg)) continue; // wrapped end-time (Eskilstuna)
          kept.push(seg);
        }
        if (kept.length === 0) continue;

        const filteredLine = kept.join(" ");
        if (
          isContinuationCandidate(filteredLine) &&
          (expectsContinuation[lastIdx] || lacksRightAnchor[lastIdx])
        ) {
          const merged = (rawSakenAcc[lastIdx] + " " + filteredLine).trim();
          rawSakenAcc[lastIdx] = merged;
          hearings[lastIdx].saken = cleanSaken(merged);
          // Continue accumulating if the merged saken still ends with a comma
          // OR has unbalanced opening parens (e.g. saken wraps across rows:
          // "...tvist (återvinning av\ntredskodom i T 1234-25)" — the second
          // line closes the paren and matches as a continuation too).
          expectsContinuation[lastIdx] = hasOpenContinuation(merged);
        }
        continue;
      }

      const caseNumber = caseMatch ? caseMatch[0].replace(/\s+/g, " ") : "";
      let time = timeMatch
        ? `${timeMatch[1].replace(".", ":")} - ${timeMatch[2].replace(".", ":")}`
        : "";
      // No full range on this row — check for a half-open start ("09:00 -")
      // whose end time wraps to the next physical row.
      let openTime = false;
      if (!timeMatch) {
        const openMatch = line.match(TIME_OPEN_RE);
        if (openMatch) {
          time = `${openMatch[1].replace(".", ":")} -`;
          openTime = true;
        }
      }

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
      let location: string | undefined;
      const salMatch = line.match(SAL_RE);
      if (salMatch) {
        const salIdx = line.indexOf(salMatch[0], segmentStart);
        if (salIdx > segmentStart) {
          room = salMatch[0].replace(/\s+/g, " ");
          segmentEnd = salIdx;
        }
      } else {
        // Trailing court name in the Sal column ("…Attunda tingsrätt") means
        // this court's case is being heard at that other facility. Populate
        // `location` (not `externalCourt`) so enrichment renders it as
        // "<this court> (plats: <other court>)". The opposite pattern — a
        // borrowed-facility case from a remote court — appears in the saken
        // text (e.g. "Solna tingsrätt - mord m.m.") and is handled by
        // COURT_IN_SAKEN_REGEX in enrichment.
        const tailMatch = line.substring(segmentStart).match(EXTERNAL_COURT_AT_END_RE);
        if (tailMatch && tailMatch.index !== undefined) {
          location = tailMatch[1];
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
      if (location) hearing.location = location;
      hearings.push(hearing);
      rawSakenAcc.push(rawSaken);
      expectsContinuation.push(hasOpenContinuation(rawSaken));
      lacksRightAnchor.push(!room && !location);
      needsEndTime.push(openTime);
    }

    return hearings;
  },
};
