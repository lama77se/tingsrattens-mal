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

  it("captures externalCourt when the Sal column holds a borrowed-facility name", () => {
    // Some Södertälje hearings are held at Attunda's facility — the Sal column
    // then contains "Attunda tingsrätt" instead of a Sal number.
    const text = build([
      `må${TAB}18-maj${TAB}09:00 - 16:30${TAB}Huvudförhandling${TAB}näringspenningtvätt, grovt brott${TAB}Attunda tingsrätt`,
    ]);
    const hearings = formatPositional.parse({ courtName: "Södertälje tingsrätt", text });
    expect(hearings).toHaveLength(1);
    expect(hearings[0]).toMatchObject({
      saken: "näringspenningtvätt, grovt brott",
      room: "",
      externalCourt: "Attunda tingsrätt",
    });
  });
});
