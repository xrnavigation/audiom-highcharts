import { renderMap, BLUE_LOG_STOPS } from './setup';
import { mountSamplePage } from './sample-nav';
import { fetchWorldBankIndicator } from './world-bank-client';
import { EUROPE_GDP_FALLBACK } from './data/europe-gdp-fallback';

mountSamplePage('europe');

const filterKeys = new Set(EUROPE_GDP_FALLBACK.map(([k]) => k));

let data: Array<[string, number]>;
try {
  // World Bank: NY.GDP.PCAP.CD is GDP per capita (current USD).
  data = await fetchWorldBankIndicator({
    indicator: 'NY.GDP.PCAP.CD',
    filterKeys
  });
} catch (err) {
  console.warn('[sample/europe] World Bank fetch failed; using hardcoded fallback.', err);
  data = EUROPE_GDP_FALLBACK;
}

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
  tooltipPointFormat: '{point.name}: <b>${point.value:,.0f}</b>',
  staticGeojsonPath: 'audiom-data/europe-gdp.geojson',
  staticRulesPath: 'audiom-data/gdp.rules.json'
});
