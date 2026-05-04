/**
 * audiom-highcharts public entry point.
 */
import { init, isMapChart, isAudiomEnabled, resolveOptions } from './plugin';
import { AudiomComponent } from './audiom-component';
import { extractGeoJSON, getExtractor } from './extractors';
import { viewportFor, computeBBox } from './geo/viewport';
import { buildEmbedUrl } from './embed/build-url';
import { resolveSources } from './embed/source-strategy';
import { geojsonToDataUri } from './embed/data-uri';
import { createAudiomIframe, updateIframeUrl } from './embed/iframe-manager';
import { mountLayout } from './ui/layout';
import { ensureStylesInjected } from './ui/styles';
import { createPreviewButton, mountPreviewButtonAfter } from './ui/preview-button';
import {
  registerDevSourceUploader,
  getRegisteredDevSourceUploader
} from './dev/uploader';

export {
  init,
  isMapChart,
  isAudiomEnabled,
  resolveOptions,
  AudiomComponent,
  extractGeoJSON,
  getExtractor,
  viewportFor,
  computeBBox,
  buildEmbedUrl,
  resolveSources,
  geojsonToDataUri,
  createAudiomIframe,
  updateIframeUrl,
  mountLayout,
  ensureStylesInjected,
  createPreviewButton,
  mountPreviewButtonAfter,
  registerDevSourceUploader,
  getRegisteredDevSourceUploader
};

export type {
  RegisterDevSourceUploaderOptions,
  DevSourceUploaderHandle
} from './dev/uploader';
export type { LayoutHandle, MountLayoutOptions } from './ui/layout';
export type { CreateIframeOptions } from './embed/iframe-manager';
export type { PreviewButtonOptions, PreviewButtonHandle } from './ui/preview-button';

export type {
  AudiomPluginOptions,
  AudiomGlobalOptions
} from './types';
export {
  AudiomDisplayMode,
  AudiomSourceStrategy,
  FilterMode,
  VisualStyle
} from './types';
export type {
  Feature,
  FeatureCollection,
  Geometry,
  Position
} from './geo/types';

const AudiomPlugin = { init, AudiomComponent };
export default AudiomPlugin;
