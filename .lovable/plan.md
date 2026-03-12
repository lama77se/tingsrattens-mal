

## Issue Analysis

There are two issues:

### 1. Build Error (blocking everything)
The file `src/lib/lagrumMappings.ts` has duplicate object keys, causing a TypeScript build error that prevents the app from compiling:
- `"obehörigt tillträde till skyddsobjekt"` appears at lines 697 and 912 (identical content)
- `"fornminnesbrott"` appears at lines 707 and 917 (identical content)

These are exact duplicates added later in the file. The fix is to remove the duplicate entries at lines 912-921.

### 2. Blekinge tingsrätt URL
The URL configuration for Blekinge looks correct — it generates the exact URL you shared. Once the build error is fixed, fetching should work (assuming the PDF exists on domstol.se and the proxy can reach it).

## Plan

1. **Fix duplicate keys in `lagrumMappings.ts`** — Remove lines 912-921 (the duplicate entries for "obehörigt tillträde till skyddsobjekt" and "fornminnesbrott") since identical entries already exist at lines 697-711.

This single fix should resolve the build error and restore full functionality including Blekinge PDF fetching.

