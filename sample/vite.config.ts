import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { audiomHighchartsDev } from '@xrnavigation/audiom-highcharts/vite';

// ----------------------------------------------------------------------------
// Cross-origin GeoJSON for the Audiom iframe
// ----------------------------------------------------------------------------
// `audiomHighchartsDev()` runs a small middleware on the Vite dev server that
// hosts extracted GeoJSON for the Audiom embed iframe to fetch.
//
// When the Audiom embed runs at a public HTTPS origin (e.g.
// https://audiom-staging.herokuapp.com) and tries to fetch from your local
// dev server (http://localhost:5173), Chrome's *Private Network Access*
// policy blocks the request — even with correct CORS headers — because the
// fetch crosses from a public origin into the loopback address space.
//
// You have three options to make local dev work:
//
//   1. Run Audiom locally and point the plugin at it (loopback → loopback
//      is exempt from PNA). In your chart code:
//          AudiomPlugin.init(Highcharts, { ..., baseUrl: 'http://localhost:3000' });
//
//   2. Tunnel this dev server to a public HTTPS URL and pass it as
//      `publicBase` below. Examples:
//          npx localtunnel --port 5173        →  https://abc123.loca.lt
//          ngrok http 5173                    →  https://abc123.ngrok-free.app
//      Then uncomment the `publicBase` option below.
//
//   3. (Per-machine workaround) Disable Chromium's PNA enforcement at
//      chrome://flags/#local-network-access-check
// ----------------------------------------------------------------------------

export default defineConfig({
  // Use './' so all emitted asset URLs are RELATIVE to each HTML page.
  // Works under any deployment path (root, /audiom-highcharts/, file://)
  // without needing a per-environment VITE_BASE_PATH.
  base: './',
  plugins: [
    audiomHighchartsDev({
      // publicBase: 'https://your-tunnel.loca.lt',
    })
  ],
  server: {
    port: 5173,
    open: true,
    // The Audiom iframe runs at a different origin (audiom-staging.herokuapp
    // .com) and fetches our baked GeoJSON / rules JSON from /audiom-data/*.
    // Vite's static-asset middleware does not set CORS headers on its own,
    // so add a permissive policy here. Same headers nginx-sample.conf adds
    // for the production /docs build.
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': '*'
    }
  },
  build: {
    // Build directly into the repo's /docs folder so GitHub Pages can serve
    // it without a separate publish step.
    outDir: resolve(__dirname, '..', 'docs'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        europe: resolve(__dirname, 'europe.html'),
        world: resolve(__dirname, 'world.html')
      }
    }
  }
});
