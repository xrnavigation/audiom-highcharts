/**
 * Audiom backend — uploads the FeatureCollection directly to the Audiom
 * platform via the public `POST /datasources` REST endpoint and returns
 * the canonical read URL (`<frontendUrl>/api/datasources/<id>.json`)
 * which the Audiom embed can fetch back without CORS plumbing.
 *
 * Pairs with `uploadAudiomRules()` for end-to-end "no infrastructure of
 * my own" use: hosts only need an Audiom API key + organization id and
 * GeoJSON + rules go straight into the same Audiom they're embedding.
 *
 * See upload-api/api-spec.md §6 for the full datasources contract.
 */
import type { FeatureCollection } from '../geo/types';
import type { SourceBackend, SourcePutContext, AudiomSourceValue } from './types';

/** Visibility values accepted by `POST /datasources` and `POST /rulesets`. */
export enum AudiomVisibility {
  Org      = 'org',
  ApiKey   = 'api-key',
  Unlisted = 'unlisted',
  Public   = 'public'
}

export interface AudiomBackendOptions {
  /**
   * Audiom REST base URL (no trailing slash). Example:
   * `https://api.audiom.app`. The plugin will POST to `<apiUrl>/datasources`.
   */
  apiUrl: string;
  /**
   * Audiom organization-scoped API key. Must carry the `datasources:write`
   * scope. Sent verbatim as `X-API-Key`.
   */
  apiKey: string;
  /** Caller's organization id. */
  organizationId: number;
  /**
   * Frontend base URL used to construct the *read* URL Audiom fetches.
   * Defaults to `apiUrl`. Example:
   * `https://app.audiom.app` (when frontend is on a different host than the
   * API). The read URL is `<frontendUrl>/api/datasources/<id>.json`.
   */
  frontendUrl?: string;
  /**
   * Display name for the new datasource row. Defaults to the chart title
   * (or `"Highcharts chart <id>"` when no title is set). Use a function
   * to compute it from the per-chart context.
   */
  name?: string | ((ctx: SourcePutContext) => string);
  /** Attribution string surfaced in the Audiom UI. */
  sourceAttribution?: string;
  /** Defaults to `'org'` server-side; pass `'api-key'` for embed access. */
  visibility?: AudiomVisibility;
  /** Override fetch (tests / SSR). Defaults to `globalThis.fetch`. */
  fetchImpl?: typeof fetch;
}

/**
 * Subset of the `DatasourceData` row we care about. Audiom returns more
 * fields; we only read `id`.
 */
interface DatasourceRow {
  id: number;
}

export function audiomBackend(options: AudiomBackendOptions): SourceBackend {
  if (!options?.apiUrl) {
    throw new Error('audiom-highcharts: audiomBackend requires `apiUrl`.');
  }
  if (!options.apiKey) {
    throw new Error('audiom-highcharts: audiomBackend requires `apiKey`.');
  }
  if (!Number.isFinite(options.organizationId)) {
    throw new Error(
      'audiom-highcharts: audiomBackend requires a numeric `organizationId`.'
    );
  }
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const apiBase = trimTrailingSlash(options.apiUrl);
  const readBase = trimTrailingSlash(options.frontendUrl ?? options.apiUrl);

  return {
    name: 'audiom',
    async put(
      collection: FeatureCollection,
      ctx: SourcePutContext
    ): Promise<AudiomSourceValue[]> {
      const name =
        typeof options.name === 'function'
          ? options.name(ctx)
          : (options.name ??
              ctx.chartTitle ??
              `Highcharts chart ${String(ctx.chartId)}`);

      const res = await fetchImpl(`${apiBase}/datasources`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': options.apiKey
        },
        body: JSON.stringify({
          name,
          // Spec §6.2: source is a *stringified* GeoJSON FeatureCollection.
          source: JSON.stringify(collection),
          sourceAttribution: options.sourceAttribution ?? null,
          organizationId: options.organizationId,
          ...(options.visibility ? { visibility: options.visibility } : {})
        }),
        signal: ctx.signal
      });
      if (!res.ok) {
        throw new Error(
          `audiom-highcharts: audiomBackend POST ${apiBase}/datasources → ${res.status} ${res.statusText}: ${await safeText(res)}`
        );
      }
      const row = (await res.json()) as DatasourceRow;
      if (!row || typeof row.id !== 'number') {
        throw new Error(
          'audiom-highcharts: audiomBackend response did not include a numeric `id`.'
        );
      }
      // §6.4: the frontend proxy unwraps the row and serves the raw
      // GeoJSON with application/json. This is what Audiom should fetch.
      return [`${readBase}/api/datasources/${row.id}.json`];
    }
  };
}

function trimTrailingSlash(s: string): string {
  return s.replace(/\/+$/, '');
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 500);
  } catch {
    return '<no body>';
  }
}
