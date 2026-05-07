/**
 * Helper for uploading a v2 rules JSON to Audiom via the public REST API.
 *
 * Thin wrapper around `AudiomClient.rulesets.uploadFile()` that, in
 * addition to the row data the client returns, computes the *read* URL
 * the Audiom embed should fetch (`<frontendUrl>/api/rules/<slug>.json`)
 * — i.e. the value to assign to `AudiomPluginOptions.rules`.
 *
 * See upload-api/api-spec.md §5 for the full contract.
 */
import {
  AudiomClient,
  RulesetVisibility,
  type MapboxRuleSet,
  type UploadRulesetResult
} from '@xrnavigation/audiom-api-client';

export interface UploadAudiomRulesOptions {
  /** Audiom REST base URL (no trailing slash). Pass either this OR a `client`. */
  apiUrl?: string;
  /**
   * Pre-configured `AudiomClient`. When provided, `apiUrl`/`apiKey` are
   * ignored.
   */
  client?: AudiomClient;
  /** API key with `rulesets:write` and `rules:write` scopes. */
  apiKey?: string;
  /**
   * Caller's organization id. Optional — when omitted, derived from
   * the authenticated identity (`GET /users/me`). Pass this only when
   * the caller has access to multiple organizations.
   */
  organizationId?: number;
  /**
   * Frontend base URL for constructing the read URL Audiom fetches.
   * Defaults to `apiUrl` (or `client.http.getBaseUrl()`). Read URL:
   * `<frontendUrl>/api/rules/<slug>.json`.
   */
  frontendUrl?: string;
  /** URL-safe slug, unique per organization. */
  slug: string;
  /** Display name. Defaults to slug. */
  name?: string;
  description?: string;
  /**
   * Who can read the ruleset once uploaded. Defaults to backend default
   * (`org`). Use `RulesetVisibility.ApiKey` to allow any holder of the
   * read key to fetch it; `Public` for unauthenticated reads.
   */
  visibility?: RulesetVisibility;
  parentRulesetId?: number | null;
  /** The rules file to upload. */
  rules: MapboxRuleSet;
}

export interface UploadAudiomRulesResult extends UploadRulesetResult {
  /** URL suitable for `AudiomPluginOptions.rules`. */
  rulesUrl: string;
}

/**
 * Upload `options.rules` via `AudiomClient.rulesets.uploadFile()` and
 * return the result plus the read URL to assign to
 * `AudiomPluginOptions.rules`.
 *
 * Failure handling is delegated to the client: per-row failures roll
 * back the partially-created ruleset (per spec §5.1).
 */
export async function uploadAudiomRules(
  options: UploadAudiomRulesOptions
): Promise<UploadAudiomRulesResult> {
  if (!options?.slug) throw new Error('uploadAudiomRules: `slug` is required.');
  if (options.rules?.version !== 2) {
    throw new Error(
      `uploadAudiomRules: expected rules.version === 2, got ${String(options.rules?.version)}`
    );
  }

  const client = resolveClient(options);
  const readBase = trimTrailingSlash(
    options.frontendUrl ?? options.apiUrl ?? client.http.getBaseUrl()
  );

  const organizationId = Number.isFinite(options.organizationId)
    ? (options.organizationId as number)
    : await fetchOrganizationId(client);

  const result = await client.rulesets.uploadFile(options.rules, {
    slug: options.slug,
    name: options.name ?? options.slug,
    description: options.description ?? null,
    visibility: options.visibility,
    organizationId,
    parentRulesetId: options.parentRulesetId ?? null
  });

  return {
    ...result,
    rulesUrl: `${readBase}/api/rules/${encodeURIComponent(result.ruleset.slug)}.json`
  };
}

function resolveClient(options: UploadAudiomRulesOptions): AudiomClient {
  if (options.client) return options.client;
  if (!options.apiUrl) {
    throw new Error(
      'uploadAudiomRules: requires either `client` or `apiUrl`.'
    );
  }
  if (!options.apiKey) {
    throw new Error(
      'uploadAudiomRules: requires `apiKey` when `client` is not provided.'
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
      'uploadAudiomRules: GET /users/me returned no organizationId. ' +
        'Pass `organizationId` explicitly.'
    );
  }
  return user.organizationId;
}

function trimTrailingSlash(s: string): string {
  return s.replace(/\/+$/, '');
}
