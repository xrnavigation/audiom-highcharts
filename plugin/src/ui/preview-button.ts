/**
 * "Open in Audiom" preview button.
 *
 * Renders a small button bar that opens the Audiom embed URL in a new tab.
 * Useful as a fallback when the iframe approach is not viable in the host
 * environment — e.g. when Chrome/Edge's Private Network Access policy blocks
 * a public-origin Audiom embed from fetching a localhost GeoJSON URL during
 * development.
 *
 * Note on PNA: opening Audiom in a new tab does NOT bypass PNA. The new
 * top-level page is still on the public Audiom origin and any subresource
 * fetch it makes to a private/loopback address is subject to the same
 * preflight rules. The button is most useful when the GeoJSON URL is
 * publicly reachable (production uploads, tunnel via `publicBase`, etc.).
 */

import { ensureStylesInjected } from './styles';

export interface PreviewButtonOptions {
  url: string;
  label?: string;
  /** Tooltip text. */
  title?: string;
  /** Where the link opens. Default `_blank`. */
  target?: string;
}

export interface PreviewButtonHandle {
  readonly element: HTMLElement;
  readonly anchor: HTMLAnchorElement;
  setUrl(url: string): void;
  destroy(): void;
}

/**
 * Build a small bar containing a single anchor styled as a button. Returned
 * detached from the DOM — the caller decides where to mount it.
 */
export function createPreviewButton(opts: PreviewButtonOptions): PreviewButtonHandle {
  const doc = document;
  ensureStylesInjected(doc);

  const bar = doc.createElement('div');
  bar.className = 'audiom-hc-preview-bar';

  const a = doc.createElement('a');
  a.className = 'audiom-hc-preview-button';
  a.href = opts.url;
  a.target = opts.target ?? '_blank';
  a.rel = 'noopener noreferrer';
  a.textContent = opts.label ?? 'Open in Audiom';
  if (opts.title) a.title = opts.title;

  bar.appendChild(a);

  return {
    element: bar,
    anchor: a,
    setUrl(url: string) {
      a.href = url;
    },
    destroy() {
      bar.parentNode?.removeChild(bar);
    }
  };
}

/**
 * Mount a preview button immediately after the chart's `renderTo` element,
 * non-destructively. Returns a handle whose `destroy()` removes the button.
 */
export function mountPreviewButtonAfter(
  renderTo: HTMLElement,
  opts: PreviewButtonOptions
): PreviewButtonHandle {
  const handle = createPreviewButton(opts);
  renderTo.parentNode?.insertBefore(handle.element, renderTo.nextSibling);
  return handle;
}
