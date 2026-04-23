import typescript from '@rollup/plugin-typescript';
import nodeResolve from '@rollup/plugin-node-resolve';
import dts from 'rollup-plugin-dts';

const external = ['highcharts', '@xrnavigation/audiom-embedder', 'topojson-client'];

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
          'topojson-client': 'topojson'
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
  }
];
