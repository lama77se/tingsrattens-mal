import type { ScrapedPdfLink } from "../scrapePdfLinks";

export interface CourtListingResult {
  success: boolean;
  pdfs?: ScrapedPdfLink[];
  url?: string;
  error?: string;
  notFound?: boolean;
}

export async function fetchCourtListing(
  listingUrl: string
): Promise<CourtListingResult> {
  try {
    const resp = await fetch("/api/list-court-pdfs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingUrl }),
    });

    if (!resp.ok) {
      return { success: false, error: `HTTP ${resp.status}` };
    }

    return (await resp.json()) as CourtListingResult;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
