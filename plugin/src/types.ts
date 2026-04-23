/**
 * Public types for the audiom-highcharts plugin.
 *
 * Mirrors the configuration described in the design issue
 * (Coughlan-Lab/Audiom-Front-End#1352). Where possible we re-use the types
 * from `@xrnavigation/audiom-embedder` rather than redeclaring them.
 */
import type { AudiomMessageHandler } from '@xrnavigation/audiom-embedder';
import {
  FilterMode,
  VisualStyle
} from '@xrnavigation/audiom-embedder/dist/AudiomEmbedConfig';

export { FilterMode, VisualStyle };

export type AudiomDisplayMode = 'tabbed' | 'component';
export type AudiomSourceStrategy = 'auto' | 'passthrough' | 'extract';

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

  // Display
  displayMode?: AudiomDisplayMode;
  audiomTabLabel?: string;
  highchartsTabLabel?: string;

  // Visual
  showVisualMap?: boolean;
  visualStyle?: VisualStyle;
  heading?: 1 | 2 | 3 | 4 | 5 | 6;

  // Advanced
  baseUrl?: string;
  allowedOrigins?: string[];
  demo?: boolean;
  additionalParams?: Record<string, string | number | boolean>;

  // Data source strategy
  sourceStrategy?: AudiomSourceStrategy;

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
