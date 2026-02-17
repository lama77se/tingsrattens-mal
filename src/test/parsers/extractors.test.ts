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
