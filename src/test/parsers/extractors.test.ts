import { describe, it, expect } from "vitest";
import {
  normalize,
  extractShortDate,
  extractIsoDate,
  extractSwedishDate,
  preprocessLines,
  extractTime,
  extractRoom,
  extractHearingType,
  cleanSaken,
  cleanParties,
} from "@/lib/parsers/extractors";

describe("normalize", () => {
  it("lowercases and strips Swedish diacritics", () => {
    expect(normalize("Åäö")).toBe("aao");
    expect(normalize("Huvudförhandling")).toBe("huvudforhandling");
    expect(normalize("Häktningsförhandling")).toBe("haktningsforhandling");
  });

  it("handles accented vowels", () => {
    expect(normalize("éèêë")).toBe("eeee");
    expect(normalize("àáâã")).toBe("aaaa");
  });
});

describe("extractShortDate", () => {
  it("parses '16-feb' to ISO date", () => {
    const result = extractShortDate("16-feb");
    const year = new Date().getFullYear();
    expect(result).toBe(`${year}-02-16`);
  });

  it("pads single-digit day", () => {
    const result = extractShortDate("3-mar");
    const year = new Date().getFullYear();
    expect(result).toBe(`${year}-03-03`);
  });

  it("handles en-dash separator", () => {
    const result = extractShortDate("5\u2013jan");
    const year = new Date().getFullYear();
    expect(result).toBe(`${year}-01-05`);
  });

  it("returns null for non-date lines", () => {
    expect(extractShortDate("Huvudförhandling")).toBeNull();
    expect(extractShortDate("B 1234-25")).toBeNull();
  });

  it("matches date glued to time like '16-feb09:00'", () => {
    const result = extractShortDate("16-feb09:00");
    const year = new Date().getFullYear();
    expect(result).toBe(`${year}-02-16`);
  });
});

describe("extractIsoDate", () => {
  it("parses standard ISO date", () => {
    expect(extractIsoDate("2026-02-16")).toBe("2026-02-16");
  });

  it("normalizes en-dash to hyphen", () => {
    expect(extractIsoDate("2026\u201302\u201316")).toBe("2026-02-16");
  });

  it("returns null for non-date", () => {
    expect(extractIsoDate("hello world")).toBeNull();
  });
});

describe("extractSwedishDate", () => {
  it("parses '16 februari 2026'", () => {
    expect(extractSwedishDate("16 februari 2026")).toBe("2026-02-16");
  });

  it("parses '3 mars 2025' with day padding", () => {
    expect(extractSwedishDate("3 mars 2025")).toBe("2025-03-03");
  });

  it("returns null for non-date", () => {
    expect(extractSwedishDate("16-feb")).toBeNull();
  });
});

describe("preprocessLines", () => {
  it("splits, trims, and filters empty lines", () => {
    const result = preprocessLines("  hello  \n\n  world  \n");
    expect(result).toEqual(["hello", "world"]);
  });

  it("inserts space before glued case number prefix", () => {
    const result = preprocessLines("HuvudförhandlingT 3535-24");
    expect(result).toEqual(["Huvudförhandling T 3535-24"]);
  });

  it("inserts space after case number glued to text", () => {
    const result = preprocessLines("T 3535-24Stöld");
    expect(result).toEqual(["T 3535-24 Stöld"]);
  });

  it("inserts Sal before bare trailing digits (Helsingborg-style)", () => {
    expect(preprocessLines("Konkurs21")).toEqual(["Konkurs Sal 21"]);
    expect(preprocessLines("misshandel1")).toEqual(["misshandel Sal 1"]);
    expect(preprocessLines("fordran4")).toEqual(["fordran Sal 4"]);
    expect(preprocessLines("grovt rattfylleri m.m.10")).toEqual(["grovt rattfylleri m.m. Sal 10"]);
  });

  it("does not insert Sal when digits are preceded by non-letter", () => {
    expect(preprocessLines("B 1234-25")).toEqual(["B 1234-25"]);
    expect(preprocessLines("Sal 5")).toEqual(["Sal 5"]);
  });

  it("rejoins bare room number split across lines (page boundary fix)", () => {
    const result = preprocessLines("ansökan om konkurs Sal\n10");
    expect(result).toEqual(["ansökan om konkurs Sal 10"]);
  });

  it("rejoins Tingssal room number split across lines", () => {
    const result = preprocessLines("misshandel Tingssal\n2");
    expect(result).toEqual(["misshandel Tingssal 2"]);
  });

  it("does not rejoin bare number when previous line does not end with Sal", () => {
    const result = preprocessLines("ansökan om konkurs\n10");
    expect(result).toHaveLength(2);
  });

  it("splits de-accented day abbreviation from date digits", () => {
    expect(preprocessLines("ma16-feb09:00 - 09:15Edgangssmtr")).toEqual([
      "ma 16-feb 09:00 - 09:15 Edgangssmtr",
    ]);
  });

  it("splits month abbreviation glued to time", () => {
    expect(preprocessLines("16-feb09:00")).toEqual(["16-feb 09:00"]);
  });

  it("normalizes en-dashes in ISO dates", () => {
    expect(preprocessLines("to 2026\u201302\u201319 09:00")).toEqual(["to 2026-02-19 09:00"]);
  });

  it("rejoins split ISO date across lines", () => {
    const result = preprocessLines("må 2026-02-\n16");
    expect(result).toEqual(["må 2026-02-16"]);
  });

  it("rejoins split time range across lines", () => {
    const result = preprocessLines("09:00 -\n16:00");
    expect(result).toEqual(["09:00 - 16:00"]);
  });

  it("reconstructs field-per-line hearings into single lines", () => {
    const input = [
      "må 2026-02-",
      "16",
      "09:00 -",
      "16:00",
      "Huvudförhandling B 1795-25",
      "misshandel m m Sal 3",
      "ti 2026-02-",
      "17",
      "09:00 -",
      "11:30",
      "Huvudförhandling B 4350-25",
      "grovt djurplågeri Sal 7",
    ].join("\n");
    const result = preprocessLines(input);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe("må 2026-02-16 09:00 - 16:00 Huvudförhandling B 1795-25 misshandel m m Sal 3");
    expect(result[1]).toBe("ti 2026-02-17 09:00 - 11:30 Huvudförhandling B 4350-25 grovt djurplågeri Sal 7");
  });

  it("reconstructs field-per-line with (dag X/Y)", () => {
    const input = [
      "må 2026-02-",
      "16",
      "(dag 1/2)",
      "09:00 -",
      "16:00",
      "Huvudförhandling B 3905-25",
      "misshandel m.m. Sal 4",
    ].join("\n");
    const result = preprocessLines(input);
    expect(result).toHaveLength(1);
    // (dag X/Y) is stripped by per-line transform
    expect(result[0]).toBe("må 2026-02-16 09:00 - 16:00 Huvudförhandling B 3905-25 misshandel m.m. Sal 4");
  });

  it("skips reconstruction when lines already have complete hearing patterns", () => {
    const input = "må 2026-02-16 09:00 - 16:00 Huvudförhandling B 1795-25 misshandel m m Sal 3";
    const result = preprocessLines(input);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(input);
  });

  it("splits concatenated hearings at page boundaries", () => {
    const input = "häleri Sal 3 to 2026-02-12 09:00 - 09:30 Huvudförhandling B 5119-25 stöld";
    const result = preprocessLines(input);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe("häleri Sal 3");
    expect(result[1]).toContain("to 2026-02-12");
  });

  it("splits multiple concatenated hearings at page boundaries", () => {
    const input = "häleri Sal 7 to 2026-02-12 09:00 - 09:30 Huvudförhandling B 5119-25 stöld Sal 3 on 2026-02-13 10:00 - 11:00 Muntlig förberedelse";
    const result = preprocessLines(input);
    expect(result).toHaveLength(3);
    expect(result[0]).toBe("häleri Sal 7");
    expect(result[1]).toContain("to 2026-02-12");
    expect(result[2]).toContain("on 2026-02-13");
  });

  it("does not split lines starting with a day abbreviation", () => {
    const input = "to 2026-02-19 09:00 - 09:45 Huvudförhandling B 199-26 ringa stöld Sal 6";
    const result = preprocessLines(input);
    expect(result).toHaveLength(1);
  });

  it("splits page boundary concatenation before field-per-line reconstruction", () => {
    // In field-per-line PDFs, page breaks can glue the tail of one hearing
    // to the start of the next hearing's day abbreviation + date
    const input = [
      "må 2026-02-",
      "16",
      "09:00 -",
      "16:00",
      "Huvudförhandling B 1795-25",
      "konkurs ti 2026-02-10 09:00 - 10:00 Huvudförhandling B 2752-25 ofredande",
    ].join("\n");
    const result = preprocessLines(input);
    // The second hearing starting with "ti 2026-02-10" should be separate
    const tiLine = result.find((l) => /ti 2026-02-10/.test(l));
    expect(tiLine).toBeDefined();
    // "konkurs" should NOT be in the ti hearing line
    expect(tiLine).not.toContain("konkurs");
  });

  it("splits glued page boundary like 'Sal 7on 2026-02-18'", () => {
    const input = "narkotikabrott Sal 7on 2026-02-18 09:00 - 10:00 Huvudförhandling";
    const result = preprocessLines(input);
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result[0]).toContain("narkotikabrott");
    expect(result[0]).not.toContain("2026-02-18");
    const onLine = result.find((l) => /on 2026-02-18/.test(l));
    expect(onLine).toBeDefined();
  });

  it("does not split 'schema' or words containing day abbreviation substrings", () => {
    // "ma" in "schema" should NOT trigger a split
    const input = "schema-förhandlingar-vecka-8-9-2026";
    const result = preprocessLines(input);
    expect(result).toHaveLength(1);
  });

  it("splits multiple same-day hearings in field-per-line PDF", () => {
    // Multiple hearings on same day — only first has day abbreviation + date
    const input = [
      "ti 2026-02-",
      "10",
      "09:00 -",
      "10:00",
      "Konkursförhandling K 5555-25",
      "konkurs Sal 1",
      "09:00 -",
      "10:00",
      "Huvudförhandling B 2752-25",
      "ofredande Sal 5",
      "09:00 -",
      "16:00",
      "Huvudförhandling T 3996-24",
      "vårdnad Sal 3",
    ].join("\n");
    const result = preprocessLines(input);
    expect(result).toHaveLength(3);
    expect(result[0]).toContain("ti 2026-02-10");
    expect(result[0]).toContain("09:00 - 10:00");
    expect(result[0]).toContain("konkurs");
    expect(result[1]).toContain("09:00 - 10:00");
    expect(result[1]).toContain("ofredande");
    expect(result[1]).not.toContain("konkurs");
    expect(result[2]).toContain("09:00 - 16:00");
    expect(result[2]).toContain("vårdnad");
  });

  it("strips pagination footer from line", () => {
    const input = "upphörande av godmanskap (återförvisat mål) 1-81 visas av 81";
    const result = preprocessLines(input);
    expect(result[0]).toBe("upphörande av godmanskap (återförvisat mål)");
  });

  it("passes through complete hearing lines in mixed content", () => {
    // Mix of complete hearing lines and field-per-line entries
    const input = [
      "to 2026-02-12 09:00 - 09:30 Huvudförhandling B 5119-25 stöld Sal 3",
      "ti 2026-02-",
      "10",
      "09:00 -",
      "10:00",
      "Huvudförhandling B 2752-25",
      "ofredande Sal 5",
    ].join("\n");
    const result = preprocessLines(input);
    // Complete line passes through, field-per-line gets reconstructed
    expect(result.find((l) => /to 2026-02-12.*stöld/.test(l))).toBeDefined();
    expect(result.find((l) => /ti 2026-02-10.*ofredande/.test(l))).toBeDefined();
  });

  it("splits same-day hearings concatenated on one line at subsequent time ranges", () => {
    // pdf-parse may put all same-day hearings on one line
    const input = "ti 2026-02-10 09:00 - 10:00 Konkursförhandling K 5555-25 konkurs Sal 1 09:00 - 10:00 Huvudförhandling B 2752-25 ofredande Sal 5 09:00 - 16:00 Huvudförhandling T 3996-24 vårdnad Sal 3";
    const result = preprocessLines(input);
    expect(result).toHaveLength(3);
    expect(result[0]).toContain("konkurs");
    expect(result[0]).not.toContain("ofredande");
    expect(result[1]).toContain("ofredande");
    expect(result[1]).not.toContain("vårdnad");
    expect(result[2]).toContain("vårdnad");
  });

  it("splits cross-day and same-day concatenated hearings", () => {
    // häleri (end of prev day) + multiple Thursday hearings
    const input = "häleri Sal 3 to 2026-02-12 09:00 - 09:30 Huvudförhandling B 5119-25 stöld Sal 6 09:00 - 10:30 Huvudförhandling B 4227-25 olaga hot Sal 7";
    const result = preprocessLines(input);
    expect(result).toHaveLength(3);
    expect(result[0]).toBe("häleri Sal 3");
    expect(result[1]).toContain("09:00 - 09:30");
    expect(result[1]).toContain("stöld");
    expect(result[1]).not.toContain("olaga hot");
    expect(result[2]).toContain("09:00 - 10:30");
    expect(result[2]).toContain("olaga hot");
  });

  it("does not split a single hearing with one time range", () => {
    const input = "to 2026-02-19 09:00 - 09:45 Huvudförhandling B 199-26 ringa stöld Sal 6";
    const result = preprocessLines(input);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(input);
  });
});

describe("extractTime", () => {
  it("extracts time range from line", () => {
    expect(extractTime("09:00 - 11:00 Sal 3")).toBe("09:00 - 11:00");
  });

  it("extracts single time from line", () => {
    expect(extractTime("09:00 Sal 3")).toBe("09:00");
  });

  it("falls back to previous line for range", () => {
    expect(extractTime("B 1234-25 Stöld", "09:00 - 11:00")).toBe("09:00 - 11:00");
  });

  it("falls back to previous line for single time", () => {
    expect(extractTime("B 1234-25 Stöld", "09:00")).toBe("09:00");
  });

  it("returns empty when no time found", () => {
    expect(extractTime("B 1234-25 Stöld")).toBe("");
  });
});

describe("extractRoom", () => {
  it("extracts 'Sal 3' from current line", () => {
    expect(extractRoom(["09:00 Sal 3 B 1234-25"], 0)).toBe("Sal 3");
  });

  it("extracts 'Tingssal 1' from current line", () => {
    expect(extractRoom(["Tingssal 1"], 0)).toBe("Tingssal 1");
  });

  it("searches surrounding lines (±2)", () => {
    const lines = ["something", "Sal 5", "B 1234-25 Stöld", "parties"];
    expect(extractRoom(lines, 2)).toBe("Sal 5");
  });

  it("returns empty when no room found", () => {
    expect(extractRoom(["B 1234-25 Stöld", "parties"], 0)).toBe("");
  });
});

describe("extractHearingType", () => {
  it("detects Huvudförhandling on current line", () => {
    expect(extractHearingType(["Huvudförhandling B 1234-25"], 0)).toBe("Huvudförhandling");
  });

  it("detects type on previous line", () => {
    expect(extractHearingType(["Muntlig förberedelse", "T 5678-25 Tvist"], 1)).toBe("Muntlig förberedelse");
  });

  it("detects type on next line", () => {
    expect(extractHearingType(["B 1234-25", "Häktningsförhandling"], 0)).toBe("Häktningsförhandling");
  });

  it("defaults to Förhandling when no type found", () => {
    expect(extractHearingType(["B 1234-25 Stöld", "John Doe"], 0)).toBe("Förhandling");
  });
});

describe("cleanSaken", () => {
  it("removes room reference", () => {
    expect(cleanSaken("Stöld Sal 3")).toBe("Stöld");
  });

  it("removes time references", () => {
    expect(cleanSaken("Stöld 09:00 - 11:00")).toBe("Stöld");
  });

  it("removes hearing type names", () => {
    expect(cleanSaken("Huvudförhandling Stöld")).toBe("Stöld");
  });

  it("strips leading/trailing punctuation", () => {
    expect(cleanSaken("  , Stöld - ")).toBe("Stöld");
  });
});

describe("cleanParties", () => {
  it("removes room and time artifacts", () => {
    expect(cleanParties("John Doe Sal 3 09:00")).toBe("John Doe");
  });

  it("removes hearing type names", () => {
    expect(cleanParties("Förhandling John Doe")).toBe("John Doe");
  });
});
