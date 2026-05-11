/**
 * Top-level demo helper: fetches a topology, renders a Highcharts
 * choropleth, and wires the Audiom plugin options (rules URL, optional
 * center/zoom override, link bar). Plugin bootstrap lives in
 * `plugin-init.ts`; rule-file upload routing lives in `rules-upload.ts`.
 */
import Highcharts from 'highcharts/highmaps';
import { viewportFor, type AudiomEmbedReadyInfo } from '@xrnavigation/audiom-highcharts';
import type { IAudiomSource } from '@xrnavigation/audiom-embedder';
import { setupSample } from './plugin-init';
import { uploadRules, type RulesKind } from './rules-upload';
import { firstSourceUrl, mountViewGeoJSONLink } from './link-bar';
import { mountSamplePage } from './sample-nav';
import { fetchWorldBankIndicator } from './world-bank-client';

export type { RulesKind };

export interface SampleMapConfig {
  containerId?: string;
  topologyUrl: string;
  title: string;
  subtitle?: string;
  seriesName: string;
  data: Array<[string, number]>;
  colorAxis: Highcharts.ColorAxisOptions;
  /** Tooltip pointFormat. */
  tooltipPointFormat: string;
  /**
   * Path (relative to the Vite `base`) to a pre-baked GeoJSON file written
   * by `scripts/prebuild-sample-assets.mjs`. When both `staticGeojsonPath`
   * and `staticRulesPath` are set the backend upload pipeline is skipped
   * entirely and the Audiom embed receives these URLs as `sources`.
   */
  staticGeojsonPath?: string;
  /**
   * Path (relative to the Vite `base`) to a pre-baked rules JSON file.
   * Must be set together with `staticGeojsonPath`.
   */
  staticRulesPath?: string;
  /**
   * Which canned Audiom rules file to attach (upload-based flow).
   * Ignored when `staticGeojsonPath` + `staticRulesPath` are set.
   */
  rules?: RulesKind;
  /** Override the Audiom embed's initial center (`[lon, lat]`). */
  audiomCenter?: [number, number];
  /** Override the Audiom embed's initial zoom. */
  audiomZoom?: number;
  /**
   * Plain-text description of the chart read by screen readers.
   * Defaults to the chart title + subtitle when omitted.
   */
  accessibilityDescription?: string;
  /**
   * Audiom navigation step size, e.g. `'100km'` or `'600km'`.
   * Defaults to `'100km'`.
   */
  stepSize?: string;
}

/**
 * Fetch a topology and render the standard sample choropleth. Calls
 * {@link setupSample} for you. When `rules` is set, uploads the matching
 * rules JSON and attaches its URL to every extracted source.
 */
export async function renderMap(config: SampleMapConfig): Promise<Highcharts.Chart> {
  setupSample({ stepSize: config.stepSize });
  const topology = await fetch(config.topologyUrl).then((r) => r.json());

  const containerId = config.containerId ?? 'container';
  const container = document.getElementById(containerId);

  // ---------------------------------------------------------------------------
  // Static path: pre-baked GeoJSON + rules written by prebuild script.
  // The Audiom iframe fetches directly from the served static files — no
  // runtime upload needed.
  // ---------------------------------------------------------------------------
  const useStatic = !!(config.staticGeojsonPath && config.staticRulesPath);

  // Resolve static asset URLs relative to the CURRENT PAGE so the result
  // is correct under any deployment base (root, /<repo>/, file://, etc.).
  const staticGeojsonUrl = useStatic
    ? new URL(config.staticGeojsonPath!, window.location.href).toString()
    : null;
  const staticRulesUrl = useStatic
    ? new URL(config.staticRulesPath!, window.location.href).toString()
    : null;

  // Upload-based path: resolve the rules URL up-front so the embed URL bakes it in.
  const rulesUrl = !useStatic && config.rules ? await uploadRules(config.rules) : null;

  // In the upload flow the plugin computes a viewport from the extracted
  // GeoJSON via `viewportFor()`. The static path skips the backend entirely,
  // so `resolveSources` returns `geojson: null` and no viewport is derived
  // — leaving the embed at Audiom's default zoom 0 where the avatar can't
  // navigate at human scale. Fetch the baked GeoJSON here and compute the
  // same viewport ourselves so the static flow matches the upload flow.
  let derivedCenter: [number, number] | undefined;
  let derivedZoom: number | undefined;
  if (useStatic) {
    try {
      const geo = await fetch(staticGeojsonUrl!).then((r) => r.json());
      const vp = viewportFor(geo);
      if (vp) {
        derivedCenter = vp.center;
        derivedZoom = vp.zoom;
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[sample] failed to derive viewport from baked GeoJSON', err);
    }
  }
  const audiomCenter = config.audiomCenter ?? derivedCenter;
  const audiomZoom = config.audiomZoom ?? derivedZoom;

  const a11yDescription =
    config.accessibilityDescription ??
    [config.title, config.subtitle].filter(Boolean).join('. ');

  const chart = Highcharts.mapChart(containerId, {
    chart: { map: topology },
    title: { text: config.title },
    subtitle: config.subtitle ? { text: config.subtitle } : undefined,
    mapNavigation: {
      enabled: true,
      buttonOptions: { verticalAlign: 'bottom' }
    },
    accessibility: {
      enabled: true,
      description: a11yDescription,
      keyboardNavigation: { enabled: true },
      point: { valueDescriptionFormat: '{point.name}: {point.value}' }
    },
    colorAxis: config.colorAxis,
    series: [
      {
        type: 'map',
        name: config.seriesName,
        data: config.data,
        joinBy: 'hc-key',
        states: { hover: { color: '#a4edba' } },
        dataLabels: { enabled: false },
        tooltip: { pointFormat: config.tooltipPointFormat }
      }
    ],
    audiom: {
      // Render the visual heatmap on the Audiom side so the colors
      // assigned by the rules' `fill` expressions are visible.
      showVisualMap: true,
      // Static path: bypass the backend pipeline entirely. The embedder
      // encodes per-source rules as `<sourceUrl>.rules=<rulesUrl>` query
      // params, so the rules URL must live INSIDE the source object.
      ...(useStatic ? {
        sources: [{
          source: staticGeojsonUrl!,
          type: 'geojson',
          rules: staticRulesUrl!
        } as IAudiomSource]
      } : {
        // Upload-based path (AUDIOM_DIRECT or dev server).
        ...(rulesUrl ? { rules: rulesUrl } : {})
      }),
      ...(audiomCenter ? { center: audiomCenter } : {}),
      ...(audiomZoom !== undefined ? { zoom: audiomZoom } : {}),
      onEmbedReady: (info: AudiomEmbedReadyInfo) => {
        const url = firstSourceUrl(info.sources);
        if (!url || !container) return;
        const absolute = new URL(url, window.location.origin).toString();
        mountViewGeoJSONLink(container, absolute, staticRulesUrl ?? rulesUrl, info.embedUrl);
      }
    }
  });

  // Update the sr-only live region so screen readers announce the loaded state.
  const statusEl = document.getElementById('chart-status');
  if (statusEl) {
    statusEl.textContent = `Chart loaded: ${config.title}. Showing ${config.data.length} regions.`;
  }

  return chart;
}

/** Standard blue gradient used by the sample maps. */
export const BLUE_LOG_STOPS: Highcharts.ColorAxisOptions['stops'] = [
  [0, '#EFEFFF'],
  [0.5, '#4444FF'],
  [1, '#000033']
];

/**
 * Config for a sample page that fetches live data from the World Bank API
 * and falls back to a static snapshot. Extends {@link SampleMapConfig} but
 * `data` is derived automatically — pass `fallback` instead.
 */
export interface IndicatorMapConfig extends Omit<SampleMapConfig, 'data'> {
  /** Registry slug for this sample page (e.g. `'europe'`). */
  slug: string;
  /** World Bank indicator code, e.g. `'NY.GDP.PCAP.CD'`. */
  indicator: string;
  /** Static data used when the live fetch fails. Also determines the filter set. */
  fallback: Array<[string, number]>;
  /** Optional transform applied to each raw value (e.g. convert to millions). */
  valueTransform?: (raw: number) => number;
}

/**
 * Full page setup for a World-Bank-backed choropleth sample:
 *   1. Mounts the page nav + title from the sample registry.
 *   2. Fetches the indicator from the World Bank API, falling back to `config.fallback`.
 *   3. Calls {@link renderMap} with the resolved data.
 */
export async function renderIndicatorMap(
  config: IndicatorMapConfig
): Promise<Highcharts.Chart> {
  mountSamplePage(config.slug);

  let data: Array<[string, number]>;
  try {
    data = await fetchWorldBankIndicator({
      indicator: config.indicator,
      valueTransform: config.valueTransform
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[sample/${config.slug}] World Bank fetch failed; using fallback.`, err);
    data = config.fallback;
  }

  return renderMap({ ...config, data });
}
