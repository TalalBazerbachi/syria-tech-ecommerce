import localFont from "next/font/local"

/**
 * IBM Plex Sans Arabic, self-hosted. Files come from the npm package
 * `@fontsource/ibm-plex-sans-arabic` 5.3.0 (SIL Open Font License 1.1, see
 * `src/fonts/LICENSE-OFL.txt`), copied into `src/fonts/` so the build does
 * not depend on Google Fonts at runtime.
 *
 * Two subsets, two `@font-face` families: the Arabic subset carries the
 * Arabic glyphs, the Latin subset carries digits, punctuation and Latin
 * letters (model numbers, "USD", English pages). Browsers pick per glyph, so
 * the stack `latin, arabic` renders both scripts in one typeface.
 */
export const plexArabic = localFont({
  src: [
    { path: "../fonts/ibm-plex-sans-arabic-arabic-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/ibm-plex-sans-arabic-arabic-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/ibm-plex-sans-arabic-arabic-600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-arabic",
  display: "swap",
  preload: true,
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0600-06FF, U+0750-077F, U+0870-088E, U+0890-0891, U+0897-08E1, U+08E3-08FF, U+200C-200E, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC, U+10E60-10E7E, U+1EE00-1EEFF",
    },
  ],
})

export const plexLatin = localFont({
  src: [
    { path: "../fonts/ibm-plex-sans-arabic-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/ibm-plex-sans-arabic-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/ibm-plex-sans-arabic-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-latin",
  display: "swap",
  preload: true,
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
    },
  ],
})

export const fontClassNames = `${plexLatin.variable} ${plexArabic.variable}`
