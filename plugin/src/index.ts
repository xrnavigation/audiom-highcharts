/**
 * audiom-highcharts public entry point.
 */
import { init, isMapChart, isAudiomEnabled, resolveOptions } from './plugin';
import { SourceBackend } from './sources';
import {
  createPreviewButton,
  mountPreviewButtonAfter
} from './ui/preview-button';
import { mountLayout } from './ui/layout';
import {
  createAudiomIframe,
  updateIframeUrl,
  DEFAULT_IFRAME_ALLOW,
  DEFAULT_IFRAME_SANDBOX
} from './embed/iframe-manager';
import { buildEmbedUrl } from './embed/build-url';
import { geojsonToDataUri } from './embed/data-uri';
import {
  extractGeoJSON,
  registerExtractor,
  unregisterExtractor,
  getExtractor,
  hasExtractor,
  registeredSeriesTypes
} from './extractors';
import { simplifyFeatureCollection } from './geo/simplify';
import { uploadAudiomRules } from './rules/upload';
import {
  firstSourceUrl,
  createSourceLinks,
  mountSourceLinksAfter
} from './ui/source-links';
import {
  defaultLogger,
  silentLogger,
  resolveLogger
} from './util/logger';
import {
  ERROR_PREFIX,
  pluginError,
  MIME,
  GEO_JSON_DATA_URI_PREFIX
} from './constants';
import {
  CSS_CLASSES,
  DOM_ID_PREFIX,
  STYLE_ELEMENT_ID,
  LayoutSide
} from './ui/css-classes';

export {
  init,
  isMapChart,
  isAudiomEnabled,
  resolveOptions,
  /**
   * Both the **interface** (for typing custom backends) and the **static
   * factory namespace** for built-ins (`SourceBackend.memory()`,
   * `.rest({...})`, `.s3Presigned({...})`, `.audiom({...})`, etc.).
   */
  SourceBackend,
  // UI primitives
  createPreviewButton,
  mountPreviewButtonAfter,
  mountLayout,
  createSourceLinks,
  mountSourceLinksAfter,
  firstSourceUrl,
  // Iframe + embed-URL primitives
  createAudiomIframe,
  updateIframeUrl,
  DEFAULT_IFRAME_ALLOW,
  DEFAULT_IFRAME_SANDBOX,
  buildEmbedUrl,
  geojsonToDataUri,
  // Extractor registry
  extractGeoJSON,
  registerExtractor,
  unregisterExtractor,
  getExtractor,
  hasExtractor,
  registeredSeriesTypes,
  // Geo helpers
  simplifyFeatureCollection,
  // Direct-to-Audiom rules upload (POST /rulesets + /rules + /augmenters)
  uploadAudiomRules,
  // Logging
  defaultLogger,
  silentLogger,
  resolveLogger,
  // Constants
  ERROR_PREFIX,
  pluginError,
  MIME,
  GEO_JSON_DATA_URI_PREFIX,
  CSS_CLASSES,
  DOM_ID_PREFIX,
  STYLE_ELEMENT_ID,
  LayoutSide
};

export type {
  SourcePutContext,
  AudiomSourceValue,
  BuiltinBackendName,
  InlineBackendOptions,
  RestBackendOptions,
  S3PresignedBackendOptions,
  PresignedPut,
  DevServerBackendOptions,
  MemoryBackendHandle,
  AudiomBackendOptions
} from './sources';

export type {
  UploadAudiomRulesOptions,
  UploadAudiomRulesResult
} from './rules/upload';

// Re-export the wire-format enums + types from the api-client so callers
// have a single import surface and don't need to depend on the client
// package directly. Use `RulesetVisibility` (and `MapVisibility` where
// relevant) instead of redefining them locally.
export {
  AudiomClient,
  RulesetVisibility,
  MapVisibility,
  AugmenterPosition
} from '@xrnavigation/audiom-api-client';
export type {
  MapboxRule,
  MapboxRuleSet,
  MapboxAugmenter,
  MapboxFilter,
  MapboxExpression,
  MapboxOutputValue,
  RulesetData,
  RuleData,
  AugmenterData,
  DatasourceData,
  UploadRulesetOptions,
  UploadRulesetResult,
  UploadGeoJsonOptions,
  AudiomClientOptions
} from '@xrnavigation/audiom-api-client';

// Re-export embedder types so consumers don't need a direct dep import.
export type {
  IAudiomEmbedConfig,
  IAudiomSource,
  AudiomEmbedConfig
} from '@xrnavigation/audiom-embedder';

export type {
  PreviewButtonOptions,
  PreviewButtonHandle
} from './ui/preview-button';
export type { LayoutHandle, MountLayoutOptions } from './ui/layout';
export type { CreateIframeOptions } from './embed/iframe-manager';
export type { BuildEmbedResult } from './embed/build-url';
export type { SeriesExtractor } from './extractors';
export type {
  SourceLinksOptions,
  SourceLinksHandle
} from './ui/source-links';
export type { AudiomLogger } from './util/logger';

export type {
  AudiomPluginOptions,
  AudiomGlobalOptions,
  AudiomCenter,
  AudiomEmbedReadyInfo,
  AudiomIframeOptions,
  AudiomPluginOnlyOptions,
  PluginOnlyKey
} from './types';
export { AudiomDisplayMode, FilterMode, VisualStyle } from './types';

export type {
  Feature,
  FeatureCollection,
  Geometry,
  Position
} from './geo/types';

const AudiomPlugin = { init };
export default AudiomPlugin;
