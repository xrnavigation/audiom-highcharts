/**
 * Re-exports of standard GeoJSON / TopoJSON types from `@types/geojson` and
 * `@types/topojson-specification`. Keeping a single source of truth means
 * `topojson-client` outputs flow straight through without casts and consumers
 * already familiar with GeoJSON see the canonical shapes.
 *
 * Only plugin-specific extras live here: `FeatureProperties` (the keys Audiom
 * looks at) and runtime `is*` guards the upstream types don't ship.
 */
import type {
  Feature as GFeature,
  FeatureCollection as GFeatureCollection,
  Geometry as GGeometry,
  Position as GPosition
} from 'geojson';
import type { Topology } from 'topojson-specification';

export type Position = GPosition;
export type Geometry = GGeometry;

/** Audiom-relevant keys, plus passthrough for arbitrary user-defined props. */
export interface FeatureProperties {
  name?: string;
  value?: number | null;
  color?: string;
  ruleType?: string;
  ruleName?: string;
  [key: string]: unknown;
}

export type Feature = GFeature<GGeometry, FeatureProperties>;
export type FeatureCollection = GFeatureCollection<GGeometry, FeatureProperties>;

/** Alias kept for callers that already import `TopologyLike`. */
export type TopologyLike = Topology;

export function isTopology(value: unknown): value is Topology {
  return (
    !!value &&
    typeof value === 'object' &&
    (value as { type?: unknown }).type === 'Topology' &&
    typeof (value as { objects?: unknown }).objects === 'object' &&
    Array.isArray((value as { arcs?: unknown }).arcs)
  );
}

export function isFeatureCollection(value: unknown): value is FeatureCollection {
  return (
    !!value &&
    typeof value === 'object' &&
    (value as { type?: unknown }).type === 'FeatureCollection' &&
    Array.isArray((value as { features?: unknown }).features)
  );
}
