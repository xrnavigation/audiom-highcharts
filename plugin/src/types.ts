/**
 * Public types for the audiom-highcharts plugin.
 */
import type {
  AudiomMessageHandler,
  IAudiomEmbedConfig,
  IAudiomSource
} from '@xrnavigation/audiom-embedder';
import type { SourceBackend, AudiomSourceValue } from './sources/types';
import type { AudiomLogger } from './util/logger';

/**
 * Wire-format-string enums mirroring the embedder's `FilterMode` and
 * `VisualStyle`. Defined locally because the embedder's 1.x package
 * doesn't re-export them from its public entry, and a deep import into
 * `@xrnavigation/audiom-embedder/dist/AudiomEmbedConfig` triggers a
 * Node-ESM extension-resolution failure (the file references sibling
 * modules without `.js` extensions).
 *
 * Values match Audiom's URL-parameter wire format, so substituting
 * either enum into a URL is identical to using the embedder's own.
 *
 * TODO(xrnavigation/audiom-embedder): re-export these from the public
 * entry point so we can drop these copies.
 */
export const FilterMode = {
  Global: 'global',
  Scan: 'scan'
} as const;
export type FilterMode = (typeof FilterMode)[keyof typeof FilterMode];

export const VisualStyle = {
  Geology: 'geology',
  Indoor: 'indoor',
  Outdoor: 'outdoor',
  Travel: 'travel'
} as const;
export type VisualStyle = (typeof VisualStyle)[keyof typeof VisualStyle];

export type { AudiomLogger };

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
 * Optional iframe security overrides. By default the plugin ships a
 * permissive `allow` (autoplay, fullscreen, clipboard-write, microphone)
 * and a strict-ish `sandbox`. Hosts that need a different threat model
 * (e.g. dropping the microphone permission, or hardening sandbox) can
 * override either string.
 *
 * Note: `allow-scripts allow-same-origin` is only safe when the embed is
 * served from a different origin than the host page. If the Audiom iframe
 * is same-origin, narrow the sandbox.
 */
export interface AudiomIframeOptions {
  /** Override the iframe `allow` attribute. */
  allow?: string;
  /** Override the iframe `sandbox` attribute. */
  sandbox?: string;
}

/**
 * Plugin-only options — fields the plugin owns that have no equivalent in
 * `IAudiomEmbedConfig`. The {@link PLUGIN_ONLY_KEYS} tuple is the runtime
 * source of truth used by `embed/build-url.ts` to strip these fields
 * before forwarding everything else to the embedder; the type assertion
 * below keeps the two in sync at compile time.
 */
export const PLUGIN_ONLY_KEYS = [
  'enabled',
  'backend',
  'sources',
  'displayMode',
  'audiomTabLabel',
  'highchartsTabLabel',
  'showOpenInTabButton',
  'openInTabLabel',
  'baseUrl',
  'rules',
  'iframe',
  'logger',
  'onReady',
  'onError',
  'onEmbedReady'
] as const;
export type PluginOnlyKey = (typeof PLUGIN_ONLY_KEYS)[number];

export interface AudiomPluginOnlyOptions {
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
  /**
   * Pre-baked sources to hand to Audiom. When supplied the extractor /
   * backend pipeline is skipped entirely. Mutually exclusive with
   * `backend`.
   */
  sources?: AudiomSourceValue[];

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

  /** Override iframe `allow` / `sandbox` attributes. */
  iframe?: AudiomIframeOptions;

  /**
   * Override the plugin's logger. Defaults to a thin `console` wrapper.
   * Pass `silentLogger` (exported) to fully mute the plugin.
   */
  logger?: AudiomLogger;

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

// Compile-time guarantee that PLUGIN_ONLY_KEYS lists every plugin-only
// field. Adding a field to AudiomPluginOnlyOptions without updating
// PLUGIN_ONLY_KEYS (or vice versa) becomes a type error.
type _AssertKeysMatch =
  Exclude<keyof AudiomPluginOnlyOptions, PluginOnlyKey> extends never
    ? Exclude<PluginOnlyKey, keyof AudiomPluginOnlyOptions> extends never
      ? true
      : ['PLUGIN_ONLY_KEYS has keys not in AudiomPluginOnlyOptions']
    : ['AudiomPluginOnlyOptions has keys not in PLUGIN_ONLY_KEYS'];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _assertKeysMatch: _AssertKeysMatch = true;

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
