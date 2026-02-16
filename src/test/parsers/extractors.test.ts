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
    const result = preprocessLines("  line1  \n\n  line2  \n");
    expect(result).toEqual(["line1", "line2"]);
  });

  it("inserts space before glued case number prefix", () => {
    const result = preprocessLines("HuvudförhandlingT 3535-24");
    expect(result).toEqual(["Huvudförhandling T 3535-24"]);
  });

  it("inserts space after case number glued to text", () => {
    const result = preprocessLines("T 3535-24Stöld");
    expect(result).toEqual(["T 3535-24 Stöld"]);
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
