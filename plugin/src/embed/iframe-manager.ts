/**
 * Tiny iframe factory for hosting an Audiom embed URL.
 */
import type { AudiomIframeOptions } from '../types';

/**
 * Default `allow` attribute. Audiom needs autoplay (audio playback),
 * fullscreen (visual map), clipboard-write (copy-link buttons), and
 * microphone (voice control). Hosts that don't want microphone access
 * can pass `iframe: { allow: 'autoplay; fullscreen; clipboard-write' }`.
 */
export const DEFAULT_IFRAME_ALLOW =
  'autoplay; fullscreen; clipboard-write; microphone';

/**
 * Default `sandbox` attribute. **`allow-same-origin` is only safe when
 * the embed is served from a different origin than the host page** (the
 * common case for Audiom). For same-origin embeds, narrow the sandbox
 * via `iframe: { sandbox: '...' }`.
 */
export const DEFAULT_IFRAME_SANDBOX =
  'allow-scripts allow-same-origin allow-forms allow-popups allow-downloads';

export interface CreateIframeOptions {
  url: string;
  /** Accessible title; surfaces in screen readers and tab order. */
  title: string;
  /** Optional className appended to the iframe. */
  className?: string;
  /** Override `allow` / `sandbox`. See {@link AudiomIframeOptions}. */
  iframe?: AudiomIframeOptions;
}

/**
 * Create an iframe configured for hosting an Audiom embed.
 */
export function createAudiomIframe(opts: CreateIframeOptions): HTMLIFrameElement {
  const iframe = document.createElement('iframe');
  iframe.src = opts.url;
  iframe.title = opts.title;
  iframe.className = ['audiom-hc-iframe', opts.className]
    .filter(Boolean)
    .join(' ');
  iframe.setAttribute('loading', 'lazy');
  iframe.setAttribute('allow', opts.iframe?.allow ?? DEFAULT_IFRAME_ALLOW);
  iframe.setAttribute(
    'sandbox',
    opts.iframe?.sandbox ?? DEFAULT_IFRAME_SANDBOX
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
