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

  it("handles clean inline format", () => {
    const text = "må 2026-02-16 09:00 - 09:45 Häktningsförhandling B 24584-25 brott mot vapenlagen Sal 11";
    const result = formatStandard.parse({ courtName: "Test", text });
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2026-02-16");
    expect(result[0].caseNumber).toBe("B 24584-25");
    expect(result[0].saken).toBe("brott mot vapenlagen");
  });

  it("handles multi-line format (Halmstad-style)", () => {
    const text = [
      "må 2026-02-16 09:00 - 16:00 Huvudförhandling",
      "B 3895-25",
      "grovt olaga hot m.m. Sal 1",
      "må 2026-02-16 09:00 - 14:00 Huvudförhandling",
      "B 1748-25",
      "Övergrepp i rättssak m.m. Sal 3",
    ].join("\n");

    const result = formatStandard.parse({ courtName: "Halmstads tingsrätt", text });
    expect(result).toHaveLength(2);
    expect(result[0].date).toBe("2026-02-16");
    expect(result[0].caseNumber).toBe("B 3895-25");
    expect(result[0].saken).toBe("grovt olaga hot m.m.");
    expect(result[0].room).toBe("Sal 1");
    expect(result[1].caseNumber).toBe("B 1748-25");
    expect(result[1].saken).toBe("Övergrepp i rättssak m.m.");
  });

  it("updates ISO date across different hearing lines", () => {
    const text = [
      "to 2026-02-19 13:00 - 14:00 Huvudförhandling",
      "B 3898-25",
      "ringa vapenbrott m.m Sal 2",
      "fr 2026-02-20 09:00 - 16:00 Huvudförhandling",
      "B 2519-25",
      "grov våldtäkt mot barn m.m. Sal 1",
    ].join("\n");

    const result = formatStandard.parse({ courtName: "Test", text });
    expect(result).toHaveLength(2);
    expect(result[0].date).toBe("2026-02-19");
    expect(result[1].date).toBe("2026-02-20");
  });

  it("handles Helsingborg-style single-line tabular format with Sal column header", () => {
    // Helsingborg PDFs have a "Sal" column header with bare room numbers on data rows.
    // The parser detects the header and inserts "Sal " before trailing bare numbers.
    const text = [
      "Dag Datum Förhandlingstid Typ av förhandling Målnummer Saken Sal",
      "må 16-feb 09:00 - 09:15 Edgångssmtr K 7484-25 Konkurs 21",
      "må 16-feb 09:00 - 10:30 Huvudförhandling B 9642-24 penningtvättsbrott 12",
      "on 18-feb 09:00 - 09:10 Konkursförhandling K 9132-25 ansökan om konkurs 21",
      "on 18-feb 09:00 - 16:00 Huvudförhandling B 4131-25 grovt narkotikabrott m.m 13",
    ].join("\n");

    const result = formatStandard.parse({ courtName: "Helsingborgs tingsrätt", text });
    expect(result).toHaveLength(4);

    expect(result[0].caseNumber).toBe("K 7484-25");
    expect(result[0].saken).toBe("Konkurs");
    expect(result[0].room).toBe("Sal 21");
    expect(result[0].date).toBe("2026-02-16");

    expect(result[1].caseNumber).toBe("B 9642-24");
    expect(result[1].saken).toBe("penningtvättsbrott");
    expect(result[1].room).toBe("Sal 12");

    expect(result[2].caseNumber).toBe("K 9132-25");
    expect(result[2].saken).toBe("ansökan om konkurs");
    expect(result[2].room).toBe("Sal 21");

    expect(result[3].caseNumber).toBe("B 4131-25");
    expect(result[3].saken).toBe("grovt narkotikabrott m.m");
    expect(result[3].room).toBe("Sal 13");
  });

  it("does not double Sal prefix when data rows already contain 'Sal X' (Alingsås/Blekinge)", () => {
    // When the header ends with "Sal" but data rows already have "Sal X",
    // the Sal column rewrite must be skipped to avoid "Sal Sal X" contamination.
    const text = [
      "Dag Datum Förhandlingstid Typ av förhandling Målnummer Saken Sal",
      "må 16-feb 13:30 - 16:00 Muntlig förberedelse T 732-25 ogiltlighet och fastställelse av testamente Sal 2",
      "ti 17-feb 09:00 - 12:00 Huvudförhandling B 1234-25 misshandel Sal 1",
    ].join("\n");

    const result = formatStandard.parse({ courtName: "Alingsås tingsrätt", text });
    expect(result).toHaveLength(2);

    expect(result[0].caseNumber).toBe("T 732-25");
    expect(result[0].saken).toBe("ogiltlighet och fastställelse av testamente");
    expect(result[0].room).toBe("Sal 2");

    expect(result[1].caseNumber).toBe("B 1234-25");
    expect(result[1].saken).toBe("misshandel");
    expect(result[1].room).toBe("Sal 1");
  });

  it("parses Sundsvall 3-line format with short dates and m.fl suffix", () => {
    const text = [
      "Dag Datum Förhandlingstid Typ av förhandling Målnr Saken",
      "må 09-feb 09:00 - 10:00 Huvudförhandling",
      "B 3312-25",
      "våldsamt motstånd",
      "må 09-feb 09:00 - 11:00 Muntlig förberedelse",
      "T 756-25 m.fl",
      "fordran",
      "må 09-feb 09:00 - 16:00 Huvudförhandling",
      "B 2979-25",
      "narkotikabrott m m",
      "ti 10-feb 09:00 - 09:30 Huvudförhandling",
      "B 2033-25",
      "smuggling av explosiv vara",
      "ti 10-feb 10:00 - 11:00 Konkursförhandling",
      "K 132-26",
      "ansökan om konkurs",
      "on 11-feb 09:00 - 16:00 Fortsatt hf",
      "B 1407-24 m.fl",
      "narkotikabrott m m",
    ].join("\n");

    const result = formatStandard.parse({ courtName: "Sundsvalls tingsrätt", text });
    expect(result).toHaveLength(6);

    expect(result[0].date).toBe("2026-02-09");
    expect(result[0].time).toBe("09:00 - 10:00");
    expect(result[0].type).toBe("Huvudförhandling");
    expect(result[0].caseNumber).toBe("B 3312-25");
    expect(result[0].saken).toBe("våldsamt motstånd");

    // "m.fl" after case number should not become saken
    expect(result[1].caseNumber).toBe("T 756-25");
    expect(result[1].type).toBe("Muntlig förberedelse");
    expect(result[1].saken).toBe("fordran");

    expect(result[2].caseNumber).toBe("B 2979-25");
    expect(result[2].saken).toBe("narkotikabrott m m");

    expect(result[3].date).toBe("2026-02-10");
    expect(result[3].caseNumber).toBe("B 2033-25");
    expect(result[3].saken).toBe("smuggling av explosiv vara");

    expect(result[4].type).toBe("Konkursförhandling");
    expect(result[4].caseNumber).toBe("K 132-26");
    expect(result[4].saken).toBe("ansökan om konkurs");

    // "Fortsatt hf" + "m.fl" suffix
    expect(result[5].date).toBe("2026-02-11");
    expect(result[5].caseNumber).toBe("B 1407-24");
    expect(result[5].saken).toBe("narkotikabrott m m");
  });

  it("ignores case numbers inside parentheses (Attunda-style cross-references)", () => {
    const text = [
      "10-feb",
      "09:00 - 11:00 Tingssal 14",
      "Muntlig förberedelse T 6933-25 kontraktsrätt (återvinning av tredskodom i T 14184-24)",
      "Kalle Anka",
    ].join("\n");

    const result = formatStandard.parse({ courtName: "Attunda tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].caseNumber).toBe("T 6933-25");
    expect(result[0].saken).toContain("kontraktsrätt");
    expect(result[0].saken).toContain("T 14184-24");
  });

  it("splits merged PDF rows into separate hearings (Halmstad row-merge)", () => {
    // When pdfYTolerance is high, adjacent rows can merge into one line.
    // Both B 297-26 and T 3736-25 should become separate hearings.
    const text = [
      "2026-02-26 13:00 - 15:00 Halmstads tingsrätt Muntlig förberedelse B 297-26 Brottmål T 3736-25 försträckning, fordran Sal 1",
    ].join("\n");

    const result = formatStandard.parse({ courtName: "Halmstads tingsrätt", text });
    expect(result).toHaveLength(2);

    // First hearing: B 297-26 — gets the time, saken stops before T 3736-25
    expect(result[0].caseNumber).toBe("B 297-26");
    expect(result[0].time).toBe("13:00 - 15:00");
    expect(result[0].saken).not.toContain("T 3736-25");
    expect(result[0].saken).not.toContain("försträckning");

    // Second hearing: T 3736-25 — gets its own saken
    expect(result[1].caseNumber).toBe("T 3736-25");
    expect(result[1].saken).toContain("försträckning");
    expect(result[1].date).toBe("2026-02-26");
  });

  it("ignores case number on continuation line starting with )", () => {
    const text = [
      "10-feb",
      "09:00 - 11:00 Tingssal 14",
      "Muntlig förberedelse T 6933-25",
      "kontraktsrätt (återvinning av tredskodom i",
      "T 14184-24) Tingssal 14",
      "Kalle Anka",
    ].join("\n");

    const result = formatStandard.parse({ courtName: "Attunda tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].caseNumber).toBe("T 6933-25");
  });
});
