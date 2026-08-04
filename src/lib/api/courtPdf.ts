export interface CourtPdfResult {
  success: boolean;
  text?: string;
  url?: string;
  weekNumber?: number;
  year?: number;
  pdfSizeBytes?: number;
  estimatedHearings?: number;
  error?: string;
  errorCode?: string;
  errorDetail?: string;
  notFound?: boolean;
}

export async function fetchCourtPdf(
  pdfUrl: string,
  weekNumber?: number,
  year?: number,
  yTolerance?: number,
  mode?: "default" | "positional"
): Promise<CourtPdfResult> {
  try {
    // GET (not POST) so the parsed response is cacheable on Vercel's CDN and
    // shared across all visitors — the query string is the cache key. yTolerance
    // is intentionally omitted: it is not read server-side, and keeping it out
    // of the key avoids fragmenting the cache. See api/fetch-court-pdf.ts.
    const params = new URLSearchParams({ pdfUrl });
    if (weekNumber != null) params.set("weekNumber", String(weekNumber));
    if (year != null) params.set("year", String(year));
    if (mode === "positional") params.set("mode", mode);

    const resp = await fetch(`/api/fetch-court-pdf?${params.toString()}`);

    if (!resp.ok) {
      return { success: false, error: `HTTP ${resp.status}` };
    }

    return (await resp.json()) as CourtPdfResult;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
