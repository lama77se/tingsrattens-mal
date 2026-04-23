import { describe, it, expect } from "vitest";
import { matchLagrum } from "../lib/lagrumMatch";
import fixtures from "./lagrum.fixtures.json";

interface Fixture {
  name: string;
  saken: string;
  caseNumber: string;
  sakomrade: string;
  lagrum: string;
}

describe("matchLagrum — golden set", () => {
  const entries = fixtures.entries as Fixture[];

  it("fixture file is non-empty", () => {
    expect(entries.length).toBeGreaterThan(50);
  });

  it.each(entries)("$name", ({ saken, caseNumber, sakomrade, lagrum }) => {
    const result = matchLagrum(saken, caseNumber);
    expect(result).toEqual({ sakomrade, lagrum });
  });
});
