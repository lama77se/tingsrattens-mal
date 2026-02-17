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
});
