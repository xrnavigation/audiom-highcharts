/**
 * Tiny "View GeoJSON" / "View Rules" link bar mounted above each chart
 * container. Lets the demo expose the URLs Audiom is fetching so they
 * can be inspected in a browser tab.
 */
import type { AudiomSourceValue } from '@xrnavigation/audiom-highcharts';

/**
 * Pull the served GeoJSON URL out of a resolved sources list. Returns the
 * first string source, or the `source` field of the first IAudiomSource.
 */
export function firstSourceUrl(sources: AudiomSourceValue[]): string | null {
  for (const s of sources) {
    if (typeof s === 'string') return s;
    if (s && typeof s.source === 'string') return s.source;
  }
  return null;
}

/**
 * Mount a small "View GeoJSON" / "View Rules" link bar above the chart
 * container. Idempotent per chart container — subsequent calls replace
 * the bar's contents in place.
 */
export function mountViewGeoJSONLink(
  container: HTMLElement,
  geojsonUrl: string,
  rulesUrl: string | null
): void {
  let bar = container.parentElement?.querySelector<HTMLDivElement>(
    ':scope > .audiom-sample-links'
  );
  if (!bar) {
    bar = document.createElement('div');
    bar.className = 'audiom-sample-links';
    bar.style.cssText =
      'display:flex;gap:0.75rem;flex-wrap:wrap;margin:0.5rem 0 0.75rem;font-size:0.9rem;';
    container.parentElement?.insertBefore(bar, container);
  }
  bar.innerHTML = '';
  const geoLink = document.createElement('a');
  geoLink.href = geojsonUrl;
  geoLink.target = '_blank';
  geoLink.rel = 'noopener noreferrer';
  geoLink.textContent = 'View GeoJSON';
  geoLink.title = geojsonUrl;
  bar.appendChild(geoLink);
  if (rulesUrl) {
    const rulesLink = document.createElement('a');
    rulesLink.href = rulesUrl;
    rulesLink.target = '_blank';
    rulesLink.rel = 'noopener noreferrer';
    rulesLink.textContent = 'View Rules';
    rulesLink.title = rulesUrl;
    bar.appendChild(rulesLink);
  }
}
