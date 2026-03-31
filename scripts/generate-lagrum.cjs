#!/usr/bin/env node
/**
 * generate-lagrum.cjs
 *
 * Parses the Brå "Klassificering av brott" PDF and generates a TypeScript
 * file with crime-name → lagrum/sakomrade mappings.
 *
 * Usage:
 *   node scripts/generate-lagrum.cjs bra-klassificering.pdf > src/lib/lagrumMappings.ts
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

// Suppress pdf-parse/pdf.js warnings that leak to stdout
const _origWarn = console.warn;
const _origLog = console.log;
function _suppressPdfWarnings() {
  console.warn = (...args) => {
    const msg = args.join(" ");
    if (msg.includes("TT:") || msg.includes("undefined function")) return;
    _origWarn.apply(console, args);
  };
  console.log = (...args) => {
    const msg = args.join(" ");
    if (msg.includes("TT:") || msg.includes("undefined function") || msg.includes("Warning:")) return;
    _origLog.apply(console, args);
  };
}
function _restoreConsole() {
  console.warn = _origWarn;
  console.log = _origLog;
}
_suppressPdfWarnings();

// pdf-parse v1.1.1 bug workaround — import lib directly
const pdfParse = require(path.join(
  __dirname,
  "..",
  "node_modules",
  "pdf-parse",
  "lib",
  "pdf-parse.js"
));

// ── BrB chapter → sakomrade ─────────────────────────────────────────────────
const BRB_CHAPTER_SAKOMRADE = {
  3: "Brott mot liv och hälsa",
  4: "Brott mot frihet och frid",
  5: "Ärekränkningsbrott",
  6: "Sexualbrott",
  7: "Brott mot familj",
  8: "Förmögenhetsbrott",
  9: "Förmögenhetsbrott",
  10: "Förmögenhetsbrott",
  11: "Brott mot borgenärer / ekonomisk brottslighet",
  12: "Skadegörelsebrott",
  13: "Allmänfarliga brott",
  14: "Förfalskningsbrott",
  15: "Brott mot rättskipningen",
  16: "Brott mot allmän ordning",
  17: "Brott mot allmän verksamhet",
  18: "Högmålsbrott",
  19: "Brott mot Sveriges säkerhet",
  20: "Tjänstebrott",
  22: "Landsförräderi",
};

// ── Special-law name fragment → sakomrade ───────────────────────────────────
const SPECIAL_LAW_MAP = [
  [/narkotikastrafflagen/i, "Narkotikabrott"],
  [/dopningsmedel/i, "Narkotikabrott"],
  [/kontroll av narkotika/i, "Narkotikabrott"],
  [/vapenlag/i, "Vapenbrott"],
  [/knivlagen/i, "Vapenbrott"],
  [/brandfarliga och explosiva/i, "Vapenbrott"],
  [/smuggling/i, "Tull- och smugglingsbrott"],
  [/punktskattekontroll/i, "Tull- och smugglingsbrott"],
  [/trafikbrottslag/i, "Trafikbrott"],
  [/trafikförordning/i, "Trafikbrott"],
  [/alkohollag/i, "Alkohol- och punktskattebrott"],
  [/tobak/i, "Alkohol- och punktskattebrott"],
  [/nikotinprodukter/i, "Alkohol- och punktskattebrott"],
  [/miljöbalk/i, "Miljöbrott"],
  [/jaktlag/i, "Miljöbrott"],
  [/fiskelag/i, "Miljöbrott"],
  [/förorening från fartyg/i, "Miljöbrott"],
  [/skattebrottslagen/i, "Skattebrott"],
  [/sjölag/i, "Sjöfartsbrott"],
  [/sjötrafikförordning/i, "Sjöfartsbrott"],
  [/vattenskoter/i, "Sjöfartsbrott"],
  [/folkbokföring/i, "Ekonomisk brottslighet"],
  [/näringsförbud/i, "Ekonomisk brottslighet"],
  [/aktiebolagslagen/i, "Ekonomisk brottslighet"],
  [/marknadsmissbruk/i, "Ekonomisk brottslighet"],
  [/penningtvätt/i, "Ekonomisk brottslighet"],
  [/bidragsbrotts/i, "Bidragsbrott"],
  [/kontaktförbud/i, "Brott mot frihet och frid"],
  [/utlänningslagen/i, "Brott mot utlänningslagen"],
  [/immaterialrätt/i, "Immaterialrättsbrott"],
  [/upphovsrätt/i, "Immaterialrättsbrott"],
  [/varumärk/i, "Immaterialrättsbrott"],
  [/terroristbrott/i, "Terroristbrott"],
  [/internationella brott/i, "Brott mot internationell rätt"],
  [/ordningsvakt/i, "Brott mot allmän ordning"],
  [/ordningslagen/i, "Brott mot allmän ordning"],
];

function specialLawSakomrade(lawText) {
  for (const [re, area] of SPECIAL_LAW_MAP) {
    if (re.test(lawText)) return area;
  }
  return "Övrig speciallagstiftning";
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function log(...args) {
  process.stderr.write(args.join(" ") + "\n");
}

/** Download a URL to a buffer */
function downloadUrl(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    mod.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadUrl(res.headers.location).then(resolve, reject);
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

/** Strip demographic/situational details from crime descriptions */
function stripDemographics(desc) {
  let s = desc;

  // Remove "mot kvinna/man/flicka/pojke..." and everything after
  s = s.replace(/,?\s*mot\s+(kvinna|man|flicka|pojke|barn|person).*$/i, "");

  // Remove "med/utan användning av skjutvapen"
  s = s.replace(/,?\s*(med|utan)\s+användning\s+av\s+skjutvapen/gi, "");

  // Remove "i samband med..."
  s = s.replace(/,?\s*i\s+samband\s+med\s+.*/i, "");

  // Remove internetrelaterat / ej internetrelaterat
  s = s.replace(/,?\s*(ej\s+)?internetrelaterat/gi, "");

  // Remove utomhus / inomhus
  s = s.replace(/,?\s*(utomhus|inomhus)/gi, "");

  // Remove obekanta / bekanta
  s = s.replace(/,?\s*(obekanta|bekanta)/gi, "");

  // Remove "inkl. grovt/grov" (keep if at start — it's the crime variant)
  // Only strip trailing "inkl. ..."
  s = s.replace(/,?\s*inkl\.\s+(grovt?|vårdslöshet|försök).*$/i, "");

  // Remove age ranges like "18 år eller äldre", "under 18 år", "0-6 år", etc.
  s = s.replace(/,?\s*\d+[\u2013–-]?\d*\s*år(\s+eller\s+äldre)?/gi, "");
  s = s.replace(/,?\s*under\s+\d+\s*år/gi, "");

  // Remove "är eller har varit närstående genom ..."
  s = s.replace(/,?\s*är\s+eller\s+har\s+varit\s+.*/i, "");

  // Remove "ej äldre/funktionsnedsatt"
  s = s.replace(/,?\s*ej\s+äldre\/funktionsnedsatt/gi, "");
  s = s.replace(/,?\s*äldre\/funktionsnedsatt/gi, "");

  // Remove trailing commas and whitespace
  s = s.replace(/[,\s]+$/, "").trim();

  return s;
}

/** Normalize a crime name to lowercase key */
function toKey(name) {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

// ── Pass 1: Extract section headers with lagrum from main body ──────────────

function extractPass1(lines) {
  const entries = {};
  const brbHeaderRe = /^(.+?),?\s+(\d+)\s*kap\.\s*([\d,\s–\-a-z]+)\s*§\s*BrB\s*$/i;
  const specialHeaderRe = /^(.+?)\s*\((\d{4}:\d+)\)\s*(?:,?\s*([\d,\s–\-a-z\s§kap.]+))?\s*$/i;

  // Track current context for special laws
  let currentSpecialLaw = null;
  let inBrottskoder = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Stop at the flat listing section
    if (line === "Brottskoder i nummerordning" && i > 200) {
      break;
    }

    // Skip TOC lines (contain dots)
    if (line.includes("...")) continue;

    // Skip empty / commentary lines
    if (!line) continue;
    if (/^(Observera|Kommentar|Exempel|Kodas|Definition|Undantag)/i.test(line)) continue;

    // Skip page numbers (standalone digits)
    if (/^\d{1,3}$/.test(line)) continue;

    // Try BrB header: "Misshandel, 3 kap. 5, 6 § BrB"
    const brbMatch = line.match(brbHeaderRe);
    if (brbMatch) {
      const crimeName = brbMatch[1].trim();
      const chapter = parseInt(brbMatch[2], 10);
      const paragraphs = brbMatch[3].trim();
      const sakomrade = BRB_CHAPTER_SAKOMRADE[chapter];
      if (!sakomrade) continue;

      // Build lagrum references
      const paraNums = paragraphs
        .split(/[,\s]+/)
        .filter((p) => /\d/.test(p))
        .map((p) => p.trim());

      const lagrumList = paraNums.map(
        (p) => `BrB ${chapter} kap. ${p} §`
      );

      const key = toKey(crimeName);
      if (key.length < 3) continue;

      if (!entries[key]) {
        entries[key] = {
          sakomrade,
          primart_lagrum: lagrumList.length > 0 ? [lagrumList[0]] : [],
          alternativa_lagrum: lagrumList.length > 1 ? lagrumList.slice(1) : undefined,
        };
      }
      currentSpecialLaw = null;
      continue;
    }

    // Track special law sections: "Narkotikastrafflagen (1968:64), 1–3, 3 a, 3 b §"
    const specialMatch = line.match(specialHeaderRe);
    if (specialMatch) {
      const lawName = specialMatch[1].trim();
      const lawYear = specialMatch[2];
      currentSpecialLaw = { name: lawName, year: lawYear, full: line };
      continue;
    }

    // Also detect law references like "Narkotikastrafflagen (1968:64)"
    const lawRef = line.match(/^([\wåäöÅÄÖ\s]+)\s*\((\d{4}:\d+)\)/);
    if (lawRef && !line.match(/\d{4}\s/)) {
      currentSpecialLaw = { name: lawRef[1].trim(), year: lawRef[2], full: line };
    }
  }

  return entries;
}

// ── Pass 2: Extract from "Brottskoder i nummerordning" ─────────────────────

function extractPass2(lines) {
  const entries = {};
  let inSection = false;
  let currentCode = null;
  let currentDesc = "";

  function flushEntry() {
    if (!currentCode || !currentDesc) return;
    const fullDesc = currentDesc.trim();
    const stripped = stripDemographics(fullDesc);
    if (!stripped || stripped.length < 3) return;
    const key = toKey(stripped);
    if (!entries[key]) {
      entries[key] = { fullDescs: new Set(), code: currentCode };
    }
    entries[key].fullDescs.add(fullDesc);
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line === "Brottskoder i nummerordning" && i > 200) {
      inSection = true;
      continue;
    }
    if (!inSection) continue;

    // Skip empty lines
    if (!line) continue;

    // Skip standalone page numbers
    if (/^\d{1,3}$/.test(line)) continue;

    // Skip footer/end matter
    if (line.startsWith("Brottsförebyggande rådet")) break;
    if (line.startsWith("urn:")) break;

    // Check for 4-digit code line
    const codeMatch = line.match(/^(\d{4})\s+(.*)/);
    if (codeMatch) {
      // Flush previous
      flushEntry();
      currentCode = codeMatch[1];
      currentDesc = codeMatch[2];
    } else {
      // Continuation line
      if (currentCode) {
        currentDesc += " " + line;
      }
    }
  }
  // Flush last
  flushEntry();

  return entries;
}

// ── Classify pass-2 entries using BrB code ranges + special law heuristics ──

function classifyCode(code, desc) {
  const c = parseInt(code, 10);
  const lowerDesc = desc.toLowerCase();

  // BrB code ranges — verified against the actual PDF brottskoder listing
  // 0309-0396: 3 kap. BrB (liv och hälsa: mord, misshandel, vållande)
  if (c >= 309 && c <= 399) return { sakomrade: "Brott mot liv och hälsa", lawHint: "BrB 3 kap." };

  // 0401-0499: 4 kap. BrB (frihet och frid: människorov, olaga hot, etc.)
  if (c >= 401 && c <= 499) return { sakomrade: "Brott mot frihet och frid", lawHint: "BrB 4 kap." };

  // 0510-0513: 5 kap. BrB (ärekränkning)
  if (c >= 510 && c <= 599) return { sakomrade: "Ärekränkningsbrott", lawHint: "BrB 5 kap." };

  // 0609-0681: 6 kap. BrB (sexualbrott)
  if (c >= 600 && c <= 699) return { sakomrade: "Sexualbrott", lawHint: "BrB 6 kap." };

  // 0700-0713: 7 kap. BrB (brott mot familj)
  if (c >= 700 && c <= 799) return { sakomrade: "Brott mot familj", lawHint: "BrB 7 kap." };

  // 0801-0999: 8 kap. BrB (stöld, rån, tillgrepp) — includes häleri (0999)
  if (c >= 800 && c <= 999) return { sakomrade: "Förmögenhetsbrott", lawHint: "BrB 8 kap." };

  // 1001-1011: 9-10 kap. BrB (bedrägeri, förskingring, trolöshet)
  if (c >= 1000 && c <= 1099) return { sakomrade: "Förmögenhetsbrott", lawHint: "BrB 9-10 kap." };

  // 1111-1133: 11 kap. BrB (borgenärsbrott, bokföringsbrott)
  if (c >= 1100 && c <= 1199) return { sakomrade: "Brott mot borgenärer / ekonomisk brottslighet", lawHint: "BrB 11 kap." };

  // 1201-1212: 12 kap. BrB (skadegörelse)
  if (c >= 1200 && c <= 1299) return { sakomrade: "Skadegörelsebrott", lawHint: "BrB 12 kap." };

  // 1301-1316: 13 kap. BrB (allmänfarliga brott: mordbrand, etc.)
  if (c >= 1300 && c <= 1399) return { sakomrade: "Allmänfarliga brott", lawHint: "BrB 13 kap." };

  // 1401-1410: 14 kap. BrB (förfalskningsbrott)
  if (c >= 1400 && c <= 1499) return { sakomrade: "Förfalskningsbrott", lawHint: "BrB 14 kap." };

  // 1501-1506: 15 kap. BrB (mened, falskt åtal)
  if (c >= 1500 && c <= 1599) return { sakomrade: "Brott mot rättskipningen", lawHint: "BrB 15 kap." };

  // 1602-1617: 16 kap. BrB (brott mot allmän ordning)
  if (c >= 1600 && c <= 1699) return { sakomrade: "Brott mot allmän ordning", lawHint: "BrB 16 kap." };

  // 1701-1713: 17 kap. BrB (brott mot allmän verksamhet)
  if (c >= 1700 && c <= 1799) return { sakomrade: "Brott mot allmän verksamhet", lawHint: "BrB 17 kap." };

  // 1802-1806: 18 kap. BrB (högmålsbrott)
  if (c >= 1800 && c <= 1899) return { sakomrade: "Högmålsbrott", lawHint: "BrB 18 kap." };

  // 1902-1909: 19 kap. BrB (brott mot Sveriges säkerhet)
  if (c >= 1900 && c <= 1999) return { sakomrade: "Brott mot Sveriges säkerhet", lawHint: "BrB 19 kap." };

  // 2002-2004: 20 kap. BrB (tjänstebrott)
  if (c >= 2000 && c <= 2099) return { sakomrade: "Tjänstebrott", lawHint: "BrB 20 kap." };

  // 2204-2208: 22 kap. BrB (landsförräderi)
  if (c >= 2200 && c <= 2299) return { sakomrade: "Landsförräderi", lawHint: "BrB 22 kap." };

  // ── Special law code ranges ──

  // 3001-3008: Miljöbalken
  if (c >= 3001 && c <= 3069) return { sakomrade: "Miljöbrott", lawHint: "Miljöbalken" };

  // 3070-3204: Trafikbrott (trafikbrottslagen, sjölag, etc.)
  if (c >= 3070 && c <= 3299) {
    if (lowerDesc.includes("sjö") || lowerDesc.includes("fartyg") || lowerDesc.includes("vattenskoter")) {
      return { sakomrade: "Sjöfartsbrott", lawHint: "Sjölagen" };
    }
    return { sakomrade: "Trafikbrott", lawHint: "Trafikbrottslagen" };
  }

  // 4011-4144: Smuggling, vapen, kniv, explosiva varor, kontaktförbud
  if (c >= 4000 && c <= 4199) {
    if (lowerDesc.includes("smuggling") || lowerDesc.includes("tull") || lowerDesc.includes("punktskatt")) {
      return { sakomrade: "Tull- och smugglingsbrott", lawHint: "Smugglingslagen" };
    }
    if (lowerDesc.includes("vapen") || lowerDesc.includes("pistol") || lowerDesc.includes("automatvapen") || lowerDesc.includes("jaktvapen")) {
      return { sakomrade: "Vapenbrott", lawHint: "Vapenlagen" };
    }
    if (lowerDesc.includes("kniv")) {
      return { sakomrade: "Vapenbrott", lawHint: "Knivlagen" };
    }
    if (lowerDesc.includes("explosiv") || lowerDesc.includes("brandfarlig")) {
      return { sakomrade: "Vapenbrott", lawHint: "Lagen om brandfarliga och explosiva varor" };
    }
    if (lowerDesc.includes("kontaktförbud") || lowerDesc.includes("övervakning")) {
      return { sakomrade: "Brott mot frihet och frid", lawHint: "Kontaktförbudslagen" };
    }
    return { sakomrade: "Tull- och smugglingsbrott", lawHint: "Smugglingslagen" };
  }

  // 5001-5018: Narkotika, dopning, tobak
  if (c >= 5001 && c <= 5019) {
    if (lowerDesc.includes("dopning")) return { sakomrade: "Narkotikabrott", lawHint: "Dopningslagen" };
    if (lowerDesc.includes("tobak") || lowerDesc.includes("nikotin")) return { sakomrade: "Alkohol- och punktskattebrott", lawHint: "Tobakslagen" };
    return { sakomrade: "Narkotikabrott", lawHint: "Narkotikastrafflagen" };
  }

  // 5020-5025: Skattebrott
  if (c >= 5020 && c <= 5029) return { sakomrade: "Skattebrott", lawHint: "Skattebrottslagen" };

  // 5030-5059: Ekonomisk brottslighet (aktiebolag, marknadsmissbruk, etc.)
  if (c >= 5030 && c <= 5059) return { sakomrade: "Ekonomisk brottslighet", lawHint: "Speciallag" };

  // 5040-5048: Alkohol
  if (c >= 5040 && c <= 5049) return { sakomrade: "Alkohol- och punktskattebrott", lawHint: "Alkohollagen" };

  // 5060-5075: Bidragsbrott
  if (c >= 5060 && c <= 5079) return { sakomrade: "Bidragsbrott", lawHint: "Bidragsbrottslagen" };

  // 5078-5082: Marknadsmissbruk
  if (c >= 5078 && c <= 5082) return { sakomrade: "Ekonomisk brottslighet", lawHint: "Marknadsmissbrukslagen" };

  // 5083: Folkbokföringsbrott
  if (c === 5083) return { sakomrade: "Ekonomisk brottslighet", lawHint: "Folkbokföringslagen" };

  // 5120-5130: Penningtvätt
  if (c >= 5120 && c <= 5130) return { sakomrade: "Ekonomisk brottslighet", lawHint: "Penningtvättslagen" };

  // 6001-6004: Utlänningslagen
  if (c >= 6001 && c <= 6010) return { sakomrade: "Brott mot utlänningslagen", lawHint: "Utlänningslagen" };

  // 6101-6162: Terroristbrott, internationella brott, immaterialrätt, övriga
  if (c >= 6100 && c <= 6199) {
    if (lowerDesc.includes("terrorist")) return { sakomrade: "Terroristbrott", lawHint: "Terroristbrottslagen" };
    if (lowerDesc.includes("upphovsrätt") || lowerDesc.includes("varumärk") || lowerDesc.includes("patent")) {
      return { sakomrade: "Immaterialrättsbrott", lawHint: "Upphovsrättslagen" };
    }
    return { sakomrade: "Övrig speciallagstiftning", lawHint: "Speciallag" };
  }

  // 7001-7043: Övriga brott / ordningsbrott
  if (c >= 7000 && c <= 7099) return { sakomrade: "Övriga brott", lawHint: "" };

  // 8001-8051: Händelser (ej brott)
  if (c >= 8000 && c <= 8099) return { sakomrade: "Händelser (ej brott)", lawHint: "" };

  // 9xxx: Detailed variants of BrB crimes — classify by description
  if (c >= 9000) {
    if (lowerDesc.includes("mord") || lowerDesc.includes("dråp") || lowerDesc.includes("misshandel") ||
        lowerDesc.includes("vållande till") || lowerDesc.includes("framkallande av fara")) {
      return { sakomrade: "Brott mot liv och hälsa", lawHint: "BrB 3 kap." };
    }
    if (lowerDesc.includes("olaga hot") || lowerDesc.includes("olaga tvång") || lowerDesc.includes("fridskränkning") ||
        lowerDesc.includes("frihetsberövande") || lowerDesc.includes("ofredande") || lowerDesc.includes("barnfridsbrott") ||
        lowerDesc.includes("människorov") || lowerDesc.includes("olaga förföljelse") || lowerDesc.includes("integritetsintrång")) {
      return { sakomrade: "Brott mot frihet och frid", lawHint: "BrB 4 kap." };
    }
    if (lowerDesc.includes("våldtäkt") || lowerDesc.includes("sexuellt") || lowerDesc.includes("sexuell")) {
      return { sakomrade: "Sexualbrott", lawHint: "BrB 6 kap." };
    }
    if (lowerDesc.includes("stöld") || lowerDesc.includes("rån") || lowerDesc.includes("tillgrepp") ||
        lowerDesc.includes("fickstöld") || lowerDesc.includes("inbrott") || lowerDesc.includes("väskryckning")) {
      return { sakomrade: "Förmögenhetsbrott", lawHint: "BrB 8 kap." };
    }
    if (lowerDesc.includes("bedrägeri")) {
      return { sakomrade: "Förmögenhetsbrott", lawHint: "BrB 9 kap." };
    }
    return { sakomrade: "Övriga brott", lawHint: "" };
  }

  // Broad catch by description
  if (lowerDesc.includes("narkotika")) return { sakomrade: "Narkotikabrott", lawHint: "Narkotikastrafflagen" };
  if (lowerDesc.includes("vapen")) return { sakomrade: "Vapenbrott", lawHint: "Vapenlagen" };
  if (lowerDesc.includes("smuggling")) return { sakomrade: "Tull- och smugglingsbrott", lawHint: "Smugglingslagen" };
  if (lowerDesc.includes("trafik") || lowerDesc.includes("rattonykter") || lowerDesc.includes("rattfylleri")) {
    return { sakomrade: "Trafikbrott", lawHint: "Trafikbrottslagen" };
  }
  if (lowerDesc.includes("alkohol") || lowerDesc.includes("sprit")) {
    return { sakomrade: "Alkohol- och punktskattebrott", lawHint: "Alkohollagen" };
  }

  return { sakomrade: "Övriga brott", lawHint: "" };
}

// ── Merge passes and generate output ────────────────────────────────────────

function mergeAndGenerate(pass1, pass2) {
  const merged = {};

  // Add all pass-1 entries (higher quality — have explicit lagrum)
  for (const [key, entry] of Object.entries(pass1)) {
    merged[key] = entry;
  }

  // Add pass-2 entries that aren't already covered
  let pass2Added = 0;
  let pass2Skipped = 0;
  for (const [key, entry] of Object.entries(pass2)) {
    if (merged[key]) {
      pass2Skipped++;
      continue;
    }

    // Classify based on code
    const classification = classifyCode(entry.code, key);
    merged[key] = {
      sakomrade: classification.sakomrade,
      primart_lagrum: classification.lawHint ? [classification.lawHint] : [],
    };
    pass2Added++;
  }

  log(`Pass 2: added ${pass2Added} new entries, skipped ${pass2Skipped} duplicates`);
  return merged;
}

// ── Generate TypeScript ─────────────────────────────────────────────────────

function generateTypeScript(merged) {
  const sortedKeys = Object.keys(merged).sort((a, b) => a.localeCompare(b, "sv"));

  let ts = `// Auto-generated by scripts/generate-lagrum.cjs from Brå "Klassificering av brott"
// Do not edit manually — re-generate with:
//   node scripts/generate-lagrum.cjs bra-klassificering.pdf > src/lib/lagrumMappings.ts

export interface LagrumEntry {
  sakomrade: string;
  primart_lagrum: string[];
  alternativa_lagrum?: string[];
}

const mappings: Record<string, LagrumEntry> = {\n`;

  for (const key of sortedKeys) {
    const entry = merged[key];
    const primart = JSON.stringify(entry.primart_lagrum);
    let line = `  ${JSON.stringify(key)}: {\n`;
    line += `    sakomrade: ${JSON.stringify(entry.sakomrade)},\n`;
    line += `    primart_lagrum: ${primart},\n`;
    if (entry.alternativa_lagrum && entry.alternativa_lagrum.length > 0) {
      line += `    alternativa_lagrum: ${JSON.stringify(entry.alternativa_lagrum)},\n`;
    }
    line += `  },\n`;
    ts += line;
  }

  ts += `};\n\n`;

  ts += `// Sort keys longest-first so "grov misshandel" matches before "misshandel"
const sortedKeys = Object.keys(mappings).sort((a, b) => b.length - a.length);

export function matchLagrum(
  saken: string,
  caseNumber: string
): { lagrum: string; sakomrade: string } {
  const empty = { lagrum: "", sakomrade: "" };

  const trimmedCase = caseNumber.trim().toUpperCase();
  if (trimmedCase && !trimmedCase.startsWith("B")) return empty;

  const cleanSaken = saken
    .toLowerCase()
    .replace(/m\\.?\\s*m\\.?\\s*$/, "")
    .trim();

  for (const key of sortedKeys) {
    if (cleanSaken.includes(key)) {
      const data = mappings[key];
      let lagrum = data.primart_lagrum[0] || "";

      if (/grov|grovt/i.test(cleanSaken) && data.alternativa_lagrum) {
        const aggravated = data.alternativa_lagrum.find((alt) =>
          alt.toLowerCase().includes("grov")
        );
        if (aggravated) lagrum = aggravated.replace(/\\s*\\(.*\\)\\s*$/, "").trim();
      }

      return { lagrum, sakomrade: data.sakomrade };
    }
  }

  return empty;
}
`;

  return ts;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const input = process.argv[2];
  if (!input) {
    log("Usage: node scripts/generate-lagrum.cjs <pdf-file-or-url>");
    process.exit(1);
  }

  let buffer;
  if (input.startsWith("http://") || input.startsWith("https://")) {
    log(`Downloading ${input}...`);
    buffer = await downloadUrl(input);
    log(`Downloaded ${buffer.length} bytes`);
  } else {
    const filePath = path.resolve(input);
    if (!fs.existsSync(filePath)) {
      log(`File not found: ${filePath}`);
      process.exit(1);
    }
    buffer = fs.readFileSync(filePath);
    log(`Read ${buffer.length} bytes from ${filePath}`);
  }

  log("Parsing PDF...");
  const data = await pdfParse(buffer);
  const lines = data.text.split("\n");
  log(`Extracted ${lines.length} lines of text`);

  log("Pass 1: Extracting section headers with lagrum references...");
  const pass1 = extractPass1(lines);
  log(`  Pass 1 found ${Object.keys(pass1).length} entries`);

  log("Pass 2: Extracting brottskoder listing...");
  const pass2 = extractPass2(lines);
  log(`  Pass 2 found ${Object.keys(pass2).length} unique base crime names`);

  log("Merging passes...");
  const merged = mergeAndGenerate(pass1, pass2);
  log(`Total merged entries: ${Object.keys(merged).length}`);

  const ts = generateTypeScript(merged);
  process.stdout.write(ts);

  log("Done!");
}

main().catch((err) => {
  log("Error:", err.message || err);
  process.exit(1);
});
