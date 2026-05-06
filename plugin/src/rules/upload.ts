/**
 * Helper for uploading a v2 rules JSON to Audiom via the public REST API.
 *
 * Audiom decomposes a rules file into three services:
 *   POST /rulesets   (container)
 *   POST /rules      (one row per rule, in order)
 *   POST /augmenters (one row per augmenter, in order)
 *
 * After upload, the file is readable as a single stitched JSON via the
 * frontend proxy: `<frontendUrl>/api/rules/<slug>.json`. That is the URL
 * to pass into `AudiomPluginOptions.rules`.
 *
 * See upload-api/api-spec.md §5 for the full contract.
 */
import { AudiomVisibility } from '../sources/audiom';
export { AudiomVisibility };

/** Where an augmenter's transform is applied relative to the matched feature. */
export enum AugmenterPosition {
  Before  = 'before',
  After   = 'after',
  Replace = 'replace'
}

/** Minimal v2 ruleset shape. Loose so callers can supply richer types. */
export interface AudiomRulesV2 {
  version: 2;
  rules: AudiomRuleRow[];
  augmenters?: AudiomAugmenterRow[];
}

export interface AudiomRuleRow {
  /** Diagnostic label echoed in server warnings; not user-visible. */
  id?: string;
  /** Lower runs first. Defaults to 1000 server-side. */
  priority?: number | null;
  /** Mapbox-GL-style filter expression. */
  filter: unknown;
  /** Output assignments (literals or expressions). */
  output: Record<string, unknown>;
}

export interface AudiomAugmenterRow {
  filter?: unknown;
  transform: unknown;
  position?: AugmenterPosition;
  priority?: number | null;
}

export interface UploadAudiomRulesOptions {
  /** Audiom REST base URL (no trailing slash). */
  apiUrl: string;
  /** API key with `rulesets:write` and `rules:write` scopes. */
  apiKey: string;
  /** Caller's organization id. */
  organizationId: number;
  /**
   * Frontend base URL for constructing the read URL Audiom fetches.
   * Defaults to `apiUrl`. Read URL: `<frontendUrl>/api/rules/<slug>.json`.
   */
  frontendUrl?: string;
  /** URL-safe slug, unique per organization. */
  slug: string;
  /** Display name. Defaults to slug. */
  name?: string;
  description?: string;
  visibility?: AudiomVisibility;
  /** The rules file to upload. */
  rules: AudiomRulesV2;
  /** Override fetch (tests / SSR). Defaults to `globalThis.fetch`. */
  fetchImpl?: typeof fetch;
  /** Optional AbortSignal forwarded to all requests. */
  signal?: AbortSignal;
}

export interface UploadAudiomRulesResult {
  /** Numeric ruleset id assigned by the server. */
  rulesetId: number;
  /** Slug as stored (echoed from request, normalised by server). */
  slug: string;
  /** URL suitable for `AudiomPluginOptions.rules`. */
  rulesUrl: string;
  /** Number of `rules` rows POSTed. */
  ruleCount: number;
  /** Number of `augmenters` rows POSTed. */
  augmenterCount: number;
}

/**
 * Decompose `options.rules` and POST it to Audiom in three phases. Returns
 * the URL to assign to `AudiomPluginOptions.rules`.
 *
 * Failure handling: if any per-rule POST fails, the partially-created
 * ruleset is **not** rolled back — the caller should DELETE it explicitly
 * if atomicity matters (per-row inserts are idempotent only at the row
 * level and there's no atomic-import RPC, per spec §5.1).
 */
export async function uploadAudiomRules(
  options: UploadAudiomRulesOptions
): Promise<UploadAudiomRulesResult> {
  if (!options?.apiUrl) throw new Error('uploadAudiomRules: `apiUrl` is required.');
  if (!options.apiKey) throw new Error('uploadAudiomRules: `apiKey` is required.');
  if (!Number.isFinite(options.organizationId)) {
    throw new Error('uploadAudiomRules: numeric `organizationId` is required.');
  }
  if (!options.slug) throw new Error('uploadAudiomRules: `slug` is required.');
  if (options.rules?.version !== 2) {
    throw new Error(
      `uploadAudiomRules: expected rules.version === 2, got ${String(options.rules?.version)}`
    );
  }

  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const apiBase = trimTrailingSlash(options.apiUrl);
  const readBase = trimTrailingSlash(options.frontendUrl ?? options.apiUrl);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-API-Key': options.apiKey
  };

  // 1. Create the container.
  const ruleset = await postJson<{ id: number; slug: string }>(
    fetchImpl,
    `${apiBase}/rulesets`,
    headers,
    options.signal,
    {
      name: options.name ?? options.slug,
      slug: options.slug,
      description: options.description ?? null,
      visibility: options.visibility ?? 'org',
      organizationId: options.organizationId,
      parentRulesetId: null
    }
  );

  // 2. POST each rule in order.
  const rules = options.rules.rules ?? [];
  for (let i = 0; i < rules.length; i++) {
    const r = rules[i] as AudiomRuleRow;
    await postJson<unknown>(
      fetchImpl,
      `${apiBase}/rules`,
      headers,
      options.signal,
      {
        rulesetId: ruleset.id,
        ruleId: r.id ?? null,
        priority: r.priority ?? null,
        filter: r.filter,
        output: r.output,
        order: i
      }
    );
  }

  // 3. POST each augmenter in order.
  const augmenters = options.rules.augmenters ?? [];
  for (let i = 0; i < augmenters.length; i++) {
    const a = augmenters[i] as AudiomAugmenterRow;
    await postJson<unknown>(
      fetchImpl,
      `${apiBase}/augmenters`,
      headers,
      options.signal,
      {
        rulesetId: ruleset.id,
        filter: a.filter ?? null,
        transform: a.transform,
        position: a.position ?? AugmenterPosition.After,
        priority: a.priority ?? null,
        unnamed: null,
        order: i
      }
    );
  }

  return {
    rulesetId: ruleset.id,
    slug: ruleset.slug,
    rulesUrl: `${readBase}/api/rules/${encodeURIComponent(ruleset.slug)}.json`,
    ruleCount: rules.length,
    augmenterCount: augmenters.length
  };
}

async function postJson<T>(
  fetchImpl: typeof fetch,
  url: string,
  headers: Record<string, string>,
  signal: AbortSignal | undefined,
  body: unknown
): Promise<T> {
  const res = await fetchImpl(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal
  });
  if (!res.ok) {
    throw new Error(
      `uploadAudiomRules: POST ${url} → ${res.status} ${res.statusText}: ${await safeText(res)}`
    );
  }
  return (await res.json()) as T;
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
