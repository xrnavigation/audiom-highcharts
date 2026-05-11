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
// ---------------------------------------------------------------------------
// Static fallback data (used when World Bank API is unreachable at build time)
// ---------------------------------------------------------------------------
const EUROPE_GDP_FALLBACK = [
  ['no', 82655], ['ch', 93259], ['ie', 103274], ['lu', 125006],
  ['dk', 67803], ['se', 55884], ['nl', 57768], ['at', 51462],
  ['fi', 49853], ['de', 48432], ['be', 47068], ['fr', 42330],
  ['gb', 45295], ['it', 35472], ['es', 30103], ['pt', 24560],
  ['gr', 20193], ['pl', 18002], ['cz', 27700], ['hu', 18257],
  ['ro', 14858], ['bg', 13577], ['hr', 18384], ['sk', 21197],
  ['si', 28929], ['lt', 24318], ['lv', 21157], ['ee', 27282],
  ['rs',  9538], ['ua',  4533]
];

/**
 * Fetch a World Bank indicator for all countries, returning [hc-key, value]
 * pairs. Filters out aggregate / regional entries (any id containing digits).
 * @param {string} indicator  World Bank indicator code
 * @param {(v: number) => number} transform  Applied to each raw value
 */
async function fetchWorldBankData(indicator, transform = (v) => v) {
  const url =
    `https://api.worldbank.org/v2/country/all/indicator/${indicator}` +
    `?format=json&mrv=1&per_page=1000`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`World Bank API ${res.status}`);
  const [, records] = await res.json();
  // Keep only real countries: 2-letter alpha ISO codes (no aggregates)
  return records
    .filter((r) => r.value !== null && /^[A-Za-z]{2}$/.test(r.country.id))
    .map((r) => [r.country.id.toLowerCase(), transform(r.value)])
    // Drop non-positive values (would break logarithmic colour axes).
    .filter(([, v]) => v > 0)
    .map(([k, v]) => [k, v < 1 ? Number(v.toFixed(2)) : Math.round(v)]);
}

// ---------------------------------------------------------------------------
// Rules (mirrors audiom-rules.ts — inlined as plain JS)
// ---------------------------------------------------------------------------
const HEATMAP_RAMP = [
  '#F7F7FF', '#D8D8FF', '#B5B5FF', '#8C8CFF', '#5C5CFF',
  '#3333DD', '#1F1FAA', '#101077', '#000033'
];
const HEATMAP_NO_DATA = '#DDDDDD';
const HEATMAP_FILL_OPACITY = 0.85;

/** Eight log-spaced `step` buckets between min and max. */
function heatmapFill(min, max) {
  const logMin = Math.log(min);
  const logMax = Math.log(max);
  const stop = (frac) => Math.exp(logMin + (logMax - logMin) * frac);
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
// Fetch live indicators from World Bank for both samples.
console.log('Fetching Europe GDP per capita from World Bank API...');
let europeGdpData;
try {
  const all = await fetchWorldBankData('NY.GDP.PCAP.CD');
  // We don't know which hc-keys exist in europe.topo.json yet; just keep
  // every country and let mergeData() join — extra entries are harmless.
  europeGdpData = all;
  console.log(`  Fetched ${europeGdpData.length} countries`);
} catch (err) {
  console.warn(`  World Bank fetch failed (${err.message}); using fallback.`);
  europeGdpData = EUROPE_GDP_FALLBACK;
}

console.log('Fetching world population from World Bank API...');
let worldPopulationData;
try {
  worldPopulationData = await fetchWorldBankData('SP.POP.TOTL', (v) => v / 1_000_000);
  console.log(`  Fetched ${worldPopulationData.length} countries`);
} catch (err) {
  console.warn(`  World Bank fetch failed (${err.message}); using built-in fallback.`);
  // Fallback: top-80 countries by population, approx 2022 (millions).
  worldPopulationData = [
    ['cn',1412],['in',1408],['us', 333],['id', 273],['pk', 231],
    ['br', 215],['ng', 218],['bd', 169],['ru', 144],['mx', 128],
    ['jp', 125],['et', 123],['ph', 115],['eg', 110],['cd',  99],
    ['vn',  98],['ir',  88],['tr',  85],['de',  84],['tz',  63],
    ['gb',  67],['fr',  68],['za',  60],['it',  59],['ke',  55],
    ['mm',  54],['co',  52],['kr',  52],['sd',  47],['ug',  47],
    ['es',  47],['iq',  43],['af',  42],['ar',  46],['ua',  44],
    ['dz',  44],['pl',  38],['ca',  39],['sa',  35],['ma',  37],
    ['ao',  35],['gh',  33],['pe',  33],['mz',  33],['uz',  35],
    ['ye',  33],['my',  33],['mg',  28],['cm',  27],['ci',  27],
    ['ne',  26],['kp',  26],['au',  26],['ml',  22],['lk',  22],
    ['mw',  20],['kz',  19],['cl',  19],['ro',  19],['zm',  19],
    ['ec',  18],['gt',  17],['so',  17],['sn',  17],['td',  17],
    ['zw',  16],['kh',  16],['ss',  11],['rw',  14],['gn',  13],
    ['bj',  13],['tn',  12],['bo',  12],['bi',  12],['cu',  11],
    ['be',  11],['ht',  11],['jo',  10],['hn',  10],['az',  10],
  ];
}

const SAMPLES = [
  {
    name: 'europe-gdp',
    topologyUrl: 'https://code.highcharts.com/mapdata/custom/europe.topo.json',
    data: europeGdpData,
    rules: GDP_RULES,
    rulesName: 'gdp.rules'
  },
  {
    name: 'world-population',
    topologyUrl: 'https://code.highcharts.com/mapdata/custom/world.topo.json',
    data: worldPopulationData,
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
