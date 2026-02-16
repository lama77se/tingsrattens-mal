import pdf from "npm:pdf-parse@1.1.1/lib/pdf-parse.js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const pdfUrl: string = body.pdfUrl;
    const weekNumber: number | undefined = body.weekNumber;
    const year: number | undefined = body.year;

    if (!pdfUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'Saknar pdfUrl' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate URL is from domstol.se
    if (!pdfUrl.startsWith('https://www.domstol.se/')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Ogiltig URL – måste vara från domstol.se' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching PDF from: ${pdfUrl}`);

    // Use proxy to bypass TLS incompatibility between Deno and domstol.se
    const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(pdfUrl)}`;

    let pdfResponse: Response | null = null;
    let lastError = '';

    try {
      pdfResponse = await fetch(proxyUrl);
      if (!pdfResponse.ok) {
        lastError = `Proxy: HTTP ${pdfResponse.status}`;
        await pdfResponse.text();
        pdfResponse = null;
      }
    } catch (e) {
      lastError = e.message;
    }

    // Fallback: direct fetch
    if (!pdfResponse) {
      try {
        const resp = await fetch(pdfUrl);
        if (resp.ok) pdfResponse = resp;
        else { lastError = `Direct: HTTP ${resp.status}`; await resp.text(); }
      } catch (e) {
        lastError = `Direct: ${e.message}`;
      }
    }

    if (!pdfResponse) {
      return new Response(
        JSON.stringify({ success: false, error: `Kunde inte hämta PDF: ${lastError}`, url: pdfUrl }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pdfBytes = await pdfResponse.arrayBuffer();
    const pdfSize = pdfBytes.byteLength;

    // Check if we got HTML error page instead of PDF
    const firstBytes = new TextDecoder().decode(new Uint8Array(pdfBytes.slice(0, 10)));
    if (!firstBytes.startsWith('%PDF')) {
      const snippet = new TextDecoder().decode(new Uint8Array(pdfBytes.slice(0, 500)));
      const isNotFound = snippet.includes('404') || snippet.includes('Not Found') || snippet.includes('finns inte');
      return new Response(
        JSON.stringify({
          success: false,
          error: isNotFound ? 'PDF inte publicerad ännu' : 'Fick inte en PDF-fil tillbaka',
          notFound: isNotFound,
          url: pdfUrl,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse PDF text using pdf-parse
    const buffer = new Uint8Array(pdfBytes);
    const parsed = await pdf(buffer);
    const extractedText = parsed.text || '';
    const numPages = parsed.numpages || 0;

    // Count hearings by looking for time patterns (e.g. 09:00, 13.30)
    const timePatterns = extractedText.match(/\d{2}[.:]\d{2}/g) || [];

    return new Response(
      JSON.stringify({
        success: true,
        text: extractedText || '(Tom PDF)',
        url: pdfUrl,
        weekNumber,
        year,
        pdfSizeBytes: pdfSize,
        numPages,
        estimatedHearings: Math.max(1, Math.floor(timePatterns.length / 2)),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
