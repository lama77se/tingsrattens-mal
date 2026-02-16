export interface Hearing {
  id: string;
  date: string;
  time: string;
  court: string;
  caseNumber: string;
  type: string;
  room: string;
  parties: string;
}

/**
 * Parse raw PDF text from Swedish court PDFs into structured hearing objects.
 * This is a best-effort parser that handles common patterns across all Swedish district courts.
 */
export function parseCourtPdf(text: string, court: string): Hearing[] {
  if (!text || text.trim().length === 0) return [];

  const hearings: Hearing[] = [];
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // Track current date as we parse through the document
  let currentDate = "";
  let idCounter = 0;

  // Date pattern: e.g. "Måndag 2026-02-16", "2026-02-16", "Måndag den 16 februari 2026"
  const isoDateRegex = /(\d{4}-\d{2}-\d{2})/;
  const swedishDateRegex = /(\d{1,2})\s+(januari|februari|mars|april|maj|juni|juli|augusti|september|oktober|november|december)\s+(\d{4})/i;

  // Case number pattern: e.g. "T 1234-25", "B 5678-25", "FT 123-25", "Ä 456-25"
  const caseNumberRegex = /\b([TBFTÄ]\s?\d{1,6}-\d{2})\b/i;

  // Time pattern: e.g. "09:00", "13:30"
  const timeRegex = /\b(\d{1,2}:\d{2})\b/;

  // Room/Sal pattern: e.g. "Sal 3", "sal 12"
  const roomRegex = /\b[Ss]al\s+(\S+)/;

  // Common hearing types
  const hearingTypes = [
    "Huvudförhandling",
    "Häktningsförhandling",
    "Muntlig förberedelse",
    "Sammanträde",
    "Förhandling",
    "Tredskodom",
    "Avgörande",
  ];

  const monthMap: Record<string, string> = {
    januari: "01", februari: "02", mars: "03", april: "04",
    maj: "05", juni: "06", juli: "07", augusti: "08",
    september: "09", oktober: "10", november: "11", december: "12",
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Try to extract a date from this line
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

    // Look for case numbers - this signals a hearing entry
    const caseMatch = line.match(caseNumberRegex);
    if (!caseMatch) continue;

    const caseNumber = caseMatch[1];

    // Extract time from this line or nearby lines
    let time = "";
    const timeMatch = line.match(timeRegex);
    if (timeMatch) {
      time = timeMatch[1];
    } else if (i > 0) {
      const prevTimeMatch = lines[i - 1].match(timeRegex);
      if (prevTimeMatch) time = prevTimeMatch[1];
    }

    // Extract room
    let room = "";
    const roomMatch = line.match(roomRegex);
    if (roomMatch) {
      room = `Sal ${roomMatch[1]}`;
    } else {
      // Check surrounding lines for room info
      for (let j = Math.max(0, i - 2); j <= Math.min(lines.length - 1, i + 2); j++) {
        const rm = lines[j].match(roomRegex);
        if (rm) {
          room = `Sal ${rm[1]}`;
          break;
        }
      }
    }

    // Detect hearing type
    let type = "Förhandling";
    const lowerLine = line.toLowerCase();
    for (const ht of hearingTypes) {
      if (lowerLine.includes(ht.toLowerCase())) {
        type = ht;
        break;
      }
    }
    // Also check next line for type
    if (type === "Förhandling" && i + 1 < lines.length) {
      const nextLower = lines[i + 1].toLowerCase();
      for (const ht of hearingTypes) {
        if (nextLower.includes(ht.toLowerCase())) {
          type = ht;
          break;
        }
      }
    }

    // Extract parties - look for text after case number or on following lines
    let parties = "";
    const afterCase = line.substring(line.indexOf(caseNumber) + caseNumber.length).trim();
    if (afterCase.length > 3) {
      parties = afterCase.replace(/^[\s,;:.\-]+/, "").trim();
    }
    if (!parties && i + 1 < lines.length && !lines[i + 1].match(caseNumberRegex)) {
      parties = lines[i + 1].trim();
    }

    // Clean up parties - remove room/type info if accidentally captured
    parties = parties
      .replace(roomRegex, "")
      .replace(timeRegex, "")
      .trim()
      .replace(/^[\s,;:.\-]+|[\s,;:.\-]+$/g, "");

    idCounter++;
    hearings.push({
      id: `parsed-${idCounter}`,
      date: currentDate || "Okänt datum",
      time: time || "–",
      court,
      caseNumber,
      type,
      room: room || "–",
      parties: parties || "–",
    });
  }

  return hearings;
}
