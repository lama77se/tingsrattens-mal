#!/usr/bin/env node
/**
 * PDF Parser Troubleshooting Tool
 *
 * Usage:
 *   node debug-pdf.cjs <pdf-url-or-file>
 *   node debug-pdf.cjs <pdf-url-or-file> --raw          # show raw extracted text only
 *   node debug-pdf.cjs <pdf-url-or-file> --lines        # show numbered lines
 *   node debug-pdf.cjs <pdf-url-or-file> --court solna   # override court detection
 *   node debug-pdf.cjs <pdf-url-or-file> --corpus       # emit JSON {saken, caseNumber} lines for lagrum coverage
 *   node debug-pdf.cjs <pdf-url-or-file> --positional   # use Y-coordinate extraction
 *                                                       # (one PDF visual row per output line, tabs between columns)
 *
 * Examples:
 *   node debug-pdf.cjs https://www.domstol.se/.../vecka-11.pdf
 *   node debug-pdf.cjs ./skaraborgs-w8.pdf
 *   node debug-pdf.cjs https://... --raw > extracted.txt
 *   node debug-pdf.cjs https://... --positional --lines
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const pdfParse = require(path.join(__dirname, "node_modules", "pdf-parse"));
const { renderPositional } = require(path.join(__dirname, "api", "_lib", "renderPositional.cjs"));

// ---------------------------------------------------------------------------
// Court config (id → name + formatFamily) extracted at build time is TS, so
// we duplicate the minimal mapping here. Keep in sync with courtConfig.ts.
// ---------------------------------------------------------------------------
const COURT_MAP = {
  alingsas: { name: "Alingsås tingsrätt", format: "standard" },
  attunda: { name: "Attunda tingsrätt", format: "standard" },
  blekinge: { name: "Blekinge tingsrätt", format: "standard" },
  solna: { name: "Solna tingsrätt", format: "tabular" },
  stockholms: { name: "Stockholms tingsrätt", format: "tabular" },
  skaraborgs: { name: "Skaraborgs tingsrätt", format: "tabular" },
  boras: { name: "Borås tingsrätt", format: "standard" },
  eksjo: { name: "Eksjö tingsrätt", format: "tabular" },
  eskilstuna: { name: "Eskilstuna tingsrätt", format: "positional" },
  helsingborgs: { name: "Helsingborgs tingsrätt", format: "standard" },
  halsinglands: { name: "Hälsinglands tingsrätt", format: "standard" },
  halmstads: { name: "Halmstads tingsrätt", format: "positional" },
  goteborgs: { name: "Göteborgs tingsrätt", format: "standard" },
  gavle: { name: "Gävle tingsrätt", format: "gavle" },
  haparanda: { name: "Haparanda tingsrätt", format: "schema" },
  hassleholms: { name: "Hässleholms tingsrätt", format: "tabular" },
  jonkopings: { name: "Jönköpings tingsrätt", format: "tabular" },
  kristianstads: { name: "Kristianstads tingsrätt", format: "tabular" },
  linkopings: { name: "Linköpings tingsrätt", format: "positional" },
  lunds: { name: "Lunds tingsrätt", format: "schema" },
  malmo: { name: "Malmö tingsrätt", format: "schema" },
  mora: { name: "Mora tingsrätt", format: "positional" },
  norrkopings: { name: "Norrköpings tingsrätt", format: "tabular" },
  nykopings: { name: "Nyköpings tingsrätt", format: "tabular" },
  nacka: { name: "Nacka tingsrätt", format: "tabular" },
  sodertalje: { name: "Södertälje tingsrätt", format: "positional" },
  sodertorns: { name: "Södertörns tingsrätt", format: "positional" },
  sundsvalls: { name: "Sundsvalls tingsrätt", format: "tabular" },
  uddevalla: { name: "Uddevalla tingsrätt", format: "positional" },
  varbergs: { name: "Varbergs tingsrätt", format: "tabular" },
  uppsala: { name: "Uppsala tingsrätt", format: "tabular" },
  vanersborgs: { name: "Vänersborgs tingsrätt", format: "positional" },
  varmlands: { name: "Värmlands tingsrätt", format: "positional" },
  vastmanlands: { name: "Västmanlands tingsrätt", format: "tabular" },
  vaxjo: { name: "Växjö tingsrätt", format: "tabular" },
  angermanlands: { name: "Ångermanlands tingsrätt", format: "positional" },
  orebro: { name: "Örebro tingsrätt", format: "tabular" },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function detectCourt(input) {
  const lower = input.toLowerCase();
  for (const [key, val] of Object.entries(COURT_MAP)) {
    if (lower.includes(key)) return { key, ...val };
  }
  return null;
}

function downloadUrl(url) {
  return new Promise((resolve, reject) => {
    const get = url.startsWith("https") ? https.get : http.get;
    get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadUrl(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const flags = args.filter((a) => a.startsWith("--"));
  const positional = args.filter((a) => !a.startsWith("--"));

  if (positional.length === 0) {
    console.log("Usage: node debug-pdf.cjs <pdf-url-or-file> [--raw] [--lines] [--court <name>] [--edge] [--positional]");
    console.log("  --edge        Use production edge function for text extraction (tests real pipeline)");
    console.log("  --positional  Use Y-coordinate row grouping (one visual PDF row per line, tab-separated columns)");
    process.exit(1);
  }

  const input = positional[0];
  const showRaw = flags.includes("--raw");
  const showLines = flags.includes("--lines");
  const useEdge = flags.includes("--edge");
  const corpusMode = flags.includes("--corpus");
  const courtOverrideIdx = args.indexOf("--court");
  const courtOverride = courtOverrideIdx !== -1 ? args[courtOverrideIdx + 1] : null;

  // Auto-enable positional mode for courts whose format family requires it,
  // unless the caller explicitly passed --positional themselves.
  const explicitPositional = flags.includes("--positional");
  const detectedCourt = detectCourt(courtOverride || input);
  const positionalMode =
    explicitPositional || (detectedCourt && detectedCourt.format === "positional");

  // 1. Get text from PDF
  let text;

  if (useEdge && input.startsWith("http")) {
    // Call production edge function for text extraction
    console.error(`Calling edge function for: ${input}`);
    const edgeUrl = "https://tingsrattens-mal.vercel.app/api/fetch-court-pdf";
    const edgeBody = { pdfUrl: input };
    // Pass yTolerance if specified via --ytol flag
    const ytolIdx = args.indexOf("--ytol");
    if (ytolIdx !== -1 && args[ytolIdx + 1]) {
      edgeBody.yTolerance = Number(args[ytolIdx + 1]);
      console.error(`  yTolerance: ${edgeBody.yTolerance}`);
    }
    if (positionalMode) edgeBody.mode = "positional";
    const body = JSON.stringify(edgeBody);
    const resp = await new Promise((resolve, reject) => {
      const req = https.request(edgeUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }, (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(JSON.parse(Buffer.concat(chunks).toString())));
        res.on("error", reject);
      });
      req.on("error", reject);
      req.write(body);
      req.end();
    });
    if (!resp.success) {
      console.error(`Edge function error: ${resp.error}`);
      process.exit(1);
    }
    text = resp.text;
    console.error(`Edge function: ${resp.pdfSizeBytes} bytes, ${resp.numPages} pages, ${text.length} chars`);
  } else {
    // Local extraction via pdf-parse
    let buffer;
    if (input.startsWith("http://") || input.startsWith("https://")) {
      console.error(`Downloading: ${input}`);
      const methods = [
        { name: "direct", url: input },
        { name: "allorigins", url: `https://api.allorigins.win/raw?url=${encodeURIComponent(input)}` },
        { name: "codetabs", url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(input)}` },
      ];
      for (const method of methods) {
        try {
          console.error(`  Trying ${method.name}...`);
          const buf = await downloadUrl(method.url);
          if (buf.slice(0, 5).toString().startsWith("%PDF")) {
            console.error(`  Success via ${method.name} (${buf.length} bytes)`);
            buffer = buf;
            break;
          }
          console.error(`  ${method.name}: got non-PDF response (${buf.length} bytes)`);
        } catch (e) {
          console.error(`  ${method.name}: ${e.message}`);
        }
      }
      if (!buffer) {
        console.error("ERROR: Could not download PDF via any method");
        process.exit(1);
      }
    } else {
      buffer = fs.readFileSync(input);
      console.error(`Read file: ${buffer.length} bytes`);
    }

    const header = buffer.slice(0, 5).toString();
    if (!header.startsWith("%PDF")) {
      console.error(`ERROR: Not a PDF file (starts with: ${JSON.stringify(buffer.slice(0, 50).toString())})`);
      process.exit(1);
    }

    const data = positionalMode
      ? await pdfParse(buffer, { pagerender: renderPositional })
      : await pdfParse(buffer);
    text = data.text;
    console.error(
      `Pages: ${data.numpages}, Text length: ${text.length} chars${positionalMode ? " (positional mode)" : ""}`
    );
  }

  // 3. Detect court
  const courtSource = courtOverride || input;
  const court = detectCourt(courtSource);
  if (!court) {
    console.error(`Could not detect court from "${courtSource}". Use --court <name>`);
    console.error(`Available courts: ${Object.keys(COURT_MAP).join(", ")}`);
    if (!showRaw && !showLines) process.exit(1);
  } else {
    console.error(`Court: ${court.name} (format: ${court.format})`);
  }

  // 4. Raw/lines mode — just output text and exit
  if (showRaw) {
    console.log(text);
    return;
  }

  if (showLines) {
    const lines = text.split("\n");
    lines.forEach((line, i) => {
      console.log(`${String(i + 1).padStart(4)}  ${line}`);
    });
    return;
  }

  // 5. Run parser via tsx (since parseCourtPdf is TypeScript)
  const { execSync } = require("child_process");

  // Write extracted text to temp file
  const tmpText = path.join(__dirname, ".debug-pdf-text.tmp");
  fs.writeFileSync(tmpText, text);

  // Build inline TS that imports the parser and runs it
  const tsCode = `
    import { parseCourtPdf } from "./src/lib/parseCourtPdf";
    import * as fs from "fs";

    const text = fs.readFileSync(${JSON.stringify(tmpText)}, "utf-8");
    const court = { name: ${JSON.stringify(court.name)}, formatFamily: ${JSON.stringify(court.format)} };
    const hearings = parseCourtPdf(text, court);

    if (${corpusMode ? "true" : "false"}) {
      for (const h of hearings) {
        if (!h.saken || h.saken === "–") continue;
        process.stdout.write(JSON.stringify({ saken: h.saken, caseNumber: h.caseNumber || "" }) + "\\n");
      }
      process.exit(0);
    }

    // Summary
    console.log("\\n" + "=".repeat(60));
    console.log("PARSER RESULTS");
    console.log("=".repeat(60));
    console.log("Court:      " + court.name);
    console.log("Format:     " + court.formatFamily);
    console.log("Text lines: " + text.split("\\n").length);
    console.log("Hearings:   " + hearings.length);

    if (hearings.length === 0) {
      console.log("\\n>>> NO HEARINGS PARSED — possible format issue <<<");
      console.log("\\nFirst 30 lines of extracted text:");
      console.log("-".repeat(60));
      text.split("\\n").slice(0, 30).forEach((l, i) => console.log(String(i+1).padStart(4) + "  " + l));
      console.log("-".repeat(60));
      console.log("\\nTip: run with --raw to see full text, or --lines for numbered lines");
    } else {
      console.log("\\nFirst 5 hearings:");
      console.log("-".repeat(60));
      for (const h of hearings.slice(0, 5)) {
        console.log("  " + h.date + " " + h.time + " | " + h.caseNumber + " | " + h.type + " | " + h.saken);
        if (h.parties) console.log("    Parter: " + h.parties.substring(0, 80));
        if (h.lagrum) console.log("    Lagrum: " + h.lagrum + " (" + h.sakomrade + ")");
      }
      if (hearings.length > 5) console.log("  ... and " + (hearings.length - 5) + " more");

      // Stats
      const types = {};
      for (const h of hearings) types[h.type || "(empty)"] = (types[h.type || "(empty)"] || 0) + 1;
      console.log("\\nBy type:");
      for (const [t, c] of Object.entries(types).sort((a,b) => b[1] - a[1])) {
        console.log("  " + t + ": " + c);
      }

      const noSaken = hearings.filter(h => !h.saken);
      const noDate = hearings.filter(h => !h.date);
      const noCase = hearings.filter(h => !h.caseNumber);
      if (noSaken.length) console.log("\\nWARNING: " + noSaken.length + " hearings missing 'saken'");
      if (noDate.length) console.log("WARNING: " + noDate.length + " hearings missing 'date'");
      if (noCase.length) console.log("WARNING: " + noCase.length + " hearings missing 'caseNumber'");
    }
  `;

  const tmpTs = path.join(__dirname, ".debug-pdf-runner.ts");
  fs.writeFileSync(tmpTs, tsCode);

  try {
    const result = execSync(`npx tsx ${tmpTs}`, {
      cwd: __dirname,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "inherit"],
    });
    console.log(result);
  } finally {
    // Cleanup temp files
    try { fs.unlinkSync(tmpText); } catch {}
    try { fs.unlinkSync(tmpTs); } catch {}
  }
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
