import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { audiomHighchartsDev } from 'audiom-highcharts/vite';

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
  plugins: [
    audiomHighchartsDev({
      // publicBase: 'https://your-tunnel.loca.lt',
    })
  ],
  server: {
    port: 5173,
    open: true
  },
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        europe: resolve(__dirname, 'europe.html'),
        world: resolve(__dirname, 'world.html')
      }
    }
  }
});
