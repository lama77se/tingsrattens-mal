

## Change Browser Tab Icon and Title

### Title Change
Update the `<title>` tag and Open Graph meta tags in `index.html` from "Lovable App" to "Tingsrattens mal".

### Favicon Change
Replace the current favicon with an SVG scales-of-justice icon. SVG favicons are supported by all modern browsers and allow crisp rendering at any size. The icon will use the project's primary blue color to match the Nordic theme.

### Technical Details

**Files to modify:**
- `index.html` -- Update `<title>`, `og:title`, and add an SVG favicon link
- `public/favicon.svg` -- Create new SVG file with a scales/justice icon

**Changes in `index.html`:**
- Set `<title>` to "Tingsrattens mal"
- Set `og:title` to "Tingsrattens mal"
- Replace favicon reference to point to `/favicon.svg`

