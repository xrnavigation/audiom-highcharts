import { topology } from 'topojson-server';
import { presimplify, simplify, quantize } from 'topojson-simplify';
import { feature } from 'topojson-client';
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

  // topojson-server expects a record of GeoJSON objects.
  const topo = topology({ collection: collection as never }) as Topology;
  const quantized = quantize(topo, 1e4);
  const presimplified = presimplify(quantized);
  const simplified = simplify(presimplified, tolerance);

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
