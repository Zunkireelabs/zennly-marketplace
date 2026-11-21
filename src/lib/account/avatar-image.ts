import "server-only";
import sharp from "sharp";

/**
 * Validates and re-encodes an uploaded avatar photo. Nothing here trusts the client: not the
 * declared Content-Type (bytes are sniffed), not the claimed size (checked before this module
 * ever sees the bytes — see the pre-decode cap in the route), and not the image's own metadata
 * (stripped, for privacy — see below).
 */

export const MAX_RAW_BYTES = 5 * 1024 * 1024;
const OUTPUT_SIZE = 512;
const WEBP_QUALITY = 82; // the knee: below ~75, banding shows in skin tones — exactly what a face is.

const MAGIC = {
  jpeg: [0xff, 0xd8, 0xff],
  png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
} as const;

function matchesMagic(bytes: Uint8Array, magic: readonly number[]): boolean {
  if (bytes.length < magic.length) return false;
  for (let i = 0; i < magic.length; i++) if (bytes[i] !== magic[i]) return false;
  return true;
}

/**
 * Sniffs the real format from the file's bytes — never the client-supplied Content-Type, which is
 * trivial to fake. Returns null for anything that isn't one of the three accepted formats.
 */
export function sniffImageFormat(bytes: Uint8Array): "jpeg" | "png" | "webp" | null {
  if (matchesMagic(bytes, MAGIC.jpeg)) return "jpeg";
  if (matchesMagic(bytes, MAGIC.png)) return "png";
  // WEBP: "RIFF" + 4-byte size + "WEBP", so the marker sits at offset 8, not the start.
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp";
  }
  return null;
}

export class AvatarImageError extends Error {
  constructor(public readonly code: "too_large" | "unsupported_format" | "animated" | "decode_failed", message: string) {
    super(message);
    this.name = "AvatarImageError";
  }
}

/**
 * The full pipeline, in order — the order is load-bearing, not cosmetic:
 *   1. Format sniffed from bytes (caller already did this to fail fast; re-checked here too).
 *   2. EXIF-aware rotation APPLIED before metadata is stripped. Reversed, every portrait phone
 *      photo would be stored sideways — sharp's bare `.rotate()` (no argument) reads the EXIF
 *      orientation tag and bakes it into the pixels, which must happen before the tag is gone.
 *   3. Centre-cropped to square (`fit: "cover"`) — the avatar renders circular everywhere.
 *   4. Resized to 512×512, never upscaling a smaller source (`withoutEnlargement`). 512 is ~3× what
 *      the largest current render size (56px, 3x retina) needs — cheap headroom for a larger
 *      profile header later, not a sizing mistake.
 *   5. Re-encoded to webp at quality 82 — the resize already does ~all the compression (a 12MB
 *      phone photo lands around 20-35KB at 512×512 regardless of the quality dial); 82 is just
 *      past the point where going lower starts showing banding in skin tones.
 *
 * Metadata stripping (sharp drops it by default — `.withMetadata()` is never called) is a PRIVACY
 * requirement here, not a size optimization: phone photos routinely embed GPS coordinates, and a
 * selfie taken at home would publish the customer's home location into this public-read bucket.
 * Treat removing it as mandatory, not something a "let's keep the metadata for accuracy" change
 * could reasonably undo later.
 */
export async function processAvatarImage(bytes: Buffer): Promise<Buffer> {
  if (bytes.length > MAX_RAW_BYTES) {
    throw new AvatarImageError("too_large", `Image is larger than ${MAX_RAW_BYTES} bytes.`);
  }
  const format = sniffImageFormat(bytes);
  if (!format) throw new AvatarImageError("unsupported_format", "Only JPEG, PNG, and WEBP images are accepted.");

  const image = sharp(bytes, { failOn: "truncated" });
  let metadata;
  try {
    metadata = await image.metadata();
  } catch {
    throw new AvatarImageError("decode_failed", "Couldn't read that image.");
  }
  // GIF isn't in MAGIC at all (never accepted as a format), but WEBP can itself be animated —
  // `pages` is populated for any multi-frame source regardless of the `animated` input option.
  if ((metadata.pages ?? 1) > 1) {
    throw new AvatarImageError("animated", "Animated images aren't supported — upload a still photo.");
  }

  return image
    .rotate()
    .resize(OUTPUT_SIZE, OUTPUT_SIZE, { fit: "cover", withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
}
