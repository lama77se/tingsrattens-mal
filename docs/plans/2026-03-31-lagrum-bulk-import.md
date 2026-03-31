# Lagrum Bulk Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate a comprehensive `lagrumMappings.ts` from the authoritative Brå "Klassificering av brott" PDF, replacing the current hand-maintained 201 entries with 300+ authoritative mappings.

**Architecture:** A standalone CJS script (`scripts/generate-lagrum.cjs`) downloads and parses the Brå PDF using pdf-parse, extracts crime-type section headers with their lagrum references, maps BrB chapters to sakomrade names, and writes a complete TypeScript mappings file. Two-pass extraction: first the section headers for clean crime→lagrum mappings, then the flat code listing for additional crime names.

**Tech Stack:** Node.js, pdf-parse (already installed), CJS script

---

### Task 1: Create the script skeleton with PDF download and text extraction

**Files:**
- Create: `scripts/generate-lagrum.cjs`

- [ ] **Step 1: Create the script with PDF download + text extraction**

```javascript
// scripts/generate-lagrum.cjs
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const pdfParse = require(path.join(__dirname, "..", "node_modules", "pdf-parse", "lib", "pdf-parse.js"));

const DEFAULT_URL = "https://bra.se/download/18.62cc6337197a2139d229e93/1750945574555/2025_Klassificering%20av%20brott%20v%2013.1.pdf";

async function downloadPdf(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client.get(url, { headers: { "User-Agent": "tingsrattens-mal/1.0" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadPdf(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

async function main() {
  const input = process.argv[2] || DEFAULT_URL;

  let buffer;
  if (input.startsWith("http")) {
    process.stderr.write(`Downloading: ${input}\n`);
    buffer = await downloadPdf(input);
    process.stderr.write(`Downloaded ${buffer.length} bytes\n`);
  } else {
    buffer = fs.readFileSync(input);
    process.stderr.write(`Read ${buffer.length} bytes from ${input}\n`);
  }

  const parsed = await pdfParse(buffer);
  const lines = parsed.text.split("\n").map((l) => l.trim()).filter(Boolean);
  process.stderr.write(`Extracted ${lines.length} lines from ${parsed.numpages} pages\n`);

  // TODO: Pass 1 + Pass 2 extraction (Task 2+3)
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Test the download and extraction**

Run: `node scripts/generate-lagrum.cjs bra-klassificering.pdf 2>&1 | head -5`

Expected output:
```
Read 2780572 bytes from bra-klassificering.pdf
Extracted XXXX lines from 181 pages
```

- [ ] **Step 3: Commit**

```bash
git add scripts/generate-lagrum.cjs
git commit -m "feat: scaffold lagrum generation script with PDF extraction"
```

---

### Task 2: Add BrB chapter → sakomrade mapping table

**Files:**
- Modify: `scripts/generate-lagrum.cjs`

- [ ] **Step 1: Add the chapter-to-sakomrade lookup table and special law mappings**

Add after the imports in `scripts/generate-lagrum.cjs`:

```javascript
// BrB chapter number → sakomrade
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

// Special law name fragments → sakomrade
const SPECIAL_LAW_SAKOMRADE = {
  "narkotikastrafflagen": "Narkotikabrott",
  "vapenlagen": "Vapenbrott",
  "smuggling": "Tull- och smugglingsbrott",
  "trafikbrottslagen": "Trafikbrott",
  "alkohollagen": "Alkohol- och punktskattebrott",
  "miljöbalken": "Miljöbrott",
  "skattebrottslagen": "Skattebrott",
  "bokföringslagen": "Ekonomisk brottslighet",
  "arbetsmiljölagen": "Arbetsmiljöbrott",
  "djurskyddslagen": "Djurskyddsbrott",
  "utlänningslagen": "Utlänningsbrott",
  "bidragsbrottslagen": "Ekonomisk brottslighet",
  "penningtvättsbrott": "Ekonomisk brottslighet",
  "lagen om straff för finansiering": "Ekonomisk brottslighet",
  "ordningslagen": "Brott mot allmän ordning",
  "knivlagen": "Brott mot allmän ordning",
  "kulturmiljölagen": "Kulturmiljöbrott",
  "upphovsrätt": "Immaterialrättsbrott",
};

function getSakomrade(lagrumStr) {
  // Try BrB chapter
  const brbMatch = lagrumStr.match(/BrB\s+(\d+)\s*kap/i) || lagrumStr.match(/(\d+)\s*kap\.?\s*(?:\d+.*§\s*)?BrB/i);
  if (brbMatch) {
    const chapter = parseInt(brbMatch[1]);
    return BRB_CHAPTER_SAKOMRADE[chapter] || `BrB ${chapter} kap.`;
  }
  // Try special laws
  const lower = lagrumStr.toLowerCase();
  for (const [fragment, sakomrade] of Object.entries(SPECIAL_LAW_SAKOMRADE)) {
    if (lower.includes(fragment)) return sakomrade;
  }
  return "Övrig specialstraffrätt";
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/generate-lagrum.cjs
git commit -m "feat: add BrB chapter and special law sakomrade mappings"
```

---

### Task 3: Implement Pass 1 — extract section headers with lagrum

**Files:**
- Modify: `scripts/generate-lagrum.cjs`

The Brå PDF has section headers in the main body (lines ~250–4100) like:
- `Misshandel, 3 kap. 5, 6 § BrB`
- `Olaga hot, 4 kap. 5 § BrB`
- `Narkotikastrafflagen (1968:64), 1–3, 3 a, 3 b §`

These give us clean crime-name → lagrum mappings at the right granularity.

- [ ] **Step 1: Add the Pass 1 extraction function**

Add to `scripts/generate-lagrum.cjs`:

```javascript
/**
 * Pass 1: Extract crime-type section headers with lagrum references.
 * These are lines like "Olaga hot, 4 kap. 5 § BrB" in the main body.
 */
function extractSectionHeaders(lines) {
  const entries = [];
  // Only scan the main body (before the flat code listing appendix)
  const appendixStart = lines.findIndex((l) => /^Brottskoder i nummerordning/i.test(l));
  const endLine = appendixStart > 0 ? appendixStart : lines.length;

  // Match lines with explicit BrB lagrum: "Crime name, X kap. Y § BrB"
  const BRB_HEADER = /^(.+?),?\s+(\d+)\s*kap\.?\s*([\d,\s–\-a-z§]+§)\s*BrB\s*$/i;
  // Match special law headers: "Law name (year:nr), paragraphs"
  const LAW_HEADER = /^(.+?)\s*\((\d{4}:\d+)\)(?:,?\s*(.+§))?\s*$/;

  for (let i = 0; i < endLine; i++) {
    const line = lines[i];

    // Skip TOC lines (contain page numbers with dots)
    if (/\.{3,}/.test(line)) continue;
    // Skip commentary/example lines
    if (/^(Observera|Kommentar|Definition|Exempel|Kodas|ska de|se\s)/i.test(line)) continue;

    const brbMatch = line.match(BRB_HEADER);
    if (brbMatch) {
      const crimeName = brbMatch[1].trim().replace(/^[\s,]+|[\s,]+$/g, "");
      const chapter = parseInt(brbMatch[2]);
      const paragraphs = brbMatch[3].trim();

      // Skip if crime name is too short or looks like a fragment
      if (crimeName.length < 3) continue;
      // Skip lines that are just paragraph references without a crime name
      if (/^\d/.test(crimeName)) continue;

      entries.push({
        name: crimeName.toLowerCase(),
        lagrum: `BrB ${chapter} kap. ${paragraphs}`,
        sakomrade: BRB_CHAPTER_SAKOMRADE[chapter] || `BrB ${chapter} kap.`,
      });
      continue;
    }

    const lawMatch = line.match(LAW_HEADER);
    if (lawMatch) {
      const lawName = lawMatch[1].trim();
      const sfsNr = lawMatch[2];
      const paragraphs = (lawMatch[3] || "").trim();

      if (lawName.length < 5) continue;
      // Skip generic lines
      if (/^(lag|lagen)$/i.test(lawName)) continue;

      const fullLaw = `${lawName} (${sfsNr})`;
      const lagrumStr = paragraphs ? `${fullLaw} ${paragraphs}` : fullLaw;

      entries.push({
        name: lawName.toLowerCase(),
        lagrum: lagrumStr,
        sakomrade: getSakomrade(lagrumStr),
      });
    }
  }

  return entries;
}
```

- [ ] **Step 2: Wire it into main() and test**

Replace the `// TODO` in main() with:

```javascript
  // Pass 1: Extract section headers
  const sectionEntries = extractSectionHeaders(lines);
  process.stderr.write(`Pass 1: ${sectionEntries.length} section headers extracted\n`);
  for (const e of sectionEntries.slice(0, 10)) {
    process.stderr.write(`  ${e.name} → ${e.lagrum} [${e.sakomrade}]\n`);
  }
```

Run: `node scripts/generate-lagrum.cjs bra-klassificering.pdf 2>&1`

Expected: 30-50 section header entries with crime names and lagrum.

- [ ] **Step 3: Commit**

```bash
git add scripts/generate-lagrum.cjs
git commit -m "feat: Pass 1 — extract section headers with lagrum"
```

---

### Task 4: Implement Pass 2 — extract flat code listing entries

**Files:**
- Modify: `scripts/generate-lagrum.cjs`

The flat listing (starts at "Brottskoder i nummerordning") has `{4-digit code} {description}` entries. Many descriptions span multiple lines. We extract these descriptions and map them back to their section header's lagrum.

- [ ] **Step 1: Add the Pass 2 extraction function**

```javascript
/**
 * Pass 2: Extract unique crime names from the flat code listing.
 * Entries are like "0309 Barnadråp" or multi-line "0310 Fullbordat mord, dråp eller misshandel med dödlig\nutgång..."
 * We extract base crime names (stripping demographic details like "mot kvinna 18 år").
 */
function extractFlatListing(lines) {
  const appendixStart = lines.findIndex((l) => /^Brottskoder i nummerordning/i.test(l));
  if (appendixStart < 0) return [];

  const entries = [];
  let currentCode = "";
  let currentDesc = "";

  for (let i = appendixStart + 1; i < lines.length; i++) {
    const line = lines[i];
    const codeMatch = line.match(/^(\d{4})\s+(.+)/);

    if (codeMatch) {
      // Save previous entry
      if (currentCode && currentDesc) {
        entries.push({ code: currentCode, desc: currentDesc.trim() });
      }
      currentCode = codeMatch[1];
      currentDesc = codeMatch[2];
    } else if (currentCode && /^[A-ZÅÄÖ a-zåäö]/.test(line)) {
      // Continuation line
      currentDesc += " " + line;
    }
  }
  // Save last entry
  if (currentCode && currentDesc) {
    entries.push({ code: currentCode, desc: currentDesc.trim() });
  }

  return entries;
}

/**
 * Strip demographic/contextual details from crime descriptions to get base crime name.
 * "Misshandel, annan än grov, mot kvinna 18 år eller äldre, obekanta, utomhus"
 * → "misshandel, annan än grov"
 */
function getBaseCrimeName(desc) {
  let name = desc
    // Strip "mot kvinna/man/flicka/pojke..." and everything after
    .replace(/,?\s*mot\s+(kvinna|man|flicka|pojke|barn|person|grupp)\b.*/i, "")
    // Strip "med användning av skjutvapen" etc
    .replace(/,?\s*(med|utan)\s+användning\s+av\s+\w+/i, "")
    // Strip "i samband med..."
    .replace(/,?\s*i\s+samband\s+med\s+.*/i, "")
    // Strip "internetrelaterat" / "ej internetrelaterat"
    .replace(/,?\s*(ej\s+)?internetrelaterat/i, "")
    // Strip "utomhus" / "inomhus"
    .replace(/,?\s*(utomhus|inomhus)/i, "")
    // Strip "obekanta" / "bekanta"
    .replace(/,?\s*(obekanta|bekanta)/i, "")
    // Strip "inkl. grovt/grov"
    .replace(/,?\s*inkl\.\s*(grovt?|ringa)/i, "")
    // Strip trailing "övriga fall"
    .replace(/,?\s*övriga\s+fall/i, "")
    // Strip age ranges
    .replace(/,?\s*\d+[-–]\d+\s*år/i, "")
    .replace(/,?\s*\d+\s*år\s+eller\s+äldre/i, "")
    .replace(/,?\s*under\s+\d+\s*år/i, "")
    .trim()
    .replace(/,\s*$/, "")
    .toLowerCase();

  return name;
}
```

- [ ] **Step 2: Wire Pass 2 into main() and test**

Add after Pass 1 in main():

```javascript
  // Pass 2: Extract flat code listing
  const flatEntries = extractFlatListing(lines);
  process.stderr.write(`Pass 2: ${flatEntries.length} code entries extracted\n`);

  // Deduplicate by base crime name
  const uniqueNames = new Map();
  for (const e of flatEntries) {
    const baseName = getBaseCrimeName(e.desc);
    if (baseName.length < 3) continue;
    if (!uniqueNames.has(baseName)) {
      uniqueNames.set(baseName, e.desc);
    }
  }
  process.stderr.write(`Pass 2: ${uniqueNames.size} unique base crime names\n`);
  for (const [name] of [...uniqueNames].slice(0, 10)) {
    process.stderr.write(`  ${name}\n`);
  }
```

Run: `node scripts/generate-lagrum.cjs bra-klassificering.pdf 2>&1`

Expected: 100-200+ unique base crime names.

- [ ] **Step 3: Commit**

```bash
git add scripts/generate-lagrum.cjs
git commit -m "feat: Pass 2 — extract flat code listing and deduplicate"
```

---

### Task 5: Merge passes and generate TypeScript output

**Files:**
- Modify: `scripts/generate-lagrum.cjs`

- [ ] **Step 1: Add the merge and output generation logic**

```javascript
/**
 * Merge Pass 1 section headers with Pass 2 flat listing names.
 * Section headers provide lagrum; flat listing provides additional crime names
 * that we match to section headers by substring containment.
 */
function buildMappings(sectionEntries, flatEntries) {
  const mappings = new Map();

  // Add all section header entries directly
  for (const entry of sectionEntries) {
    if (!mappings.has(entry.name)) {
      mappings.set(entry.name, {
        sakomrade: entry.sakomrade,
        primart_lagrum: [entry.lagrum],
      });
    }
  }

  // For each unique flat listing name, try to find a matching section header
  const uniqueFlat = new Map();
  for (const e of flatEntries) {
    const baseName = getBaseCrimeName(e.desc);
    if (baseName.length < 3) continue;
    if (!uniqueFlat.has(baseName)) {
      uniqueFlat.set(baseName, e);
    }
  }

  for (const [baseName, entry] of uniqueFlat) {
    if (mappings.has(baseName)) continue;

    // Try to find a section header that this name belongs to
    let matched = false;
    for (const section of sectionEntries) {
      if (baseName.includes(section.name) || section.name.includes(baseName)) {
        mappings.set(baseName, {
          sakomrade: section.sakomrade,
          primart_lagrum: [section.lagrum],
        });
        matched = true;
        break;
      }
    }

    // If no match, try to derive sakomrade from the code number ranges
    if (!matched) {
      // Code ranges map to BrB chapters:
      // 03xx = ch.3, 04xx = ch.4, 05xx = ch.5, 06xx = ch.6, 07xx = ch.7
      // 08xx = ch.8, 09xx = ch.9, 10xx = ch.10, 11xx = ch.11, 12xx = ch.12
      // 13xx = ch.13, 14xx = ch.14, 15xx = ch.15, 16xx = ch.16, 17xx = ch.17
      // 50xx = narcotics, 80xx = environment, etc.
      const codePrefix = entry.code.substring(0, 2);
      const chapterNum = parseInt(codePrefix);
      if (chapterNum >= 3 && chapterNum <= 22 && BRB_CHAPTER_SAKOMRADE[chapterNum]) {
        mappings.set(baseName, {
          sakomrade: BRB_CHAPTER_SAKOMRADE[chapterNum],
          primart_lagrum: [`BrB ${chapterNum} kap.`],
        });
      } else {
        mappings.set(baseName, {
          sakomrade: getSakomrade(entry.desc),
          primart_lagrum: [],
        });
      }
    }
  }

  return mappings;
}

function generateTypeScript(mappings) {
  const sorted = [...mappings.entries()].sort((a, b) => a[0].localeCompare(b[0], "sv"));

  let out = `interface LagrumEntry {\n`;
  out += `  sakomrade: string;\n`;
  out += `  primart_lagrum: string[];\n`;
  out += `  alternativa_lagrum?: string[];\n`;
  out += `}\n\n`;
  out += `const mappings: Record<string, LagrumEntry> = {\n`;

  for (const [key, value] of sorted) {
    out += `  ${JSON.stringify(key)}: {\n`;
    out += `    sakomrade: ${JSON.stringify(value.sakomrade)},\n`;
    if (value.primart_lagrum.length > 0) {
      out += `    primart_lagrum: [${value.primart_lagrum.map((l) => JSON.stringify(l)).join(", ")}],\n`;
    } else {
      out += `    primart_lagrum: [],\n`;
    }
    if (value.alternativa_lagrum && value.alternativa_lagrum.length > 0) {
      out += `    alternativa_lagrum: [${value.alternativa_lagrum.map((l) => JSON.stringify(l)).join(", ")}],\n`;
    }
    out += `  },\n`;
  }

  out += `};\n\n`;
  out += `// Sort keys longest-first so "grov misshandel" matches before "misshandel"\n`;
  out += `const sortedKeys = Object.keys(mappings).sort((a, b) => b.length - a.length);\n\n`;
  out += `export function matchLagrum(\n`;
  out += `  saken: string,\n`;
  out += `  caseNumber: string\n`;
  out += `): { lagrum: string; sakomrade: string } {\n`;
  out += `  const empty = { lagrum: "", sakomrade: "" };\n\n`;
  out += `  // Only enrich B-mål (criminal cases), or when case number is unknown\n`;
  out += `  const trimmedCase = caseNumber.trim().toUpperCase();\n`;
  out += `  if (trimmedCase && !trimmedCase.startsWith("B")) return empty;\n\n`;
  out += `  // Clean saken: lowercase + strip trailing "m m" / "m.m."\n`;
  out += `  const cleanSaken = saken\n`;
  out += `    .toLowerCase()\n`;
  out += `    .replace(/m\\.?\\s*m\\.?\\s*$/, "")\n`;
  out += `    .trim();\n\n`;
  out += `  for (const key of sortedKeys) {\n`;
  out += `    if (cleanSaken.includes(key)) {\n`;
  out += `      const data = mappings[key];\n`;
  out += `      let lagrum = data.primart_lagrum[0] || "";\n\n`;
  out += `      // Check for aggravated variant\n`;
  out += `      if (/grov|grovt/i.test(cleanSaken) && data.alternativa_lagrum) {\n`;
  out += `        const aggravated = data.alternativa_lagrum.find((alt) =>\n`;
  out += `          alt.toLowerCase().includes("grov")\n`;
  out += `        );\n`;
  out += `        if (aggravated) {\n`;
  out += `          lagrum = aggravated.replace(/\\s*\\(.*\\)\\s*$/, "").trim();\n`;
  out += `        }\n`;
  out += `      }\n\n`;
  out += `      return { lagrum, sakomrade: data.sakomrade };\n`;
  out += `    }\n`;
  out += `  }\n\n`;
  out += `  return empty;\n`;
  out += `}\n`;

  return out;
}
```

- [ ] **Step 2: Wire merge + output into main()**

Replace the Pass 1/2 debug output in main() with:

```javascript
  // Pass 1: Extract section headers
  const sectionEntries = extractSectionHeaders(lines);
  process.stderr.write(`Pass 1: ${sectionEntries.length} section headers extracted\n`);

  // Pass 2: Extract flat code listing
  const flatEntries = extractFlatListing(lines);
  process.stderr.write(`Pass 2: ${flatEntries.length} code entries extracted\n`);

  // Merge and build mappings
  const mappings = buildMappings(sectionEntries, flatEntries);
  process.stderr.write(`Total unique mappings: ${mappings.size}\n`);

  // Generate TypeScript
  const tsOutput = generateTypeScript(mappings);
  process.stdout.write(tsOutput);
  process.stderr.write(`\nDone. Pipe stdout to src/lib/lagrumMappings.ts\n`);
```

- [ ] **Step 3: Test full pipeline**

Run: `node scripts/generate-lagrum.cjs bra-klassificering.pdf > /tmp/lagrum-test.ts 2>&1`

Check the output file has 200+ entries and valid TypeScript:
```bash
grep -c 'sakomrade' /tmp/lagrum-test.ts
head -30 /tmp/lagrum-test.ts
```

- [ ] **Step 4: Commit**

```bash
git add scripts/generate-lagrum.cjs
git commit -m "feat: merge passes and generate TypeScript output"
```

---

### Task 6: Run generation, replace mappings file, and verify

**Files:**
- Modify: `src/lib/lagrumMappings.ts` (full replacement)

- [ ] **Step 1: Generate the new mappings file**

```bash
node scripts/generate-lagrum.cjs bra-klassificering.pdf > src/lib/lagrumMappings.ts
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: Clean build with no TypeScript errors.

- [ ] **Step 3: Run existing tests**

```bash
npm test
```

Expected: All tests pass. Some lagrum-specific test assertions may need updating if they reference old mapping keys — fix any failures.

- [ ] **Step 4: Spot-check common crimes**

```bash
node -e "
const { matchLagrum } = require('./src/lib/lagrumMappings.ts');
// This won't work directly with TS, use debug-pdf instead
"
```

Instead, test with a real PDF:
```bash
node debug-pdf.cjs "https://www.domstol.se/globalassets/filer/domstol/solna_tingsratt/veckans-forhandlingar/v14.2026.pdf" --court solna 2>&1 | grep "Lagrum:" | head -20
```

Verify that common crimes (misshandel, stöld, narkotikabrott, rattfylleri, etc.) get proper lagrum enrichment.

- [ ] **Step 5: Commit**

```bash
git add src/lib/lagrumMappings.ts scripts/generate-lagrum.cjs
git commit -m "feat: replace lagrumMappings.ts with Brå-generated mappings"
```

---

### Task 7: Iterate and fix — tune extraction quality

**Files:**
- Modify: `scripts/generate-lagrum.cjs`
- Modify: `src/lib/lagrumMappings.ts` (regenerate)

This task is for iterating on the extraction quality after the first run. Expected issues:

- [ ] **Step 1: Check for missing common crimes**

Compare against the old mappings to find any crime names that were in the old file but missing from the new one. If important ones are missing, adjust the extraction regexes.

```bash
# Extract old keys (from git history)
git show HEAD~1:src/lib/lagrumMappings.ts | grep -oP '^\s+"([^"]+)"' | sort > /tmp/old-keys.txt
# Extract new keys
grep -oP '^\s+"([^"]+)"' src/lib/lagrumMappings.ts | sort > /tmp/new-keys.txt
# Find missing
comm -23 /tmp/old-keys.txt /tmp/new-keys.txt
```

- [ ] **Step 2: Fix any extraction issues found, regenerate, rebuild, retest**

```bash
node scripts/generate-lagrum.cjs bra-klassificering.pdf > src/lib/lagrumMappings.ts
npm run build
npm test
```

- [ ] **Step 3: Final commit**

```bash
git add scripts/generate-lagrum.cjs src/lib/lagrumMappings.ts
git commit -m "fix: tune lagrum extraction quality"
```

---

### Task 8: Clean up and PR

**Files:**
- Modify: `CLAUDE.md` (update docs)

- [ ] **Step 1: Update CLAUDE.md — add script documentation**

Add to the Commands section:
```
- `node scripts/generate-lagrum.cjs [pdf-url-or-file]` — Regenerate lagrumMappings.ts from Brå PDF
```

- [ ] **Step 2: Add the Brå PDF to .gitignore**

```bash
echo "bra-klassificering.pdf" >> .gitignore
```

- [ ] **Step 3: Commit and create PR**

```bash
git add CLAUDE.md .gitignore
git commit -m "docs: add lagrum generation script to CLAUDE.md"
```
