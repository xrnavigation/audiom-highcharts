/**
 * Optional direct-to-Audiom REST configuration, sourced from Vite env
 * vars at build time. When all three required fields are present, the
 * sample uploads its extracted GeoJSON and rules straight to Audiom's
 * REST API (via `SourceBackend.audiom()` and `uploadAudiomRules()`)
 * instead of the in-process dev server.
 *
 * Set in `sample/.env.local`:
 *   VITE_AUDIOM_API_URL=https://api.audiom.app
 *   VITE_AUDIOM_API_KEY=...
 *   VITE_AUDIOM_ORG_ID=42
 *   VITE_AUDIOM_FRONTEND_URL=https://app.audiom.app   (optional)
 */
export interface AudiomDirectConfig {
  apiUrl: string;
  apiKey: string;
  organizationId: number;
  frontendUrl?: string;
}

function readAudiomDirectConfig(): AudiomDirectConfig | null {
  const env = import.meta.env as Record<string, string | undefined>;
  const apiUrl = env.VITE_AUDIOM_API_URL;
  const apiKey = env.VITE_AUDIOM_API_KEY;
  const orgRaw = env.VITE_AUDIOM_ORG_ID;
  const orgId = orgRaw ? Number(orgRaw) : NaN;
  if (!apiUrl || !apiKey || !Number.isFinite(orgId)) return null;
  return {
    apiUrl,
    apiKey,
    organizationId: orgId,
    frontendUrl: env.VITE_AUDIOM_FRONTEND_URL
  };
}

/**
 * Resolved once at module load. `null` means the dev-server flow is in
 * effect; non-null means upload directly to the Audiom REST API.
 */
export const AUDIOM_DIRECT: AudiomDirectConfig | null = readAudiomDirectConfig();
