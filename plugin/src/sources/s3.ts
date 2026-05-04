/**
 * S3 (or any object-store) backend using the standard "presigned PUT"
 * pattern. The browser asks your backend for a signed PUT URL, uploads
 * directly to the object store, then hands Audiom a public GET URL
 * pointing at the same object.
 *
 * This pattern works identically for AWS S3, Cloudflare R2, Google Cloud
 * Storage, MinIO, DigitalOcean Spaces, Backblaze B2, etc. — anything
 * that speaks S3-style presigned URLs.
 *
 * CORS: configure your bucket so the Audiom embed origin can `GET`
 * (and your app origin can `PUT`).
 */
import type { FeatureCollection } from '../geo/types';
import type { SourceBackend, SourcePutContext, AudiomSourceValue } from './types';

export interface PresignedPut {
  /** PUT this URL with the JSON body. */
  uploadUrl: string;
  /** Audiom will GET this URL (often the same minus the signature). */
  publicUrl: string;
  /** Extra headers required by the signature (e.g. `x-amz-acl`). */
  headers?: Record<string, string>;
}

export interface S3PresignedBackendOptions {
  /**
   * Ask your backend for a presigned PUT URL. Typically POSTs to
   * `/api/audiom-sources/presign` and returns the JSON.
   */
  getPresignedPut: (ctx: SourcePutContext) => Promise<PresignedPut>;
  /** Override the `fetch` implementation. Defaults to `globalThis.fetch`. */
  fetchImpl?: typeof fetch;
}

export function s3PresignedBackend(
  options: S3PresignedBackendOptions
): SourceBackend {
  if (typeof options?.getPresignedPut !== 'function') {
    throw new Error(
      'audiom-highcharts: s3PresignedBackend requires a `getPresignedPut` callback.'
    );
  }
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;

  return {
    name: 's3-presigned',
    async put(
      collection: FeatureCollection,
      ctx: SourcePutContext
    ): Promise<AudiomSourceValue[]> {
      const { uploadUrl, publicUrl, headers } = await options.getPresignedPut(ctx);
      const body = JSON.stringify(collection);

      const res = await fetchImpl(uploadUrl, {
        method: 'PUT',
        body,
        headers: {
          'Content-Type': ctx.contentType,
          ...(headers ?? {})
        },
        signal: ctx.signal
      });
      if (!res.ok) {
        throw new Error(
          `audiom-highcharts: s3PresignedBackend PUT → ${res.status} ${res.statusText}`
        );
      }
      return [publicUrl];
    }
  };
}
