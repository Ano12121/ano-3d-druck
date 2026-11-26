import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { put, list, del } from '@vercel/blob';

export const IS_VERCEL = Boolean(process.env.VERCEL);

export function isBlobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function getVaultKey() {
  const seed =
    process.env.AUTH_SECRET ||
    process.env.BLOB_READ_WRITE_TOKEN ||
    'ano-local-vault-key';
  return crypto.createHash('sha256').update(seed).digest();
}

function encryptVault(obj) {
  const key = getVaultKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(obj), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return JSON.stringify({
    v: 1,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    data: encrypted.toString('base64'),
  });
}

function decryptVault(rawText) {
  try {
    const parsed = JSON.parse(rawText);
    if (!parsed?.iv || !parsed?.tag || !parsed?.data) return null;
    const key = getVaultKey();
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(parsed.iv, 'base64')
    );
    decipher.setAuthTag(Buffer.from(parsed.tag, 'base64'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(parsed.data, 'base64')),
      decipher.final(),
    ]);
    return JSON.parse(decrypted.toString('utf8'));
  } catch {
    return null;
  }
}

const STORE_PREFIX = 'ano/store/';

function pickNewestBlob(blobs, startsWith) {
  const matching = blobs
    .filter((b) => b.pathname.startsWith(startsWith))
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  return matching[0] || null;
}

/**
 * Reads the latest versioned public catalog + encrypted private vault from Vercel Blob.
 * Using unique versioned filenames guarantees 0ms CDN staleness (immediate read-after-write).
 */
export async function loadCloudStore(fallbackStore) {
  if (!isBlobConfigured()) return null;
  try {
    const { blobs } = await list({ prefix: STORE_PREFIX });
    const pubBlob = pickNewestBlob(blobs, `${STORE_PREFIX}public`);
    const vaultBlob = pickNewestBlob(blobs, `${STORE_PREFIX}vault`);

    if (!pubBlob && !vaultBlob) {
      return null;
    }

    const merged = { ...fallbackStore };

    const tasks = [];
    if (pubBlob) {
      tasks.push(
        fetch(pubBlob.url, { cache: 'no-store' })
          .then((r) => (r.ok ? r.json() : null))
          .then((pubData) => {
            if (!pubData) return;
            if (pubData.studio) merged.studio = { ...merged.studio, ...pubData.studio };
            if (Array.isArray(pubData.products)) merged.products = pubData.products;
          })
      );
    }

    if (vaultBlob) {
      tasks.push(
        fetch(vaultBlob.url, { cache: 'no-store' })
          .then((r) => (r.ok ? r.text() : null))
          .then((raw) => {
            if (!raw) return;
            const privData = decryptVault(raw);
            if (!privData) return;
            if (privData.auth?.pinHash) merged.auth = privData.auth;
            if (Array.isArray(privData.orders)) merged.orders = privData.orders;
            if (Array.isArray(privData.inquiries)) merged.inquiries = privData.inquiries;
            if (Array.isArray(privData.studioPhotos)) merged.studioPhotos = privData.studioPhotos;
          })
      );
    }

    await Promise.all(tasks);
    return merged;
  } catch (err) {
    console.error('Blob store read error:', err.message);
    return null;
  }
}

export async function saveCloudStore(store) {
  if (!isBlobConfigured()) return;

  const ts = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const publicPayload = JSON.stringify({
    studio: store.studio,
    products: store.products || [],
  });

  const vaultPayload = encryptVault({
    auth: store.auth || null,
    orders: store.orders || [],
    inquiries: store.inquiries || [],
    studioPhotos: store.studioPhotos || [],
  });

  // List existing snapshots before writing so we can clean up old ones cleanly
  const existing = await list({ prefix: STORE_PREFIX }).catch(() => ({ blobs: [] }));

  await Promise.all([
    put(`${STORE_PREFIX}public-${ts}.json`, publicPayload, {
      access: 'public',
      addRandomSuffix: false,
      cacheControlMaxAge: 60,
      contentType: 'application/json',
    }),
    put(`${STORE_PREFIX}vault-${ts}.enc`, vaultPayload, {
      access: 'public',
      addRandomSuffix: false,
      cacheControlMaxAge: 60,
      contentType: 'text/plain',
    }),
  ]);

  // Clean up superseded older snapshots (keep store tidy & small)
  const oldUrls = (existing.blobs || []).map((b) => b.url);
  if (oldUrls.length > 0) {
    del(oldUrls).catch(() => {});
  }
}

/**
 * Persists an uploaded file (image or 3D model) cleanly across both local disk
 * and Vercel Serverless (using Vercel Blob when configured).
 */
export async function persistUploadedFile(file, subfolder = '') {
  if (!file) return null;

  const cleanSub = subfolder ? `${subfolder.replace(/^\/+|\/+$/g, '')}/` : '';

  if (isBlobConfigured()) {
    const buffer = file.buffer || fs.readFileSync(file.path);
    const blobPath = `ano/uploads/${cleanSub}${file.filename || `${Date.now()}-${file.originalname}`}`;
    const blob = await put(blobPath, buffer, {
      access: 'public',
      contentType: file.mimetype || 'application/octet-stream',
    });
    return blob.url;
  }

  if (IS_VERCEL && file.mimetype?.startsWith('image/')) {
    const buffer = file.buffer || fs.readFileSync(file.path);
    if (buffer.length <= 3.5 * 1024 * 1024) {
      return `data:${file.mimetype};base64,${buffer.toString('base64')}`;
    }
  }

  return `/uploads/${cleanSub}${file.filename}`;
}

export async function persistGeneratedBuffer({
  buffer,
  filename,
  mimeType,
  subfolder = 'studio',
  localDir,
}) {
  const cleanSub = subfolder ? `${subfolder.replace(/^\/+|\/+$/g, '')}/` : '';

  if (isBlobConfigured()) {
    const blob = await put(`ano/uploads/${cleanSub}${filename}`, buffer, {
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
