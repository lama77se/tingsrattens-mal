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

  it("handles inline ISO dates (Göteborg-style single-line entries)", () => {
    const text = [
      "må 2026-02-16 09:00 - 09:45 Häktningsförhandling B 24584-25 brott mot vapenlagen Sal 11",
      "ti 2026-02-17 10:00 - 12:00 Huvudförhandling B 1234-25 misshandel Sal 3",
      "on 2026-02-18 13:00 - 15:00 Muntlig förberedelse T 5678-25 fordran Sal 5",
    ].join("\n");

    const result = formatStandard.parse({ courtName: "Göteborgs tingsrätt", text });
    expect(result).toHaveLength(3);
    expect(result[0].date).toBe("2026-02-16");
    expect(result[0].caseNumber).toBe("B 24584-25");
    expect(result[0].saken).toBe("brott mot vapenlagen");
    expect(result[1].date).toBe("2026-02-17");
    expect(result[1].caseNumber).toBe("B 1234-25");
    expect(result[2].date).toBe("2026-02-18");
    expect(result[2].type).toBe("Muntlig förberedelse");
  });

  it("handles pdf-parse glued inline format", () => {
    const text = "må2026-02-1609:00 - 09:45Häktningsförhandling B 24584-25brott mot vapenlagenSal 11";
    const result = formatStandard.parse({ courtName: "Test", text });
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2026-02-16");
    expect(result[0].caseNumber).toBe("B 24584-25");
    expect(result[0].saken).toBe("brott mot vapenlagen");
  });

  it("handles multi-line pdf-parse format (Halmstad-style)", () => {
    const text = [
      "må2026-02-1609:00 - 16:00Huvudförhandling",
      "B 3895-25",
      "grovt olaga hot m.m.Sal 1",
      "må2026-02-1609:00 - 14:00Huvudförhandling",
      "B 1748-25",
      "Övergrepp i rättssak m.m.Sal 3",
    ].join("\n");

    const result = formatStandard.parse({ courtName: "Halmstads tingsrätt", text });
    expect(result).toHaveLength(2);
    expect(result[0].date).toBe("2026-02-16");
    expect(result[0].caseNumber).toBe("B 3895-25");
    expect(result[0].saken).toBe("grovt olaga hot m.m");
    expect(result[0].room).toBe("Sal 1");
    expect(result[1].caseNumber).toBe("B 1748-25");
    expect(result[1].saken).toBe("Övergrepp i rättssak m.m");
  });

  it("updates ISO date across different hearing lines", () => {
    const text = [
      "to2026-02-1913:00 - 14:00Huvudförhandling",
      "B 3898-25",
      "ringa vapenbrott m.mSal 2",
      "fr2026-02-2009:00 - 16:00Huvudförhandling",
      "B 2519-25",
      "grov våldtäkt mot barn m.m.Sal 1",
    ].join("\n");

    const result = formatStandard.parse({ courtName: "Test", text });
    expect(result).toHaveLength(2);
    expect(result[0].date).toBe("2026-02-19");
    expect(result[1].date).toBe("2026-02-20");
  });

  it("handles Helsingborg-style 3-line format with bare sal number", () => {
    const text = [
      "ma16-feb09:00 - 09:15Edgangssmtr",
      "K 7484-25",
      "Konkurs21",
      "ti17-feb10:30 - 16:00Huvudforhandling",
      "B 9642-24",
      "misshandel1",
    ].join("\n");

    const result = formatStandard.parse({ courtName: "Helsingborgs tingsrätt", text });
    expect(result).toHaveLength(2);

    expect(result[0].date).toBe("2026-02-16");
    expect(result[0].time).toBe("09:00 - 09:15");
    expect(result[0].caseNumber).toBe("K 7484-25");
    expect(result[0].saken).toBe("Konkurs");
    expect(result[0].room).toBe("Sal 21");

    expect(result[1].date).toBe("2026-02-17");
    expect(result[1].caseNumber).toBe("B 9642-24");
    expect(result[1].saken).toBe("misshandel");
    expect(result[1].room).toBe("Sal 1");
  });
});
