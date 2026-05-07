/**
 * Shared helpers for backends that talk to the Audiom REST API:
 * resolving an `AudiomClient` from `{client | apiUrl + apiKey}`,
 * computing the read base URL, and lazy-resolving the caller's
 * organization id via `GET /users/me`.
 *
 * Used by both `sources/audiom.ts` (datasource uploads) and
 * `rules/upload.ts` (ruleset uploads) so the two stay in sync.
 */
import type { AudiomClient } from '@xrnavigation/audiom-api-client';

export interface AudiomCredentialsOptions {
  /** Pre-configured client. When set, `apiUrl`/`apiKey` are ignored. */
  client?: AudiomClient;
  /** REST base URL (no trailing slash). Required when `client` not set. */
  apiUrl?: string;
  /** API key. Required when `client` not set. */
  apiKey?: string;
  /** Frontend base URL for read URLs; falls back to `apiUrl` / client base. */
  frontendUrl?: string;
  /** Caller-supplied organization id; resolved via `/users/me` when omitted. */
  organizationId?: number;
}

/** Strip one or more trailing slashes from a URL string. */
export function trimTrailingSlash(s: string): string {
  return s.replace(/\/+$/, '');
}

/**
 * Resolve an `AudiomClient` from the credentials object, dynamically
 * importing `@xrnavigation/audiom-api-client` so hosts that never use
 * the Audiom-direct backends don't pay the bundle cost.
 *
 * @param caller — short label included in error messages (e.g.
 * `"audiomBackend"` or `"uploadAudiomRules"`).
 */
export async function resolveAudiomClient(
  options: AudiomCredentialsOptions,
  caller: string
): Promise<AudiomClient> {
  if (options.client) return options.client;
  if (!options.apiUrl) {
    throw new Error(
      `audiom-highcharts: ${caller} requires either \`client\` or \`apiUrl\`.`
    );
  }
  if (!options.apiKey) {
    throw new Error(
      `audiom-highcharts: ${caller} requires \`apiKey\` when \`client\` is not provided.`
    );
  }
  const { AudiomClient } = await import('@xrnavigation/audiom-api-client');
  return new AudiomClient({ baseUrl: options.apiUrl, apiKey: options.apiKey });
}

/**
 * The base URL Audiom should fetch *read* artifacts from — the frontend
 * URL when set, otherwise the API URL, otherwise whatever base the
 * client was constructed with. Trailing slashes are normalised away.
 */
export function readBaseUrl(
  options: AudiomCredentialsOptions,
  client: AudiomClient
): string {
  return trimTrailingSlash(
    options.frontendUrl ?? options.apiUrl ?? client.http.getBaseUrl()
  );
}

/**
 * Return the explicit `organizationId` when provided, otherwise look it
 * up via `GET /users/me`. Throws with a caller-prefixed message when
 * `/users/me` returns no `organizationId`.
 */
export async function resolveOrganizationId(
  client: AudiomClient,
  given: number | undefined,
  caller: string
): Promise<number> {
  if (Number.isFinite(given)) return given as number;
  const user = await client.users.me();
  if (!Number.isFinite(user?.organizationId)) {
    throw new Error(
      `audiom-highcharts: ${caller}: GET /users/me returned no organizationId. ` +
        'Pass `organizationId` explicitly.'
    );
  }
  return user.organizationId;
}
