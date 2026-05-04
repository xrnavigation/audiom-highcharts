import type Highcharts from 'highcharts';
import type {
  AudiomGlobalOptions,
  AudiomPluginOptions
} from './types';
import { AudiomDisplayMode } from './types';
import { buildEmbedUrl } from './embed/build-url';
import { createAudiomIframe } from './embed/iframe-manager';
import { mountLayout, type LayoutHandle } from './ui/layout';
import {
  createPreviewButton,
  mountPreviewButtonAfter,
  type PreviewButtonHandle
} from './ui/preview-button';

/**
 * Internal: holds global defaults supplied via `init()`. A weak default so
 * that calls to `init()` without options still register hooks.
 */
let globalDefaults: AudiomGlobalOptions = {};

/** Marker to prevent registering hooks twice on the same Highcharts namespace. */
const REGISTERED_FLAG = '__audiomHighchartsRegistered';

/** Per-chart layout handles, keyed by chart, so destroy can clean up. */
const chartLayouts = new WeakMap<Highcharts.Chart, LayoutHandle>();
/** Per-chart preview-button handles for Button mode / showOpenInTabButton. */
const chartButtons = new WeakMap<Highcharts.Chart, PreviewButtonHandle>();

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
      backend: result.backend?.name,
      urlLength: result.url.length,
      url: result.url
    });

    const mode = options.displayMode ?? AudiomDisplayMode.Tabbed;

    if (mode === AudiomDisplayMode.Button) {
      const renderTo = (chart as unknown as { renderTo: HTMLElement }).renderTo;
      const handle = mountPreviewButtonAfter(renderTo, {
        url: result.url,
        label: options.openInTabLabel,
        title: options.audiomTabLabel ?? 'Open this map in Audiom'
      });
      chartButtons.set(chart, handle);
      return;
    }

    const iframe = createAudiomIframe({
      url: result.url,
      title: options.audiomTabLabel ?? `Audiom map: ${titleText || 'chart'}`
    });

    // Optionally include the "Open in Audiom" anchor inside the Audiom panel.
    let audiomElement: HTMLElement = iframe;
    if (options.showOpenInTabButton) {
      const wrapper = document.createElement('div');
      wrapper.style.display = 'flex';
      wrapper.style.flexDirection = 'column';
      wrapper.style.width = '100%';
      wrapper.style.height = '100%';
      iframe.style.flex = '1 1 auto';
      iframe.style.minHeight = '0';
      const btn = createPreviewButton({
        url: result.url,
        label: options.openInTabLabel,
        title: 'Open this map in Audiom (new tab)'
      });
      wrapper.appendChild(btn.element);
      wrapper.appendChild(iframe);
      audiomElement = wrapper;
      chartButtons.set(chart, btn);
    }

    const handle = mountLayout(chart, {
      mode,
      chartLabel: options.highchartsTabLabel ?? 'Chart',
      audiomLabel: options.audiomTabLabel ?? 'Audiom',
      audiomElement,
      onChartShown: () => {
        try { chart.reflow(); } catch { /* ignore */ }
      }
    });
    chartLayouts.set(chart, handle);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    options.onError?.(error);
    // eslint-disable-next-line no-console
    console.error('[audiom-highcharts] failed to build embed URL', error);
  }
}

function onChartDestroy(chart: Highcharts.Chart): void {
  const handle = chartLayouts.get(chart);
  if (handle) {
    chartLayouts.delete(chart);
    try { handle.destroy(); } catch { /* ignore */ }
  }
  const btn = chartButtons.get(chart);
  if (btn) {
    chartButtons.delete(chart);
    try { btn.destroy(); } catch { /* ignore */ }
  }
}
