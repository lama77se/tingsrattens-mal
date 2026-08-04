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
    // GET so the response is cacheable on the CDN edge (shared across visitors).
    const resp = await fetch(
      `/api/list-court-pdfs?listingUrl=${encodeURIComponent(listingUrl)}`
    );

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
