/**
 * Audiom rules JSON (v2 format) for choropleth-region features.
 *
 * The plugin's choropleth extractor stamps each feature with:
 *   - properties.name      → country name (e.g. "Denmark")
 *   - properties.value     → numeric data value joined by hc-key
 *   - properties.ruleType  → "choropleth_region"
 *   - properties.ruleName  → fallback "Name (value)"
 *
 * These rule sets override `ruleName` (what the user hears in menus and
 * mouseover) with a context-appropriate, human-readable string, and
 * stamp each region with a `fill` color interpolated from the same
 * value the Highcharts chart uses for its choropleth — so the Audiom
 * visual map renders as a heatmap that mirrors the chart.
 *
 * Filters use Mapbox-GL-style expressions; see rules-file-format.md.
 */

import type { AudiomRulesFile, RuleExpression } from './audiom-rules-types';

/**
 * Five-stop blue gradient mirroring `BLUE_LOG_STOPS` in setup.ts.
 * Audiom's expression compiler does not support `interpolate` over
 * string outputs (color hex codes), so we use `step` to bucket each
 * region into one of five discrete shades. The bucket boundaries are
 * spaced **logarithmically** between min and max so the gradient lines
 * up with the chart's `type: 'logarithmic'` color axis.
 */
const HEATMAP_RAMP = [
  '#F7F7FF', // < bucket 1 boundary
  '#D8D8FF',
  '#B5B5FF',
  '#8C8CFF',
  '#5C5CFF',
  '#3333DD',
  '#1F1FAA',
  '#101077',
  '#000033'  // ≥ bucket 8 boundary
];
/** Neutral gray for regions with no joined data. */
const HEATMAP_NO_DATA = '#DDDDDD';
/** Stroke color for region boundaries. */
const HEATMAP_STROKE = '#666666';
const HEATMAP_FILL_OPACITY = 0.85;

/**
 * Build a `step` color expression with logarithmically-spaced
 * boundaries between `min` and `max`. Produces nine color buckets
 * that approximate a logarithmic color axis.
 */
function heatmapFill(min: number, max: number): RuleExpression {
  const logMin = Math.log(min);
  const logMax = Math.log(max);
  const stop = (frac: number) => Math.exp(logMin + (logMax - logMin) * frac);
  return [
    'step',
    ['to-number', ['get', 'value']],
    HEATMAP_RAMP[0],
    stop(1 / 8), HEATMAP_RAMP[1],
    stop(2 / 8), HEATMAP_RAMP[2],
    stop(3 / 8), HEATMAP_RAMP[3],
    stop(4 / 8), HEATMAP_RAMP[4],
    stop(5 / 8), HEATMAP_RAMP[5],
    stop(6 / 8), HEATMAP_RAMP[6],
    stop(7 / 8), HEATMAP_RAMP[7],
    stop(8 / 8), HEATMAP_RAMP[8]
  ];
}

/** Population in millions. Used by world.ts. Range ~1–1500. */
export const POPULATION_RULES: AudiomRulesFile = {
  version: 2,
  rules: [
    {
      id: 'choropleth-population-with-value',
      filter: [
        'all',
        ['==', ['get', 'ruleType'], 'choropleth_region'],
        ['has', 'value']
      ],
      output: {
        ruleType: 'choropleth_region',
        // Audiom menu format is hardcoded `name (ruleName)`. We bake the
        // statistic into `name` (so it shows in the click popup) and set
        // `ruleName` to '' so the renderer drops the parenthesised suffix.
        name: [
          'concat',
          ['coalesce', ['get', 'name'], 'Unknown country'],
          ', ',
          ['to-string', ['get', 'value']],
          ' million people'
        ],
        ruleName: '',
        passable: true,
        // Population in millions: log-spaced buckets between 1 and 1500.
        fill: heatmapFill(1, 1500),
        stroke: HEATMAP_STROKE,
        'fill-opacity': HEATMAP_FILL_OPACITY
      }
    },
    {
      id: 'choropleth-population-no-value',
      filter: ['==', ['get', 'ruleType'], 'choropleth_region'],
      output: {
        ruleType: 'choropleth_region',
        name: [
          'concat',
          ['coalesce', ['get', 'name'], 'Unknown country'],
          ' (no population data)'
        ],
        ruleName: '',
        passable: true,
        fill: HEATMAP_NO_DATA,
        stroke: HEATMAP_STROKE,
        'fill-opacity': HEATMAP_FILL_OPACITY
      }
    }
  ],
  augmenters: []
};

/** GDP per capita in USD. Used by europe.ts. Range ~4000–130000. */
export const GDP_RULES: AudiomRulesFile = {
  version: 2,
  rules: [
    {
      id: 'choropleth-gdp-with-value',
      filter: [
        'all',
        ['==', ['get', 'ruleType'], 'choropleth_region'],
        ['has', 'value']
      ],
      output: {
        ruleType: 'choropleth_region',
        // Bake the stat into `name`; empty `ruleName` suppresses the suffix.
        name: [
          'concat',
          ['coalesce', ['get', 'name'], 'Unknown country'],
          ', $',
          ['to-string', ['get', 'value']],
          ' GDP per capita'
        ],
        ruleName: '',
        passable: true,
        // GDP per capita in USD: log-spaced buckets between 4000 and 130000.
        fill: heatmapFill(4000, 130000),
        stroke: HEATMAP_STROKE,
        'fill-opacity': HEATMAP_FILL_OPACITY
      }
    },
    {
      id: 'choropleth-gdp-no-value',
      filter: ['==', ['get', 'ruleType'], 'choropleth_region'],
      output: {
        ruleType: 'choropleth_region',
        name: [
          'concat',
          ['coalesce', ['get', 'name'], 'Unknown country'],
          ' (no GDP data)'
        ],
        ruleName: '',
        passable: true,
        fill: HEATMAP_NO_DATA,
        stroke: HEATMAP_STROKE,
        'fill-opacity': HEATMAP_FILL_OPACITY
      }
    }
  ],
  augmenters: []
};
