interface LagrumEntry {
  sakomrade: string;
  primart_lagrum: string[];
  alternativa_lagrum?: string[];
  kommentar?: string;
}

const mappings: Record<string, LagrumEntry> = {
  "grov misshandel": {
    sakomrade: "Brott mot liv och hälsa",
    primart_lagrum: ["BrB 3 kap. 6 §"],
  },
  "misshandel": {
    sakomrade: "Brott mot liv och hälsa",
    primart_lagrum: ["BrB 3 kap. 5 §"],
    alternativa_lagrum: ["BrB 3 kap. 6 § (grov misshandel)"],
  },
  "olaga hot": {
    sakomrade: "Brott mot frihet och frid",
    primart_lagrum: ["BrB 4 kap. 5 §"],
  },
  "ofredande": {
    sakomrade: "Brott mot frihet och frid",
    primart_lagrum: ["BrB 4 kap. 7 §"],
  },
  "hemfridsbrott": {
    sakomrade: "Brott mot frihet och frid",
    primart_lagrum: ["BrB 4 kap. 6 §"],
  },
  "rån": {
    sakomrade: "Förmögenhetsbrott",
    primart_lagrum: ["BrB 8 kap. 5 §"],
    alternativa_lagrum: ["BrB 8 kap. 6 § (grovt rån)"],
  },
  "stöld": {
    sakomrade: "Förmögenhetsbrott",
    primart_lagrum: ["BrB 8 kap. 1 §"],
    alternativa_lagrum: ["BrB 8 kap. 4 § (grov stöld)"],
  },
  "bedrägeri": {
    sakomrade: "Förmögenhetsbrott",
    primart_lagrum: ["BrB 9 kap. 1 §"],
    alternativa_lagrum: ["BrB 9 kap. 3 § (grovt bedrägeri)"],
  },
  "skadegörelse": {
    sakomrade: "Skadegörelsebrott",
    primart_lagrum: ["BrB 12 kap. 1 §"],
  },
  "våld mot tjänsteman": {
    sakomrade: "Brott mot allmän verksamhet",
    primart_lagrum: ["BrB 17 kap. 1 §"],
  },
  "förgripelse mot tjänsteman": {
    sakomrade: "Brott mot allmän verksamhet",
    primart_lagrum: ["BrB 17 kap. 2 §"],
  },
  "narkotikabrott": {
    sakomrade: "Narkotikabrott",
    primart_lagrum: ["Narkotikastrafflagen (1968:64) 1 §"],
    alternativa_lagrum: ["2 § (grovt narkotikabrott)"],
  },
  "rattfylleri": {
    sakomrade: "Trafikbrott",
    primart_lagrum: ["Trafikbrottslagen (1951:649) 4 §"],
    alternativa_lagrum: ["4 a § (grovt rattfylleri)"],
  },
  "olovlig körning": {
    sakomrade: "Trafikbrott",
    primart_lagrum: ["Trafikbrottslagen (1951:649) 3 §"],
  },
  "brott mot trafikförordningen": {
    sakomrade: "Trafikbrott",
    primart_lagrum: ["Trafikförordningen (1998:1276)"],
  },
  "köp av sexuell tjänst": {
    sakomrade: "Sexualbrott",
    primart_lagrum: ["BrB 6 kap. 11 §"],
  },
  "koppleri": {
    sakomrade: "Sexualbrott",
    primart_lagrum: ["BrB 6 kap. 12 §"],
  },
  "vapenbrott": {
    sakomrade: "Vapenbrott",
    primart_lagrum: ["Vapenlagen (1996:67)"],
  },
  "penningtvättsbrott": {
    sakomrade: "Ekonomisk brottslighet",
    primart_lagrum: ["Lag (2014:307) om straff för penningtvättsbrott 3 §"],
  },
};

// Sort keys longest-first so "grov misshandel" matches before "misshandel"
const sortedKeys = Object.keys(mappings).sort((a, b) => b.length - a.length);

export function matchLagrum(
  saken: string,
  caseNumber: string
): { lagrum: string; sakomrade: string } {
  const empty = { lagrum: "", sakomrade: "" };

  // Only enrich B-mål (criminal cases)
  if (!caseNumber.trim().toUpperCase().startsWith("B")) return empty;

  // Clean saken: lowercase + strip trailing "m m" / "m.m."
  const cleanSaken = saken
    .toLowerCase()
    .replace(/m\.?\s*m\.?\s*$/, "")
    .trim();

  for (const key of sortedKeys) {
    if (cleanSaken.includes(key)) {
      const data = mappings[key];
      let lagrum = data.primart_lagrum[0];

      // Check for aggravated variant
      if (/grov|grovt/i.test(cleanSaken) && data.alternativa_lagrum) {
        const aggravated = data.alternativa_lagrum.find((alt) =>
          alt.toLowerCase().includes("grov")
        );
        if (aggravated) {
          // Strip parenthetical comment e.g. "(grovt rån)"
          lagrum = aggravated.replace(/\s*\(.*\)\s*$/, "").trim();
        }
      }

      return { lagrum, sakomrade: data.sakomrade };
    }
  }

  return empty;
}
