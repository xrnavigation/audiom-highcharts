import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { audiomHighchartsDev } from '@xrnavigation/audiom-highcharts/vite';

// Vite plugin: handle CORS preflight (OPTIONS) for /audiom-data/* so the Audiom
// iframe (cross-origin) can fetch the baked GeoJSON / rules JSON. Vite's built-in
// static middleware answers GETs but returns 404 for OPTIONS, and `server.headers`
// isn't applied on the 404 path.
function audiomDataCors(): Plugin {
  const PREFIX = '/audiom-data/';
  const setHeaders = (res: {
    setHeader(k: string, v: string): void;
  }): void => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Max-Age', '86400');
  };
  return {
    name: 'audiom-highcharts:sample-audiom-data-cors',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0] ?? '';
        if (!url.startsWith(PREFIX)) return next();
        setHeaders(res);
        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }
        next();
      });
    }
  };
}

// ----------------------------------------------------------------------------
// HTTPS on the dev server (required by Audiom's rules loader)
// ----------------------------------------------------------------------------
// The Audiom embed rejects any `rules` URL that does not use HTTPS (server-side
// validation added in mid-2026). Rules URLs are baked from
// `window.location.href` on the sample page, so the dev server must serve HTTPS
// or Audiom refuses to load the map with:
//     "Rules URL must use HTTPS"
// (surfaced in the UI as "Failed to load data from http://localhost:.../...").
//
// `@vitejs/plugin-basic-ssl` generates a self-signed cert on first run. On the
// first visit Brave/Chrome shows a "Your connection is not private" page —
// click **Advanced → Proceed to localhost (unsafe)** once, and the cert
// exception applies to cross-origin fetches from the Audiom iframe as well.
//
// Alternatives if the self-signed cert is inconvenient:
//   1. Tunnel via ngrok/localtunnel for a real HTTPS URL and pass `publicBase`
//      to `audiomHighchartsDev({ publicBase: '...' })`.
//   2. Set VITE_AUDIOM_API_URL / VITE_AUDIOM_API_KEY to use the direct-to-Audiom
//      upload path — rules go through Audiom's own API and come back as HTTPS.
// ----------------------------------------------------------------------------

export default defineConfig({
  // Use './' so all emitted asset URLs are RELATIVE to each HTML page.
  // Works under any deployment path (root, /audiom-highcharts/, file://)
  // without needing a per-environment VITE_BASE_PATH.
  base: './',
  plugins: [
    basicSsl(),
    audiomHighchartsDev({
      // publicBase: 'https://your-tunnel.loca.lt',
    }),
    audiomDataCors()
  ],
  server: {
    port: 5173,
    open: true,
    https: {},
    // Baseline CORS headers for every response. The `audiomDataCors` plugin
    // above additionally handles OPTIONS preflight for /audiom-data/*.
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
