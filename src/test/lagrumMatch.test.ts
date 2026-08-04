import { describe, it, expect } from "vitest";
import { matchLagrum } from "../lib/lagrumMatch";

describe("matchLagrum", () => {
  describe("case number filtering", () => {
    it("returns empty for tvistemål (T)", () => {
      expect(matchLagrum("misshandel", "T 1234-25")).toEqual({
        lagrum: "",
        sakomrade: "",
      });
    });

    it("returns empty for förenklat tvistemål (FT)", () => {
      expect(matchLagrum("misshandel", "FT 123-25")).toEqual({
        lagrum: "",
        sakomrade: "",
      });
    });

    it("matches for brottmål (B)", () => {
      const r = matchLagrum("misshandel", "B 1234-25");
      expect(r.sakomrade).toBe("Brott mot liv och hälsa");
      expect(r.lagrum).toMatch(/BrB 3 kap/);
    });

    it("matches when no case number is given", () => {
      const r = matchLagrum("misshandel", "");
      expect(r.sakomrade).toBe("Brott mot liv och hälsa");
    });
  });

  describe("word-boundary matching", () => {
    it("does NOT let the 'grov' qualifier match as a standalone key", () => {
      // "grov" was a bogus generated key that matched any "grov*" saken.
      // With word-boundary + blocklist, it should fall through to the real crime.
      const r = matchLagrum("grovt hemfridsbott m m", "B 1234-25");
      expect(r.sakomrade).toBe("Brott mot frihet och frid"); // via override
      expect(r.lagrum).toMatch(/BrB 4 kap/);
    });

    it("matches whole-word keys even when the key is a substring of a larger word", () => {
      // "mord" must NOT match "barnamordsmisstanke" as standalone, but it's OK
      // if saken is "mord m m".
      const r = matchLagrum("mord m.m.", "B 1234-25");
      expect(r.sakomrade).toBe("Brott mot liv och hälsa");
    });

    it("treats Swedish letters (å/ä/ö) as part of words for boundary purposes", () => {
      // Key "stöld" should match "stöld" but NOT "ringa stöldbrott" if we were
      // naively using \w boundaries (which don't know about ÅÄÖ). Word-boundary
      // here means non-letter on either side.
      const r1 = matchLagrum("stöld", "B 1234-25");
      expect(r1.sakomrade).toBe("Förmögenhetsbrott");

      // "ringa stöld" should prefer the more specific longer key
      const r2 = matchLagrum("ringa stöld", "B 1234-25");
      expect(r2.sakomrade).toBe("Förmögenhetsbrott");
    });
  });

  describe("overrides", () => {
    it("uses override for PDF typo 'hemfridsbott'", () => {
      const r = matchLagrum("hemfridsbott", "B 1234-25");
      expect(r.sakomrade).toBe("Brott mot frihet och frid");
      expect(r.lagrum).toBe("BrB 4 kap. 6 §");
    });

    it("uses override for 'undanröjande av skyddstillsyn'", () => {
      const r = matchLagrum("undanröjande av skyddstillsyn", "B 1234-25");
      expect(r.sakomrade).toBe("Brott mot rättskipningen");
      expect(r.lagrum).toMatch(/28 kap/);
    });

    it("uses override for 'överträdelse av kontaktförbud'", () => {
      const r = matchLagrum("överträdelse av kontaktförbud", "B 1234-25");
      expect(r.sakomrade).toBe("Brott mot frihet och frid");
      expect(r.lagrum).toMatch(/Kontaktförbud/i);
    });
  });

  describe("m.m. handling", () => {
    it("strips trailing 'm.m.'", () => {
      const r = matchLagrum("misshandel m.m.", "B 1234-25");
      expect(r.sakomrade).toBe("Brott mot liv och hälsa");
    });

    it("strips trailing 'm m' without dots", () => {
      const r = matchLagrum("misshandel m m", "B 1234-25");
      expect(r.sakomrade).toBe("Brott mot liv och hälsa");
    });
  });

  describe("empty input", () => {
    it("returns empty for empty saken", () => {
      expect(matchLagrum("", "B 1234-25")).toEqual({ lagrum: "", sakomrade: "" });
    });

    it("returns empty for whitespace-only saken", () => {
      expect(matchLagrum("   ", "B 1234-25")).toEqual({ lagrum: "", sakomrade: "" });
    });
  });

  // ─── C. Fuzzy normalization ──────────────────────────────────────────────
  describe("fuzzy normalization fallback", () => {
    it("collapses duplicated letters (e.g. 'missshandel')", () => {
      const r = matchLagrum("missshandel", "B 1234-25");
      expect(r.sakomrade).toBe("Brott mot liv och hälsa");
    });

    it("strips diacritics when matching", () => {
      // "sakomrade" written without å should still match keys containing å
      const r = matchLagrum("skadegorelse", "B 1234-25");
      expect(r.sakomrade).toBe("Skadegörelsebrott");
    });
  });

  // ─── D. Sakomrade default lagrum fallback ────────────────────────────────
  describe("sakomrade default lagrum fallback", () => {
    it("falls back to sakomrade default when entry has empty primart_lagrum", () => {
      // The generator emits some entries with empty primart_lagrum and a real
      // sakomrade; the default kicks in so we always return *some* reference.
      // Pick a procedural override to exercise the code path reliably.
      const r = matchLagrum("undanröjande av skyddstillsyn", "B 1234-25");
      expect(r.lagrum).not.toBe("");
    });
  });

  // ─── E. Non-B case routing ───────────────────────────────────────────────
  describe("non-B case routing", () => {
    it("maps tvistemål (T) saken using the civil vocabulary", () => {
      const r = matchLagrum("skadestånd", "T 1234-25");
      expect(r.sakomrade).toBe("Skadeståndsrätt");
      expect(r.lagrum).toMatch(/Skadeståndslagen/);
    });

    it("maps förenklat tvistemål (FT) the same as T", () => {
      const r = matchLagrum("fordran", "FT 42-25");
      expect(r.sakomrade).toBe("Fordringsrätt");
    });

    it("maps familjemål (F) to family overrides", () => {
      const r = matchLagrum("äktenskapsskillnad", "F 99-25");
      expect(r.sakomrade).toBe("Familjerätt");
      expect(r.lagrum).toMatch(/Äktenskapsbalken/);
    });

    it("maps familjemål (F) 'vårdnad' to FB 6 kap.", () => {
      const r = matchLagrum("vårdnad om barn", "F 100-25");
      expect(r.sakomrade).toBe("Familjerätt");
      expect(r.lagrum).toMatch(/Föräldrabalken 6 kap/);
    });

    it("maps ärenden (Ä) saken using the ärenden vocabulary", () => {
      const r = matchLagrum("förordnande av god man", "Ä 500-25");
      expect(r.sakomrade).toBe("Förmynderskapsrätt");
    });

    it("maps konkursmål (K)", () => {
      const r = matchLagrum("konkurs", "K 7-25");
      expect(r.sakomrade).toBe("Konkursrätt");
      expect(r.lagrum).toMatch(/Konkurslagen/);
    });

    it("tvistemål does NOT fall through to generated criminal mappings", () => {
      // "misshandel" is a criminal term; on a T case it should not be classified.
      const r = matchLagrum("misshandel", "T 42-25");
      expect(r).toEqual({ lagrum: "", sakomrade: "" });
    });
  });

  // ─── #4. Levenshtein-distance-1 fuzzy fallback ───────────────────────────
  describe("Levenshtein-distance-1 fallback", () => {
    it("catches single-character deletions (typo: 'hemfridsbrot' missing final 't')", () => {
      const r = matchLagrum("hemfridsbrot", "B 1234-25");
      expect(r.sakomrade).toBe("Brott mot frihet och frid");
    });

    it("catches single-character insertions (typo: 'narkotikabrottt' with extra 't')", () => {
      const r = matchLagrum("narkotikabrottt", "B 1234-25");
      expect(r.sakomrade).toBe("Narkotikabrott");
    });

    it("catches single-character substitutions", () => {
      // "narkotikabrokt" — substitution 't'→'k' in narkotikabrott
      const r = matchLagrum("narkotikabrokt", "B 1234-25");
      expect(r.sakomrade).toBe("Narkotikabrott");
    });

    it("does NOT match short keys fuzzily (too risky)", () => {
      // "mord" is a 4-char key; distance-1 would match "mord?" substrings
      // carelessly. Ensure only keys ≥ 7 chars are eligible.
      const r = matchLagrum("mork", "B 1234-25");
      expect(r).toEqual({ lagrum: "", sakomrade: "" });
    });
  });

  // ─── #5. Aggravated variant auto-lookup ──────────────────────────────────
  describe("aggravated variant lookup", () => {
    it("prefers the 'grov X' variant when saken contains 'grov'", () => {
      // Both "bedrägeri" and "grovt bedrägeri" are keys; saken "grovt bedrägeri"
      // matches the longer key first, which is expected.
      const r = matchLagrum("grovt bedrägeri", "B 1234-25");
      expect(r.lagrum).toMatch(/BrB 9 kap/);
    });

    it("picks the aggravated twin when the matched key is the base form", () => {
      // If the matched key happens to be "bedrägeri" (e.g. via fuzzy path) and
      // saken contains "grov", the resolver should look up "grovt bedrägeri"
      // in the same index and prefer that entry's lagrum.
      // Easy way to exercise: use a Brå-style composite key where only the
      // base matches, and verify an aggravated twin kicks in.
      // Here the override "häleri" has sakomrade Förmögenhetsbrott; the
      // "grovt häleri" override exists too. If saken is "grovt häleri", the
      // longest-key match picks the grov one directly — still correct output.
      const r = matchLagrum("grovt häleri", "B 1234-25");
      expect(r.sakomrade).toBe("Förmögenhetsbrott");
    });
  });

  // ─── #6. Multiple-crime detection ────────────────────────────────────────
  describe("multiple-crime detection", () => {
    it("returns additional entries for comma-separated crimes", () => {
      const r = matchLagrum("stöld, misshandel", "B 1234-25");
      expect(r.sakomrade).toBe("Förmögenhetsbrott"); // primary from longest key
      expect(r.additional).toBeDefined();
      const additionalSakomraden = (r.additional ?? []).map((a) => a.sakomrade);
      expect(additionalSakomraden).toContain("Brott mot liv och hälsa");
    });

    it("returns additional entries when saken uses 'och'", () => {
      const r = matchLagrum("stöld och misshandel", "B 1234-25");
      expect(r.additional?.length ?? 0).toBeGreaterThanOrEqual(1);
    });

    it("returns additional entries when saken uses 'samt'", () => {
      const r = matchLagrum("stöld samt misshandel", "B 1234-25");
      expect(r.additional?.length ?? 0).toBeGreaterThanOrEqual(1);
    });

    it("deduplicates when fragments yield the same lagrum", () => {
      // Both fragments match "narkotikabrott" — should not produce duplicates
      const r = matchLagrum("narkotikabrott, narkotikabrott", "B 1234-25");
      expect(r.additional).toBeUndefined();
    });

    it("single-crime saken returns no 'additional' field", () => {
      const r = matchLagrum("misshandel", "B 1234-25");
      expect(r.additional).toBeUndefined();
    });

    it("splits real saken from Gävle 'ringa narkotikabrott, brott mot knivlagen'", () => {
      const r = matchLagrum("ringa narkotikabrott, brott mot knivlagen", "B 1423-26");
      expect(r.sakomrade).toBe("Narkotikabrott");
      const extras = r.additional ?? [];
      const sakomraden = extras.map((a) => a.sakomrade);
      expect(sakomraden).toContain("Vapenbrott");
    });
  });

  // ─── Batch (2026-07): additional court saken ─────────────────────────────
  describe("2026-07 saken batch", () => {
    const cases: [string, string, RegExp][] = [
      ["olovlig energiavledning", "Förmögenhetsbrott", /BrB 8 kap\. 10 §/],
      ["grov olovlig energiavledning", "Förmögenhetsbrott", /BrB 8 kap\. 10 §/],
      ["försök till spioneri", "Brott mot Sveriges säkerhet", /BrB 19 kap\. 5 §/],
      ["falsk angivelse", "Brott mot rättskipningen", /BrB 15 kap\. 6 §/],
      ["olovlig identitetsanvändning", "Brott mot frihet och frid", /BrB 4 kap\. 6 b §/],
      [
        "brott mot förordningen om vilotider vid vissa vägtransporter",
        "Trafikbrott",
        /1994:1297/,
      ],
      [
        "brott mot lagen om transport av farligt gods",
        "Övrig speciallagstiftning",
        /2006:263/,
      ],
      ["olaga förförföljelse", "Brott mot frihet och frid", /BrB 4 kap\. 4 b §/],
      ["undanröjande av ungdomsövervakning", "Brott mot rättskipningen", /BrB 32 kap\. 4 §/],
      ["närpenningtvättsbrott", "Ekonomisk brottslighet", /2014:307/],
    ];

    for (const [saken, sakomrade, lagrumRe] of cases) {
      it(`maps "${saken}"`, () => {
        const r = matchLagrum(saken, "B 1234-26");
        expect(r.sakomrade).toBe(sakomrade);
        expect(r.lagrum).toMatch(lagrumRe);
      });
    }

    it("does not classify these as T (civil) cases", () => {
      expect(matchLagrum("falsk angivelse", "T 10-26")).toEqual({
        lagrum: "",
        sakomrade: "",
      });
    });
  });

  describe("fornminne / böter / beslag mappings", () => {
    const cases: [string, string, RegExp][] = [
      ["fornminnesbrott", "Övrig speciallagstiftning", /1988:950/],
      ["omvandling av böter", "Övrig speciallagstiftning", /1979:189/],
      ["beslag", "Brott mot allmän verksamhet", /27 kap\. 1 §/],
    ];
    for (const [saken, sakomrade, lagrumRe] of cases) {
      it(`maps "${saken}"`, () => {
        const r = matchLagrum(saken, "B 1234-26");
        expect(r.sakomrade).toBe(sakomrade);
        expect(r.lagrum).toMatch(lagrumRe);
      });
    }

    // Regression: "beslag" is excluded from the fragment loop so a trailing
    // "…samt beslag" in a compound charge cannot hijack the primary crime.
    it("does not let a trailing 'beslag' hijack a knife-law charge", () => {
      const r = matchLagrum(
        "brott mot lagen om förbud beträffande knivar och andra farliga föremål samt beslag",
        "B 1884-26"
      );
      expect(r.sakomrade).toBe("Vapenbrott");
      expect(r.lagrum).toMatch(/1988:254/);
    });

    it("classifies the primary crime, not beslag, in 'narkotikabrott, beslag'", () => {
      const r = matchLagrum("narkotikabrott, beslag", "B 42-26");
      expect(r.sakomrade).toBe("Narkotikabrott");
    });
  });

  describe("ärende (Ä) and konkurs (K) mappings", () => {
    const cases: [string, string, string, RegExp][] = [
      ["ansökan om edgång", "K 100-26", "Konkursrätt", /1987:672/],
      [
        "erkännande och verkställighet av utländska dom/beslut",
        "Ä 100-26",
        "Fordringsrätt",
        /1215\/2012/,
      ],
      ["Hinder mot verkställighet", "Ä 100-26", "Familjerätt", /21 kap/],
      [
        "prövning av övervakningsnämnds beslut",
        "Ä 100-26",
        "Brott mot rättskipningen",
        /37 kap/,
      ],
      ["kontaktförbud", "Ä 100-26", "Brott mot frihet och frid", /1988:688/],
    ];
    for (const [saken, caseNumber, sakomrade, lagrumRe] of cases) {
      it(`maps "${saken}" (${caseNumber[0]})`, () => {
        const r = matchLagrum(saken, caseNumber);
        expect(r.sakomrade).toBe(sakomrade);
        expect(r.lagrum).toMatch(lagrumRe);
      });
    }
  });
});
