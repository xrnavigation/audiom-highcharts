import { topology } from 'topojson-server';
import { presimplify, simplify } from 'topojson-simplify';
import { feature, quantize } from 'topojson-client';
import type { GeometryObject, Topology } from 'topojson-specification';
import type { Feature, FeatureCollection } from '../geo/types';

/**
 * Simplify a GeoJSON FeatureCollection by round-tripping through TopoJSON
 * with quantization + Visvalingam–Whyatt simplification. Typical world map:
 * 250 KB → 15-25 KB while staying visually faithful.
 *
 * Returns the input unchanged when `tolerance <= 0`.
 */
export function simplifyFeatureCollection(
  collection: FeatureCollection,
  tolerance: number
): FeatureCollection {
  if (!Number.isFinite(tolerance) || tolerance <= 0) return collection;
  if (collection.features.length === 0) return collection;

  // topojson-server typings use `GeoJsonProperties` (which includes null);
  // topojson-simplify typings use `{}`. Cast through `never` once at the
  // boundary rather than redeclaring shapes.
  const topo = topology({ collection: collection as never }) as never;
  const quantized = quantize(topo, 1e4) as never;
  const presimplified = presimplify(quantized) as never;
  const simplified = simplify(presimplified, tolerance) as Topology;

  const result = feature(
    simplified,
    simplified.objects.collection as GeometryObject
  );

  if (result.type === 'FeatureCollection') {
    return result as unknown as FeatureCollection;
  }
  // Single-feature edge case.
  return {
    type: 'FeatureCollection',
    features: [result as unknown as Feature]
  };
}
