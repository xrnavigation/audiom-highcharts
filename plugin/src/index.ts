/**
 * audiom-highcharts public entry point.
 */
import { init, isMapChart, isAudiomEnabled, resolveOptions } from './plugin';
import { AudiomComponent } from './audiom-component';
import { extractGeoJSON, getExtractor } from './extractors';
import { viewportFor, computeBBox } from './geo/viewport';

export {
  init,
  isMapChart,
  isAudiomEnabled,
  resolveOptions,
  AudiomComponent,
  extractGeoJSON,
  getExtractor,
  viewportFor,
  computeBBox
};

export type {
  AudiomPluginOptions,
  AudiomGlobalOptions,
  AudiomDisplayMode,
  AudiomSourceStrategy
} from './types';
export { FilterMode, VisualStyle } from './types';
export type {
  Feature,
  FeatureCollection,
  Geometry,
  Position
} from './geo/types';

const AudiomPlugin = { init, AudiomComponent };
export default AudiomPlugin;
