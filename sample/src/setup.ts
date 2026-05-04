/**
 * Shared bootstrap for the sample pages. Initializes the Audiom plugin
 * (once), reads the display-mode toggle, and exposes a `renderMap` helper
 * that fetches a topology and creates a Highcharts map chart with the
 * common styling used across the samples.
 */
import Highcharts from 'highcharts/highmaps';
import AudiomPlugin, { SourceBackend } from 'audiom-highcharts';
import { setupDisplayModeToggle } from './mode-toggle';

const SHARED_API_KEY = 'wO35blaGsjJREGuXehqWU';

// Where the Audiom embed is hosted. Switch to 'http://localhost:3000' when
// running Audiom locally — loopback ↔ loopback fetches are exempt from
// Chrome/Edge Private Network Access, so no tunnel is needed.
const AUDIOM_BASE_URL = 'https://audiom-staging.herokuapp.com';

let initialized = false;
let cachedDisplayMode: ReturnType<typeof setupDisplayModeToggle> | null = null;

/**
 * Initialise the plugin (idempotent) and render the page's mode toggle.
 * Returns the resolved display mode so callers don't pass it explicitly.
 */
export function setupSample(): { displayMode: ReturnType<typeof setupDisplayModeToggle> } {
  if (!initialized) {
    cachedDisplayMode = setupDisplayModeToggle();
    AudiomPlugin.init(Highcharts, {
      apiKey: SHARED_API_KEY,
      stepSize: '100km',
      baseUrl: AUDIOM_BASE_URL,
      displayMode: cachedDisplayMode,
      // The Vite dev plugin (audiomHighchartsDev() in vite.config.ts) hosts
      // an upload endpoint at /__audiom__/upload. SourceBackend.devServer()
      // POSTs extracted GeoJSON there and hands the returned URL to Audiom.
      // For production, swap for SourceBackend.rest({ endpoint: '/api/...' })
      // or SourceBackend.s3Presigned({ getPresignedPut: ... }).
      backend: SourceBackend.devServer()
      // SourceBackend.inline()
      // SourceBackend.memory()
      // SourceBackend.static([...])
      // SourceBackend.rest({ endpoint: '/api/upload' })
      // SourceBackend.s3Presigned({ getPresignedPut: … })
    });
    initialized = true;
  }
  return { displayMode: cachedDisplayMode! };
}

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
}

/**
 * Fetch a topology and render the standard sample choropleth. Calls
 * {@link setupSample} for you.
 */
export async function renderMap(config: SampleMapConfig): Promise<Highcharts.Chart> {
  setupSample();
  const topology = await fetch(config.topologyUrl).then((r) => r.json());
  return Highcharts.mapChart(config.containerId ?? 'container', {
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
    ]
  });
}

/** Standard blue gradient used by the sample maps. */
export const BLUE_LOG_STOPS: Highcharts.ColorAxisOptions['stops'] = [
  [0, '#EFEFFF'],
  [0.5, '#4444FF'],
  [1, '#000033']
];
