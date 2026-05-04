/**
 * audiom-highcharts public entry point.
 */
import { init } from './plugin';
import { SourceBackend } from './sources';
import {
  createPreviewButton,
  mountPreviewButtonAfter
} from './ui/preview-button';

export {
  init,
  /**
   * Both the **interface** (for typing custom backends) and the **static
   * factory namespace** for built-ins (`SourceBackend.memory()`,
   * `.rest({...})`, `.s3Presigned({...})`, etc.).
   */
  SourceBackend,
  // Preview button (for hosts that build their own layout)
  createPreviewButton,
  mountPreviewButtonAfter
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
  MemoryBackendHandle
} from './sources';

export type { PreviewButtonOptions, PreviewButtonHandle } from './ui/preview-button';

export type {
  AudiomPluginOptions,
  AudiomGlobalOptions,
  AudiomCenter
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
