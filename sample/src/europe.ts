import { renderMap, BLUE_LOG_STOPS } from './setup';

// GDP per capita (USD, approx 2023). hc-key matches Highcharts Europe map.
const data: Array<[string, number]> = [
  ['no', 82655],
  ['ch', 93259],
  ['ie', 103274],
  ['lu', 125006],
  ['dk', 67803],
  ['se', 55884],
  ['nl', 57768],
  ['at', 51462],
  ['fi', 49853],
  ['de', 48432],
  ['be', 47068],
  ['fr', 42330],
  ['gb', 45295],
  ['it', 35472],
  ['es', 30103],
  ['pt', 24560],
  ['gr', 20193],
  ['pl', 18002],
  ['cz', 27700],
  ['hu', 18257],
  ['ro', 14858],
  ['bg', 13577],
  ['hr', 18384],
  ['sk', 21197],
  ['si', 28929],
  ['lt', 24318],
  ['lv', 21157],
  ['ee', 27282],
  ['rs', 9538],
  ['ua', 4533]
];

void renderMap({
  topologyUrl: 'https://code.highcharts.com/mapdata/custom/europe.topo.json',
  title: 'Europe — GDP per capita (USD, approx 2023)',
  subtitle: 'Source: World Bank — illustrative subset',
  seriesName: 'GDP per capita',
  data,
  colorAxis: {
    min: 4000,
    max: 130000,
    type: 'logarithmic',
    stops: BLUE_LOG_STOPS
  },
  tooltipPointFormat: '{point.name}: <b>${point.value:,.0f}</b>'
});
