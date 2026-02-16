import { describe, it, expect } from "vitest";
import { formatTabular } from "@/lib/parsers/formatTabular";

describe("formatTabular", () => {
  it("has correct metadata", () => {
    expect(formatTabular.name).toBe("Tabular");
    expect(formatTabular.formatFamily).toBe("tabular");
  });

  it("returns empty array for empty text", () => {
    expect(formatTabular.parse({ courtName: "Test", text: "" })).toEqual([]);
  });

  it("parses a hearing with saken on the same line", () => {
    const text = [
      "ti",
      "2026-02-17 09:00 - 16:00 Huvudförhandling försök till rån m m",
      "Sal 3",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Eksjö tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2026-02-17");
    expect(result[0].time).toBe("09:00 - 16:00");
    expect(result[0].type).toBe("Huvudförhandling");
    expect(result[0].saken).toBe("försök till rån m m");
    expect(result[0].caseNumber).toBe("");
    expect(result[0].parties).toBe("");
  });

  it("parses a hearing with saken on the next line", () => {
    const text = [
      "ti",
      "2026-02-17 09:00 - 10:00 Huvudförhandling",
      "förolämpning mot tjänsteman",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Test", text });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("Huvudförhandling");
    expect(result[0].saken).toBe("förolämpning mot tjänsteman");
  });

  it("extracts room from same line", () => {
    const text = "2026-02-18 10:30 - 11:00 Huvudförhandling narkotikabrott Sal 1";
    const result = formatTabular.parse({ courtName: "Test", text });
    expect(result).toHaveLength(1);
    expect(result[0].room).toBe("Sal 1");
    expect(result[0].saken).toBe("narkotikabrott");
  });

  it("extracts room from next line", () => {
    const text = [
      "2026-02-18 09:00 - 09:30 Huvudförhandling",
      "grov olovlig körning",
      "Sal 1",
    ].join("\n");
    const result = formatTabular.parse({ courtName: "Test", text });
    expect(result).toHaveLength(1);
    expect(result[0].room).toBe("Sal 1");
    expect(result[0].saken).toBe("grov olovlig körning");
  });

  it("maps 'Fortsatt hf' to Huvudförhandling", () => {
    const text = "2026-02-20 10:00 - 11:00 Fortsatt hf grovt rattfylleri m m Sal 1";
    const result = formatTabular.parse({ courtName: "Test", text });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("Huvudförhandling");
    expect(result[0].saken).toBe("grovt rattfylleri m m");
  });

  it("parses Konkursförhandling", () => {
    const text = "2026-02-20 10:00 - 11:00 Konkursförhandling ansökan om konkurs Sal 4";
    const result = formatTabular.parse({ courtName: "Test", text });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("Konkursförhandling");
    expect(result[0].saken).toBe("ansökan om konkurs");
  });

  it("parses Muntlig förberedelse", () => {
    const text = [
      "2026-02-16 13:00 - 15:00 Muntlig förberedelse",
      "underhållsbidrag mm",
      "Sal 3",
    ].join("\n");
    const result = formatTabular.parse({ courtName: "Test", text });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("Muntlig förberedelse");
    expect(result[0].saken).toBe("underhållsbidrag mm");
  });

  it("parses multiple hearings", () => {
    const text = [
      "ti",
      "2026-02-17 09:00 - 10:00 Huvudförhandling",
      "narkotikabrott",
      "Sal 1",
      "ti",
      "2026-02-17 10:00 - 11:00 Huvudförhandling",
      "misshandel",
      "Sal 2",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Test", text });
    expect(result).toHaveLength(2);
    expect(result[0].saken).toBe("narkotikabrott");
    expect(result[1].saken).toBe("misshandel");
  });

  it("handles multi-line saken", () => {
    const text = [
      "2026-02-18 14:00 - 14:45 Sammanträde",
      "undanröjande av",
      "ungdomsvård",
      "Sal 1",
    ].join("\n");
    const result = formatTabular.parse({ courtName: "Test", text });
    expect(result).toHaveLength(1);
    expect(result[0].saken).toBe("undanröjande av ungdomsvård");
    expect(result[0].type).toBe("Sammanträde");
  });

  it("continues saken from same line across continuation lines", () => {
    const text = [
      "2026-02-18 13:00 - 13:45 Huvudförhandling brott mot lagen om förbud Sal 1",
      "beträffande knivar och",
      "andra farliga föremål, grovt",
      "brott",
    ].join("\n");
    const result = formatTabular.parse({ courtName: "Test", text });
    expect(result).toHaveLength(1);
    expect(result[0].saken).toBe(
      "brott mot lagen om förbud beträffande knivar och andra farliga föremål, grovt brott"
    );
    expect(result[0].room).toBe("Sal 1");
  });

  it("stops continuation at next hearing line", () => {
    const text = [
      "2026-02-18 13:00 - 13:45 Huvudförhandling brott mot lagen om förbud Sal 1",
      "beträffande knivar och",
      "2026-02-18 14:00 - 14:45 Sammanträde undanröjande av ungdomsvård",
    ].join("\n");
    const result = formatTabular.parse({ courtName: "Test", text });
    expect(result).toHaveLength(2);
    expect(result[0].saken).toBe("brott mot lagen om förbud beträffande knivar och");
    expect(result[1].saken).toBe("undanröjande av ungdomsvård");
  });

  it("skips standalone Sal lines during continuation", () => {
    const text = [
      "2026-02-17 09:00 - 10:00 Huvudförhandling förolämpning mot Sal 3",
      "Sal 1",
      "tjänsteman",
    ].join("\n");
    const result = formatTabular.parse({ courtName: "Test", text });
    expect(result).toHaveLength(1);
    expect(result[0].saken).toBe("förolämpning mot tjänsteman");
    expect(result[0].room).toBe("Sal 3");
  });

  it("maps 'Fortsatt muntlig förb' to Muntlig förberedelse", () => {
    const text = "2026-02-20 10:00 - 11:00 Fortsatt muntlig förb tvist om underhåll Tingssal 2";
    const result = formatTabular.parse({ courtName: "Hässleholms tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("Muntlig förberedelse");
    expect(result[0].saken).toBe("tvist om underhåll");
    expect(result[0].room).toBe("Tingssal 2");
  });

  it("maps 'Muntlig förberedelse och ev hf' to Muntlig förberedelse", () => {
    const text = "2026-02-19 09:00 - 12:00 Muntlig förberedelse och ev hf fordran Tingssal 1";
    const result = formatTabular.parse({ courtName: "Hässleholms tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("Muntlig förberedelse");
    expect(result[0].saken).toBe("fordran");
    expect(result[0].room).toBe("Tingssal 1");
  });

  it("parses Hässleholm-style with Tingssal rooms", () => {
    const text = [
      "må 2026-02-16 09:00 - 16:00 Huvudförhandling brott mot trafikförordningenTingssal 2",
      "ti 2026-02-17 13:00 - 15:00 Muntlig förberedelse och ev hf fordranTingssal 1",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Hässleholms tingsrätt", text });
    expect(result).toHaveLength(2);
    expect(result[0].date).toBe("2026-02-16");
    expect(result[0].type).toBe("Huvudförhandling");
    expect(result[0].saken).toBe("brott mot trafikförordningen");
    expect(result[0].room).toBe("Tingssal 2");
    expect(result[1].date).toBe("2026-02-17");
    expect(result[1].type).toBe("Muntlig förberedelse");
    expect(result[1].saken).toBe("fordran");
    expect(result[1].room).toBe("Tingssal 1");
  });
});
