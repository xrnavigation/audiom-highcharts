/**
 * "View GeoJSON" / "View Rules" link bar — a small row of anchor links
 * mounted above a chart container that exposes the URLs Audiom is
 * fetching, primarily for inspection / debugging during development.
 *
 * Promoted from the sample so any host with `onEmbedReady` handy can
 * surface the same diagnostics without copying DOM glue.
 */
import type { AudiomSourceValue } from '../sources/types';
import { ensureStylesInjected } from './styles';

export interface SourceLinksOptions {
  /** First-source-of-truth URL the embed will fetch. */
  geojsonUrl: string;
  /** Optional rules URL, when the host uploaded one separately. */
  rulesUrl?: string | null;
  /** Label for the GeoJSON link. @default "View GeoJSON" */
  geojsonLabel?: string;
  /** Label for the rules link. @default "View Rules" */
  rulesLabel?: string;
}

export interface SourceLinksHandle {
  readonly element: HTMLElement;
  destroy(): void;
}

/**
 * Pull the served GeoJSON URL out of a resolved sources list. Returns
 * the first string source, or the `source` field of the first
 * `IAudiomSource`.
 */
export function firstSourceUrl(sources: AudiomSourceValue[]): string | null {
  for (const s of sources) {
    if (typeof s === 'string') return s;
    if (s && typeof s.source === 'string') return s.source;
  }
  return null;
}

/** Build the link-bar `<div>` (without inserting it into the DOM). */
export function createSourceLinks(opts: SourceLinksOptions): SourceLinksHandle {
  ensureStylesInjected();
  const bar = document.createElement('div');
  bar.className = 'audiom-hc-source-links';

  bar.appendChild(
    anchor(opts.geojsonUrl, opts.geojsonLabel ?? 'View GeoJSON')
  );
  if (opts.rulesUrl) {
    bar.appendChild(anchor(opts.rulesUrl, opts.rulesLabel ?? 'View Rules'));
  }

  return {
    element: bar,
    destroy() {
      bar.remove();
    }
  };
}

/**
 * Create the link bar and insert it immediately *before* `container` in
 * the DOM (typical use: pass `chart.renderTo`). Idempotent per
 * container — subsequent calls replace the bar in place.
 */
export function mountSourceLinksAfter(
  container: HTMLElement,
  opts: SourceLinksOptions
): SourceLinksHandle {
  const handle = createSourceLinks(opts);
  const existing = container.parentElement?.querySelector<HTMLElement>(
    ':scope > .audiom-hc-source-links'
  );
  if (existing) existing.remove();
  container.parentElement?.insertBefore(handle.element, container);
  return handle;
}

function anchor(url: string, text: string): HTMLAnchorElement {
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.textContent = text;
  a.title = url;
  return a;
}
