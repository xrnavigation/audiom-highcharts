import { describe, it, expect } from 'vitest';
import { PLUGIN_ONLY_KEYS } from '../src/types';
import {
  registerExtractor,
  unregisterExtractor,
  getExtractor,
  hasExtractor
} from '../src/extractors';
import type { SeriesExtractor } from '../src/extractors';

describe('PLUGIN_ONLY_KEYS', () => {
  it('contains every plugin-only field once', () => {
    const set = new Set(PLUGIN_ONLY_KEYS);
    expect(set.size).toBe(PLUGIN_ONLY_KEYS.length);
  });

  it('does not include any embedder-side passthrough keys', () => {
    // Sanity: known embedder fields should NOT be in the strip list.
    for (const k of ['apiKey', 'center', 'latitude', 'longitude', 'zoom']) {
      expect(PLUGIN_ONLY_KEYS).not.toContain(k);
    }
  });
});

describe('extractor registry', () => {
  it('has the built-in choropleth handler registered for "map"', () => {
    expect(hasExtractor('map')).toBe(true);
    expect(getExtractor('map')).toBeDefined();
  });

  it('register / unregister round-trip', () => {
    const stub: SeriesExtractor = {
      seriesTypes: ['__test_type__'],
      extract: () => ({ type: 'FeatureCollection', features: [] })
    };
    expect(hasExtractor('__test_type__')).toBe(false);
    registerExtractor(stub);
    expect(hasExtractor('__test_type__')).toBe(true);
    expect(unregisterExtractor('__test_type__')).toBe(true);
    expect(hasExtractor('__test_type__')).toBe(false);
  });
});
