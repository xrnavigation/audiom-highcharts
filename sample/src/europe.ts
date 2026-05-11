import { renderIndicatorMap, BLUE_LOG_STOPS } from './setup';
import { EUROPE_GDP_FALLBACK } from './data/europe-gdp-fallback';

void renderIndicatorMap({
  slug: 'europe',
  indicator: 'NY.GDP.PCAP.CD',
  fallback: EUROPE_GDP_FALLBACK,
  topologyUrl: 'https://code.highcharts.com/mapdata/custom/europe.topo.json',
  title: 'Europe — GDP per capita (USD, approx 2023)',
  subtitle: 'Source: World Bank — illustrative subset',
  seriesName: 'GDP per capita',
  colorAxis: { min: 4000, max: 130000, type: 'logarithmic', stops: BLUE_LOG_STOPS },
  tooltipPointFormat: '{point.name}: <b>${point.value:,.0f}</b>',
  staticGeojsonPath: 'audiom-data/europe-gdp.geojson',
  staticRulesPath: 'audiom-data/gdp.rules.json'
});
