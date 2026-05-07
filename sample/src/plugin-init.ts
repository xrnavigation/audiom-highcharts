/**
 * One-time plugin bootstrap shared across all sample pages. Picks the
 * appropriate `SourceBackend` based on whether direct-Audiom env vars are
 * present and wires the display-mode toggle into the plugin options.
 */
import Highcharts from 'highcharts/highmaps';
import AudiomPlugin, {
  SourceBackend
} from 'audiom-highcharts';
import { setupDisplayModeToggle } from './mode-toggle';
import { AUDIOM_DIRECT } from './audiom-direct-config';

const SHARED_API_KEY = 'wO35blaGsjJREGuXehqWU';

// Where the Audiom embed is hosted. Switch to 'http://localhost:3000' when
// running Audiom locally — loopback ↔ loopback fetches are exempt from
// Chrome/Edge Private Network Access, so no tunnel is needed.
const AUDIOM_BASE_URL = 'https://audiom-staging.herokuapp.com';

let initialized = false;
let cachedDisplayMode: ReturnType<typeof setupDisplayModeToggle> | null = null;

/**
 * Initialise the plugin (idempotent) and render the page's mode toggle.
 * Returns the resolved display mode so callers don't pass it explicitly.
 */
export function setupSample(): {
  displayMode: ReturnType<typeof setupDisplayModeToggle>;
} {
  if (!initialized) {
    cachedDisplayMode = setupDisplayModeToggle();
    AudiomPlugin.init(Highcharts, {
      apiKey: SHARED_API_KEY,
      stepSize: '100km',
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
