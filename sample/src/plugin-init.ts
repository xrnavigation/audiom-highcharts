/**
 * One-time plugin bootstrap shared across all sample pages. Picks the
 * appropriate `SourceBackend` based on whether direct-Audiom env vars are
 * present and wires the display-mode toggle into the plugin options.
 */
import Highcharts from 'highcharts/highmaps';
import AccessibilityModule from 'highcharts/modules/accessibility';
import AudiomPlugin, {
  SourceBackend
} from '@xrnavigation/audiom-highcharts';
import { setupDisplayModeToggle } from './mode-toggle';
import { AUDIOM_DIRECT } from './audiom-direct-config';

// Sourced at build time from `VITE_AUDIOM_SHARED_API_KEY` (see
// `sample/.env.example`). The bundled demo key is intentionally public —
// rotate it on the Audiom side if abuse is detected — but it must be
// provided through env to avoid hard-coding tokens into source.
const SHARED_API_KEY =
  (import.meta.env as Record<string, string | undefined>)
    .VITE_AUDIOM_SHARED_API_KEY ?? '';

if (!SHARED_API_KEY) {
  // eslint-disable-next-line no-console
  console.warn(
    '[audiom-highcharts/sample] VITE_AUDIOM_SHARED_API_KEY is not set; ' +
      'the embed will fall back to anonymous access. Copy ' +
      'sample/.env.example to sample/.env.local and fill in the key.'
  );
}

// Where the Audiom embed is hosted. Switch to 'http://localhost:3000' when
// running Audiom locally — loopback ↔ loopback fetches are exempt from
// Chrome/Edge Private Network Access, so no tunnel is needed.
const AUDIOM_BASE_URL = 'https://audiom-staging.herokuapp.com';

let initialized = false;
let cachedDisplayMode: ReturnType<typeof setupDisplayModeToggle> | null = null;

// Register the Highcharts accessibility module once. This adds ARIA roles,
// keyboard navigation, and a screen-reader data table to every chart.
AccessibilityModule(Highcharts);

/**
 * Initialise the plugin (idempotent) and render the page's mode toggle.
 * Returns the resolved display mode so callers don't pass it explicitly.
 */
export function setupSample({ stepSize = '100km' }: { stepSize?: string } = {}): {
  displayMode: ReturnType<typeof setupDisplayModeToggle>;
} {
  if (!initialized) {
    cachedDisplayMode = setupDisplayModeToggle();
    AudiomPlugin.init(Highcharts, {
      apiKey: SHARED_API_KEY,
      stepSize,
      baseUrl: AUDIOM_BASE_URL,
      displayMode: cachedDisplayMode,
      // Backend selection:
      //   - VITE_AUDIOM_* env set → upload directly to Audiom's REST API
      //     (POST /datasources, returns /api/datasources/<id>.json).
      //   - otherwise            → dev server hosted by audiomHighchartsDev()
      //     in vite.config.ts. For production behind your own infra, swap
      //     for SourceBackend.rest({ endpoint: '/api/...' }) or
      //     SourceBackend.s3Presigned({ getPresignedPut: ... }).
      backend: AUDIOM_DIRECT
        ? SourceBackend.audiom({
            apiUrl: AUDIOM_DIRECT.apiUrl,
            apiKey: AUDIOM_DIRECT.apiKey,
            organizationId: AUDIOM_DIRECT.organizationId,
            frontendUrl: AUDIOM_DIRECT.frontendUrl
          })
        : SourceBackend.devServer()
    });
    initialized = true;
  }
  return { displayMode: cachedDisplayMode! };
}
