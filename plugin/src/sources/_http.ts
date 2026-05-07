/**
 * Tiny shared HTTP helper for `restBackend` / `s3PresignedBackend`.
 *
 * - Resolves `globalThis.fetch` lazily and surfaces a clear error on
 *   environments (Node <18, certain SSR runtimes) where it's missing.
 * - Reads the response body on `!res.ok` so the caller's error message
 *   includes the server-side detail rather than only the status line.
 */

/** Resolve the `fetch` implementation to use, throwing a helpful error
 * when none is available and the caller didn't inject one. */
export function resolveFetch(
  fetchImpl: typeof fetch | undefined,
  caller: string
): typeof fetch {
  const f = fetchImpl ?? (globalThis as { fetch?: typeof fetch }).fetch;
  if (typeof f !== 'function') {
    throw new Error(
      `audiom-highcharts: ${caller} requires \`fetch\`; pass \`fetchImpl\` ` +
        'or run on Node 18+ / a browser.'
    );
  }
  return f;
}

/** Build a single-line error message for a failed HTTP response, including
 * up to ~512 chars of the response body when available. */
export async function httpError(
  caller: string,
  method: string,
  url: string,
  res: Response
): Promise<Error> {
  let detail = '';
  try {
    const text = await res.text();
    if (text) detail = ` — ${text.length > 512 ? text.slice(0, 512) + '…' : text}`;
  } catch {
    // Body already consumed or unreadable; fall back to the status line.
  }
  return new Error(
    `audiom-highcharts: ${caller} ${method} ${url} → ${res.status} ${res.statusText}${detail}`
  );
}
