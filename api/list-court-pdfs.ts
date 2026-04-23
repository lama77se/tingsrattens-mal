import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchDomstol, validateHtml } from "./_lib/fetch-domstol.js";
import { extractPdfLinks } from "../src/lib/scrapePdfLinks.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    const { listingUrl } = (req.body || {}) as { listingUrl?: string };

    if (!listingUrl) {
      return res
        .status(400)
        .json({ success: false, error: "Saknar listingUrl" });
    }

    if (!listingUrl.startsWith("https://www.domstol.se/")) {
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

