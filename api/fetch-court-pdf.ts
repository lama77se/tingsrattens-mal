import type { VercelRequest, VercelResponse } from "@vercel/node";

// Import the lib directly to avoid pdf-parse's index.js test-mode check
// (index.js tries to read a test PDF when module.parent is undefined)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse/lib/pdf-parse.js");

/** Fetch with a timeout via AbortController */
async function fetchWithTimeout(
  url: string,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { signal: controller.signal });
    return resp;
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
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

    const PROXY_TIMEOUT_MS = 8000;
    let pdfBytes: ArrayBuffer | null = null;
    let pdfSize = 0;
    const errors: string[] = [];

    // 1) Try direct fetch first
    try {
      console.log(`[fetch-court-pdf] Trying direct...`);
      const resp = await fetchWithTimeout(pdfUrl, 10000);

      if (resp.status === 404) {
        await resp.text();
        console.log(`[fetch-court-pdf] Direct 404 -- skipping proxies`);
        return res.status(200).json({
          success: false,
          error: "404 på källan",
          errorCode: "direct_404",
          notFound: true,
          url: pdfUrl,
        });
      }

      if (!resp.ok) {
        const msg = `direct: HTTP ${resp.status}`;
        console.log(`[fetch-court-pdf] ${msg}`);
        errors.push(msg);
        await resp.text();
      } else {
        const buf = await resp.arrayBuffer();
        const header = new TextDecoder().decode(
          new Uint8Array(buf.slice(0, 10))
        );
        if (!header.startsWith("%PDF")) {
          const snippet = new TextDecoder().decode(
            new Uint8Array(buf.slice(0, 200))
          );
          const isHtml =
            snippet.includes("<html") || snippet.includes("<!DOCTYPE");
          const msg = `direct: got ${isHtml ? "HTML" : "non-PDF"} (${buf.byteLength} bytes)`;
          console.log(`[fetch-court-pdf] ${msg}`);
          errors.push(msg);
        } else {
          console.log(
            `[fetch-court-pdf] Success via direct (${buf.byteLength} bytes)`
          );
          pdfBytes = buf;
          pdfSize = buf.byteLength;
        }
      }
    } catch (e) {
      const msg = `direct: ${e instanceof Error ? e.message : String(e)}`;
      console.log(`[fetch-court-pdf] ${msg}`);
      errors.push(msg);
    }

    // 2) Try proxies only if direct didn't return 404 and didn't succeed
    if (!pdfBytes) {
      const proxies = [
        {
          name: "allorigins",
          url: `https://api.allorigins.win/raw?url=${encodeURIComponent(pdfUrl)}`,
        },
        {
          name: "codetabs",
          url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(pdfUrl)}`,
        },
      ];

      for (const proxy of proxies) {
        try {
          console.log(`[fetch-court-pdf] Trying ${proxy.name}...`);
          const resp = await fetchWithTimeout(proxy.url, PROXY_TIMEOUT_MS);

          if (!resp.ok) {
            const msg = `${proxy.name}: HTTP ${resp.status}`;
            console.log(`[fetch-court-pdf] ${msg}`);
            errors.push(msg);
            await resp.text();
            continue;
          }

          const buf = await resp.arrayBuffer();
          const header = new TextDecoder().decode(
            new Uint8Array(buf.slice(0, 10))
          );

          if (!header.startsWith("%PDF")) {
            const snippet = new TextDecoder().decode(
              new Uint8Array(buf.slice(0, 200))
            );
            const isHtml =
              snippet.includes("<html") || snippet.includes("<!DOCTYPE");
            const msg = `${proxy.name}: got ${isHtml ? "HTML" : "non-PDF"} (${buf.byteLength} bytes)`;
            console.log(`[fetch-court-pdf] ${msg}`);
            errors.push(msg);
            continue;
          }

          console.log(
            `[fetch-court-pdf] Success via ${proxy.name} (${buf.byteLength} bytes)`
          );
          pdfBytes = buf;
          pdfSize = buf.byteLength;
          break;
        } catch (e) {
          const isTimeout =
            e instanceof DOMException && e.name === "AbortError";
          const msg = `${proxy.name}: ${isTimeout ? "timeout" : e instanceof Error ? e.message : String(e)}`;
          console.log(`[fetch-court-pdf] ${msg}`);
          errors.push(msg);
        }
      }
    }

    if (!pdfBytes) {
      const allErrors = errors.join("; ");
      const isNotFound = errors.some((e) => e.includes("404"));
      const notFoundLikely = errors.every(
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
        notFound: isNotFound || notFoundLikely,
        url: pdfUrl,
      });
    }

    // Extract text using pdf-parse
    const buffer = Buffer.from(pdfBytes);
    const parsed = await pdfParse(buffer);
    const extractedText: string = parsed.text || "";
    const numPages: number = parsed.numpages || 0;
    const timePatterns = extractedText.match(/\d{2}[.:]\d{2}/g) || [];

    return res.status(200).json({
      success: true,
      text: extractedText || "(Tom PDF)",
      url: pdfUrl,
      weekNumber,
      year,
      pdfSizeBytes: pdfSize,
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
