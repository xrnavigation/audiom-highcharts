/**
 * Public types for the audiom-highcharts plugin.
 */
import type {
  AudiomMessageHandler,
  IAudiomSource
} from '@xrnavigation/audiom-embedder';
import {
  FilterMode,
  VisualStyle,
  type IAudiomEmbedConfig
} from '@xrnavigation/audiom-embedder/dist/AudiomEmbedConfig';
import type { SourceBackend } from './sources/types';
import type { AudiomSourceValue } from './sources/types';

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
 * Fields the plugin owns and that have no equivalent in `IAudiomEmbedConfig`.
 * Kept separate so `AudiomPluginOptions` can extend the embedder config and
 * not redeclare anything that already lives there.
 */
interface AudiomPluginOnlyOptions {
  /** When false, the plugin will not augment the chart even if loaded. */
  enabled?: boolean;
  /**
   * Storage + serving backend for the GeoJSON the plugin extracts from
   * the chart. Required unless `sources` is supplied. Use the
   * `SourceBackend` namespace for built-ins
   * (`SourceBackend.devServer()`, `.rest({...})`, `.s3Presigned({...})`,
   * `.inline()`, `.memory()`, `.static([...])`) or supply your own
   * `SourceBackend` implementation.
   */
  backend?: SourceBackend;

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

  /** Audiom base URL. Defaults to `AudiomEmbedConfig.defaultBaseURL`. */
  baseUrl?: string;

  /**
   * URL to a hosted Audiom rules JSON file (v2 format). When set, every
   * GeoJSON URL produced by `backend.put()` is wrapped into an
   * `IAudiomSource` with this `rules` URL attached, so Audiom applies
   * the rules to that source. Ignored when `sources` is supplied
   * explicitly (callers can attach `rules` per-source themselves).
   */
  rules?: string;

  // Callbacks
  onReady?: (handler: AudiomMessageHandler) => void;
  onError?: (error: Error) => void;
  /**
   * Invoked once the embed URL has been built (after the backend resolves
   * GeoJSON sources). Receives the final embed URL plus the resolved
   * `sources` list, so the host can do things like mount a "View GeoJSON"
   * link beside the chart.
   */
  onEmbedReady?: (info: AudiomEmbedReadyInfo) => void;
}

/**
 * Payload passed to `AudiomPluginOptions.onEmbedReady` after the embed URL
 * has been built and any backend uploads have completed.
 */
export interface AudiomEmbedReadyInfo {
  /** Final Audiom embed URL (with sources baked in). */
  embedUrl: string;
  /**
   * Resolved sources list as it was passed to the embedder. Each entry is
   * either a URL string or an `IAudiomSource`-shaped object (when
   * `rules` was attached or the backend returned objects).
   */
  sources: AudiomSourceValue[];
  /** The Highcharts chart instance the embed was built for. */
  chart: Highcharts.Chart;
}

/**
 * Per-chart Audiom plugin configuration. Attached as
 * `chartOptions.audiom` or merged from the global defaults passed to `init()`.
 *
 * Extends `IAudiomEmbedConfig` (minus `embedId`, which the plugin always
 * sets to `"dynamic"`, and minus `center`/`sources`, which are re-typed
 * for ergonomics) so every embedder config field — `apiKey`, `soundpack`,
 * `stepSize`, `filters`, `filterMode`, `visualStyle`, `visualBaseLayers`,
 * `showVisualMap`, `heading`, `showHeading`, `title`, `demo`, `zoom`,
 * `latitude`, `longitude`, `allowedOrigins`, `additionalParams` — is
 * accepted and forwarded verbatim.
 */
export interface AudiomPluginOptions
  extends Omit<IAudiomEmbedConfig, 'embedId' | 'center' | 'sources'>,
    AudiomPluginOnlyOptions {
  /** `[longitude, latitude]` tuple. Overrides anything derived from geometry. */
  center?: AudiomCenter;
  /**
   * Pre-baked Audiom sources. When supplied, no GeoJSON is extracted from
   * the chart and `backend` is ignored.
   */
  sources?: IAudiomSource[] | string[];
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
