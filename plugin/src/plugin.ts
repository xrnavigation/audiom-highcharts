import type Highcharts from 'highcharts';
import type {
  AudiomGlobalOptions,
  AudiomPluginOptions
} from './types';
import { buildEmbedUrl } from './embed/build-url';

/**
 * Internal: holds global defaults supplied via `init()`. A weak default so
 * that calls to `init()` without options still register hooks.
 */
let globalDefaults: AudiomGlobalOptions = {};

/** Marker to prevent registering hooks twice on the same Highcharts namespace. */
const REGISTERED_FLAG = '__audiomHighchartsRegistered';

/**
 * Returns true when the chart appears to be a Highcharts Maps chart. We rely
 * on the presence of a map series type or the `mapView` accessor that
 * highmaps adds to the chart instance.
 */
export function isMapChart(chart: Highcharts.Chart): boolean {
  if ((chart as unknown as { mapView?: unknown }).mapView) {
    return true;
  }
  const mapTypes = new Set([
    'map',
    'mapline',
    'mappoint',
    'mapbubble',
    'heatmap',
    'tilemap',
    'flowmap'
  ]);
  return chart.series?.some((s) => mapTypes.has(s.type as string)) ?? false;
}

/**
 * Merge per-chart options on top of globals. Returns null when the chart
 * effectively opts out (enabled === false or no API key available).
 */
export function resolveOptions(
  chart: Highcharts.Chart
): AudiomPluginOptions | null {
  const perChart = (chart.options as { audiom?: Partial<AudiomPluginOptions> })
    .audiom;
  const merged: Partial<AudiomPluginOptions> = {
    ...globalDefaults,
    ...(perChart ?? {})
  };

  if (merged.enabled === false) {
    return null;
  }
  if (!merged.apiKey) {
    return null;
  }
  return merged as AudiomPluginOptions;
}

/**
 * Should the plugin act on this chart? True when it's a map chart and config
 * resolves to a usable AudiomPluginOptions.
 */
export function isAudiomEnabled(chart: Highcharts.Chart): boolean {
  return isMapChart(chart) && resolveOptions(chart) !== null;
}

/**
 * Initialise the plugin against a Highcharts namespace. Idempotent — calling
 * `init` multiple times with the same `H` will not double-register hooks, but
 * subsequent calls do replace global defaults.
 */
export function init(
  H: typeof Highcharts,
  options: AudiomGlobalOptions = {}
): void {
  globalDefaults = { ...options };

  const flagged = H as unknown as Record<string, unknown>;
  if (flagged[REGISTERED_FLAG]) {
    return;
  }
  flagged[REGISTERED_FLAG] = true;

  H.addEvent(H.Chart, 'load', function (this: Highcharts.Chart) {
    const opts = resolveOptions(this);
    if (!opts || !isMapChart(this)) {
      return;
    }
    void onChartLoad(this, opts);
  });

  H.addEvent(H.Chart, 'destroy', function (this: Highcharts.Chart) {
    onChartDestroy(this);
  });
}

/** Phase-4 wiring: build the Audiom embed URL. UI lands in Phase 5. */
async function onChartLoad(
  chart: Highcharts.Chart,
  options: AudiomPluginOptions
): Promise<void> {
  const titleText =
    (chart.title as unknown as { textStr?: string } | undefined)?.textStr ??
    (chart.options.title as { text?: string } | undefined)?.text ??
    '';

  try {
    const result = await buildEmbedUrl(chart, options);
    if (!result) {
      // eslint-disable-next-line no-console
      console.info('[audiom-highcharts] chart', chart.index, titleText, '— no extractable geometry and no sources supplied; skipping.');
      return;
    }
    // eslint-disable-next-line no-console
    console.info('[audiom-highcharts] chart', chart.index, titleText, {
      strategy: result.strategy,
      urlLength: result.url.length,
      url: result.url
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    options.onError?.(error);
    // eslint-disable-next-line no-console
    console.error('[audiom-highcharts] failed to build embed URL', error);
  }
}

function onChartDestroy(_chart: Highcharts.Chart): void {
  // Cleanup will be implemented alongside the iframe/tab UI in Phase 5.
}
