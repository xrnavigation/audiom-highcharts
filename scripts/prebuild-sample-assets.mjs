/**
 * Prebuild step: generate static GeoJSON and rules JSON files for the sample
 * pages. Outputs land in `sample/public/audiom-data/` and are served as
 * regular static assets by Vite (dev and build alike), so the Audiom iframe
 * can fetch them without any runtime upload.
 *
 * Usage:
 *   node scripts/prebuild-sample-assets.mjs
 *
 * Requires: topojson-client (already a dev dependency via the plugin workspace).
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import * as topoClient from 'topojson-client';

const OUT_DIR = 'sample/public/audiom-data';
mkdirSync(OUT_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Map data (mirrors europe.ts / world.ts)
// ---------------------------------------------------------------------------
const EUROPE_GDP_DATA = [
  ['no', 82655], ['ch', 93259], ['ie', 103274], ['lu', 125006],
  ['dk', 67803], ['se', 55884], ['nl', 57768], ['at', 51462],
  ['fi', 49853], ['de', 48432], ['be', 47068], ['fr', 42330],
  ['gb', 45295], ['it', 35472], ['es', 30103], ['pt', 24560],
  ['gr', 20193], ['pl', 18002], ['cz', 27700], ['hu', 18257],
  ['ro', 14858], ['bg', 13577], ['hr', 18384], ['sk', 21197],
  ['si', 28929], ['lt', 24318], ['lv', 21157], ['ee', 27282],
  ['rs',  9538], ['ua',  4533]
];

const WORLD_POPULATION_DATA = [
  ['cn', 1412], ['in', 1408], ['us',  333], ['id', 273], ['pk', 231],
  ['br',  215], ['ng',  218], ['bd',  169], ['ru', 144], ['mx', 128],
  ['jp',  125], ['et',  123], ['ph',  115], ['eg', 110], ['vn',  98],
  ['cd',   99], ['de',   84], ['tr',   85], ['ir',  88], ['fr',  68],
  ['gb',   67], ['it',   59], ['za',   60], ['ca',  39], ['au',  26]
];

// ---------------------------------------------------------------------------
// Rules (mirrors audiom-rules.ts — inlined as plain JS)
// ---------------------------------------------------------------------------
const HEATMAP_RAMP = ['#EFEFFF', '#9999FF', '#4444FF', '#222288', '#000033'];
const HEATMAP_NO_DATA = '#DDDDDD';
const HEATMAP_FILL_OPACITY = 0.85;

/** Five log-spaced `step` buckets between min and max. */
function heatmapFill(min, max) {
  const logMin = Math.log(min);
  const logMax = Math.log(max);
  const stop = (frac) => Math.exp(logMin + (logMax - logMin) * frac);
  return [
    'step',
    ['to-number', ['get', 'value']],
    HEATMAP_RAMP[0],
    stop(0.25), HEATMAP_RAMP[1],
    stop(0.50), HEATMAP_RAMP[2],
    stop(0.75), HEATMAP_RAMP[3],
    stop(1.00), HEATMAP_RAMP[4]
  ];
}

const GDP_RULES = {
  version: 2,
  rules: [
    {
      id: 'choropleth-gdp-with-value',
      filter: ['all', ['==', ['get', 'ruleType'], 'choropleth_region'], ['has', 'value']],
      output: {
        ruleType: 'choropleth_region',
        name: ['concat', ['coalesce', ['get', 'name'], 'Unknown country'], ', $', ['to-string', ['get', 'value']], ' GDP per capita'],
        ruleName: '',
        passable: true,
        fill: heatmapFill(4000, 130000),
        'fill-opacity': HEATMAP_FILL_OPACITY
      }
    },
    {
      id: 'choropleth-gdp-no-value',
      filter: ['==', ['get', 'ruleType'], 'choropleth_region'],
      output: {
        ruleType: 'choropleth_region',
        name: ['concat', ['coalesce', ['get', 'name'], 'Unknown country'], ' (no GDP data)'],
        ruleName: '',
        passable: true,
        fill: HEATMAP_NO_DATA,
        'fill-opacity': HEATMAP_FILL_OPACITY
      }
    }
  ],
  augmenters: []
};

const POPULATION_RULES = {
  version: 2,
  rules: [
    {
      id: 'choropleth-population-with-value',
      filter: ['all', ['==', ['get', 'ruleType'], 'choropleth_region'], ['has', 'value']],
      output: {
        ruleType: 'choropleth_region',
        name: ['concat', ['coalesce', ['get', 'name'], 'Unknown country'], ', ', ['to-string', ['get', 'value']], ' million people'],
        ruleName: '',
        passable: true,
        fill: heatmapFill(1, 1500),
        'fill-opacity': HEATMAP_FILL_OPACITY
      }
    },
    {
      id: 'choropleth-population-no-value',
      filter: ['==', ['get', 'ruleType'], 'choropleth_region'],
      output: {
        ruleType: 'choropleth_region',
        name: ['concat', ['coalesce', ['get', 'name'], 'Unknown country'], ' (no population data)'],
        ruleName: '',
        passable: true,
        fill: HEATMAP_NO_DATA,
        'fill-opacity': HEATMAP_FILL_OPACITY
      }
    }
  ],
  augmenters: []
};

// ---------------------------------------------------------------------------
// GeoJSON helpers
// ---------------------------------------------------------------------------
function topoToGeo(raw) {
  if (raw?.type === 'Topology') {
    const objectName = Object.keys(raw.objects)[0];
    return topoClient.feature(raw, raw.objects[objectName]);
  }
  return raw;
}

function mergeData(collection, data) {
  const idx = new Map(data.map(([k, v]) => [k, v]));
  return {
    ...collection,
    features: collection.features.map((f) => {
      const key = f.properties?.['hc-key'];
      const value = idx.get(key);
      const name = f.properties?.name;
      return {
        ...f,
        properties: {
          ...f.properties,
          ...(value !== undefined ? { value } : {}),
          ruleType: 'choropleth_region',
          ruleName: name
            ? `${name}${value !== undefined ? ` (${value})` : ''}`
            : undefined
        }
      };
    })
  };
}

// ---------------------------------------------------------------------------
// Build samples
// ---------------------------------------------------------------------------
const SAMPLES = [
  {
    name: 'europe-gdp',
    topologyUrl: 'https://code.highcharts.com/mapdata/custom/europe.topo.json',
    data: EUROPE_GDP_DATA,
    rules: GDP_RULES,
    rulesName: 'gdp.rules'
  },
  {
    name: 'world-population',
    topologyUrl: 'https://code.highcharts.com/mapdata/custom/world.topo.json',
    data: WORLD_POPULATION_DATA,
    rules: POPULATION_RULES,
    rulesName: 'population.rules'
  }
];

for (const s of SAMPLES) {
  console.log(`\n=== ${s.name} ===`);

  const topo = await fetch(s.topologyUrl).then((r) => r.json());
  const geo = topoToGeo(topo);
  const merged = mergeData(geo, s.data);

  const geojsonPath = `${OUT_DIR}/${s.name}.geojson`;
  writeFileSync(geojsonPath, JSON.stringify(merged));
  const withValues = merged.features.filter((f) => f.properties?.value !== undefined).length;
  console.log(`  GeoJSON: ${geojsonPath}  (${merged.features.length} features, ${withValues} with values)`);

  const rulesPath = `${OUT_DIR}/${s.rulesName}.json`;
  writeFileSync(rulesPath, JSON.stringify(s.rules, null, 2));
  console.log(`  Rules:   ${rulesPath}  (${s.rules.rules.length} rules)`);
}

console.log('\nDone. Files written to', OUT_DIR);
