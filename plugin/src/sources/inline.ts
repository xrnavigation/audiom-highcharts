/**
 * Inline backend — encodes the FeatureCollection as a `data:` URI.
 *
 * No network, no storage, no CORS. The base64 payload is ~33% larger
 * than the raw JSON; some environments cap URL length aggressively
 * (Heroku ≈ 8KB on the inbound URL when the data: URI is stuffed into
 * a query string, CloudFront ≈ 32KB). For real-world country borders
 * use a server-backed backend instead.
 *
 * The `topojson-*` simplifier is loaded **lazily** so hosts that pass
 * `simplifyTolerance: 0` (or use a different backend entirely) don't
 * pay the ~30 KB gzipped bundle cost.
 */
import type { FeatureCollection } from '../geo/types';
import { geojsonToDataUri } from '../embed/data-uri';
import type { SourceBackend, AudiomSourceValue } from './types';

export interface InlineBackendOptions {
  /**
   * Maximum simplification weight (Visvalingam–Whyatt threshold in
   * squared degrees) applied before encoding. `0` disables
   * simplification. Typical values: `0.001`–`0.05`.
   * @default 0.01
   */
  simplifyTolerance?: number;
  /**
   * Hard cap on the encoded data URI length (characters). Throws when
   * the encoded payload exceeds the limit so callers fail loudly
   * instead of silently producing a URL their host environment will
   * reject. Defaults to ~32KB which most CDNs allow.
   * @default 32_000
   */
  maxUriLength?: number;
}

const DEFAULT_TOLERANCE = 0.01;
const DEFAULT_MAX_URI_LENGTH = 32_000;

export function inlineBackend(options: InlineBackendOptions = {}): SourceBackend {
  const tol = options.simplifyTolerance ?? DEFAULT_TOLERANCE;
  const maxLen = options.maxUriLength ?? DEFAULT_MAX_URI_LENGTH;
  return {
    name: 'inline',
    async put(collection: FeatureCollection): Promise<AudiomSourceValue[]> {
      const slim =
        tol > 0
          ? // Lazy import keeps topojson-server / -simplify out of the
            // bundle when no caller exercises the simplification path.
            (await import('../geo/simplify')).simplifyFeatureCollection(
              collection,
              tol
            )
          : collection;
      const uri = geojsonToDataUri(slim);
      if (uri.length > maxLen) {
        throw new Error(
          `audiom-highcharts: inlineBackend produced a ${uri.length}-char ` +
            `data: URI which exceeds maxUriLength=${maxLen}. Increase ` +
            'maxUriLength, raise simplifyTolerance, or switch to a ' +
            'server-backed backend (restBackend / s3PresignedBackend).'
        );
      }
      return [uri];
    }
  };
}
