export interface Hearing {
  id: string;
  date: string;
  time: string;
  court: string;
  caseNumber: string;
  type: string;
  room: string;
  saken: string;
  parties: string;
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
 * Parse raw PDF text from Swedish court PDFs into structured hearing objects.
 */
export function parseCourtPdf(text: string, court: string): Hearing[] {
  if (!text || text.trim().length === 0) return [];

  const hearings: Hearing[] = [];
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  let currentDate = "";
  let idCounter = 0;

  // Short date pattern: e.g. "16-feb", "3-mar" — MUST be checked before ISO to avoid false matches
  const shortDateRegex = /\b(\d{1,2})-(jan|feb|mar|apr|maj|jun|jul|aug|sep|okt|nov|dec)\b/i;
  const shortMonthMap: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04",
    maj: "05", jun: "06", jul: "07", aug: "08",
    sep: "09", okt: "10", nov: "11", dec: "12",
  };

  // ISO date: "2026-02-16"
  const isoDateRegex = /(\d{4}-\d{2}-\d{2})/;
  // Swedish long date: "16 februari 2026"
  const swedishDateRegex = /(\d{1,2})\s+(januari|februari|mars|april|maj|juni|juli|augusti|september|oktober|november|december)\s+(\d{4})/i;

  const monthMap: Record<string, string> = {
    januari: "01", februari: "02", mars: "03", april: "04",
    maj: "05", juni: "06", juli: "07", augusti: "08",
    september: "09", oktober: "10", november: "11", december: "12",
  };

  // Case number: "T 1234-25", "B 5678-25", "FT 123-25", "Ä 456-25"
  const caseNumberRegex = /\b([TBFTÄ]\s?\d{1,6}-\d{2})\b/i;

  // Time range: "09:00 - 11:00"
  const timeRangeRegex = /(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/;
  const timeRegex = /\b(\d{1,2}:\d{2})\b/;

  // Room/Sal: "Sal 3", "sal 12"
  const roomRegex = /\b[Ss]al\s+(\S+)/;

  // Hearing types — most specific first, generic "Förhandling" last
  const hearingTypes = [
    "Huvudförhandling",
    "Häktningsförhandling",
    "Muntlig förberedelse",
    "Sammanträde",
    "Tredskodom",
    "Avgörande",
    "Förhandling",
  ];

  // Pre-compute normalized type strings for matching
  const normalizedTypes = hearingTypes.map((ht) => ({ original: ht, normalized: normalize(ht) }));

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // --- Date extraction: try short date FIRST, then ISO, then Swedish long ---
    const shortMatch = line.match(shortDateRegex);
    if (shortMatch) {
      const day = shortMatch[1].padStart(2, "0");
      const month = shortMonthMap[shortMatch[2].toLowerCase()];
      if (month) {
        currentDate = `${new Date().getFullYear()}-${month}-${day}`;
      }
    } else {
      const isoMatch = line.match(isoDateRegex);
      if (isoMatch) {
        currentDate = isoMatch[1];
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

    // Extract time (prefer range, fallback to single)
    let time = "";
    const rangeMatch = line.match(timeRangeRegex);
    if (rangeMatch) {
      time = `${rangeMatch[1]} - ${rangeMatch[2]}`;
    } else {
      const timeMatch = line.match(timeRegex);
      if (timeMatch) {
        time = timeMatch[1];
      } else if (i > 0) {
        const prevRange = lines[i - 1].match(timeRangeRegex);
        if (prevRange) {
          time = `${prevRange[1]} - ${prevRange[2]}`;
        } else {
          const prevTimeMatch = lines[i - 1].match(timeRegex);
          if (prevTimeMatch) time = prevTimeMatch[1];
        }
      }
    }

    // Extract room
    let room = "";
    const roomMatch = line.match(roomRegex);
    if (roomMatch) {
      room = `Sal ${roomMatch[1]}`;
    } else {
      for (let j = Math.max(0, i - 2); j <= Math.min(lines.length - 1, i + 2); j++) {
        const rm = lines[j].match(roomRegex);
        if (rm) {
          room = `Sal ${rm[1]}`;
          break;
        }
      }
    }

    // Detect hearing type using normalized comparison for encoding robustness
    let type = "Förhandling";
    const normalizedLine = normalize(line);
    for (const nt of normalizedTypes) {
      if (normalizedLine.includes(nt.normalized)) {
        type = nt.original;
        break;
      }
    }
    // Also check next line for type
    if (type === "Förhandling" && i + 1 < lines.length) {
      const nextNormalized = normalize(lines[i + 1]);
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
      // Clean: remove room, time, type info
      saken = afterCase
        .replace(roomRegex, "")
        .replace(timeRangeRegex, "")
        .replace(timeRegex, "")
        .trim();
      for (const ht of hearingTypes) {
        saken = saken.replace(new RegExp(ht, "gi"), "").trim();
      }
      saken = saken.replace(/^[\s,;:.\-–]+|[\s,;:.\-–]+$/g, "").trim();
    }

    // Extract parties from following lines (not from the case number line)
    let parties = "";
    if (i + 1 < lines.length && !lines[i + 1].match(caseNumberRegex)) {
      const nextLine = lines[i + 1].trim();
      // Only use as parties if it doesn't look like a date or another structured line
      if (nextLine.length > 2 && !nextLine.match(shortDateRegex) && !nextLine.match(isoDateRegex)) {
        parties = nextLine;
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

    idCounter++;
    hearings.push({
      id: `parsed-${idCounter}`,
      date: currentDate || "Okänt datum",
      time: time || "–",
      court,
      caseNumber,
      type,
      room: room || "–",
      saken: saken || "–",
      parties: parties || "–",
    });
  }

  return hearings;
}
