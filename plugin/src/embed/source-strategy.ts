import type Highcharts from 'highcharts';
import type { IAudiomSource } from '@xrnavigation/audiom-embedder';
import type { AudiomPluginOptions } from '../types';
import type { FeatureCollection } from '../geo/types';
import { extractGeoJSON } from '../extractors';
import type { SourceBackend, AudiomSourceValue } from '../sources/types';

/**
 * Outcome of source resolution. The plugin will hand `sources` to
 * `AudiomEmbedConfig.dynamic({...})` and use `geojson` (when present) for
 * viewport calculations.
 */
export interface ResolvedSources {
  sources: (IAudiomSource | string)[];
  /** The extracted FeatureCollection, when one was produced. */
  geojson: FeatureCollection | null;
  /** Backend that produced `sources`, when one was used. */
  backend?: SourceBackend;
}

/**
 * Resolve the data source(s) Audiom should consume.
 *
 *   - `options.sources` supplied → forward verbatim, no extraction.
 *   - `options.backend` supplied → extract from the chart and `put()` it.
 *   - Neither                    → throw with guidance.
 */
export async function resolveSources(
  chart: Highcharts.Chart,
  options: AudiomPluginOptions
): Promise<ResolvedSources> {
  if (options.sources?.length) {
    return { sources: options.sources, geojson: null };
  }

  if (!options.backend) {
    throw new Error(
      'audiom-highcharts: configure either `sources: [...]` (pre-baked URLs) ' +
        'or `backend: ...` (e.g. `inlineBackend()` for tiny demos, ' +
        '`devServerBackend()` for local dev, ' +
        '`restBackend({ endpoint })` or `s3PresignedBackend({ getPresignedPut })` ' +
        'for production).'
    );
  }

  const collection = extractGeoJSON(chart);
  if (collection.features.length === 0) {
    return { sources: [], geojson: null, backend: options.backend };
  }

  const ctx = {
    chartId: chart.index,
    chartTitle:
      (chart.title as unknown as { textStr?: string } | undefined)?.textStr ??
      undefined,
    contentType: 'application/geo+json'
  };
  const sources: AudiomSourceValue[] = await options.backend.put(collection, ctx);
  return { sources, geojson: collection, backend: options.backend };
}
