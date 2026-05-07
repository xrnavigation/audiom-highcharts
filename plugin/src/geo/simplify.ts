/**
 * Simplify a GeoJSON FeatureCollection by round-tripping through TopoJSON
 * with quantization + Visvalingam–Whyatt simplification. Typical world
 * map: 250 KB → 15-25 KB while staying visually faithful.
 */
import { topology } from 'topojson-server';
import { presimplify, simplify } from 'topojson-simplify';
import { feature, quantize } from 'topojson-client';
import type {
  GeometryCollection,
  GeometryObject,
  Topology
} from 'topojson-specification';
import type { FeatureCollection as GeoJsonFeatureCollection } from 'geojson';
import type { Feature, FeatureCollection } from '../geo/types';

/**
 * Quantization grid passed to `topojson.quantize`. 1e4 (10,000 grid
 * cells per side) keeps polygon vertices roughly to 4 decimal places of
 * latitude/longitude — sub-meter precision at the equator — while still
 * giving the simplifier a uniform integer space to work in. Lower
 * values produce smaller files but visible polygon "stair-stepping".
 */
const QUANTIZE_GRID = 1e4;

/**
 * Simplify a GeoJSON FeatureCollection in place of the input. Returns
 * the input unchanged when `tolerance <= 0`.
 *
 * @param tolerance — Visvalingam–Whyatt minimum-area threshold in
 * squared degrees. Typical values: `0.001`–`0.05`.
 */
export function simplifyFeatureCollection(
  collection: FeatureCollection,
  tolerance: number
): FeatureCollection {
  if (!Number.isFinite(tolerance) || tolerance <= 0) return collection;
  if (collection.features.length === 0) return collection;

  // Accept the locally-typed FeatureCollection (which mirrors @types/geojson
  // closely) by widening to the GeoJSON spec type at the boundary.
  const topo: Topology<{ collection: GeometryCollection }> = topology({
    collection: collection as unknown as GeoJsonFeatureCollection
  }) as Topology<{ collection: GeometryCollection }>;
  const quantized = quantize(topo, QUANTIZE_GRID);
  const presimplified = presimplify(quantized);
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
