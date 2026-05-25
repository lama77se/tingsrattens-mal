import { describe, it, expect } from "vitest";
import { parseCourtPdf } from "@/lib/parseCourtPdf";

describe("parseCourtPdf dispatcher", () => {
  const sampleText = [
    "16-feb",
    "09:00 - 11:00 Sal 3",
    "Huvudförhandling B 1234-25 Stöld",
    "John Doe",
  ].join("\n");

  it("accepts a string court name (backward compat)", () => {
    const result = parseCourtPdf(sampleText, "Alingsås tingsrätt");
    expect(result).toHaveLength(1);
    expect(result[0].court).toBe("Alingsås tingsrätt");
    expect(result[0].caseNumber).toBe("B 1234-25");
  });

  it("accepts a CourtConfig-like object with formatFamily", () => {
    const result = parseCourtPdf(sampleText, {
      name: "Blekinge tingsrätt",
      formatFamily: "standard",
    });
    expect(result).toHaveLength(1);
    expect(result[0].court).toBe("Blekinge tingsrätt");
  });

  it("defaults to standard when formatFamily is omitted from object", () => {
    const result = parseCourtPdf(sampleText, { name: "Test tingsrätt" });
    expect(result).toHaveLength(1);
    expect(result[0].court).toBe("Test tingsrätt");
  });

  it("returns empty array for empty text", () => {
    expect(parseCourtPdf("", "Test")).toEqual([]);
    expect(parseCourtPdf("   ", "Test")).toEqual([]);
  });

  it("enriches with maltyp for B-mål", () => {
    const result = parseCourtPdf(sampleText, "Test");
    expect(result[0].maltyp).toBe("Brottmål");
  });

  it("enriches with lagrum for known crimes", () => {
    const result = parseCourtPdf(sampleText, "Test");
    expect(result[0].lagrum).toContain("BrB 8 kap.");
    expect(result[0].sakomrade).toBe("Förmögenhetsbrott");
  });

  it("detects fleraSakfragor from 'm.m.'", () => {
    const text = [
      "16-feb",
      "09:00 Sal 1 Huvudförhandling B 1234-25 Stöld m.m.",
      "Kalle Anka",
    ].join("\n");
    const result = parseCourtPdf(text, "Test");
    expect(result[0].fleraSakfragor).toBe(true);
  });

  it("detects court in saken", () => {
    const text = [
      "16-feb",
      "09:00 Sal 1 Huvudförhandling B 1234-25 Uppsala tingsrätt - Mord",
      "Parter",
    ].join("\n");
    const result = parseCourtPdf(text, "Test tingsrätt");
    expect(result[0].court).toBe("Uppsala tingsrätt (plats: Test tingsrätt)");
    expect(result[0].saken).toBe("Mord");
  });

  it("assigns sequential ids", () => {
    const text = [
      "16-feb",
      "09:00 Sal 1 B 1001-25 Stöld",
      "A",
      "10:00 Sal 2 B 1002-25 Misshandel",
      "B",
    ].join("\n");
    const result = parseCourtPdf(text, "Test");
    expect(result[0].id).toBe("parsed-1");
    expect(result[1].id).toBe("parsed-2");
  });

  it("fills missing fields with defaults", () => {
    // Minimal data — saken present so row is considered a real hearing
    // (bare case-number-only rows are now correctly treated as continuation
    // markers and skipped, matching multi-day PDF formats like Halmstad).
    const text = "B 9999-25 misshandel";
    const result = parseCourtPdf(text, "Test");
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("Okänt datum");
    expect(result[0].time).toBe("–");
    expect(result[0].room).toBe("–");
    expect(result[0].saken).toBe("misshandel");
    // `parties` field intentionally removed from Hearing type (GDPR — see types.ts).
  });

  it("skips bare case-number rows with no time and no saken (continuation markers)", () => {
    // Halmstad-style multi-day continuation block at top of PDF
    const text = ["2026-04-27", "2026-04-28", "B 1444-25", "B 930-26"].join("\n");
    const result = parseCourtPdf(text, "Test");
    expect(result).toHaveLength(0);
  });

  it("resolves externalCourt from tabular format (Stockholm)", () => {
    const text = [
      "ti 2026-02-17 09:00 - 17:00 Huvudförhandling",
      "B 6394-24 (Solna tingsrätt)",
      "folkrättsbrott, grovt brott Högsäkerhetssal 2, Bergsgatan 50",
    ].join("\n");
    const result = parseCourtPdf(text, { name: "Stockholms tingsrätt", formatFamily: "tabular" });
    expect(result).toHaveLength(1);
    expect(result[0].court).toBe("Solna tingsrätt (plats: Stockholms tingsrätt)");
    expect(result[0].caseNumber).toBe("B 6394-24");
  });

  it("resolves location from tabular format (Uppsala)", () => {
    const text = [
      "on 2026-02-18 09:30 - 16:30 Huvudförhandling",
      "B 3858-25",
      "mord m.m. Attunda tingsrätt",
    ].join("\n");
    const result = parseCourtPdf(text, { name: "Uppsala tingsrätt", formatFamily: "tabular" });
    expect(result).toHaveLength(1);
    expect(result[0].court).toBe("Uppsala tingsrätt (plats: Attunda tingsrätt)");
    expect(result[0].saken).toBe("mord m.m");
  });

  it("keeps court unchanged when location matches court (Uppsala)", () => {
    const text = [
      "må 2026-02-16 09:00 - 12:00 Huvudförhandling",
      "B 542-25",
      "ringa narkotikabrott Uppsala tingsrätt",
    ].join("\n");
    const result = parseCourtPdf(text, { name: "Uppsala tingsrätt", formatFamily: "tabular" });
    expect(result).toHaveLength(1);
    expect(result[0].court).toBe("Uppsala tingsrätt");
    expect(result[0].saken).toBe("ringa narkotikabrott");
  });

  it("enriches lagrum for tabular format (no case number)", () => {
    const text = "2026-02-17 09:00 - 16:00 Huvudförhandling narkotikabrott Sal 1";
    const result = parseCourtPdf(text, { name: "Eksjö tingsrätt", formatFamily: "tabular" });
    expect(result).toHaveLength(1);
    expect(result[0].caseNumber).toBe("–");
    expect(result[0].lagrum).toContain("Narkotikastrafflagen");
    expect(result[0].sakomrade).toBe("Narkotikabrott");
  });
});
