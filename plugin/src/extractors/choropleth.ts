import type Highcharts from 'highcharts';
import { seriesOptions, type SeriesExtractor } from './base';
import { topojsonToGeoJSON } from '../geo/topojson-to-geojson';
import {
  mergeDataIntoFeatures,
  type HighchartsLikePoint
} from '../geo/data-merger';
import {
  isFeatureCollection,
  isTopology,
  type FeatureCollection
} from '../geo/types';

/**
 * Extractor for `series.type === 'map'` (choropleth). Reads either the
 * series-level `mapData` option or the chart-level `chart.map` option,
 * converts TopoJSON → GeoJSON if needed, and merges Highcharts data values
 * into each Feature's properties via `joinBy` (default `hc-key`).
 */
export const choroplethExtractor: SeriesExtractor = {
  seriesTypes: ['map'] as const,
  extract(series): FeatureCollection | null {
    const opts = seriesOptions(series);
    const chartOpts = (series.chart.options as { chart?: { map?: unknown } })
      .chart;

    const rawGeo = opts.mapData ?? chartOpts?.map;
    if (!rawGeo) return null;
    if (!isTopology(rawGeo) && !isFeatureCollection(rawGeo)) return null;

    const collection = topojsonToGeoJSON(rawGeo);

    const data = extractDataPoints(series);
    const joinBy = (opts.joinBy as string | [string, string] | undefined) ??
      'hc-key';

    return mergeDataIntoFeatures(collection, data, joinBy, 'choropleth_region');
  }
};

/**
 * Pull a normalized list of data points off a series. Highcharts may store
 * data as Point instances (after init) or as raw user options (before).
 */
function extractDataPoints(
  series: Highcharts.Series
): HighchartsLikePoint[] {
  const live = (series as unknown as { points?: unknown[] }).points;
  if (Array.isArray(live) && live.length > 0) {
    return live.map((p) => normalizePoint(p));
  }
  const raw = (seriesOptions(series).data as unknown[]) ?? [];
  return raw.map((p) => normalizePoint(p));
}

function normalizePoint(point: unknown): HighchartsLikePoint {
  if (point === null || point === undefined) return {};
  if (typeof point === 'number') return { value: point };
  if (Array.isArray(point)) {
    // [hc-key, value] or [name, value]
    const [a, b] = point as [unknown, unknown];
    return {
      'hc-key': typeof a === 'string' ? a : undefined,
      name: typeof a === 'string' ? a : undefined,
      value: typeof b === 'number' ? b : undefined
    } as HighchartsLikePoint;
  }
  return point as HighchartsLikePoint;
}
