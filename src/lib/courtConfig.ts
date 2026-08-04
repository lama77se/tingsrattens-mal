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
  /**
   * Pick the target PDF(s) from a scraped listing. Return a single URL, an
   * array of URLs (all fetched and merged), or null/[] if nothing matched.
   */
  pickFromListing?: (
    pdfs: ScrapedPdfLink[],
    week: number,
    year: number
  ) => string | string[] | null;
}

const BASE = "https://www.domstol.se/globalassets/filer/domstol";

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
    // Filenames embed an unpredictable date range with irregular dashes
    // (webb-forhandlingar-v.29-2026-07-13---17.pdf, and even messier for
    // cross-month weeks), so we scrape the listing page and match by week
    // number rather than reconstructing the filename.
    listingUrl:
      "https://www.domstol.se/attunda-tingsratt/om-tingsratten/aktuellt/veckans-forhandlingar2/",
    pickFromListing: (pdfs, week) =>
      pdfs
        .filter((p) => {
          const weekInHref = new RegExp(`v\\.?-?0*${week}(?![\\d])`, "i").test(p.href);
          const weekInText = new RegExp(`\\bvecka\\s*0*${week}\\b`, "i").test(p.text);
          return weekInHref || weekInText;
        })
        .map((p) => p.href),
    buildUrl: () => [],
  },
  {
    id: "blekinge_tingsratt",
    name: "Blekinge tingsrätt",
    formatFamily: "standard",
    // Filenames are inconsistent — most weeks use "vecka", but some PDFs are
    // published with the typo "veckka" (double k) — so we scrape the listing
    // page and match by week number rather than guessing the spelling.
    listingUrl:
      "https://www.domstol.se/blekinge-tingsratt/om-tingsratten/aktuellt/veckans-forhandlingar/",
    pickFromListing: (pdfs, week) =>
      pdfs
        .filter((p) => {
          const weekInHref = new RegExp(`veckka?-0*${week}(?![\\d])`, "i").test(p.href);
          const weekInText = new RegExp(`\\bvecka\\s*0*${week}\\b`, "i").test(p.text);
          return weekInHref || weekInText;
        })
        .map((p) => p.href),
    buildUrl: () => [],
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
    // Filenames embed the week (or a week range) plus a date range, e.g.
    //   ...vecka-27-2026-06-29-till-och-med-2026-07-03.pdf    (single week)
    //   ...vecka-28-34-2026-07-03-till-och-med-2026-08-21.pdf (weeks 28-34)
    // and the court switches to a multi-week bundle over the summer, so
    // reconstructing a single-week date-based filename 404s. Scrape the listing
    // and match the requested week against single weeks and ranges. The href
    // regex requires a 4-digit year immediately after the week/range token so
    // the year is never read as the range's high end (vecka-27-2026 -> week 27,
    // not weeks 27-2026).
    listingUrl:
      "https://www.domstol.se/stockholms-tingsratt/om-tingsratten/aktuellt/veckans-forhandlingar/",
    pickFromListing: (pdfs, week) =>
      pdfs
        .filter((p) => {
          const m =
            /vecka-0*(\d{1,2})(?:-0*(\d{1,2}))?-\d{4}-/i.exec(p.href) ||
            /\bvecka\s*0*(\d+)(?:\s*-\s*0*(\d+))?/i.exec(p.text);
          if (!m) return false;
          const lo = Number(m[1]);
          const hi = m[2] ? Number(m[2]) : lo;
          return week >= lo && week <= hi;
        })
        .map((p) => p.href),
    buildUrl: () => [],
  },
  {
    id: "skaraborgs_tingsratt",
    name: "Skaraborgs tingsrätt",
    formatFamily: "tabular",
    // Skaraborg publishes a single PDF covering an arbitrary week range
    // (e.g. vecka-26-28.pdf), so scrape the listing page and match the
    // requested week against single weeks and ranges.
    listingUrl:
      "https://www.domstol.se/skaraborgs-tingsratt/om-tingsratten/aktuellt/veckans-forhandlingar/",
    pickFromListing: (pdfs, week) =>
      pdfs
        .filter((p) => {
          const m =
            /vecka-0*(\d+)(?:-0*(\d+))?\.pdf/i.exec(p.href) ||
            /\bvecka\s*0*(\d+)(?:\s*-\s*0*(\d+))?/i.exec(p.text);
          if (!m) return false;
          const lo = Number(m[1]);
          const hi = m[2] ? Number(m[2]) : lo;
          return week >= lo && week <= hi;
        })
        .map((p) => p.href),
    buildUrl: () => [],
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
    // pdf-parse's default linearization scrambles Eksjö's table (columns come
    // out glued and out of order: "2026-08-05on10:45", "Huvudförhandlingringa"),
    // merging adjacent hearings. The Y-grouped positional renderer reconstructs
    // proper tab-separated rows, so parse it as positional.
    formatFamily: "positional",
    singleUrl: true,
    // Eksjö moved the file into a "veckan" sub-folder; old flat path 404s as
    // of w22/2026 but kept as a fallback in case the upstream flips back or
    // archived weeks remain at the old location.
    buildUrl: () => [
      `${BASE}/eksjo_tingsratt/schema/veckan/veckan.pdf`,
      `${BASE}/eksjo_tingsratt/schema/veckan.pdf`,
    ],
  },
  {
    id: "eskilstuna_tingsratt",
    name: "Eskilstuna tingsrätt",
    formatFamily: "positional",
    // Eskilstuna publishes a multi-week bundle with an arbitrary range in the
    // filename (e.g. veckansforhandlingar-v25-26.pdf), so scrape the listing
    // page and match the requested week against single weeks and ranges.
    listingUrl:
      "https://www.domstol.se/eskilstuna-tingsratt/om-tingsratten/aktuellt/veckans-forhandlingar/",
    pickFromListing: (pdfs, week) =>
      pdfs
        .filter((p) => {
          const m =
            /-v\.?-?0*(\d+)(?:\s*-\s*0*(\d+))?\.pdf/i.exec(p.href) ||
            /\bvecka\s*0*(\d+)(?:\s*-\s*0*(\d+))?/i.exec(p.text);
          if (!m) return false;
          const lo = Number(m[1]);
          const hi = m[2] ? Number(m[2]) : lo;
          return week >= lo && week <= hi;
        })
        .map((p) => p.href),
    buildUrl: () => [],
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
    pickFromListing: (pdfs, week) =>
      pdfs
        .filter((p) => {
          const weekInText = new RegExp(`\\bvecka\\s*0*${week}\\b`, "i").test(p.text);
          const weekInHref = new RegExp(`v\\.?-?0*${week}(?![\\d])`, "i").test(p.href);
          return weekInText || weekInHref;
        })
        .map((p) => p.href),
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
    formatFamily: "positional",
    // Most weeks are published as v{week}.pdf, but during summer the court
    // bundles several weeks into one file (e.g. v25-30.pdf). Scrape the
    // listing page and match the requested week against both single-week
    // files and ranges.
    listingUrl:
      "https://www.domstol.se/linkopings-tingsratt/om-tingsratten/aktuellt/forhandlingar/",
    pickFromListing: (pdfs, week) =>
      pdfs
        .filter((p) => {
          const m =
            /\/v\.?-?0*(\d+)(?:\s*-\s*0*(\d+))?\.pdf/i.exec(p.href) ||
            /\bvecka\s*0*(\d+)(?:\s*-\s*0*(\d+))?/i.exec(p.text);
          if (!m) return false;
          const lo = Number(m[1]);
          const hi = m[2] ? Number(m[2]) : lo;
          return week >= lo && week <= hi;
        })
        .map((p) => p.href),
    buildUrl: () => [],
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
    // Mora bundles two-week blocks under /block/, but the filename is
    // inconsistent: sometimes bare (block/34-35.pdf), sometimes with a
    // "vecka-" prefix (block/vecka-32-33.pdf), and occasionally with a "-ny"
    // suffix for republished blocks (block/26-27-ny.pdf). Rather than guess
    // the spelling, scrape the listing page and match the requested week
    // against the block range in each filename.
    listingUrl:
      "https://www.domstol.se/mora-tingsratt/om-tingsratten/aktuellt/veckans-forhandlingar/",
    pickFromListing: (pdfs, week) =>
      pdfs
        .filter((p) => {
          const m =
            /block\/(?:vecka-)?0*(\d+)(?:-0*(\d+))?(?:-ny)?\.pdf/i.exec(p.href) ||
            /\bvecka\s*0*(\d+)(?:\s*-\s*0*(\d+))?/i.exec(p.text);
          if (!m) return false;
          const lo = Number(m[1]);
          const hi = m[2] ? Number(m[2]) : lo;
          return week >= lo && week <= hi;
        })
        .map((p) => p.href),
    buildUrl: () => [],
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
    formatFamily: "positional",
    // Uddevalla publishes a single PDF covering an arbitrary week range
    // (e.g. veckans-mal-v26-34.pdf), so scrape the listing page and match
    // the requested week against single weeks and ranges.
    listingUrl:
      "https://www.domstol.se/uddevalla-tingsratt/om-tingsratten/aktuellt/veckans-forhandlingar/",
    pickFromListing: (pdfs, week) =>
      pdfs
        .filter((p) => {
          const m =
            /-v\.?-?0*(\d+)(?:\s*-\s*0*(\d+))?\.pdf/i.exec(p.href) ||
            /\bvecka\s*0*(\d+)(?:\s*-\s*0*(\d+))?/i.exec(p.text);
          if (!m) return false;
          const lo = Number(m[1]);
          const hi = m[2] ? Number(m[2]) : lo;
          return week >= lo && week <= hi;
        })
        .map((p) => p.href),
    buildUrl: () => [],
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
    // Filenames embed the week number plus a start/end date
    // (e.g. webb-forhandlingar-v.-25-2026-06-15--2026-06-19.pdf), but the
    // dates are frequently wrong (e.g. a Wednesday start on v.-26), so we
    // scrape the listing page and match by week number rather than guess.
    listingUrl:
      "https://www.domstol.se/sodertalje-tingsratt/om-tingsratten/aktuellt/veckans-forhandlingar/",
    pickFromListing: (pdfs, week) =>
      pdfs
        .filter((p) => {
          const weekInText = new RegExp(`\\bvecka\\s*0*${week}\\b`, "i").test(p.text);
          const weekInHref = new RegExp(`v\\.?-?0*${week}(?![\\d])`, "i").test(p.href);
          return weekInText || weekInHref;
        })
        .map((p) => p.href),
    buildUrl: () => [],
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
    // Varberg publishes a single rolling multi-week file whose name and
    // week range change over time (e.g. "webb-forhandlingar-v-23-26.pdf"
    // became "forhandlingar-v-26-28.pdf"), so scrape the listing page and
    // take the one PDF it links rather than guessing the range.
    listingUrl:
      "https://www.domstol.se/varbergs-tingsratt/om-tingsratten/aktuellt/forhandlingsschema/",
    pickFromListing: (pdfs) => pdfs[0]?.href ?? null,
    buildUrl: () => [],
  },
  {
    id: "uppsala_tingsratt",
    name: "Uppsala tingsrätt",
    formatFamily: "tabular",
    // Filename style flipped from "forhandlingslista-v.-22.pdf" to
    // "forhandlingslistav22.pdf" (no separators) around w22/2026. Try the
    // new style first; keep the older variants as fallbacks for archived weeks.
    buildUrl: (week) => [
      `${BASE}/uppsala_tingsratt/veckans-forhandlingar/forhandlingslistav${week}.pdf`,
      `${BASE}/uppsala_tingsratt/veckans-forhandlingar/forhandlingslista-v.-${week}.pdf`,
      `${BASE}/uppsala_tingsratt/veckans-forhandlingar/forhandlingslista-v-${week}.pdf`,
    ],
  },
  {
    id: "vanersborgs_tingsratt",
    name: "Vänersborgs tingsrätt",
    formatFamily: "positional",
    // Most weeks are published as v{week}.pdf, but the court also bundles
    // several weeks into one file (e.g. v26-27.pdf), which the fixed
    // pattern can't match. Scrape the listing page and match the requested
    // week against both single-week files and ranges.
    listingUrl:
      "https://www.domstol.se/vanersborgs-tingsratt/om-tingsratten/aktuellt/veckans-forhandlingar/",
    pickFromListing: (pdfs, week) =>
      pdfs
        .filter((p) => {
          const m =
            /\/v\.?-?0*(\d+)(?:\s*-\s*0*(\d+))?\.pdf/i.exec(p.href) ||
            /\bv\.?\s*0*(\d+)(?:\s*-\s*0*(\d+))?/i.exec(p.text);
          if (!m) return false;
          const lo = Number(m[1]);
          const hi = m[2] ? Number(m[2]) : lo;
          return week >= lo && week <= hi;
        })
        .map((p) => p.href),
    buildUrl: () => [],
  },
  {
    id: "varmlands_tingsratt",
    name: "Värmlands tingsrätt",
    formatFamily: "positional",
    // The court now publishes a single PDF covering an arbitrary week range
    // (e.g. vecka-29-34.pdf) instead of one file per week, so the fixed
    // vecka-<week>.pdf 404s. Scrape the listing and match the requested week
    // against single weeks and ranges, like Skaraborg.
    listingUrl:
      "https://www.domstol.se/varmlands-tingsratt/om-tingsratten/aktuellt/veckans-forhandlingar/",
    pickFromListing: (pdfs, week) =>
      pdfs
        .filter((p) => {
          const m =
            /vecka-0*(\d+)(?:-0*(\d+))?\.pdf/i.exec(p.href) ||
            /\bvecka\s*0*(\d+)(?:\s*-\s*0*(\d+))?/i.exec(p.text);
          if (!m) return false;
          const lo = Number(m[1]);
          const hi = m[2] ? Number(m[2]) : lo;
          return week >= lo && week <= hi;
        })
        .map((p) => p.href),
    buildUrl: () => [],
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
    formatFamily: "positional",
    // Filenames are inconsistent (observed: "v.18-ny.pdf", "ny-v17.pdf"),
    // so we scrape the listing page and match by week number.
    listingUrl:
      "https://www.domstol.se/angermanlands-tingsratt/om-tingsratten/aktuellt/veckans-forhandlingar/",
    pickFromListing: (pdfs, week) =>
      pdfs
        .filter((p) => {
          const weekInText = new RegExp(`\\bvecka\\s*0*${week}\\b`, "i").test(p.text);
          const weekInHref = new RegExp(`v\\.?-?0*${week}(?![\\d])`, "i").test(p.href);
          return weekInText || weekInHref;
        })
        .map((p) => p.href),
    buildUrl: () => [],
  },
  {
    id: "orebro_tingsratt",
    name: "Örebro tingsrätt",
    formatFamily: "tabular",
    singleUrl: true,
    // Örebro publishes a single schedule under an arbitrary, non-week
    // filename (e.g. schema/schema39.pdf, which doesn't track the current
    // week), so scrape the listing page and take the one PDF it links.
    listingUrl:
      "https://www.domstol.se/orebro-tingsratt/om-tingsratten/aktuellt/veckans-forhandlingar/",
    pickFromListing: (pdfs) => pdfs[0]?.href ?? null,
    buildUrl: () => [],
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
