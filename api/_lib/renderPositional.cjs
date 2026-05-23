/**
 * Custom pdf-parse `pagerender` that produces deterministic Y-grouped lines.
 *
 * Default pdf-parse linearises text by item iteration order, which scrambles
 * column/row associations when one cell in a multi-column table wraps onto a
 * second physical row (the items below the wrap desync from the items in the
 * adjacent column). This renderer:
 *
 *   1. Sorts all text items top-to-bottom by Y, then left-to-right by X.
 *   2. Groups items into rows by Y coordinate (with a small tolerance).
 *   3. Within each row, inserts a TAB between items that are separated by a
 *      noticeable horizontal gap (column boundary), and concatenates items
 *      that are tight together (same logical column).
 *
 * The output is one line per visual PDF row, with TABs separating columns.
 *
 * Used by `api/fetch-court-pdf.ts` when the client requests `mode=positional`
 * and by `debug-pdf.cjs --positional`.
 */

const Y_TOLERANCE = 2;
const COLUMN_GAP_THRESHOLD = 5;

async function renderPositional(pageData) {
  const textContent = await pageData.getTextContent({
    normalizeWhitespace: false,
    disableCombineTextItems: false,
  });

  const items = textContent.items
    .filter((it) => it && typeof it.str === "string" && it.str.length > 0)
    .map((it) => ({
      str: it.str,
      x: it.transform[4],
      y: it.transform[5],
      w: it.width || 0,
    }));

  // Top-to-bottom (descending Y in PDF coords), then left-to-right.
  items.sort((a, b) => b.y - a.y || a.x - b.x);

  const rows = [];
  let cur = null;
  for (const it of items) {
    if (!cur || Math.abs(cur.y - it.y) > Y_TOLERANCE) {
      cur = { y: it.y, items: [it] };
      rows.push(cur);
    } else {
      cur.items.push(it);
    }
  }

  const lines = rows
    .map((r) => {
      const sorted = r.items.sort((a, b) => a.x - b.x);
      let line = "";
      let prevEnd = -Infinity;
      for (const it of sorted) {
        if (line.length > 0) {
          const gap = it.x - prevEnd;
          line += gap > COLUMN_GAP_THRESHOLD ? "\t" : "";
        }
        line += it.str;
        prevEnd = it.x + it.w;
      }
      return line.trim();
    })
    .filter((l) => l.length > 0);

  return lines.join("\n");
}

module.exports = { renderPositional };
