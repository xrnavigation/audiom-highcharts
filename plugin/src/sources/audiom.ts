/**
 * Audiom backend — uploads the FeatureCollection directly to the Audiom
 * platform via `AudiomClient.datasources.uploadGeoJson()` and returns the
 * canonical read URL (`<frontendUrl>/api/datasources/<id>.json`) which the
 * Audiom embed can fetch back without CORS plumbing.
 *
 * Pairs with `uploadAudiomRules()` for end-to-end "no infrastructure of
 * my own" use: hosts only need an Audiom API key + organization id and
 * GeoJSON + rules go straight into the same Audiom they're embedding.
 *
 * See upload-api/api-spec.md §6 for the full datasources contract.
 */
import { AudiomClient } from '@xrnavigation/audiom-api-client';
import type { FeatureCollection } from '../geo/types';
import type { SourceBackend, SourcePutContext, AudiomSourceValue } from './types';

export interface AudiomBackendOptions {
  /**
   * Audiom REST base URL (no trailing slash). Example:
   * `https://api.audiom.app`. Pass either this OR a pre-built `client`.
   */
  apiUrl?: string;
  /**
   * Pre-configured `AudiomClient`. When provided, `apiUrl`/`apiKey` are
   * ignored — useful when the host already maintains a logged-in client.
   */
  client?: AudiomClient;
  /**
   * Audiom organization-scoped API key with `datasources:write` scope.
   * Required when `client` is not provided.
   */
  apiKey?: string;
  /**
   * Caller's organization id. Optional — when omitted, the backend
   * resolves it from the authenticated identity (`GET /users/me`) on
   * the first upload and caches the result. Pass this only when the
   * caller has access to multiple organizations and needs to target a
   * specific one.
   */
  organizationId?: number;
  /**
   * Frontend base URL used to construct the *read* URL Audiom fetches.
   * Defaults to `apiUrl` (or `client.http.getBaseUrl()`). Example:
   * `https://app.audiom.app` (when frontend is on a different host than
   * the API). The read URL is `<frontendUrl>/api/datasources/<id>.json`.
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
}

export function audiomBackend(options: AudiomBackendOptions): SourceBackend {
  const client = resolveClient(options);
  const readBase = trimTrailingSlash(
    options.frontendUrl ?? options.apiUrl ?? client.http.getBaseUrl()
  );
  // Lazy: resolved on the first upload via /users/me unless the caller
  // provided an explicit organizationId.
  let resolvedOrgId: number | undefined = Number.isFinite(
    options.organizationId
  )
    ? (options.organizationId as number)
    : undefined;

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

      if (resolvedOrgId === undefined) {
        resolvedOrgId = await fetchOrganizationId(client);
      }
      const row = await client.datasources.uploadGeoJson(
        collection as unknown as GeoJSON.FeatureCollection,
        {
          name,
          organizationId: resolvedOrgId,
          sourceAttribution: options.sourceAttribution ?? null
        }
      );
      // §6.4: the frontend proxy unwraps the row and serves the raw
      // GeoJSON with application/json. This is what Audiom should fetch.
      return [`${readBase}/api/datasources/${row.id}.json`];
    }
  };
}

function resolveClient(options: AudiomBackendOptions): AudiomClient {
  if (options.client) return options.client;
  if (!options.apiUrl) {
    throw new Error(
      'audiom-highcharts: audiomBackend requires either `client` or `apiUrl`.'
    );
  }
  if (!options.apiKey) {
    throw new Error(
      'audiom-highcharts: audiomBackend requires `apiKey` when `client` is not provided.'
    );
  }
  return new AudiomClient({
    baseUrl: options.apiUrl,
    apiKey: options.apiKey
  });
}

async function fetchOrganizationId(client: AudiomClient): Promise<number> {
  const user = await client.users.me();
  if (!Number.isFinite(user?.organizationId)) {
    throw new Error(
      'audiom-highcharts: GET /users/me returned no organizationId. ' +
        'Pass `organizationId` explicitly to audiomBackend(...).'
    );
  }
  return user.organizationId;
}

function trimTrailingSlash(s: string): string {
  return s.replace(/\/+$/, '');
}
