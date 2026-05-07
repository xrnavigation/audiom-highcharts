/**
 * audiom-highcharts public entry point.
 */
import { init } from './plugin';
import { SourceBackend } from './sources';
import {
  createPreviewButton,
  mountPreviewButtonAfter
} from './ui/preview-button';
import { uploadAudiomRules } from './rules/upload';

export {
  init,
  /**
   * Both the **interface** (for typing custom backends) and the **static
   * factory namespace** for built-ins (`SourceBackend.memory()`,
   * `.rest({...})`, `.s3Presigned({...})`, `.audiom({...})`, etc.).
   */
  SourceBackend,
  // Preview button (for hosts that build their own layout)
  createPreviewButton,
  mountPreviewButtonAfter,
  // Direct-to-Audiom rules upload (POST /rulesets + /rules + /augmenters)
  uploadAudiomRules
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

export type { PreviewButtonOptions, PreviewButtonHandle } from './ui/preview-button';

export type {
  AudiomPluginOptions,
  AudiomGlobalOptions,
  AudiomCenter,
  AudiomEmbedReadyInfo
} from './types';
export {
  AudiomDisplayMode,
  FilterMode,
  VisualStyle
} from './types';
export type {
  Feature,
  FeatureCollection,
  Geometry,
  Position
} from './geo/types';

const AudiomPlugin = { init };
export default AudiomPlugin;
