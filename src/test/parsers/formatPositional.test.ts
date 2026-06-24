import { describe, expect, it } from "vitest";
import { formatPositional } from "../../lib/parsers/formatPositional";

const TAB = "\t";

function build(rows: string[]): string {
  return rows.join("\n");
}

describe("formatPositional", () => {
  it("parses one PDF visual row into one hearing", () => {
    const text = build([
      "Förhandlingar i Halmstads tingsrätt, vecka 21",
      `Dag${TAB}Datum${TAB}Förhandlingstid${TAB}Typ av förhandling${TAB}Målnummer${TAB}Saken${TAB}Sal`,
      `må${TAB}2026-05-18${TAB}09:00 - 10:00${TAB}Huvudförhandling${TAB}B 375-26${TAB}penningtvättsbrott${TAB}Sal 2`,
    ]);
    const hearings = formatPositional.parse({ courtName: "Halmstads tingsrätt", text });
    expect(hearings).toHaveLength(1);
    expect(hearings[0]).toMatchObject({
      date: "2026-05-18",
      time: "09:00 - 10:00",
      caseNumber: "B 375-26",
      type: "Huvudförhandling",
      saken: "penningtvättsbrott",
      room: "Sal 2",
    });
  });

  it("regression: B 1165-26 keeps its own saken when a multi-line saken appears earlier", () => {
    // The PDF's saken cell for T 2163-25 wraps onto a second physical row
    // ("äktenskapsskillnad med frågor om vårdnad, / boende, umgänge").
    // Default pdf-parse linearisation desyncs columns from here on, which is
    // the bug this format family exists to fix. Verify the wrap is harmless.
    const text = build([
      `to${TAB}2026-05-21${TAB}09:00 - 16:00${TAB}Huvudförhandling${TAB}T 2163-25${TAB}äktenskapsskillnad med frågor om vårdnad,${TAB}Sal 4`,
      "boende, umgänge",
      `to${TAB}2026-05-21${TAB}10:00 - 11:00${TAB}Huvudförhandling${TAB}B 1165-26${TAB}våldsamt motstånd${TAB}Sal 3`,
      `to${TAB}2026-05-21${TAB}10:00 - 12:00${TAB}Sammanträde${TAB}Ä 3401-25${TAB}försäljning enligt lagen om samäganderätt${TAB}Sal 5`,
    ]);
    const hearings = formatPositional.parse({ courtName: "Halmstads tingsrätt", text });
    expect(hearings).toHaveLength(3);
    expect(hearings[0]).toMatchObject({
      caseNumber: "T 2163-25",
      saken: "äktenskapsskillnad med frågor om vårdnad, boende, umgänge",
    });
    expect(hearings[1]).toMatchObject({
      caseNumber: "B 1165-26",
      saken: "våldsamt motstånd",
      room: "Sal 3",
    });
    expect(hearings[2]).toMatchObject({
      caseNumber: "Ä 3401-25",
      saken: "försäljning enligt lagen om samäganderätt",
    });
  });

  it("does not merge orphan column-wrap text without a comma signal", () => {
    // "Muntlig förberedelse och" wraps to "ev hf" on the next visual row.
    // Without the trailing-comma signal, "ev hf" must NOT be appended to the
    // previous hearing's saken.
    const text = build([
      `fr${TAB}2026-05-22${TAB}09:00 - 11:00${TAB}Muntlig förberedelse och T 1037-26${TAB}faderskap${TAB}Sal 4`,
      "ev hf",
      `fr${TAB}2026-05-22${TAB}09:00 - 16:00${TAB}Huvudförhandling${TAB}T 2582-24${TAB}umgänge${TAB}Sal 3`,
    ]);
    const hearings = formatPositional.parse({ courtName: "Halmstads tingsrätt", text });
    expect(hearings).toHaveLength(2);
    expect(hearings[0]).toMatchObject({
      caseNumber: "T 1037-26",
      type: "Muntlig förberedelse",
      saken: "faderskap",
    });
    expect(hearings[1].saken).toBe("umgänge");
  });

  it("skips header and intro lines", () => {
    const text = build([
      "Förhandlingar i Halmstads tingsrätt, vecka 21",
      "Listan är preliminär. Förhandlingar kan ställas in med kort varsel och andra kan tillkomma.",
      `Dag${TAB}Datum${TAB}Förhandlingstid${TAB}Typ av förhandling${TAB}Målnummer${TAB}Saken${TAB}Sal`,
      `må${TAB}2026-05-18${TAB}09:00 - 12:00${TAB}Huvudförhandling${TAB}B 924-26${TAB}djurplågeri${TAB}Sal 3`,
    ]);
    const hearings = formatPositional.parse({ courtName: "Halmstads tingsrätt", text });
    expect(hearings).toHaveLength(1);
    expect(hearings[0].caseNumber).toBe("B 924-26");
  });

  it("returns no hearings for empty input", () => {
    expect(formatPositional.parse({ courtName: "X", text: "" })).toHaveLength(0);
    expect(formatPositional.parse({ courtName: "X", text: "   \n  " })).toHaveLength(0);
  });

  it("parses Södertälje rows that lack a case-number column", () => {
    // Södertälje's PDF omits the Målnummer column entirely. Hearings must
    // still be extracted, anchored on the time-range column.
    const text = build([
      "Förhandlingar i Södertälje tingsrätt, vecka 21, 18-22 maj 2026.",
      "Tingsrätten vill framhålla att listan är preliminär.",
      `Dag${TAB}Datum${TAB}Förhandlingstid${TAB}Typ av förhandling${TAB}Saken${TAB}Sal`,
      `må${TAB}18-maj${TAB}09:00 - 12:00${TAB}Huvudförhandling${TAB}sexuellt ofredande mot barn${TAB}Sal 2`,
      `må${TAB}18-maj${TAB}09:40 - 10:00${TAB}Edgångssmtr${TAB}ansökan om konkurs${TAB}Sal 6`,
    ]);
    const hearings = formatPositional.parse({ courtName: "Södertälje tingsrätt", text });
    expect(hearings).toHaveLength(2);
    expect(hearings[0]).toMatchObject({
      time: "09:00 - 12:00",
      type: "Huvudförhandling",
      caseNumber: "",
      saken: "sexuellt ofredande mot barn",
      room: "Sal 2",
    });
    // Date is filled by extractShortDate (uses runtime year — assert MM-DD only).
    expect(hearings[0].date).toMatch(/-05-18$/);
    // "Edgångssmtr" normalised to the canonical "Edgångssammanträde".
    expect(hearings[1].type).toBe("Edgångssammanträde");
  });

  it("Värmland: merges wrapped saken when there is no Sal column", () => {
    // Värmland's PDF lacks a Sal column entirely. Long sakens wrap to the next
    // physical row without any in-text signal (no trailing comma). The merge
    // is triggered by the previous hearing having neither room nor location.
    const text = build([
      `må${TAB}2026-05-25${TAB}09:00 - 16:00${TAB}Huvudförhandling${TAB}B 1861-25${TAB}synnerligen grovt`,
      "narkotikabrott m.m",
      `må${TAB}2026-05-25${TAB}15:15 - 16:00${TAB}Muntlig förhandling${TAB}B 1340-26${TAB}undanröjande av`,
      "villkorlig dom med",
      "samhällstjänst",
      `to${TAB}2026-05-28${TAB}13:45 - 14:15${TAB}Huvudförhandling${TAB}B 1955-26${TAB}brott mot lagen om`,
      "förbud beträffande",
      "knivar och andra",
      "farliga föremål",
    ]);
    const hearings = formatPositional.parse({ courtName: "Värmlands tingsrätt", text });
    expect(hearings).toHaveLength(3);
    expect(hearings[0]).toMatchObject({
      caseNumber: "B 1861-25",
      saken: "synnerligen grovt narkotikabrott m.m",
      room: "",
    });
    expect(hearings[1]).toMatchObject({
      caseNumber: "B 1340-26",
      saken: "undanröjande av villkorlig dom med samhällstjänst",
    });
    expect(hearings[2]).toMatchObject({
      caseNumber: "B 1955-26",
      saken: "brott mot lagen om förbud beträffande knivar och andra farliga föremål",
    });
  });

  it("Värmland: skips (dag X/Y) annotations and type-column wraps", () => {
    // "(dag 1/2)" is a multi-day annotation that must not be appended to
    // saken. "förberedelse" / "g" alone are type-column wraps from
    // "Muntlig\nförberedelse" / "Konkursförhandlin\ng" — also not saken.
    const text = build([
      `må${TAB}2026-05-25${TAB}09:30 - 16:00${TAB}Huvudförhandling${TAB}T 2102-25${TAB}skadestånd m m`,
      "(dag 1/2)",
      `må${TAB}2026-05-25${TAB}10:00 - 12:00${TAB}Muntlig${TAB}T 6858-25${TAB}arbetsrätt`,
      "förberedelse",
      `ti${TAB}2026-05-26${TAB}09:15 - 09:30${TAB}Konkursförhandlin${TAB}K 2557-26${TAB}ansökan om konkurs`,
      "g",
    ]);
    const hearings = formatPositional.parse({ courtName: "Värmlands tingsrätt", text });
    expect(hearings).toHaveLength(3);
    expect(hearings[0].saken).toBe("skadestånd m m");
    expect(hearings[1].saken).toBe("arbetsrätt");
    expect(hearings[2].saken).toBe("ansökan om konkurs");
  });

  it("captures location when the Sal column holds another court's name", () => {
    // Some Södertälje hearings are held at Attunda's facility — the Sal column
    // then contains "Attunda tingsrätt" instead of a Sal number. That means
    // "this Södertälje case is at Attunda" — so it goes into `location`
    // (which enrichment renders as "Södertälje tingsrätt (plats: Attunda
    // tingsrätt)"), NOT `externalCourt` (which would invert the direction).
    const text = build([
      `må${TAB}18-maj${TAB}09:00 - 16:30${TAB}Huvudförhandling${TAB}näringspenningtvätt, grovt brott${TAB}Attunda tingsrätt`,
    ]);
    const hearings = formatPositional.parse({ courtName: "Södertälje tingsrätt", text });
    expect(hearings).toHaveLength(1);
    expect(hearings[0]).toMatchObject({
      saken: "näringspenningtvätt, grovt brott",
      room: "",
      location: "Attunda tingsrätt",
    });
    expect(hearings[0].externalCourt).toBeUndefined();
  });

  it("Eskilstuna: completes a time range whose end wraps to the next row", () => {
    // Eskilstuna stacks the time range vertically: the start ("09:00 -") sits
    // on the hearing row and the end ("16:00") wraps to the next physical row,
    // sometimes alongside a "(dag X/Y)" annotation, sometimes alone. The end
    // time must be folded back into the range and never leak into saken.
    const text = build([
      `Datum${TAB}Tid${TAB}Mötestyp${TAB}Målnummer${TAB}Saken${TAB}Lokal`,
      `må${TAB}2026-06-15${TAB}09:00 -${TAB}Huvudförhandling${TAB}B 2528-23${TAB}grov våldtäkt mot barn m.m.${TAB}Sal 5`,
      `(dag 4/6)${TAB}16:00`,
      `må${TAB}2026-06-15${TAB}09:00 -${TAB}Huvudförhandling${TAB}B 1860-26${TAB}misshandel mm${TAB}Sal 4`,
      "16:00",
    ]);
    const hearings = formatPositional.parse({ courtName: "Eskilstuna tingsrätt", text });
    expect(hearings).toHaveLength(2);
    expect(hearings[0]).toMatchObject({
      date: "2026-06-15",
      time: "09:00 - 16:00",
      caseNumber: "B 2528-23",
      type: "Huvudförhandling",
      saken: "grov våldtäkt mot barn m.m.",
      room: "Sal 5",
    });
    expect(hearings[1]).toMatchObject({
      time: "09:00 - 16:00",
      caseNumber: "B 1860-26",
      saken: "misshandel mm",
      room: "Sal 4",
    });
  });
});
