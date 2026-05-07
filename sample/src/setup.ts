/**
 * Top-level demo helper: fetches a topology, renders a Highcharts
 * choropleth, and wires the Audiom plugin options (rules URL, optional
 * center/zoom override, link bar). Plugin bootstrap lives in
 * `plugin-init.ts`; rule-file upload routing lives in `rules-upload.ts`.
 */
import Highcharts from 'highcharts/highmaps';
import type { AudiomEmbedReadyInfo } from '@xrnavigation/audiom-highcharts';
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
  /** Which canned Audiom rules file to attach. */
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

  // Resolve the rules URL up-front so the Audiom embed URL bakes it in.
  const rulesUrl = config.rules ? await uploadRules(config.rules) : null;

  const containerId = config.containerId ?? 'container';
  const container = document.getElementById(containerId);

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
      // assigned by the rules' `fill` expressions (interpolated from
      // each region's data value) are visible — mirroring the chart's
      // choropleth as a heatmap.
      showVisualMap: true,
      ...(rulesUrl ? { rules: rulesUrl } : {}),
      ...(config.audiomCenter ? { center: config.audiomCenter } : {}),
      ...(config.audiomZoom !== undefined ? { zoom: config.audiomZoom } : {}),
      onEmbedReady: (info: AudiomEmbedReadyInfo) => {
        const url = firstSourceUrl(info.sources);
        if (!url || !container) return;
        const absolute = new URL(url, window.location.origin).toString();
        mountViewGeoJSONLink(container, absolute, rulesUrl);
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
