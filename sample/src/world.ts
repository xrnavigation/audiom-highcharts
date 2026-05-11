import { renderMap, BLUE_LOG_STOPS } from './setup';
import { mountSamplePage } from './sample-nav';
import { fetchWorldBankIndicator } from './world-bank-client';
import { WORLD_POPULATION_FALLBACK } from './data/world-population-fallback';

mountSamplePage('world');

const filterKeys = new Set(WORLD_POPULATION_FALLBACK.map(([k]) => k));

let data: Array<[string, number]>;
try {
  // World Bank: SP.POP.TOTL is total population (raw count). Convert to
  // millions to match the existing color axis and tooltip formatting.
  data = await fetchWorldBankIndicator({
    indicator: 'SP.POP.TOTL',
    filterKeys,
    valueTransform: (raw) => raw / 1_000_000
  });
} catch (err) {
  console.warn('[sample/world] World Bank fetch failed; using hardcoded fallback.', err);
  data = WORLD_POPULATION_FALLBACK;
}

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
