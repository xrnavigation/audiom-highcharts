/**
 * Shared bootstrap for the sample pages. Initializes the Audiom plugin
 * (once), reads the display-mode toggle, exposes a `renderMap` helper,
 * and uploads the per-page rules JSON to the dev server so each chart
 * gets a stable rules URL Audiom can fetch.
 */
import Highcharts from 'highcharts/highmaps';
import AudiomPlugin, {
  SourceBackend,
  type AudiomEmbedReadyInfo,
  type AudiomSourceValue
} from 'audiom-highcharts';
import { setupDisplayModeToggle } from './mode-toggle';
import { POPULATION_RULES, GDP_RULES } from './audiom-rules';
import type { AudiomRulesFile } from './audiom-rules-types';

const SHARED_API_KEY = 'wO35blaGsjJREGuXehqWU';

// Where the Audiom embed is hosted. Switch to 'http://localhost:3000' when
// running Audiom locally — loopback ↔ loopback fetches are exempt from
// Chrome/Edge Private Network Access, so no tunnel is needed.
const AUDIOM_BASE_URL = 'https://audiom-staging.herokuapp.com';

/**
 * Tag name for which canned rules file to use. `null` means no rules file
 * (Audiom falls back to default behaviour, plus the extractor's
 * `ruleName: "Country (value)"` fallback).
 */
export type RulesKind = 'population' | 'gdp' | null;

const RULES_BY_KIND: Record<Exclude<RulesKind, null>, AudiomRulesFile> = {
  population: POPULATION_RULES,
  gdp: GDP_RULES
};

let initialized = false;
let cachedDisplayMode: ReturnType<typeof setupDisplayModeToggle> | null = null;

/** Cache resolved rules URLs so we only upload each rules file once. */
const rulesUrlCache = new Map<Exclude<RulesKind, null>, Promise<string>>();

/**
 * POST a rules JSON file to the dev server and return the served URL.
 * Uses `?ext=json` so the server replies with `application/json`.
 */
async function uploadRules(kind: Exclude<RulesKind, null>): Promise<string> {
  let pending = rulesUrlCache.get(kind);
  if (pending) return pending;
  pending = (async () => {
    const res = await fetch('/__audiom__/upload?ext=json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(RULES_BY_KIND[kind])
    });
    if (!res.ok) {
      throw new Error(`rules upload failed: ${res.status} ${await res.text()}`);
    }
    const { url } = (await res.json()) as { url: string };
    // Resolve relative URL (dev plugin returns "/__audiom__/<id>.json") to
    // an absolute URL so the Audiom iframe (different origin) can fetch it.
    return new URL(url, window.location.origin).toString();
  })();
  rulesUrlCache.set(kind, pending);
  return pending;
}

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
  /** Which canned Audiom rules file to attach. */
  rules?: RulesKind;
}

/**
 * Pull the served GeoJSON URL out of a resolved sources list. Returns the
 * first string source, or the `source` field of the first IAudiomSource.
 */
function firstSourceUrl(sources: AudiomSourceValue[]): string | null {
  for (const s of sources) {
    if (typeof s === 'string') return s;
    if (s && typeof s.source === 'string') return s.source;
  }
  return null;
}

/**
 * Mount a small "View GeoJSON" / "View Rules" link bar above the chart
 * container. Idempotent per chart container — subsequent calls replace
 * the bar's contents in place.
 */
function mountViewGeoJSONLink(
  container: HTMLElement,
  geojsonUrl: string,
  rulesUrl: string | null
): void {
  let bar = container.parentElement?.querySelector<HTMLDivElement>(
    ':scope > .audiom-sample-links'
  );
  if (!bar) {
    bar = document.createElement('div');
    bar.className = 'audiom-sample-links';
    bar.style.cssText =
      'display:flex;gap:0.75rem;flex-wrap:wrap;margin:0.5rem 0 0.75rem;font-size:0.9rem;';
    container.parentElement?.insertBefore(bar, container);
  }
  bar.innerHTML = '';
  const geoLink = document.createElement('a');
  geoLink.href = geojsonUrl;
  geoLink.target = '_blank';
  geoLink.rel = 'noopener noreferrer';
  geoLink.textContent = 'View GeoJSON';
  geoLink.title = geojsonUrl;
  bar.appendChild(geoLink);
  if (rulesUrl) {
    const rulesLink = document.createElement('a');
    rulesLink.href = rulesUrl;
    rulesLink.target = '_blank';
    rulesLink.rel = 'noopener noreferrer';
    rulesLink.textContent = 'View Rules';
    rulesLink.title = rulesUrl;
    bar.appendChild(rulesLink);
  }
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
      ...(rulesUrl ? { rules: rulesUrl } : {}),
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
