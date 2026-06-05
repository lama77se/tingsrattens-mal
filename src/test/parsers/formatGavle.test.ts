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
    const text = "to 2026-02-05 09:00 - 09:30 brott mot knivlagen Sal 5";
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
    const text = "2026-02-09 09:15 - 12:00 misshandel Sal 5";
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
    const text = "ti 2026-02-24 13:15 - 14:00 grovt olaga hot Sal 5";
    const result = formatGavle.parse({ courtName: "Test", text });
    expect(result).toHaveLength(1);
    expect(result[0].saken).toBe("grovt olaga hot");
    expect(result[0].room).toBe("Sal 5");
  });

  it("handles crime with m.m. suffix", () => {
    const text = "må 2026-03-02 09:00 - 16:00 misshandel m.m. Sal 5";
    const result = formatGavle.parse({ courtName: "Test", text });
    expect(result).toHaveLength(1);
    expect(result[0].saken).toBe("misshandel m.m.");
  });

  it("parses multiple hearings", () => {
    const text = [
      "to 2026-02-05 09:00 - 09:30 brott mot knivlagen Sal 5",
      "",
      "må 2026-02-09 09:15 - 12:00 misshandel Sal 5",
      "ti 2026-02-10 09:00 - 16:00 grovt vapenbrott m.m. Sal 5",
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
      "to 2026-02-05 09:00 - 09:30 brott mot knivlagen Sal 5",
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

  it("handles truncated room at end of output", () => {
    const text = "fr 2026-03-27 09:00 - 16:00 skadegörelse m.m. Sal ";
    const result = formatGavle.parse({ courtName: "Test", text });
    expect(result).toHaveLength(1);
    expect(result[0].saken).toBe("skadegörelse m.m.");
  });

  describe("new multi-line format (2026+)", () => {
    it("parses a hearing with saken+room glued before the anchor", () => {
      const text = [
        "grovt hemfridsbott m mSal 5må2026-04-2009:00 - ",
        "12:00",
        "B 4490-24",
      ].join("\n");
      const result = formatGavle.parse({ courtName: "Gävle tingsrätt", text });
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        date: "2026-04-20",
        time: "09:00 - 12:00",
        saken: "grovt hemfridsbott m m",
        room: "Sal 5",
        caseNumber: "B 4490-24",
        type: "Huvudförhandling",
      });
    });

    it("parses a hearing with saken+room on a preceding line", () => {
      const text = [
        "ringa narkotikabrott m mSal 5",
        "to2026-04-1613:15 - ",
        "13:45",
        "B 1328-26",
      ].join("\n");
      const result = formatGavle.parse({ courtName: "Test", text });
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        date: "2026-04-16",
        time: "13:15 - 13:45",
        saken: "ringa narkotikabrott m m",
        room: "Sal 5",
        caseNumber: "B 1328-26",
      });
    });

    it("parses a hearing with saken wrapping across multiple lines", () => {
      const text = [
        "brott mot lagen om förbud beträffande ",
        "knivar och andra farliga föremål",
        "Sal 5",
        "to2026-04-1609:00 - ",
        "09:45",
        "B 1273-26",
      ].join("\n");
      const result = formatGavle.parse({ courtName: "Test", text });
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        date: "2026-04-16",
        time: "09:00 - 09:45",
        saken:
          "brott mot lagen om förbud beträffande knivar och andra farliga föremål",
        room: "Sal 5",
        caseNumber: "B 1273-26",
      });
    });

    it("uses blank lines as boundaries between hearings", () => {
      const text = [
        "ringa narkotikabrott m mSal 5",
        "",
        "olaga intrångSal 5",
        "ti2026-05-0513:15 - ",
        "14:45",
        "B 2798-25",
      ].join("\n");
      const result = formatGavle.parse({ courtName: "Test", text });
      expect(result).toHaveLength(1);
      expect(result[0].saken).toBe("olaga intrång");
      expect(result[0].room).toBe("Sal 5");
      expect(result[0].caseNumber).toBe("B 2798-25");
    });

    it("stops backwards lookup at a previous case number", () => {
      const text = [
        "ringa narkotikabrott m mSal 5",
        "må2026-04-2013:45 - ",
        "14:45",
        "B 2822-25",
        "må2026-04-2013:15 - ",
        "13:45",
        "B 1183-25",
      ].join("\n");
      const result = formatGavle.parse({ courtName: "Test", text });
      expect(result).toHaveLength(2);
      expect(result[0].caseNumber).toBe("B 2822-25");
      expect(result[0].saken).toBe("ringa narkotikabrott m m");
      // Second hearing has no saken — previous case# is the boundary
      expect(result[1].caseNumber).toBe("B 1183-25");
      expect(result[1].saken).toBe("");
    });

    it("parses multiple consecutive hearings", () => {
      const text = [
        "grovt hemfridsbott m mSal 5må2026-04-2009:00 - ",
        "12:00",
        "B 4490-24",
        "ringa narkotikabrott m mSal 5",
        "to2026-04-1613:15 - ",
        "13:45",
        "B 1328-26",
        "narkotikabrott m mSal 5",
        "to2026-04-1611:15 - ",
        "12:00",
        "B 1320-26",
      ].join("\n");
      const result = formatGavle.parse({ courtName: "Test", text });
      expect(result).toHaveLength(3);
      expect(result.map((h) => h.caseNumber)).toEqual([
        "B 4490-24",
        "B 1328-26",
        "B 1320-26",
      ]);
    });

    it("skips the 'Förhandlingar vecka X-Y' header", () => {
      const text = [
        "Förhandlingar vecka 16-22",
        "grovt hemfridsbott m mSal 5må2026-04-2009:00 - ",
        "12:00",
        "B 4490-24",
      ].join("\n");
      const result = formatGavle.parse({ courtName: "Test", text });
      expect(result).toHaveLength(1);
    });

    it("normalizes glued 'Sal5' to 'Sal 5'", () => {
      const text = [
        "stöldSal5må2026-04-2713:15 - ",
        "13:45",
        "B 3931-25",
      ].join("\n");
      const result = formatGavle.parse({ courtName: "Test", text });
      expect(result).toHaveLength(1);
      expect(result[0].room).toBe("Sal 5");
    });
  });

  describe("V3 pipe-separated format (2026-06+)", () => {
    it("parses a header + Swedish date + pipe-separated hearings", () => {
      const text = [
        "Schema - Förhandlingar (Sal 5)",
        "Torsdag 4 juni 2026",
        "09:00–10:00 | B 1964-26 | Brott mot trafikförordningen",
        "10:00–11:15 | B 2002-26 | Ringa stöld",
      ].join("\n");
      const result = formatGavle.parse({ courtName: "Gävle tingsrätt", text });
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        date: "2026-06-04",
        time: "09:00 - 10:00",
        caseNumber: "B 1964-26",
        saken: "Brott mot trafikförordningen",
        room: "Sal 5",
        type: "Huvudförhandling",
      });
      expect(result[1].caseNumber).toBe("B 2002-26");
      expect(result[1].room).toBe("Sal 5");
    });

    it("keeps the current date across blank lines and new date headers", () => {
      const text = [
        "Schema - Förhandlingar (Sal 5)",
        "Torsdag 4 juni 2026",
        "",
        "09:00–10:00 | B 1964-26 | Brott mot trafikförordningen",
        "Måndag 8 juni 2026",
        "09:00–09:30 | B 533-26 | Urkundsförfalskning m.m.",
      ].join("\n");
      const result = formatGavle.parse({ courtName: "Test", text });
      expect(result).toHaveLength(2);
      expect(result[0].date).toBe("2026-06-04");
      expect(result[1].date).toBe("2026-06-08");
    });

    it("supports all twelve Swedish months", () => {
      const months: [string, string][] = [
        ["januari", "01"], ["februari", "02"], ["mars", "03"], ["april", "04"],
        ["maj", "05"], ["juni", "06"], ["juli", "07"], ["augusti", "08"],
        ["september", "09"], ["oktober", "10"], ["november", "11"], ["december", "12"],
      ];
      for (const [name, num] of months) {
        const text = [
          `Måndag 15 ${name} 2026`,
          "09:00–10:00 | B 1-26 | test",
        ].join("\n");
        const result = formatGavle.parse({ courtName: "Test", text });
        expect(result).toHaveLength(1);
        expect(result[0].date).toBe(`2026-${num}-15`);
      }
    });

    it("keeps joined cases (e.g. 'B 1882-26 & B 2066-26') as one hearing", () => {
      const text = [
        "Schema - Förhandlingar (Sal 5)",
        "Tisdag 18 augusti 2026",
        "15:00–16:00 | B 1882-26 & B 2066-26 | Narkotikabrott",
      ].join("\n");
      const result = formatGavle.parse({ courtName: "Test", text });
      expect(result).toHaveLength(1);
      expect(result[0].caseNumber).toBe("B 1882-26 & B 2066-26");
      expect(result[0].saken).toBe("Narkotikabrott");
    });

    it("leaves room empty when there is no Schema header", () => {
      const text = [
        "Torsdag 4 juni 2026",
        "09:00–10:00 | B 1964-26 | Brott mot trafikförordningen",
      ].join("\n");
      const result = formatGavle.parse({ courtName: "Test", text });
      expect(result).toHaveLength(1);
      expect(result[0].room).toBe("");
    });
  });
});
