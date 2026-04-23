import { feature } from 'topojson-client';
import type { GeometryObject } from 'topojson-specification';
import {
  isFeatureCollection,
  isTopology,
  type Feature,
  type FeatureCollection
} from './types';

/**
 * Convert a TopoJSON Topology into a GeoJSON FeatureCollection. If the input
 * is already a FeatureCollection it is returned unchanged. Throws when the
 * Topology has zero objects (caller should guard).
 *
 * Highcharts maps usually ship a single root object inside the topology; if
 * multiple objects exist they are concatenated into one FeatureCollection.
 */
export function topojsonToGeoJSON(input: unknown): FeatureCollection {
  if (isFeatureCollection(input)) {
    return input;
  }
  if (!isTopology(input)) {
    throw new Error(
      'topojsonToGeoJSON: input is neither a Topology nor a FeatureCollection.'
    );
  }

  const objectKeys = Object.keys(input.objects);
  if (objectKeys.length === 0) {
    throw new Error('topojsonToGeoJSON: Topology has no objects.');
  }

  const features: Feature[] = [];
  for (const key of objectKeys) {
    const obj = input.objects[key] as GeometryObject;
    const result = feature(input, obj);
    // `feature()` returns either a Feature or a FeatureCollection depending on
    // whether the source object was a GeometryCollection.
    if (result.type === 'FeatureCollection') {
      features.push(...(result.features as Feature[]));
    } else {
      features.push(result as Feature);
    }
  }

  return { type: 'FeatureCollection', features };
}
