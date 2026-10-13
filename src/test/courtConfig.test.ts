import { describe, expect, it } from "vitest";
import { COURTS, pickHearingPdf, weekRangeFromMatch } from "../lib/courtConfig";
import type { ScrapedPdfLink } from "../lib/courtConfig";

describe("weekRangeFromMatch", () => {
  it("splits a squished 4-digit week-range capture with no second group", () => {
    const m = /\/v\.?-?0*(\d+)(?:\s*-\s*0*(\d+))?\.pdf/i.exec("/v4142.pdf")!;
    expect(weekRangeFromMatch(m)).toEqual({ lo: 41, hi: 42 });
  });

  it("leaves a real dash-separated range alone", () => {
    const m = /\/v\.?-?0*(\d+)(?:\s*-\s*0*(\d+))?\.pdf/i.exec("/v25-30.pdf")!;
    expect(weekRangeFromMatch(m)).toEqual({ lo: 25, hi: 30 });
  });

  it("leaves a single (non-4-digit) week number alone", () => {
    const m = /\/v\.?-?0*(\d+)(?:\s*-\s*0*(\d+))?\.pdf/i.exec("/v40.pdf")!;
    expect(weekRangeFromMatch(m)).toEqual({ lo: 40, hi: 40 });
  });
});

describe("Linköpings tingsrätt pickFromListing", () => {
  const court = COURTS.find((c) => c.id === "linkopings_tingsratt")!;

  it("regression: finds a squished week-range href ('v4142.pdf' for weeks 41-42)", () => {
    // domstol.se sometimes concatenates the two week numbers in the href
    // with no separator at all, even though the link text still spells it
    // "vecka 41-42" with a dash — the href-based regex used to read "4142"
    // as one (impossible) 4-digit week and filter every PDF out, so no
    // weeks 41 or 42 fetch ever found a URL.
    const pdfs: ScrapedPdfLink[] = [
      { href: "https://www.domstol.se/.../v4142.pdf", text: "Förhandlingar vecka 41-42" },
      { href: "https://www.domstol.se/.../v4344.pdf", text: "Förhandlingar vecka 43-44" },
    ];
    expect(court.pickFromListing!(pdfs, 41, 2026)).toEqual([pdfs[0].href]);
    expect(court.pickFromListing!(pdfs, 42, 2026)).toEqual([pdfs[0].href]);
    expect(court.pickFromListing!(pdfs, 43, 2026)).toEqual([pdfs[1].href]);
  });

  it("still finds a single-week href", () => {
    const pdfs: ScrapedPdfLink[] = [
      { href: "https://www.domstol.se/.../v39.pdf", text: "Förhandlingar vecka 39" },
      { href: "https://www.domstol.se/.../v40.pdf", text: "Förhandlingar vecka 40" },
    ];
    expect(court.pickFromListing!(pdfs, 40, 2026)).toEqual([pdfs[1].href]);
  });
});

describe("pickHearingPdf", () => {
  it("regression: skips an unrelated PDF (Gävle's school-visit brochure) ahead of the real schedule", () => {
    // Gävle's "aktuellt" page started linking a "studiebesök" (school visit)
    // brochure ABOVE the actual "Förhandlingar ... sal 5" schedule PDF.
    // pdfs[0] picked the brochure, formatGavle found zero hearings in it
    // (correctly — it's not a schedule), and the court showed 0 hearings
    // even though the real schedule PDF parses fine on its own.
    const pdfs: ScrapedPdfLink[] = [
      { href: "https://www.domstol.se/.../block/3.pdf", text: "Studiebesök" },
      {
        href: "https://www.domstol.se/.../block/3.pdf",
        text: "För dig som vill göra ett studiebesök hos oss med din skolklass",
      },
      {
        href: "https://www.domstol.se/.../veckans-forhandlingar/1.pdf",
        text: "Förhandlingar september-oktober  sal 5",
      },
    ];
    expect(pickHearingPdf(pdfs)).toBe(pdfs[2].href);
  });

  it("falls back to the first link when nothing mentions 'förhandling'", () => {
    const pdfs: ScrapedPdfLink[] = [
      { href: "https://www.domstol.se/.../schema.pdf", text: "Veckoschema" },
    ];
    expect(pickHearingPdf(pdfs)).toBe(pdfs[0].href);
  });

  it("returns null for an empty listing", () => {
    expect(pickHearingPdf([])).toBeNull();
  });

  it("Gävle's pickFromListing picks the real schedule over the brochure", () => {
    const court = COURTS.find((c) => c.id === "gavle_tingsratt")!;
    const pdfs: ScrapedPdfLink[] = [
      { href: "https://www.domstol.se/.../block/3.pdf", text: "Studiebesök" },
      {
        href: "https://www.domstol.se/.../veckans-forhandlingar/1.pdf",
        text: "Förhandlingar september-oktober  sal 5",
      },
    ];
    expect(court.pickFromListing!(pdfs, 1, 2026)).toBe(pdfs[1].href);
  });
});
