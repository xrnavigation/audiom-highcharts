/**
 * Public types for the audiom-highcharts plugin.
 */
import type {
  AudiomMessageHandler,
  IAudiomSource
} from '@xrnavigation/audiom-embedder';
import {
  FilterMode,
  VisualStyle
} from '@xrnavigation/audiom-embedder/dist/AudiomEmbedConfig';
import type { SourceBackend } from './sources/types';

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
  Button = 'button'
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

  // Data source
  /**
   * Pre-baked Audiom sources. When supplied, no GeoJSON is extracted from
   * the chart and `backend` is ignored.
   */
  sources?: IAudiomSource[] | string[];
  /**
   * Storage + serving backend for the GeoJSON the plugin extracts from
   * the chart. Required unless `sources` is supplied. See
   * `audiom-highcharts` for built-in factories: `inlineBackend`,
   * `restBackend`, `s3PresignedBackend`, `devServerBackend`,
   * `memoryBackend`, or `staticBackend`.
   */
  backend?: SourceBackend;

  // Viewport (overrides anything derived from extracted geometry)
  center?: AudiomCenter;
  zoom?: number;

  // Display
  displayMode?: AudiomDisplayMode;
  audiomTabLabel?: string;
  highchartsTabLabel?: string;
  /**
   * In Tabbed/SideBySide modes, also render an "Open in Audiom" anchor
   * that opens the embed URL in a new tab. In `displayMode: Button`,
   * the button is always rendered regardless.
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
