import type Highcharts from 'highcharts';
import type { FeatureCollection } from '../geo/types';

/**
 * A SeriesExtractor turns a single Highcharts series into a GeoJSON
 * FeatureCollection. Returns null when the series cannot be processed (e.g.
 * mapData missing) so callers can skip without throwing.
 */
export interface SeriesExtractor {
  /** The series.type strings this extractor supports. */
  readonly seriesTypes: readonly string[];
  extract(series: Highcharts.Series): FeatureCollection | null;
}

/** Loose accessor to the userOptions on a series, where Highcharts stashes the original mapData/joinBy. */
export function seriesOptions(
  series: Highcharts.Series
): Record<string, unknown> {
  // userOptions is the merged user-supplied options bag.
  return ((series as unknown as { userOptions?: Record<string, unknown> })
    .userOptions ?? {}) as Record<string, unknown>;
}
