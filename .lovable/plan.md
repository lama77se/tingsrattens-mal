

# Fix "Flera sakfragor"-detektionen

## Problem
Regex `/\bm\s*\.?\s*m\s*\.?\b/i` matchar inte "m m" i saken-faltet. Trolig orsak: PDF-extraktionen kan infoga osynliga Unicode-tecken (t.ex. non-breaking spaces, zero-width chars) som bryter `\b` word boundary-matchningen.

## Losning

### Andring i `src/lib/parseCourtPdf.ts`

1. **Byt till en enklare, mer robust regex** som inte forlitar sig pa `\b` word boundaries:

```typescript
const fleraSakfragorRegex = /m\s*\.?\s*m\s*\.?\s*$/i;
```
Denna matchar "m m", "m.m.", "m.m", "mm" etc. i **slutet** av stringen (dar det typiskt forekommer i sakbeskrivningar).

2. **Lagg aven till en fallback-check** som normaliserar bort osynliga tecken fore matchning:

```typescript
const cleanedSaken = saken.replace(/[^\w\s.,åäöÅÄÖ]/g, "").trim();
const fleraSakfragor = fleraSakfragorRegex.test(saken) || fleraSakfragorRegex.test(cleanedSaken);
```

3. **Lagg till debug-loggning** for att kunna verifiera matchningen:

```typescript
console.log("Saken for fleraSakfragor check:", JSON.stringify(saken), "->", fleraSakfragor);
```

`JSON.stringify` visar exakt vilka tecken som finns i strangen, inklusive dolda Unicode-tecken.

## Tekniska detaljer

Alla andringar i en fil: `src/lib/parseCourtPdf.ts`, raderna 254-256.

Byt fran:
```typescript
const fleraSakfragorRegex = /\bm\s*\.?\s*m\s*\.?\b/i;
const fleraSakfragor = fleraSakfragorRegex.test(saken);
```

Till:
```typescript
const fleraSakfragorRegex = /m\s*\.?\s*m\s*\.?\s*$/i;
const cleanedSaken = saken.replace(/[^\w\s.,åäöÅÄÖ]/g, "").trim();
const fleraSakfragor = fleraSakfragorRegex.test(saken) || fleraSakfragorRegex.test(cleanedSaken);
console.log("Saken for fleraSakfragor check:", JSON.stringify(saken), "->", fleraSakfragor);
```

Inga andra filer andras.
