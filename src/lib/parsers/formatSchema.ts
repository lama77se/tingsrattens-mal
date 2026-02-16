import type { ParserStrategy, ParserContext, RawHearing } from "./types";
import { extractSwedishDate, CASE_NUMBER_REGEX } from "./extractors";

/**
 * Schema format parser — for courts that publish date-heading-based schedules.
 * Used by Haparanda tingsrätt (with Kalix tingshus sub-court).
 *
 * Structure:
 *   [Swedish date heading]          "Tisdag 17 februari 2026"
 *   kl. HH:MM - HH:MM              "kl. 09:00 - 10:15"
 *   Location, Sal N                 "Haparanda tingsrätt, Sal 1"
 *   CaseNumber, HearingType         "B 784-25, Huvudförhandling"
 *   angående saken text             "angående brott mot knivlagen"
 */

const WEEKDAY_PREFIX = /^(måndag|tisdag|onsdag|torsdag|fredag|lördag|söndag)\s+/i;
const KL_TIME_REGEX = /kl\.?\s*(\d{1,2}:\d{2})(?:\s*[-–—]\s*(\d{1,2}:\d{2}))?/i;
const LOCATION_REGEX = /^(.+?(?:tingsrätt|tingshus))\s*[,.]?\s*(?:(?:[Tt]ings)?[Ss]al\s+(\S+))?/i;
const ANGAENDE_REGEX = /^angående\s+(.+)/i;
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
      .map((l) => l.replace(/([TBFTKÄ]\s?\d{1,6})\s+([-–—]\d{2})/gi, "$1$2"));

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
          saken: sakenParts.join(" ").trim(),
          parties: "",
          location: currentLocation,
        });
      }
      currentCaseNumber = "";
      currentType = "";
      sakenParts = [];
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

      // "kl." time line
      const klMatch = line.match(KL_TIME_REGEX);
      if (klMatch) {
        flush();
        currentTime = klMatch[2] ? `${klMatch[1]} - ${klMatch[2]}` : klMatch[1];
        continue;
      }

      // Location line (tingsrätt/tingshus) — but not if it also has a case number
      if (/(?:tingsrätt|tingshus)/i.test(line) && !CASE_NUMBER_REGEX.test(line)) {
        const locMatch = line.match(LOCATION_REGEX);
        if (locMatch) {
          currentLocation = locMatch[1].trim();
          currentRoom = locMatch[2] ? `Sal ${locMatch[2]}` : "";
          continue;
        }
      }

      // Case number line: "B 784-25, Huvudförhandling"
      const caseMatch = line.match(CASE_NUMBER_REGEX);
      if (caseMatch) {
        flush();
        currentCaseNumber = caseMatch[1];

        // Extract hearing type from text after case number
        const afterCase = line.substring(line.indexOf(caseMatch[0]) + caseMatch[0].length);
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
        continue;
      }

      // "angående" line starts saken
      const angMatch = line.match(ANGAENDE_REGEX);
      if (angMatch) {
        sakenParts = [angMatch[1]];
        continue;
      }

      // Continuation of saken (only if we're building a hearing with a case number)
      if (currentCaseNumber && sakenParts.length > 0) {
        sakenParts.push(line);
        continue;
      }
    }

    // Flush last hearing
    flush();

    return hearings;
  },
};
