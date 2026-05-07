/**
 * Package-level string constants. Anything here is referenced from more
 * than one file (or is a stable contract with the embedder / dev uploader)
 * and benefits from having a single source of truth.
 *
 * Anything used in exactly one file should stay a `const` next to its
 * use site, not be moved here.
 */

/**
 * Prefix for every error message we throw. Identifies the source when an
 * error bubbles up through host code. Used via {@link pluginError}.
 */
export const ERROR_PREFIX = 'audiom-highcharts';

/**
 * Build an `Error` whose message is prefixed so host stack traces clearly
 * identify the plugin as the source. Prefer this over inline string
 * concatenation so the prefix never drifts.
 */
export function pluginError(message: string): Error {
  return new Error(`${ERROR_PREFIX}: ${message}`);
}

/**
 * MIME types the plugin emits/consumes. `GEO_JSON` is the IETF-registered
 * type for GeoJSON payloads (RFC 7946); plain `application/json` is used
 * for non-GeoJSON JSON bodies (e.g. uploaded rules files, REST envelope
 * responses).
 */
export const MIME = {
  GEO_JSON: 'application/geo+json',
  JSON: 'application/json',
  TEXT: 'text/plain'
} as const;

/**
 * `data:` URI prefix produced by `geojsonToDataUri()`. Exposed as a
 * constant so tests and the encoder share the same literal.
 */
export const GEO_JSON_DATA_URI_PREFIX = `data:${MIME.GEO_JSON};base64,`;
