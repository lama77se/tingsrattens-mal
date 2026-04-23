import { describe, it, expect } from "vitest";
import { extractPdfLinks } from "../lib/scrapePdfLinks";

describe("extractPdfLinks", () => {
  it("extracts a single absolute-path PDF link (Gävle-style)", () => {
    const html = `
      <div>
        <a href="/globalassets/filer/domstol/gavle_tingsratt/veckans-forhandlingar/forhandlingar-vecka-16-22.pdf"
           class="pdf-link">Förhandlingar vecka 16-22</a>
      </div>
    `;
    const pdfs = extractPdfLinks(html);
    expect(pdfs).toEqual([
      {
        href: "https://www.domstol.se/globalassets/filer/domstol/gavle_tingsratt/veckans-forhandlingar/forhandlingar-vecka-16-22.pdf",
        text: "Förhandlingar vecka 16-22",
      },
    ]);
  });

  it("extracts multiple per-week PDF links (Attunda-style)", () => {
    const html = `
      <ul>
        <li><a href="/globalassets/filer/domstol/attunda_tingsratt/veckans-forhandlingar/webb-forhandlingar-v.17-2026-04-20--24.pdf">Vecka 17 den 20 - 24 april 2026</a></li>
        <li><a href="/globalassets/filer/domstol/attunda_tingsratt/veckans-forhandlingar/webb-forhandlingar-v.16-2026-04-13--17.pdf">Vecka 16 den 13 - 17 april 2026</a></li>
      </ul>
    `;
    const pdfs = extractPdfLinks(html);
    expect(pdfs).toHaveLength(2);
    expect(pdfs[0].href).toContain("v.17-2026-04-20--24.pdf");
    expect(pdfs[0].text).toBe("Vecka 17 den 20 - 24 april 2026");
    expect(pdfs[1].href).toContain("v.16-2026-04-13--17.pdf");
  });

  it("keeps absolute URLs as-is", () => {
    const html = `<a href="https://www.domstol.se/foo/bar.pdf">X</a>`;
    const pdfs = extractPdfLinks(html);
    expect(pdfs[0].href).toBe("https://www.domstol.se/foo/bar.pdf");
  });

  it("ignores non-PDF anchors", () => {
    const html = `
      <a href="/page/index.html">home</a>
      <a href="/foo.pdf">real</a>
      <a href="/bar.docx">word</a>
    `;
    const pdfs = extractPdfLinks(html);
    expect(pdfs).toHaveLength(1);
    expect(pdfs[0].href).toBe("https://www.domstol.se/foo.pdf");
  });

  it("strips inner tags and normalizes whitespace in link text", () => {
    const html = `<a href="/x.pdf"><span>Vecka&nbsp;17</span>  <em>pdf</em>\n150 kB</a>`;
    const pdfs = extractPdfLinks(html);
    expect(pdfs[0].text).toBe("Vecka 17 pdf 150 kB");
  });

  it("deduplicates by href", () => {
    const html = `
      <a href="/foo.pdf">First</a>
      <a href="/foo.pdf">Second</a>
    `;
    const pdfs = extractPdfLinks(html);
    expect(pdfs).toHaveLength(1);
    expect(pdfs[0].text).toBe("First");
  });

  it("handles attributes in any order and mixed case", () => {
    const html = `
      <A class="x" HREF="/a.pdf" target="_blank">A</A>
      <a target="_blank" href="/b.pdf">B</a>
    `;
    const pdfs = extractPdfLinks(html);
    expect(pdfs).toHaveLength(2);
    expect(pdfs.map((p) => p.href)).toEqual([
      "https://www.domstol.se/a.pdf",
      "https://www.domstol.se/b.pdf",
    ]);
  });

  it("returns empty array when no links found", () => {
    expect(extractPdfLinks("<p>nothing here</p>")).toEqual([]);
  });
});
