
Problem found after re-review:
- This is not a total backend outage. I reproduced successful fetches for Blekinge and Attunda.
- The real issue is slow/late success that looks like failure:
  - Many candidate URLs return direct 404 (not published/wrong variant).
  - Each 404 still waits through proxy fallbacks (often ~20s due allorigins/codetabs behavior).
  - Some valid URLs (especially Haparanda) are tried very late in the list, so users see repeated failures first and stop.

What to implement:

1) Speed up edge fetch failure handling (`supabase/functions/fetch-court-pdf/index.ts`)
- If direct fetch returns 404, skip proxy attempts for that URL immediately.
- Add per-attempt timeout (AbortController) so proxy failures don’t block for ~20s.
- Keep proxies only for non-404 transport cases.

2) Prioritize likely-valid URL variants for Haparanda (`src/lib/courtConfig.ts`)
- Reorder candidates so year-based + `och-vecka` variants are tried first.
- This moves currently published links from late attempts to early attempts.

3) Improve failure visibility in loading UI (`src/components/DataLoadingTab.tsx` + `src/lib/api/courtPdf.ts`)
- Show per-URL reason in step detail (e.g., `404 on source`, `proxy timeout`, `HTML instead of PDF`) instead of only ✓/✗.
- This makes “not published yet” clear and avoids “system broken” interpretation.

4) Validation pass
- Re-test single-court fetch for Blekinge, Haparanda, Göteborg, Attunda.
- Verify Haparanda no longer requires long waits before finding the correct URL.
- Verify UI now clearly differentiates:
  - working URLs,
  - not-published PDFs,
  - transport/proxy issues.
