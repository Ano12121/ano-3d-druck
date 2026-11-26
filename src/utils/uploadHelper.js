import { getAdminToken } from '../api';

/**
 * Compresses large smartphone photos directly in the browser so uploads are
 * ultra-fast and never exceed serverless payload limits.
 */
export async function optimizeImageFile(file, maxDimension = 1920, quality = 0.86) {
  if (!file || !file.type?.startsWith('image/')) return file;
  if (file.type === 'image/gif' || file.size < 350 * 1024) return file;

  try {
    const objectUrl = URL.createObjectURL(file);
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = objectUrl;
    });
    URL.revokeObjectURL(objectUrl);

    const { naturalWidth: w, naturalHeight: h } = img;
    if (!w || !h) return file;

    const scale = Math.min(1, maxDimension / Math.max(w, h));
    const targetW = Math.max(1, Math.round(w * scale));
    const targetH = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, targetW, targetH);

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality)
    );
    if (!blob || blob.size >= file.size) return file;

    const cleanName = (file.name || 'foto.jpg').replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], cleanName, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

/**
 * Uploads any file (e.g. a 50 MB .STL 3D model or product photo) DIRECTLY from
 * the browser to Vercel Blob using a short-lived server-signed client token.
 * Completely bypasses Vercel's 4.5 MB Serverless Function payload limit (413).
 *
 * Returns the permanent public Blob URL, or `null` when Vercel Blob is not
 * configured (so local offline dev falls back seamlessly to Express multer).
 */
export async function uploadFileDirectToBlob(
  file,
  { folder = 'models', admin = true, onProgress } = {}
) {
  const endpoint = admin ? '/api/blob/token' : '/api/blob/public-token';
  const headers = { 'Content-Type': 'application/json' };
  if (admin) {
    const token = getAdminToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const tokenRes = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      filename: file.name || 'upload.bin',
      folder,
    }),
  });

  const tokenData = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok) {
    throw new Error(tokenData.error || `Upload-Freigabe fehlgeschlagen (${tokenRes.status})`);
  }

  if (!tokenData.directUpload || !tokenData.clientToken || !tokenData.pathname) {
    return null; // Local offline fallback
  }

  const { put } = await import('@vercel/blob/client');
  const result = await put(tokenData.pathname, file, {
    access: 'public',
    token: tokenData.clientToken,
    contentType: file.type || 'application/octet-stream',
    multipart: file.size > 4 * 1024 * 1024,
    onUploadProgress: onProgress
      ? ({ percentage }) => onProgress(Math.min(100, Math.round(percentage || 0)))
      : undefined,
  });

  return result.url;
}
