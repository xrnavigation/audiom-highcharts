/**
 * Memory backend — keeps FeatureCollections in an in-process Map and
 * serves them via `blob:` URLs.
 *
 * Limitations:
 *   - `blob:` URLs are scoped to the document that created them. Any
 *     iframe on a different origin (the standard Audiom embed case)
 *     CANNOT fetch them. This backend therefore only makes sense when
 *     Audiom is rendered same-origin, e.g. via {@link AudiomComponent}.
 *   - Memory grows until {@link MemoryBackendHandle.clear} is called.
 *
 * Bring this in for Storybook stories, Vitest browser-mode tests, or
 * any same-origin embed surface.
 */
import type { FeatureCollection } from '../geo/types';
import type { SourceBackend, AudiomSourceValue } from './types';

export interface MemoryBackendHandle extends SourceBackend {
  /** Number of objects currently held. */
  readonly size: number;
  /** Revoke all blob URLs and drop references. */
  clear(): void;
}

export function memoryBackend(): MemoryBackendHandle {
  const urls: string[] = [];
  const handle: MemoryBackendHandle = {
    name: 'memory',
    get size() { return urls.length; },
    async put(collection: FeatureCollection): Promise<AudiomSourceValue[]> {
      if (typeof URL === 'undefined' || typeof Blob === 'undefined') {
        throw new Error(
          'audiom-highcharts: memoryBackend requires Blob + URL APIs (browser only).'
        );
      }
      const blob = new Blob([JSON.stringify(collection)], {
        type: 'application/geo+json'
      });
      const url = URL.createObjectURL(blob);
      urls.push(url);
      return [url];
    },
    clear() {
      while (urls.length) {
        const u = urls.pop()!;
        try { URL.revokeObjectURL(u); } catch { /* ignore */ }
      }
    }
  };
  return handle;
}
