import { matchLagrum } from "./lagrumMappings";
import { getMaltyp } from "./maltypMappings";

export interface Hearing {
  id: string;
  date: string;
  time: string;
  court: string;
  caseNumber: string;
  type: string;
  maltyp: string;
  room: string;
  saken: string;
  parties: string;
  lagrum: string;
  sakomrade: string;
  fleraSakfragor: boolean;
}

/**
 * Normalize Swedish characters for comparison — handles potential PDF encoding issues.
 */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[\u00e4\u00e0\u00e1\u00e2\u00e3]/g, "a")  // ä, à, á, â, ã → a
    .replace(/[\u00f6\u00f2\u00f3\u00f4\u00f5]/g, "o")  // ö, ò, ó, ô, õ → o
    .replace(/[\u00e5]/g, "a")                            // å → a
    .replace(/[\u00e9\u00e8\u00ea\u00eb]/g, "e");         // é, è, ê, ë → e
}

/**
 * Try to extract a short date (e.g. "16-feb") from a line and return ISO date string.
 */
function extractShortDate(line: string, shortDateRegex: RegExp, shortMonthMap: Record<string, string>): string | null {
  const m = line.match(shortDateRegex);
  if (m) {
    const day = m[1].padStart(2, "0");
    const month = shortMonthMap[m[2].toLowerCase()];
    if (month) return `${new Date().getFullYear()}-${month}-${day}`;
  }
  return null;
}

/**
 * Parse raw PDF text from Swedish court PDFs into structured hearing objects.
 */
export function parseCourtPdf(text: string, court: string): Hearing[] {
  if (!text || text.trim().length === 0) return [];

  console.log("PDF text first 500 chars:", text.substring(0, 500));

  const hearings: Hearing[] = [];
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // Pre-process: insert space before case number prefixes glued to text
  // e.g. "HuvudförhandlingT 3535-24" -> "Huvudförhandling T 3535-24"
  const processedLines = lines.map(line =>
    line
      .replace(/([a-zA-ZåäöÅÄÖ])((?:FT|[TBKÄ])\s?\d{1,6}[-–—]\d{2})/gi, "$1 $2")
      .replace(/(\d{2}[-–—]\d{2})([a-zA-ZåäöÅÄÖ])/g, "$1 $2")
  );

  let currentDate = "";
  let idCounter = 0;

  // Short date pattern: e.g. "16-feb", "3-mar" — no trailing \b so "16-feb09:00" matches
  const shortDateRegex = /(\d{1,2})[-\u2013\u2014](jan|feb|mar|apr|maj|jun|jul|aug|sep|okt|nov|dec)/i;
  const shortMonthMap: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04",
    maj: "05", jun: "06", jul: "07", aug: "08",
    sep: "09", okt: "10", nov: "11", dec: "12",
  };

  // ISO date: "2026-02-16"
  const isoDateRegex = /(\d{4}[-\u2013\u2014]\d{2}[-\u2013\u2014]\d{2})/;
  // Swedish long date: "16 februari 2026"
  const swedishDateRegex = /(\d{1,2})\s+(januari|februari|mars|april|maj|juni|juli|augusti|september|oktober|november|december)\s+(\d{4})/i;

  const monthMap: Record<string, string> = {
    januari: "01", februari: "02", mars: "03", april: "04",
    maj: "05", juni: "06", juli: "07", augusti: "08",
    september: "09", oktober: "10", november: "11", december: "12",
  };

  // Case number: "T 1234-25", "B 5678-25", "FT 123-25", "Ä 456-25", "K 11016-25"
  const caseNumberRegex = /\b([TBFTK\u00c4]\s?\d{1,6}[-\u2013\u2014]\d{2})\b/i;

  // Time range: "09:00 - 11:00"
  const timeRangeRegex = /(\d{1,2}:\d{2})\s*[-\u2013\u2014]\s*(\d{1,2}:\d{2})/;
  const timeRegex = /\b(\d{1,2}:\d{2})\b/;

  // Room/Sal: "Sal 3", "sal 12"
  const roomRegex = /(?:Tings)?[Ss]al\s+(\S+)/;

  // Hearing types — most specific first, generic "Förhandling" last
  const hearingTypes = [
    "Huvudförhandling",
    "Häktningsförhandling",
    "Muntlig förberedelse",
    "Edgångssammanträde",
    "Sammanträde",
    "Tredskodom",
    "Avgörande",
    "Förhandling",
  ];

  // Pre-compute normalized type strings for matching
  const normalizedTypes = hearingTypes.map((ht) => ({ original: ht, normalized: normalize(ht) }));

  for (let i = 0; i < processedLines.length; i++) {
    const line = processedLines[i];

    // --- Date extraction: try short date FIRST, then ISO, then Swedish long ---
    const shortDate = extractShortDate(line, shortDateRegex, shortMonthMap);
    if (shortDate) {
      currentDate = shortDate;
      console.log("Short date matched:", currentDate, "from line:", line);
    } else {
      const isoMatch = line.match(isoDateRegex);
      if (isoMatch) {
        // Only use ISO date from header if we don't have a short date yet
        if (!currentDate) {
          currentDate = isoMatch[1].replace(/[\u2013\u2014]/g, "-");
        }
      } else {
        const swedishMatch = line.match(swedishDateRegex);
        if (swedishMatch) {
          const day = swedishMatch[1].padStart(2, "0");
          const month = monthMap[swedishMatch[2].toLowerCase()];
          const year = swedishMatch[3];
          if (month) {
            currentDate = `${year}-${month}-${day}`;
          }
        }
      }
    }

    // Look for case numbers — this signals a hearing entry
    const caseMatch = line.match(caseNumberRegex);
    if (!caseMatch) continue;

    const caseNumber = caseMatch[1];

    // If current line has no date but previous line does, grab it
    if (i > 0 && !line.match(shortDateRegex)) {
      const prevShortDate = extractShortDate(processedLines[i - 1], shortDateRegex, shortMonthMap);
      if (prevShortDate) {
        currentDate = prevShortDate;
      }
    }

    // Extract time (prefer range, fallback to single) — check current line, then previous
    let time = "";
    const rangeMatch = line.match(timeRangeRegex);
    if (rangeMatch) {
      time = `${rangeMatch[1]} - ${rangeMatch[2]}`;
    } else {
      const timeMatch = line.match(timeRegex);
      if (timeMatch) {
        time = timeMatch[1];
      } else if (i > 0) {
        const prevRange = processedLines[i - 1].match(timeRangeRegex);
        if (prevRange) {
          time = `${prevRange[1]} - ${prevRange[2]}`;
        } else {
          const prevTimeMatch = processedLines[i - 1].match(timeRegex);
          if (prevTimeMatch) time = prevTimeMatch[1];
        }
      }
    }

    // Extract room
    let room = "";
    const roomMatch = line.match(roomRegex);
    if (roomMatch) {
      const prefix = roomMatch[0].toLowerCase().startsWith("tings") ? "Tingssal" : "Sal";
      room = `${prefix} ${roomMatch[1]}`;
    } else {
      for (let j = Math.max(0, i - 2); j <= Math.min(processedLines.length - 1, i + 2); j++) {
        const rm = processedLines[j].match(roomRegex);
        if (rm) {
          const prefix = rm[0].toLowerCase().startsWith("tings") ? "Tingssal" : "Sal";
          room = `${prefix} ${rm[1]}`;
          break;
        }
      }
    }

    // Detect hearing type — check current line, then previous line, then next line
    let type = "Förhandling";
    const normalizedLine = normalize(line);
    for (const nt of normalizedTypes) {
      if (normalizedLine.includes(nt.normalized)) {
        type = nt.original;
        break;
      }
    }
    // Check PREVIOUS line for type (case number is often on line after type)
    if (type === "Förhandling" && i > 0) {
      const prevNormalized = normalize(processedLines[i - 1]);
      for (const nt of normalizedTypes) {
        if (prevNormalized.includes(nt.normalized)) {
          type = nt.original;
          break;
        }
      }
    }
    // Also check next line for type
    if (type === "Förhandling" && i + 1 < processedLines.length) {
      const nextNormalized = normalize(processedLines[i + 1]);
      for (const nt of normalizedTypes) {
        if (nextNormalized.includes(nt.normalized)) {
          type = nt.original;
          break;
        }
      }
    }

    // Extract "saken" — text after case number on the same line
    let saken = "";
    const afterCase = line.substring(line.indexOf(caseNumber) + caseNumber.length).trim();
    if (afterCase.length > 2) {
      saken = afterCase
        .replace(roomRegex, "")
        .replace(/\s*(?:[Tt]ings)?[Ss]al\s+\S+\s*$/, "")
        .replace(timeRangeRegex, "")
        .replace(timeRegex, "")
        .trim();
      for (const ht of hearingTypes) {
        saken = saken.replace(new RegExp(ht, "gi"), "").trim();
      }
      saken = saken.replace(/^[\s,;:.\-–]+|[\s,;:.\-–]+$/g, "").trim();
    }

    // If no saken on case number line, next line is saken (not parties)
    let sakenFromNextLine = false;
    if (!saken && i + 1 < processedLines.length) {
      const nextLine = processedLines[i + 1].trim();
      if (nextLine.length > 1 && !nextLine.match(caseNumberRegex) && !nextLine.match(shortDateRegex) && !nextLine.match(isoDateRegex)) {
        saken = nextLine.replace(/\s*(?:[Tt]ings)?[Ss]al\s+\S+\s*$/, "").trim();
        sakenFromNextLine = true;
      }
    }

    // Extract parties from the line AFTER saken
    let parties = "";
    const partiesLineIndex = sakenFromNextLine ? i + 2 : i + 1;
    if (partiesLineIndex < processedLines.length && !processedLines[partiesLineIndex].match(caseNumberRegex)) {
      const pLine = processedLines[partiesLineIndex].trim();
      if (pLine.length > 2 && !pLine.match(shortDateRegex) && !pLine.match(isoDateRegex)) {
        // Don't use as parties if it looks like a new hearing line (has time pattern)
        if (!pLine.match(timeRangeRegex) || pLine.match(caseNumberRegex)) {
          parties = pLine;
        }
      }
    }

    // Clean up parties
    parties = parties
      .replace(roomRegex, "")
      .replace(timeRangeRegex, "")
      .replace(timeRegex, "")
      .trim();
    for (const ht of hearingTypes) {
      parties = parties.replace(new RegExp(ht, "gi"), "").trim();
    }
    parties = parties.replace(/^[\s,;:.\-–]+|[\s,;:.\-–]+$/g, "");

    // Detect another court in saken: "Uppsala tingsrätt - mord m.m."
    const courtInSakenRegex = /^(.+(?:tingsrätt|hovrätt|kammarrätt))\s*[-–—]\s*(.+)$/i;
    let resolvedCourt = court;
    const courtInSaken = saken.match(courtInSakenRegex);
    if (courtInSaken) {
      const otherCourt = courtInSaken[1].trim();
      saken = courtInSaken[2].trim();
      resolvedCourt = `${otherCourt} (plats: ${court})`;
    }

    // Detect "flera sakfrågor" from saken field
    const fleraSakfragorRegex = /m\s*\.?\s*m\s*\.?\s*$/i;
    const cleanedSaken = saken.replace(/[^\w\s.,åäöÅÄÖ]/g, "").trim();
    const fleraSakfragor = fleraSakfragorRegex.test(saken) || fleraSakfragorRegex.test(cleanedSaken);
    console.log("Saken for fleraSakfragor check:", JSON.stringify(saken), "->", fleraSakfragor);

    // Enrich lagrum and sakområde for B-mål
    const lagrumMatch = matchLagrum(saken, caseNumber);

    idCounter++;
    const hearing: Hearing = {
      id: `parsed-${idCounter}`,
      date: currentDate || "Okänt datum",
      time: time || "–",
      court: resolvedCourt,
      caseNumber,
      type,
      maltyp: getMaltyp(caseNumber),
      room: room || "–",
      saken: saken || "–",
      parties: parties || "–",
      lagrum: lagrumMatch.lagrum,
      sakomrade: lagrumMatch.sakomrade,
      fleraSakfragor,
    };
    console.log("Parsed hearing:", hearing);
    hearings.push(hearing);
  }

  return hearings;
}
