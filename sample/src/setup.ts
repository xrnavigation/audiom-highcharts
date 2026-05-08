/**
 * Top-level demo helper: fetches a topology, renders a Highcharts
 * choropleth, and wires the Audiom plugin options (rules URL, optional
 * center/zoom override, link bar). Plugin bootstrap lives in
 * `plugin-init.ts`; rule-file upload routing lives in `rules-upload.ts`.
 */
import Highcharts from 'highcharts/highmaps';
import type { AudiomEmbedReadyInfo } from '@xrnavigation/audiom-highcharts';
import type { IAudiomSource } from '@xrnavigation/audiom-embedder';
import { setupSample } from './plugin-init';
import { uploadRules, type RulesKind } from './rules-upload';
import { firstSourceUrl, mountViewGeoJSONLink } from './link-bar';

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
}

/**
 * Fetch a topology and render the standard sample choropleth. Calls
 * {@link setupSample} for you. When `rules` is set, uploads the matching
 * rules JSON and attaches its URL to every extracted source.
 */
export async function renderMap(config: SampleMapConfig): Promise<Highcharts.Chart> {
  setupSample();
  const topology = await fetch(config.topologyUrl).then((r) => r.json());

  const containerId = config.containerId ?? 'container';
  const container = document.getElementById(containerId);

  // ---------------------------------------------------------------------------
  // Static path: pre-baked GeoJSON + rules written by prebuild script.
  // The Audiom iframe fetches directly from the served static files — no
  // runtime upload needed.
  // ---------------------------------------------------------------------------
  const useStatic = !!(config.staticGeojsonPath && config.staticRulesPath);

  // Resolve static asset URLs relative to the Vite base path so the result
  // is correct both in dev (base '/') and on GitHub Pages (base '/<repo>/').
  const base = (import.meta.env as Record<string, string>).BASE_URL ?? '/';
  const staticGeojsonUrl = useStatic
    ? new URL(config.staticGeojsonPath!, window.location.origin + base).toString()
    : null;
  const staticRulesUrl = useStatic
    ? new URL(config.staticRulesPath!, window.location.origin + base).toString()
    : null;

  // Upload-based path: resolve the rules URL up-front so the embed URL bakes it in.
  const rulesUrl = !useStatic && config.rules ? await uploadRules(config.rules) : null;

  return Highcharts.mapChart(containerId, {
    chart: { map: topology },
    title: { text: config.title },
    subtitle: config.subtitle ? { text: config.subtitle } : undefined,
    mapNavigation: {
      enabled: true,
      buttonOptions: { verticalAlign: 'bottom' }
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
      ...(config.audiomCenter ? { center: config.audiomCenter } : {}),
      ...(config.audiomZoom !== undefined ? { zoom: config.audiomZoom } : {}),
      onEmbedReady: (info: AudiomEmbedReadyInfo) => {
        const url = firstSourceUrl(info.sources);
        if (!url || !container) return;
        const absolute = new URL(url, window.location.origin).toString();
        mountViewGeoJSONLink(container, absolute, staticRulesUrl ?? rulesUrl, info.embedUrl);
      }
    }
  });
}

/** Standard blue gradient used by the sample maps. */
export const BLUE_LOG_STOPS: Highcharts.ColorAxisOptions['stops'] = [
  [0, '#EFEFFF'],
  [0.5, '#4444FF'],
  [1, '#000033']
];
