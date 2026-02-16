import { describe, it, expect } from "vitest";
import { formatStandard } from "@/lib/parsers/formatStandard";

describe("formatStandard", () => {
  it("has correct metadata", () => {
    expect(formatStandard.name).toBe("Standard");
    expect(formatStandard.formatFamily).toBe("standard");
  });

  it("returns empty array for empty text", () => {
    expect(formatStandard.parse({ courtName: "Test", text: "" })).toEqual([]);
    expect(formatStandard.parse({ courtName: "Test", text: "   " })).toEqual([]);
  });

  it("parses a single hearing with short date", () => {
    const text = [
      "16-feb",
      "09:00 - 11:00 Sal 3",
      "Huvudförhandling B 1234-25 Stöld",
      "John Doe",
    ].join("\n");

    const result = formatStandard.parse({ courtName: "Test tingsrätt", text });
    expect(result).toHaveLength(1);

    const h = result[0];
    const year = new Date().getFullYear();
    expect(h.date).toBe(`${year}-02-16`);
    expect(h.time).toBe("09:00 - 11:00");
    expect(h.room).toBe("Sal 3");
    expect(h.caseNumber).toBe("B 1234-25");
    expect(h.type).toBe("Huvudförhandling");
    expect(h.saken).toBe("Stöld");
    expect(h.parties).toBe("John Doe");
  });

  it("parses multiple hearings under the same date", () => {
    const text = [
      "16-feb",
      "09:00 Sal 1 Huvudförhandling B 1001-25 Misshandel",
      "Kalle Anka",
      "10:30 Sal 2 Häktningsförhandling B 1002-25 Narkotikabrott",
      "Musse Pigg",
    ].join("\n");

    const result = formatStandard.parse({ courtName: "Test", text });
    expect(result).toHaveLength(2);
    expect(result[0].caseNumber).toBe("B 1001-25");
    expect(result[1].caseNumber).toBe("B 1002-25");
  });

  it("picks up saken from next line when not on case number line", () => {
    const text = [
      "16-feb",
      "09:00 Sal 1 Huvudförhandling",
      "B 1234-25",
      "Stöld m.m.",
      "John Doe",
    ].join("\n");

    const result = formatStandard.parse({ courtName: "Test", text });
    expect(result).toHaveLength(1);
    expect(result[0].saken).toBe("Stöld m.m.");
  });

  it("handles ISO date format", () => {
    const text = [
      "2026-02-16",
      "09:00 Sal 1 Huvudförhandling B 1234-25 Stöld",
      "John Doe",
    ].join("\n");

    const result = formatStandard.parse({ courtName: "Test", text });
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2026-02-16");
  });

  it("handles Swedish long date format", () => {
    const text = [
      "16 februari 2026",
      "09:00 Sal 1 Huvudförhandling B 1234-25 Stöld",
      "John Doe",
    ].join("\n");

    const result = formatStandard.parse({ courtName: "Test", text });
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2026-02-16");
  });

  it("parses T-prefix case numbers from lines with hearing type", () => {
    const text = [
      "16-feb",
      "09:00 Sal 1 Muntlig förberedelse T 5678-25 Tvist",
      "Parter",
    ].join("\n");

    const result = formatStandard.parse({ courtName: "Test", text });
    expect(result).toHaveLength(1);
    expect(result[0].caseNumber).toBe("T 5678-25");
    expect(result[0].type).toBe("Muntlig förberedelse");
  });
});
