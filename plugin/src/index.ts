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
export { AudiomVisibility } from './sources';

export type {
  UploadAudiomRulesOptions,
  UploadAudiomRulesResult,
  AudiomRulesV2,
  AudiomRuleRow,
  AudiomAugmenterRow
} from './rules/upload';
export { AugmenterPosition } from './rules/upload';

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
