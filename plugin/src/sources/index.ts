export type {
  SourcePutContext,
  AudiomSourceValue,
  BuiltinBackendName
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

import { inlineBackend } from './inline';
import { staticBackend } from './static';
import { restBackend } from './rest';
import { s3PresignedBackend } from './s3';
import { devServerBackend } from './dev-server';
import { memoryBackend } from './memory';

/**
 * Pluggable storage + serving for a chart's extracted GeoJSON.
 *
 * Identical shape to the internal interface; re-declared here so the
 * **type** and the **static factory namespace** below can share one name
 * (`SourceBackend`) via TypeScript declaration merging.
 */
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
  memory: memoryBackend
} as const;
