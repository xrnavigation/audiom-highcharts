/**
 * audiom-highcharts public entry point.
 */
import { init, isMapChart, isAudiomEnabled, resolveOptions } from './plugin';
import { AudiomComponent } from './audiom-component';

export { init, isMapChart, isAudiomEnabled, resolveOptions, AudiomComponent };

export type {
  AudiomPluginOptions,
  AudiomGlobalOptions,
  AudiomDisplayMode,
  AudiomFilterMode,
  AudiomVisualStyle,
  AudiomSourceStrategy
} from './types';

const AudiomPlugin = { init, AudiomComponent };
export default AudiomPlugin;
