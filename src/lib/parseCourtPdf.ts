import { enrichHearing } from "./parsers/enrichment";
import { formatStandard } from "./parsers/formatStandard";
import { formatTabular } from "./parsers/formatTabular";
import { formatGavle } from "./parsers/formatGavle";
import { formatSchema } from "./parsers/formatSchema";
import { formatPositional } from "./parsers/formatPositional";
import type { ParserStrategy, FormatFamily } from "./parsers/types";

// Re-export Hearing from types for backward compatibility
export type { Hearing } from "./parsers/types";

// Re-export types that consumers might need
export type { RawHearing, FormatFamily, ParserStrategy, ParserContext } from "./parsers/types";

/**
 * Registry mapping format families to their parser strategies.
 * Add new format families here as they are implemented.
 */
const strategyRegistry: Record<FormatFamily, ParserStrategy> = {
  standard: formatStandard,
  tabular: formatTabular,
  gavle: formatGavle,
  schema: formatSchema,
  positional: formatPositional,
  // Future formats:
  formatD: formatStandard, // placeholder — override when implemented
  formatE: formatStandard,
};

/**
 * Minimal court info for the dispatcher — accepts either a string (court name)
 * or an object with name and formatFamily fields.
 */
interface CourtLike {
  name: string;
  formatFamily?: FormatFamily;
}

/**
 * Parse raw PDF text from Swedish court PDFs into structured hearing objects.
 *
 * Backward-compatible signature: accepts either a court name string or a CourtConfig object.
 * When a string is passed, defaults to "standard" format family.
 */
export function parseCourtPdf(text: string, court: string | CourtLike): import("./parsers/types").Hearing[] {
  const courtName = typeof court === "string" ? court : court.name;
  const formatFamily: FormatFamily = typeof court === "string" ? "standard" : (court.formatFamily ?? "standard");

  const strategy = strategyRegistry[formatFamily];
  if (!strategy) {
    console.warn(`Unknown format family "${formatFamily}", falling back to standard`);
    return parseCourtPdf(text, courtName);
  }

  const rawHearings = strategy.parse({ courtName, text });

  return rawHearings.map((raw, i) => {
    return enrichHearing(raw, courtName, i + 1);
  });
}
