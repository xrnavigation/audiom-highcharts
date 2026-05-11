/**
 * Lightweight client for the World Bank Indicators REST API v2.
 * https://datahelpdesk.worldbank.org/knowledgebase/articles/889392
 */

export interface WorldBankRecord {
  country: { id: string; value: string };
  indicator: { id: string; value: string };
  value: number | null;
  date: string;
}

export interface WorldBankFetchOptions {
  /** World Bank indicator code, e.g. `'NY.GDP.PCAP.CD'`. */
  indicator: string;
  /**
   * ISO 3166-1 alpha-2 codes (case-insensitive) to keep.
   * If omitted, all countries in the response are returned.
   */
  filterKeys?: Set<string>;
  /** Number of most-recent values to request. Defaults to 1. */
  mrv?: number;
  /** Max records per page. Defaults to 300 (enough for all countries). */
  perPage?: number;
  /**
   * Optional transform applied to each non-null raw value before rounding.
   * Useful for unit conversion (e.g. raw population → millions).
   * Defaults to identity.
   */
  valueTransform?: (raw: number) => number;
}

/**
 * Fetches the most-recent value of a World Bank indicator for every country,
 * optionally filtered to a set of ISO alpha-2 keys, and returns the results
 * as `[hc-key, value]` pairs ready for use in a Highcharts map series.
 *
 * Throws if the HTTP request fails or the filtered result is empty.
 */
export async function fetchWorldBankIndicator(
  options: WorldBankFetchOptions
): Promise<Array<[string, number]>> {
  const {
    indicator,
    filterKeys,
    mrv = 1,
    perPage = 300,
    valueTransform = (v: number) => v
  } = options;

  const url =
    `https://api.worldbank.org/v2/country/all/indicator/${encodeURIComponent(indicator)}` +
    `?format=json&mrv=${mrv}&per_page=${perPage}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`World Bank API error ${res.status} for indicator "${indicator}"`);
  }

  const [, records]: [unknown, WorldBankRecord[]] = await res.json();

  const filtered = records.filter((r) => {
    if (r.value === null) return false;
    if (!filterKeys) return true;
    return filterKeys.has(r.country.id.toLowerCase());
  });

  if (filtered.length === 0) {
    throw new Error(
      `No records returned for indicator "${indicator}"${filterKeys ? ' with the given key filter' : ''}`
    );
  }

  return filtered.map((r) => [r.country.id.toLowerCase(), Math.round(valueTransform(r.value!))]);
}
