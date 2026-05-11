/**
 * Hardcoded fallback used when the live World Bank fetch fails.
 * GDP per capita in current USD (approx 2023). `hc-key` matches the
 * Highcharts Europe map ISO-2 codes.
 */
export const EUROPE_GDP_FALLBACK: Array<[string, number]> = [
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
