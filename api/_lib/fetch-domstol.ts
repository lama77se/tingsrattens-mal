/**
 * Shared fetch helper for domstol.se resources.
 * Tries direct fetch first, then falls back through public CORS proxies.
 * Callers validate the returned bytes themselves (e.g. PDF header, HTML sniff).
 */

const DIRECT_TIMEOUT_MS = 10000;
const PROXY_TIMEOUT_MS = 8000;

export interface ValidateResult {
  ok: boolean;
  reason?: string;
}

export type ValidateFn = (bytes: ArrayBuffer) => ValidateResult;

export interface FetchResult {
  ok: boolean;
  bytes?: ArrayBuffer;
  via?: string;
  notFound: boolean;
  errors: string[];
}

/**
 * Strict allowlist guard for the request-forgery sink below: the fetched URL
 * must be an https://www.domstol.se/ address. Parsing with `new URL` and
 * comparing the hostname is robust against prefix tricks
 * ("https://www.domstol.se.evil.com/") that a string `startsWith` check misses.
 */
export function isDomstolUrl(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  return u.protocol === "https:" && u.hostname === "www.domstol.se";
}

async function fetchWithTimeout(
  url: string,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export const validatePdf: ValidateFn = (buf) => {
  const header = new TextDecoder().decode(new Uint8Array(buf.slice(0, 10)));
  if (!header.startsWith("%PDF")) {
    const snippet = new TextDecoder().decode(
      new Uint8Array(buf.slice(0, 200))
    );
    const isHtml =
      snippet.includes("<html") || snippet.includes("<!DOCTYPE");
    return {
      ok: false,
      reason: `got ${isHtml ? "HTML" : "non-PDF"} (${buf.byteLength} bytes)`,
    };
  }
  return { ok: true };
};

export const validateHtml: ValidateFn = (buf) => {
  const snippet = new TextDecoder("utf-8")
    .decode(new Uint8Array(buf.slice(0, 1000)))
    .toLowerCase();
  if (!snippet.includes("<html") && !snippet.includes("<!doctype")) {
    return {
      ok: false,
      reason: `non-HTML response (${buf.byteLength} bytes)`,
    };
  }
  return { ok: true };
};

export async function fetchDomstol(
  url: string,
  validate: ValidateFn,
  logPrefix: string
): Promise<FetchResult> {
  const errors: string[] = [];

  // Barrier for the request-forgery sinks below (CodeQL js/request-forgery):
  // parse the input and only ever fetch a URL DERIVED from a validated
  // www.domstol.se origin. Passing `target.href` (not the raw input) is what
  // breaks the taint flow — the fetched value provably comes from a checked URL.
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return { ok: false, notFound: false, errors: ["invalid: unparseable URL"] };
  }
  if (target.protocol !== "https:" || target.hostname !== "www.domstol.se") {
    return {
      ok: false,
      notFound: false,
      errors: ["invalid: URL must be https://www.domstol.se/"],
    };
  }
  const safeUrl = target.href;

  // 1) Try direct fetch first. The fetch is inlined here (rather than via the
  // shared fetchWithTimeout) so the hostname barrier above dominates the sink
  // in the same function — this is what CodeQL's js/request-forgery recognises
  // as a sanitizer. We fetch `target.href`, derived from the validated URL.
  try {
    console.log(`${logPrefix} Trying direct...`);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DIRECT_TIMEOUT_MS);
    let resp: Response;
    try {
      resp = await fetch(target.href, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }

    if (resp.status === 404) {
      await resp.text();
      console.log(`${logPrefix} Direct 404 -- skipping proxies`);
      return { ok: false, notFound: true, errors: ["direct: 404"] };
    }

    if (!resp.ok) {
      const msg = `direct: HTTP ${resp.status}`;
      console.log(`${logPrefix} ${msg}`);
      errors.push(msg);
      await resp.text();
    } else {
      const buf = await resp.arrayBuffer();
      const check = validate(buf);
      if (check.ok) {
        console.log(
          `${logPrefix} Success via direct (${buf.byteLength} bytes)`
        );
        return { ok: true, bytes: buf, via: "direct", notFound: false, errors: [] };
      }
      const msg = `direct: ${check.reason}`;
      console.log(`${logPrefix} ${msg}`);
      errors.push(msg);
    }
  } catch (e) {
    const msg = `direct: ${e instanceof Error ? e.message : String(e)}`;
    console.log(`${logPrefix} ${msg}`);
    errors.push(msg);
  }

  // 2) Try proxies
  const proxies = [
    {
      name: "allorigins",
      url: `https://api.allorigins.win/raw?url=${encodeURIComponent(safeUrl)}`,
    },
    {
      name: "codetabs",
      url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(safeUrl)}`,
    },
  ];

  for (const proxy of proxies) {
    try {
      console.log(`${logPrefix} Trying ${proxy.name}...`);
      const resp = await fetchWithTimeout(proxy.url, PROXY_TIMEOUT_MS);

      if (!resp.ok) {
        const msg = `${proxy.name}: HTTP ${resp.status}`;
        console.log(`${logPrefix} ${msg}`);
        errors.push(msg);
        await resp.text();
        continue;
      }

      const buf = await resp.arrayBuffer();
      const check = validate(buf);
      if (!check.ok) {
        const msg = `${proxy.name}: ${check.reason}`;
        console.log(`${logPrefix} ${msg}`);
        errors.push(msg);
        continue;
      }

      console.log(
        `${logPrefix} Success via ${proxy.name} (${buf.byteLength} bytes)`
      );
      return { ok: true, bytes: buf, via: proxy.name, notFound: false, errors: [] };
    } catch (e) {
      const isTimeout =
        e instanceof DOMException && e.name === "AbortError";
      const msg = `${proxy.name}: ${isTimeout ? "timeout" : e instanceof Error ? e.message : String(e)}`;
      console.log(`${logPrefix} ${msg}`);
      errors.push(msg);
    }
  }

  const notFound = errors.some((e) => e.includes("404"));
  return { ok: false, notFound, errors };
}
