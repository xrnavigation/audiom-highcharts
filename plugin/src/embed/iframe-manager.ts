/**
 * Tiny iframe factory for hosting an Audiom embed URL.
 */

export interface CreateIframeOptions {
  url: string;
  /** Accessible title; surfaces in screen readers and tab order. */
  title: string;
  /** Optional className appended to the iframe. */
  className?: string;
}

/**
 * Create an iframe configured for hosting an Audiom embed. The iframe is
 * deliberately permissive on `allow` attributes (audio playback, fullscreen,
 * autoplay) since Audiom needs them, and uses a strict-ish `sandbox`.
 */
export function createAudiomIframe(opts: CreateIframeOptions): HTMLIFrameElement {
  const iframe = document.createElement('iframe');
  iframe.src = opts.url;
  iframe.title = opts.title;
  iframe.className = ['audiom-hc-iframe', opts.className]
    .filter(Boolean)
    .join(' ');
  iframe.setAttribute('loading', 'lazy');
  iframe.setAttribute(
    'allow',
    'autoplay; fullscreen; clipboard-write; microphone'
  );
  iframe.setAttribute(
    'sandbox',
    'allow-scripts allow-same-origin allow-forms allow-popups allow-downloads'
  );
  return iframe;
}

/** Update the iframe `src` if it has changed. Returns true if updated. */
export function updateIframeUrl(
  iframe: HTMLIFrameElement,
  url: string
): boolean {
  if (iframe.src === url) return false;
  iframe.src = url;
  return true;
}
