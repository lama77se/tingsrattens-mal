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

  it("handles multi-line entries with (dag X/Y)", () => {
    const text = [
      "må 2026-02-09",
      "(dag 2/2)",
      "09:00 - 12:00Huvudförhandling överflyttande av vårdnad om barn Tingssal 2",
      "må 2026-02-09",
      "(dag 2/3)",
      "09:00 - 16:00Huvudförhandling våldtäkt Tingssal 1",
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
      "ti 2026-02-1009:00 - 12:00Huvudförhandling näringspenningtvätt Tingssal 1",
      "ti 2026-02-10",
      "(dag 1/2)",
      "09:00 - 12:00Huvudförhandling boende och umgänge Tingssal 2",
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
      "fr 2026-02-1313:00 - 14:30Muntlig förberedelse och ev",
      "hf",
      "fordran (återvinning av mål FT 1065-25)Tingssal 3",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Hässleholms tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("Muntlig förberedelse");
    expect(result[0].saken).toBe("fordran (återvinning av mål FT 1065-25)");
    expect(result[0].room).toBe("Tingssal 3");
  });

  it("skips page headers in continuation", () => {
    const text = [
      "on 2026-02-1115:00 - 15:45Huvudförhandling stöld Tingssal 1",
      "Uppropslista Hässleholms tingsrätt V.07",
      "to 2026-02-1209:00 - 11:00Huvudförhandling hot mot tjänsteman Tingssal 1",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Hässleholms tingsrätt", text });
    expect(result).toHaveLength(2);
    expect(result[0].saken).toBe("stöld");
    expect(result[1].saken).toBe("hot mot tjänsteman");
  });

  it("strips inline (dag X/Y) from hearing type (Jönköping-style)", () => {
    const text = [
      "ti2026-02-17  09:00 - 16:15   Huvudförhandling (dag 1/2)inbrottsstöld m.mSal 12",
      "on2026-02-18  09:00 - 12:00   Huvudförhandling (dag 2/2)inbrottsstöld m.mSal 12",
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
    const text = "to2026-02-19  13:00 - 16:00   BorgenärssammanträdeföretagsrekonstruktionSal 5";
    const result = formatTabular.parse({ courtName: "Jönköpings tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("Borgenärssammanträde");
    expect(result[0].saken).toBe("företagsrekonstruktion");
    expect(result[0].room).toBe("Sal 5");
  });

  it("parses Jönköping-style glued single-line entries", () => {
    const text = [
      "må2026-02-16  09:00 - 09:45   Huvudförhandlingringa narkotikabrottSal 4",
      "må2026-02-16  09:00 - 10:15   Huvudförhandlinggrovt rattfylleri m mSal 7",
      "ti2026-02-17  09:00 - 12:00   Fortsatt hfmisshandel mm.Sal 6",
      "ti2026-02-17  13:15 - 16:00   Huvudförhandlingolovligt innehav och försäljning av alkoholSal 11",
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
    const text = "ti2026-02-17  09:00 - 10:00   EdgångssmtrkonkursSal 3";
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
      "(dag 1/2)",
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
    const text = "ti2026-02-0313:00 - 15:00Hf i förenklad formFT 8641-25FordranSal 16";
    const result = formatTabular.parse({ courtName: "Nacka tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("Huvudförhandling");
    expect(result[0].caseNumber).toBe("FT 8641-25");
    expect(result[0].saken).toBe("Fordran");
    expect(result[0].room).toBe("Sal 16");
  });

  it("maps 'Förlikningssmtr' to Förlikningssammanträde (Nacka)", () => {
    const text = "on2026-02-1813:00 - 13:30FörlikningssmtrK 2295-25KonkursSal 17";
    const result = formatTabular.parse({ courtName: "Nacka tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("Förlikningssammanträde");
    expect(result[0].caseNumber).toBe("K 2295-25");
    expect(result[0].saken).toBe("Konkurs");
    expect(result[0].room).toBe("Sal 17");
  });

  it("parses Nacka-style fully glued entries with all case types", () => {
    const text = [
      "DagDatum Tid Mötestyp Målnummer Saken Lokal",
      "må2026-02-1609:00 - 11:30HuvudförhandlingB 10321-25StöldSal 5",
      "ti2026-02-1712:00 - 15:00Muntlig förberedelseT 9941-25FordranSal 17",
      "on2026-02-1809:00 - 09:20KonkursförhandlingK 355-26Ansökan om konkursSal 15",
      "to2026-02-1909:00 - 11:00Fortsatt muntlig förbT 1214-25Ansökan om äktenskapsskillnad med frågor om umgängeSal 16",
      "fr2026-02-2009:00 - 11:00Muntlig förberedelse och ev hfFT 6045-25TrafikförsäkringSal 15",
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
    const text = "ti2026-02-0309:00 - 11:00SammanträdeÄ 84-26Utmätning av lös egendomSal 15";
    const result = formatTabular.parse({ courtName: "Nacka tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].caseNumber).toBe("Ä 84-26");
    expect(result[0].type).toBe("Sammanträde");
    expect(result[0].saken).toBe("Utmätning av lös egendom");
  });

  it("handles Norrköping (dag X/Y) between date and time", () => {
    const text = [
      "må 2026-02-16 (dag 1/2)    09:00 - 16:00    Huvudförhandling    B 3905-25    misshandel m.m.    Sal 4",
      "ti 2026-02-17 (dag 2/2)    09:00 - 16:00    Huvudförhandling    B 3905-25    misshandel m.m.    Sal 4",
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
    const text = "ti 2026-02-17    09:00 - 12:00    Huvudförhandling    T 2784-25 T 1811-25 T 452-26    överflyttande av vårdnad    Sal 6";
    const result = formatTabular.parse({ courtName: "Norrköpings tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].caseNumber).toBe("T 2784-25, T 1811-25, T 452-26");
    expect(result[0].saken).toBe("överflyttande av vårdnad");
    expect(result[0].room).toBe("Sal 6");
  });

  it("parses Bevisupptagning hearing type", () => {
    const text = "må 2026-02-09  10:00 - 10:30  Bevisupptagning        B 4086-25   djurplågeri                                     Sal 3";
    const result = formatTabular.parse({ courtName: "Norrköpings tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("Bevisupptagning");
    expect(result[0].caseNumber).toBe("B 4086-25");
    expect(result[0].saken).toBe("djurplågeri");
  });

  it("handles room number split across page boundary", () => {
    const text = [
      "må 2026-02-09  10:20 - 10:40  Edgångssmtr            K 3637-25   ansökan om konkurs                              Sal",
      "10",
      "må 2026-02-09  10:40 - 11:00  Edgångssmtr            K 4787-25   konkurs                                         Sal 10",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Norrköpings tingsrätt", text });
    expect(result).toHaveLength(2);
    expect(result[0].saken).toBe("ansökan om konkurs");
    expect(result[0].room).toBe("Sal 10");
    expect(result[1].saken).toBe("konkurs");
    expect(result[1].room).toBe("Sal 10");
  });

  it("parses Norrköping full week with mixed types", () => {
    const text = [
      "må 2026-02-09  09:00 - 12:00  Huvudförhandling       B 1975-25   talan om självständigt förverkande              Sal 6",
      "må 2026-02-09  10:00 - 10:20  Edgångssmtr            K 4290-25   konkurs                                         Sal 10",
      "ti 2026-02-10  10:00 - 12:00  Muntlig förberedelse   FT 4966-25  fordran (överlämnat från KFM)                   Sal 1",
      "on 2026-02-11  09:00 - 16:00  Huvudförhandling (dag 1/2)  B 3604-25   olaga förföljelse, olaga hot               Sal 8",
      "fr 2026-02-13  13:00 - 14:00  Fortsatt hf            B 457-25    skadegörelse m m                                Sal 3",
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

  it("splits concatenated hearings at page boundaries", () => {
    const text = "må 2026-02-16 09:00 - 16:00 Huvudförhandling B 1795-25 misshandel m m Sal 3 to 2026-02-19 09:00 - 09:45 Huvudförhandling B 199-26 ringa stöld Sal 6";
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
    expect(result).toHaveLength(1);
    expect(result[0].caseNumber).toBe("T 2784-25, T 1811-25, T 452-26");
    expect(result[0].saken).toBe("överflyttande av vårdnad");
    expect(result[0].room).toBe("Sal 6");
  });

  it("handles multi-hearing page boundary with continuation saken", () => {
    const text = [
      "to 2026-02-12 08:00 - 09:00 Huvudförhandling B 4536-25",
      "häleri Sal 7 to 2026-02-12 09:00 - 09:30 Huvudförhandling B 5119-25 brott mot lagen om förbud beträffande knivar och andra farliga föremål Sal 3 to 2026-02-12 09:00 - 10:30 Huvudförhandling B 4227-25 olaga hot Sal 6",
    ].join("\n");
    const result = formatTabular.parse({ courtName: "Norrköpings tingsrätt", text });
    // First hearing picks up "häleri" via continuation, then 2 split hearings = 3 total
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

  it("parses field-per-line PDF output (Norrköping bi-weekly)", () => {
    const text = [
      "må 2026-02-",
      "16",
      "09:00 -",
      "16:00",
      "Huvudförhandling B 1795-25",
      "",
      " misshandel m m Sal 3",
      "må 2026-02-",
      "16",
      "(dag 1/2)",
      "09:00 -",
      "16:00",
      "Huvudförhandling B 3905-25",
      "",
      " misshandel m.m. Sal 4",
      "ti 2026-02-",
      "17",
      "09:00 -",
      "12:00",
      "Huvudförhandling T 2784-25",
      "T 1811-25",
      "T 452-26",
      " överflyttande av vårdnad Sal 6",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Norrköpings tingsrätt", text });
    expect(result).toHaveLength(3);
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
    expect(result[2].caseNumber).toBe("T 2784-25, T 1811-25, T 452-26");
    expect(result[2].saken).toBe("överflyttande av vårdnad");
    expect(result[2].room).toBe("Sal 6");
  });

  it("skips Kristianstad-style headers in continuation", () => {
    const text = [
      "on2026-02-18  13:00 - 15:00   Huvudförhandlingmisshandel Sal 2",
      "Förhandlingar i Kristianstads tingsrätt 2026-02-16 --28",
      "Listan är preliminär. Förhandlingar kan ställas in med kort varsel.",
      "DagDatumFörhandlingstidTyp av förhandlingSakenSal",
      "to2026-02-19  09:00 - 12:00   HuvudförhandlingstöldSal 1",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Kristianstads tingsrätt", text });
    expect(result).toHaveLength(2);
    expect(result[0].saken).toBe("misshandel");
    expect(result[1].saken).toBe("stöld");
  });

  it("splits Norrköping same-day concatenated hearings with repeated day+date", () => {
    const text = [
      "ti 2026-02-10 09:00 - 10:00 Konkursförhandling K 5555-25 konkurs Sal 1 ti 2026-02-10 09:00 - 10:00 Huvudförhandling B 2752-25 ofredande Sal 5 ti 2026-02-10 09:00 - 10:00 Huvudförhandling B 3734-25 misshandel, ringa brott Sal 3 ti 2026-02-10 09:00 - 16:00 Huvudförhandling T 3996-24 vårdnad Sal 4 ti 2026-02-10 09:00 - 16:00 Huvudförhandling T 3776-25 vårdnad Sal 2",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Norrköpings tingsrätt", text });
    expect(result.length).toBe(5);
    expect(result[0].saken).toBe("konkurs");
    expect(result[1].saken).toBe("ofredande");
    expect(result[2].saken).toContain("misshandel");
    expect(result[3].saken).toBe("vårdnad");
    expect(result[4].saken).toBe("vårdnad");
  });

  it("reconstructs field-per-line hearings when Phase 1 joins day+date+time onto one line", () => {
    // Exact raw text structure from Norrköping week 7 PDF:
    // Phase 1 joins "ti 2026-02-10 09:00 -" + "10:00" into one line with date+time
    // but hearing type and saken are on subsequent lines.
    // Phase 2 must buffer (not push directly) to accumulate those fields.
    const text = [
      "må 2026-02-",
      "09",
      "10:40 - 11:00 Edgångssmtr K 4787-25",
      "",
      " konkurs Sal",
      "10",
      "ti 2026-02-10 09:00 -",
      "10:00",
      "Huvudförhandling B 2752-25",
      "",
      " ofredande Sal 3",
      "ti 2026-02-10 09:00 -",
      "10:00",
      "Huvudförhandling B 3734-25",
      "",
      " misshandel, ringa brott Sal 7",
      "ti 2026-02-10 09:00 -",
      "16:00",
      "Huvudförhandling T 3996-24",
      "",
      " vårdnad Sal 8",
      "ti 2026-02-10 09:00 -",
      "16:00",
      "Huvudförhandling T 3776-25",
      "",
      " vårdnad Sal 9",
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

  it("reconstructs cross-day transition from field-per-line to joined format", () => {
    // Tests the Wednesday→Thursday transition from the actual Norrköping PDF
    // where on 2026-02-11 entries are field-per-line and to 2026-02-12 entries
    // have day+date joined with time by Phase 1.
    const text = [
      "on 2026-02-11 15:30 - 16:00 Huvudförhandling B 3948-25",
      "",
      " häleri Sal 3",
      "to 2026-02-12 09:00 -",
      "09:30",
      "Huvudförhandling B 5119-25",
      "",
      " brott mot lagen om förbud beträffande knivar och andra farliga föremål Sal 9",
      "to 2026-02-12 09:00 -",
      "10:30",
      "Huvudförhandling B 4227-25",
      "",
      " olaga hot Sal 3",
      "to 2026-02-12 09:00 -",
      "12:00",
      "Fortsatt muntlig",
      "förb",
      "T 5125-24",
      "",
      " vårdnad Sal 1",
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

  it("parses Nyköping-style with Tingssal rooms and split room numbers", () => {
    const text = [
      "må 2026-02-09 09:00 - 10:30 Huvudförhandling B 4819-25",
      "",
      "ringa stöld Tingssal",
      "5",
      "må 2026-02-09 10:00 - 12:00 Förlikningssmtr K 1470-25",
      "",
      "ansökan om konkurs Tingssal",
      "6",
      "må 2026-02-09 13:00 - 14:00 Fortsatt hf B 4165-25",
      "B 4675-25",
      "misshandel Tingssal",
      "1",
      "Dag Datum Tid Mötestyp Målnummer Saken Lokal",
      "ti 2026-02-10 10:00 - 12:00 Muntlig förberedelse FT 4566-25",
      "",
      "fordran Tingssal",
      "6",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Nyköpings tingsrätt", text });
    expect(result).toHaveLength(4);

    expect(result[0].caseNumber).toBe("B 4819-25");
    expect(result[0].type).toBe("Huvudförhandling");
    expect(result[0].saken).toBe("ringa stöld");
    expect(result[0].room).toBe("Tingssal 5");

    expect(result[1].caseNumber).toBe("K 1470-25");
    expect(result[1].type).toBe("Förlikningssammanträde");
    expect(result[1].saken).toBe("ansökan om konkurs");
    expect(result[1].room).toBe("Tingssal 6");

    expect(result[2].caseNumber).toBe("B 4165-25, B 4675-25");
    expect(result[2].type).toBe("Huvudförhandling");
    expect(result[2].saken).toBe("misshandel");
    expect(result[2].room).toBe("Tingssal 1");

    expect(result[3].caseNumber).toBe("FT 4566-25");
    expect(result[3].type).toBe("Muntlig förberedelse");
    expect(result[3].saken).toBe("fordran");
    expect(result[3].room).toBe("Tingssal 6");
  });

  it("parses Skaraborgs glued single-line format with all hearing types", () => {
    // Actual pdf-parse output from Skaraborgs tingsrätt — fields glued together,
    // single-line entries, header without spaces, (dag X/Y) on separate lines,
    // and "Muntlig förhandling" as a distinct type.
    const text = [
      "DagDatumTidTypMålnummerSakenSal",
      "må  2026-02-0909:00 - 09:45HuvudförhandlingB 5730-25   grov olovlig körningSal 7",
      "ti   2026-02-1010:00 - 12:00SammanträdeÄ 114-25   ansökan om god manSal 3",
      "ti   2026-02-1009:00 - 16:00HuvudförhandlingB 1867-24   grovt bedrägeri m.m.Sal 8",
      "(dag 3/8)",
      "on  2026-02-1109:30 - 10:00KonkursförhandlingK 81-26    ansökan om konkursSal 1",
      "fr   2026-02-1309:00 - 11:00Muntlig förhandlingT 226-26   vårdnad, boende och/eller umgängeSal 3",
      "to  2026-02-1213:15 - 15:15Muntlig förhandlingT 4214-25   kontraktsrättSal 3",
      "ti2026-02-1713:15 - 15:15Muntlig förberedelseT 5471-25kontraktsrätt överlämnat från kronofogdenSal 2",
      "ti2026-02-1713:15 - 14:15Fortsatt hfB 3973-25misshandel m.m.Sal 4",
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

    // Tuesday — multi-day hearing, (dag 3/8) discarded
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

    // No-space glued line — Muntlig förberedelse
    expect(result[6].date).toBe("2026-02-17");
    expect(result[6].type).toBe("Muntlig förberedelse");
    expect(result[6].caseNumber).toBe("T 5471-25");
    expect(result[6].saken).toBe("kontraktsrätt överlämnat från kronofogden");
    expect(result[6].room).toBe("Sal 2");

    // No-space glued line — Fortsatt hf alias
    expect(result[7].type).toBe("Huvudförhandling");
    expect(result[7].caseNumber).toBe("B 3973-25");
    expect(result[7].saken).toBe("misshandel m.m");
    expect(result[7].room).toBe("Sal 4");
  });

  it("parses Nyköping multi-line saken with (dag X/Y)", () => {
    const text = [
      "on 2026-02-11",
      "(dag 1/3)",
      "09:00 - 16:00 Huvudförhandling T 1157-24",
      "",
      "fordran Tingssal",
      "3",
      "on 2026-02-11 09:15 - 12:00 Muntlig förberedelse T 4288-25",
      "",
      "umgänge med barn m.m Tingssal",
      "7",
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
    // Actual pdf-parse structure from Stockholms tingsrätt:
    // Line 1: day+date+time + type (possibly with (dag X/Y))
    // Line 2: case number (possibly with court reference or "med flera")
    // Line 3: saken + room (glued)
    const text = [
      "Förhandlingar i Stockholms tingsrätt, vecka 8, 2026-02-16 till och med 2026-02-20 (listan publicerad 2026-02-11).",
      "Tingsrätten framhåller att listan är preliminär.",
      "DatumTidMöteMålnummerSakenLokal",
      "må  2026-02-1609:00 - 09:15   Konkursförhandling",
      "K 21241-25",
      "konkursSal 22",
      "må  2026-02-1609:00 - 10:30   Muntlig förberedelse, eventuell huvudförhandling",
      "FT 23816-25",
      "fordranSal 25",
      "må  2026-02-1609:00 - 16:30   Huvudförhandling (dag 4/30)",
      "T 11073-22, T 8203-24",
      "fastställelsetalanSal 27",
      "ti2026-02-1709:00 - 12:00   Huvudförhandling i förenklad form",
      "FT 21289-25",
      "fordranSal 30",
      "ti2026-02-1709:00 - 16:30   Huvudförhandling (dag 3/5)",
      "PMT 12670-24, med flera",
      "varumärkesintrång m.m.Sal 26",
      "ti2026-02-1709:00 - 17:00   Huvudförhandling",
      "B 6394-24 (Solna tingsrätt)",
      "folkrättsbrott, grovt brottHögsäkerhetssal 2, Bergsgatan 50",
      "on   2026-02-1809:00 - 09:10   Edgångssammanträde",
      "K 5348-25",
      "konkurs Sal 9",
      "on   2026-02-1813:00 - 15:00   Muntlig förberedelse",
      "T 16169-25",
      "kontraktsrättSal 25",
      "on   2026-02-1811:30 - 12:00   Föredragning",
      "Ä 25040-25",
      "prövning av tillträdesförbud",
      "to   2026-02-1909:00 - 11:00   Muntlig förberedelse",
      "T 19657-25",
      "fordranSal 29",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Stockholms tingsrätt", text });
    expect(result).toHaveLength(10);

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

    // Multi-case with (dag 4/30) stripped
    expect(result[2].type).toBe("Huvudförhandling");
    expect(result[2].caseNumber).toBe("T 11073-22, T 8203-24");
    expect(result[2].saken).toBe("fastställelsetalan");
    expect(result[2].room).toBe("Sal 27");

    // "Huvudförhandling i förenklad form" → Huvudförhandling
    expect(result[3].date).toBe("2026-02-17");
    expect(result[3].type).toBe("Huvudförhandling");
    expect(result[3].caseNumber).toBe("FT 21289-25");
    expect(result[3].saken).toBe("fordran");
    expect(result[3].room).toBe("Sal 30");

    // PMT prefix + "med flera" stripped
    expect(result[4].type).toBe("Huvudförhandling");
    expect(result[4].caseNumber).toBe("PMT 12670-24");
    expect(result[4].saken).toBe("varumärkesintrång m.m");
    expect(result[4].room).toBe("Sal 26");

    // External court reference "(Solna tingsrätt)" extracted
    expect(result[5].type).toBe("Huvudförhandling");
    expect(result[5].caseNumber).toBe("B 6394-24");
    expect(result[5].externalCourt).toBe("Solna tingsrätt");
    expect(result[5].saken).toContain("folkrättsbrott");

    // Edgångssammanträde
    expect(result[6].date).toBe("2026-02-18");
    expect(result[6].type).toBe("Edgångssammanträde");
    expect(result[6].caseNumber).toBe("K 5348-25");
    expect(result[6].saken).toBe("konkurs");
    expect(result[6].room).toBe("Sal 9");

    // Standard Muntlig förberedelse
    expect(result[7].type).toBe("Muntlig förberedelse");
    expect(result[7].caseNumber).toBe("T 16169-25");
    expect(result[7].saken).toBe("kontraktsrätt");
    expect(result[7].room).toBe("Sal 25");

    // Föredragning — new type, no room
    expect(result[8].type).toBe("Föredragning");
    expect(result[8].caseNumber).toBe("Ä 25040-25");
    expect(result[8].saken).toBe("prövning av tillträdesförbud");
    expect(result[8].room).toBe("");

    // Thursday standard hearing
    expect(result[9].date).toBe("2026-02-19");
    expect(result[9].caseNumber).toBe("T 19657-25");
    expect(result[9].saken).toBe("fordran");
    expect(result[9].room).toBe("Sal 29");
  });

  it("handles Stockholm typo 'huvuförhandling' and Fortsatt muntlig förberedelse", () => {
    const text = [
      "må  2026-02-0909:00 - 11:00   Muntlig förberedelse, eventuell huvuförhandling",
      "T 25039-25",
      "hyresfordranSal 1",
      "må  2026-02-0913:00 - 15:00   Fortsatt muntlig förberedelse",
      "T 16320-25",
      "vårdnad m.m.Sal 15",
      "ti2026-02-1009:00 - 11:30   Förberedande förhandling",
      "B 14600-25",
      "enskilt åtalSal 16",
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
      "DagDatumFörhandlingstidTyp av förhandlingMålnummerSakenLokal",
      "må2026-02-16 09:00 - 09:15Edgångssmtr",
      "K 9392-25",
      "ansökan om konkursUppsala tingsrätt",
      "må2026-02-16 09:00 - 12:00Huvudförhandling",
      "B 542-25",
      "ringa narkotikabrottUppsala tingsrätt",
      "ti2026-02-17 09:00 - 16:00Muntlig förberedelse och ev hf",
      "T 6817-25",
      "kontraktsrättUppsala tingsrätt",
      "on2026-02-18  09:30 - 16:30Huvudförhandling",
      "B 3858-25",
      "mord m.m.Attunda tingsrätt",
      "to2026-02-19 09:00 - 10:00Plansammanträde",
      "K 213-26",
      "rekonstruktionUppsala tingsrätt",
      "fr2026-02-20 09:00 - 11:00Muntlig förberedelse",
      "FT 8123-25",
      "fordranUppsala tingsrätt",
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

  it("parses Varberg single-line glued format (no case numbers)", () => {
    const text = [
      "Förhandlingar i Varbergs tingsrätt, vecka 7-9, 10-28 februari 2026",
      "Listan är preliminär. Förhandlingar kan ställas in med kort varsel och andra kan tillkomma.",
      "DagDatumFörhandlingstidTyp av förhandlingSakenSal",
      "ti2026-02-1009:00 - 16:00HuvudförhandlingfordranSal 5",
      "ti2026-02-1009:00 - 16:00Huvudförhandlingsynnerligen grovt narkotikabrottSal 2",
      "on2026-02-1109:00 - 11:00Muntlig förberedelsefordranSal 6",
      "on2026-02-1111:00 - 11:15Konkursförhandlingansökan om konkursSal 3",
      "on2026-02-1114:00 - 16:00Huvudförhandlingbrott mot lagen om förbud beträffande knivar och andra farliga föremålSal 4",
      "to2026-02-1213:00 - 15:00Muntlig förberedelsefordranSal 6",
      "fr2026-02-1309:00 - 10:30Muntlig förberedelse och ev hffordranSal 6",
      "må2026-02-1613:00 - 15:00Fortsatt muntlig förbfordran och avhysningSal 6",
      "ti2026-02-1713:00 - 15:00Sammanträdejämkning av godmanskap till förvaltarskapSal 6",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Varbergs tingsrätt", text });
    expect(result).toHaveLength(9);

    expect(result[0].date).toBe("2026-02-10");
    expect(result[0].time).toBe("09:00 - 16:00");
    expect(result[0].type).toBe("Huvudförhandling");
    expect(result[0].saken).toBe("fordran");
    expect(result[0].room).toBe("Sal 5");
    expect(result[0].caseNumber).toBe("");

    expect(result[1].saken).toBe("synnerligen grovt narkotikabrott");
    expect(result[1].room).toBe("Sal 2");

    expect(result[2].date).toBe("2026-02-11");
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
    expect(result[7].date).toBe("2026-02-16");
    expect(result[7].type).toBe("Muntlig förberedelse");
    expect(result[7].saken).toBe("fordran och avhysning");

    // Sammanträde
    expect(result[8].date).toBe("2026-02-17");
    expect(result[8].type).toBe("Sammanträde");
    expect(result[8].saken).toBe("jämkning av godmanskap till förvaltarskap");
  });

  it("parses Uddevalla 3-line format with multi-day and multi-case", () => {
    const text = [
      "DagDatumFörhandlingstidTyp av förhandlingMålnummerSakenSal",
      "ti2026-02-17 (dag 1/2)09:00 - 16:00Huvudförhandling",
      "B 3608-25",
      "grov fridskränkningSal 1",
      "ti2026-02-1709:00 - 16:00Huvudförhandling",
      "B 1852-25, B 3694-24",
      "misshandel m mSal 2",
      "on2026-02-1809:00 - 10:00Konkursförhandling",
      "K 104-26",
      "ansökan om konkursSal 5",
      "on2026-02-1813:00 - 16:00Muntlig förberedelse och ev hf",
      "FT 5432-25",
      "fordranSal 6",
      "to2026-02-1909:00 - 12:00Muntlig förberedelse",
      "T 1887-25, Ä 1005-25",
      "överflyttning av vårdnaden enligt 6 kap",
      "8 § föräldrabalkenSal 7",
    ].join("\n");

    const result = formatTabular.parse({ courtName: "Uddevalla tingsrätt", text });
    expect(result).toHaveLength(5);

    expect(result[0].date).toBe("2026-02-17");
    expect(result[0].type).toBe("Huvudförhandling");
    expect(result[0].caseNumber).toBe("B 3608-25");
    expect(result[0].saken).toBe("grov fridskränkning");
    expect(result[0].room).toBe("Sal 1");

    expect(result[1].caseNumber).toBe("B 1852-25, B 3694-24");
    expect(result[1].saken).toBe("misshandel m m");
    expect(result[1].room).toBe("Sal 2");

    expect(result[2].date).toBe("2026-02-18");
    expect(result[2].type).toBe("Konkursförhandling");
    expect(result[2].caseNumber).toBe("K 104-26");
    expect(result[2].saken).toBe("ansökan om konkurs");

    expect(result[3].type).toBe("Muntlig förberedelse");
    expect(result[3].caseNumber).toBe("FT 5432-25");
    expect(result[3].saken).toBe("fordran");

    // Multi-line saken with mixed case numbers
    expect(result[4].date).toBe("2026-02-19");
    expect(result[4].caseNumber).toBe("T 1887-25, Ä 1005-25");
    expect(result[4].saken).toContain("överflyttning av vårdnaden");
    expect(result[4].room).toBe("Sal 7");
  });
});
