import { describe, it, expect } from "vitest";
import { formatGavle } from "@/lib/parsers/formatGavle";

describe("formatGavle", () => {
  it("has correct metadata", () => {
    expect(formatGavle.name).toBe("Gävle");
    expect(formatGavle.formatFamily).toBe("gavle");
  });

  it("returns empty array for empty text", () => {
    expect(formatGavle.parse({ courtName: "Test", text: "" })).toEqual([]);
  });

  it("parses a standard hearing line with day abbreviation", () => {
    const text = "to  2026-02-05 09:00 - 09:30 brott mot knivlagen      Sal 5";
    const result = formatGavle.parse({ courtName: "Gävle tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2026-02-05");
    expect(result[0].time).toBe("09:00 - 09:30");
    expect(result[0].saken).toBe("brott mot knivlagen");
    expect(result[0].room).toBe("Sal 5");
    expect(result[0].type).toBe("Huvudförhandling");
    expect(result[0].caseNumber).toBe("");
    expect(result[0].parties).toBe("");
  });

  it("parses line without day abbreviation", () => {
    const text = "2026-02-09 09:15 - 12:00 misshandel      Sal 5";
    const result = formatGavle.parse({ courtName: "Test", text });
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2026-02-09");
    expect(result[0].saken).toBe("misshandel");
  });

  it("handles various day abbreviations", () => {
    const lines = [
      "må 2026-02-09 09:00 - 10:00 misshandel Sal 1",
      "ti 2026-02-10 10:00 - 11:00 stöld Sal 2",
      "on 2026-02-11 11:00 - 12:00 bedrägeri Sal 3",
      "to 2026-02-12 13:00 - 14:00 rån Sal 4",
      "fr 2026-02-13 14:00 - 15:00 mord Sal 5",
    ].join("\n");

    const result = formatGavle.parse({ courtName: "Test", text: lines });
    expect(result).toHaveLength(5);
    expect(result[0].saken).toBe("misshandel");
    expect(result[4].saken).toBe("mord");
  });

  it("extracts room with multiple spaces separator", () => {
    const text = "ti  2026-02-24 13:15 - 14:00 grovt olaga hot      Sal 5";
    const result = formatGavle.parse({ courtName: "Test", text });
    expect(result).toHaveLength(1);
    expect(result[0].saken).toBe("grovt olaga hot");
    expect(result[0].room).toBe("Sal 5");
  });

  it("handles crime with m.m. suffix", () => {
    const text = "må 2026-03-02 09:00 - 16:00 misshandel m.m.      Sal 5";
    const result = formatGavle.parse({ courtName: "Test", text });
    expect(result).toHaveLength(1);
    expect(result[0].saken).toBe("misshandel m.m.");
  });

  it("parses multiple hearings", () => {
    const text = [
      "to  2026-02-05 09:00 - 09:30 brott mot knivlagen      Sal 5",
      "",
      "må 2026-02-09 09:15 - 12:00 misshandel      Sal 5",
      "ti  2026-02-10 09:00 - 16:00 grovt vapenbrott m.m.      Sal 5",
    ].join("\n");

    const result = formatGavle.parse({ courtName: "Test", text });
    expect(result).toHaveLength(3);
    expect(result[0].date).toBe("2026-02-05");
    expect(result[1].date).toBe("2026-02-09");
    expect(result[2].date).toBe("2026-02-10");
  });

  it("skips header lines and non-hearing text", () => {
    const text = [
      "Förhandlingar februari-mars",
      "",
      "OBS! Schemat är preliminärt.",
      "",
      "to  2026-02-05 09:00 - 09:30 brott mot knivlagen      Sal 5",
    ].join("\n");

    const result = formatGavle.parse({ courtName: "Test", text });
    expect(result).toHaveLength(1);
    expect(result[0].saken).toBe("brott mot knivlagen");
  });

  it("all hearings default to Huvudförhandling type", () => {
    const text = [
      "må 2026-02-09 09:00 - 10:00 stöld Sal 1",
      "ti 2026-02-10 10:00 - 11:00 narkotikabrott Sal 2",
    ].join("\n");

    const result = formatGavle.parse({ courtName: "Test", text });
    for (const h of result) {
      expect(h.type).toBe("Huvudförhandling");
    }
  });

  // --- pdf-parse output (no whitespace between fields) ---

  it("parses pdf-parse output with glued fields", () => {
    const text = "to2026-02-0509:00 - 09:30brott mot knivlagenSal 5";
    const result = formatGavle.parse({ courtName: "Test", text });
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2026-02-05");
    expect(result[0].time).toBe("09:00 - 09:30");
    expect(result[0].saken).toBe("brott mot knivlagen");
    expect(result[0].room).toBe("Sal 5");
  });

  it("parses pdf-parse output with glued Sal (no space)", () => {
    const text = "må2026-02-0909:15 - 12:00misshandelSal 5";
    const result = formatGavle.parse({ courtName: "Test", text });
    expect(result).toHaveLength(1);
    expect(result[0].saken).toBe("misshandel");
    expect(result[0].room).toBe("Sal 5");
  });

  it("parses pdf-parse output with m.m. suffix", () => {
    const text = "ti2026-02-1009:00 - 16:00grovt vapenbrott m.m.Sal 5";
    const result = formatGavle.parse({ courtName: "Test", text });
    expect(result).toHaveLength(1);
    expect(result[0].saken).toBe("grovt vapenbrott m.m.");
    expect(result[0].room).toBe("Sal 5");
  });

  it("parses multiple pdf-parse lines", () => {
    const text = [
      "Förhandlingar februari-mars",
      "OBS! Schemat är preliminärt.",
      "to2026-02-0509:00 - 09:30brott mot knivlagenSal 5",
      "må2026-02-0909:15 - 12:00misshandelSal 5",
      "ti2026-02-1009:00 - 16:00grovt vapenbrott m.m.Sal 5",
    ].join("\n");

    const result = formatGavle.parse({ courtName: "Test", text });
    expect(result).toHaveLength(3);
    expect(result[0].date).toBe("2026-02-05");
    expect(result[1].date).toBe("2026-02-09");
    expect(result[2].saken).toBe("grovt vapenbrott m.m.");
  });

  it("handles truncated room at end of pdf-parse output", () => {
    const text = "fr2026-03-2709:00 - 16:00skadegörelse m.m.Sal ";
    const result = formatGavle.parse({ courtName: "Test", text });
    expect(result).toHaveLength(1);
    expect(result[0].saken).toBe("skadegörelse m.m.");
  });
});
