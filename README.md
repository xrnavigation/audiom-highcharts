# Audiom-Highcharts

Monorepo for **[`@xrnavigation/audiom-highcharts`](./plugin)** — a
Highcharts plugin that adds [Audiom](https://audiom.net) audio
accessibility to map charts — and the sample site that demos it.

## Repository layout

| Path | Contents |
|---|---|
| [`plugin/`](./plugin) | The published npm package. Plugin source, tests, and docs. |
| [`sample/`](./sample) | Vite-built demo site (index, Europe GDP, world population). |
| [`docs/`](./docs) | Built static sample site, served by GitHub Pages. |
| [`scripts/`](./scripts) | Prebuild helpers (Highcharts TopoJSON → GeoJSON). |

## Using the plugin

See **[`plugin/README.md`](./plugin/README.md)** for installation,
backends, display modes, and the full API. A standalone consumer
example lives at
[xrnavigation/audiom-highcharts-sample](https://github.com/xrnavigation/audiom-highcharts-sample).

## Development

```sh
npm install
npm run dev:sample        # http://localhost:5173
npm run test:plugin       # vitest
npm run build:plugin      # rollup → plugin/dist
```

The dev server serves the pre-baked
`sample/public/audiom-data/*.geojson` and `*.rules.json` files with
permissive CORS, so the Audiom iframe can fetch them directly without a
runtime upload.

> **Chrome Private Network Access** — if the Audiom iframe (served
> from `https://audiom-staging.herokuapp.com`) cannot reach
> `localhost:5173`, either disable the flag at
> `chrome://flags/#local-network-access-check`, or supply a tunnel URL
> (ngrok, localtunnel) via the `publicBase` option in
> `sample/vite.config.ts`.

---

## Deployment (GitHub Pages)

The sample site in [`docs/`](./docs) is what GitHub Pages serves.

### Build the static site

```sh
npm run build:sample
```

This runs three steps:

1. **`prebuild:sample`** — fetches Highcharts TopoJSON topologies from
   the CDN, merges in the chart data values, and writes:
   - `europe-gdp.geojson` / `gdp.rules.json`
   - `world-population.geojson` / `population.rules.json`

   into `sample/public/audiom-data/`.
2. **`build:plugin`** — compiles the plugin so the sample picks up
   local changes.
3. **`vite build` (sample workspace)** — copies
   `sample/public/` (including `audiom-data/`) into `docs/` alongside
   the bundled JS/HTML.

The resulting `docs/` directory is a fully self-contained static site.
The Audiom iframe fetches GeoJSON and rules files directly from there
— no server-side upload endpoint required.

### Sub-path deploys

If serving under a sub-path (e.g.
`https://example.github.io/repo-name/`), set the base path before
building:

```sh
VITE_BASE_PATH=/repo-name/ npm run build:sample
```

### Preview the build locally

```sh
docker compose -f pages-compose.yaml up sample
```

Starts an nginx container at `http://localhost:4001` serving `docs/`
with `Access-Control-Allow-Origin: *`, matching the cross-origin fetch
the Audiom iframe performs in production. The Jekyll service (port
4000) can be used to verify GitHub Pages' build pipeline.

## License

UNLICENSED — proprietary. See [LICENSE](./LICENSE).
