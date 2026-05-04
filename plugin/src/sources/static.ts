/**
 * Static backend — host has pre-baked GeoJSON files at known URLs and
 * just wants the plugin to forward them to Audiom verbatim.
 *
 * Suited for production sites whose maps don't vary per-user / per-session.
 * Combine with S3 + CloudFront (or any CDN) and enable CORS for the
 * Audiom embed origin on the bucket.
 */
import type { SourceBackend, AudiomSourceValue } from './types';

/**
 * Always returns the supplied sources, regardless of what the chart
 * extracted. Use when the FeatureCollection is identical for every viewer
 * and is more cheaply served as a static asset.
 */
export function staticBackend(sources: AudiomSourceValue[]): SourceBackend {
  if (!Array.isArray(sources) || sources.length === 0) {
    throw new Error('audiom-highcharts: staticBackend requires at least one source URL.');
  }
  const frozen = sources.slice();
  return {
    name: 'static',
    async put(): Promise<AudiomSourceValue[]> {
      return frozen;
    }
  };
}
