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
        passable: true
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
        // Bake the stat into `name`; empty `ruleName` suppresses the suffix.
        name: [
          'concat',
          ['coalesce', ['get', 'name'], 'Unknown country'],
          ', $',
          ['to-string', ['get', 'value']],
          ' GDP per capita'
        ],
        ruleName: '',
        passable: true
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
        passable: true
      }
    }
  ],
  augmenters: []
};
