import Highcharts from 'highcharts/highmaps';
import AudiomPlugin, { registerDevSourceUploader } from 'audiom-highcharts';

AudiomPlugin.init(Highcharts, {
  apiKey: 'wO35blaGsjJREGuXehqWU',
  stepSize: '100km'
});

const WORLD_TOPO_URL =
  'https://code.highcharts.com/mapdata/custom/world.topo.json';

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

async function bootstrap(): Promise<void> {
  registerDevSourceUploader();

  const topology = await fetch(WORLD_TOPO_URL).then((r) => r.json());

  Highcharts.mapChart('container', {
    chart: { map: topology },
    title: { text: 'World Population (millions, approx 2022)' },
    subtitle: { text: 'Source: World Bank — illustrative subset' },
    mapNavigation: {
      enabled: true,
      buttonOptions: { verticalAlign: 'bottom' }
    },
    colorAxis: {
      min: 1,
      max: 1500,
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
        name: 'Population',
        data,
        joinBy: 'hc-key',
        states: { hover: { color: '#a4edba' } },
        dataLabels: { enabled: false },
        tooltip: {
          pointFormat: '{point.name}: <b>{point.value}M</b>'
        }
      }
    ]
  });
}

void bootstrap();
