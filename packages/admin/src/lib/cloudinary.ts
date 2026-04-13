// ── Cloudinary config ─────────────────────────────────────────────────────────
// Change account by setting these env vars (requires rebuild)
const CLOUD  = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD  ?? 'dy4kekwzh';
const PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_PRESET ?? 'ml_default';

// ── Client-side compression (Canvas API — no extra deps) ──────────────────────
interface CompressOpts {
  maxWidth?:  number;  // px, default 1920
  maxHeight?: number;  // px, default 1920
  quality?:   number;  // 0-1 JPEG/WebP quality, default 0.82
  keepPng?:   boolean; // preserve PNG (for transparency), default false → convert to JPEG
}

async function compress(file: File, opts: CompressOpts = {}): Promise<Blob> {
  const {
    maxWidth  = 1920,
    maxHeight = 1920,
    quality   = 0.82,
    keepPng   = false,
  } = opts;

  const isPng = file.type === 'image/png';
  const outputType = (keepPng && isPng) ? 'image/png' : 'image/jpeg';

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { naturalWidth: w, naturalHeight: h } = img;

      // Scale down only — never upscale
      if (w > maxWidth || h > maxHeight) {
        const ratio = Math.min(maxWidth / w, maxHeight / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;

      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not available')); return; }

      // White background for JPEG (avoids black fill on transparent PNGs)
      if (outputType === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
      }
      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Compression failed'))),
        outputType,
        quality,
      );
    };

    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Image load failed')); };
    img.src = objectUrl;
  });
}

// ── Upload ────────────────────────────────────────────────────────────────────
export interface UploadOpts extends CompressOpts {
  /** Skip compression entirely (e.g. already-small SVGs) */
  skipCompress?: boolean;
}

/**
 * Compress (client-side) then upload to Cloudinary.
 * Returns the secure_url with f_auto,q_auto injected for optimized delivery.
 */
export async function uploadToCloudinary(file: File, opts: UploadOpts = {}): Promise<string> {
  const { skipCompress = false, ...compressOpts } = opts;

  let blob: Blob = file;
  if (!skipCompress) {
    blob = await compress(file, compressOpts);
  }

  const form = new FormData();
  form.append('file', blob, file.name);
  form.append('upload_preset', PRESET);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Cloudinary error ${res.status}: ${err?.error?.message ?? res.statusText}`);
  }

  const json = await res.json();
  if (!json.secure_url) throw new Error('No URL returned from Cloudinary');

  // Inject f_auto,q_auto so Cloudinary serves WebP/AVIF automatically → ~30-50% less bandwidth
  return optimizeUrl(json.secure_url);
}

/**
 * Inject f_auto,q_auto (and optional max width) into an existing Cloudinary URL.
 * Safe to call on non-Cloudinary URLs — returns unchanged.
 */
export function optimizeUrl(url: string, maxWidth?: number): string {
  if (!url?.includes('res.cloudinary.com')) return url;
  // Avoid double-injecting
  if (url.includes('f_auto')) return url;
  const transform = maxWidth ? `f_auto,q_auto,w_${maxWidth}` : 'f_auto,q_auto';
  return url.replace('/upload/', `/upload/${transform}/`);
}
