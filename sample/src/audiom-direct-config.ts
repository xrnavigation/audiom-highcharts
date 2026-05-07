/**
 * Optional direct-to-Audiom REST configuration, sourced from Vite env
 * vars at build time. When the required fields are present, the sample
 * uploads its extracted GeoJSON and rules straight to Audiom's REST API
 * (via `SourceBackend.audiom()` and `uploadAudiomRules()`) instead of
 * the in-process dev server.
 *
 * Set in `sample/.env.local`:
 *   VITE_AUDIOM_API_URL=https://api.audiom.app
 *   VITE_AUDIOM_API_KEY=...
 *   VITE_AUDIOM_FRONTEND_URL=https://app.audiom.app   (optional)
 *   VITE_AUDIOM_ORG_ID=42                              (optional —
 *     org-scoped API keys imply the organization; set this only when
 *     the key has access to multiple orgs.)
 */
export interface AudiomDirectConfig {
  apiUrl: string;
  apiKey: string;
  organizationId?: number;
  frontendUrl?: string;
}

function readAudiomDirectConfig(): AudiomDirectConfig | null {
  const env = import.meta.env as Record<string, string | undefined>;
  const apiUrl = env.VITE_AUDIOM_API_URL;
  const apiKey = env.VITE_AUDIOM_API_KEY;
  if (!apiUrl || !apiKey) return null;
  const orgRaw = env.VITE_AUDIOM_ORG_ID;
  const orgId = orgRaw ? Number(orgRaw) : NaN;
  return {
    apiUrl,
    apiKey,
    organizationId: Number.isFinite(orgId) ? orgId : undefined,
    frontendUrl: env.VITE_AUDIOM_FRONTEND_URL
  };
}

/**
 * Resolved once at module load. `null` means the dev-server flow is in
 * effect; non-null means upload directly to the Audiom REST API.
 */
export const AUDIOM_DIRECT: AudiomDirectConfig | null = readAudiomDirectConfig();
