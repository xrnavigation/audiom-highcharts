/**
 * Vite dev-server plugin that gives audiom-highcharts a real HTTP endpoint
 * for serving extracted GeoJSON to a cross-origin Audiom iframe.
 *
 * The plugin attaches two middleware routes to Vite's dev server:
 *
 *   POST  <prefix>/upload          → accepts a JSON body, returns `{ url }`
 *   GET   <prefix>/<id>.geojson    → returns the cached body with CORS
 *
 * Because this is real Connect middleware running inside Vite, requests
 * from a different origin (e.g. a locally-running Audiom at
 * `http://localhost:3000`) get a normal HTTP response with the
 * `Access-Control-Allow-Origin` header — something a service worker on
 * the host origin cannot do for a request initiated by a foreign window.
 *
 * Pair with `backend: devServerBackend()` on the page side.
 *
 * Production: do not ship this. Use `restBackend({ endpoint })` or
 * `s3PresignedBackend({ getPresignedPut })` against your own infrastructure.
 */
import type { Plugin, ViteDevServer, Connect } from 'vite';
import { randomUUID } from 'node:crypto';

export interface AudiomHighchartsDevOptions {
  /**
   * URL prefix the middleware listens on. Trailing slash is optional.
   * @default '/__audiom__'
   */
  prefix?: string;
  /**
   * Maximum POST body size in bytes. Defaults to 16 MiB which fits the
   * largest realistic Highcharts world dataset by an order of magnitude.
   * @default 16_777_216
   */
  maxBodyBytes?: number;
  /**
   * Value for the `Access-Control-Allow-Origin` header on GET responses.
   * Use the Audiom origin in lockdown setups; `*` is fine for local dev.
   * @default '*'
   */
  allowOrigin?: string;
  /**
   * Public base URL to use in returned GeoJSON URLs instead of
   * `http://localhost:<port>`. Set this to an ngrok / localtunnel URL when
   * Chrome's Private Network Access policy blocks the Audiom embed from
   * fetching GeoJSON from localhost.
   *
   * Example using localtunnel (after `npx localtunnel --port 5173`):
   *   publicBase: 'https://abc123.loca.lt'
   *
   * Example using ngrok (after `ngrok http 5173`):
   *   publicBase: 'https://abc123.ngrok-free.app'
   *
   * If omitted, the plugin falls back to the local Vite server URL and adds
   * the `Access-Control-Allow-Private-Network: true` header required for
   * Chrome's PNA preflight. This works in most configurations once the dev
   * server is (re)started; if Chrome still blocks it, supply publicBase.
   */
  publicBase?: string;
}

const DEFAULTS = {
  prefix: '/__audiom__',
  maxBodyBytes: 16 * 1024 * 1024,
  allowOrigin: '*'
} as const;

export function audiomHighchartsDev(
  options: AudiomHighchartsDevOptions = {}
): Plugin {
  const prefix = trimSlash(options.prefix ?? DEFAULTS.prefix);
  const maxBodyBytes = options.maxBodyBytes ?? DEFAULTS.maxBodyBytes;
  const allowOrigin = options.allowOrigin ?? DEFAULTS.allowOrigin;
  const publicBase = options.publicBase ? trimSlash(options.publicBase) : null;

  // In-memory store. Keys are UUIDs; values are raw JSON bodies as Buffers
  // so we don't reparse on each GET. Cleared on dev-server restart.
  // The ext determines both the URL suffix and the served Content-Type:
  // 'geojson' → application/geo+json (default), 'json' → application/json.
  type Stored = { body: Buffer; ext: 'geojson' | 'json' };
  const store = new Map<string, Stored>();

  return {
    name: 'audiom-highcharts:dev-source-server',
    apply: 'serve',
    configureServer(server: ViteDevServer) {
      // Install BEFORE Vite's internal middlewares so we win the route.
      // Vite's spaFallback / transform middlewares will otherwise claim
      // any path they don't recognise (returning index.html for GET, 404
      // for POST). Mounting in a pre-hook by inserting at the front of
      // the stack works around that.
      const handler = makeHandler();
      server.middlewares.stack.unshift({
        route: '',
        handle: handler as unknown as Connect.HandleFunction
      });

      server.httpServer?.once('listening', () => {
        const addr = server.httpServer?.address();
        const port = addr && typeof addr === 'object' ? addr.port : 5173;
        const base = publicBase ?? `http://localhost:${port}`;
        const pnaNote = publicBase
          ? `public base: ${publicBase}`
          : 'using localhost (PNA headers enabled — restart dev server if Audiom blocks GeoJSON fetches)';
        // eslint-disable-next-line no-console
        console.info(`[audiom-highcharts] dev source server ready: ${base}${prefix}/upload (${pnaNote})`);
      });
    }
  };

  function makeHandler(): Connect.NextHandleFunction {
    const uploadPath = `${prefix}/upload`;
    const getPattern = new RegExp(
      `^${escapeRegex(prefix)}/([0-9a-fA-F-]+)\\.(geojson|json)(?:\\?.*)?$`
    );

    return (req, res, next) => {
      const url = (req.url ?? '').split('?')[0] ?? '';

      // Preflight for either route.
      if (req.method === 'OPTIONS' && url.startsWith(`${prefix}/`)) {
        writeCors(req, res, allowOrigin);
        res.statusCode = 204;
        res.end();
        return;
      }

      if (req.method === 'POST' && url === uploadPath) {
        // Optional ?ext=json|geojson lets callers upload non-GeoJSON JSON
        // (e.g. Audiom rules files) and have it served back with the
        // matching Content-Type. Defaults to 'geojson' for back-compat.
        const extQuery = parseExtQuery(req.url ?? '');
        const ext: 'geojson' | 'json' = extQuery === 'json' ? 'json' : 'geojson';
        readBody(req, maxBodyBytes)
          .then((body) => {
            const id = randomUUID();
            store.set(id, { body, ext });
            // If a publicBase is configured (e.g. ngrok/localtunnel), use it
            // so the Audiom embed (running at a public HTTPS origin) can fetch
            // the GeoJSON without hitting Chrome's Private Network Access
            // policy. When publicBase is absent we fall back to a relative
            // path and let the caller's fetch resolve it against the page
            // origin (localhost); PNA headers on GET responses handle the
            // cross-origin case in most Chrome versions.
            const baseForUrl = publicBase ?? '';
            const responseUrl = `${baseForUrl}${prefix}/${id}.${ext}`;
            writeCors(req, res, allowOrigin);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ url: responseUrl, id, ext }));
          })
          .catch((err: Error) => {
            writeCors(req, res, allowOrigin);
            res.statusCode = err.message === 'too-large' ? 413 : 400;
            res.setHeader('Content-Type', 'text/plain');
            res.end(`audiom-highcharts dev uploader: ${err.message}`);
          });
        return;
      }

      if (req.method === 'GET' || req.method === 'HEAD') {
        const match = getPattern.exec(url);
        if (match) {
          const id = match[1] as string;
          const requestedExt = match[2] as 'geojson' | 'json';
          const entry = store.get(id);
          if (!entry || entry.ext !== requestedExt) {
            writeCors(req, res, allowOrigin);
            res.statusCode = 404;
            res.setHeader('Content-Type', 'text/plain');
            res.end('audiom-highcharts dev uploader: not found');
            return;
          }
          writeCors(req, res, allowOrigin);
          res.setHeader(
            'Content-Type',
            entry.ext === 'json' ? 'application/json' : 'application/geo+json'
          );
          res.setHeader('Cache-Control', 'no-store');
          if (req.method === 'HEAD') {
            res.end();
            return;
          }
          res.end(entry.body);
          return;
        }
      }

      next();
    };
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseExtQuery(rawUrl: string): string | null {
  const q = rawUrl.split('?')[1];
  if (!q) return null;
  const params = new URLSearchParams(q);
  return params.get('ext');
}

/**
 * Write CORS headers, including Chrome's Private Network Access (PNA) header
 * needed when a public origin (e.g. https://audiom-staging.herokuapp.com)
 * fetches a loopback address (http://localhost:5173). Without
 * `Access-Control-Allow-Private-Network: true` on the preflight, Chrome
 * blocks the request with "Permission was denied for this request to access
 * the `loopback` address space."
 *
 * Echo the request's `Origin` (when allowOrigin === '*') so credentialed
 * fetches still pass; PNA preflights additionally require an explicit origin.
 */
function writeCors(
  req: { headers: Record<string, string | string[] | undefined> },
  res: { setHeader(k: string, v: string): void },
  allowOrigin: string
): void {
  const reqOrigin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
  const originValue = allowOrigin === '*' && reqOrigin ? reqOrigin : allowOrigin;
  res.setHeader('Access-Control-Allow-Origin', originValue);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  // Chrome Private Network Access — required for public→loopback fetches.
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
}

function trimSlash(p: string): string {
  return p.replace(/\/+$/, '');
}

function readBody(
  req: { on(event: string, cb: (chunk: unknown) => void): unknown },
  max: number
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    req.on('data', (chunk: unknown) => {
      const buf = chunk as Buffer;
      total += buf.length;
      if (total > max) {
        reject(new Error('too-large'));
        return;
      }
      chunks.push(buf);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', (err: unknown) => reject(err as Error));
  });
}

export default audiomHighchartsDev;
