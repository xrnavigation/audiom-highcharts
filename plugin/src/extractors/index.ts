import type Highcharts from 'highcharts';
import type { SeriesExtractor } from './base';
import type { Feature, FeatureCollection } from '../geo/types';
import { choroplethExtractor } from './choropleth';

/**
 * Registry of available extractors keyed by series.type. Phase 7 will add
 * the remaining map series types (mappoint, mapbubble, mapline, heatmap,
 * tilemap, flowmap).
 */
const REGISTRY = new Map<string, SeriesExtractor>();

function register(extractor: SeriesExtractor): void {
  for (const t of extractor.seriesTypes) REGISTRY.set(t, extractor);
}

register(choroplethExtractor);

export function getExtractor(seriesType: string): SeriesExtractor | undefined {
  return REGISTRY.get(seriesType);
}

/**
 * Walk every series on the chart, run its extractor, and merge results into
 * a single FeatureCollection. Series with no registered extractor are
 * silently skipped — the plugin can still render the visual chart even if a
 * particular series type isn't yet supported on the audio side.
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
