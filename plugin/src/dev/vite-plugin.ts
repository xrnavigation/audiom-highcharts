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
 * Pair with `registerDevSourceUploader({ endpoint })` on the page side.
 *
 * Production: do not ship this. The matching browser helper is a no-op
 * outside dev; if it's never registered the plugin's source-resolution
 * logic falls through to upload/inline as configured.
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

  // In-memory store. Keys are UUIDs; values are raw JSON bodies as Buffers
  // so we don't reparse on each GET. Cleared on dev-server restart.
  const store = new Map<string, Buffer>();

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
    }
  };

  function makeHandler(): Connect.NextHandleFunction {
    const uploadPath = `${prefix}/upload`;
    const getPattern = new RegExp(
      `^${escapeRegex(prefix)}/([0-9a-fA-F-]+)\\.geojson(?:\\?.*)?$`
    );

    return (req, res, next) => {
      const url = (req.url ?? '').split('?')[0] ?? '';

      // Preflight for either route.
      if (req.method === 'OPTIONS' && url.startsWith(`${prefix}/`)) {
        writeCors(res, allowOrigin);
        res.statusCode = 204;
        res.end();
        return;
      }

      if (req.method === 'POST' && url === uploadPath) {
        readBody(req, maxBodyBytes)
          .then((body) => {
            const id = randomUUID();
            store.set(id, body);
            const responseUrl = `${prefix}/${id}.geojson`;
            writeCors(res, allowOrigin);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ url: responseUrl, id }));
          })
          .catch((err: Error) => {
            writeCors(res, allowOrigin);
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
          const body = store.get(id);
          if (!body) {
            writeCors(res, allowOrigin);
            res.statusCode = 404;
            res.setHeader('Content-Type', 'text/plain');
            res.end('audiom-highcharts dev uploader: not found');
            return;
          }
          writeCors(res, allowOrigin);
          res.setHeader('Content-Type', 'application/geo+json');
          res.setHeader('Cache-Control', 'no-store');
          if (req.method === 'HEAD') {
            res.end();
            return;
          }
          res.end(body);
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

function writeCors(res: { setHeader(k: string, v: string): void }, origin: string): void {
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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
