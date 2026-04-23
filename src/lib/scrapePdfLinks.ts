export interface ScrapedPdfLink {
  href: string;
  text: string;
}

/**
 * Extract all `<a href="....pdf">text</a>` links from an HTML string.
 * Resolves relative hrefs to absolute domstol.se URLs.
 */
export function extractPdfLinks(html: string): ScrapedPdfLink[] {
  const pdfs: ScrapedPdfLink[] = [];
  const seen = new Set<string>();
  const re = /<a\s+[^>]*href\s*=\s*"([^"]+\.pdf)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    let href = m[1];
    const text = m[2]
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();
    if (href.startsWith("/")) href = `https://www.domstol.se${href}`;
    if (seen.has(href)) continue;
    seen.add(href);
    pdfs.push({ href, text });
  }
  return pdfs;
}
