/**
 * Helper for uploading a v2 rules JSON to Audiom via the public REST API.
 *
 * Thin wrapper around `AudiomClient.rulesets.uploadFile()` that, in
 * addition to the row data the client returns, computes the *read* URL
 * the Audiom embed should fetch (`<frontendUrl>/api/rules/<slug>.json`)
 * — i.e. the value to assign to `AudiomPluginOptions.rules`.
 *
 * The `@xrnavigation/audiom-api-client` dependency is loaded lazily so
 * hosts that never call this helper don't pay the bundle cost.
 *
 * See upload-api/api-spec.md §5 for the full contract.
 */
import type {
  MapboxRuleSet,
  RulesetVisibility,
  UploadRulesetResult
} from '@xrnavigation/audiom-api-client';
import {
  resolveAudiomClient,
  readBaseUrl,
  resolveOrganizationId,
  type AudiomCredentialsOptions
} from '../audiom/client';

export interface UploadAudiomRulesOptions extends AudiomCredentialsOptions {
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

  const client = await resolveAudiomClient(options, 'uploadAudiomRules');
  const readBase = readBaseUrl(options, client);
  const organizationId = await resolveOrganizationId(
    client,
    options.organizationId,
    'uploadAudiomRules'
  );

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
