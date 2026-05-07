/**
 * Public extractor registry. Hosts can register custom `SeriesExtractor`s
 * (e.g. for proprietary series subclasses or third-party Highcharts
 * modules) via `registerExtractor()`. The choropleth extractor is
 * pre-registered for `series.type === 'map'`.
 *
 * Future built-ins (`mappoint`, `mapbubble`, `mapline`, `tilemap`,
 * `flowmap`, `heatmap`) will be added incrementally.
 */
import type Highcharts from 'highcharts';
import type { SeriesExtractor } from './base';
import type { Feature, FeatureCollection } from '../geo/types';
import { choroplethExtractor } from './choropleth';

export type { SeriesExtractor } from './base';

const REGISTRY = new Map<string, SeriesExtractor>();

/**
 * Register a custom series extractor. Re-registering an existing
 * `seriesType` replaces the previous handler.
 */
export function registerExtractor(extractor: SeriesExtractor): void {
  for (const t of extractor.seriesTypes) REGISTRY.set(t, extractor);
}

/** Remove a previously-registered extractor for `seriesType`. */
export function unregisterExtractor(seriesType: string): boolean {
  return REGISTRY.delete(seriesType);
}

/** Look up the extractor for a given Highcharts series type, if any. */
export function getExtractor(seriesType: string): SeriesExtractor | undefined {
  return REGISTRY.get(seriesType);
}

/** True when at least one extractor is registered for the series type. */
export function hasExtractor(seriesType: string): boolean {
  return REGISTRY.has(seriesType);
}

/** All series types currently handled by a registered extractor. */
export function registeredSeriesTypes(): string[] {
  return Array.from(REGISTRY.keys());
}

// Bootstrap: register the built-in choropleth handler.
registerExtractor(choroplethExtractor);

/**
 * Walk every series on the chart, run its extractor, and merge results
 * into a single FeatureCollection. Series with no registered extractor
 * are silently skipped — the plugin can still render the visual chart
 * even if a particular series type isn't supported on the audio side.
 */
export function extractGeoJSON(chart: Highcharts.Chart): FeatureCollection {
  const allFeatures: Feature[] = [];
  for (const series of chart.series ?? []) {
    const extractor = REGISTRY.get(series.type as string);
    if (!extractor) continue;
    const collection = extractor.extract(series);
    if (collection) allFeatures.push(...collection.features);
  }
  return { type: 'FeatureCollection', features: allFeatures };
}
