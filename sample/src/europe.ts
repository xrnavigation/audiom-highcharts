import Highcharts from 'highcharts/highmaps';
import AudiomPlugin, { registerDevSourceUploader } from 'audiom-highcharts';

AudiomPlugin.init(Highcharts, {
  apiKey: 'wO35blaGsjJREGuXehqWU',
  stepSize: '100km'
});

const EUROPE_TOPO_URL =
  'https://code.highcharts.com/mapdata/custom/europe.topo.json';

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

async function bootstrap(): Promise<void> {
  registerDevSourceUploader();

  const topology = await fetch(EUROPE_TOPO_URL).then((r) => r.json());

  Highcharts.mapChart('container', {
    chart: { map: topology },
    title: { text: 'Europe — GDP per capita (USD, approx 2023)' },
    subtitle: { text: 'Source: World Bank — illustrative subset' },
    mapNavigation: {
      enabled: true,
      buttonOptions: { verticalAlign: 'bottom' }
    },
    colorAxis: {
      min: 4000,
      max: 130000,
      type: 'logarithmic',
      stops: [
        [0, '#EFEFFF'],
        [0.5, '#4444FF'],
        [1, '#000033']
      ]
    },
    series: [
      {
        type: 'map',
        name: 'GDP per capita',
        data,
        joinBy: 'hc-key',
        states: { hover: { color: '#a4edba' } },
        dataLabels: { enabled: false },
        tooltip: {
          pointFormat: '{point.name}: <b>${point.value:,.0f}</b>'
        }
      }
    ]
  });
}

void bootstrap();
