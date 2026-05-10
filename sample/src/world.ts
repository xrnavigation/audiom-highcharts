import { renderMap, BLUE_LOG_STOPS } from './setup';
import { mountSamplePage } from './sample-nav';

mountSamplePage('world');

// Population (millions, approx 2022). hc-key matches Highcharts world map ISO-2 codes.
const data: Array<[string, number]> = [
  ['cn', 1412],
  ['in', 1408],
  ['us', 333],
  ['id', 273],
  ['pk', 231],
  ['br', 215],
  ['ng', 218],
  ['bd', 169],
  ['ru', 144],
  ['mx', 128],
  ['jp', 125],
  ['et', 123],
  ['ph', 115],
  ['eg', 110],
  ['vn', 98],
  ['cd', 99],
  ['de', 84],
  ['tr', 85],
  ['ir', 88],
  ['fr', 68],
  ['gb', 67],
  ['it', 59],
  ['za', 60],
  ['ca', 39],
  ['au', 26]
];

void renderMap({
  topologyUrl: 'https://code.highcharts.com/mapdata/custom/world.topo.json',
  title: 'World Population (millions, approx 2022)',
  subtitle: 'Source: World Bank — illustrative subset',
  seriesName: 'Population',
  data,
  colorAxis: {
    min: 1,
    max: 1500,
    type: 'logarithmic',
    stops: BLUE_LOG_STOPS
  },
  tooltipPointFormat: '{point.name}: <b>{point.value}M</b>',
  staticGeojsonPath: 'audiom-data/world-population.geojson',
  staticRulesPath: 'audiom-data/population.rules.json',
  // Audiom's iframe is narrower than the Highcharts pane. Center on South
  // Asia (~India) so the densest cluster of data-bearing countries —
  // China, India, Pakistan, Bangladesh, Indonesia, Iran, Vietnam, the
  // Philippines, plus the Middle East and East Africa — is in view at
  // first paint instead of the mid-Atlantic.
  audiomCenter: [78, 22],
  audiomZoom: 1.4
});
