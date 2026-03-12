import { getDocument } from "https://esm.sh/pdfjs-serverless@1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TextItem {
  str: string;
  transform: number[];
  width?: number;
}

/**
 * Group text items by y-coordinate into visual rows, then sort properly.
 * Returns one string per visual row (top-to-bottom, left-to-right within each row).
 */
function groupItemsIntoRows(items: TextItem[], yTolerance = 3): string[] {
  const filtered = items.filter((item) => item.str.trim().length > 0);
  if (filtered.length === 0) return [];

  const sorted = [...filtered].sort((a, b) => b.transform[5] - a.transform[5]);
  const xCollisionTolerance = 10;

  const rows: { y: number; items: TextItem[] }[] = [];
  for (const item of sorted) {
    const y = item.transform[5];
    const x = item.transform[4];
    const existingRow = rows.find((r) => {
      if (Math.abs(r.y - y) > yTolerance) return false;
      const hasXCollision = r.items.some(
        (ri) => Math.abs(ri.transform[4] - x) < xCollisionTolerance
      );
      return !hasXCollision;
    });
    if (existingRow) {
      existingRow.items.push(item);
    } else {
      rows.push({ y, items: [item] });
    }
  }

  rows.sort((a, b) => b.y - a.y);

  return rows.map((row) => {
    row.items.sort((a, b) => a.transform[4] - b.transform[4]);
    return row.items.map((item) => item.str).join(" ").trim();
  }).filter(Boolean);
}

/** Fetch with a timeout via AbortController */
async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { signal: controller.signal });
    return resp;
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const pdfUrl: string = body.pdfUrl;
    const weekNumber: number | undefined = body.weekNumber;
    const year: number | undefined = body.year;
    const yTolerance: number = body.yTolerance ?? 3;

    if (!pdfUrl) {
      return new Response(JSON.stringify({ success: false, error: "Saknar pdfUrl" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!pdfUrl.startsWith("https://www.domstol.se/")) {
      return new Response(JSON.stringify({ success: false, error: "Ogiltig URL – måste vara från domstol.se" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        // Direct 404 → skip proxies entirely, this URL doesn't exist
        await resp.text();
        console.log(`[fetch-court-pdf] Direct 404 — skipping proxies`);
        return new Response(
          JSON.stringify({
            success: false,
            error: "404 på källan",
            errorCode: "direct_404",
            notFound: true,
            url: pdfUrl,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (!resp.ok) {
        const msg = `direct: HTTP ${resp.status}`;
        console.log(`[fetch-court-pdf] ${msg}`);
        errors.push(msg);
        await resp.text();
      } else {
        const buf = await resp.arrayBuffer();
        const header = new TextDecoder().decode(new Uint8Array(buf.slice(0, 10)));
        if (!header.startsWith("%PDF")) {
          const snippet = new TextDecoder().decode(new Uint8Array(buf.slice(0, 200)));
          const isHtml = snippet.includes("<html") || snippet.includes("<!DOCTYPE");
          const msg = `direct: got ${isHtml ? "HTML" : "non-PDF"} (${buf.byteLength} bytes)`;
          console.log(`[fetch-court-pdf] ${msg}`);
          errors.push(msg);
        } else {
          console.log(`[fetch-court-pdf] Success via direct (${buf.byteLength} bytes)`);
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
        { name: "allorigins", url: `https://api.allorigins.win/raw?url=${encodeURIComponent(pdfUrl)}` },
        { name: "codetabs", url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(pdfUrl)}` },
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
          const header = new TextDecoder().decode(new Uint8Array(buf.slice(0, 10)));

          if (!header.startsWith("%PDF")) {
            const snippet = new TextDecoder().decode(new Uint8Array(buf.slice(0, 200)));
            const isHtml = snippet.includes("<html") || snippet.includes("<!DOCTYPE");
            const msg = `${proxy.name}: got ${isHtml ? "HTML" : "non-PDF"} (${buf.byteLength} bytes)`;
            console.log(`[fetch-court-pdf] ${msg}`);
            errors.push(msg);
            continue;
          }

          console.log(`[fetch-court-pdf] Success via ${proxy.name} (${buf.byteLength} bytes)`);
          pdfBytes = buf;
          pdfSize = buf.byteLength;
          break;
        } catch (e) {
          const isTimeout = e instanceof DOMException && e.name === "AbortError";
          const msg = `${proxy.name}: ${isTimeout ? "timeout" : (e instanceof Error ? e.message : String(e))}`;
          console.log(`[fetch-court-pdf] ${msg}`);
          errors.push(msg);
        }
      }
    }

    if (!pdfBytes) {
      const allErrors = errors.join("; ");
      const isNotFound = errors.some((e) => e.includes("404"));
      const notFoundLikely = errors.every((e) => e.includes("HTML") || e.includes("non-PDF") || e.includes("404"));
      console.log(`[fetch-court-pdf] All methods failed: ${allErrors}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: notFoundLikely ? "PDF inte publicerad ännu" : `Kunde inte hämta PDF: ${allErrors}`,
          errorDetail: allErrors,
          notFound: isNotFound || notFoundLikely,
          url: pdfUrl,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Extract text using pdfjs-serverless
    const doc = await getDocument(new Uint8Array(pdfBytes)).promise;
    const numPages = doc.numPages;
    const allLines: string[] = [];

    for (let p = 1; p <= numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      const items = content.items as TextItem[];
      const rows = groupItemsIntoRows(items, yTolerance);
      allLines.push(...rows);
    }

    const extractedText = allLines.join("\n");
    const timePatterns = extractedText.match(/\d{2}[.:]\d{2}/g) || [];

    return new Response(
      JSON.stringify({
        success: true,
        text: extractedText || "(Tom PDF)",
        url: pdfUrl,
        weekNumber,
        year,
        pdfSizeBytes: pdfSize,
        numPages,
        estimatedHearings: Math.max(1, Math.floor(timePatterns.length / 2)),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
