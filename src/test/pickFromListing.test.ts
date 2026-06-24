import { describe, it, expect } from "vitest";
import { COURTS } from "../lib/courtConfig";
import type { ScrapedPdfLink } from "../lib/scrapePdfLinks";

const court = (id: string) => {
  const c = COURTS.find((x) => x.id === id);
  if (!c?.pickFromListing) throw new Error(`No pickFromListing for ${id}`);
  return c;
};

// Normalize the union return (string | string[] | null) to an array.
const pick = (
  id: string,
  pdfs: ScrapedPdfLink[],
  week: number,
  year = 2026
): string[] => {
  const r = court(id).pickFromListing!(pdfs, week, year);
  return r == null ? [] : Array.isArray(r) ? r : [r];
};

const link = (href: string, text = ""): ScrapedPdfLink => ({ href, text });

describe("pickFromListing — week-matched courts", () => {
  const lkpgBase =
    "https://www.domstol.se/globalassets/filer/domstol/linkopings_tingsratt/veckans-forhandlingar";

  it("Linköping matches a single-week file", () => {
    const pdfs = [link(`${lkpgBase}/v24.pdf`, "Förhandlingar vecka 24")];
    expect(pick("linkopings_tingsratt", pdfs, 24)).toEqual([`${lkpgBase}/v24.pdf`]);
    expect(pick("linkopings_tingsratt", pdfs, 23)).toEqual([]);
  });

  it("Linköping matches a bundled range", () => {
    const pdfs = [link(`${lkpgBase}/v25-30.pdf`, "Förhandlingar vecka 25-30")];
    for (const w of [25, 27, 30]) {
      expect(pick("linkopings_tingsratt", pdfs, w)).toEqual([`${lkpgBase}/v25-30.pdf`]);
    }
    expect(pick("linkopings_tingsratt", pdfs, 24)).toEqual([]);
    expect(pick("linkopings_tingsratt", pdfs, 31)).toEqual([]);
  });

  it("Linköping returns BOTH when a week matches a single file and a range", () => {
    const pdfs = [
      link(`${lkpgBase}/v26.pdf`, "Förhandlingar vecka 26"),
      link(`${lkpgBase}/v26-27.pdf`, "Förhandlingar vecka 26-27"),
      link(`${lkpgBase}/v28.pdf`, "Förhandlingar vecka 28"),
    ];
    expect(pick("linkopings_tingsratt", pdfs, 26)).toEqual([
      `${lkpgBase}/v26.pdf`,
      `${lkpgBase}/v26-27.pdf`,
    ]);
    // Week 27 only matches the range.
    expect(pick("linkopings_tingsratt", pdfs, 27)).toEqual([`${lkpgBase}/v26-27.pdf`]);
  });

  it("Vänersborg matches single weeks and ranges via the v-prefixed text", () => {
    const base =
      "https://www.domstol.se/globalassets/filer/domstol/vanersborgs_tingsratt/veckans_forhandlingar";
    const pdfs = [link(`${base}/v26-27.pdf`, "v26-27, 22 juni - 3 juli")];
    expect(pick("vanersborgs_tingsratt", pdfs, 26)).toEqual([`${base}/v26-27.pdf`]);
    expect(pick("vanersborgs_tingsratt", pdfs, 27)).toEqual([`${base}/v26-27.pdf`]);
    expect(pick("vanersborgs_tingsratt", pdfs, 28)).toEqual([]);
  });

  it("Södertälje matches by week number despite typo'd dates", () => {
    const base =
      "https://www.domstol.se/globalassets/filer/domstol/sodertalje_tingsratt";
    const pdfs = [
      link(`${base}/webb-forhandlingar-v.-25-2026-06-15--2026-06-19.pdf`, "Vecka 25, 15-18 juni 2026"),
      link(`${base}/webb-forhandlingar-v.-26-2026-06-24--2026-06-25.pdf`, "Vecka 26, 22-25 juni 2026"),
    ];
    expect(pick("sodertalje_tingsratt", pdfs, 26)).toEqual([
      `${base}/webb-forhandlingar-v.-26-2026-06-24--2026-06-25.pdf`,
    ]);
    expect(pick("sodertalje_tingsratt", pdfs, 24)).toEqual([]);
  });
});

describe("pickFromListing — pick-first courts", () => {
  it("Varberg and Örebro take the first listed PDF", () => {
    const pdfs = [link("https://www.domstol.se/a.pdf"), link("https://www.domstol.se/b.pdf")];
    expect(pick("varbergs_tingsratt", pdfs, 26)).toEqual(["https://www.domstol.se/a.pdf"]);
    expect(pick("orebro_tingsratt", pdfs, 26)).toEqual(["https://www.domstol.se/a.pdf"]);
    expect(pick("varbergs_tingsratt", [], 26)).toEqual([]);
  });
});
