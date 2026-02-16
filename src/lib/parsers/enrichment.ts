import { matchLagrum } from "../lagrumMappings";
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

  // Detect another court in saken: "Uppsala tingsrätt - mord m.m."
  const courtInSaken = saken.match(COURT_IN_SAKEN_REGEX);
  if (courtInSaken) {
    const otherCourt = courtInSaken[1].trim();
    saken = courtInSaken[2].trim();
    resolvedCourt = `${otherCourt} (plats: ${courtName})`;
  }

  // Detect "flera sakfrågor" from saken field
  const cleanedSaken = saken.replace(/[^\w\s.,åäöÅÄÖ]/g, "").trim();
  const fleraSakfragor = FLERA_SAKFRAGOR_REGEX.test(saken) || FLERA_SAKFRAGOR_REGEX.test(cleanedSaken);

  // Enrich lagrum and sakområde for B-mål
  const lagrumMatch = matchLagrum(saken, raw.caseNumber);

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
    lagrum: lagrumMatch.lagrum,
    sakomrade: lagrumMatch.sakomrade,
    fleraSakfragor,
  };
}
