/**
 * Hardcoded fallback used when the live World Bank fetch fails.
 * Population in millions (approx 2022). `hc-key` matches the Highcharts
 * world map ISO-2 codes.
 */
export const WORLD_POPULATION_FALLBACK: Array<[string, number]> = [
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
