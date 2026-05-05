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
 * mouseover) with a context-appropriate, human-readable string.
 *
 * Filters use Mapbox-GL-style expressions; see rules-file-format.md.
 */

import type { AudiomRulesFile } from './audiom-rules-types';

/** Population in millions. Used by world.ts. */
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
        ruleName: [
          'concat',
          ['coalesce', ['get', 'name'], 'Unknown country'],
          ': ',
          ['to-string', ['get', 'value']],
          ' million people'
        ],
        name: ['coalesce', ['get', 'name'], 'Unknown country'],
        passable: true
      }
    },
    {
      id: 'choropleth-population-no-value',
      filter: ['==', ['get', 'ruleType'], 'choropleth_region'],
      output: {
        ruleType: 'choropleth_region',
        ruleName: [
          'concat',
          ['coalesce', ['get', 'name'], 'Unknown country'],
          ' (no population data)'
        ],
        name: ['coalesce', ['get', 'name'], 'Unknown country'],
        passable: true
      }
    }
  ],
  augmenters: []
};

/** GDP per capita in USD. Used by europe.ts. */
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
        ruleName: [
          'concat',
          ['coalesce', ['get', 'name'], 'Unknown country'],
          ': $',
          ['to-string', ['get', 'value']],
          ' GDP per capita'
        ],
        name: ['coalesce', ['get', 'name'], 'Unknown country'],
        passable: true
      }
    },
    {
      id: 'choropleth-gdp-no-value',
      filter: ['==', ['get', 'ruleType'], 'choropleth_region'],
      output: {
        ruleType: 'choropleth_region',
        ruleName: [
          'concat',
          ['coalesce', ['get', 'name'], 'Unknown country'],
          ' (no GDP data)'
        ],
        name: ['coalesce', ['get', 'name'], 'Unknown country'],
        passable: true
      }
    }
  ],
  augmenters: []
};
