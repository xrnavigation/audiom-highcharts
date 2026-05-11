# @xrnavigation/audiom-highcharts

Highcharts plugin that adds [Audiom](https://audiom.net) audio
accessibility to map charts. On chart `load` the plugin extracts the
chart's GeoJSON, hands it to a configurable storage backend, and mounts
an Audiom embed alongside the chart.

## Installation

```sh
npm install @xrnavigation/audiom-highcharts \
            @xrnavigation/audiom-embedder \
            @xrnavigation/audiom-api-client \
            highcharts
```

The `@xrnavigation/*` packages are published to **GitHub Packages**.
Add to your `.npmrc`:

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
  backend: SourceBackend.inline()   // pick one — see "Backends"
});

Highcharts.mapChart('chart-container', {
  chart: { map: 'custom/world' },
  title: { text: 'World population' },
  series: [{ type: 'map', data: [/* … */] }]
});
```

`AudiomPlugin.init()` is **idempotent** per Highcharts namespace —
calling it twice replaces global defaults but does not double-register
event hooks.

Per-chart overrides go on `chart.options.audiom`:

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
| `SourceBackend.devServer()` | Local dev with the bundled Vite plugin. |
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

### Vite dev plugin

For local development, the bundled Vite plugin gives the Audiom iframe
a real cross-origin URL to fetch GeoJSON from:

```ts
// vite.config.ts
import { audiomHighchartsDev } from '@xrnavigation/audiom-highcharts/vite';

export default {
  plugins: [audiomHighchartsDev()]   // mounts /__audiom__/upload + /__audiom__/<id>.geojson
};
```

Pair with `backend: SourceBackend.devServer()` on the page side.

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

## Requirements

- **Highcharts Maps** (`highcharts/highmaps`) — required for
  `series.type: 'map'`. Hosts using only standard `highcharts.js` have
  no extractable geometry; the plugin logs "no extractable geometry"
  and skips the chart.
- **Browsers** — ES2020 baseline. Last two majors of Chrome, Firefox,
  Safari, Edge. Requires `fetch`, `AbortController`, and
  `structuredClone`.

## Example

A working sample site (Europe GDP, world population) lives at
[xrnavigation/audiom-highcharts-sample](https://github.com/xrnavigation/audiom-highcharts-sample).

## License

UNLICENSED — proprietary. See [LICENSE](./LICENSE).
