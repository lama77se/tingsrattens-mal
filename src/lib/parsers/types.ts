export type FormatFamily = "standard" | "formatB" | "formatC" | "formatD" | "formatE";

export interface RawHearing {
  date: string;
  time: string;
  caseNumber: string;
  type: string;
  room: string;
  saken: string;
  parties: string;
}

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
  parties: string;
  lagrum: string;
  sakomrade: string;
  fleraSakfragor: boolean;
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
