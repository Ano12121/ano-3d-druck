import fs from 'fs';
import path from 'path';
import { put } from '@vercel/blob';

export const IS_VERCEL = Boolean(process.env.VERCEL);

export function isBlobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/**
 * Persists an uploaded file (image or 3D model) cleanly across both local disk
 * and Vercel Serverless (using Vercel Blob when configured, or inline data URI
 * fallback for images on ephemeral Vercel instances).
 */
export async function persistUploadedFile(file, subfolder = '') {
  if (!file) return null;

  const cleanSub = subfolder ? `${subfolder.replace(/^\/+|\/+$/g, '')}/` : '';

  // 1. Permanent Cloud Storage via Vercel Blob (works anywhere when token is set)
  if (isBlobConfigured()) {
    const buffer = file.buffer || fs.readFileSync(file.path);
    const blobPath = `layerlab/${cleanSub}${file.filename || `${Date.now()}-${file.originalname}`}`;
    const blob = await put(blobPath, buffer, {
      access: 'public',
      contentType: file.mimetype || 'application/octet-stream',
    });
    return blob.url;
  }

  // 2. Ephemeral Vercel Serverless fallback (inline base64 for images so they render reliably)
  if (IS_VERCEL && file.mimetype?.startsWith('image/')) {
    const buffer = file.buffer || fs.readFileSync(file.path);
    if (buffer.length <= 3.5 * 1024 * 1024) {
      return `data:${file.mimetype};base64,${buffer.toString('base64')}`;
    }
  }

  // 3. Local PC / VPS persistent disk URL
  return `/uploads/${cleanSub}${file.filename}`;
}

export async function persistGeneratedBuffer({ buffer, filename, mimeType, subfolder = 'studio', localDir }) {
  const cleanSub = subfolder ? `${subfolder.replace(/^\/+|\/+$/g, '')}/` : '';

  if (isBlobConfigured()) {
    const blob = await put(`layerlab/${cleanSub}${filename}`, buffer, {
      access: 'public',
      contentType: mimeType || 'image/png',
    });
    return blob.url;
  }

  if (IS_VERCEL) {
    return `data:${mimeType || 'image/png'};base64,${buffer.toString('base64')}`;
  }

  const outPath = path.join(localDir, filename);
  fs.writeFileSync(outPath, buffer);
  return `/uploads/${cleanSub}${filename}`;
}
