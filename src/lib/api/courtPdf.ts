import { supabase } from "@/integrations/supabase/client";

export interface CourtPdfResult {
  success: boolean;
  text?: string;
  url?: string;
  weekNumber?: number;
  year?: number;
  pdfSizeBytes?: number;
  estimatedHearings?: number;
  error?: string;
  notFound?: boolean;
}

export async function fetchCourtPdf(
  pdfUrl: string,
  weekNumber?: number,
  year?: number,
  yTolerance?: number
): Promise<CourtPdfResult> {
  const { data, error } = await supabase.functions.invoke("fetch-court-pdf", {
    body: { pdfUrl, weekNumber, year, ...(yTolerance && { yTolerance }) },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return data as CourtPdfResult;
}
