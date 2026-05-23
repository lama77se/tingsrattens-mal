import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createRequire } from "module";
import { fetchDomstol, validatePdf } from "./_lib/fetch-domstol.js";

// pdf-parse is CJS-only; its index.js has a test-mode check that
// crashes in bundlers, so import the lib entry directly.
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse/lib/pdf-parse.js");
const { renderPositional } = require("./_lib/renderPositional.cjs");

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    const body = req.body;
    const pdfUrl: string = body.pdfUrl;
    const weekNumber: number | undefined = body.weekNumber;
    const year: number | undefined = body.year;
    const mode: "default" | "positional" =
      body.mode === "positional" ? "positional" : "default";

    if (!pdfUrl) {
      return res
        .status(400)
        .json({ success: false, error: "Saknar pdfUrl" });
    }

    if (!pdfUrl.startsWith("https://www.domstol.se/")) {
      return res
        .status(400)
        .json({
          success: false,
          error: "Ogiltig URL -- måste vara från domstol.se",
        });
    }

    console.log(`[fetch-court-pdf] Fetching: ${pdfUrl}`);
    const result = await fetchDomstol(pdfUrl, validatePdf, "[fetch-court-pdf]");

    if (!result.ok) {
      if (result.notFound && result.errors[0] === "direct: 404") {
        return res.status(200).json({
          success: false,
          error: "404 på källan",
          errorCode: "direct_404",
          notFound: true,
          url: pdfUrl,
        });
      }
      const allErrors = result.errors.join("; ");
      const notFoundLikely = result.errors.every(
        (e) =>
          e.includes("HTML") || e.includes("non-PDF") || e.includes("404")
      );
      console.log(`[fetch-court-pdf] All methods failed: ${allErrors}`);
      return res.status(200).json({
        success: false,
        error: notFoundLikely
          ? "PDF inte publicerad ännu"
          : `Kunde inte hämta PDF: ${allErrors}`,
        errorDetail: allErrors,
        notFound: result.notFound || notFoundLikely,
        url: pdfUrl,
      });
    }

    const buffer = Buffer.from(result.bytes);
    const parsed = mode === "positional"
      ? await pdfParse(buffer, { pagerender: renderPositional })
      : await pdfParse(buffer);
    const extractedText: string = parsed.text || "";
    const numPages: number = parsed.numpages || 0;
    const timePatterns = extractedText.match(/\d{2}[.:]\d{2}/g) || [];

    return res.status(200).json({
      success: true,
      text: extractedText || "(Tom PDF)",
      url: pdfUrl,
      weekNumber,
      year,
      pdfSizeBytes: result.bytes.byteLength,
      numPages,
      estimatedHearings: Math.max(1, Math.floor(timePatterns.length / 2)),
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
