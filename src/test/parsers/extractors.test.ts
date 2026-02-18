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

  it("matches date embedded in text like '16-feb 09:00'", () => {
    const result = extractShortDate("16-feb 09:00");
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

  it("normalizes en-dashes in ISO dates", () => {
    expect(preprocessLines("to 2026\u201302\u201319 09:00")).toEqual(["to 2026-02-19 09:00"]);
  });

  it("strips (dag X/Y) annotations", () => {
    const result = preprocessLines("2026-02-16 (dag 1/2) 09:00 - 16:00 Huvudförhandling");
    expect(result).toEqual(["2026-02-16 09:00 - 16:00 Huvudförhandling"]);
  });

  it("fixes case number space before dash: B 784 -25 → B 784-25", () => {
    const result = preprocessLines("B 784 -25, Huvudförhandling");
    expect(result).toEqual(["B 784-25, Huvudförhandling"]);
  });

  it("fixes FT case number space before dash", () => {
    const result = preprocessLines("FT 1234 -25 fordran");
    expect(result).toEqual(["FT 1234-25 fordran"]);
  });

  it("strips pagination footer from line", () => {
    const input = "upphörande av godmanskap (återförvisat mål) 1-81 visas av 81";
    const result = preprocessLines(input);
    expect(result[0]).toBe("upphörande av godmanskap (återförvisat mål)");
  });

  it("passes through clean hearing lines unchanged", () => {
    const input = "to 2026-02-19 09:00 - 09:45 Huvudförhandling B 199-26 ringa stöld Sal 6";
    const result = preprocessLines(input);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(input);
  });

  it("handles multiple clean lines", () => {
    const input = [
      "må 2026-02-16 09:00 - 16:00 Huvudförhandling B 1795-25 misshandel m m Sal 3",
      "ti 2026-02-17 09:00 - 11:30 Huvudförhandling B 4350-25 grovt djurplågeri Sal 7",
    ].join("\n");
    const result = preprocessLines(input);
    expect(result).toHaveLength(2);
    expect(result[0]).toContain("misshandel m m");
    expect(result[1]).toContain("grovt djurplågeri");
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
