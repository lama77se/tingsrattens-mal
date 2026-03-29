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
  yTolerance?: number
): Promise<CourtPdfResult> {
  try {
    const resp = await fetch("/api/fetch-court-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pdfUrl,
        weekNumber,
        year,
        ...(yTolerance && { yTolerance }),
      }),
    });

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
