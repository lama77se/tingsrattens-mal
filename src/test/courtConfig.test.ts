import { describe, expect, it } from "vitest";
import { COURTS, weekRangeFromMatch } from "../lib/courtConfig";
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
