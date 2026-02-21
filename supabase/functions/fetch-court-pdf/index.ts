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

  const rows: { y: number; items: TextItem[] }[] = [];
  for (const item of sorted) {
    const y = item.transform[5];
    const existingRow = rows.find((r) => Math.abs(r.y - y) <= yTolerance);
    if (existingRow) {
      existingRow.items.push(item);
    } else {
      rows.push({ y, items: [item] });
    }
  }

  // Sort rows top-to-bottom (highest y first)
  rows.sort((a, b) => b.y - a.y);

  // Detect major column boundaries by clustering x-start positions.
  // 1. Collect unique x-starts (within tolerance of 5)
  const xStarts: number[] = [];
  for (const item of filtered) {
    const x = item.transform[4];
    if (!xStarts.some((xs) => Math.abs(xs - x) <= 5)) {
      xStarts.push(x);
    }
  }
  xStarts.sort((a, b) => a - b);

  // 2. Find gaps between consecutive unique x-starts.
  //    Large gaps indicate column boundaries.
  const columnGroups: number[][] = [[xStarts[0]]];
  for (let i = 1; i < xStarts.length; i++) {
    const gap = xStarts[i] - xStarts[i - 1];
    if (gap > 50) {
      // Large gap = new column group
      columnGroups.push([xStarts[i]]);
    } else {
      columnGroups[columnGroups.length - 1].push(xStarts[i]);
    }
  }

  // 3. Each column group gets a range [min, max] of x-starts
  const columns = columnGroups.map((group) => ({
    min: Math.min(...group),
    max: Math.max(...group),
  }));

  function getColumnIndex(x: number): number {
    // Find column whose range is closest to this x
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      const dist = x < col.min ? col.min - x : x > col.max ? x - col.max : 0;
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  const result: string[] = [];
  for (const row of rows) {
    row.items.sort((a, b) => a.transform[4] - b.transform[4]);

    // Group items by their detected column
    const colMap: Map<number, TextItem[]> = new Map();
    for (const item of row.items) {
      const colIdx = getColumnIndex(item.transform[4]);
      if (!colMap.has(colIdx)) colMap.set(colIdx, []);
      colMap.get(colIdx)!.push(item);
    }

    // Output each column group as a separate line, left-to-right
    const sortedCols = [...colMap.entries()].sort((a, b) => a[0] - b[0]);
    for (const [, colItems] of sortedCols) {
      const text = colItems.map((item) => item.str).join(" ").trim();
      if (text) result.push(text);
    }
  }
  return result;
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

    console.log(`Fetching PDF from: ${pdfUrl}`);

    // Use proxys to bypass TLS incompatibility between Deno and domstol.se
    const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(pdfUrl)}`;

    let pdfResponse: Response | null = null;
    let lastError = "";

    try {
      pdfResponse = await fetch(proxyUrl);
      if (!pdfResponse.ok) {
        lastError = `Proxy: HTTP ${pdfResponse.status}`;
        await pdfResponse.text();
        pdfResponse = null;
      }
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }

    // Fallback: direct fetch
    if (!pdfResponse) {
      try {
        const resp = await fetch(pdfUrl);
        if (resp.ok) pdfResponse = resp;
        else {
          lastError = `Direct: HTTP ${resp.status}`;
          await resp.text();
        }
      } catch (e) {
        lastError = `Direct: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    if (!pdfResponse) {
      return new Response(
        JSON.stringify({ success: false, error: `Kunde inte hämta PDF: ${lastError}`, url: pdfUrl }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const pdfBytes = await pdfResponse.arrayBuffer();
    const pdfSize = pdfBytes.byteLength;

    // Check if we got HTML error page instead of PDF
    const firstBytes = new TextDecoder().decode(new Uint8Array(pdfBytes.slice(0, 10)));
    if (!firstBytes.startsWith("%PDF")) {
      const snippet = new TextDecoder().decode(new Uint8Array(pdfBytes.slice(0, 500)));
      const isNotFound = snippet.includes("404") || snippet.includes("Not Found") || snippet.includes("finns inte");
      return new Response(
        JSON.stringify({
          success: false,
          error: isNotFound ? "PDF inte publicerad ännu" : "Fick inte en PDF-fil tillbaka",
          notFound: isNotFound,
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
