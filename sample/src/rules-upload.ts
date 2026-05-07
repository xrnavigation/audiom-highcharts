/**
 * Rules-file upload routing for the sample. Picks between:
 *   - direct upload to the Audiom REST API (when `AUDIOM_DIRECT` is set), or
 *   - the in-process Vite dev server (default).
 *
 * Each kind is uploaded at most once per page load (results memoized in a
 * Promise-keyed Map).
 */
import { uploadAudiomRules, RulesetVisibility } from '@xrnavigation/audiom-highcharts';
import { POPULATION_RULES, GDP_RULES } from './audiom-rules';
import type { AudiomRulesFile } from './audiom-rules-types';
import { AUDIOM_DIRECT, type AudiomDirectConfig } from './audiom-direct-config';

/**
 * Tag name for which canned rules file to use. `null` means no rules file
 * (Audiom falls back to default behaviour, plus the extractor's
 * `ruleName: "Country (value)"` fallback).
 */
export type RulesKind = 'population' | 'gdp' | null;

const RULES_BY_KIND: Record<Exclude<RulesKind, null>, AudiomRulesFile> = {
  population: POPULATION_RULES,
  gdp: GDP_RULES
};

const rulesUrlCache = new Map<Exclude<RulesKind, null>, Promise<string>>();

/**
 * POST a rules JSON file and return the served URL. Memoized per kind.
 */
export function uploadRules(kind: Exclude<RulesKind, null>): Promise<string> {
  let pending = rulesUrlCache.get(kind);
  if (pending) return pending;
  pending = AUDIOM_DIRECT
    ? uploadRulesToAudiom(kind, AUDIOM_DIRECT)
    : uploadRulesToDevServer(kind);
  rulesUrlCache.set(kind, pending);
  return pending;
}

async function uploadRulesToDevServer(
  kind: Exclude<RulesKind, null>
): Promise<string> {
  const res = await fetch('/__audiom__/upload?ext=json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(RULES_BY_KIND[kind])
  });
  if (!res.ok) {
    throw new Error(`rules upload failed: ${res.status} ${await res.text()}`);
  }
  const { url } = (await res.json()) as { url: string };
  // Resolve relative URL (dev plugin returns "/__audiom__/<id>.json") to
  // an absolute URL so the Audiom iframe (different origin) can fetch it.
  return new URL(url, window.location.origin).toString();
}

async function uploadRulesToAudiom(
  kind: Exclude<RulesKind, null>,
  cfg: AudiomDirectConfig
): Promise<string> {
  // Slug is unique per organization. Suffix with a timestamp so reruns of
  // the demo don't 409 on a previously-uploaded slug.
  const slug = `audiom-highcharts-sample-${kind}-${Date.now().toString(36)}`;
  const result = await uploadAudiomRules({
    apiUrl: cfg.apiUrl,
    apiKey: cfg.apiKey,
    organizationId: cfg.organizationId,
    frontendUrl: cfg.frontendUrl,
    slug,
    name: `Audiom-Highcharts sample (${kind})`,
    visibility: RulesetVisibility.ApiKey,
    rules: RULES_BY_KIND[kind] as Parameters<typeof uploadAudiomRules>[0]['rules']
  });
  return result.rulesUrl;
}
