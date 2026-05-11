import { renderIndicatorMap, BLUE_LOG_STOPS } from './setup';
import { WORLD_POPULATION_FALLBACK } from './data/world-population-fallback';

void renderIndicatorMap({
  slug: 'world',
  indicator: 'SP.POP.TOTL',
  fallback: WORLD_POPULATION_FALLBACK,
  // World Bank returns raw count; convert to millions for the colour axis
  // and tooltip (which formats as "{value}M").
  valueTransform: (raw) => raw / 1_000_000,
  topologyUrl: 'https://code.highcharts.com/mapdata/custom/world.topo.json',
  title: 'World Population (millions, approx 2022)',
  subtitle: 'Source: World Bank — illustrative subset',
  seriesName: 'Population',
  colorAxis: { min: 1, max: 1500, type: 'logarithmic', stops: BLUE_LOG_STOPS },
  tooltipPointFormat: '{point.name}: <b>{point.value}M</b>',
  staticGeojsonPath: 'audiom-data/world-population.geojson',
  staticRulesPath: 'audiom-data/population.rules.json',
  // Center on South Asia so the densest data cluster is visible at first paint.
  audiomCenter: [78, 22],
  audiomZoom: 1.4
});
