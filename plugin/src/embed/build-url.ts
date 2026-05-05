import type Highcharts from 'highcharts';
import {
  AudiomEmbedConfig,
  Coordinates,
  type IAudiomEmbedConfig,
  type IAudiomSource
} from '@xrnavigation/audiom-embedder';
import type { AudiomPluginOptions } from '../types';
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

/**
 * Compose an `AudiomEmbedConfig.dynamic({...}).toUrl(baseUrl)` call from the
 * resolved plugin options + the chart. All field-level normalization is
 * delegated to the embedder; this module only translates plugin options
 * into the embedder's configuration shape.
 *
 * Returns `null` when nothing extractable was found and the user did not
 * supply sources — there's no point producing a useless URL.
 */
export async function buildEmbedUrl(
  chart: Highcharts.Chart,
  options: AudiomPluginOptions
): Promise<BuildEmbedResult | null> {
  const { sources, geojson, backend } = await resolveSources(chart, options);
  if (sources.length === 0) return null;

  // Derive viewport from extracted GeoJSON unless the caller pinned one.
  const derivedViewport = geojson ? viewportFor(geojson) : null;

  // Strip plugin-only fields; everything else is a passthrough to the embedder.
  const {
    enabled: _enabled,
    backend: _backend,
    sources: _sourcesIn,
    center,
    displayMode: _displayMode,
    audiomTabLabel: _audiomTabLabel,
    highchartsTabLabel: _highchartsTabLabel,
    showOpenInTabButton: _showOpenInTabButton,
    openInTabLabel: _openInTabLabel,
    baseUrl: _baseUrl,
    rules: _rules,
    onReady: _onReady,
    onError: _onError,
    onEmbedReady: _onEmbedReady,
    ...embedderPassthrough
  } = options;

  const configInput: Omit<IAudiomEmbedConfig, 'embedId'> = {
    ...embedderPassthrough,
    sources: sources as IAudiomSource[] | string[]
  };

  // Caller-provided center/zoom win over derived viewport.
  if (center !== undefined) {
    configInput.center = Coordinates.fromArray(center);
  } else if (derivedViewport && configInput.latitude === undefined && configInput.longitude === undefined) {
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
