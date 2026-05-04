/**
 * Public types for the audiom-highcharts plugin.
 *
 * Mirrors the configuration described in the design issue
 * (Coughlan-Lab/Audiom-Front-End#1352). Where possible we re-use the types
 * from `@xrnavigation/audiom-embedder` rather than redeclaring them.
 */
import type {
  AudiomMessageHandler,
  IAudiomSource
} from '@xrnavigation/audiom-embedder';
import {
  FilterMode,
  VisualStyle
} from '@xrnavigation/audiom-embedder/dist/AudiomEmbedConfig';

export { FilterMode, VisualStyle };

/**
 * How the plugin should display the Audiom embed alongside the chart.
 */
export enum AudiomDisplayMode {
  /** Tabbed UI: Highcharts on one tab, Audiom on the other. */
  Tabbed = 'tabbed',
  /** Two panes side-by-side: Highcharts on the left, Audiom on the right. */
  SideBySide = 'side-by-side',
  /**
   * No iframe — render only an "Open in Audiom" button beside the chart
   * that opens the embed URL in a new tab. Useful when iframe embedding is
   * blocked (e.g. Chrome/Edge Private Network Access during local dev).
   */
  Button = 'button',
  /** Caller embeds the AudiomComponent themselves; plugin renders nothing. */
  Component = 'component'
}

/**
 * How the plugin should produce the `sources` value handed to Audiom.
 *
 * Resolution order under {@link AudiomSourceStrategy.Auto}:
 *   1. Honour user-supplied `sources`.
 *   2. POST to a registered dev uploader (see `registerDevSourceUploader`).
 *   3. Call `uploadGeoJSON(collection)` if provided, use returned URL.
 *   4. Extract → simplify → inline as a `data:` URI.
 *
 * A boundaries-only URL strategy was intentionally dropped — without the
 * merged Highcharts data values stamped into each Feature's properties,
 * Audiom would render an outline with no choropleth/heatmap content.
 */
export enum AudiomSourceStrategy {
  /** Try in priority order: passthrough → dev-uploader → upload → inline. */
  Auto = 'auto',
  /** Forward `options.sources` verbatim; never extract. */
  Passthrough = 'passthrough',
  /** POST the FeatureCollection to the registered dev uploader. */
  DevUploader = 'dev-uploader',
  /** Hand the extracted FeatureCollection to `options.uploadGeoJSON`. */
  Upload = 'upload',
  /** Extract → simplify → inline as `data:application/geo+json;base64,…`. */
  Inline = 'inline'
}

/** `[longitude, latitude]` tuple matching the embedder's `Coordinates`. */
export type AudiomCenter = [number, number];

/**
 * Per-chart Audiom plugin configuration. Attached as
 * `chartOptions.audiom` or merged from the global defaults passed to `init()`.
 */
export interface AudiomPluginOptions {
  /** When false, the plugin will not augment the chart even if loaded. */
  enabled?: boolean;
  /** Audiom API key. Required when the plugin is active for a chart. */
  apiKey: string;

  // Audiom map settings
  soundpack?: string;
  stepSize?: string;
  rules?: string;
  title?: string;
  filters?: string[];
  filterMode?: FilterMode;

  // Data source strategy
  /** When `passthrough` or `auto` (with sources supplied), forwarded directly to Audiom. */
  sources?: IAudiomSource[] | string[];
  sourceStrategy?: AudiomSourceStrategy;
  /**
   * Pluggable storage backend for the extracted GeoJSON. When provided,
   * supersedes `uploadGeoJSON` and the legacy `registerDevSourceUploader`
   * registration. See `audiom-highcharts/sources` for built-in factories
   * (`inlineBackend`, `staticBackend`, `restBackend`, `s3PresignedBackend`,
   * `devServerBackend`, `memoryBackend`) or implement your own
   * `SourceBackend`.
   */
  backend?: import('./sources/types').SourceBackend;
  /**
   * @deprecated Pass `backend: restBackend({ endpoint })` (or your own
   * SourceBackend) instead. Still honoured for back-compat: the plugin
   * wraps it as a one-shot REST-style backend.
   *
   * Hook invoked when {@link AudiomSourceStrategy.Upload} (or auto) decides to
   * hand the extracted FeatureCollection to a host-provided endpoint.
   * Must return a URL the Audiom iframe can fetch.
   */
  uploadGeoJSON?: (collection: import('./geo/types').FeatureCollection) => Promise<string>;
  /**
   * Maximum simplification weight (in degrees²) applied to inline geometry.
   * Higher = more aggressive smoothing. `0` disables simplification.
   * @default 0.01
   */
  simplifyTolerance?: number;

  // Viewport (overrides anything derived from extracted geometry)
  center?: AudiomCenter;
  zoom?: number;

  // Display
  displayMode?: AudiomDisplayMode;
  audiomTabLabel?: string;
  highchartsTabLabel?: string;
  /**
   * In Tabbed/SideBySide modes, also render an "Open in Audiom" anchor
   * that opens the embed URL in a new tab. Defaults to `false`. In
   * `displayMode: Button`, the button is always rendered regardless.
   */
  showOpenInTabButton?: boolean;
  /** Override the preview button label. Default: "Open in Audiom". */
  openInTabLabel?: string;

  // Visual
  showVisualMap?: boolean;
  visualStyle?: VisualStyle;
  heading?: 1 | 2 | 3 | 4 | 5 | 6;

  // Advanced
  baseUrl?: string;
  allowedOrigins?: string[] | string;
  demo?: boolean;
  additionalParams?: Record<string, string | number | boolean>;

  // Callbacks
  onReady?: (handler: AudiomMessageHandler) => void;
  onError?: (error: Error) => void;
}

/**
 * Global defaults supplied to `init()`. apiKey is optional here because a
 * chart may supply its own.
 */
export type AudiomGlobalOptions = Partial<AudiomPluginOptions>;

/**
 * Augment Highcharts chart options so consumers get type completion for
 * `audiom: { ... }`.
 */
declare module 'highcharts' {
  interface Options {
    audiom?: Partial<AudiomPluginOptions>;
  }
}
