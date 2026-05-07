import { describe, it, expect } from 'vitest';
import { geojsonToDataUri } from '../src/embed/data-uri';
import { GEO_JSON_DATA_URI_PREFIX } from '../src/constants';
import type { FeatureCollection } from '../src/geo/types';

const PREFIX = GEO_JSON_DATA_URI_PREFIX;

function decodeDataUri(uri: string): unknown {
  expect(uri.startsWith(PREFIX)).toBe(true);
  const b64 = uri.slice(PREFIX.length);
  // Decode base64 → UTF-8 → JSON. Buffer is available in jsdom-mode Vitest.
  const json = Buffer.from(b64, 'base64').toString('utf-8');
  return JSON.parse(json);
}

describe('geojsonToDataUri', () => {
  it('round-trips a small FeatureCollection', () => {
    const fc: FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name: 'p' },
          geometry: { type: 'Point', coordinates: [1, 2] }
        }
      ]
    };
    expect(decodeDataUri(geojsonToDataUri(fc))).toEqual(fc);
  });

  it('preserves non-ASCII content (Cyrillic + emoji)', () => {
    const fc: FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name: 'Россия 🇷🇺' },
          geometry: { type: 'Point', coordinates: [37.6, 55.75] }
        }
      ]
    };
    expect(decodeDataUri(geojsonToDataUri(fc))).toEqual(fc);
  });
});
