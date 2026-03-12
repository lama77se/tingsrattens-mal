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

  // Sort by y descending (top of page = highest y value in PDF coordinates)
  const sorted = [...filtered].sort((a, b) => b.transform[5] - a.transform[5]);

  // X-tolerance for detecting column collisions (two items at similar x = separate rows)
  const xCollisionTolerance = 10;

  const rows: { y: number; items: TextItem[] }[] = [];
  for (const item of sorted) {
    const y = item.transform[5];
    const x = item.transform[4];
    const existingRow = rows.find((r) => {
      if (Math.abs(r.y - y) > yTolerance) return false;
      // Reject merge if row already has an item at a similar x position
      // (indicates two distinct visual rows at nearly the same y)
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

  // Sort rows top-to-bottom (highest y first)
  rows.sort((a, b) => b.y - a.y);

  return rows.map((row) => {
    row.items.sort((a, b) => a.transform[4] - b.transform[4]);
    return row.items.map((item) => item.str).join(" ").trim();
  }).filter(Boolean);
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

    // Validate URL is from domstol.se
    if (!pdfUrl.startsWith("https://www.domstol.se/")) {
      return new Response(JSON.stringify({ success: false, error: "Ogiltig URL – måste vara från domstol.se" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[fetch-court-pdf] Fetching: ${pdfUrl}`);

    // Fetch methods in priority order: direct first, proxies as fallback
    const fetchMethods: { name: string; url: string }[] = [
      { name: "direct", url: pdfUrl },
      { name: "allorigins", url: `https://api.allorigins.win/raw?url=${encodeURIComponent(pdfUrl)}` },
      { name: "codetabs", url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(pdfUrl)}` },
    ];

    let pdfBytes: ArrayBuffer | null = null;
    let pdfSize = 0;
    const errors: string[] = [];

    for (const method of fetchMethods) {
      try {
        console.log(`[fetch-court-pdf] Trying ${method.name}...`);
        const resp = await fetch(method.url);

        if (!resp.ok) {
          const msg = `${method.name}: HTTP ${resp.status}`;
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
          const msg = `${method.name}: got ${isHtml ? "HTML" : "non-PDF"} (${buf.byteLength} bytes)`;
          console.log(`[fetch-court-pdf] ${msg}`);
          errors.push(msg);
          continue;
        }

        console.log(`[fetch-court-pdf] Success via ${method.name} (${buf.byteLength} bytes)`);
        pdfBytes = buf;
        pdfSize = buf.byteLength;
        break;
      } catch (e) {
        const msg = `${method.name}: ${e instanceof Error ? e.message : String(e)}`;
        console.log(`[fetch-court-pdf] ${msg}`);
        errors.push(msg);
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
          notFound: isNotFound || notFoundLikely,
          url: pdfUrl,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Extract text using pdfjs-serverless with coordinate-based row grouping
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

    // Count hearings by looking for time patterns (e.g. 09:00, 13.30)
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
