import typescript from '@rollup/plugin-typescript';
import nodeResolve from '@rollup/plugin-node-resolve';
import dts from 'rollup-plugin-dts';

const external = [
  'highcharts',
  '@xrnavigation/audiom-embedder',
  'topojson-client',
  'topojson-server',
  'topojson-simplify'
];

export default [
  {
    input: 'src/index.ts',
    external,
    output: [
      {
        file: 'dist/audiom-highcharts.mjs',
        format: 'es',
        sourcemap: true,
        exports: 'named'
      },
      {
        file: 'dist/audiom-highcharts.umd.cjs',
        format: 'umd',
        name: 'AudiomHighcharts',
        sourcemap: true,
        exports: 'named',
        globals: {
          highcharts: 'Highcharts',
          '@xrnavigation/audiom-embedder': 'AudiomEmbedder',
          'topojson-client': 'topojson',
          'topojson-server': 'topojsonServer',
          'topojson-simplify': 'topojsonSimplify'
        }
      }
    ],
    plugins: [
      nodeResolve(),
      typescript({ tsconfig: './tsconfig.json', declaration: false })
    ]
  },
  {
    input: 'src/index.ts',
    external,
    output: { file: 'dist/index.d.ts', format: 'es' },
    plugins: [dts()]
  },
  {
    // Vite dev plugin (Node-side). Built as a separate ESM bundle so it
    // can be imported from `audiom-highcharts/vite` without dragging the
    // browser runtime into the dev server's process.
    input: 'src/dev/vite-plugin.ts',
    external: ['node:crypto'],
    output: {
      file: 'dist/vite-plugin.mjs',
      format: 'es',
      sourcemap: true
    },
    plugins: [
      nodeResolve(),
      typescript({ tsconfig: './tsconfig.json', declaration: false })
    ]
  },
  {
    input: 'src/dev/vite-plugin.ts',
    external: ['node:crypto'],
    output: { file: 'dist/vite-plugin.d.ts', format: 'es' },
    plugins: [dts()]
  }
];
