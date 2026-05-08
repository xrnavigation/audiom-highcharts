# @xrnavigation/audiom-highcharts

Highcharts plugin that adds **Audiom** audio-accessibility to map charts.
On every chart `load` the plugin extracts the chart's GeoJSON, hands it
to a configurable storage backend, and mounts an Audiom embed alongside
the chart in tabbed, side-by-side, or "open in new tab" mode.

> Status: alpha. Public API is stable enough for evaluation; expect minor
> refinements before 1.0.

## Installation

```sh
npm install @xrnavigation/audiom-highcharts \
            @xrnavigation/audiom-embedder \
            @xrnavigation/audiom-api-client \
            highcharts
```

The `audiom-*` packages live on **GitHub Packages**. Add to `.npmrc`:

```
@xrnavigation:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

## Quick start

```ts
import * as Highcharts from 'highcharts/highmaps';
import AudiomPlugin, { SourceBackend } from '@xrnavigation/audiom-highcharts';

AudiomPlugin.init(Highcharts, {
  apiKey: import.meta.env.VITE_AUDIOM_API_KEY,
  // Pick ONE backend — see "Backends" below.
  backend: SourceBackend.inline()
});

Highcharts.mapChart('chart-container', {
  chart: { map: 'custom/world' },
  title: { text: 'World population' },
  series: [{ type: 'map', data: [/* … */] }]
});
```

`AudiomPlugin.init()` is **idempotent** per Highcharts namespace —
calling it twice replaces global defaults but does not double-register
event hooks. Per-chart overrides go on `chart.options.audiom`:

```ts
Highcharts.mapChart('c', {
  audiom: {
    displayMode: AudiomDisplayMode.SideBySide,
    audiomTabLabel: 'Audio map',
    showOpenInTabButton: true
  },
  // …
});
```

## Backends

| Backend | Use case |
|---|---|
| `SourceBackend.inline()` | Tiny demos. Encodes GeoJSON as a `data:` URI. ~32 KB cap. |
| `SourceBackend.static([…])` | Pre-baked URLs you host yourself. |
| `SourceBackend.devServer()` | Local dev with the bundled Vite plugin (see below). |
| `SourceBackend.rest({ endpoint })` | POST GeoJSON to your own endpoint, get back `{ url }`. |
| `SourceBackend.s3Presigned({ getPresignedPut })` | Direct browser → S3 PUT. |
| `SourceBackend.audiom({ apiKey })` | Direct upload to Audiom (`POST /datasources`). |
| `SourceBackend.memory()` | Tests / off-DOM rendering. |

Custom backends implement the `SourceBackend` interface:

```ts
const myBackend: SourceBackend = {
  name: 'r2',
  async put(collection, ctx) { /* return [{ source: url, type: 'geojson' }] */ }
};
```

## Vite dev plugin

For local development the bundled Vite plugin gives Audiom a real
cross-origin URL to fetch GeoJSON from:

```ts
// vite.config.ts
import { audiomHighchartsDev } from '@xrnavigation/audiom-highcharts/vite';

export default {
  plugins: [audiomHighchartsDev()]   // mounts /__audiom__/upload + /__audiom__/<id>.geojson
};
```

Pair with `backend: SourceBackend.devServer()` on the page side. If
Chrome's Private Network Access blocks the iframe from fetching
`localhost`, set `publicBase` to a tunnel URL (ngrok, localtunnel).

## Sample site

The `sample/` directory contains three demo pages (index, Europe GDP,
world population). They are built as a static site into `docs/`, which
is what GitHub Pages serves.

### Run the dev server

```sh
npm run dev:sample
```

Opens `http://localhost:5173`. The Vite dev server serves the pre-baked
`sample/public/audiom-data/*.geojson` and `*.rules.json` files with
permissive CORS headers, so the Audiom iframe can fetch them directly
without a runtime upload.

> **Chrome Private Network Access** — if the Audiom iframe (served from
> `https://audiom-staging.herokuapp.com`) can't reach `localhost:5173`,
> either disable the Chrome flag at
> `chrome://flags/#local-network-access-check`, or supply a tunnel URL
> via the `publicBase` option in `sample/vite.config.ts`.

### Build a static site

A single command does everything:

```sh
npm run build:sample
```

This runs three steps in order:

1. **`prebuild:sample`** — fetches the Highcharts TopoJSON topologies
   from the CDN, merges in the chart data values, and writes four static
   files to `sample/public/audiom-data/`:
   - `europe-gdp.geojson` / `gdp.rules.json`
   - `world-population.geojson` / `population.rules.json`
2. **`build:plugin`** — compiles the plugin so the sample workspace
   picks up any local changes.
3. **`build --workspace sample`** — runs `vite build`, which copies
   everything from `sample/public/` (including `audiom-data/`) into
   `docs/` alongside the bundled JS/HTML.

The output in `docs/` is a fully self-contained static site. The Audiom
iframe fetches the GeoJSON and rules files directly from there — no
server-side upload endpoint required.

### Preview the build locally

```sh
docker compose -f pages-compose.yaml up sample
```

Starts an nginx container at `http://localhost:4001` serving `docs/`
with `Access-Control-Allow-Origin: *`, matching the cross-origin fetch
the Audiom iframe performs in production. The Jekyll service (port 4000)
can also be used to verify GitHub Pages' build pipeline.

### Deploy to GitHub Pages

If the site is served under a sub-path (e.g.
`https://example.github.io/repo-name/`), set the environment variable
before building:

```sh
VITE_BASE_PATH=/repo-name/ npm run build:sample
```

## Display modes

- `AudiomDisplayMode.Tabbed` *(default)* — Highcharts on tab 1, Audiom on tab 2.
- `AudiomDisplayMode.SideBySide` — both visible in a flex row.
- `AudiomDisplayMode.Button` — no iframe; renders an "Open in Audiom"
  link beside the chart. Useful when iframe embedding is disallowed.

## Iframe security

The plugin sets defaults that work for the public Audiom origin:

```
allow="autoplay; fullscreen; clipboard-write; microphone"
sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
```

Override per-chart or globally via `iframe: { allow: '…', sandbox: '…' }`.
**`allow-same-origin` is only safe when the embed is served from a
different origin than the host page** — narrow the sandbox if you
self-host Audiom on the same origin as your charts.

## Security note on `apiKey`

`apiKey` is sent in the embed URL. **Use a public, rate-limited Audiom
key in the browser**; never ship a write-scoped key to a public page.
For production with private GeoJSON, run uploads through your own
backend (`restBackend` / `s3PresignedBackend`) and keep secrets
server-side.

## Browser support

ES2020 baseline. Tested against the last two major versions of Chrome,
Firefox, Safari, and Edge. Requires `fetch`, `AbortController`, and
`structuredClone` for the choropleth extractor's deep copies.

## Highcharts requirement

You need **Highcharts Maps** (`highcharts/highmaps`) for `series.type:
'map'`. Hosts using only standard `highcharts.js` won't have anything
to extract — the plugin will log "no extractable geometry" and skip the
chart.

## API surface

The following are exported from the package root:

- `init`, `isMapChart`, `isAudiomEnabled`, `resolveOptions`
- `SourceBackend` (interface + factory namespace)
- `mountLayout`, `createPreviewButton`, `mountPreviewButtonAfter`
- `createAudiomIframe`, `updateIframeUrl`,
  `DEFAULT_IFRAME_ALLOW`, `DEFAULT_IFRAME_SANDBOX`
- `buildEmbedUrl`, `geojsonToDataUri`, `simplifyFeatureCollection`
- `extractGeoJSON`, `registerExtractor`, `unregisterExtractor`,
  `getExtractor`, `hasExtractor`, `registeredSeriesTypes`
- `firstSourceUrl`, `createSourceLinks`, `mountSourceLinksAfter`
- `uploadAudiomRules`
- `defaultLogger`, `silentLogger`, `resolveLogger`
- `AudiomDisplayMode`, `FilterMode`, `VisualStyle`
- Re-exports from `@xrnavigation/audiom-api-client`:
  `AudiomClient`, `RulesetVisibility`, `MapVisibility`, `AugmenterPosition`

See [`CHANGELOG.md`](./CHANGELOG.md) for release notes.

## License

UNLICENSED — proprietary. See [LICENSE](./LICENSE).
