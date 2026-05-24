import { startOfISOWeek, addDays, format } from "date-fns";
import type { FormatFamily } from "./parsers/types";
import type { ScrapedPdfLink } from "./scrapePdfLinks";

export type { ScrapedPdfLink };

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
  /** If set, scrape this HTML page to discover the PDF URL instead of using `buildUrl`. */
  listingUrl?: string;
  /** Pick the target PDF from a scraped listing. Return null if no match. */
  pickFromListing?: (
    pdfs: ScrapedPdfLink[],
    week: number,
    year: number
  ) => string | null;
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
      const thursday = addDays(monday, 3);
      const monStr = format(monday, "yyyy-MM-dd");
      const base = `${BASE}/attunda_tingsratt/veckans-forhandlingar/webb-forhandlingar-v.${week}-${monStr}`;
      const candidates: string[] = [];
      // Generate URL variants for both Friday and Thursday (holidays shorten the week)
      for (const endDay of [friday, thursday]) {
        const crossMonth = monday.getMonth() !== endDay.getMonth();
        const endStr = crossMonth ? format(endDay, "MM-dd") : format(endDay, "dd");
        candidates.push(`${base}--${endStr}.pdf`);
      }
      return candidates;
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
      const thursday = addDays(monday, 3);
      const monStr = format(monday, "yyyy-MM-dd");
      const friStr = format(friday, "yyyy-MM-dd");
      const thuStr = format(thursday, "yyyy-MM-dd");
      const base = `${BASE}/stockholms_tingsratt/forhandlingar-${year}/forhandlingar-i-stockholms-tingsratt-vecka-${week}-${monStr}-till-och-med-`;
      // Try Friday first, then Thursday (holidays like Långfredagen shorten the week)
      return [
        `${base}${friStr}.pdf`,
        `${base}${thuStr}.pdf`,
      ];
    },
  },
  {
    id: "skaraborgs_tingsratt",
    name: "Skaraborgs tingsrätt",
    formatFamily: "tabular",
    buildUrl: (week) => [
      `${BASE}/skaraborgs_tingsratt/veckans-forhandlingar/vecka-${week}.pdf`,
      `${BASE}/skaraborgs_tingsratt/veckans-forhandlingar/vecka-${week}-${week + 1}.pdf`,
      `${BASE}/skaraborgs_tingsratt/veckans-forhandlingar/vecka-${week - 1}-${week}.pdf`,
    ],
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
    // Filenames are inconsistent — observed "forhandlingar-v19.pdf",
    // "forhandllingar-v19.pdf" (typo), "forhandlingar-vecka-20.pdf" — so we
    // scrape the listing page and match by week number.
    listingUrl:
      "https://www.domstol.se/halsinglands-tingsratt/om-tingsratten/aktuellt/planerade-forhandlingar/",
    pickFromListing: (pdfs, week) => {
      const match = pdfs.find((p) => {
        const weekInText = new RegExp(`\\bvecka\\s*0*${week}\\b`, "i").test(p.text);
        const weekInHref = new RegExp(`v\\.?-?0*${week}(?![\\d])`, "i").test(p.href);
        return weekInText || weekInHref;
      });
      return match?.href ?? null;
    },
    buildUrl: () => [],
  },
  {
    id: "halmstads_tingsratt",
    name: "Halmstads tingsrätt",
    formatFamily: "positional",
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
    // Filenames are manually chosen by court staff (e.g. "forhandlingar-vecka-16-22.pdf"),
    // so we scrape the listing page rather than guess.
    listingUrl:
      "https://www.domstol.se/gavle-tingsratt/om-tingsratten/aktuellt/veckans-forhandlingar/",
    pickFromListing: (pdfs) => pdfs[0]?.href ?? null,
    buildUrl: () => [],
  },
  {
    id: "haparanda_tingsratt",
    name: "Haparanda tingsrätt",
    formatFamily: "schema",
    buildUrl: (week, year) => {
      const base = `${BASE}/haparanda_tingsratt/veckans-forhandlingar/huvudforhandlingar-vecka`;
      const prev = week - 1;
      const next = week + 1;
      // Prioritize year-based and "och-vecka" variants (most likely to be published)
      return [
        `${base}-${week}-och-vecka-${next}-${year}.pdf`,
        `${base}-${prev}-och-vecka-${week}-${year}.pdf`,
        `${base}-${week}-och-${next}-${year}.pdf`,
        `${base}-${prev}-och-${week}-${year}.pdf`,
        `${base}-${week}-och-vecka-${next}.pdf`,
        `${base}-${prev}-och-vecka-${week}.pdf`,
        `${base}-${week}-och-${next}.pdf`,
        `${base}-${prev}-och-${week}.pdf`,
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
    singleUrl: true,
    // Rolling multi-week PDF with arbitrary date range in the filename,
    // so we scrape the listing page rather than guess.
    listingUrl:
      "https://www.domstol.se/kristianstads-tingsratt/om-tingsratten/aktuellt/veckans-forhandlingar/",
    pickFromListing: (pdfs) => pdfs[0]?.href ?? null,
    buildUrl: () => [],
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
      `${BASE}/lunds_tingsratt/veckans-forhandlingar/v.-${week}.pdf`,
      `${BASE}/lunds_tingsratt/veckans-forhandlingar/veckaa-${week}.pdf`,
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
    formatFamily: "positional",
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
    id: "sodertorns_tingsratt",
    name: "Södertörns tingsrätt",
    formatFamily: "positional",
    buildUrl: (week, year) =>
      `${BASE}/sodertorns_tingsratt/veckans_forhandlingar/${year}/veckans-forhandlingar-vecka-${week}.pdf`,
  },
  {
    id: "sodertalje_tingsratt",
    name: "Södertälje tingsrätt",
    formatFamily: "positional",
    buildUrl: (week, year) => {
      const monday = getISOWeekMonday(week, year);
      const friday = addDays(monday, 4);
      const thursday = addDays(monday, 3);
      const monStr = format(monday, "yyyy-MM-dd");
      const candidates: string[] = [];
      // Friday-end first, then Thursday-end (holiday-shortened weeks).
      // Södertälje always uses MM-dd for the end date, including in same-month weeks.
      for (const endDay of [friday, thursday]) {
        const endStr = format(endDay, "MM-dd");
        candidates.push(
          `${BASE}/sodertalje_tingsratt/webb-forhandlingar-${monStr}--${endStr}.pdf`
        );
      }
      return candidates;
    },
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
        `${base}-v-${week}-${week + 3}.pdf`,
        `${base}-v-${week - 1}-${week + 2}.pdf`,
        `${base}-v-${week - 2}-${week + 1}.pdf`,
        `${base}-v-${week - 3}-${week}.pdf`,
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
    formatFamily: "positional",
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
    // Filenames are inconsistent (observed: "v.18-ny.pdf", "ny-v17.pdf"),
    // so we scrape the listing page and match by week number.
    listingUrl:
      "https://www.domstol.se/angermanlands-tingsratt/om-tingsratten/aktuellt/veckans-forhandlingar/",
    pickFromListing: (pdfs, week) => {
      const match = pdfs.find((p) => {
        const weekInText = new RegExp(`\\bvecka\\s*0*${week}\\b`, "i").test(p.text);
        const weekInHref = new RegExp(`v\\.?-?0*${week}(?![\\d])`, "i").test(p.href);
        return weekInText || weekInHref;
      });
      return match?.href ?? null;
    },
    buildUrl: () => [],
  },
  {
    id: "orebro_tingsratt",
    name: "Örebro tingsrätt",
    formatFamily: "tabular",
    singleUrl: true,
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
