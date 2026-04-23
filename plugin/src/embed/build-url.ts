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

export interface BuildEmbedResult {
  url: string;
  config: AudiomEmbedConfig;
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
export function buildEmbedUrl(
  chart: Highcharts.Chart,
  options: AudiomPluginOptions
): BuildEmbedResult | null {
  const { sources, geojson } = resolveSources(chart, options);
  if (sources.length === 0) return null;

  // Derive viewport from extracted GeoJSON unless the caller pinned one.
  const derivedViewport = geojson ? viewportFor(geojson) : null;

  const configInput: Omit<IAudiomEmbedConfig, 'embedId'> = {
    apiKey: options.apiKey,
    sources: sources as IAudiomSource[] | string[]
  };

  if (options.title !== undefined) configInput.title = options.title;
  if (options.soundpack !== undefined) configInput.soundpack = options.soundpack;
  if (options.stepSize !== undefined) configInput.stepSize = options.stepSize;
  if (options.filters !== undefined) configInput.filters = options.filters;
  if (options.filterMode !== undefined) configInput.filterMode = options.filterMode;
  if (options.visualStyle !== undefined) configInput.visualStyle = options.visualStyle;
  if (options.showVisualMap !== undefined) configInput.showVisualMap = options.showVisualMap;
  if (options.heading !== undefined) configInput.heading = options.heading;
  if (options.allowedOrigins !== undefined) configInput.allowedOrigins = options.allowedOrigins;
  if (options.demo !== undefined) configInput.demo = options.demo;
  if (options.additionalParams !== undefined) configInput.additionalParams = options.additionalParams;

  // Caller-provided center/zoom win over derived viewport.
  if (options.center !== undefined) {
    configInput.center = Coordinates.fromArray(options.center);
  } else if (derivedViewport) {
    configInput.longitude = derivedViewport.center[0];
    configInput.latitude = derivedViewport.center[1];
  }
  if (options.zoom !== undefined) {
    configInput.zoom = options.zoom;
  } else if (derivedViewport) {
    configInput.zoom = derivedViewport.zoom;
  }

  const config = AudiomEmbedConfig.dynamic(configInput);
  const url = options.baseUrl ? config.toUrl(options.baseUrl) : config.toUrl();
  return { url, config };
}
