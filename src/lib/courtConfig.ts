import { startOfISOWeek, addDays, format } from "date-fns";
import type { FormatFamily } from "./parsers/types";

export interface CourtConfig {
  id: string;
  name: string;
  formatFamily: FormatFamily;
  /** Return a single URL or an array of candidate URLs to try in order. */
  buildUrl: (week: number, year: number) => string | string[];
  /** If true, only fetch once (current week) — for courts that overwrite the same URL. */
  singleUrl?: boolean;
  /** y-coordinate tolerance for PDF row grouping. Higher values for table-style PDFs (Excel). Default: 3. */
  pdfYTolerance?: number;
  /** If true, court cannot be fetched — shown as info-only on the loading page. */
  disabled?: boolean;
  /** Note shown on the loading page (e.g., why a court is disabled). */
  note?: string;
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
    formatFamily: "standard",
    buildUrl: (week, year) =>
      `${BASE}/alingsas_tingsratt/veckans-brottmal/veckans-forhandlingar-vecka-${week}-${year}.pdf`,
  },
  {
    id: "attunda_tingsratt",
    name: "Attunda tingsrätt",
    formatFamily: "standard",
    buildUrl: (week, year) => {
      const monday = getISOWeekMonday(week, year);
      const friday = addDays(monday, 4);
      const monStr = format(monday, "yyyy-MM-dd");
      const friDay = format(friday, "dd");
      return `${BASE}/attunda_tingsratt/veckans-forhandlingar/webb-forhandlingar-v.${week}-${monStr}-${friDay}.pdf`;
    },
  },
  {
    id: "blekinge_tingsratt",
    name: "Blekinge tingsrätt",
    formatFamily: "standard",
    buildUrl: (week, year) =>
      `${BASE}/blekinge_tingsratt/block/veckans-forhandlingar-${year}/veckans-forhandlingar-vecka-${week}.pdf`,
  },
  {
    id: "solna_tingsratt",
    name: "Solna tingsrätt",
    formatFamily: "tabular",
    buildUrl: (week, year) =>
      `${BASE}/solna_tingsratt/veckans-forhandlingar/v${week}.${year}.pdf`,
  },
  {
    id: "stockholms_tingsratt",
    name: "Stockholms tingsrätt",
    formatFamily: "tabular",
    buildUrl: (week, year) => {
      const monday = getISOWeekMonday(week, year);
      const friday = addDays(monday, 4);
      const monStr = format(monday, "yyyy-MM-dd");
      const friStr = format(friday, "yyyy-MM-dd");
      return `${BASE}/stockholms_tingsratt/forhandlingar-${year}/forhandlingar-i-stockholms-tingsratt-vecka-${week}-${monStr}-till-och-med-${friStr}.pdf`;
    },
  },
  {
    id: "skaraborgs_tingsratt",
    name: "Skaraborgs tingsrätt",
    formatFamily: "tabular",
    buildUrl: (week) =>
      `${BASE}/skaraborgs_tingsratt/veckans-forhandlingar/vecka-${week}.pdf`,
  },
  {
    id: "boras_tingsratt",
    name: "Borås tingsrätt",
    formatFamily: "standard",
    buildUrl: (week) => [
      `${BASE}/boras_tingsratt/veckans_forhandlingar/veckans-forhandlingar-vecka-${week}.pdf`,
      `${BASE}/boras_tingsratt/veckans_forhandlingar/veckans-forhandlingar-vecka-${week - 1}-${week}.pdf`,
      `${BASE}/boras_tingsratt/veckans_forhandlingar/veckans-forhandlingar-vecka-${week}-${week + 1}.pdf`,
    ],
  },
  {
    id: "eksjo_tingsratt",
    name: "Eksjö tingsrätt",
    formatFamily: "tabular",
    singleUrl: true,
    buildUrl: () => `${BASE}/eksjo_tingsratt/schema/veckan.pdf`,
  },
  {
    id: "eskilstuna_tingsratt",
    name: "Eskilstuna tingsrätt",
    formatFamily: "standard",
    disabled: true,
    note: "Publicerar ej veckans förhandlingar online. Beställs via e-post.",
    buildUrl: () => "",
  },
  {
    id: "falu_tingsratt",
    name: "Falu tingsrätt",
    formatFamily: "standard",
    disabled: true,
    note: "Publicerar ej veckans förhandlingar online. Beställs via e-post.",
    buildUrl: () => "",
  },
  {
    id: "gallivare_tingsratt",
    name: "Gällivare tingsrätt",
    formatFamily: "standard",
    disabled: true,
    note: "Publicerar ej veckans förhandlingar online. Beställs via e-post.",
    buildUrl: () => "",
  },
  {
    id: "helsingborgs_tingsratt",
    name: "Helsingborgs tingsrätt",
    formatFamily: "standard",
    buildUrl: (week) =>
      `${BASE}/helsingborgs_tingsratt/kommande-rattegangar/kommande-rattegangar-vecka-${week}.pdf`,
  },
  {
    id: "halsinglands_tingsratt",
    name: "Hälsinglands tingsrätt",
    formatFamily: "standard",
    buildUrl: (week) =>
      `${BASE}/halsinglands_tingsratt/block/forhandlingar-v${week}.pdf`,
  },
  {
    id: "halmstads_tingsratt",
    name: "Halmstads tingsrätt",
    formatFamily: "standard",
    pdfYTolerance: 5,
    buildUrl: (week, year) =>
      `${BASE}/halmstads_tingsratt/veckans-forhandlingar/${year}/vecka-${week}.pdf`,
  },
  {
    id: "goteborgs_tingsratt",
    name: "Göteborgs tingsrätt",
    formatFamily: "standard",
    buildUrl: (week, year) => [
      `${BASE}/goteborgs_tingsratt/veckans-forhandlingar/webb_forhandlingar_v${week}_ii-${year}.pdf`,
      `${BASE}/goteborgs_tingsratt/veckans-forhandlingar/webb_forhandlingar_v${week}_i-${year}.pdf`,
      `${BASE}/goteborgs_tingsratt/veckans-forhandlingar/webb_forhandlingar_v${week}-${year}.pdf`,
    ],
  },
  {
    id: "gavle_tingsratt",
    name: "Gävle tingsrätt",
    formatFamily: "gavle",
    singleUrl: true,
    buildUrl: (_week, year) => {
      const now = new Date();
      const currentMonth = now.getMonth(); // 0-indexed
      const monthNames = [
        "januari", "februari", "mars", "april", "maj", "juni",
        "juli", "augusti", "september", "oktober", "november", "december",
      ];
      // Known misspellings on domstol.se
      const misspellings: Record<string, string[]> = {
        februari: ["februrai"],
      };
      const curr = monthNames[currentMonth];
      const prev = monthNames[(currentMonth + 11) % 12];
      const next = monthNames[(currentMonth + 1) % 12];
      const prevYear = currentMonth === 0 ? year - 1 : year;
      const nextYear = currentMonth === 11 ? year + 1 : year;

      const base = `${BASE}/gavle_tingsratt/veckans-forhandlingar/forhandlingar`;
      const urls: string[] = [];

      // current + next month
      urls.push(`${base}-${curr}-${next}-${nextYear}.pdf`);
      // prev + current month
      urls.push(`${base}-${prev}-${curr}-${year}.pdf`);
      // current month only
      urls.push(`${base}-${curr}-${year}.pdf`);

      // misspelled variants
      const currMisspellings = misspellings[curr] || [];
      const prevMisspellings = misspellings[prev] || [];
      const nextMisspellings = misspellings[next] || [];
      for (const alt of currMisspellings) {
        urls.push(`${base}-${alt}-${next}-${nextYear}.pdf`);
        urls.push(`${base}-${prev}-${alt}-${year}.pdf`);
        urls.push(`${base}-${alt}-${year}.pdf`);
      }
      for (const alt of prevMisspellings) {
        urls.push(`${base}-${alt}-${curr}-${year}.pdf`);
      }
      for (const alt of nextMisspellings) {
        urls.push(`${base}-${curr}-${alt}-${nextYear}.pdf`);
      }

      return urls;
    },
  },
  {
    id: "haparanda_tingsratt",
    name: "Haparanda tingsrätt",
    formatFamily: "schema",
    buildUrl: (week, year) => {
      const base = `${BASE}/haparanda_tingsratt/veckans-forhandlingar/huvudforhandlingar-vecka`;
      const prev = week - 1;
      const next = week + 1;
      return [
        `${base}-${week}-och-${next}.pdf`,
        `${base}-${prev}-och-${week}.pdf`,
        `${base}-${week}-och-vecka-${next}.pdf`,
        `${base}-${prev}-och-vecka-${week}.pdf`,
        `${base}-${week}-och-${next}-${year}.pdf`,
        `${base}-${prev}-och-${week}-${year}.pdf`,
        `${base}-${week}-och-vecka-${next}-${year}.pdf`,
        `${base}-${prev}-och-vecka-${week}-${year}.pdf`,
      ];
    },
  },
  {
    id: "hassleholms_tingsratt",
    name: "Hässleholms tingsrätt",
    formatFamily: "tabular",
    buildUrl: (week) =>
      `${BASE}/hassleholms_tingsratt/uppropslistor/uppropslista-hassleholms-tingsratt-v.${String(week).padStart(2, "0")}.pdf`,
  },
  {
    id: "jonkopings_tingsratt",
    name: "Jönköpings tingsrätt",
    formatFamily: "tabular",
    buildUrl: (week, year) => [
      `${BASE}/jonkopings_tingsratt/veckans-forhandlingar/vecka-${week}-${year}.pdf`,
      `${BASE}/jonkopings_tingsratt/vecka-${week}-${year}.pdf`,
    ],
  },
  {
    id: "kristianstads_tingsratt",
    name: "Kristianstads tingsrätt",
    formatFamily: "tabular",
    buildUrl: (week, year) => {
      const monday = getISOWeekMonday(week, year);
      const endDate = addDays(monday, 12);
      const monStr = format(monday, "yyMMdd");
      const endStr = format(endDate, "MMdd");
      return `${BASE}/kristianstads_tingsratt/webb-forhandlingar-${monStr}-${endStr}.pdf`;
    },
  },
  {
    id: "linkopings_tingsratt",
    name: "Linköpings tingsrätt",
    formatFamily: "tabular",
    buildUrl: (week) =>
      `${BASE}/linkopings_tingsratt/veckans-forhandlingar/v${week}.pdf`,
  },
  {
    id: "lunds_tingsratt",
    name: "Lunds tingsrätt",
    formatFamily: "schema",
    buildUrl: (week) => [
      `${BASE}/lunds_tingsratt/veckans-forhandlingar/vecka-${week}.pdf`,
      `${BASE}/lunds_tingsratt/veckans-forhandlingar/vecka-${String(week).padStart(2, "0")}.pdf`,
    ],
  },
  {
    id: "malmo_tingsratt",
    name: "Malmö tingsrätt",
    formatFamily: "schema",
    buildUrl: (week) =>
      `${BASE}/malmo_tingsratt/veckans_forhandlingar/forhandlingar-vecka-${week}.pdf`,
  },
  {
    id: "mora_tingsratt",
    name: "Mora tingsrätt",
    formatFamily: "tabular",
    buildUrl: (week) => [
      `${BASE}/mora_tingsratt/block/vecka-${week}-${week + 1}.pdf`,
      `${BASE}/mora_tingsratt/block/vecka-${week - 1}-${week}.pdf`,
    ],
  },
  {
    id: "norrkopings_tingsratt",
    name: "Norrköpings tingsrätt",
    formatFamily: "tabular",
    buildUrl: (week, year) => [
      `${BASE}/norrkopings_tingsratt/veckans_forhandlingar/schema-forhandlingar-vecka-${week}-${year}.pdf`,
      `${BASE}/norrkopings_tingsratt/veckans_forhandlingar/schema-forhandlingar-vecka-${week}-${week + 1}-${year}.pdf`,
      `${BASE}/norrkopings_tingsratt/veckans_forhandlingar/schema-forhandlingar-vecka-${week - 1}-${week}-${year}.pdf`,
    ],
  },
  {
    id: "nykopings_tingsratt",
    name: "Nyköpings tingsrätt",
    formatFamily: "tabular",
    buildUrl: (week, year) => [
      `${BASE}/nykopings_tingsratt/veckans-forhandlingar/nykopings-tingsratt-schema-vecka-${week}-${year}.pdf`,
      `${BASE}/nykopings_tingsratt/veckans-forhandlingar/schema-forhandlingar-vecka-${week}-${year}.pdf`,
    ],
  },
  {
    id: "nacka_tingsratt",
    name: "Nacka tingsrätt",
    formatFamily: "tabular",
    buildUrl: (week, year) =>
      `${BASE}/nacka_tingsratt/veckans-forhandlingar/${year}/v.${week}.pdf`,
  },
  {
    id: "lulea_tingsratt",
    name: "Luleå tingsrätt",
    formatFamily: "standard",
    disabled: true,
    note: "Publicerar ej veckans förhandlingar online. Beställs via e-post.",
    buildUrl: () => "",
  },
  {
    id: "lycksele_tingsratt",
    name: "Lycksele tingsrätt",
    formatFamily: "standard",
    disabled: true,
    note: "Publicerar ej veckans förhandlingar online. Beställs via e-post.",
    buildUrl: () => "",
  },
  {
    id: "kalmar_tingsratt",
    name: "Kalmar tingsrätt",
    formatFamily: "standard",
    disabled: true,
    note: "Publicerar ej veckans förhandlingar online. Beställs via e-post.",
    buildUrl: () => "",
  },
  {
    id: "gotlands_tingsratt",
    name: "Gotlands tingsrätt",
    formatFamily: "standard",
    disabled: true,
    note: "Publicerar ej veckans förhandlingar online. Beställs via e-post.",
    buildUrl: () => "",
  },
  {
    id: "sundsvalls_tingsratt",
    name: "Sundsvalls tingsrätt",
    formatFamily: "tabular",
    buildUrl: (week) =>
      `${BASE}/sundsvalls_tingsratt/block/v.-${week}.pdf`,
  },
  {
    id: "uddevalla_tingsratt",
    name: "Uddevalla tingsrätt",
    formatFamily: "tabular",
    buildUrl: (week) =>
      `${BASE}/uddevalla_tingsratt/veckans-mal/veckans-mal-v.${week}.pdf`,
  },
  {
    id: "sodertalje_tingsratt",
    name: "Södertälje tingsrätt",
    formatFamily: "standard",
    disabled: true,
    note: "Publicerar ej veckans förhandlingar online. Beställs via e-post.",
    buildUrl: () => "",
  },
  {
    id: "skelleftea_tingsratt",
    name: "Skellefteå tingsrätt",
    formatFamily: "standard",
    disabled: true,
    note: "Publicerar ej veckans förhandlingar online. Beställs via e-post.",
    buildUrl: () => "",
  },
  {
    id: "umea_tingsratt",
    name: "Umeå tingsrätt",
    formatFamily: "standard",
    disabled: true,
    note: "Publicerar ej veckans förhandlingar online. Beställs via e-post.",
    buildUrl: () => "",
  },
  {
    id: "varbergs_tingsratt",
    name: "Varbergs tingsrätt",
    formatFamily: "tabular",
    singleUrl: true,
    buildUrl: (week) => {
      const base = `${BASE}/varbergs_tingsratt/scheman/webb-forhandlingar`;
      return [
        `${base}-v-${week}-${week + 2}.pdf`,
        `${base}-v-${week - 1}-${week + 1}.pdf`,
        `${base}-v-${week - 2}-${week}.pdf`,
        `${base}-v-${week}-${week + 1}.pdf`,
        `${base}-v-${week - 1}-${week}.pdf`,
      ];
    },
  },
  {
    id: "uppsala_tingsratt",
    name: "Uppsala tingsrätt",
    formatFamily: "tabular",
    buildUrl: (week) => [
      `${BASE}/uppsala_tingsratt/veckans-forhandlingar/forhandlingslista-v.-${week}.pdf`,
      `${BASE}/uppsala_tingsratt/veckans-forhandlingar/forhandlingslista-v-${week}.pdf`,
    ],
  },
  {
    id: "vanersborgs_tingsratt",
    name: "Vänersborgs tingsrätt",
    formatFamily: "tabular",
    buildUrl: (week) =>
      `${BASE}/vanersborgs_tingsratt/veckans_forhandlingar/v${week}.pdf`,
  },
  {
    id: "varmlands_tingsratt",
    name: "Värmlands tingsrätt",
    formatFamily: "tabular",
    buildUrl: (week) =>
      `${BASE}/varmlands_tingsratt/veckans-forhandlingar/vecka-${week}.pdf`,
  },
  {
    id: "vastmanlands_tingsratt",
    name: "Västmanlands tingsrätt",
    formatFamily: "tabular",
    buildUrl: (week, year) =>
      `${BASE}/vastmanlands_tingsratt/veckans-forhandlingar/vastmanlands-tingsratt-vecka-${year % 10}${String(week).padStart(2, "0")}.pdf`,
  },
  {
    id: "vaxjo_tingsratt",
    name: "Växjö tingsrätt",
    formatFamily: "tabular",
    buildUrl: (week) =>
      `${BASE}/vaxjo_tingsratt/veckans-forhandlingar/webb-forhandlingar-ad-v.${week}.pdf`,
  },
  {
    id: "ystads_tingsratt",
    name: "Ystads tingsrätt",
    formatFamily: "standard",
    disabled: true,
    note: "Publicerar ej veckans förhandlingar online. Beställs via e-post.",
    buildUrl: () => "",
  },
  {
    id: "angermanlands_tingsratt",
    name: "Ångermanlands tingsrätt",
    formatFamily: "tabular",
    buildUrl: (week) =>
      `${BASE}/angermanlands_tingsratt/veckans-forhandlingar/v-${week}.pdf`,
  },
  {
    id: "orebro_tingsratt",
    name: "Örebro tingsrätt",
    formatFamily: "tabular",
    buildUrl: () =>
      `${BASE}/orebro_tingsratt/schema/schema39.pdf`,
  },
  {
    id: "norrtalje_tingsratt",
    name: "Norrtälje tingsrätt",
    formatFamily: "standard",
    disabled: true,
    note: "Publicerar ej veckans förhandlingar online. Beställs via e-post.",
    buildUrl: () => "",
  },
  {
    id: "ostersunds_tingsratt",
    name: "Östersunds tingsrätt",
    formatFamily: "standard",
    disabled: true,
    note: "Publicerar ej veckans förhandlingar online. Beställs via e-post.",
    buildUrl: () => "",
  },
];
