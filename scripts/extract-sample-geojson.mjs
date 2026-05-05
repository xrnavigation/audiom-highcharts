/**
 * One-shot: extract the FeatureCollection the plugin would produce for each
 * sample, POST it to the running dev server (http://localhost:5173), then
 * GET the served URL and write it to disk for inspection.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import * as topoClient from 'topojson-client';

const DEV = 'http://localhost:5173';

const SAMPLES = [
  {
    name: 'europe-gdp',
    topology: 'https://code.highcharts.com/mapdata/custom/europe.topo.json',
    title: 'Europe — GDP per capita (USD, approx 2023)',
    seriesName: 'GDP per capita',
    data: [
      ['no', 82655], ['ch', 93259], ['ie', 103274], ['lu', 125006],
      ['dk', 67803], ['se', 55884], ['nl', 57768], ['at', 51462],
      ['fi', 49853], ['de', 48432], ['be', 47068], ['fr', 42330],
      ['gb', 45295], ['it', 35472], ['es', 30103], ['pt', 24560],
      ['gr', 20193], ['pl', 18002], ['cz', 27700], ['hu', 18257],
      ['ro', 14858], ['bg', 13577], ['hr', 18384], ['sk', 21197],
      ['si', 28929], ['lt', 24318], ['lv', 21157], ['ee', 27282],
      ['rs', 9538],  ['ua', 4533]
    ]
  },
  {
    name: 'world-population',
    topology: 'https://code.highcharts.com/mapdata/custom/world.topo.json',
    title: 'World Population (millions, approx 2022)',
    seriesName: 'Population',
    data: [
      ['cn', 1412], ['in', 1408], ['us', 333], ['id', 273], ['pk', 231],
      ['br', 215],  ['ng', 218],  ['bd', 169], ['ru', 144], ['mx', 128],
      ['jp', 125],  ['et', 123],  ['ph', 115], ['eg', 110], ['vn', 98],
      ['cd', 99],   ['de', 84],   ['tr', 85],  ['ir', 88],  ['fr', 68],
      ['gb', 67],   ['it', 59],   ['za', 60],  ['ca', 39],  ['au', 26]
    ]
  }
];

function topoToGeo(raw) {
  if (raw && raw.type === 'Topology') {
    const objectName = Object.keys(raw.objects)[0];
    return topoClient.feature(raw, raw.objects[objectName]);
  }
  return raw;
}

function mergeData(collection, data, ruleType) {
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
          ruleType,
          ruleName: name ? `${name}${value !== undefined ? ` (${value})` : ''}` : undefined
        }
      };
    })
  };
}

mkdirSync('scripts/out', { recursive: true });

for (const s of SAMPLES) {
  console.log(`\n=== ${s.name} ===`);
  const topo = await fetch(s.topology).then((r) => r.json());
  const geo = topoToGeo(topo);
  const merged = mergeData(geo, s.data, 'choropleth_region');

  // Save raw
  const localPath = `scripts/out/${s.name}.geojson`;
  writeFileSync(localPath, JSON.stringify(merged, null, 2));
  console.log('local:', localPath, `(${merged.features.length} features)`);

  // POST to live dev server
  const res = await fetch(`${DEV}/__audiom__/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(merged)
  });
  if (!res.ok) {
    console.error('upload failed:', res.status, await res.text());
    continue;
  }
  const { url, id } = await res.json();
  console.log('served:', url, `(id=${id})`);

  // Pull a sample of properties
  const sample = merged.features
    .filter((f) => typeof f.properties?.value === 'number')
    .slice(0, 3)
    .map((f) => f.properties);
  console.log('sample properties (first 3 with values):');
  console.dir(sample, { depth: 4 });
}
