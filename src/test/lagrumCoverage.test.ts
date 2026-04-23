/**
 * Coverage report for matchLagrum.
 *
 * Runs a corpus of (saken, caseNumber) pairs through the matcher and prints
 * summary stats — matched %, top unmatched strings, sakomrade distribution.
 *
 * Run it with:
 *   npm run coverage:lagrum
 *
 * To run against a real-world corpus, drop a JSON array at
 * src/test/lagrum-corpus.json (gitignored) with entries:
 *   [{ "saken": "...", "caseNumber": "B 1234-25" }, ...]
 *
 * Without a corpus file the test falls back to the golden-set fixtures —
 * which are all expected to match, so it mainly serves as a smoke check.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { matchLagrum } from "../lib/lagrumMatch";
import fixtures from "./lagrum.fixtures.json";

interface CorpusEntry {
  saken: string;
  caseNumber: string;
}

function loadCorpus(): { source: string; entries: CorpusEntry[] } {
  const envPath = process.env.LAGRUM_CORPUS;
  if (envPath) {
    const abs = resolve(envPath);
    if (existsSync(abs)) {
      const raw = readFileSync(abs, "utf8");
      return { source: abs, entries: JSON.parse(raw) as CorpusEntry[] };
    }
  }
  const defaultPath = resolve("src/test/lagrum-corpus.json");
  if (existsSync(defaultPath)) {
    const raw = readFileSync(defaultPath, "utf8");
    return { source: defaultPath, entries: JSON.parse(raw) as CorpusEntry[] };
  }
  // Fallback: fixtures that aren't negative-assertion / isolation cases
  const fallback = (fixtures.entries as Array<CorpusEntry & { sakomrade: string }>)
    .filter((e) => e.sakomrade !== "")
    .map(({ saken, caseNumber }) => ({ saken, caseNumber }));
  return { source: "(fixtures fallback — no corpus file)", entries: fallback };
}

function countBy<T>(items: T[], key: (x: T) => string): Map<string, number> {
  const out = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    out.set(k, (out.get(k) ?? 0) + 1);
  }
  return out;
}

describe("matchLagrum — coverage", () => {
  it("reports coverage stats", () => {
    const { source, entries } = loadCorpus();
    if (entries.length === 0) {
      console.log("[coverage] empty corpus — skipping");
      return;
    }

    const results = entries.map((e) => ({
      ...e,
      result: matchLagrum(e.saken, e.caseNumber),
    }));

    const matched = results.filter((r) => r.result.sakomrade !== "");
    const unmatched = results.filter((r) => r.result.sakomrade === "");
    const matchRate = (matched.length / results.length) * 100;

    const sakomradeCounts = countBy(matched, (r) => r.result.sakomrade);
    const sakomradeSorted = [...sakomradeCounts.entries()].sort(
      (a, b) => b[1] - a[1]
    );

    const unmatchedSakenCounts = countBy(unmatched, (r) => r.saken.toLowerCase());
    const unmatchedTop = [...unmatchedSakenCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    const caseTypeCounts = countBy(results, (r) =>
      r.caseNumber.trim().toUpperCase().split(/\s/)[0] || "—"
    );
    const caseTypeSorted = [...caseTypeCounts.entries()].sort(
      (a, b) => b[1] - a[1]
    );

    console.log("");
    console.log("════════════════════════════════════════════════════════════");
    console.log("  Lagrum matcher coverage report");
    console.log("════════════════════════════════════════════════════════════");
    console.log(`Corpus:        ${source}`);
    console.log(`Total entries: ${results.length}`);
    console.log(
      `Matched:       ${matched.length} (${matchRate.toFixed(1)}%)`
    );
    console.log(`Unmatched:     ${unmatched.length}`);
    console.log("");
    console.log("— Case-type distribution —");
    for (const [caseType, count] of caseTypeSorted) {
      console.log(`  ${String(count).padStart(5)}  ${caseType}`);
    }
    console.log("");
    console.log("— Matched sakomrade distribution (top 15) —");
    for (const [sakomrade, count] of sakomradeSorted.slice(0, 15)) {
      console.log(`  ${String(count).padStart(5)}  ${sakomrade}`);
    }
    if (unmatchedTop.length > 0) {
      console.log("");
      console.log("— Top 20 unmatched saken —");
      for (const [saken, count] of unmatchedTop) {
        console.log(`  ${String(count).padStart(5)}  ${saken}`);
      }
    }
    console.log("════════════════════════════════════════════════════════════");
    console.log("");

    // Sanity check: with the fixtures fallback we expect near-100% match rate
    // (the fallback filters out negative-assertion entries).
    if (source.includes("fixtures fallback")) {
      expect(matchRate).toBeGreaterThan(95);
    }
  });
});
