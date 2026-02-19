
## What Went Wrong

I gave contradictory advice — apologies for that. The real situation:

- `npm:unpdf` **was working** in production (the logs showed successful PDF fetches)
- You replaced it with `pdfjs-serverless@0.6.0` based on my advice
- Version `0.6.0` is too old — it does not export `getDocument` at the top level
- The current code has 4 build errors that need fixing

## The 4 Build Errors

1. **`getDocument` not found in version 0.6.0** — need to upgrade to the latest version (1.x)
2. **`e` is of type `unknown`** (line 89) — catch blocks in TypeScript treat errors as `unknown`
3. **`e` is of type `unknown`** (line 102) — same issue in the fallback fetch block
4. **`error` is of type `unknown`** (line 165) — same issue in the outer catch block

## Files to Change

### `supabase/functions/fetch-court-pdf/index.ts`

**Fix 1 — Line 1: Upgrade pdfjs-serverless to latest (no version pin, or pin to 1.x)**

Old:
```
import { getDocument } from "https://esm.sh/pdfjs-serverless@0.6.0";
```

New:
```
import { getDocument } from "https://esm.sh/pdfjs-serverless@1";
```

The official Deno example in the pdfjs-serverless README uses exactly this import pattern without `@0.6.0`.

**Fix 2 — Line 89: Type-safe error handling in proxy catch block**

Old:
```typescript
} catch (e) {
  lastError = e.message;
}
```

New:
```typescript
} catch (e) {
  lastError = e instanceof Error ? e.message : String(e);
}
```

**Fix 3 — Line 102: Type-safe error handling in direct fetch catch block**

Old:
```typescript
} catch (e) {
  lastError = `Direct: ${e.message}`;
}
```

New:
```typescript
} catch (e) {
  lastError = `Direct: ${e instanceof Error ? e.message : String(e)}`;
}
```

**Fix 4 — Line 165: Type-safe error handling in outer catch block**

Old:
```typescript
return new Response(JSON.stringify({ success: false, error: error.message }), {
```

New:
```typescript
return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }), {
```

## Technical Note

- `pdfjs-serverless@1` is the current major version and correctly exports `getDocument` as confirmed by both the official README and the npm registry
- The `@1` pin ensures we stay on the stable 1.x line without accidentally pulling in a future breaking 2.x release
- The error type fixes are standard TypeScript strict-mode practice — `catch` variables are `unknown` by default in modern TypeScript
- No other logic changes — the coordinate-based `groupItemsIntoRows` function, `yTolerance`, proxy fallback, and response shape all stay exactly as-is
