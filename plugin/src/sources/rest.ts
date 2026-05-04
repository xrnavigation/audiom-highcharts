/**
 * REST backend — POSTs the FeatureCollection to a host-provided endpoint
 * and uses the URL the endpoint returns. Pairs cleanly with any backend
 * that can persist a JSON blob and return a public URL: an Express/Rails
 * controller fronting S3, a Cloudflare Worker writing to R2, a Lambda +
 * API Gateway, etc.
 *
 * Server contract:
 *   POST <endpoint>
 *   Content-Type: application/json
 *   Body: { type: 'FeatureCollection', features: [...] }
 *   →
 *   200 OK
 *   Content-Type: application/json
 *   Body: { url: 'https://...' }   // single URL
 *      or  { sources: ['https://a', 'https://b'] }  // multiple
 *
 * The server MUST set CORS to allow the Audiom embed origin on subsequent
 * GETs against the returned URL — otherwise the iframe can't fetch it.
 */
import type { FeatureCollection } from '../geo/types';
import type { SourceBackend, SourcePutContext, AudiomSourceValue } from './types';

export interface RestBackendOptions {
  /** Absolute or page-relative URL of the upload endpoint. */
  endpoint: string;
  /** Extra request headers (auth tokens, etc.). */
  headers?: Record<string, string>;
  /** When true, sends `credentials: 'include'`. */
  withCredentials?: boolean;
  /**
   * Override the `fetch` implementation (tests, Node SSR with an injected
   * polyfill, etc.). Defaults to `globalThis.fetch`.
   */
  fetchImpl?: typeof fetch;
  /**
   * Map the server response into source values. Defaults to
   * `({ url, sources }) => sources ?? [url]`.
   */
  parseResponse?: (body: unknown) => AudiomSourceValue[];
}

export function restBackend(options: RestBackendOptions): SourceBackend {
  if (!options?.endpoint) {
    throw new Error('audiom-highcharts: restBackend requires an `endpoint` URL.');
  }
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const parse = options.parseResponse ?? defaultParse;

  return {
    name: 'rest',
    async put(
      collection: FeatureCollection,
      ctx: SourcePutContext
    ): Promise<AudiomSourceValue[]> {
      const res = await fetchImpl(options.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers ?? {})
        },
        body: JSON.stringify(collection),
        credentials: options.withCredentials ? 'include' : 'same-origin',
        signal: ctx.signal
      });
      if (!res.ok) {
        throw new Error(
          `audiom-highcharts: restBackend POST ${options.endpoint} → ${res.status} ${res.statusText}`
        );
      }
      const body = (await res.json()) as unknown;
      const out = parse(body);
      if (!out.length) {
        throw new Error(
          'audiom-highcharts: restBackend response did not include any URLs.'
        );
      }
      // Resolve relative URLs against the page origin so a cross-origin
      // Audiom iframe can fetch them.
      return out.map((s) =>
        typeof s === 'string' && typeof window !== 'undefined'
          ? new URL(s, window.location.href).href
          : s
      );
    }
  };
}

function defaultParse(body: unknown): AudiomSourceValue[] {
  if (!body || typeof body !== 'object') return [];
  const b = body as { url?: string; sources?: AudiomSourceValue[] };
  if (Array.isArray(b.sources)) return b.sources;
  if (typeof b.url === 'string') return [b.url];
  return [];
}
