/**
 * audiom-highcharts plugin entry. `init(H, options)` registers chart
 * `load` / `destroy` event hooks on a Highcharts namespace; on each
 * load, the plugin extracts GeoJSON via the configured backend, builds
 * an Audiom embed URL, and mounts the resulting iframe (or "Open in
 * Audiom" button) alongside the chart.
 */
import type Highcharts from 'highcharts';
import type {
  AudiomGlobalOptions,
  AudiomPluginOptions
} from './types';
import { AudiomDisplayMode } from './types';
import { buildEmbedUrl, type BuildEmbedResult } from './embed/build-url';
import { createAudiomIframe } from './embed/iframe-manager';
import { mountLayout, type LayoutHandle } from './ui/layout';
import {
  createPreviewButton,
  mountPreviewButtonAfter,
  type PreviewButtonHandle
} from './ui/preview-button';
import { ensureStylesInjected } from './ui/styles';
import { CSS_CLASSES } from './ui/css-classes';
import { chartRenderTo, getChartTitle } from './util/chart';
import { resolveLogger, type AudiomLogger } from './util/logger';
import { hasExtractor } from './extractors';

/** Global defaults supplied via `init()`. */
let globalDefaults: AudiomGlobalOptions = {};

/** Marker to prevent registering hooks twice on the same Highcharts namespace. */
const REGISTERED_FLAG = '__audiomHighchartsRegistered';

/** Per-chart bookkeeping so destroy can clean up. */
interface ChartState {
  layout?: LayoutHandle;
  button?: PreviewButtonHandle;
  abort: AbortController;
}
const chartState = new WeakMap<Highcharts.Chart, ChartState>();

/**
 * Returns true when the chart has at least one series the plugin knows
 * how to extract from. Restricting to registered extractor types avoids
 * the silent no-op the previous wider check produced for `tilemap` /
 * `heatmap` (which the plugin recognised as "map-like" but couldn't
 * actually extract). Hosts wanting to support additional series types
 * should call `registerExtractor()` (re-exported from the package
 * entry).
 */
export function isMapChart(chart: Highcharts.Chart): boolean {
  return chart.series?.some((s) => hasExtractor(s.type as string)) ?? false;
}

/**
 * Merge per-chart options on top of globals. Returns null when the
 * chart effectively opts out (`enabled === false` or no API key
 * available).
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
  if (merged.enabled === false) return null;
  if (!merged.apiKey) return null;
  return merged as AudiomPluginOptions;
}

/** Should the plugin act on this chart? */
export function isAudiomEnabled(chart: Highcharts.Chart): boolean {
  return isMapChart(chart) && resolveOptions(chart) !== null;
}

/**
 * Initialise the plugin against a Highcharts namespace. Idempotent:
 * calling `init` multiple times with the same `H` will not double-
 * register hooks. Subsequent calls do replace the global defaults.
 */
export function init(
  H: typeof Highcharts,
  options: AudiomGlobalOptions = {}
): void {
  globalDefaults = { ...options };

  const flagged = H as unknown as Record<string, unknown>;
  if (flagged[REGISTERED_FLAG]) return;
  flagged[REGISTERED_FLAG] = true;

  H.addEvent(H.Chart, 'load', function (this: Highcharts.Chart) {
    const opts = resolveOptions(this);
    if (!opts || !isMapChart(this)) return;
    void onChartLoad(this, opts);
  });

  H.addEvent(H.Chart, 'destroy', function (this: Highcharts.Chart) {
    onChartDestroy(this);
  });
}

/**
 * Per-chart pipeline: build embed URL → fire callback → mount UI.
 * Errors are routed through `options.onError` (when supplied) and
 * always logged via the configured logger.
 */
async function onChartLoad(
  chart: Highcharts.Chart,
  options: AudiomPluginOptions
): Promise<void> {
  const log = resolveLogger(options.logger);
  const abort = new AbortController();
  // Stash an AbortController as soon as the pipeline starts so destroy
  // can cancel an in-flight backend.put() upload. The state object is
  // populated incrementally as layout/button handles materialise.
  const state: ChartState = { abort };
  chartState.set(chart, state);

  const titleText = getChartTitle(chart) ?? '';

  let result: BuildEmbedResult | null;
  try {
    result = await buildEmbedUrl(chart, options, abort.signal);
  } catch (err) {
    handleError(err, options, log, titleText, chart);
    return;
  }

  if (!result) {
    log.info(
      `chart ${chart.index} ${titleText} — no extractable geometry and no sources supplied; skipping.`
    );
    return;
  }

  // Bail out if the chart was destroyed while we awaited the upload.
  if (abort.signal.aborted) {
    log.info(`chart ${chart.index} ${titleText} — aborted before mount.`);
    return;
  }

  log.info(`chart ${chart.index} ${titleText}`, {
    backend: result.backend?.name,
    urlLength: result.url.length
  });

  fireEmbedReady(options, result, chart, log);

  try {
    presentEmbed(chart, options, result, state);
  } catch (err) {
    handleError(err, options, log, titleText, chart);
  }
}

/** Mount the appropriate UI for the resolved embed. */
function presentEmbed(
  chart: Highcharts.Chart,
  options: AudiomPluginOptions,
  result: BuildEmbedResult,
  state: ChartState
): void {
  ensureStylesInjected();
  const titleText = getChartTitle(chart) ?? '';
  const mode = options.displayMode ?? AudiomDisplayMode.Tabbed;

  if (mode === AudiomDisplayMode.Button) {
    state.button = mountPreviewButtonAfter(chartRenderTo(chart), {
      url: result.url,
      label: options.openInTabLabel,
      title: options.audiomTabLabel ?? 'Open this map in Audiom'
    });
    return;
  }

  const iframe = createAudiomIframe({
    url: result.url,
    title: options.audiomTabLabel ?? `Audiom map: ${titleText || 'chart'}`,
    iframe: options.iframe
  });

  let audiomElement: HTMLElement = iframe;
  if (options.showOpenInTabButton) {
    const wrapper = document.createElement('div');
    wrapper.className = CSS_CLASSES.IFRAME_WITH_BUTTON;
    const btn = createPreviewButton({
      url: result.url,
      label: options.openInTabLabel,
      title: 'Open this map in Audiom (new tab)'
    });
    wrapper.appendChild(btn.element);
    wrapper.appendChild(iframe);
    audiomElement = wrapper;
    state.button = btn;
  }

  state.layout = mountLayout(chart, {
    mode,
    chartLabel: options.highchartsTabLabel ?? 'Chart',
    audiomLabel: options.audiomTabLabel ?? 'Audiom',
    audiomElement,
    onChartShown: () => {
      try {
        chart.reflow();
      } catch {
        /* chart may already be destroyed */
      }
    }
  });
}

/** Invoke the host's `onEmbedReady` callback, swallowing thrown errors. */
function fireEmbedReady(
  options: AudiomPluginOptions,
  result: BuildEmbedResult,
  chart: Highcharts.Chart,
  log: AudiomLogger
): void {
  if (!options.onEmbedReady) return;
  try {
    options.onEmbedReady({
      embedUrl: result.url,
      sources: result.sources,
      chart
    });
  } catch (cbErr) {
    log.error('onEmbedReady threw', cbErr);
  }
}

/** Route an error to `options.onError` (if supplied) and the logger. */
function handleError(
  err: unknown,
  options: AudiomPluginOptions,
  log: AudiomLogger,
  titleText: string,
  chart: Highcharts.Chart
): void {
  const error = err instanceof Error ? err : new Error(String(err));
  if (options.onError) {
    try {
      options.onError(error);
    } catch (cbErr) {
      log.error('onError threw', cbErr);
    }
  }
  log.error(
    `failed to build/mount embed for chart ${chart.index} ${titleText}`,
    error
  );
}

function onChartDestroy(chart: Highcharts.Chart): void {
  const state = chartState.get(chart);
  if (!state) return;
  chartState.delete(chart);
  // Cancel any in-flight backend.put() / fetch.
  try {
    state.abort.abort();
  } catch {
    /* ignore */
  }
  if (state.layout) {
    try {
      state.layout.destroy();
    } catch {
      /* ignore */
    }
  }
  if (state.button) {
    try {
      state.button.destroy();
    } catch {
      /* ignore */
    }
  }
}
