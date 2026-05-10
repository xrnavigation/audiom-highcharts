/**
 * Single source of truth for the sample pages.
 *
 * Adding a new sample is a three-step process:
 *  1. Add an entry to {@link SAMPLES} below.
 *  2. Create matching `<slug>.html` (placeholders only) and
 *     `src/<slug>.ts` (calls `renderMap(...)`).
 *  3. Add the new HTML file to `vite.config.ts`'s `rollupOptions.input`.
 *
 * Everything else — the inter-sample nav on each page, the card list on
 * the home page, the per-page `<title>` and `<h1>` — is derived from
 * this list at runtime.
 */

export interface SampleEntry {
  /** URL-safe id; matches `<slug>.html` and `src/<slug>.ts`. */
  slug: string;
  /** Full page title (used for `<h1>` and `<title>`). */
  title: string;
  /** Short label used in nav links between sample pages. */
  shortLabel: string;
  /** One-paragraph description for the home page card. */
  description: string;
}

export const SAMPLES: readonly SampleEntry[] = [
  {
    slug: 'europe',
    title: 'Europe — GDP per Capita (USD, approx 2023)',
    shortLabel: 'Europe GDP per Capita',
    description:
      'GDP per capita (USD, approx 2023) across European countries.'
  },
  {
    slug: 'world',
    title: 'World Population (millions, approx 2022)',
    shortLabel: 'World Population',
    description:
      'Population (millions, approx 2022) across world countries.'
  }
] as const;

/** Look up a sample by slug. Throws if the slug is unknown. */
export function getSample(slug: string): SampleEntry {
  const found = SAMPLES.find((s) => s.slug === slug);
  if (!found) {
    throw new Error(
      `Unknown sample slug "${slug}". Known: ${SAMPLES.map((s) => s.slug).join(', ')}`
    );
  }
  return found;
}
