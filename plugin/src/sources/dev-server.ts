/**
 * Dev-server backend — pairs with the `audiomHighchartsDev()` Vite plugin.
 *
 * Same wire format as {@link restBackend}, but defaults to the Vite
 * plugin's conventional `/__audiom__/upload` route. Kept as a separate
 * named factory because it's the canonical local-dev choice and makes
 * sample code self-documenting.
 */
import { restBackend } from './rest';
import type { SourceBackend } from './types';

export interface DevServerBackendOptions {
  /**
   * Override the upload endpoint. Defaults to
   * `<page-origin>/__audiom__/upload` which matches the Vite plugin's
   * default prefix.
   */
  endpoint?: string;
}

export function devServerBackend(options: DevServerBackendOptions = {}): SourceBackend {
  const endpoint = options.endpoint ?? defaultEndpoint();
  const inner = restBackend({ endpoint });
  return {
    name: 'dev-server',
    put: inner.put
  };
}

function defaultEndpoint(): string {
  if (typeof window === 'undefined') return '/__audiom__/upload';
  return new URL('/__audiom__/upload', window.location.href).href;
}
