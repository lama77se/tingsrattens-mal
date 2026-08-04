import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchDomstol, validateHtml, isDomstolUrl } from "./_lib/fetch-domstol.js";
import { extractPdfLinks } from "../src/lib/scrapePdfLinks.js";

// Listing pages change only when a court publishes a new week, so they're safe
// to share across visitors from the CDN edge (GET only; POST is never cached).
const CACHE_SUCCESS = "public, s-maxage=10800, stale-while-revalidate=86400";
const CACHE_MISS = "public, s-maxage=300, stale-while-revalidate=600";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    // GET (cacheable on the CDN) or POST (legacy); query string is the cache key.
    const src: Record<string, unknown> =
      req.method === "GET" ? (req.query ?? {}) : (req.body ?? {});
    const listingUrl = src.listingUrl as string | undefined;

    if (!listingUrl) {
      return res
        .status(400)
        .json({ success: false, error: "Saknar listingUrl" });
    }

    if (!isDomstolUrl(listingUrl)) {
      return res.status(400).json({
        success: false,
        error: "Ogiltig URL -- måste vara från domstol.se",
      });
    }

    console.log(`[list-court-pdfs] Fetching: ${listingUrl}`);
    const result = await fetchDomstol(
      listingUrl,
      validateHtml,
      "[list-court-pdfs]"
    );

    if (!result.ok) {
      res.setHeader("Cache-Control", CACHE_MISS);
      return res.status(200).json({
        success: false,
        error: result.notFound
          ? "Sidan kunde inte hittas"
          : `Kunde inte hämta sidan: ${result.errors.join("; ")}`,
        notFound: result.notFound,
        url: listingUrl,
      });
    }

    const html = new TextDecoder("utf-8").decode(result.bytes);
    const pdfs = extractPdfLinks(html);
    console.log(`[list-court-pdfs] Found ${pdfs.length} PDF link(s)`);

    res.setHeader("Cache-Control", CACHE_SUCCESS);
    return res.status(200).json({
      success: true,
      pdfs,
      url: listingUrl,
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

