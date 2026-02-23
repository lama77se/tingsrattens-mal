import { describe, it, expect } from "vitest";
import { formatSchema } from "@/lib/parsers/formatSchema";

describe("formatSchema", () => {
  it("has correct metadata", () => {
    expect(formatSchema.name).toBe("Schema");
    expect(formatSchema.formatFamily).toBe("schema");
  });

  it("returns empty array for empty text", () => {
    expect(formatSchema.parse({ courtName: "Test", text: "" })).toEqual([]);
    expect(formatSchema.parse({ courtName: "Test", text: "   " })).toEqual([]);
  });

  it("parses a single hearing from Haparanda format", () => {
    const text = [
      "HAPARANDA TINGSRÄTT  Sida 1(2)",
      "SCHEMA",
      "Haparanda tingsrätt",
      "16-27 februari 2026",
      "",
      "Tisdag 17 februari 2026",
      "kl. 09:00 - 10:15",
      "Haparanda tingsrätt, Sal 1",
      " B 784 -25, Huvudförhandling",
      "angående brott mot knivlagen, grovt brott",
    ].join("\n");

    const result = formatSchema.parse({ courtName: "Haparanda tingsrätt", text });
    expect(result).toHaveLength(1);

    const h = result[0];
    expect(h.date).toBe("2026-02-17");
    expect(h.time).toBe("09:00 - 10:15");
    expect(h.room).toBe("Sal 1");
    expect(h.caseNumber).toBe("B 784-25");
    expect(h.type).toBe("Huvudförhandling");
    expect(h.saken).toBe("brott mot knivlagen, grovt brott");
    expect(h.location).toBe("Haparanda tingsrätt");
  });

  it("handles Kalix tingshus sub-court", () => {
    const text = [
      "Tisdag 17 februari 2026",
      "kl. 11:15 - 12:00",
      "Kalix tingshus, sal 1",
      " B 1160 -25, Huvudförhandling",
      "angående stöld",
    ].join("\n");

    const result = formatSchema.parse({ courtName: "Haparanda tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].location).toBe("Kalix tingshus");
    expect(result[0].room).toBe("Sal 1");
    expect(result[0].caseNumber).toBe("B 1160-25");
  });

  it("parses multiple hearings across different days", () => {
    const text = [
      "Tisdag 17 februari 2026",
      "kl. 09:00 - 10:15",
      "Haparanda tingsrätt, Sal 1",
      " B 784 -25, Huvudförhandling",
      "angående brott mot knivlagen",
      "",
      "kl. 11:15 - 12:00",
      "Kalix tingshus, sal 1",
      " B 1160 -25, Huvudförhandling",
      "angående stöld",
      "",
      "Onsdag 18 februari 2026",
      "kl. 09:00 - 12:00",
      "Haparanda tingsrätt, Sal 2",
      " T 151-25, Muntlig förberedelse",
      "angående fordran",
    ].join("\n");

    const result = formatSchema.parse({ courtName: "Haparanda tingsrätt", text });
    expect(result).toHaveLength(3);

    expect(result[0].date).toBe("2026-02-17");
    expect(result[0].caseNumber).toBe("B 784-25");

    expect(result[1].date).toBe("2026-02-17");
    expect(result[1].caseNumber).toBe("B 1160-25");
    expect(result[1].location).toBe("Kalix tingshus");

    expect(result[2].date).toBe("2026-02-18");
    expect(result[2].caseNumber).toBe("T 151-25");
    expect(result[2].type).toBe("Muntlig förberedelse");
  });

  it("handles 'Fortsatt huvudförhandling' → Huvudförhandling", () => {
    const text = [
      "Fredag 20 februari 2026",
      "kl. 09:00 - 16:00",
      "Haparanda tingsrätt, Sal 1",
      " B 50 -25, Fortsatt huvudförhandling, Dag 2 av 3",
      "angående grovt narkotikabrott m.m.",
    ].join("\n");

    const result = formatSchema.parse({ courtName: "Haparanda tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("Huvudförhandling");
    expect(result[0].caseNumber).toBe("B 50-25");
    expect(result[0].saken).toBe("grovt narkotikabrott m.m.");
  });

  it("handles multi-line saken", () => {
    const text = [
      "Tisdag 17 februari 2026",
      "kl. 09:00 - 11:00",
      "Haparanda tingsrätt, Sal 1",
      " B 123 -25, Huvudförhandling",
      "angående grov misshandel och olaga",
      "hot m.m.",
    ].join("\n");

    const result = formatSchema.parse({ courtName: "Haparanda tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].saken).toBe("grov misshandel och olaga hot m.m.");
  });

  it("handles case number without extra space before dash", () => {
    const text = [
      "Tisdag 17 februari 2026",
      "kl. 09:00 - 10:00",
      "Haparanda tingsrätt, Sal 1",
      " T 151-25, Muntlig förberedelse",
      "angående fordran",
    ].join("\n");

    const result = formatSchema.parse({ courtName: "Haparanda tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].caseNumber).toBe("T 151-25");
  });

  it("handles single time (no range)", () => {
    const text = [
      "Måndag 16 februari 2026",
      "kl. 09:00",
      "Haparanda tingsrätt, Sal 1",
      " B 200-25, Häktningsförhandling",
      "angående misshandel",
    ].join("\n");

    const result = formatSchema.parse({ courtName: "Haparanda tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].time).toBe("09:00");
    expect(result[0].type).toBe("Häktningsförhandling");
  });

  it("handles multiple hearings same day same location", () => {
    const text = [
      "Tisdag 17 februari 2026",
      "kl. 09:00 - 10:00",
      "Haparanda tingsrätt, Sal 1",
      " B 100-25, Huvudförhandling",
      "angående stöld",
      "kl. 10:30 - 11:30",
      "Haparanda tingsrätt, Sal 1",
      " B 200-25, Huvudförhandling",
      "angående misshandel",
    ].join("\n");

    const result = formatSchema.parse({ courtName: "Haparanda tingsrätt", text });
    expect(result).toHaveLength(2);
    expect(result[0].time).toBe("09:00 - 10:00");
    expect(result[0].saken).toBe("stöld");
    expect(result[1].time).toBe("10:30 - 11:30");
    expect(result[1].saken).toBe("misshandel");
  });

  it("splits multi-case hearing from angående line", () => {
    const text = [
      "Tisdag 24 februari 2026",
      "kl. 09:30 - 15:00",
      "Haparanda tingsrätt, Sal 1",
      "B 811-24, Huvudförhandling",
      "angående häleriförseelse, B 443-25 ringa narkotikabrott,",
      "brott mot lagen om förbud beträffande knivar och andra",
      "farliga föremål",
    ].join("\n");

    const result = formatSchema.parse({ courtName: "Haparanda tingsrätt", text });
    expect(result).toHaveLength(2);

    expect(result[0].caseNumber).toBe("B 811-24");
    expect(result[0].type).toBe("Huvudförhandling");
    expect(result[0].saken).toBe("häleriförseelse");
    expect(result[0].time).toBe("09:30 - 15:00");

    expect(result[1].caseNumber).toBe("B 443-25");
    expect(result[1].type).toBe("Huvudförhandling");
    expect(result[1].saken).toBe("ringa narkotikabrott, brott mot lagen om förbud beträffande knivar och andra farliga föremål");
    expect(result[1].time).toBe("09:30 - 15:00");
    expect(result[1].room).toBe("Sal 1");
  });

  it("parses Lund-style hearing with FT case number", () => {
    const text = [
      "Måndag 16 februari 2026",
      "kl. 09:00 - 12:00",
      "Lunds tingsrätt, sal 08",
      "FT 6974-25, Muntlig förberedelse",
      "angående Trafikförsäkring (överlämnat från",
      "Kronofogdemyndigheten)",
    ].join("\n");

    const result = formatSchema.parse({ courtName: "Lunds tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].caseNumber).toBe("FT 6974-25");
    expect(result[0].type).toBe("Muntlig förberedelse");
    expect(result[0].saken).toBe("Trafikförsäkring (överlämnat från Kronofogdemyndigheten)");
    expect(result[0].room).toBe("Sal 08");
  });

  it("handles Fortsatt muntlig förberedelse", () => {
    const text = [
      "Fredag 20 februari 2026",
      "kl. 09:00 - 12:00",
      "Lunds tingsrätt, sal 08",
      "T 7708-25, Fortsatt muntlig förberedelse",
      "angående Vårdnad, boende och/eller umgänge",
    ].join("\n");

    const result = formatSchema.parse({ courtName: "Lunds tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("Muntlig förberedelse");
    expect(result[0].saken).toBe("Vårdnad, boende och/eller umgänge");
  });

  it("handles Förlikningssammanträde", () => {
    const text = [
      "Fredag 20 februari 2026",
      "kl. 13:45 - 14:30",
      "Lunds tingsrätt, sal 14",
      "K 142-25, Förlikningssammanträde",
      "angående Konkurs",
    ].join("\n");

    const result = formatSchema.parse({ courtName: "Lunds tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("Förlikningssammanträde");
    expect(result[0].saken).toBe("Konkurs");
  });

  it("does not split on trailing case number reference in angående", () => {
    const text = [
      "Torsdag 12 februari 2026",
      "kl. 13:00 - 16:00",
      "Lunds tingsrätt, sal 06",
      "FT 7213-25, Muntlig förberedelse",
      "angående Kontraktsrätt, ansökan om återvinning av tredskodom FT 5619-25",
    ].join("\n");

    const result = formatSchema.parse({ courtName: "Lunds tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].caseNumber).toBe("FT 7213-25");
    expect(result[0].saken).toBe("Kontraktsrätt, ansökan om återvinning av tredskodom FT 5619-25");
  });

  it("does not split on mid-line case number reference in continuation", () => {
    const text = [
      "Torsdag 19 februari 2026",
      "kl. 09:00 - 12:00",
      "Lunds tingsrätt, sal 13",
      "T 6990-25, Muntlig förberedelse",
      "angående Kontraktsrätt (överlämnat från Kronofogdemyndigheten):",
      "återvinning av tredskodom i T 5137-25",
    ].join("\n");

    const result = formatSchema.parse({ courtName: "Lunds tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].caseNumber).toBe("T 6990-25");
    expect(result[0].saken).toBe(
      "Kontraktsrätt (överlämnat från Kronofogdemyndigheten): återvinning av tredskodom i T 5137-25"
    );
  });

  it("handles Lund page headers without breaking hearings", () => {
    const text = [
      "Måndag 16 februari 2026",
      "kl. 13:00 - 14:30",
      "Lunds tingsrätt, sal 01",
      "B 771-25, Huvudförhandling",
      "angående olovlig körning, grovt brott m m",
      "LUNDS TINGSRÄTT  Sida 2(5)",
      "Tisdag 17 februari 2026",
      "kl. 09:00 - 09:15",
      "Lunds tingsrätt, sal 06",
      "K 104-26, Konkursförhandling",
      "angående Ansökan om konkurs",
    ].join("\n");

    const result = formatSchema.parse({ courtName: "Lunds tingsrätt", text });
    expect(result).toHaveLength(2);
    expect(result[0].saken).toBe("olovlig körning, grovt brott m m");
    expect(result[1].date).toBe("2026-02-17");
    expect(result[1].caseNumber).toBe("K 104-26");
    expect(result[1].type).toBe("Konkursförhandling");
  });

  it("parses Malmö-style bare room lines", () => {
    const text = [
      "Fredag 13 februari 2026",
      "kl. 09:00 - 09:30",
      "Sal 09",
      "B 737-26, Huvudförhandling",
      "angående olovlig körning",
    ].join("\n");

    const result = formatSchema.parse({ courtName: "Malmö tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].room).toBe("Sal 09");
    expect(result[0].caseNumber).toBe("B 737-26");
    expect(result[0].saken).toBe("olovlig körning");
    expect(result[0].location).toBe("");
  });

  it("handles Malmö room with annotation (säkerhetssal)", () => {
    const text = [
      "Måndag 16 februari 2026",
      "kl. 09:00 - 16:30",
      "Sal 10 (säkerhetssal)",
      "B 9174-25, Huvudförhandling, Dag 2 av 6",
      "angående grov kvinnofridskränkning och grov misshandel",
    ].join("\n");

    const result = formatSchema.parse({ courtName: "Malmö tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].room).toBe("Sal 10");
    expect(result[0].type).toBe("Huvudförhandling");
    expect(result[0].saken).toBe("grov kvinnofridskränkning och grov misshandel");
  });

  it("handles 'ngående' typo (missing leading 'a')", () => {
    const text = [
      "Fredag 13 februari 2026",
      "kl. 13:00 - 16:00",
      "Sal 18",
      "B 13826-24, Huvudförhandling",
      "ngående grovt olaga hot och ringa narkotikabrott",
    ].join("\n");

    const result = formatSchema.parse({ courtName: "Malmö tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].saken).toBe("grovt olaga hot och ringa narkotikabrott");
  });

  it("parses multiple Malmö hearings across page break", () => {
    const text = [
      "Måndag 16 februari 2026",
      "kl. 15:30 - 16:00",
      "Sal 17",
      "B 13832-25, Huvudförhandling",
      "angående smuggling av explosiv vara",
      "MALMÖ TINGSRÄTT Sida 3(8)",
      "kl. 13:00 - 13:45",
      "Sal 17",
      "B 689-26, Huvudförhandling",
      "angående vårdslöshet i trafik",
    ].join("\n");

    const result = formatSchema.parse({ courtName: "Malmö tingsrätt", text });
    expect(result).toHaveLength(2);
    expect(result[0].saken).toBe("smuggling av explosiv vara");
    expect(result[0].room).toBe("Sal 17");
    expect(result[1].saken).toBe("vårdslöshet i trafik");
    expect(result[1].room).toBe("Sal 17");
  });

  it("does not split on case number references inside parentheses", () => {
    const text = [
      "Tisdag 24 februari 2026",
      "kl. 15:15 - 16:00",
      "Kalix tingshus, sal 1",
      "B 110-26, Huvudförhandling",
      "angående undanröjande av ungdomstjänst (B 512-25)",
    ].join("\n");

    const result = formatSchema.parse({ courtName: "Haparanda tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].caseNumber).toBe("B 110-26");
    expect(result[0].type).toBe("Huvudförhandling");
    expect(result[0].saken).toBe("undanröjande av ungdomstjänst (B 512-25)");
  });

  // Malmö two-column layout: Sal and angående merged on same line
  it("handles Malmö merged Sal + angående on same line", () => {
    const text = [
      "Fredag 20 februari 2026",
      "kl. 09:00 - 10:00 B 1547-26, Huvudförhandling",
      "Sal 22 angående penningtvättsbrott",
    ].join("\n");

    const result = formatSchema.parse({ courtName: "Malmö tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].room).toBe("Sal 22");
    expect(result[0].caseNumber).toBe("B 1547-26");
    expect(result[0].saken).toBe("penningtvättsbrott");
  });

  it("handles Malmö merged Sal (säkerhetssal) + angående", () => {
    const text = [
      "Fredag 20 februari 2026",
      "kl. 09:00 - 16:30 B 9174-25, Huvudförhandling, Dag 5 av 7",
      "Sal 11 (säkerhetssal) angående grov kvinnofridskränkning och grov misshandel",
    ].join("\n");

    const result = formatSchema.parse({ courtName: "Malmö tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].room).toBe("Sal 11");
    expect(result[0].type).toBe("Huvudförhandling");
    expect(result[0].saken).toBe("grov kvinnofridskränkning och grov misshandel");
  });

  it("handles Malmö Sal + Säkerhetssal qualifier + angående", () => {
    const text = [
      "Fredag 20 februari 2026",
      "kl. 09:00 - 16:30 B 10398-25, Huvudförhandling, Dag 1 av 3",
      "Sal 52, Säkerhetssal angående grovt vapenbrott, anstiftan av grovt vapenbrott och grovt",
      "skyddande av brottsling",
    ].join("\n");

    const result = formatSchema.parse({ courtName: "Malmö tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].room).toBe("Sal 52");
    expect(result[0].saken).toBe(
      "grovt vapenbrott, anstiftan av grovt vapenbrott och grovt skyddande av brottsling"
    );
  });

  it("handles Malmö merged Sal + ngående typo (missing 'a')", () => {
    const text = [
      "Torsdag 26 februari 2026",
      "kl. 09:00 - 11:00 B 13877-25, Huvudförhandling",
      "Sal 10 (säkerhetssal) ngående misshandel",
    ].join("\n");

    const result = formatSchema.parse({ courtName: "Malmö tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].room).toBe("Sal 10");
    expect(result[0].saken).toBe("misshandel");
  });

  it("parses full Malmö page with multiple merged entries", () => {
    const text = [
      "MALMÖ TINGSRÄTT Sida 1(9)",
      "Malmö tingsrätt",
      "20-27 februari 2026",
      "Fredag 20 februari 2026",
      "kl. 09:00 - 10:00 B 1547-26, Huvudförhandling",
      "Sal 22 angående penningtvättsbrott",
      "kl. 09:00 - 12:00 B 4399-25, Huvudförhandling",
      "Sal 15 angående bidragsbrott",
      "kl. 09:00 - 16:30 B 3227-25, Huvudförhandling",
      "Sal 17 angående misshandel",
    ].join("\n");

    const result = formatSchema.parse({ courtName: "Malmö tingsrätt", text });
    expect(result).toHaveLength(3);
    expect(result[0].saken).toBe("penningtvättsbrott");
    expect(result[1].saken).toBe("bidragsbrott");
    expect(result[2].saken).toBe("misshandel");
  });

  // Two-column merged line tests (coordinate-based PDF extraction merges
  // left+right columns onto the same line for Haparanda's two-column layout)
  it("handles merged time+case line from two-column PDF", () => {
    const text = [
      "Tisdag 17 februari 2026",
      "kl. 09:00 - 10:15 B 784-25, Huvudförhandling",
      "Haparanda tingsrätt, Sal 1 angående brott mot knivlagen, grovt brott",
    ].join("\n");

    const result = formatSchema.parse({ courtName: "Haparanda tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2026-02-17");
    expect(result[0].time).toBe("09:00 - 10:15");
    expect(result[0].caseNumber).toBe("B 784-25");
    expect(result[0].type).toBe("Huvudförhandling");
    expect(result[0].room).toBe("Sal 1");
    expect(result[0].saken).toBe("brott mot knivlagen, grovt brott");
    expect(result[0].location).toBe("Haparanda tingsrätt");
  });

  it("handles multiple merged two-column hearings", () => {
    const text = [
      "Tisdag 17 februari 2026",
      "kl. 09:00 - 10:15 B 784-25, Huvudförhandling",
      "Haparanda tingsrätt, Sal 1 angående brott mot knivlagen, grovt brott",
      "kl. 11:15 - 12:00 B 1160-25, Huvudförhandling",
      "Kalix tingshus, sal 1 angående stöld",
      "Onsdag 18 februari 2026",
      "kl. 09:00 - 16:00 B 863-25, Fortsatt huvudförhandling",
      "Haparanda tingsrätt, Sal 1 angående Inbrottsstöld, bedrägeri",
    ].join("\n");

    const result = formatSchema.parse({ courtName: "Haparanda tingsrätt", text });
    expect(result).toHaveLength(3);

    expect(result[0].date).toBe("2026-02-17");
    expect(result[0].time).toBe("09:00 - 10:15");
    expect(result[0].caseNumber).toBe("B 784-25");
    expect(result[0].location).toBe("Haparanda tingsrätt");

    expect(result[1].date).toBe("2026-02-17");
    expect(result[1].caseNumber).toBe("B 1160-25");
    expect(result[1].location).toBe("Kalix tingshus");
    expect(result[1].room).toBe("Sal 1");

    expect(result[2].date).toBe("2026-02-18");
    expect(result[2].type).toBe("Huvudförhandling");
    expect(result[2].saken).toBe("Inbrottsstöld, bedrägeri");
  });

  it("handles merged location+angående with multi-case split", () => {
    const text = [
      "Tisdag 24 februari 2026",
      "kl. 09:30 - 15:00 B 811-24, Huvudförhandling",
      "Haparanda tingsrätt, Sal 1 angående häleriförseelse, B 443-25 ringa narkotikabrott,",
      "brott mot lagen om förbud beträffande knivar och andra",
      "farliga föremål",
    ].join("\n");

    const result = formatSchema.parse({ courtName: "Haparanda tingsrätt", text });
    expect(result).toHaveLength(2);

    expect(result[0].caseNumber).toBe("B 811-24");
    expect(result[0].saken).toBe("häleriförseelse");

    expect(result[1].caseNumber).toBe("B 443-25");
    expect(result[1].saken).toBe("ringa narkotikabrott, brott mot lagen om förbud beträffande knivar och andra farliga föremål");
  });

  it("handles merged location+angående with paren reference (no split)", () => {
    const text = [
      "Tisdag 24 februari 2026",
      "kl. 15:15 - 16:00 B 110-26, Huvudförhandling",
      "Kalix tingshus, sal 1 angående undanröjande av ungdomstjänst (B 512-25)",
    ].join("\n");

    const result = formatSchema.parse({ courtName: "Haparanda tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].caseNumber).toBe("B 110-26");
    expect(result[0].saken).toBe("undanröjande av ungdomstjänst (B 512-25)");
  });

  // pdfjs-serverless produces spaces around dashes in case numbers: "B 784 - 25"
  it("normalizes pdfjs-serverless case number spacing (B 784 - 25)", () => {
    const text = [
      "Tisdag 17 februari 2026",
      "kl. 09:00 - 10:15 B 784 - 25, Huvudförhandling",
      "Haparanda tingsrätt, Sal 1 angående brott mot knivlagen",
    ].join("\n");

    const result = formatSchema.parse({ courtName: "Haparanda tingsrätt", text });
    expect(result).toHaveLength(1);
    expect(result[0].caseNumber).toBe("B 784-25");
    expect(result[0].time).toBe("09:00 - 10:15");
    expect(result[0].saken).toBe("brott mot knivlagen");
  });

  it("normalizes pdfjs-serverless spacing for multi-case angående", () => {
    const text = [
      "Tisdag 24 februari 2026",
      "kl. 09:30 - 15:00 B 811 - 24, Huvudförhandling",
      "Haparanda tingsrätt, Sal 1 angående häleriförseelse, B 443 - 25 ringa narkotikabrott,",
      "brott mot lagen om förbud beträffande knivar och andra",
      "farliga föremål",
    ].join("\n");

    const result = formatSchema.parse({ courtName: "Haparanda tingsrätt", text });
    expect(result).toHaveLength(2);
    expect(result[0].caseNumber).toBe("B 811-24");
    expect(result[0].saken).toBe("häleriförseelse");
    expect(result[1].caseNumber).toBe("B 443-25");
    expect(result[1].saken).toBe("ringa narkotikabrott, brott mot lagen om förbud beträffande knivar och andra farliga föremål");
  });

  it("skips page headers and preserves correct location", () => {
    const text = [
      "Fredag 20 februari 2026",
      "kl. 09:00 - 12:00 B 395 - 23, Huvudförhandling, Dag 2 av 2",
      "Kalix tingshus, sal 1 angående medhjälp till grov smuggling",
      "HAPARANDA TINGSRÄTT Sida 2 ( 2 )",
      "Måndag 23 februari 2026",
      "kl. 13:15 - 16:00 B 863 - 25, Fortsatt huvudförhandling",
      "Haparanda tingsrätt, Sal 1 angående Inbrottsstöld och hot mot tjänsteman",
    ].join("\n");

    const result = formatSchema.parse({ courtName: "Haparanda tingsrätt", text });
    expect(result).toHaveLength(2);
    expect(result[0].location).toBe("Kalix tingshus");
    expect(result[0].caseNumber).toBe("B 395-23");
    // Page header should not override location for next hearing
    expect(result[1].location).toBe("Haparanda tingsrätt");
    expect(result[1].caseNumber).toBe("B 863-25");
    expect(result[1].type).toBe("Huvudförhandling");
  });

  // Three-row layout: "Sal" and room number on separate lines
  // Row 1: kl. 10:00 - 12:00 B 1146-25, Huvudförhandling
  // Row 2: Haparanda tingsrätt, Sal angående tillgrepp av fortskaffningsmedel...
  // Row 3: 1
  it("handles three-row layout where Sal and room number are split", () => {
    const text = [
      "Tisdag 3 februari 2026",
      "kl. 13:15 - 16:15 B 256-25, Huvudförhandling",
      "Kalix tingshus, sal 1 angående grovt bidragsbrott",
      "Onsdag 4 februari 2026",
      "kl. 10:00 - 12:00 B 1146-25, Huvudförhandling",
      "Haparanda tingsrätt, Sal angående tillgrepp av fortskaffningsmedel och olovlig körning",
      "1",
      "Måndag 9 februari 2026",
      "kl. 13:00 - 15:00 B 1213-25, Huvudförhandling",
      "Haparanda tingsrätt, Sal angående grovt narkotikabrott",
      "1",
    ].join("\n");

    const result = formatSchema.parse({ courtName: "Haparanda tingsrätt", text });
    expect(result).toHaveLength(3);

    // Normal two-column hearing
    expect(result[0].caseNumber).toBe("B 256-25");
    expect(result[0].room).toBe("Sal 1");
    expect(result[0].location).toBe("Kalix tingshus");
    expect(result[0].saken).toBe("grovt bidragsbrott");

    // Three-row: room number on separate line
    expect(result[1].caseNumber).toBe("B 1146-25");
    expect(result[1].room).toBe("Sal 1");
    expect(result[1].location).toBe("Haparanda tingsrätt");
    expect(result[1].saken).toBe("tillgrepp av fortskaffningsmedel och olovlig körning");

    // Another three-row
    expect(result[2].caseNumber).toBe("B 1213-25");
    expect(result[2].room).toBe("Sal 1");
    expect(result[2].location).toBe("Haparanda tingsrätt");
    expect(result[2].saken).toBe("grovt narkotikabrott");
  });
});
