export interface CourtConfig {
  id: string;
  name: string;
  buildUrl: (week: number, year: number) => string;
}

const BASE = "https://www.domstol.se/globalassets/filer/domstol";

export const COURTS: CourtConfig[] = [
  {
    id: "solna_tingsratt",
    name: "Solna tingsrätt",
    buildUrl: (week, year) =>
      `${BASE}/solna_tingsratt/veckans-forhandlingar/v${week}.${year}.pdf`,
  },
  {
    id: "alingsas_tingsratt",
    name: "Alingsås tingsrätt",
    buildUrl: (week, year) =>
      `${BASE}/alingsas_tingsratt/veckans-brottmal/veckans-forhandlingar-vecka-${week}-${year}.pdf`,
  },
];
