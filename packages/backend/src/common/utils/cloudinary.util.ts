import sharp from 'sharp';
import { BadRequestException, Logger } from '@nestjs/common';

const logger = new Logger('CloudinaryUtil');

export interface UploadImageOpts {
  /** Max width in px (default 1920) */
  maxWidth?: number;
  /** Max height in px (default 1920) */
  maxHeight?: number;
  /** JPEG/WebP quality 1-100 (default 82) */
  quality?: number;
  /** Output format — default 'jpeg'. Use 'png' for transparency (logos, QR). */
  format?: 'jpeg' | 'png' | 'webp';
}

/**
 * Compress an image buffer with sharp, then upload to Cloudinary.
 * Returns the secure_url with f_auto,q_auto for optimized delivery.
 */
export async function uploadImageToCloudinary(
  input: Buffer | string, // Buffer or file path
  mimeType: string,
  cloudName: string,
  uploadPreset: string,
  opts: UploadImageOpts = {},
): Promise<string> {
  const {
    maxWidth  = 1920,
    maxHeight = 1920,
    quality   = 82,
    format    = 'jpeg',
  } = opts;

  const isVideo = mimeType.startsWith('video/');

  let dataUri: string;

  const buf = Buffer.isBuffer(input) ? input : await import('fs/promises').then(fs => fs.readFile(input as string));

  if (isVideo) {
    // Videos: no compression — pass through as-is
    dataUri = `data:${mimeType};base64,${buf.toString('base64')}`;
  } else {
    // Images: compress with sharp (no mozjpeg — not available on Alpine)
    try {
      let pipeline = sharp(buf).resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });

      if (format === 'jpeg') pipeline = pipeline.jpeg({ quality });
      else if (format === 'webp') pipeline = pipeline.webp({ quality });
      else pipeline = pipeline.png({ compressionLevel: 7 });

      const compressed = await pipeline.toBuffer();
      const outMime = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
      dataUri = `data:${outMime};base64,${compressed.toString('base64')}`;

      const savedPct = Math.round((1 - compressed.length / buf.length) * 100);
      logger.log(`Compressed image: ${buf.length >> 10}KB → ${compressed.length >> 10}KB (${savedPct}% saved)`);
    } catch (err) {
      // If sharp fails for any reason, fall back to uploading the original
      logger.warn(`sharp compression failed, uploading original: ${err.message}`);
      dataUri = `data:${mimeType};base64,${buf.toString('base64')}`;
    }
  }

  const formData = new FormData();
  formData.append('file', dataUri);
  formData.append('upload_preset', uploadPreset);

  const resourceType = isVideo ? 'video' : 'image';
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
  const response = await fetch(url, { method: 'POST', body: formData });

  if (!response.ok) {
    const text = await response.text();
    throw new BadRequestException(`Cloudinary upload failed: ${text}`);
  }

  const data: any = await response.json();
  const secureUrl: string = data.secure_url;

  // Inject f_auto,q_auto for WebP/AVIF auto delivery (~35-50% less bandwidth on TVs)
  return injectOptimization(secureUrl, isVideo);
}

function injectOptimization(url: string, isVideo: boolean): string {
  if (!url?.includes('res.cloudinary.com') || url.includes('f_auto')) return url;
  if (isVideo) return url; // video transformations need a paid plan
  return url.replace('/upload/', '/upload/f_auto,q_auto/');
}
