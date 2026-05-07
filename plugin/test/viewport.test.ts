import { describe, it, expect } from 'vitest';
import { computeBBox, bboxCenter, bboxZoom, viewportFor } from '../src/geo/viewport';
import type { FeatureCollection } from '../src/geo/types';

const empty: FeatureCollection = { type: 'FeatureCollection', features: [] };

const usaTwoPoints: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates: [-122.4, 37.78] }   // SF
    },
    {
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates: [-74, 40.7] }       // NYC
    }
  ]
};

describe('computeBBox', () => {
  it('returns null for empty collections', () => {
    expect(computeBBox(empty)).toBeNull();
  });

  it('computes a tight bbox from two points', () => {
    const bbox = computeBBox(usaTwoPoints)!;
    expect(bbox).toEqual([-122.4, 37.78, -74, 40.7]);
  });
});

describe('bboxCenter', () => {
  it('averages corners', () => {
    expect(bboxCenter([0, 0, 10, 20])).toEqual([5, 10]);
  });
});

describe('bboxZoom', () => {
  it('clamps to >=1 for global spans', () => {
    expect(bboxZoom([-180, -85, 180, 85])).toBe(1);
  });
  it('clamps to <=18 for tiny spans', () => {
    expect(bboxZoom([0, 0, 0.0001, 0.0001])).toBe(18);
  });
});

describe('viewportFor', () => {
  it('returns null for empty collections', () => {
    expect(viewportFor(empty)).toBeNull();
  });
  it('produces a center+zoom for non-empty collections', () => {
    const vp = viewportFor(usaTwoPoints)!;
    expect(vp.center.length).toBe(2);
    expect(vp.zoom).toBeGreaterThanOrEqual(1);
    expect(vp.zoom).toBeLessThanOrEqual(18);
  });
});
