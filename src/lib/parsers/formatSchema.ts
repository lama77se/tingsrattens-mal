import type { ParserStrategy, ParserContext, RawHearing } from "./types";
import { extractSwedishDate, CASE_NUMBER_REGEX } from "./extractors";

/**
 * Schema format parser — for courts that publish date-heading-based schedules.
 * Used by Haparanda (with sub-courts), Lund, and Malmö.
 *
 * Structure:
 *   [Swedish date heading]          "Tisdag 17 februari 2026"
 *   kl. HH:MM - HH:MM              "kl. 09:00 - 10:15"
 *   Location, Sal N  or  Sal N      "Haparanda tingsrätt, Sal 1" / "Sal 09"
 *   CaseNumber, HearingType         "B 784-25, Huvudförhandling"
 *   angående saken text             "angående brott mot knivlagen"
 */

const WEEKDAY_PREFIX = /^(måndag|tisdag|onsdag|torsdag|fredag|lördag|söndag)\s+/i;
const KL_TIME_REGEX = /kl\.?\s*(\d{1,2}:\d{2})(?:\s*[-–—]\s*(\d{1,2}:\d{2}))?/i;
const LOCATION_REGEX = /^(.+?(?:tingsrätt|tingshus))\s*[,.]?\s*(?:(?:[Tt]ings)?[Ss]al\s+(\S+))?/i;
const ANGAENDE_REGEX = /^a?ngående\s+(.+)/i;
const FORTSATT_REGEX = /^Fortsatt\s+/i;
const DAG_AV_REGEX = /,?\s*[Dd]ag\s+\d+\s+av\s+\d+/;

export const formatSchema: ParserStrategy = {
  name: "Schema",
  formatFamily: "schema",

  parse(ctx: ParserContext): RawHearing[] {
    const { text } = ctx;
    if (!text || text.trim().length === 0) return [];

    console.log("PDF text first 500 chars:", text.substring(0, 500));

    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      // Normalize case number spaces: "B 784 -25" → "B 784-25"
      .map((l) => l.replace(/((?:FT|[TBK\u00c4])\s?\d{1,6})\s+([-–—]\d{2})/gi, "$1$2"));

    const hearings: RawHearing[] = [];
    let currentDate = "";
    let currentTime = "";
    let currentLocation = "";
    let currentRoom = "";
    let currentCaseNumber = "";
    let currentType = "";
    let sakenParts: string[] = [];

    const flush = () => {
      if (currentCaseNumber) {
        hearings.push({
          date: currentDate,
          time: currentTime,
          caseNumber: currentCaseNumber,
          type: currentType || "Förhandling",
          room: currentRoom,
          saken: sakenParts.join(" ").replace(/[,\s]+$/, "").trim(),
          parties: "",
          location: currentLocation,
        });
      }
      currentCaseNumber = "";
      currentType = "";
      sakenParts = [];
    };

    /** Parse a case number + hearing type fragment (e.g. "B 784-25, Huvudförhandling") */
    const parseCaseFragment = (fragment: string) => {
      const cm = fragment.match(CASE_NUMBER_REGEX);
      if (!cm) return;
      flush();
      currentCaseNumber = cm[1];
      const afterCase = fragment.substring(fragment.indexOf(cm[0]) + cm[0].length);
      let typeStr = afterCase.replace(/^[\s,]+/, "").trim();
      if (typeStr) {
        typeStr = typeStr.replace(DAG_AV_REGEX, "").trim();
        if (FORTSATT_REGEX.test(typeStr)) {
          typeStr = typeStr.replace(FORTSATT_REGEX, "").trim();
          if (typeStr.length > 0) {
            typeStr = typeStr.charAt(0).toUpperCase() + typeStr.slice(1);
          }
        }
        currentType = typeStr;
      }
    };

    /** Parse an angående fragment (may contain embedded case numbers for multi-case hearings) */
    const parseAngaendeFragment = (angText: string) => {
      const embeddedCase = angText.match(CASE_NUMBER_REGEX);
      const isParenRef = embeddedCase &&
        /\(\s*$/.test(angText.substring(0, angText.indexOf(embeddedCase[0])));
      const isTrailingRef = embeddedCase &&
        !angText.substring(angText.indexOf(embeddedCase[0]) + embeddedCase[0].length).replace(/^[\s,]+/, "").trim();
      if (embeddedCase && !isParenRef && !isTrailingRef) {
        const beforeCase = angText.substring(0, angText.indexOf(embeddedCase[0])).replace(/[,\s]+$/, "").trim();
        if (beforeCase) sakenParts = [beforeCase];
        const inheritedType = currentType;
        flush();
        currentCaseNumber = embeddedCase[1];
        currentType = inheritedType;
        const afterCase = angText.substring(angText.indexOf(embeddedCase[0]) + embeddedCase[0].length).replace(/^[\s,]+/, "").trim();
        sakenParts = afterCase ? [afterCase] : [];
      } else {
        sakenParts = [angText];
      }
    };

    for (const line of lines) {
      // Swedish long date heading: "Tisdag 17 februari 2026"
      if (WEEKDAY_PREFIX.test(line)) {
        const dateMatch = extractSwedishDate(line);
        if (dateMatch) {
          flush();
          currentDate = dateMatch;
          continue;
        }
      }

      // "kl." time line — may have case number merged on same line (two-column PDF)
      // e.g. "kl. 09:00 - 10:15 B 784-25, Huvudförhandling"
      const klMatch = line.match(KL_TIME_REGEX);
      if (klMatch) {
        flush();
        currentTime = klMatch[2] ? `${klMatch[1]} - ${klMatch[2]}` : klMatch[1];
        // Check for case number in remainder of line
        const afterTime = line.substring(klMatch.index! + klMatch[0].length).trim();
        if (afterTime) {
          const caseInRemainder = afterTime.match(CASE_NUMBER_REGEX);
          if (caseInRemainder) {
            parseCaseFragment(afterTime);
          }
        }
        continue;
      }

      // Location line (tingsrätt/tingshus) — may have angående merged on same line
      // e.g. "Haparanda tingsrätt, Sal 1 angående brott mot knivlagen"
      // Guard: only skip if the location part itself contains a case number
      if (/(?:tingsrätt|tingshus)/i.test(line)) {
        const locMatch = line.match(LOCATION_REGEX);
        if (locMatch) {
          // Only treat as location if the matched portion has no case number
          const locPortion = locMatch[0];
          if (!CASE_NUMBER_REGEX.test(locPortion)) {
            currentLocation = locMatch[1].trim();
            if (locMatch[2]) currentRoom = `Sal ${locMatch[2]}`;
            // Check for angående in remainder of line after location+room
            const afterLoc = line.substring(locMatch[0].length).trim();
            const angInRemainder = afterLoc.match(ANGAENDE_REGEX);
            if (angInRemainder) {
              parseAngaendeFragment(angInRemainder[1]);
            }
            continue;
          }
        }
      }

      // Bare room line (no court name): "Sal 09", "Sal 10 (säkerhetssal)"
      const bareRoomMatch = line.match(/^((?:Tings)?[Ss]al)\s+(\d+)/);
      if (bareRoomMatch) {
        const prefix = bareRoomMatch[1].toLowerCase().startsWith("tings") ? "Tingssal" : "Sal";
        currentRoom = `${prefix} ${bareRoomMatch[2]}`;
        continue;
      }

      // "angående" line — check BEFORE case number since angående lines may contain
      // embedded case numbers for multi-case hearings:
      //   "angående häleriförseelse, B 443-25 ringa narkotikabrott, ..."
      const angMatch = line.match(ANGAENDE_REGEX);
      if (angMatch) {
        parseAngaendeFragment(angMatch[1]);
        continue;
      }

      // Case number line: "B 784-25, Huvudförhandling"
      // Only match when case number is at start of line — mid-line references
      // (e.g. "återvinning av tredskodom i T 5137-25") are continuation text
      const caseMatch = line.match(CASE_NUMBER_REGEX);
      if (caseMatch && caseMatch.index === 0) {
        parseCaseFragment(line);
        continue;
      }

      // Continuation of saken
      if (currentCaseNumber) {
        sakenParts.push(line);
        continue;
      }
    }

    // Flush last hearing
    flush();

    return hearings;
  },
};
