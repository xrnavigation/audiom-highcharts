/**
 * Inline backend — encodes the FeatureCollection as a `data:` URI.
 *
 * No network, no storage, no CORS. Limits: data URIs balloon roughly 4/3×
 * after base64; some environments cap URL length (Heroku ≈ 8KB on the
 * inbound URL when stuffed into a query string). For real-world country
 * borders consider a server-backed backend instead.
 */
import type { FeatureCollection } from '../geo/types';
import { geojsonToDataUri } from '../embed/data-uri';
import { simplifyFeatureCollection } from '../geo/simplify';
import type { SourceBackend, AudiomSourceValue } from './types';

export interface InlineBackendOptions {
  /**
   * Maximum simplification weight (degrees²) applied before encoding.
   * `0` disables simplification.
   * @default 0.01
   */
  simplifyTolerance?: number;
}

export function inlineBackend(options: InlineBackendOptions = {}): SourceBackend {
  const tol = options.simplifyTolerance ?? 0.01;
  return {
    name: 'inline',
    async put(collection: FeatureCollection): Promise<AudiomSourceValue[]> {
      const slim = tol > 0 ? simplifyFeatureCollection(collection, tol) : collection;
      return [geojsonToDataUri(slim)];
    }
  };
}
