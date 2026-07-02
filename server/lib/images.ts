import { s3Client, R2_BUCKET, GetObjectCommand } from "../s3";
import { notFound } from "./errors";

// The image-serving half of the image-visibility seam — see CONTEXT.md.
//
// One place that turns an R2 key into an HTTP image response. Callers decide
// *whether* the image may be served (visibility is a per-resource rule that
// stays in the route); this module owns *how*: streaming, headers, and the
// invariant that a missing or unreadable object renders as 404 through the
// error-handler seam. Keys must be DB-derived or prefix-scoped by the caller —
// never a raw client-supplied bucket path.

type StreamOptions = {
  /** Defaults to the long-lived public cache; pass "no-store" for drafts,
   *  "no-cache" for mutable-per-key images (avatars). */
  cacheControl?: string;
  /** Forces the Content-Type; defaults to what R2 reports, then image/jpeg. */
  contentType?: string;
};

// Accepts the s3Client's shape so tests can inject a stub without an R2 account.
type ObjectStore = Pick<typeof s3Client, "send">;

export async function streamR2Image(
  key: string,
  opts: StreamOptions = {},
  store: ObjectStore = s3Client,
): Promise<Response> {
  let response;
  try {
    response = await store.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }));
  } catch {
    throw notFound();
  }
  if (!response.Body) throw notFound();

  return new Response(response.Body.transformToWebStream(), {
    headers: {
      "Content-Type": opts.contentType || response.ContentType || "image/jpeg",
      "Cache-Control": opts.cacheControl || "public, max-age=31536000",
      ETag: `"${key}"`,
    },
  });
}
