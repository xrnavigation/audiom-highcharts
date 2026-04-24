import type Highcharts from 'highcharts';
import type { IAudiomSource } from '@xrnavigation/audiom-embedder';
import { AudiomSourceStrategy, type AudiomPluginOptions } from '../types';
import type { FeatureCollection } from '../geo/types';
import { extractGeoJSON } from '../extractors';
import { simplifyFeatureCollection } from '../geo/simplify';
import { geojsonToDataUri } from './data-uri';
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
}

const DEFAULT_TOLERANCE = 0.01;

/**
 * Resolve the data source(s) Audiom should consume. See
 * {@link AudiomSourceStrategy} for the priority order Auto follows:
 * passthrough → upload → inline.
 *
 * A boundaries-only URL strategy was deliberately dropped: a bare CDN URL
 * yields just the outline because Audiom can't merge per-feature data
 * back in over PostMessage, so the chart's choropleth values would be
 * lost. Inline + Upload both stamp the values into feature properties.
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

  // Dev uploader strategy (explicit, or auto when one has been registered).
  const uploader = getRegisteredDevSourceUploader();
  if (
    requested === AudiomSourceStrategy.DevUploader ||
    (requested === AudiomSourceStrategy.Auto && uploader)
  ) {
    if (!uploader) {
      throw new Error(
        'audiom-highcharts: sourceStrategy=DevUploader requires registerDevSourceUploader() to have resolved first.'
      );
    }
    const url = await uploader.upload(collection);
    return { sources: [url], geojson: collection, strategy: AudiomSourceStrategy.DevUploader };
  }

  // Upload strategy (explicit, or auto when a hook is provided).
  if (
    requested === AudiomSourceStrategy.Upload ||
    (requested === AudiomSourceStrategy.Auto && options.uploadGeoJSON)
  ) {
    if (!options.uploadGeoJSON) {
      throw new Error(
        'audiom-highcharts: sourceStrategy=Upload requires an uploadGeoJSON callback.'
      );
    }
    const url = await options.uploadGeoJSON(collection);
    return { sources: [url], geojson: collection, strategy: AudiomSourceStrategy.Upload };
  }

  // Inline (default fallback). Simplify first to keep URL size sane.
  const tolerance = options.simplifyTolerance ?? DEFAULT_TOLERANCE;
  const slim = simplifyFeatureCollection(collection, tolerance);
  const dataUri = geojsonToDataUri(slim);
  return { sources: [dataUri], geojson: collection, strategy: AudiomSourceStrategy.Inline };
}
