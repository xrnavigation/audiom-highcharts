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
 * The `@xrnavigation/audiom-api-client` dependency is loaded lazily so
 * hosts using only `restBackend`/`s3PresignedBackend`/etc. don't pay the
 * bundle cost.
 *
 * See upload-api/api-spec.md §6 for the full datasources contract.
 */
import type { AudiomClient } from '@xrnavigation/audiom-api-client';
import {
  resolveAudiomClient,
  readBaseUrl,
  resolveOrganizationId,
  type AudiomCredentialsOptions
} from '../audiom/client';
import type { FeatureCollection } from '../geo/types';
import type { SourceBackend, SourcePutContext, AudiomSourceValue } from './types';

export interface AudiomBackendOptions extends AudiomCredentialsOptions {
  /**
   * Display name for the new datasource row. Defaults to the chart title
   * (or `"Highcharts chart <id>"` when no title is set). Use a function
   * to compute it from the per-chart context.
   */
  name?: string | ((ctx: SourcePutContext) => string);
  /** Attribution string surfaced in the Audiom UI. */
  sourceAttribution?: string;
}

/** Default datasource label when neither `options.name` nor `chartTitle` is set. */
const defaultName = (ctx: SourcePutContext): string =>
  ctx.chartTitle ?? `Highcharts chart ${String(ctx.chartId)}`;

/** Collapse the `string | function | undefined` option to a single resolver. */
function nameResolver(
  opt: AudiomBackendOptions['name']
): (ctx: SourcePutContext) => string {
  if (typeof opt === 'function') return opt;
  if (typeof opt === 'string') return () => opt;
  return defaultName;
}

export function audiomBackend(options: AudiomBackendOptions): SourceBackend {
  // Lazy state: the client and read base URL are resolved on the first
  // upload so module-load stays cheap and hosts that never trigger an
  // upload don't pull `@xrnavigation/audiom-api-client` into their bundle.
  let clientPromise: Promise<AudiomClient> | null = null;
  let readBase: string | null = null;
  let resolvedOrgId: number | undefined;
  const resolveName = nameResolver(options.name);

  async function ensureClient(): Promise<AudiomClient> {
    if (!clientPromise) {
      clientPromise = resolveAudiomClient(options, 'audiomBackend').then(
        (c) => {
          readBase = readBaseUrl(options, c);
          return c;
        }
      );
    }
    return clientPromise;
  }

  return {
    name: 'audiom',
    async put(
      collection: FeatureCollection,
      ctx: SourcePutContext
    ): Promise<AudiomSourceValue[]> {
      const client = await ensureClient();
      const name = resolveName(ctx);

      resolvedOrgId = await resolveOrganizationId(
        client,
        resolvedOrgId ?? options.organizationId,
        'audiomBackend'
      );

      const row = await client.datasources.uploadGeoJson(
        collection as unknown as GeoJSON.FeatureCollection,
        {
          name,
          organizationId: resolvedOrgId,
          sourceAttribution: options.sourceAttribution ?? null
        }
      );
      // §6.4: the frontend proxy unwraps the row and serves the raw
      // GeoJSON with application/json — what Audiom should fetch.
      return [`${readBase}/api/datasources/${row.id}.json`];
    }
  };
}
