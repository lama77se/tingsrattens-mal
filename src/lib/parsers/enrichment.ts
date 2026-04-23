import { matchLagrum } from "../lagrumMatch";
import { getMaltyp } from "../maltypMappings";
import { COURT_IN_SAKEN_REGEX, FLERA_SAKFRAGOR_REGEX } from "./extractors";
import type { RawHearing, Hearing } from "./types";

/**
 * Enrich a RawHearing with court resolution, lagrum, maltyp, fleraSakfragor, and id.
 * This logic is shared across all format families.
 */
export function enrichHearing(raw: RawHearing, courtName: string, index: number): Hearing {
  let saken = raw.saken;
  let resolvedCourt = courtName;

  // If parser provides a physical location that differs from the court, reflect it
  if (raw.location) {
    const courtFirstWord = courtName.split(/\s/)[0].toLowerCase();
    if (!raw.location.toLowerCase().startsWith(courtFirstWord)) {
      resolvedCourt = `${courtName} (plats: ${raw.location})`;
    }
  }

  // External court using this court's facilities (e.g. Solna tingsrätt heard at Stockholm)
  if (raw.externalCourt) {
    resolvedCourt = `${raw.externalCourt} (plats: ${courtName})`;
  }

  // Detect another court in saken: "Uppsala tingsrätt - mord m.m."
  const courtInSaken = saken.match(COURT_IN_SAKEN_REGEX);
  if (courtInSaken) {
    const otherCourt = courtInSaken[1].trim();
    saken = courtInSaken[2].trim();
    resolvedCourt = `${otherCourt} (plats: ${courtName})`;
  }

  // Detect "flera sakfrågor" from saken field (checks for "m.m.")
  const cleanedSaken = saken.replace(/[^\w\s.,åäöÅÄÖ]/g, "").trim();
  const mmPresent = FLERA_SAKFRAGOR_REGEX.test(saken) || FLERA_SAKFRAGOR_REGEX.test(cleanedSaken);

  // Enrich lagrum and sakområde
  const lagrumMatch = matchLagrum(saken, raw.caseNumber);
  const extras = lagrumMatch.additional ?? [];

  // Join multiple lagrum references so all apply laws surface in the UI cell.
  const allLagrum = [lagrumMatch.lagrum, ...extras.map((e) => e.lagrum)]
    .filter(Boolean)
    .join("; ");

  // "Flera sakfrågor" is true when either the saken explicitly says "m.m."
  // or the matcher found distinct additional lagrum references.
  const fleraSakfragor = mmPresent || extras.length > 0;

  return {
    id: `parsed-${index}`,
    date: raw.date || "Okänt datum",
    time: raw.time || "–",
    court: resolvedCourt,
    caseNumber: raw.caseNumber || "–",
    type: raw.type,
    maltyp: getMaltyp(raw.caseNumber),
    room: raw.room || "–",
    saken: saken || "–",
    parties: raw.parties || "–",
    lagrum: allLagrum,
    sakomrade: lagrumMatch.sakomrade,
    fleraSakfragor,
  };
}
