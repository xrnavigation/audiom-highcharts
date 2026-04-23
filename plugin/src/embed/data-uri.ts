import type { FeatureCollection } from '../geo/types';

/**
 * Encode an extracted GeoJSON FeatureCollection as a `data:` URI suitable for
 * passing to Audiom as a source URL. Uses base64 so the payload survives
 * being embedded in a query string without further escaping.
 *
 * Browsers expose `btoa` but it only handles Latin-1; we go through
 * `TextEncoder` so non-ASCII property values (e.g. accented place names)
 * round-trip correctly. A pure-Node fallback uses `Buffer` for the test
 * environment.
 */
export function geojsonToDataUri(collection: FeatureCollection): string {
  const json = JSON.stringify(collection);
  return `data:application/geo+json;base64,${base64EncodeUtf8(json)}`;
}

function base64EncodeUtf8(input: string): string {
  // Browser path: btoa(unescape(encodeURIComponent(...))) is the classic
  // pattern, but TextEncoder + chunked String.fromCharCode is cleaner.
  if (typeof btoa === 'function' && typeof TextEncoder !== 'undefined') {
    const bytes = new TextEncoder().encode(input);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(
        null,
        Array.from(bytes.subarray(i, i + chunk))
      );
    }
    return btoa(binary);
  }
  // Node path (vitest, SSR).
  const BufferRef = (globalThis as { Buffer?: { from(s: string, enc: string): { toString(enc: string): string } } }).Buffer;
  if (BufferRef) {
    return BufferRef.from(input, 'utf-8').toString('base64');
  }
  throw new Error('audiom-highcharts: no base64 encoder available in this environment.');
}
