/**
 * Public surface for the source-backend system.
 *
 * Exports both the **`SourceBackend` interface** (for typing custom
 * backends) and the **`SourceBackend` factory namespace** (for the
 * built-ins) using TypeScript declaration merging.
 */
export type {
  SourcePutContext,
  AudiomSourceValue
} from './types';
import type { SourceBackend as ISourceBackend } from './types';
export { type InlineBackendOptions } from './inline';
export { type RestBackendOptions } from './rest';
export {
  type S3PresignedBackendOptions,
  type PresignedPut
} from './s3';
export { type DevServerBackendOptions } from './dev-server';
export { type MemoryBackendHandle } from './memory';
export { type AudiomBackendOptions } from './audiom';

import { inlineBackend } from './inline';
import { staticBackend } from './static';
import { restBackend } from './rest';
import { s3PresignedBackend } from './s3';
import { devServerBackend } from './dev-server';
import { memoryBackend } from './memory';
import { audiomBackend } from './audiom';

/**
 * Pluggable storage + serving for a chart's extracted GeoJSON.
 *
 * Re-declared here (extending the internal interface verbatim) so the
 * **type** and the static factory **namespace** below can share one
 * name (`SourceBackend`) via TypeScript declaration merging.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface SourceBackend extends ISourceBackend {}

/**
 * Static factory namespace for the built-in backends.
 *
 * ```ts
 * import { SourceBackend } from 'audiom-highcharts';
 *
 * AudiomPlugin.init(Highcharts, {
 *   apiKey: '…',
 *   backend: SourceBackend.devServer(),
 *   // backend: SourceBackend.rest({ endpoint: '/api/upload' })
 *   // backend: SourceBackend.inline()
 * });
 *
 * // Custom backend — implement the interface directly:
 * const my: SourceBackend = {
 *   name: 'r2',
 *   async put(collection, ctx) { … }
 * };
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const SourceBackend = {
  inline: inlineBackend,
  static: staticBackend,
  rest: restBackend,
  s3Presigned: s3PresignedBackend,
  devServer: devServerBackend,
  memory: memoryBackend,
  audiom: audiomBackend
} as const;

/**
 * Names of the built-in backends. Custom user backends may use any string.
 *
 * The compile-time assertion below ties this union to the factory
 * namespace keys so adding (or removing) a built-in here without
 * updating `SourceBackend` (or vice versa) becomes a type error.
 */
export type BuiltinBackendName =
  | 'inline'
  | 'static'
  | 'rest'
  | 's3-presigned'
  | 'dev-server'
  | 'memory'
  | 'audiom';

// Map kebab-case `name` strings to the camelCase factory keys so the two
// can never drift silently. Renaming a built-in requires updating both.
type FactoryKeyForName<N extends BuiltinBackendName> = N extends 's3-presigned'
  ? 's3Presigned'
  : N extends 'dev-server'
    ? 'devServer'
    : N;
type _AssertBackendNames =
  Exclude<BuiltinBackendName, FactoryKeyForName<BuiltinBackendName> extends keyof typeof SourceBackend ? BuiltinBackendName : never> extends never
    ? true
    : ['BuiltinBackendName / SourceBackend factory keys are out of sync'];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _assertBackendNames: _AssertBackendNames = true;
