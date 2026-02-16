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
});
