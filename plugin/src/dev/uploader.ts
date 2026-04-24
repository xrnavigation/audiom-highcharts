/**
 * Browser-side helper for the audiom-highcharts dev source server.
 *
 * Pairs with the `audiomHighchartsDev()` Vite plugin. Calling
 * {@link registerDevSourceUploader} stores a handle that the source-strategy
 * resolver picks up automatically — Auto resolution will POST extracted
 * FeatureCollections to the dev endpoint and hand the returned URL to
 * Audiom instead of inlining a giant `data:` URI.
 *
 * Why this exists: the Audiom iframe loads from a different origin than
 * the host site (in dev: a separate localhost port). The browser will
 * only let it fetch a URL on the host if the response carries a real
 * `Access-Control-Allow-Origin` header. A service worker on the host
 * origin cannot satisfy that — its `fetch` event only fires for clients
 * it controls, and a foreign-origin iframe is not such a client. A real
 * HTTP middleware response is the only thing that works.
 *
 * Production note: don't register this in production builds. Use the
 * `uploadGeoJSON` plugin option to point at a real backend or a static
 * pre-baked GeoJSON URL instead.
 */
import type { FeatureCollection } from '../geo/types';

export interface RegisterDevSourceUploaderOptions {
  /**
   * Base URL of the dev uploader's POST endpoint. Defaults to the
   * conventional `<origin>/__audiom__/upload` which matches the Vite
   * plugin's default prefix.
   */
  endpoint?: string;
}

export interface DevSourceUploaderHandle {
  /** Endpoint this handle posts to. */
  readonly endpoint: string;
  /**
   * POST a FeatureCollection. Resolves with an absolute URL the
   * cross-origin Audiom iframe can fetch.
   */
  upload(collection: FeatureCollection): Promise<string>;
}

let registered: DevSourceUploaderHandle | null = null;

/**
 * Register a dev uploader. Idempotent — repeated calls overwrite the
 * previous registration with the new endpoint.
 */
export function registerDevSourceUploader(
  options: RegisterDevSourceUploaderOptions = {}
): DevSourceUploaderHandle {
  const endpoint = options.endpoint ?? defaultEndpoint();
  const handle: DevSourceUploaderHandle = {
    endpoint,
    async upload(collection) {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(collection)
      });
      if (!res.ok) {
        throw new Error(
          `audiom-highcharts dev uploader: POST ${endpoint} → ${res.status}`
        );
      }
      const data = (await res.json()) as { url?: string };
      if (!data.url) {
        throw new Error(
          'audiom-highcharts dev uploader: response missing `url`'
        );
      }
      // Resolve relative → absolute against the page's origin so the
      // cross-origin iframe can fetch it.
      return new URL(data.url, window.location.href).href;
    }
  };
  registered = handle;
  return handle;
}

/** Sync accessor used by the source-strategy resolver. */
export function getRegisteredDevSourceUploader(): DevSourceUploaderHandle | null {
  return registered;
}

function defaultEndpoint(): string {
  if (typeof window === 'undefined') return '/__audiom__/upload';
  return new URL('/__audiom__/upload', window.location.href).href;
}
