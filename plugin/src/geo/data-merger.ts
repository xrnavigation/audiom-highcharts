import type { Feature, FeatureCollection } from './types';

/**
 * Type-loose representation of a Highcharts series data point. Highcharts
 * surfaces these as either bare numbers/tuples (rare for maps) or objects
 * with various shape per series type.
 */
export interface HighchartsLikePoint {
  [key: string]: unknown;
  name?: string;
  value?: number | null;
  color?: string;
  options?: Record<string, unknown>;
  properties?: Record<string, unknown>;
}

/**
 * Resolve a value from either the point itself, its `options`, or its
 * `properties` bag — Highcharts stashes user-supplied fields in different
 * places depending on how the data was authored.
 */
function readPointField(point: HighchartsLikePoint, key: string): unknown {
  if (point[key] !== undefined) return point[key];
  if (point.options && (point.options as Record<string, unknown>)[key] !== undefined) {
    return (point.options as Record<string, unknown>)[key];
  }
  if (point.properties && (point.properties as Record<string, unknown>)[key] !== undefined) {
    return (point.properties as Record<string, unknown>)[key];
  }
  return undefined;
}

/**
 * Resolve the join key on a point. Mirrors Highcharts' own joinBy behaviour:
 * if joinBy is a string, the field of that name is used; if a 2-tuple, the
 * second element is the field on the data point.
 *
 * Default Highcharts joinBy is `hc-key`.
 */
function resolveJoinKey(
  point: HighchartsLikePoint,
  joinBy: string | [string, string]
): string | number | undefined {
  const pointKey = Array.isArray(joinBy) ? joinBy[1] : joinBy;
  const value = readPointField(point, pointKey);
  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  }
  return undefined;
}

/**
 * Locate the matching property name on a feature for the given joinBy.
 * Highcharts stores join keys inside `feature.properties`. When joinBy is a
 * tuple, the first element names the feature-side property.
 */
function resolveFeatureKey(
  feature: Feature,
  joinBy: string | [string, string]
): string | number | undefined {
  const featureKey = Array.isArray(joinBy) ? joinBy[0] : joinBy;
  const value = feature.properties?.[featureKey];
  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  }
  return undefined;
}

/**
 * Merge Highcharts series data points into a GeoJSON FeatureCollection,
 * matching points to features by `joinBy`. Returns a NEW collection — input
 * is not mutated. Features with no matching point are kept as-is.
 *
 * @param ruleType — value attached to each merged feature's `properties.ruleType`.
 *                   Used by Audiom to select sound mapping rules.
 */
export function mergeDataIntoFeatures(
  collection: FeatureCollection,
  data: HighchartsLikePoint[],
  joinBy: string | [string, string],
  ruleType: string
): FeatureCollection {
  // Index points by their join key for O(features) merging.
  const pointIndex = new Map<string | number, HighchartsLikePoint>();
  for (const point of data) {
    const key = resolveJoinKey(point, joinBy);
    if (key !== undefined) {
      pointIndex.set(key, point);
    }
  }

  const merged: Feature[] = collection.features.map((feature) => {
    const featureKey = resolveFeatureKey(feature, joinBy);
    const point = featureKey !== undefined ? pointIndex.get(featureKey) : undefined;

    const baseProps = { ...(feature.properties ?? {}) };
    const name =
      (typeof point?.name === 'string' ? point.name : undefined) ??
      (typeof baseProps.name === 'string' ? baseProps.name : undefined);
    const value =
      typeof point?.value === 'number' ? point.value : (baseProps.value as number | undefined);
    const color =
      typeof point?.color === 'string' ? point.color : (baseProps.color as string | undefined);

    const customProps =
      point?.properties && typeof point.properties === 'object'
        ? (point.properties as Record<string, unknown>)
        : undefined;

    return {
      ...feature,
      properties: {
        ...baseProps,
        ...(customProps ?? {}),
        ...(name !== undefined ? { name } : {}),
        ...(value !== undefined ? { value } : {}),
        ...(color !== undefined ? { color } : {}),
        ruleType,
        ruleName: name ? `${name}${value !== undefined ? ` (${value})` : ''}` : undefined
      }
    };
  });

  return { ...collection, features: merged };
}
