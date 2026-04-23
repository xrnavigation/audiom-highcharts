import type Highcharts from 'highcharts';
import type { IAudiomSource } from '@xrnavigation/audiom-embedder';
import type { AudiomPluginOptions } from '../types';
import type { FeatureCollection } from '../geo/types';
import { extractGeoJSON } from '../extractors';
import { geojsonToDataUri } from './data-uri';

/**
 * Result of resolving the source strategy. The plugin will pass `sources`
 * straight to `AudiomEmbedConfig.dynamic({...})` and use `geojson` (when
 * present) for viewport/extent calculations.
 */
export interface ResolvedSources {
  sources: (IAudiomSource | string)[];
  /** The extracted FeatureCollection, when one was produced. */
  geojson: FeatureCollection | null;
}

/**
 * Decide what `sources` value to hand to Audiom based on the configured
 * `sourceStrategy`:
 *
 * - `passthrough` — the host page provides one or more Audiom sources
 *   directly via `options.audiom.sources`. The plugin just forwards them.
 * - `extract` — build a single GeoJSON source from the Highcharts series
 *   data. No host-supplied sources are honored.
 * - `auto` (default) — passthrough when sources are supplied, otherwise
 *   extract.
 */
export function resolveSources(
  chart: Highcharts.Chart,
  options: AudiomPluginOptions
): ResolvedSources {
  const strategy = options.sourceStrategy ?? 'auto';
  const supplied = options.sources ?? [];

  if (strategy === 'passthrough') {
    return { sources: supplied, geojson: null };
  }
  if (strategy === 'auto' && supplied.length > 0) {
    return { sources: supplied, geojson: null };
  }

  // extract path
  const collection = extractGeoJSON(chart);
  if (collection.features.length === 0) {
    return { sources: supplied, geojson: null };
  }
  const dataUri = geojsonToDataUri(collection);
  return {
    sources: [dataUri],
    geojson: collection
  };
}
