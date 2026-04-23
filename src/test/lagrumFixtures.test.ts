import { describe, it, expect } from "vitest";
import { matchLagrum } from "../lib/lagrumMatch";
import fixtures from "./lagrum.fixtures.json";

interface Fixture {
  name: string;
  saken: string;
  caseNumber: string;
  sakomrade: string;
  lagrum: string;
  /** When set, verifies the joined primary + additional lagrum (;-separated). */
  joinedLagrum?: string;
}

describe("matchLagrum — golden set", () => {
  const entries = fixtures.entries as Fixture[];

  it("fixture file is non-empty", () => {
    expect(entries.length).toBeGreaterThan(50);
  });

  it.each(entries)("$name", (fixture) => {
    const { saken, caseNumber, sakomrade, lagrum, joinedLagrum } = fixture;
    const result = matchLagrum(saken, caseNumber);
    expect(result.sakomrade).toBe(sakomrade);
    expect(result.lagrum).toBe(lagrum);
    if (joinedLagrum) {
      const all = [result.lagrum, ...(result.additional ?? []).map((a) => a.lagrum)]
        .filter(Boolean)
        .join("; ");
      expect(all).toBe(joinedLagrum);
    }
  });
});
