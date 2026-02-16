import { startOfISOWeek, addDays, format } from "date-fns";

export interface CourtConfig {
  id: string;
  name: string;
  buildUrl: (week: number, year: number) => string;
}

const BASE = "https://www.domstol.se/globalassets/filer/domstol";

function getISOWeekMonday(week: number, year: number): Date {
  const jan4 = new Date(year, 0, 4);
  const startOfWeek1 = startOfISOWeek(jan4);
  return addDays(startOfWeek1, (week - 1) * 7);
}

export const COURTS: CourtConfig[] = [
  {
    id: "alingsas_tingsratt",
    name: "Alingsås tingsrätt",
    buildUrl: (week, year) =>
      `${BASE}/alingsas_tingsratt/veckans-brottmal/veckans-forhandlingar-vecka-${week}-${year}.pdf`,
  },
  {
    id: "attunda_tingsratt",
    name: "Attunda tingsrätt",
    buildUrl: (week, year) => {
      const monday = getISOWeekMonday(week, year);
      const friday = addDays(monday, 4);
      const monStr = format(monday, "yyyy-MM-dd");
      const friDay = format(friday, "dd");
      return `${BASE}/attunda_tingsratt/veckans-forhandlingar/webb-forhandlingar-v.${week}-${monStr}-${friDay}.pdf`;
    },
  },
  {
    id: "solna_tingsratt",
    name: "Solna tingsrätt",
    buildUrl: (week, year) =>
      `${BASE}/solna_tingsratt/veckans-forhandlingar/v${week}.${year}.pdf`,
  },
];
