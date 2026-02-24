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
      "må 2026-02-16 09:00 - 16:00 Huvudförhandling brott mot trafikförordningen Tingssal 2",
      "ti 2026-02-17 13:00 - 15:00 Muntlig förberedelse och ev hf fordran Tingssal 1",
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

  it("handles multi-line entries with (dag X/Y)", () => {
    const text = [
      "må 2026-02-09",
      "09:00 - 12:00 Huvudförhandling överflyttande av vårdnad om barn Tingssal 2",
      "må 2026-02-09",
      "09:00 - 16:00 Huvudförhandling våldtäkt Tingssal 1",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Hässleholms tingsrätt", text });
    expect(result).toHaveLength(2);
    expect(result[0].date).toBe("2026-02-09");
    expect(result[0].time).toBe("09:00 - 12:00");
    expect(result[0].type).toBe("Huvudförhandling");
    expect(result[0].saken).toBe("överflyttande av vårdnad om barn");
    expect(result[0].room).toBe("Tingssal 2");
    expect(result[1].date).toBe("2026-02-09");
    expect(result[1].saken).toBe("våldtäkt");
    expect(result[1].room).toBe("Tingssal 1");
  });

  it("does not absorb next entry into previous saken", () => {
    const text = [
      "ti 2026-02-10 09:00 - 12:00 Huvudförhandling näringspenningtvätt Tingssal 1",
      "ti 2026-02-10",
      "09:00 - 12:00 Huvudförhandling boende och umgänge Tingssal 2",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Hässleholms tingsrätt", text });
    expect(result).toHaveLength(2);
    expect(result[0].saken).toBe("näringspenningtvätt");
    expect(result[0].room).toBe("Tingssal 1");
    expect(result[1].date).toBe("2026-02-10");
    expect(result[1].saken).toBe("boende och umgänge");
    expect(result[1].room).toBe("Tingssal 2");
  });

  it("cleans cross-line alias suffix from saken", () => {
    const text = [
      "fr 2026-02-13 13:00 - 14:30 Muntlig förberedelse och ev",
      "hf",
      "fordran (återvinning av mål FT 1065-25) Tingssal 3",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Hässleholms tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("Muntlig förberedelse");
    expect(result[0].saken).toBe("fordran (återvinning av mål FT 1065-25)");
    expect(result[0].room).toBe("Tingssal 3");
  });

  it("skips page headers in continuation", () => {
    const text = [
      "on 2026-02-11 15:00 - 15:45 Huvudförhandling stöld Tingssal 1",
      "Uppropslista Hässleholms tingsrätt V.07",
      "to 2026-02-12 09:00 - 11:00 Huvudförhandling hot mot tjänsteman Tingssal 1",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Hässleholms tingsrätt", text });
    expect(result).toHaveLength(2);
    expect(result[0].saken).toBe("stöld");
    expect(result[1].saken).toBe("hot mot tjänsteman");
  });

  it("strips inline (dag X/Y) from hearing type (Jönköping-style)", () => {
    const text = [
      "ti 2026-02-17 09:00 - 16:15 Huvudförhandling inbrottsstöld m.m Sal 12",
      "on 2026-02-18 09:00 - 12:00 Huvudförhandling inbrottsstöld m.m Sal 12",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Jönköpings tingsrätt", text });
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe("Huvudförhandling");
    expect(result[0].saken).toBe("inbrottsstöld m.m");
    expect(result[0].room).toBe("Sal 12");
    expect(result[1].date).toBe("2026-02-18");
    expect(result[1].saken).toBe("inbrottsstöld m.m");
  });

  it("parses Borgenärssammanträde", () => {
    const text = "to 2026-02-19 13:00 - 16:00 Borgenärssammanträde företagsrekonstruktion Sal 5";
    const result = formatTabular.parse({ courtName: "Jönköpings tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("Borgenärssammanträde");
    expect(result[0].saken).toBe("företagsrekonstruktion");
    expect(result[0].room).toBe("Sal 5");
  });

  it("parses Jönköping-style single-line entries", () => {
    const text = [
      "må 2026-02-16 09:00 - 09:45 Huvudförhandling ringa narkotikabrott Sal 4",
      "må 2026-02-16 09:00 - 10:15 Huvudförhandling grovt rattfylleri m m Sal 7",
      "ti 2026-02-17 09:00 - 12:00 Fortsatt hf misshandel mm. Sal 6",
      "ti 2026-02-17 13:15 - 16:00 Huvudförhandling olovligt innehav och försäljning av alkohol Sal 11",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Jönköpings tingsrätt", text });
    expect(result).toHaveLength(4);
    expect(result[0].date).toBe("2026-02-16");
    expect(result[0].saken).toBe("ringa narkotikabrott");
    expect(result[0].room).toBe("Sal 4");
    expect(result[1].saken).toBe("grovt rattfylleri m m");
    expect(result[2].type).toBe("Huvudförhandling");
    expect(result[2].saken).toBe("misshandel mm");
    expect(result[3].saken).toBe("olovligt innehav och försäljning av alkohol");
  });

  it("maps 'Edgångssmtr' to Edgångssammanträde", () => {
    const text = "ti 2026-02-17 09:00 - 10:00 Edgångssmtr konkurs Sal 3";
    const result = formatTabular.parse({ courtName: "Kristianstads tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("Edgångssammanträde");
    expect(result[0].saken).toBe("konkurs");
    expect(result[0].room).toBe("Sal 3");
  });

  it("extracts case numbers (Linköping-style)", () => {
    const text = [
      "må 2026-02-16 10:00 - 10:30 Konkursförhandling K 6578-25 ansökan om konkurs Sal 10",
      "må 2026-02-16 13:00 - 15:00 Muntlig förberedelse T 5050-25 skadestånd Sal 6",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Linköpings tingsrätt", text });
    expect(result).toHaveLength(2);
    expect(result[0].caseNumber).toBe("K 6578-25");
    expect(result[0].type).toBe("Konkursförhandling");
    expect(result[0].saken).toBe("ansökan om konkurs");
    expect(result[0].room).toBe("Sal 10");
    expect(result[1].caseNumber).toBe("T 5050-25");
    expect(result[1].saken).toBe("skadestånd");
  });

  it("extracts FT case numbers", () => {
    const text = "ti 2026-02-17 10:00 - 12:00 Muntlig förberedelse FT 5079-25 fordran Sal 8";
    const result = formatTabular.parse({ courtName: "Linköpings tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].caseNumber).toBe("FT 5079-25");
    expect(result[0].type).toBe("Muntlig förberedelse");
    expect(result[0].saken).toBe("fordran");
  });

  it("extracts Ä case numbers", () => {
    const text = "to 2026-02-19 10:00 - 12:00 Sammanträde Ä 271-26 anordnande av förvaltarskap Sal 10";
    const result = formatTabular.parse({ courtName: "Linköpings tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].caseNumber).toBe("Ä 271-26");
    expect(result[0].type).toBe("Sammanträde");
    expect(result[0].saken).toBe("anordnande av förvaltarskap");
  });

  it("handles Linköping multi-line with (dag X/Y) and case number", () => {
    const text = [
      "må 2026-02-16",
      "09:00 - 16:00 Huvudförhandling B 945-24 grov misshandel Sal 3",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Linköpings tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2026-02-16");
    expect(result[0].caseNumber).toBe("B 945-24");
    expect(result[0].type).toBe("Huvudförhandling");
    expect(result[0].saken).toBe("grov misshandel");
    expect(result[0].room).toBe("Sal 3");
  });

  it("handles wrapping saken with case number", () => {
    const text = [
      "må 2026-02-16 13:00 - 15:00 Muntlig förberedelse T 313-26 fordran (överlämnat från",
      "kronofogden)",
      "Sal 8",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Linköpings tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].caseNumber).toBe("T 313-26");
    expect(result[0].saken).toBe("fordran (överlämnat från kronofogden)");
    expect(result[0].room).toBe("Sal 8");
  });

  it("leaves caseNumber empty when no case number is present", () => {
    const text = "2026-02-17 09:00 - 10:00 Huvudförhandling narkotikabrott Sal 1";
    const result = formatTabular.parse({ courtName: "Eksjö tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].caseNumber).toBe("");
    expect(result[0].saken).toBe("narkotikabrott");
  });

  it("parses Mora-style tabular with case numbers and header", () => {
    const text = [
      "Förhandlingar i Mora tingsrätt, listan skapades 2026-02-09",
      "Listan är preliminär. Förhandlingar kan ställas in med kort varsel.",
      "Dag Datum Förhandlingstid Typ av förhandling Målnummer Saken Sal",
      "må 2026-02-09 10:00 - 11:00 Konkursförhandling K 82-26 ansökan om konkurs Sal 3",
      "må 2026-02-09 13:00 - 16:00 Muntlig förberedelse FT 1807-25 fordran Sal 3",
      "ti 2026-02-10 09:00 - 09:30 Huvudförhandling B 20-26 ringa narkotikabrott Sal 1",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Mora tingsrätt", text });
    expect(result).toHaveLength(3);
    expect(result[0].caseNumber).toBe("K 82-26");
    expect(result[0].type).toBe("Konkursförhandling");
    expect(result[0].saken).toBe("ansökan om konkurs");
    expect(result[0].room).toBe("Sal 3");
    expect(result[1].caseNumber).toBe("FT 1807-25");
    expect(result[1].type).toBe("Muntlig förberedelse");
    expect(result[2].caseNumber).toBe("B 20-26");
    expect(result[2].saken).toBe("ringa narkotikabrott");
  });

  it("maps 'Hf i förenklad form' to Huvudförhandling (Nacka)", () => {
    const text = "ti 2026-02-03 13:00 - 15:00 Hf i förenklad form FT 8641-25 Fordran Sal 16";
    const result = formatTabular.parse({ courtName: "Nacka tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("Huvudförhandling");
    expect(result[0].caseNumber).toBe("FT 8641-25");
    expect(result[0].saken).toBe("Fordran");
    expect(result[0].room).toBe("Sal 16");
  });

  it("maps 'Förlikningssmtr' to Förlikningssammanträde (Nacka)", () => {
    const text = "on 2026-02-18 13:00 - 13:30 Förlikningssmtr K 2295-25 Konkurs Sal 17";
    const result = formatTabular.parse({ courtName: "Nacka tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("Förlikningssammanträde");
    expect(result[0].caseNumber).toBe("K 2295-25");
    expect(result[0].saken).toBe("Konkurs");
    expect(result[0].room).toBe("Sal 17");
  });

  it("parses Nacka-style entries with all case types", () => {
    const text = [
      "Dag Datum Tid Mötestyp Målnummer Saken Lokal",
      "må 2026-02-16 09:00 - 11:30 Huvudförhandling B 10321-25 Stöld Sal 5",
      "ti 2026-02-17 12:00 - 15:00 Muntlig förberedelse T 9941-25 Fordran Sal 17",
      "on 2026-02-18 09:00 - 09:20 Konkursförhandling K 355-26 Ansökan om konkurs Sal 15",
      "to 2026-02-19 09:00 - 11:00 Fortsatt muntlig förb T 1214-25 Ansökan om äktenskapsskillnad med frågor om umgänge Sal 16",
      "fr 2026-02-20 09:00 - 11:00 Muntlig förberedelse och ev hf FT 6045-25 Trafikförsäkring Sal 15",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Nacka tingsrätt", text });
    expect(result).toHaveLength(5);
    expect(result[0].caseNumber).toBe("B 10321-25");
    expect(result[0].type).toBe("Huvudförhandling");
    expect(result[0].saken).toBe("Stöld");
    expect(result[0].room).toBe("Sal 5");
    expect(result[1].caseNumber).toBe("T 9941-25");
    expect(result[1].type).toBe("Muntlig förberedelse");
    expect(result[2].caseNumber).toBe("K 355-26");
    expect(result[2].type).toBe("Konkursförhandling");
    expect(result[3].caseNumber).toBe("T 1214-25");
    expect(result[3].type).toBe("Muntlig förberedelse");
    expect(result[3].saken).toBe("Ansökan om äktenskapsskillnad med frågor om umgänge");
    expect(result[4].caseNumber).toBe("FT 6045-25");
    expect(result[4].type).toBe("Muntlig förberedelse");
    expect(result[4].saken).toBe("Trafikförsäkring");
  });

  it("parses Nacka Ä case numbers (Sammanträde)", () => {
    const text = "ti 2026-02-03 09:00 - 11:00 Sammanträde Ä 84-26 Utmätning av lös egendom Sal 15";
    const result = formatTabular.parse({ courtName: "Nacka tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].caseNumber).toBe("Ä 84-26");
    expect(result[0].type).toBe("Sammanträde");
    expect(result[0].saken).toBe("Utmätning av lös egendom");
  });

  it("handles Norrköping (dag X/Y) between date and time", () => {
    const text = [
      "må 2026-02-16 09:00 - 16:00 Huvudförhandling B 3905-25 misshandel m.m. Sal 4",
      "ti 2026-02-17 09:00 - 16:00 Huvudförhandling B 3905-25 misshandel m.m. Sal 4",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Norrköpings tingsrätt", text });
    expect(result).toHaveLength(2);
    expect(result[0].date).toBe("2026-02-16");
    expect(result[0].time).toBe("09:00 - 16:00");
    expect(result[0].caseNumber).toBe("B 3905-25");
    expect(result[0].saken).toBe("misshandel m.m");
    expect(result[0].room).toBe("Sal 4");
    expect(result[1].date).toBe("2026-02-17");
  });

  it("handles multiple case numbers on one line (Norrköping)", () => {
    const text = "ti 2026-02-17 09:00 - 12:00 Huvudförhandling T 2784-25 T 1811-25 T 452-26 överflyttande av vårdnad Sal 6";
    const result = formatTabular.parse({ courtName: "Norrköpings tingsrätt", text });
    expect(result).toHaveLength(3);
    expect(result[0].caseNumber).toBe("T 2784-25");
    expect(result[0].saken).toBe("överflyttande av vårdnad");
    expect(result[0].room).toBe("Sal 6");
    expect(result[1].caseNumber).toBe("T 1811-25");
    expect(result[1].saken).toBe("överflyttande av vårdnad");
    expect(result[1].room).toBe("Sal 6");
    expect(result[2].caseNumber).toBe("T 452-26");
    expect(result[2].saken).toBe("överflyttande av vårdnad");
    expect(result[2].room).toBe("Sal 6");
  });

  it("parses Bevisupptagning hearing type", () => {
    const text = "må 2026-02-09 10:00 - 10:30 Bevisupptagning B 4086-25 djurplågeri Sal 3";
    const result = formatTabular.parse({ courtName: "Norrköpings tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("Bevisupptagning");
    expect(result[0].caseNumber).toBe("B 4086-25");
    expect(result[0].saken).toBe("djurplågeri");
  });

  it("parses Norrköping full week with mixed types", () => {
    const text = [
      "må 2026-02-09 09:00 - 12:00 Huvudförhandling B 1975-25 talan om självständigt förverkande Sal 6",
      "må 2026-02-09 10:00 - 10:20 Edgångssmtr K 4290-25 konkurs Sal 10",
      "ti 2026-02-10 10:00 - 12:00 Muntlig förberedelse FT 4966-25 fordran (överlämnat från KFM) Sal 1",
      "on 2026-02-11 09:00 - 16:00 Huvudförhandling B 3604-25 olaga förföljelse, olaga hot Sal 8",
      "fr 2026-02-13 13:00 - 14:00 Fortsatt hf B 457-25 skadegörelse m m Sal 3",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Norrköpings tingsrätt", text });
    expect(result).toHaveLength(5);
    expect(result[0].type).toBe("Huvudförhandling");
    expect(result[0].caseNumber).toBe("B 1975-25");
    expect(result[0].saken).toBe("talan om självständigt förverkande");
    expect(result[1].type).toBe("Edgångssammanträde");
    expect(result[1].caseNumber).toBe("K 4290-25");
    expect(result[2].caseNumber).toBe("FT 4966-25");
    expect(result[2].saken).toBe("fordran (överlämnat från KFM)");
    expect(result[3].type).toBe("Huvudförhandling");
    expect(result[3].saken).toBe("olaga förföljelse, olaga hot");
    expect(result[4].type).toBe("Huvudförhandling");
    expect(result[4].saken).toBe("skadegörelse m m");
  });

  it("parses separate hearings on separate lines", () => {
    const text = [
      "må 2026-02-16 09:00 - 16:00 Huvudförhandling B 1795-25 misshandel m m Sal 3",
      "to 2026-02-19 09:00 - 09:45 Huvudförhandling B 199-26 ringa stöld Sal 6",
    ].join("\n");
    const result = formatTabular.parse({ courtName: "Norrköpings tingsrätt", text });
    expect(result).toHaveLength(2);
    expect(result[0].caseNumber).toBe("B 1795-25");
    expect(result[0].saken).toBe("misshandel m m");
    expect(result[0].room).toBe("Sal 3");
    expect(result[1].caseNumber).toBe("B 199-26");
    expect(result[1].saken).toBe("ringa stöld");
    expect(result[1].room).toBe("Sal 6");
  });

  it("handles en-dash dates from PDF encoding", () => {
    const text = "to 2026\u201302\u201319 09:00 - 09:45 Huvudförhandling B 199-26 ringa stöld Sal 6";
    const result = formatTabular.parse({ courtName: "Norrköpings tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2026-02-19");
    expect(result[0].caseNumber).toBe("B 199-26");
    expect(result[0].saken).toBe("ringa stöld");
  });

  it("handles slash-separated case numbers", () => {
    const text = "ti 2026-02-17 09:00 - 12:00 Huvudförhandling T 2784-25 / T 1811-25 / T 452-26 överflyttande av vårdnad Sal 6";
    const result = formatTabular.parse({ courtName: "Norrköpings tingsrätt", text });
    expect(result).toHaveLength(3);
    expect(result[0].caseNumber).toBe("T 2784-25");
    expect(result[0].saken).toBe("överflyttande av vårdnad");
    expect(result[0].room).toBe("Sal 6");
    expect(result[1].caseNumber).toBe("T 1811-25");
    expect(result[1].saken).toBe("överflyttande av vårdnad");
    expect(result[2].caseNumber).toBe("T 452-26");
    expect(result[2].saken).toBe("överflyttande av vårdnad");
  });

  it("handles multi-hearing with continuation saken", () => {
    const text = [
      "to 2026-02-12 08:00 - 09:00 Huvudförhandling B 4536-25",
      "häleri Sal 7",
      "to 2026-02-12 09:00 - 09:30 Huvudförhandling B 5119-25 brott mot lagen om förbud beträffande knivar och andra farliga föremål Sal 3",
      "to 2026-02-12 09:00 - 10:30 Huvudförhandling B 4227-25 olaga hot Sal 6",
    ].join("\n");
    const result = formatTabular.parse({ courtName: "Norrköpings tingsrätt", text });
    expect(result).toHaveLength(3);
    expect(result[0].caseNumber).toBe("B 4536-25");
    expect(result[0].saken).toBe("häleri");
    expect(result[0].room).toBe("Sal 7");
    expect(result[1].caseNumber).toBe("B 5119-25");
    expect(result[1].saken).toBe("brott mot lagen om förbud beträffande knivar och andra farliga föremål");
    expect(result[1].room).toBe("Sal 3");
    expect(result[2].caseNumber).toBe("B 4227-25");
    expect(result[2].saken).toBe("olaga hot");
    expect(result[2].room).toBe("Sal 6");
  });

  it("parses clean multi-line hearings with case numbers", () => {
    const text = [
      "må 2026-02-16 09:00 - 16:00 Huvudförhandling B 1795-25",
      "misshandel m m Sal 3",
      "må 2026-02-16 09:00 - 16:00 Huvudförhandling B 3905-25",
      "misshandel m.m. Sal 4",
      "ti 2026-02-17 09:00 - 12:00 Huvudförhandling T 2784-25 T 1811-25 T 452-26",
      "överflyttande av vårdnad Sal 6",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Norrköpings tingsrätt", text });
    expect(result).toHaveLength(5);
    expect(result[0].date).toBe("2026-02-16");
    expect(result[0].time).toBe("09:00 - 16:00");
    expect(result[0].type).toBe("Huvudförhandling");
    expect(result[0].caseNumber).toBe("B 1795-25");
    expect(result[0].saken).toBe("misshandel m m");
    expect(result[0].room).toBe("Sal 3");
    expect(result[1].caseNumber).toBe("B 3905-25");
    expect(result[1].saken).toBe("misshandel m.m");
    expect(result[1].room).toBe("Sal 4");
    expect(result[2].date).toBe("2026-02-17");
    expect(result[2].caseNumber).toBe("T 2784-25");
    expect(result[2].saken).toBe("överflyttande av vårdnad");
    expect(result[2].room).toBe("Sal 6");
    expect(result[3].caseNumber).toBe("T 1811-25");
    expect(result[3].saken).toBe("överflyttande av vårdnad");
    expect(result[4].caseNumber).toBe("T 452-26");
    expect(result[4].saken).toBe("överflyttande av vårdnad");
  });

  it("skips Kristianstad-style headers in continuation", () => {
    const text = [
      "on 2026-02-18 13:00 - 15:00 Huvudförhandling misshandel Sal 2",
      "Förhandlingar i Kristianstads tingsrätt 2026-02-16 --28",
      "Listan är preliminär. Förhandlingar kan ställas in med kort varsel.",
      "Dag Datum Förhandlingstid Typ av förhandling Saken Sal",
      "to 2026-02-19 09:00 - 12:00 Huvudförhandling stöld Sal 1",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Kristianstads tingsrätt", text });
    expect(result).toHaveLength(2);
    expect(result[0].saken).toBe("misshandel");
    expect(result[1].saken).toBe("stöld");
  });

  it("parses Norrköping same-day hearings on separate lines", () => {
    const text = [
      "ti 2026-02-10 09:00 - 10:00 Konkursförhandling K 5555-25 konkurs Sal 1",
      "ti 2026-02-10 09:00 - 10:00 Huvudförhandling B 2752-25 ofredande Sal 5",
      "ti 2026-02-10 09:00 - 10:00 Huvudförhandling B 3734-25 misshandel, ringa brott Sal 3",
      "ti 2026-02-10 09:00 - 16:00 Huvudförhandling T 3996-24 vårdnad Sal 4",
      "ti 2026-02-10 09:00 - 16:00 Huvudförhandling T 3776-25 vårdnad Sal 2",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Norrköpings tingsrätt", text });
    expect(result.length).toBe(5);
    expect(result[0].saken).toBe("konkurs");
    expect(result[1].saken).toBe("ofredande");
    expect(result[2].saken).toContain("misshandel");
    expect(result[3].saken).toBe("vårdnad");
    expect(result[4].saken).toBe("vårdnad");
  });

  it("parses clean multi-line with Edgångssmtr and multiple hearings", () => {
    const text = [
      "må 2026-02-09 10:40 - 11:00 Edgångssmtr K 4787-25 konkurs Sal 10",
      "ti 2026-02-10 09:00 - 10:00 Huvudförhandling B 2752-25 ofredande Sal 3",
      "ti 2026-02-10 09:00 - 10:00 Huvudförhandling B 3734-25 misshandel, ringa brott Sal 7",
      "ti 2026-02-10 09:00 - 16:00 Huvudförhandling T 3996-24 vårdnad Sal 8",
      "ti 2026-02-10 09:00 - 16:00 Huvudförhandling T 3776-25 vårdnad Sal 9",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Norrköpings tingsrätt", text });
    expect(result).toHaveLength(5);

    expect(result[0].date).toBe("2026-02-09");
    expect(result[0].type).toBe("Edgångssammanträde");
    expect(result[0].caseNumber).toBe("K 4787-25");
    expect(result[0].saken).toBe("konkurs");
    expect(result[0].room).toBe("Sal 10");

    expect(result[1].date).toBe("2026-02-10");
    expect(result[1].type).toBe("Huvudförhandling");
    expect(result[1].caseNumber).toBe("B 2752-25");
    expect(result[1].saken).toBe("ofredande");
    expect(result[1].room).toBe("Sal 3");

    expect(result[2].date).toBe("2026-02-10");
    expect(result[2].caseNumber).toBe("B 3734-25");
    expect(result[2].saken).toBe("misshandel, ringa brott");
    expect(result[2].room).toBe("Sal 7");

    expect(result[3].caseNumber).toBe("T 3996-24");
    expect(result[3].saken).toBe("vårdnad");
    expect(result[3].room).toBe("Sal 8");

    expect(result[4].caseNumber).toBe("T 3776-25");
    expect(result[4].saken).toBe("vårdnad");
    expect(result[4].room).toBe("Sal 9");
  });

  it("parses cross-day transition with continuation saken", () => {
    const text = [
      "on 2026-02-11 15:30 - 16:00 Huvudförhandling B 3948-25",
      "häleri Sal 3",
      "to 2026-02-12 09:00 - 09:30 Huvudförhandling B 5119-25",
      "brott mot lagen om förbud beträffande knivar och andra farliga föremål Sal 9",
      "to 2026-02-12 09:00 - 10:30 Huvudförhandling B 4227-25",
      "olaga hot Sal 3",
      "to 2026-02-12 09:00 - 12:00 Fortsatt muntlig förb T 5125-24",
      "vårdnad Sal 1",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Norrköpings tingsrätt", text });
    expect(result).toHaveLength(4);

    expect(result[0].date).toBe("2026-02-11");
    expect(result[0].saken).toBe("häleri");

    expect(result[1].date).toBe("2026-02-12");
    expect(result[1].caseNumber).toBe("B 5119-25");
    expect(result[1].saken).toContain("brott mot lagen om förbud");

    expect(result[2].caseNumber).toBe("B 4227-25");
    expect(result[2].saken).toBe("olaga hot");

    expect(result[3].caseNumber).toBe("T 5125-24");
    expect(result[3].type).toBe("Muntlig förberedelse");
    expect(result[3].saken).toBe("vårdnad");
  });

  it("parses Nyköping-style with Tingssal rooms", () => {
    const text = [
      "må 2026-02-09 09:00 - 10:30 Huvudförhandling B 4819-25",
      "ringa stöld Tingssal 5",
      "må 2026-02-09 10:00 - 12:00 Förlikningssmtr K 1470-25",
      "ansökan om konkurs Tingssal 6",
      "må 2026-02-09 13:00 - 14:00 Fortsatt hf B 4165-25 B 4675-25",
      "misshandel Tingssal 1",
      "Dag Datum Tid Mötestyp Målnummer Saken Lokal",
      "ti 2026-02-10 10:00 - 12:00 Muntlig förberedelse FT 4566-25",
      "fordran Tingssal 6",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Nyköpings tingsrätt", text });
    expect(result).toHaveLength(5);

    expect(result[0].caseNumber).toBe("B 4819-25");
    expect(result[0].type).toBe("Huvudförhandling");
    expect(result[0].saken).toBe("ringa stöld");
    expect(result[0].room).toBe("Tingssal 5");

    expect(result[1].caseNumber).toBe("K 1470-25");
    expect(result[1].type).toBe("Förlikningssammanträde");
    expect(result[1].saken).toBe("ansökan om konkurs");
    expect(result[1].room).toBe("Tingssal 6");

    expect(result[2].caseNumber).toBe("B 4165-25");
    expect(result[2].type).toBe("Huvudförhandling");
    expect(result[2].saken).toBe("misshandel");
    expect(result[2].room).toBe("Tingssal 1");

    expect(result[3].caseNumber).toBe("B 4675-25");
    expect(result[3].type).toBe("Huvudförhandling");
    expect(result[3].saken).toBe("misshandel");
    expect(result[3].room).toBe("Tingssal 1");

    expect(result[4].caseNumber).toBe("FT 4566-25");
    expect(result[4].type).toBe("Muntlig förberedelse");
    expect(result[4].saken).toBe("fordran");
    expect(result[4].room).toBe("Tingssal 6");
  });

  it("parses Skaraborgs single-line format with all hearing types", () => {
    const text = [
      "Dag Datum Tid Typ Målnummer Saken Sal",
      "må 2026-02-09 09:00 - 09:45 Huvudförhandling B 5730-25 grov olovlig körning Sal 7",
      "ti 2026-02-10 10:00 - 12:00 Sammanträde Ä 114-25 ansökan om god man Sal 3",
      "ti 2026-02-10 09:00 - 16:00 Huvudförhandling B 1867-24 grovt bedrägeri m.m. Sal 8",
      "on 2026-02-11 09:30 - 10:00 Konkursförhandling K 81-26 ansökan om konkurs Sal 1",
      "fr 2026-02-13 09:00 - 11:00 Muntlig förhandling T 226-26 vårdnad, boende och/eller umgänge Sal 3",
      "to 2026-02-12 13:15 - 15:15 Muntlig förhandling T 4214-25 kontraktsrätt Sal 3",
      "ti 2026-02-17 13:15 - 15:15 Muntlig förberedelse T 5471-25 kontraktsrätt överlämnat från kronofogden Sal 2",
      "ti 2026-02-17 13:15 - 14:15 Fortsatt hf B 3973-25 misshandel m.m. Sal 4",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Skaraborgs tingsrätt", text });
    expect(result).toHaveLength(8);

    // Monday — Huvudförhandling
    expect(result[0].date).toBe("2026-02-09");
    expect(result[0].type).toBe("Huvudförhandling");
    expect(result[0].caseNumber).toBe("B 5730-25");
    expect(result[0].saken).toBe("grov olovlig körning");
    expect(result[0].room).toBe("Sal 7");

    // Tuesday — Sammanträde with Ä-prefix case
    expect(result[1].date).toBe("2026-02-10");
    expect(result[1].type).toBe("Sammanträde");
    expect(result[1].caseNumber).toBe("Ä 114-25");
    expect(result[1].saken).toBe("ansökan om god man");
    expect(result[1].room).toBe("Sal 3");

    // Tuesday — multi-day hearing
    expect(result[2].type).toBe("Huvudförhandling");
    expect(result[2].caseNumber).toBe("B 1867-24");
    expect(result[2].saken).toBe("grovt bedrägeri m.m");
    expect(result[2].room).toBe("Sal 8");

    // Wednesday — Konkursförhandling
    expect(result[3].date).toBe("2026-02-11");
    expect(result[3].type).toBe("Konkursförhandling");
    expect(result[3].caseNumber).toBe("K 81-26");
    expect(result[3].saken).toBe("ansökan om konkurs");

    // Friday — Muntlig förhandling (distinct type)
    expect(result[4].date).toBe("2026-02-13");
    expect(result[4].type).toBe("Muntlig förhandling");
    expect(result[4].caseNumber).toBe("T 226-26");
    expect(result[4].saken).toBe("vårdnad, boende och/eller umgänge");
    expect(result[4].room).toBe("Sal 3");

    // Thursday — Muntlig förhandling
    expect(result[5].date).toBe("2026-02-12");
    expect(result[5].type).toBe("Muntlig förhandling");
    expect(result[5].caseNumber).toBe("T 4214-25");
    expect(result[5].saken).toBe("kontraktsrätt");

    // Muntlig förberedelse
    expect(result[6].date).toBe("2026-02-17");
    expect(result[6].type).toBe("Muntlig förberedelse");
    expect(result[6].caseNumber).toBe("T 5471-25");
    expect(result[6].saken).toBe("kontraktsrätt överlämnat från kronofogden");
    expect(result[6].room).toBe("Sal 2");

    // Fortsatt hf alias
    expect(result[7].type).toBe("Huvudförhandling");
    expect(result[7].caseNumber).toBe("B 3973-25");
    expect(result[7].saken).toBe("misshandel m.m");
    expect(result[7].room).toBe("Sal 4");
  });

  it("parses Nyköping multi-line saken with (dag X/Y)", () => {
    const text = [
      "on 2026-02-11",
      "09:00 - 16:00 Huvudförhandling T 1157-24",
      "fordran Tingssal 3",
      "on 2026-02-11 09:15 - 12:00 Muntlig förberedelse T 4288-25",
      "umgänge med barn m.m Tingssal 7",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Nyköpings tingsrätt", text });
    expect(result).toHaveLength(2);

    expect(result[0].date).toBe("2026-02-11");
    expect(result[0].caseNumber).toBe("T 1157-24");
    expect(result[0].saken).toBe("fordran");
    expect(result[0].room).toBe("Tingssal 3");

    expect(result[1].caseNumber).toBe("T 4288-25");
    expect(result[1].type).toBe("Muntlig förberedelse");
    expect(result[1].saken).toBe("umgänge med barn m.m");
    expect(result[1].room).toBe("Tingssal 7");
  });

  it("parses Stockholm 3-line format with all special types and PMT case numbers", () => {
    const text = [
      "Förhandlingar i Stockholms tingsrätt, vecka 8, 2026-02-16 till och med 2026-02-20 (listan publicerad 2026-02-11).",
      "Tingsrätten framhåller att listan är preliminär.",
      "Datum Tid Möte Målnummer Saken Lokal",
      "må 2026-02-16 09:00 - 09:15 Konkursförhandling",
      "K 21241-25",
      "konkurs Sal 22",
      "må 2026-02-16 09:00 - 10:30 Muntlig förberedelse, eventuell huvudförhandling",
      "FT 23816-25",
      "fordran Sal 25",
      "må 2026-02-16 09:00 - 16:30 Huvudförhandling",
      "T 11073-22, T 8203-24",
      "fastställelsetalan Sal 27",
      "ti 2026-02-17 09:00 - 12:00 Huvudförhandling i förenklad form",
      "FT 21289-25",
      "fordran Sal 30",
      "ti 2026-02-17 09:00 - 16:30 Huvudförhandling",
      "PMT 12670-24, med flera",
      "varumärkesintrång m.m. Sal 26",
      "ti 2026-02-17 09:00 - 17:00 Huvudförhandling",
      "B 6394-24 (Solna tingsrätt)",
      "folkrättsbrott, grovt brott Högsäkerhetssal 2, Bergsgatan 50",
      "on 2026-02-18 09:00 - 09:10 Edgångssammanträde",
      "K 5348-25",
      "konkurs Sal 9",
      "on 2026-02-18 13:00 - 15:00 Muntlig förberedelse",
      "T 16169-25",
      "kontraktsrätt Sal 25",
      "on 2026-02-18 11:30 - 12:00 Föredragning",
      "Ä 25040-25",
      "prövning av tillträdesförbud",
      "to 2026-02-19 09:00 - 11:00 Muntlig förberedelse",
      "T 19657-25",
      "fordran Sal 29",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Stockholms tingsrätt", text });
    expect(result).toHaveLength(11);

    // Konkursförhandling
    expect(result[0].date).toBe("2026-02-16");
    expect(result[0].type).toBe("Konkursförhandling");
    expect(result[0].caseNumber).toBe("K 21241-25");
    expect(result[0].saken).toBe("konkurs");
    expect(result[0].room).toBe("Sal 22");

    // "Muntlig förberedelse, eventuell huvudförhandling" → Muntlig förberedelse
    expect(result[1].type).toBe("Muntlig förberedelse");
    expect(result[1].caseNumber).toBe("FT 23816-25");
    expect(result[1].saken).toBe("fordran");
    expect(result[1].room).toBe("Sal 25");

    // Multi-case → split into separate rows
    expect(result[2].type).toBe("Huvudförhandling");
    expect(result[2].caseNumber).toBe("T 11073-22");
    expect(result[2].saken).toBe("fastställelsetalan");
    expect(result[2].room).toBe("Sal 27");

    expect(result[3].type).toBe("Huvudförhandling");
    expect(result[3].caseNumber).toBe("T 8203-24");
    expect(result[3].saken).toBe("fastställelsetalan");
    expect(result[3].room).toBe("Sal 27");

    // "Huvudförhandling i förenklad form" → Huvudförhandling
    expect(result[4].date).toBe("2026-02-17");
    expect(result[4].type).toBe("Huvudförhandling");
    expect(result[4].caseNumber).toBe("FT 21289-25");
    expect(result[4].saken).toBe("fordran");
    expect(result[4].room).toBe("Sal 30");

    // PMT prefix + "med flera" stripped
    expect(result[5].type).toBe("Huvudförhandling");
    expect(result[5].caseNumber).toBe("PMT 12670-24");
    expect(result[5].saken).toBe("varumärkesintrång m.m");
    expect(result[5].room).toBe("Sal 26");

    // External court reference "(Solna tingsrätt)" extracted
    expect(result[6].type).toBe("Huvudförhandling");
    expect(result[6].caseNumber).toBe("B 6394-24");
    expect(result[6].externalCourt).toBe("Solna tingsrätt");
    expect(result[6].saken).toContain("folkrättsbrott");

    // Edgångssammanträde
    expect(result[7].date).toBe("2026-02-18");
    expect(result[7].type).toBe("Edgångssammanträde");
    expect(result[7].caseNumber).toBe("K 5348-25");
    expect(result[7].saken).toBe("konkurs");
    expect(result[7].room).toBe("Sal 9");

    // Standard Muntlig förberedelse
    expect(result[8].type).toBe("Muntlig förberedelse");
    expect(result[8].caseNumber).toBe("T 16169-25");
    expect(result[8].saken).toBe("kontraktsrätt");
    expect(result[8].room).toBe("Sal 25");

    // Föredragning — new type, no room
    expect(result[9].type).toBe("Föredragning");
    expect(result[9].caseNumber).toBe("Ä 25040-25");
    expect(result[9].saken).toBe("prövning av tillträdesförbud");
    expect(result[9].room).toBe("");

    // Thursday standard hearing
    expect(result[10].date).toBe("2026-02-19");
    expect(result[10].caseNumber).toBe("T 19657-25");
    expect(result[10].saken).toBe("fordran");
    expect(result[10].room).toBe("Sal 29");
  });

  it("handles Stockholm typo 'huvuförhandling' and Fortsatt muntlig förberedelse", () => {
    const text = [
      "må 2026-02-09 09:00 - 11:00 Muntlig förberedelse, eventuell huvuförhandling",
      "T 25039-25",
      "hyresfordran Sal 1",
      "må 2026-02-09 13:00 - 15:00 Fortsatt muntlig förberedelse",
      "T 16320-25",
      "vårdnad m.m. Sal 15",
      "ti 2026-02-10 09:00 - 11:30 Förberedande förhandling",
      "B 14600-25",
      "enskilt åtal Sal 16",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Stockholms tingsrätt", text });
    expect(result).toHaveLength(3);

    // Typo variant "huvuförhandling" (missing 'd')
    expect(result[0].type).toBe("Muntlig förberedelse");
    expect(result[0].caseNumber).toBe("T 25039-25");
    expect(result[0].saken).toBe("hyresfordran");
    expect(result[0].room).toBe("Sal 1");

    // "Fortsatt muntlig förberedelse" (full form, not abbreviated)
    expect(result[1].type).toBe("Muntlig förberedelse");
    expect(result[1].caseNumber).toBe("T 16320-25");
    expect(result[1].saken).toBe("vårdnad m.m");
    expect(result[1].room).toBe("Sal 15");

    // "Förberedande förhandling" → Förhandling
    expect(result[2].date).toBe("2026-02-10");
    expect(result[2].type).toBe("Förhandling");
    expect(result[2].caseNumber).toBe("B 14600-25");
    expect(result[2].saken).toBe("enskilt åtal");
    expect(result[2].room).toBe("Sal 16");
  });

  it("parses Uppsala format with court names as Lokal field", () => {
    const text = [
      "Dag Datum Förhandlingstid Typ av förhandling Målnummer Saken Lokal",
      "må 2026-02-16 09:00 - 09:15 Edgångssmtr",
      "K 9392-25",
      "ansökan om konkurs Uppsala tingsrätt",
      "må 2026-02-16 09:00 - 12:00 Huvudförhandling",
      "B 542-25",
      "ringa narkotikabrott Uppsala tingsrätt",
      "ti 2026-02-17 09:00 - 16:00 Muntlig förberedelse och ev hf",
      "T 6817-25",
      "kontraktsrätt Uppsala tingsrätt",
      "on 2026-02-18 09:30 - 16:30 Huvudförhandling",
      "B 3858-25",
      "mord m.m. Attunda tingsrätt",
      "to 2026-02-19 09:00 - 10:00 Plansammanträde",
      "K 213-26",
      "rekonstruktion Uppsala tingsrätt",
      "fr 2026-02-20 09:00 - 11:00 Muntlig förberedelse",
      "FT 8123-25",
      "fordran Uppsala tingsrätt",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Uppsala tingsrätt", text });
    expect(result).toHaveLength(6);

    // Edgångssammanträde with location
    expect(result[0].date).toBe("2026-02-16");
    expect(result[0].type).toBe("Edgångssammanträde");
    expect(result[0].caseNumber).toBe("K 9392-25");
    expect(result[0].saken).toBe("ansökan om konkurs");
    expect(result[0].location).toBe("Uppsala tingsrätt");

    // Standard hearing at Uppsala
    expect(result[1].type).toBe("Huvudförhandling");
    expect(result[1].caseNumber).toBe("B 542-25");
    expect(result[1].saken).toBe("ringa narkotikabrott");
    expect(result[1].location).toBe("Uppsala tingsrätt");

    // Alias type with location
    expect(result[2].date).toBe("2026-02-17");
    expect(result[2].type).toBe("Muntlig förberedelse");
    expect(result[2].caseNumber).toBe("T 6817-25");
    expect(result[2].saken).toBe("kontraktsrätt");

    // Different court as Lokal — Attunda tingsrätt
    expect(result[3].date).toBe("2026-02-18");
    expect(result[3].caseNumber).toBe("B 3858-25");
    expect(result[3].saken).toBe("mord m.m");
    expect(result[3].location).toBe("Attunda tingsrätt");

    // Plansammanträde (new hearing type)
    expect(result[4].date).toBe("2026-02-19");
    expect(result[4].type).toBe("Plansammanträde");
    expect(result[4].caseNumber).toBe("K 213-26");
    expect(result[4].saken).toBe("rekonstruktion");

    // Standard Muntlig förberedelse
    expect(result[5].date).toBe("2026-02-20");
    expect(result[5].type).toBe("Muntlig förberedelse");
    expect(result[5].caseNumber).toBe("FT 8123-25");
    expect(result[5].saken).toBe("fordran");
  });

  it("parses Varberg single-line format with short dates (no case numbers)", () => {
    const text = [
      "Förhandlingar i Varbergs tingsrätt, vecka 7-9, 10-28 februari 2026",
      "Listan är preliminär. Förhandlingar kan ställas in med kort varsel och andra kan tillkomma.",
      "Dag Datum Förhandlingstid Typ av förhandling Saken Sal",
      "ti 10-feb 09:00 - 16:00 Huvudförhandling fordran Sal 5",
      "ti 10-feb 09:00 - 16:00 Huvudförhandling synnerligen grovt narkotikabrott Sal 2",
      "on 11-feb 09:00 - 11:00 Muntlig förberedelse fordran Sal 6",
      "on 11-feb 11:00 - 11:15 Konkursförhandling ansökan om konkurs Sal 3",
      "on 11-feb 14:00 - 16:00 Huvudförhandling brott mot lagen om förbud beträffande knivar och andra farliga föremål Sal 4",
      "to 12-feb 13:00 - 15:00 Muntlig förberedelse fordran Sal 6",
      "fr 13-feb 09:00 - 10:30 Muntlig förberedelse och ev hf fordran Sal 6",
      "må 16-feb 13:00 - 15:00 Fortsatt muntlig förb fordran och avhysning Sal 6",
      "ti 17-feb 13:00 - 15:00 Sammanträde jämkning av godmanskap till förvaltarskap Sal 6",
    ].join("\n");

    const currentYear = new Date().getFullYear();
    const result = formatTabular.parse({ courtName: "Varbergs tingsrätt", text });
    expect(result).toHaveLength(9);

    expect(result[0].date).toBe(`${currentYear}-02-10`);
    expect(result[0].time).toBe("09:00 - 16:00");
    expect(result[0].type).toBe("Huvudförhandling");
    expect(result[0].saken).toBe("fordran");
    expect(result[0].room).toBe("Sal 5");
    expect(result[0].caseNumber).toBe("");

    expect(result[1].saken).toBe("synnerligen grovt narkotikabrott");
    expect(result[1].room).toBe("Sal 2");

    expect(result[2].date).toBe(`${currentYear}-02-11`);
    expect(result[2].type).toBe("Muntlig förberedelse");
    expect(result[2].saken).toBe("fordran");

    expect(result[3].type).toBe("Konkursförhandling");
    expect(result[3].saken).toBe("ansökan om konkurs");

    expect(result[4].saken).toBe("brott mot lagen om förbud beträffande knivar och andra farliga föremål");
    expect(result[4].room).toBe("Sal 4");

    // Muntlig förberedelse och ev hf → Muntlig förberedelse
    expect(result[6].type).toBe("Muntlig förberedelse");
    expect(result[6].saken).toBe("fordran");

    // Fortsatt muntlig förb → Muntlig förberedelse
    expect(result[7].date).toBe(`${currentYear}-02-16`);
    expect(result[7].type).toBe("Muntlig förberedelse");
    expect(result[7].saken).toBe("fordran och avhysning");

    // Sammanträde
    expect(result[8].date).toBe(`${currentYear}-02-17`);
    expect(result[8].type).toBe("Sammanträde");
    expect(result[8].saken).toBe("jämkning av godmanskap till förvaltarskap");
  });

  it("parses Uddevalla 3-line format with multi-day and multi-case", () => {
    const text = [
      "Dag Datum Förhandlingstid Typ av förhandling Målnummer Saken Sal",
      "ti 2026-02-17 09:00 - 16:00 Huvudförhandling",
      "B 3608-25",
      "grov fridskränkning Sal 1",
      "ti 2026-02-17 09:00 - 16:00 Huvudförhandling",
      "B 1852-25, B 3694-24",
      "misshandel m m Sal 2",
      "on 2026-02-18 09:00 - 10:00 Konkursförhandling",
      "K 104-26",
      "ansökan om konkurs Sal 5",
      "on 2026-02-18 13:00 - 16:00 Muntlig förberedelse och ev hf",
      "FT 5432-25",
      "fordran Sal 6",
      "to 2026-02-19 09:00 - 12:00 Muntlig förberedelse",
      "T 1887-25, Ä 1005-25",
      "överflyttning av vårdnaden enligt 6 kap",
      "8 § föräldrabalken Sal 7",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Uddevalla tingsrätt", text });
    expect(result).toHaveLength(7);

    expect(result[0].date).toBe("2026-02-17");
    expect(result[0].type).toBe("Huvudförhandling");
    expect(result[0].caseNumber).toBe("B 3608-25");
    expect(result[0].saken).toBe("grov fridskränkning");
    expect(result[0].room).toBe("Sal 1");

    // Split multi-case into separate rows
    expect(result[1].caseNumber).toBe("B 1852-25");
    expect(result[1].saken).toBe("misshandel m m");
    expect(result[1].room).toBe("Sal 2");

    expect(result[2].caseNumber).toBe("B 3694-24");
    expect(result[2].saken).toBe("misshandel m m");
    expect(result[2].room).toBe("Sal 2");

    expect(result[3].date).toBe("2026-02-18");
    expect(result[3].type).toBe("Konkursförhandling");
    expect(result[3].caseNumber).toBe("K 104-26");
    expect(result[3].saken).toBe("ansökan om konkurs");

    expect(result[4].type).toBe("Muntlig förberedelse");
    expect(result[4].caseNumber).toBe("FT 5432-25");
    expect(result[4].saken).toBe("fordran");

    // Multi-line saken with mixed case numbers — split into separate rows
    expect(result[5].date).toBe("2026-02-19");
    expect(result[5].caseNumber).toBe("T 1887-25");
    expect(result[5].saken).toContain("överflyttning av vårdnaden");
    expect(result[5].room).toBe("Sal 7");

    expect(result[6].caseNumber).toBe("Ä 1005-25");
    expect(result[6].saken).toContain("överflyttning av vårdnaden");
    expect(result[6].room).toBe("Sal 7");
  });

  it("parses Vänersborg 3-line format with dated entries", () => {
    const text = [
      "Förhandlingar i Vänersborgs tingsrätt, listan skapades 2026-02-13",
      "Listan är preliminär. Förhandlingar kan ställas in med kort varsel och andra kan tillkomma.",
      "Dag Datum Förhandlingstid Typ av förhandling Målnummer Saken Sal",
      "må 2026-02-16 13:00 - 16:00 Huvudförhandling",
      "B 3985-24",
      "misshandel Sal 4",
      "må 2026-02-16 09:00 - 16:00 Huvudförhandling",
      "T 740-25",
      "vårdnad, boende, umgänge (INTERIMISTISK) Sal 3",
      "ti 2026-02-17 09:00 - 16:00 Huvudförhandling",
      "B 5601-23",
      "ofredande m.m. Sal 8",
      "ti 2026-02-17 09:00 - 12:00 Huvudförhandling",
      "B 5890-25",
      "misshandel Sal 4",
      "ti 2026-02-17 09:00 - 11:00 Muntlig förberedelse",
      "T 4727-25",
      "fordran (överlämnat från kfm 01-387691-25) Sal 5",
      "on 2026-02-18 09:00 - 12:00 Huvudförhandling",
      "B 3778-24",
      "misshandel m.m. Sal 4",
      "to 2026-02-19 09:00 - 09:45 Huvudförhandling",
      "B 223-26",
      "skadegörelse Sal 4",
      "fr 2026-02-20 09:30 - 10:00 Huvudförhandling",
      "B 115-26",
      "hastighetsöverträdelse Sal 4",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Vänersborgs tingsrätt", text });
    expect(result).toHaveLength(8);

    // Monday — dated entry
    expect(result[0].date).toBe("2026-02-16");
    expect(result[0].time).toBe("13:00 - 16:00");
    expect(result[0].type).toBe("Huvudförhandling");
    expect(result[0].caseNumber).toBe("B 3985-24");
    expect(result[0].saken).toBe("misshandel");
    expect(result[0].room).toBe("Sal 4");

    // Monday — parenthesized saken with INTERIMISTISK
    expect(result[1].caseNumber).toBe("T 740-25");
    expect(result[1].saken).toBe("vårdnad, boende, umgänge (INTERIMISTISK)");
    expect(result[1].room).toBe("Sal 3");

    // Tuesday
    expect(result[2].date).toBe("2026-02-17");
    expect(result[2].caseNumber).toBe("B 5601-23");
    expect(result[2].saken).toBe("ofredande m.m");
    expect(result[2].room).toBe("Sal 8");

    // Tuesday — regular entry
    expect(result[3].caseNumber).toBe("B 5890-25");
    expect(result[3].saken).toBe("misshandel");

    // Tuesday — Muntlig förberedelse with KFM reference in saken
    expect(result[4].type).toBe("Muntlig förberedelse");
    expect(result[4].caseNumber).toBe("T 4727-25");
    expect(result[4].saken).toBe("fordran (överlämnat från kfm 01-387691-25)");

    // Wednesday
    expect(result[5].date).toBe("2026-02-18");
    expect(result[5].caseNumber).toBe("B 3778-24");
    expect(result[5].saken).toBe("misshandel m.m");

    // Thursday
    expect(result[6].date).toBe("2026-02-19");
    expect(result[6].caseNumber).toBe("B 223-26");
    expect(result[6].saken).toBe("skadegörelse");

    // Friday
    expect(result[7].date).toBe("2026-02-20");
    expect(result[7].caseNumber).toBe("B 115-26");
    expect(result[7].saken).toBe("hastighetsöverträdelse");
  });

  it("computes dates for Vänersborg date-less multi-day entries", () => {
    const text = [
      "Dag Datum Förhandlingstid Typ av förhandling Målnummer Saken Sal",
      "ti 2026-02-17 09:00 - 12:00 Huvudförhandling",
      "B 5890-25",
      "misshandel Sal 4",
      "må 09:00 - 16:00 Huvudförhandling",
      "B 4349-25",
      "våldtäkt Sal 2",
      "on 09:00 - 16:00 Huvudförhandling",
      "B 5453-25",
      "grov misshandel mm Sal 1",
      "to 09:00 - 16:00 Huvudförhandling",
      "B 4085-25",
      "våldtäkt mot barn m.m. Sal 2",
      "fr 09:00 - 16:00 Huvudförhandling",
      "B 5453-25",
      "grov misshandel mm Sal 5",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Vänersborgs tingsrätt", text });
    expect(result).toHaveLength(5);

    // Tuesday — dated entry, anchors the week
    expect(result[0].date).toBe("2026-02-17");
    expect(result[0].caseNumber).toBe("B 5890-25");

    // Monday — date computed from day abbreviation + week
    expect(result[1].date).toBe("2026-02-16");
    expect(result[1].caseNumber).toBe("B 4349-25");
    expect(result[1].saken).toBe("våldtäkt");
    expect(result[1].room).toBe("Sal 2");

    // Wednesday — computed
    expect(result[2].date).toBe("2026-02-18");
    expect(result[2].caseNumber).toBe("B 5453-25");
    expect(result[2].saken).toBe("grov misshandel mm");

    // Thursday — computed
    expect(result[3].date).toBe("2026-02-19");
    expect(result[3].caseNumber).toBe("B 4085-25");
    expect(result[3].saken).toBe("våldtäkt mot barn m.m");

    // Friday — computed
    expect(result[4].date).toBe("2026-02-20");
    expect(result[4].caseNumber).toBe("B 5453-25");
    expect(result[4].saken).toBe("grov misshandel mm");
  });

  it("handles Vänersborg multi-line hearing type across lines", () => {
    const text = [
      "fr 2026-02-20 09:30 - 12:00 Muntlig förberedelse och",
      "ev hf",
      "FT 5275-25",
      "fordran. överlämnat från KFM, 01-952487-25 Sal 6",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Vänersborgs tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2026-02-20");
    expect(result[0].type).toBe("Muntlig förberedelse");
    expect(result[0].caseNumber).toBe("FT 5275-25");
    expect(result[0].saken).toBe("fordran. överlämnat från KFM, 01-952487-25");
    expect(result[0].room).toBe("Sal 6");
  });

  it("handles Vänersborg entry with missing saken", () => {
    const text = [
      "to 2026-02-19 13:00 - 13:45 Huvudförhandling",
      "B 502-26",
      "Sal 2",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Vänersborgs tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].caseNumber).toBe("B 502-26");
    expect(result[0].room).toBe("Sal 2");
    expect(result[0].saken).toBe("");
  });

  it("handles Vänersborg saken with no case number on hearing line", () => {
    const text = [
      "to 2026-02-19 13:00 - 16:00 Muntlig förberedelse överflyttande av vårdnad Sal 6",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Vänersborgs tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("Muntlig förberedelse");
    expect(result[0].caseNumber).toBe("");
    expect(result[0].saken).toBe("överflyttande av vårdnad");
    expect(result[0].room).toBe("Sal 6");
  });

  it("handles Vänersborg page boundary with orphaned (dag X/Y)", () => {
    const text = [
      "on 2026-02-18 09:00 - 12:00 Huvudförhandling",
      "B 3778-24",
      "misshandel m.m. Sal 4",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Vänersborgs tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2026-02-18");
    expect(result[0].caseNumber).toBe("B 3778-24");
    expect(result[0].saken).toBe("misshandel m.m");
  });

  it("maps 'Sammantr.de' encoding artifact to Sammanträde", () => {
    const text = "2026-02-16 13:00 - 15:00 Sammantr.de Ä 4210-24 konkurs Sal 1";
    const result = formatTabular.parse({ courtName: "Vänersborgs tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("Sammanträde");
    expect(result[0].caseNumber).toBe("Ä 4210-24");
    expect(result[0].saken).toBe("konkurs");
  });

  it("recovers saken from continuation line after page header", () => {
    const text = [
      "on 2026-02-18 14:30 - 15:15 Huvudförhandling",
      "B 3336-25",
      "olovlig körning m.m. Sal 4",
      "fr 2026-02-20 13:00 - 15:30 Muntlig förberedelse",
      "FT 4572-25",
      "fordran Sal 5",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Vänersborgs tingsrätt", text });
    const b3336 = result.find(h => h.caseNumber === "B 3336-25");
    expect(b3336).toBeDefined();
    expect(b3336!.saken).toBe("olovlig körning m.m");
    expect(b3336!.room).toBe("Sal 4");

    const ft4572 = result.find(h => h.caseNumber === "FT 4572-25");
    expect(ft4572).toBeDefined();
    expect(ft4572!.saken).toBe("fordran");
  });

  it("handles separate entries cleanly across pages", () => {
    const text = [
      "må 2026-02-16 09:00 - 12:00 Huvudförhandling",
      "B 4561-24",
      "grov misshandel Sal 3",
      "ti 2026-02-17 09:00 - 16:00 Huvudförhandling",
      "B 5601-23",
      "ofredande m.m. Sal 8",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Vänersborgs tingsrätt", text });
    const b4561 = result.find(h => h.caseNumber === "B 4561-24");
    expect(b4561).toBeDefined();
    expect(b4561!.saken).toBe("grov misshandel");

    // B 5601-23 should parse correctly
    const b5601 = result.find(h => h.caseNumber === "B 5601-23");
    expect(b5601).toBeDefined();
    expect(b5601!.saken).toBe("ofredande m.m");
    expect(b5601!.room).toBe("Sal 8");
  });

  it("handles column-separated output (bare time line)", () => {
    // Column detection separates date, time, type, saken, sal into individual lines
    const text = [
      "ti",
      "2026-02-10",
      "09:00 - 16:00",
      "Huvudförhandling",
      "mordbrand, försök till mordbrand",
      "Sal 14",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Hässleholms tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2026-02-10");
    expect(result[0].time).toBe("09:00 - 16:00");
    expect(result[0].type).toBe("Huvudförhandling");
    expect(result[0].saken).toBe("mordbrand, försök till mordbrand");
    expect(result[0].room).toBe("Sal 14");
  });

  it("handles column-separated output with multiple hearings", () => {
    const text = [
      "må",
      "2026-02-09",
      "09:00 - 12:00",
      "Huvudförhandling",
      "stöld",
      "Tingssal 1",
      "må",
      "2026-02-09",
      "13:00 - 15:00",
      "Muntlig förberedelse",
      "fordran",
      "Tingssal 2",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Hässleholms tingsrätt", text });
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe("Huvudförhandling");
    expect(result[0].saken).toBe("stöld");
    expect(result[0].room).toBe("Tingssal 1");
    expect(result[1].type).toBe("Muntlig förberedelse");
    expect(result[1].saken).toBe("fordran");
    expect(result[1].room).toBe("Tingssal 2");
  });

  it("handles Hässleholm security room at external court with long saken", () => {
    // Simulates PDF text where the Sal column wraps across multiple rows
    // ("Sal 14 (säkerhetssal) Malmö tingsrätt") interleaved with a long saken.
    const text = [
      "ti 2026-02-10 09:00 - 16:00 Huvudförhandling mordbrand, försök till mordbrand, Sal 14",
      "anstiftan av mordbrand, involverande av",
      "(säkerhetssal)",
      "underårig i brottslighet, förberedelse till",
      "Malmö",
      "mordbrand, anstiftan av förberedelse till",
      "tingsrätt",
      "mordbrand, grov skadegörelse, medhjälp till",
      "grov skadegörelse, anstiftan av grov",
      "skadegörelse, medhjälp till försök till",
      "mordbrand, anstiftan av försök till",
      "mordbrand, narkotikabrott,",
      "barnpornografibrott",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Hässleholms tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].room).toBe("Sal 14 (säkerhetssal)");
    expect(result[0].location).toBe("Malmö tingsrätt");
    expect(result[0].saken).toBe(
      "mordbrand, försök till mordbrand, " +
      "anstiftan av mordbrand, involverande av " +
      "underårig i brottslighet, förberedelse till " +
      "mordbrand, anstiftan av förberedelse till " +
      "mordbrand, grov skadegörelse, medhjälp till " +
      "grov skadegörelse, anstiftan av grov " +
      "skadegörelse, medhjälp till försök till " +
      "mordbrand, anstiftan av försök till " +
      "mordbrand, narkotikabrott, " +
      "barnpornografibrott"
    );
  });

  it("handles sal-column overflow with court name on single line", () => {
    const text = [
      "on 2026-02-11 09:00 - 16:00 Huvudförhandling grovt narkotikabrott Sal 3",
      "(säkerhetssal)",
      "Kristianstads tingsrätt",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Hässleholms tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].room).toBe("Sal 3 (säkerhetssal)");
    expect(result[0].location).toBe("Kristianstads tingsrätt");
    expect(result[0].saken).toBe("grovt narkotikabrott");
  });

  it("handles merged-row security room at external court (reverted edge function)", () => {
    // With simplified row extraction, room/location fragments are merged at the
    // END of continuation lines (room column is rightmost):
    // "...involverande av (säkerhetssal)"
    // "...förberedelse till Malmö"
    // "...förberedelse till tingsrätt"
    const text = [
      "ti 2026-02-10 09:00 - 16:00 Huvudförhandling mordbrand, försök till mordbrand, Sal 14",
      "anstiftan av mordbrand, involverande av (säkerhetssal)",
      "underårig i brottslighet, förberedelse till Malmö",
      "mordbrand, anstiftan av förberedelse till tingsrätt",
      "mordbrand, grov skadegörelse",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Hässleholms tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].room).toBe("Sal 14 (säkerhetssal)");
    expect(result[0].location).toBe("Malmö tingsrätt");
    // Saken should NOT contain "Malmö" or "tingsrätt"
    expect(result[0].saken).not.toContain("Malmö");
    expect(result[0].saken).not.toContain("tingsrätt");
    expect(result[0].saken).toBe(
      "mordbrand, försök till mordbrand, " +
      "anstiftan av mordbrand, involverande av " +
      "underårig i brottslighet, förberedelse till " +
      "mordbrand, anstiftan av förberedelse till " +
      "mordbrand, grov skadegörelse"
    );
  });

  // --- Norrköping split-date tests (day on next line) ---

  it("handles Norrköping split-date where day is on the next line", () => {
    // Raw PDF text: date "2026-02-16" split as "2026 - 02 -" on line 1 and "16" on line 2
    const text = [
      "må 2026 - 02 - 09:00 - Huvudförhandling B 1795 - 25 misshandel m m Sal 3",
      "16 16:00",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Norrköpings tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2026-02-16");
    expect(result[0].time).toBe("09:00 - 16:00");
    expect(result[0].type).toBe("Huvudförhandling");
    expect(result[0].caseNumber).toBe("B 1795-25");
    expect(result[0].saken).toBe("misshandel m m");
    expect(result[0].room).toBe("Sal 3");
  });

  it("handles Norrköping split-date with time range already on first line", () => {
    // When the end time fits on the first line, the next line is just the day number
    const text = [
      "on 2026 - 02 - 11:00 - 12:00 Huvudförhandling B 4178 - 25 brott mot lagen om förbud beträffande knivar och andra farliga föremål Sal 7",
      "18",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Norrköpings tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2026-02-18");
    expect(result[0].time).toBe("11:00 - 12:00");
    expect(result[0].caseNumber).toBe("B 4178-25");
    expect(result[0].saken).toBe("brott mot lagen om förbud beträffande knivar och andra farliga föremål");
    expect(result[0].room).toBe("Sal 7");
  });

  it("handles Norrköping split-date with Sal number on second line", () => {
    // "Sal\n10" split where Sal number is on the day line
    const text = [
      "ti 2026 - 02 - 09:00 - Muntlig förberedelse T 3297 - 25 fordran Sal",
      "24 11:00 10",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Norrköpings tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2026-02-24");
    expect(result[0].time).toBe("09:00 - 11:00");
    expect(result[0].caseNumber).toBe("T 3297-25");
    expect(result[0].saken).toBe("fordran");
    expect(result[0].room).toBe("Sal 10");
  });

  it("handles Norrköping split-date with continuation text on second line", () => {
    // "och/umgänge" continues saken from the first line
    const text = [
      "må 2026 - 02 - 09:00 - Huvudförhandling T 1309 - 25 ansökan om äktenskapsskillnad med frågor om vårdnad, boende Sal 6",
      "23 12:00 och/umgänge",
      "(dag 1/2)",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Norrköpings tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2026-02-23");
    expect(result[0].time).toBe("09:00 - 12:00");
    expect(result[0].caseNumber).toBe("T 1309-25");
    expect(result[0].saken).toContain("ansökan om äktenskapsskillnad");
    expect(result[0].saken).toContain("och/umgänge");
    expect(result[0].room).toBe("Sal 6");
  });

  it("parses multiple Norrköping split-date hearings", () => {
    const text = [
      "må 2026 - 02 - 09:00 - Huvudförhandling B 1795 - 25 misshandel m m Sal 3",
      "16 16:00",
      "må 2026 - 02 - 09:00 - Huvudförhandling B 3905 - 25 misshandel m.m. Sal 4",
      "16 16:00",
      "ti 2026 - 02 - 09:00 - Huvudförhandling B 4350 - 25 grovt djurplågeri Sal 7",
      "17 11:30",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Norrköpings tingsrätt", text });
    expect(result).toHaveLength(3);
    expect(result[0].date).toBe("2026-02-16");
    expect(result[0].caseNumber).toBe("B 1795-25");
    expect(result[0].time).toBe("09:00 - 16:00");
    expect(result[1].date).toBe("2026-02-16");
    expect(result[1].caseNumber).toBe("B 3905-25");
    expect(result[2].date).toBe("2026-02-17");
    expect(result[2].caseNumber).toBe("B 4350-25");
    expect(result[2].time).toBe("09:00 - 11:30");
  });

  it("handles Norrköping split-date with FT case number split across lines", () => {
    // FT case number gets split: "FT 4434 -" on line 1, "25" on the day line
    const text = [
      "ti 2026 - 02 - 10:00 - Muntlig förberedelse FT 4434 - fordran Sal 1",
      "24 12:00 25",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Norrköpings tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2026-02-24");
    expect(result[0].time).toBe("10:00 - 12:00");
    expect(result[0].type).toBe("Muntlig förberedelse");
    expect(result[0].caseNumber).toBe("FT 4434-25");
    expect(result[0].saken).toBe("fordran");
    expect(result[0].room).toBe("Sal 1");
  });

  it("handles Norrköping split-date with FT case number and KFM text", () => {
    // Another FT case with additional text: "FT 4901 -" on line 1, "25" on day line
    const text = [
      "ti 2026 - 02 - 10:00 - Muntlig förberedelse FT 4901 - fordran (överlämnat från KFM) Sal 5",
      "24 12:00 25",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Norrköpings tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].caseNumber).toBe("FT 4901-25");
    expect(result[0].saken).toBe("fordran (överlämnat från KFM)");
    expect(result[0].room).toBe("Sal 5");
  });

  it("extracts secondary case number from split-date merge overflow (B 678-25 / B 2327-24)", () => {
    // B 2327-24 overflows from the case column onto the day line
    const text = [
      "on 2026 - 02 - 13:00 - Huvudförhandling B 678 - 25 misshandel, olaga hot, barnfridsbrott Sal 3",
      "18 16:00 B 2327 - 24",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Norrköpings tingsrätt", text });
    expect(result).toHaveLength(2);
    expect(result[0].date).toBe("2026-02-18");
    expect(result[0].time).toBe("13:00 - 16:00");
    expect(result[0].caseNumber).toBe("B 678-25");
    expect(result[0].saken).toBe("misshandel, olaga hot, barnfridsbrott");
    expect(result[0].room).toBe("Sal 3");
    expect(result[1].date).toBe("2026-02-18");
    expect(result[1].caseNumber).toBe("B 2327-24");
    expect(result[1].saken).toBe("misshandel, olaga hot, barnfridsbrott");
    expect(result[1].room).toBe("Sal 3");
  });

  it("extracts secondary case numbers from continuation lines (T 2784-25 + T 1811-25 + T 452-26)", () => {
    // Two additional case numbers: T 1811-25 overflows onto day line, T 452-26 on own line
    const text = [
      "ti 2026 - 02 - 09:00 - Huvudförhandling T 2784 - 25 överflyttande av vårdnad Sal 6",
      "17 12:00 T 1811 - 25",
      "T 452 - 26",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Norrköpings tingsrätt", text });
    expect(result).toHaveLength(3);
    expect(result[0].date).toBe("2026-02-17");
    expect(result[0].time).toBe("09:00 - 12:00");
    expect(result[0].caseNumber).toBe("T 2784-25");
    expect(result[0].saken).toBe("överflyttande av vårdnad");
    expect(result[0].room).toBe("Sal 6");
    expect(result[1].caseNumber).toBe("T 1811-25");
    expect(result[1].saken).toBe("överflyttande av vårdnad");
    expect(result[2].caseNumber).toBe("T 452-26");
    expect(result[2].saken).toBe("överflyttande av vårdnad");
  });

  it("does not skip legitimate saken words that look like city names", () => {
    // A capitalized word NOT followed by "tingsrätt" should remain in saken
    const text = [
      "ti 2026-02-10 09:00 - 12:00 Huvudförhandling stöld Sal 1",
      "Karlskrona",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Hässleholms tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].saken).toBe("stöld Karlskrona");
  });

  it("parses Solna single-line format with short dates and no room", () => {
    const currentYear = new Date().getFullYear();
    const text = [
      "Dag Datum Förhandlingstid Typ av förhandling Målnummer Saken",
      `må 23-feb 09:00 - 09:45 Huvudförhandling B 6901-25 Skadegörelse`,
      `må 23-feb 09:00 - 12:00 Muntlig förberedelse T 7487-25 Fordran (överlämnat från KFM); återvinning i mål 01-649381-24`,
      `må 23-feb 13:00 - 13:20 Edgångssmtr K 12456-25 Konkurs`,
      `må 23-feb 13:20 - 13:40 Edgångssmtr K 10465-25 Konkurs`,
      `ti 24-feb 09:00 - 09:20 Konkursförhandling K 12299-25 Ansökan om konkurs`,
      `ti 24-feb 09:00 - 16:30 Huvudförhandling B 453-25 Misshandel m m`,
      `ti 24-feb 15:00 - 16:00 Sammanträde B 807-26 Undanröjande av skyddstillsyn`,
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Solna tingsrätt", text });
    expect(result).toHaveLength(7);

    // Standard hearing
    expect(result[0].date).toBe(`${currentYear}-02-23`);
    expect(result[0].time).toBe("09:00 - 09:45");
    expect(result[0].type).toBe("Huvudförhandling");
    expect(result[0].caseNumber).toBe("B 6901-25");
    expect(result[0].saken).toBe("Skadegörelse");
    expect(result[0].room).toBe("");

    // Muntlig förberedelse with KFM reference in saken
    expect(result[1].type).toBe("Muntlig förberedelse");
    expect(result[1].caseNumber).toBe("T 7487-25");
    expect(result[1].saken).toBe("Fordran (överlämnat från KFM); återvinning i mål 01-649381-24");

    // Edgångssmtr alias → Edgångssammanträde
    expect(result[2].type).toBe("Edgångssammanträde");
    expect(result[2].caseNumber).toBe("K 12456-25");
    expect(result[2].saken).toBe("Konkurs");

    expect(result[3].type).toBe("Edgångssammanträde");
    expect(result[3].caseNumber).toBe("K 10465-25");

    // Konkursförhandling (full type name)
    expect(result[4].date).toBe(`${currentYear}-02-24`);
    expect(result[4].type).toBe("Konkursförhandling");
    expect(result[4].caseNumber).toBe("K 12299-25");
    expect(result[4].saken).toBe("Ansökan om konkurs");

    // Huvudförhandling with m m
    expect(result[5].type).toBe("Huvudförhandling");
    expect(result[5].caseNumber).toBe("B 453-25");
    expect(result[5].saken).toBe("Misshandel m m");

    // Sammanträde
    expect(result[6].type).toBe("Sammanträde");
    expect(result[6].caseNumber).toBe("B 807-26");
    expect(result[6].saken).toBe("Undanröjande av skyddstillsyn");
  });

  it("parses Sundsvall single-line format with Ä case numbers, Bevisupptagning, and Fortsatt hf", () => {
    const currentYear = new Date().getFullYear();
    const text = [
      "Dag Datum Förhandlingstid Typ av förhandling Målnr Saken",
      "må 23-feb 09:00 - 11:00 Bevisupptagning T 326-25 fordran",
      "må 23-feb 09:00 - 14:00 Huvudförhandling B 1775-22 misshandel",
      "ti 24-feb 09:00 - 09:30 Konkursförhandling K 87-26 konkurs",
      "ti 24-feb 09:00 - 16:00 Huvudförhandling B 32-26 m.fl grov stöld",
      "fr 27-feb 09:00 - 10:00 Sammanträde Ä 1839-25 anordnande av godmanskap",
      "fr 27-feb 10:00 - 11:00 Fortsatt hf B 2324-24 stöld m m",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Sundsvalls tingsrätt", text });
    expect(result).toHaveLength(6);

    // Bevisupptagning hearing type
    expect(result[0].date).toBe(`${currentYear}-02-23`);
    expect(result[0].type).toBe("Bevisupptagning");
    expect(result[0].caseNumber).toBe("T 326-25");
    expect(result[0].saken).toBe("fordran");

    expect(result[1].type).toBe("Huvudförhandling");
    expect(result[1].caseNumber).toBe("B 1775-22");

    // Konkursförhandling
    expect(result[2].date).toBe(`${currentYear}-02-24`);
    expect(result[2].type).toBe("Konkursförhandling");
    expect(result[2].caseNumber).toBe("K 87-26");

    // "m.fl" in saken (med flera — multiple defendants)
    expect(result[3].caseNumber).toBe("B 32-26");
    expect(result[3].saken).toBe("m.fl grov stöld");

    // Ä case number — requires non-ASCII word boundary fix
    expect(result[4].date).toBe(`${currentYear}-02-27`);
    expect(result[4].type).toBe("Sammanträde");
    expect(result[4].caseNumber).toBe("Ä 1839-25");
    expect(result[4].saken).toBe("anordnande av godmanskap");

    // Fortsatt hf → Huvudförhandling
    expect(result[5].type).toBe("Huvudförhandling");
    expect(result[5].caseNumber).toBe("B 2324-24");
    expect(result[5].saken).toBe("stöld m m");
  });

  it("parses M and F case number prefixes (miljömål, fastighetsmål)", () => {
    const text = [
      "ti 2026-02-24 09:00 - 16:00 Huvudförhandling M 1339-24 Skadestånd enligt 32 kap. miljöbalken Sal 8",
      "on 2026-02-25 10:00 - 16:00 Huvudförhandling F 4281-22 tomträttsavgäld Sal 2",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Vänersborgs tingsrätt", text });
    expect(result).toHaveLength(2);

    expect(result[0].caseNumber).toBe("M 1339-24");
    expect(result[0].saken).toBe("Skadestånd enligt 32 kap. miljöbalken");
    expect(result[0].room).toBe("Sal 8");

    expect(result[1].caseNumber).toBe("F 4281-22");
    expect(result[1].saken).toBe("tomträttsavgäld");
    expect(result[1].room).toBe("Sal 2");
  });

  it("parses 'Huvudförhandling, forts.' type alias", () => {
    const text = [
      "to 2026-02-26 09:00 - 16:00 Huvudförhandling, forts. T 4499-24 fastställelsetalan Sal 3",
      "to 2026-02-26 09:00 - 16:00 Huvudförhandling, forts. B 122-26 stöld m.m Sal 1",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Vänersborgs tingsrätt", text });
    expect(result).toHaveLength(2);

    expect(result[0].type).toBe("Huvudförhandling");
    expect(result[0].caseNumber).toBe("T 4499-24");
    expect(result[0].saken).toBe("fastställelsetalan");
    expect(result[0].room).toBe("Sal 3");

    expect(result[1].type).toBe("Huvudförhandling");
    expect(result[1].caseNumber).toBe("B 122-26");
    expect(result[1].saken).toBe("stöld m.m");
  });

  it("strips 'och' before case number in type overflow (Muntlig förberedelse och FT ...)", () => {
    const text = [
      "fr 2026-02-20 09:30 - 12:00 Muntlig förberedelse och FT 5275-25 fordran Sal 6",
      "ev hf",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Vänersborgs tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("Muntlig förberedelse");
    expect(result[0].caseNumber).toBe("FT 5275-25");
    expect(result[0].saken).toBe("fordran ev hf");
    expect(result[0].room).toBe("Sal 6");
  });

  it("skips phantom merged lines from multi-page PDF frozen rows (Uddevalla)", () => {
    const text = [
      "Dag Datum Förhandlingstid Typ av förhandling Målnummer Saken Sal",
      "må 2026-02-16 09:00 - 09:30 Konkursförhandling K 3847-25 ansökan om konkurs Sal 8",
      // Phantom merged line: frozen row from page 1 + first row of page 2
      "må on 2026-02-16 2026-02-18 09:00 - 09:30 09:00 - 14:00 Konkursförhandling Huvudförhandling K 3847-25 B 1631-25 ansökan om konkurs grovt bokföringsbrott m m Sal 8 Sal 3",
      "on 2026-02-18 10:30 - 11:15 Huvudförhandling B 3404-25 försök till sabotage Sal 2",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Uddevalla tingsrätt", text });
    // Phantom line should be skipped; only real hearings remain
    expect(result).toHaveLength(2);
    expect(result[0].caseNumber).toBe("K 3847-25");
    expect(result[0].saken).toBe("ansökan om konkurs");
    expect(result[1].caseNumber).toBe("B 3404-25");
    expect(result[1].saken).toBe("försök till sabotage");
    // No hearing should have time ranges in saken
    for (const h of result) {
      expect(h.saken).not.toMatch(/\d{2}:\d{2}/);
    }
  });

  it("handles case numbers wrapping across lines (B 1852-25, B + 3694-24)", () => {
    const text = [
      "on 2026-02-18 (dag 4/4) 09:00 - 16:00 Huvudförhandling B 1852-25, B grovt narkotikabrott m m Sal 1",
      "3694-24",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Uddevalla tingsrätt", text });
    expect(result).toHaveLength(2);
    expect(result[0].caseNumber).toBe("B 1852-25");
    expect(result[0].saken).toBe("grovt narkotikabrott m m");
    expect(result[0].room).toBe("Sal 1");
    expect(result[1].caseNumber).toBe("B 3694-24");
    expect(result[1].saken).toBe("grovt narkotikabrott m m");
    expect(result[1].room).toBe("Sal 1");
  });

  it("handles case numbers wrapping across lines with saken continuation (T 1887-25, Ä + 1005-25)", () => {
    const text = [
      "on 2026-02-18 09:00 - 16:00 Huvudförhandling T 1887-25, Ä överflyttning av vårdnaden enligt 6 kap Sal 5",
      "8 § föräldrabalken",
      "1005-25",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Uddevalla tingsrätt", text });
    expect(result).toHaveLength(2);
    expect(result[0].caseNumber).toBe("T 1887-25");
    expect(result[0].saken).toBe("överflyttning av vårdnaden enligt 6 kap 8 § föräldrabalken");
    expect(result[1].caseNumber).toBe("Ä 1005-25");
    expect(result[1].saken).toBe("överflyttning av vårdnaden enligt 6 kap 8 § föräldrabalken");
  });

  // --- Värmland multi-case tests ---

  it("handles Värmland multi-case with (dag X/Y) on same line as case number", () => {
    const text = [
      "må 2026-02-23 09:30 - 16:30 Huvudförhandling B 1861-25 synnerligen grovt",
      "(dag 8/28) B 1053-23 narkotikabrott m.m",
      "B 2367-25",
      "B 4936-25",
      "må 2026-02-23 10:30 - 11:30 Huvudförhandling B 80-26 skadegörelse",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Värmlands tingsrätt", text });

    // First hearing should produce 4 case numbers
    const first = result.filter(h => h.time === "09:30 - 16:30");
    expect(first).toHaveLength(4);
    expect(first.map(h => h.caseNumber)).toContain("B 1861-25");
    expect(first.map(h => h.caseNumber)).toContain("B 1053-23");
    expect(first.map(h => h.caseNumber)).toContain("B 2367-25");
    expect(first.map(h => h.caseNumber)).toContain("B 4936-25");

    // Saken should NOT contain case numbers
    for (const h of first) {
      expect(h.saken).not.toMatch(/[BTKMFÄ]\s?\d{1,6}[-–]\d{2}/);
    }

    // Second hearing
    const second = result.find(h => h.caseNumber === "B 80-26");
    expect(second).toBeDefined();
    expect(second!.saken).toBe("skadegörelse");
  });

  it("strips embedded case numbers from saken when all on one line", () => {
    // Simulates unpdf merging all columns into a single line
    const text = [
      "må 2026-02-23 09:30 - 16:30 Huvudförhandling B 1861-25 synnerligen grovt B 1053-23 narkotikabrott m.m B 2367-25",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Värmlands tingsrätt", text });

    expect(result.length).toBeGreaterThanOrEqual(1);

    // All case numbers should be extracted
    const caseNums = result.map(h => h.caseNumber);
    expect(caseNums).toContain("B 1861-25");
    expect(caseNums).toContain("B 1053-23");
    expect(caseNums).toContain("B 2367-25");

    // Saken should not contain any case numbers
    for (const h of result) {
      expect(h.saken).not.toMatch(/[BTKMFÄ]\s?\d{1,6}[-–]\d{2}/);
    }
    // Saken should contain the description text
    expect(result[0].saken).toContain("synnerligen grovt");
    expect(result[0].saken).toContain("narkotikabrott");
  });

  it("handles Värmland continuation case numbers without (dag) annotation", () => {
    const text = [
      "to 2026-02-26 09:30 - 10:00 Huvudförhandling B 457-26 ringa narkotikabrott",
      "B 5577-25",
      "B 5688-25",
      "to 2026-02-26 09:45 - 10:30 Huvudförhandling B 326-26 våldsamt motstånd",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Värmlands tingsrätt", text });

    const first = result.filter(h => h.time === "09:30 - 10:00");
    expect(first).toHaveLength(3);
    expect(first.map(h => h.caseNumber)).toEqual(["B 457-26", "B 5577-25", "B 5688-25"]);
    expect(first[0].saken).toBe("ringa narkotikabrott");

    const second = result.find(h => h.caseNumber === "B 326-26");
    expect(second).toBeDefined();
    expect(second!.saken).toBe("våldsamt motstånd");
  });

  it("handles Värmland hearing type wrapping across lines (Konkursförhandling)", () => {
    // When "Konkursförhandling" wraps mid-word (Konkursförhandlin + g), the
    // truncated type won't be recognized. This test verifies the parser doesn't
    // crash and still extracts the case number and saken.
    const text = [
      "ti 2026-02-24 09:00 - 09:15 Konkursförhandlin K 6180-25 ansökan om konkurs",
      "g",
      "ti 2026-02-24 09:00 - 09:45 Huvudförhandling B 3577-25 hot mot tjänsteman",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Värmlands tingsrätt", text });
    expect(result.length).toBeGreaterThanOrEqual(2);

    const konkurs = result.find(h => h.caseNumber === "K 6180-25");
    expect(konkurs).toBeDefined();
    expect(konkurs!.saken).toContain("ansökan om konkurs");

    const hot = result.find(h => h.caseNumber === "B 3577-25");
    expect(hot).toBeDefined();
    expect(hot!.saken).toBe("hot mot tjänsteman");
  });

  it("parses Växjö tingsrätt with SESSIONSSAL rooms", () => {
    const text = [
      "Förhandlingar Allmänna domstolen vid Växjö tingsrätt, listan skapades 2026-02-19",
      "Dag Datum Förhandlingstid Typ av förhandling Saken Sal",
      "må 23-feb 09:00 - 09:30 Konkursförhandling ansökan om konkurs SESSIONSSAL 2",
      "må 23-feb 09:00 - 10:30 Muntlig förberedelse hyra SESSIONSSAL 3",
      "må 23-feb 09:00 - 16:00 Huvudförhandling grov fridskränkning m.m. SESSIONSSAL 5",
      "ti 24-feb 09:00 - 12:30 Huvudförhandling bedrägeri m.m. SESSIONSSAL 4",
      "on 25-feb 15:30 - 16:00 Huvudförhandling brott mot lagen om förbud beträffande knivar och andra farliga föremål SESSIONSSAL 5",
      "to 26-feb 15:00 - 16:00 Sammanträde undanröjande av ungdomsvård och ungdomstjänst SESSIONSSAL 4",
      "fr 27-feb 10:15 - 11:00 Huvudförhandling brott mot lagen om förbud beträffande knivar och andra farliga föremål, grovt brott SESSIONSSAL 1",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Växjö tingsrätt", text });
    expect(result.length).toBe(7);

    const konkurs = result.find(h => h.type === "Konkursförhandling");
    expect(konkurs).toBeDefined();
    expect(konkurs!.date).toBe("2026-02-23");
    expect(konkurs!.time).toBe("09:00 - 09:30");
    expect(konkurs!.saken).toBe("ansökan om konkurs");
    expect(konkurs!.room).toBe("Sessionssal 2");

    const hyra = result.find(h => h.saken === "hyra");
    expect(hyra).toBeDefined();
    expect(hyra!.type).toBe("Muntlig förberedelse");
    expect(hyra!.room).toBe("Sessionssal 3");

    const bedrägeri = result.find(h => h.saken?.startsWith("bedrägeri"));
    expect(bedrägeri).toBeDefined();
    expect(bedrägeri!.date).toBe("2026-02-24");
    expect(bedrägeri!.room).toBe("Sessionssal 4");

    const kniv = result.find(h => h.date === "2026-02-25");
    expect(kniv).toBeDefined();
    expect(kniv!.saken).toContain("brott mot lagen om förbud beträffande knivar");
    expect(kniv!.room).toBe("Sessionssal 5");

    // All rooms should use "Sessionssal" prefix
    for (const h of result) {
      expect(h.room).toMatch(/^Sessionssal \d+$/);
    }
  });

  it("parses Ångermanland with location in Sal field (Härnösand / Örnsköldsvik)", () => {
    const text = [
      "Förhandlingar Ångermanlands tingsrätt, listan skapades 2026-02-23",
      "Dag Datum Förhandlingstid Typ av förhandling Målnr Saken Sal",
      "må 23-feb 09:00 - 10:00 Huvudförhandling B 156-26 grovt rattfylleri Sal 2, Härnösand",
      "må 23-feb 09:00 - 10:30 Fortsatt muntlig förb T 510-25 vårdnad m.m. Sal 4, Härnösand",
      "ti 24-feb 10:30 - 12:00 Huvudförhandling B 2284-25 misshandel Tingsrättens sal 1, Örnsköldsvik",
      "ti 24-feb 13:00 - 16:30 Huvudförhandling B 2426-24 falsk angivelse Tingsrättens sal 1, Örnsköldsvik",
      "on 25-feb 09:00 - 16:00 Huvudförhandling B 2794-25 misshandel m.m. Sal 3, Härnösand",
      "to 26-feb 09:00 - 09:30 Konkursförhandling K 414-26 ansökan om konkurs Sal 4, Härnösand",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Ångermanlands tingsrätt", text });
    expect(result.length).toBe(6);

    // Härnösand entries
    const rattfylleri = result.find(h => h.caseNumber === "B 156-26");
    expect(rattfylleri).toBeDefined();
    expect(rattfylleri!.date).toBe("2026-02-23");
    expect(rattfylleri!.saken).toBe("grovt rattfylleri");
    expect(rattfylleri!.room).toBe("Sal 2");
    expect(rattfylleri!.location).toBe("Härnösand");

    // Fortsatt muntlig förb → Muntlig förberedelse
    const vardnad = result.find(h => h.caseNumber === "T 510-25");
    expect(vardnad).toBeDefined();
    expect(vardnad!.type).toBe("Muntlig förberedelse");
    expect(vardnad!.room).toBe("Sal 4");
    expect(vardnad!.location).toBe("Härnösand");

    // Örnsköldsvik entries — "Tingsrättens sal 1" → "Sal 1"
    const misshandel = result.find(h => h.caseNumber === "B 2284-25");
    expect(misshandel).toBeDefined();
    expect(misshandel!.date).toBe("2026-02-24");
    expect(misshandel!.saken).toBe("misshandel");
    expect(misshandel!.room).toBe("Sal 1");
    expect(misshandel!.location).toBe("Örnsköldsvik");

    const falsk = result.find(h => h.caseNumber === "B 2426-24");
    expect(falsk).toBeDefined();
    expect(falsk!.room).toBe("Sal 1");
    expect(falsk!.location).toBe("Örnsköldsvik");

    // Konkurs
    const konkurs = result.find(h => h.caseNumber === "K 414-26");
    expect(konkurs).toBeDefined();
    expect(konkurs!.type).toBe("Konkursförhandling");
    expect(konkurs!.saken).toBe("ansökan om konkurs");
    expect(konkurs!.room).toBe("Sal 4");
    expect(konkurs!.location).toBe("Härnösand");
  });

  it("parses Örebro tingsrätt format with header, (dag X/Y), multi-case, and all hearing types", () => {
    const text = [
      "Datum             Tid             Mötestyp                   Målnummer       Saken                                                Lokal",
      "",
      "må 2026-02-23     09:00 - 09:30   Konkursförhandling            K 8331-25     ansökan om konkurs                                    Sal 7",
      "må 2026-02-23     09:00 - 16:00   Huvudförhandling              B 6055-24     allmänfarlig ödeläggelse m.m.                         Sal 2",
      "   (dag 6/7)",
      "må 2026-02-23     10:00 - 10:30   Edgångssmtr                   K 6172-25     konkurs                                               Sal 7",
      "må 2026-02-23     15:00 - 15:30   Häktningsförhandling          B 422-26      narkotika m.m.                                        Sal 10",
      "ti   2026-02-24   09:00 - 10:00   Muntlig förberedelse och ev hf T 8089-25    fastställande av faderskap                            Sal 12",
      "ti   2026-02-24   09:00 - 11:00   Muntlig förberedelse    T 8932-25     vårdnad, boende och/eller umgänge                                                  Sal 16",
      "ti   2026-02-24   13:00 - 14:00   Fortsatt hf             B 7971-25    misshandel m m                                                                  Sal 9",
      "to   2026-02-26   09:30 - 10:30   Borgenärssammanträde    Ä 991-26     företagsrekonstruktion        Sal 7",
      "to   2026-02-26   14:30 - 15:00   Huvudförhandling        B 872-26      ringa stöld                                                                      Sal 15",
      "                                                          B 1697-22",
      "                                                          B 6537-24",
      "to   2026-02-26   15:00 - 16:00   Huvudförhandling        B 8742-25     grovt brott mot lagen om förbud beträffande knivar och andra farliga föremål     Sal 1",
      "                                                          B 7687-25",
      "fr   2026-02-27   09:00 - 12:00   Huvudförhandling        B 998-25      misshandel                         Sal 16",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Örebro tingsrätt", text });

    // Konkursförhandling
    const konkurs = result.find(h => h.caseNumber === "K 8331-25");
    expect(konkurs).toBeDefined();
    expect(konkurs!.date).toBe("2026-02-23");
    expect(konkurs!.type).toBe("Konkursförhandling");
    expect(konkurs!.saken).toBe("ansökan om konkurs");
    expect(konkurs!.room).toBe("Sal 7");

    // Huvudförhandling with (dag X/Y)
    const allmanfarlig = result.find(h => h.caseNumber === "B 6055-24");
    expect(allmanfarlig).toBeDefined();
    expect(allmanfarlig!.type).toBe("Huvudförhandling");
    expect(allmanfarlig!.saken).toBe("allmänfarlig ödeläggelse m.m");
    expect(allmanfarlig!.room).toBe("Sal 2");

    // Edgångssmtr → Edgångssammanträde
    const edgang = result.find(h => h.caseNumber === "K 6172-25");
    expect(edgang).toBeDefined();
    expect(edgang!.type).toBe("Edgångssammanträde");

    // Häktningsförhandling
    const haktning = result.find(h => h.caseNumber === "B 422-26");
    expect(haktning).toBeDefined();
    expect(haktning!.type).toBe("Häktningsförhandling");
    expect(haktning!.saken).toBe("narkotika m.m");

    // Muntlig förberedelse och ev hf → Muntlig förberedelse
    const faderskap = result.find(h => h.caseNumber === "T 8089-25");
    expect(faderskap).toBeDefined();
    expect(faderskap!.type).toBe("Muntlig förberedelse");
    expect(faderskap!.saken).toBe("fastställande av faderskap");
    expect(faderskap!.room).toBe("Sal 12");

    // Continued saken with "och/eller"
    const vardnad = result.find(h => h.caseNumber === "T 8932-25");
    expect(vardnad).toBeDefined();
    expect(vardnad!.saken).toBe("vårdnad, boende och/eller umgänge");

    // Fortsatt hf → Huvudförhandling
    const fortsatt = result.find(h => h.caseNumber === "B 7971-25");
    expect(fortsatt).toBeDefined();
    expect(fortsatt!.type).toBe("Huvudförhandling");
    expect(fortsatt!.saken).toBe("misshandel m m");

    // Borgenärssammanträde with Ä case number
    const borgenar = result.find(h => h.caseNumber === "Ä 991-26");
    expect(borgenar).toBeDefined();
    expect(borgenar!.type).toBe("Borgenärssammanträde");
    expect(borgenar!.saken).toBe("företagsrekonstruktion");

    // Multi-case: B 872-26 + B 1697-22 + B 6537-24
    const stold = result.filter(h => h.saken === "ringa stöld" && h.date === "2026-02-26" && h.time === "14:30 - 15:00");
    expect(stold).toHaveLength(3);
    const stoldCases = stold.map(h => h.caseNumber).sort();
    expect(stoldCases).toEqual(["B 1697-22", "B 6537-24", "B 872-26"]);

    // Multi-case: B 8742-25 + B 7687-25
    const knivar = result.filter(h => h.saken.includes("knivar"));
    expect(knivar).toHaveLength(2);
    const knivarCases = knivar.map(h => h.caseNumber).sort();
    expect(knivarCases).toEqual(["B 7687-25", "B 8742-25"]);

    // Friday entry
    const friday = result.find(h => h.caseNumber === "B 998-25");
    expect(friday).toBeDefined();
    expect(friday!.date).toBe("2026-02-27");
    expect(friday!.saken).toBe("misshandel");
    expect(friday!.room).toBe("Sal 16");
  });
});
