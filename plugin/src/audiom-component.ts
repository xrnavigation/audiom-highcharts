/**
 * Phase-6 deliverable. Stubbed in Phase 2 so the public surface is stable
 * from day one and types resolve cleanly.
 */
import type Highcharts from 'highcharts';
import type { AudiomPluginOptions } from './types';

export interface AudiomComponentInstance {
  readonly element: HTMLElement;
  readonly handler: unknown;
  refresh(): void;
  destroy(): void;
}

export const AudiomComponent = {
  create(
    _chart: Highcharts.Chart,
    _options: AudiomPluginOptions
  ): AudiomComponentInstance {
    throw new Error(
      'AudiomComponent.create is not implemented yet (lands in Phase 6).'
    );
  }
};
