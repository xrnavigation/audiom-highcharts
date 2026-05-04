import type Highcharts from 'highcharts';
import type { IAudiomSource } from '@xrnavigation/audiom-embedder';
import { AudiomSourceStrategy, type AudiomPluginOptions } from '../types';
import type { FeatureCollection } from '../geo/types';
import { extractGeoJSON } from '../extractors';
import {
  inlineBackend,
  restBackend,
  devServerBackend,
  staticBackend
} from '../sources';
import type {
  SourceBackend,
  ResolvedBackend,
  AudiomSourceValue
} from '../sources/types';
import { getRegisteredDevSourceUploader } from '../dev/uploader';

/**
 * Outcome of source resolution. The plugin will hand `sources` to
 * `AudiomEmbedConfig.dynamic({...})` and use `geojson` (when present) for
 * viewport calculations.
 */
export interface ResolvedSources {
  sources: (IAudiomSource | string)[];
  /** The extracted FeatureCollection, when one was produced. */
  geojson: FeatureCollection | null;
  /** Strategy that actually produced the result (after Auto resolution). */
  strategy: AudiomSourceStrategy;
  /** Backend that produced `sources` (when one was used). */
  backend?: SourceBackend;
}

const DEFAULT_TOLERANCE = 0.01;

/**
 * Resolve the data source(s) Audiom should consume.
 *
 * Selection priority (under `AudiomSourceStrategy.Auto`):
 *   1. `options.sources` supplied                    → static passthrough
 *   2. `options.backend` supplied                    → use it
 *   3. Globally-registered dev uploader present      → devServerBackend
 *   4. `options.uploadGeoJSON` callback supplied     → wrap as restBackend-shape
 *   5. Fallback                                      → inlineBackend
 *
 * Explicit `AudiomSourceStrategy` values override the priority and force
 * a specific resolution path.
 */
export async function resolveSources(
  chart: Highcharts.Chart,
  options: AudiomPluginOptions
): Promise<ResolvedSources> {
  const requested = options.sourceStrategy ?? AudiomSourceStrategy.Auto;
  const supplied = options.sources ?? [];

  // Explicit Passthrough or Auto with sources supplied → forward verbatim.
  if (requested === AudiomSourceStrategy.Passthrough) {
    return { sources: supplied, geojson: null, strategy: AudiomSourceStrategy.Passthrough };
  }
  if (requested === AudiomSourceStrategy.Auto && supplied.length > 0) {
    return { sources: supplied, geojson: null, strategy: AudiomSourceStrategy.Passthrough };
  }

  // Anything past this point needs an extracted FeatureCollection.
  const collection = extractGeoJSON(chart);
  if (collection.features.length === 0) {
    return { sources: supplied, geojson: null, strategy: requested };
  }

  // Pick a backend to put the collection through.
  const resolved = pickBackend(requested, options);
  const ctx = {
    chartId: chart.index,
    chartTitle:
      (chart.title as unknown as { textStr?: string } | undefined)?.textStr ??
      undefined,
    contentType: 'application/geo+json'
  };
  const sources: AudiomSourceValue[] = await resolved.backend.put(collection, ctx);
  return {
    sources,
    geojson: collection,
    strategy: backendToStrategy(resolved, requested),
    backend: resolved.backend
  };
}

/** Choose which backend to use for this resolution. */
function pickBackend(
  requested: AudiomSourceStrategy,
  options: AudiomPluginOptions
): ResolvedBackend {
  const tolerance = options.simplifyTolerance ?? DEFAULT_TOLERANCE;

  // Explicit strategies bypass the priority ladder.
  if (requested === AudiomSourceStrategy.Inline) {
    return { backend: inlineBackend({ simplifyTolerance: tolerance }), origin: 'option' };
  }
  if (requested === AudiomSourceStrategy.DevUploader) {
    return { backend: resolveDevServerBackend(), origin: 'option' };
  }
  if (requested === AudiomSourceStrategy.Upload) {
    if (options.backend) return { backend: options.backend, origin: 'option' };
    if (options.uploadGeoJSON) {
      return { backend: callbackBackend(options.uploadGeoJSON), origin: 'legacy-callback' };
    }
    throw new Error(
      'audiom-highcharts: sourceStrategy=Upload requires either `backend` or the (deprecated) `uploadGeoJSON` callback.'
    );
  }

  // Auto: explicit backend > sources passthrough > dev uploader > legacy callback > inline.
  if (options.backend) return { backend: options.backend, origin: 'option' };
  if (options.sources?.length) {
    return { backend: staticBackend(options.sources as AudiomSourceValue[]), origin: 'option' };
  }
  if (getRegisteredDevSourceUploader()) {
    return { backend: resolveDevServerBackend(), origin: 'legacy-dev' };
  }
  if (options.uploadGeoJSON) {
    return { backend: callbackBackend(options.uploadGeoJSON), origin: 'legacy-callback' };
  }
  return { backend: inlineBackend({ simplifyTolerance: tolerance }), origin: 'default' };
}

/** Wrap the legacy `uploadGeoJSON(collection): Promise<string>` callback. */
function callbackBackend(
  cb: (c: FeatureCollection) => Promise<string>
): SourceBackend {
  return {
    name: 'legacy-uploadGeoJSON',
    async put(collection): Promise<AudiomSourceValue[]> {
      const url = await cb(collection);
      return [url];
    }
  };
}

/** Build a dev-server backend, preferring the registered handle's endpoint. */
function resolveDevServerBackend(): SourceBackend {
  const reg = getRegisteredDevSourceUploader();
  return devServerBackend(reg ? { endpoint: reg.endpoint } : {});
}

/** Map a resolved backend back to a strategy enum value for log/return parity. */
function backendToStrategy(
  resolved: ResolvedBackend,
  requested: AudiomSourceStrategy
): AudiomSourceStrategy {
  if (requested !== AudiomSourceStrategy.Auto) return requested;
  switch (resolved.backend.name) {
    case 'inline':         return AudiomSourceStrategy.Inline;
    case 'dev-server':     return AudiomSourceStrategy.DevUploader;
    case 'static':         return AudiomSourceStrategy.Passthrough;
    default:               return AudiomSourceStrategy.Upload;
  }
}
