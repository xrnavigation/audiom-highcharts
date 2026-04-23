import type { Feature, FeatureCollection, Geometry, Position } from './types';

/** Axis-aligned bounding box: [west, south, east, north]. */
export type BBox = [number, number, number, number];

/** Walk a geometry's coordinates and call the visitor for each Position. */
function walkPositions(geometry: Geometry, visit: (p: Position) => void): void {
  switch (geometry.type) {
    case 'Point':
      visit(geometry.coordinates);
      return;
    case 'MultiPoint':
    case 'LineString':
      for (const c of geometry.coordinates) visit(c);
      return;
    case 'MultiLineString':
    case 'Polygon':
      for (const ring of geometry.coordinates) for (const c of ring) visit(c);
      return;
    case 'MultiPolygon':
      for (const poly of geometry.coordinates)
        for (const ring of poly) for (const c of ring) visit(c);
      return;
    case 'GeometryCollection':
      for (const g of geometry.geometries) walkPositions(g, visit);
  }
}

/**
 * Compute a tight bbox from a FeatureCollection. Returns null when there are
 * no positions to inspect (empty collection or all geometries empty).
 */
export function computeBBox(collection: FeatureCollection): BBox | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const feature of collection.features) {
    if (!feature.geometry) continue;
    walkPositions(feature.geometry, (pos) => {
      const x = pos[0];
      const y = pos[1];
      if (x === undefined || y === undefined) return;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    });
  }

  if (!Number.isFinite(minX)) return null;
  return [minX, minY, maxX, maxY];
}

/** Center [lon, lat] of a bbox. */
export function bboxCenter(bbox: BBox): [number, number] {
  return [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2];
}

/**
 * Heuristic: derive a reasonable Audiom/Leaflet-ish zoom level from the bbox
 * span. Tuned for global → city scale; consumers can override via plugin
 * options. Returns a value in [1, 18].
 */
export function bboxZoom(bbox: BBox): number {
  const lonSpan = Math.max(0.0001, Math.abs(bbox[2] - bbox[0]));
  const latSpan = Math.max(0.0001, Math.abs(bbox[3] - bbox[1]));
  const span = Math.max(lonSpan, latSpan);
  // log2(360 / span) roughly maps full world (360°) to zoom 1, 1° to zoom 9, etc.
  const zoom = Math.log2(360 / span);
  return Math.max(1, Math.min(18, Math.round(zoom)));
}

/** Convenience: bbox → { center, zoom } in one call. */
export function viewportFor(
  collection: FeatureCollection
): { center: [number, number]; zoom: number } | null {
  const bbox = computeBBox(collection);
  if (!bbox) return null;
  return { center: bboxCenter(bbox), zoom: bboxZoom(bbox) };
}

/** Used by point-based extractors that need to fabricate a single Feature. */
export function pointFeature(
  coordinates: Position,
  properties: Feature['properties'] = {}
): Feature {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates },
    properties
  };
}
