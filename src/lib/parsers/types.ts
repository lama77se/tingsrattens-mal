export type FormatFamily = "standard" | "tabular" | "gavle" | "schema" | "positional" | "formatD" | "formatE";

export interface RawHearing {
  date: string;
  time: string;
  caseNumber: string;
  type: string;
  room: string;
  saken: string;
  parties: string;
  /** Physical hearing location (e.g. sub-court "Kalix tingshus") — used by schema format. */
  location?: string;
  /** External court using this court's facilities (e.g. "Solna tingsrätt" in Stockholm's PDF). */
  externalCourt?: string;
}

/**
 * Note: there is no `parties` field. The PDFs sometimes contain party names
 * (i.e. personal data under GDPR), so we intentionally drop them at the
 * enrichment boundary — the public UI displays only the saken/case# columns
 * that domstol.se itself publishes. `RawHearing.parties` is captured by some
 * parsers but never propagates past `enrichHearing`.
 */
export interface Hearing {
  id: string;
  date: string;
  time: string;
  court: string;
  caseNumber: string;
  type: string;
  maltyp: string;
  room: string;
  saken: string;
  lagrum: string;
  sakomrade: string;
  fleraSakfragor: boolean;
  pdfUrl?: string;
}

export interface ParserContext {
  courtName: string;
  text: string;
}

export interface ParserStrategy {
  readonly name: string;
  readonly formatFamily: FormatFamily;
  parse(ctx: ParserContext): RawHearing[];
}
