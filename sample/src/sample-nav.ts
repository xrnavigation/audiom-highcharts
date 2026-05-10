/**
 * Build the per-sample page chrome (nav + title) from the sample
 * registry. Called by each sample script (e.g. `src/europe.ts`) so the
 * HTML files only need empty placeholders:
 *
 *   <nav id="sample-nav" aria-label="Sample pages"></nav>
 *   <h1 id="sample-title"></h1>
 *
 * Adding or renaming a sample only requires editing
 * `./sample-registry.ts` — every other page's nav updates automatically.
 */
import { SAMPLES, getSample } from './sample-registry';

/**
 * Populate `#sample-nav` with the inter-sample link bar (Samples home
 * + every sibling sample + the mode-toggle slot) and `#sample-title`
 * + `document.title` from the registry entry.
 */
export function mountSamplePage(currentSlug: string): void {
  const sample = getSample(currentSlug);

  // Title + h1
  document.title = `${sample.title} — Audiom-Highcharts Sample`;
  const titleEl = document.getElementById('sample-title');
  if (titleEl) titleEl.textContent = sample.title;

  // Nav
  const nav = document.getElementById('sample-nav');
  if (!nav) return;
  nav.innerHTML = '';

  appendLink(nav, 'index.html', 'Samples', { backArrow: true });

  for (const other of SAMPLES) {
    if (other.slug === currentSlug) continue;
    appendSeparator(nav);
    appendLink(nav, `${other.slug}.html`, other.shortLabel);
  }

  // Mode toggle slot — appended last so the existing setupDisplayModeToggle()
  // can find it. Kept as a separate <span id="mode-toggle"> for backwards
  // compatibility with mode-toggle.ts.
  appendSeparator(nav);
  const modeSlot = document.createElement('span');
  modeSlot.id = 'mode-toggle';
  nav.appendChild(modeSlot);
}

function appendLink(
  nav: HTMLElement,
  href: string,
  text: string,
  opts: { backArrow?: boolean } = {}
): void {
  const a = document.createElement('a');
  a.href = href;
  if (opts.backArrow) {
    const arrow = document.createElement('span');
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '← ';
    a.appendChild(arrow);
  }
  a.appendChild(document.createTextNode(text));
  nav.appendChild(a);
}

function appendSeparator(nav: HTMLElement): void {
  const sep = document.createElement('span');
  sep.className = 'sep';
  sep.setAttribute('aria-hidden', 'true');
  sep.textContent = '|';
  nav.appendChild(sep);
}
