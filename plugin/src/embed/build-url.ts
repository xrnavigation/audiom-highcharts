import type Highcharts from 'highcharts';
import {
  AudiomEmbedConfig,
  Coordinates,
  type IAudiomEmbedConfig,
  type IAudiomSource
} from '@xrnavigation/audiom-embedder';
import {
  PLUGIN_ONLY_KEYS,
  type AudiomPluginOptions,
  type PluginOnlyKey
} from '../types';
import { resolveSources } from './source-strategy';
import { viewportFor } from '../geo/viewport';
import type { SourceBackend, AudiomSourceValue } from '../sources/types';

export interface BuildEmbedResult {
  url: string;
  config: AudiomEmbedConfig;
  /** Resolved sources (URLs and/or IAudiomSource objects) handed to the embedder. */
  sources: AudiomSourceValue[];
  /** Backend that produced the sources, when one was used. */
  backend?: SourceBackend;
}

const PLUGIN_ONLY_SET: ReadonlySet<string> = new Set(PLUGIN_ONLY_KEYS);

/**
 * Compose an `AudiomEmbedConfig.dynamic({...}).toUrl(baseUrl)` call from
 * the resolved plugin options + the chart. Field-level normalisation is
 * delegated to the embedder; this module only translates plugin options
 * into the embedder's configuration shape.
 *
 * Returns `null` when nothing extractable was found and the user did not
 * supply sources — there's no point producing a useless URL.
 */
export async function buildEmbedUrl(
  chart: Highcharts.Chart,
  options: AudiomPluginOptions,
  signal?: AbortSignal
): Promise<BuildEmbedResult | null> {
  const { sources, geojson, backend } = await resolveSources(
    chart,
    options,
    signal
  );
  if (sources.length === 0) return null;

  // Derive viewport from extracted GeoJSON unless the caller pinned one.
  const derivedViewport = geojson ? viewportFor(geojson) : null;

  // Strip plugin-only fields; everything else is a passthrough to the
  // embedder. Driven by PLUGIN_ONLY_KEYS so adding a new plugin-only
  // option auto-strips it (and the assertion in types.ts catches drift).
  const embedderPassthrough: Partial<IAudiomEmbedConfig> = {};
  for (const [key, value] of Object.entries(options)) {
    if (PLUGIN_ONLY_SET.has(key)) continue;
    if (value === undefined) continue;
    (embedderPassthrough as Record<string, unknown>)[key] = value;
  }

  const configInput: Omit<IAudiomEmbedConfig, 'embedId'> = {
    ...(embedderPassthrough as Omit<IAudiomEmbedConfig, 'embedId' | 'sources'>),
    sources: sources as IAudiomSource[] | string[]
  };

  // Caller-provided center/zoom win over derived viewport.
  if (options.center !== undefined) {
    configInput.center = Coordinates.fromArray(options.center);
  } else if (
    derivedViewport &&
    configInput.latitude === undefined &&
    configInput.longitude === undefined
  ) {
    configInput.longitude = derivedViewport.center[0];
    configInput.latitude = derivedViewport.center[1];
  }
  if (configInput.zoom === undefined && derivedViewport) {
    configInput.zoom = derivedViewport.zoom;
  }

  const config = AudiomEmbedConfig.dynamic(configInput);
  const url = options.baseUrl ? config.toUrl(options.baseUrl) : config.toUrl();
  return { url, config, sources, backend };
}

// Reference PluginOnlyKey to keep the import in the .d.ts so consumers
// can opt into the literal union type if they need it.
export type _PluginOnlyKey = PluginOnlyKey;
