/**
 * Pluggable storage backends for the GeoJSON the Audiom iframe consumes.
 *
 * The plugin extracts a {@link FeatureCollection} from a chart, then hands
 * it to a {@link SourceBackend} which is responsible for making it
 * fetchable by the Audiom iframe. The backend returns a list of values
 * suitable for `AudiomEmbedConfig.dynamic({ sources })` — typically one or
 * more URLs, but can also be inline `data:` URIs or richer
 * {@link IAudiomSource} descriptors.
 *
 * Built-in backends:
 *   - {@link inlineBackend}      data: URI (no network, size-limited)
 *   - {@link staticBackend}      pre-baked URLs supplied by the host
 *   - {@link restBackend}        POST to your endpoint, expect `{ url }`
 *   - {@link s3PresignedBackend} GET presigned PUT, upload, return public URL
 *   - {@link devServerBackend}   pairs with `audiomHighchartsDev()` Vite plugin
 *   - {@link memoryBackend}      in-process Map (tests / single-page demos)
 *
 * Hosts can implement their own backend (Redis, Cloudflare R2, GCS, an
 * authed Rails endpoint, etc.) by satisfying the {@link SourceBackend}
 * interface and passing it as `audiom.backend`.
 */
import type { IAudiomSource } from '@xrnavigation/audiom-embedder';
import type { FeatureCollection } from '../geo/types';

/**
 * Information the plugin gives a backend at upload time. Backends may use
 * any subset of these (e.g. for cache keys, file naming, audit logging).
 */
export interface SourcePutContext {
  /** Stable id for this chart instance (Highcharts `chart.index`). */
  chartId: string | number;
  /** Title text from the chart, when available. */
  chartTitle?: string;
  /** MIME type the bytes should be served as. */
  contentType: string;
  /** AbortSignal so callers can cancel a pending upload. */
  signal?: AbortSignal;
}

/** A value Audiom understands as a `sources` entry. */
export type AudiomSourceValue = IAudiomSource | string;

/**
 * Names of the built-in backends. Custom user backends may use any string.
 */
export type BuiltinBackendName =
  | 'inline'
  | 'static'
  | 'rest'
  | 's3-presigned'
  | 'dev-server'
  | 'memory';

/**
 * Pluggable storage + serving for a chart's extracted GeoJSON.
 *
 * Implementations are responsible for: persisting the bytes (if needed),
 * making them reachable via a URL the Audiom iframe can fetch (CORS-correct
 * for the Audiom origin), and returning that URL — or, if storage is
 * client-side, returning the inline payload directly.
 */
export interface SourceBackend {
  /**
   * Discriminator for logs / errors. Built-in backends use one of
   * {@link BuiltinBackendName}; custom backends may use any string.
   */
  readonly name: BuiltinBackendName | (string & {});
  /**
   * Persist the FeatureCollection and return values suitable for
   * `AudiomEmbedConfig.dynamic({ sources })`.
   */
  put(
    collection: FeatureCollection,
    ctx: SourcePutContext
  ): Promise<AudiomSourceValue[]>;
}
