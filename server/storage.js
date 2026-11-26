import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { put, list } from '@vercel/blob';

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

const PUBLIC_BLOB_PATH = 'ano/store/public.json';
const VAULT_BLOB_PATH = 'ano/store/vault.enc';

let cachedBlobUrls = { publicUrl: null, vaultUrl: null };

export async function loadCloudStore(fallbackStore) {
  if (!isBlobConfigured()) return null;
  try {
    const { blobs } = await list({ prefix: 'ano/store/' });
    const pubBlob = blobs.find((b) => b.pathname === PUBLIC_BLOB_PATH);
    const vaultBlob = blobs.find((b) => b.pathname === VAULT_BLOB_PATH);

    if (!pubBlob && !vaultBlob) {
      return null;
    }

    const merged = { ...fallbackStore };

    if (pubBlob) {
      cachedBlobUrls.publicUrl = pubBlob.url;
      const res = await fetch(`${pubBlob.url}?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const pubData = await res.json();
        if (pubData.studio) merged.studio = { ...merged.studio, ...pubData.studio };
        if (Array.isArray(pubData.products)) merged.products = pubData.products;
      }
    }

    if (vaultBlob) {
      cachedBlobUrls.vaultUrl = vaultBlob.url;
      const res = await fetch(`${vaultBlob.url}?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const raw = await res.text();
        const privData = decryptVault(raw);
        if (privData) {
          if (Array.isArray(privData.orders)) merged.orders = privData.orders;
          if (Array.isArray(privData.inquiries)) merged.inquiries = privData.inquiries;
          if (Array.isArray(privData.emailLog)) merged.emailLog = privData.emailLog;
          if (Array.isArray(privData.studioPhotos)) merged.studioPhotos = privData.studioPhotos;
        }
      }
    }

    return merged;
  } catch (err) {
    console.error('Blob store read error:', err.message);
    return null;
  }
}

export async function saveCloudStore(store) {
  if (!isBlobConfigured()) return;

  const publicPayload = JSON.stringify({
    studio: store.studio,
    products: store.products || [],
  });

  const vaultPayload = encryptVault({
    orders: store.orders || [],
    inquiries: store.inquiries || [],
    emailLog: store.emailLog || [],
    studioPhotos: store.studioPhotos || [],
  });

  const [pubRes, vaultRes] = await Promise.all([
    put(PUBLIC_BLOB_PATH, publicPayload, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
    }),
    put(VAULT_BLOB_PATH, vaultPayload, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'text/plain',
    }),
  ]);

  cachedBlobUrls.publicUrl = pubRes.url;
  cachedBlobUrls.vaultUrl = vaultRes.url;
}

/**
 * Persists an uploaded file (image or 3D model) cleanly across both local disk
 * and Vercel Serverless (using Vercel Blob when configured, or inline data URI
 * fallback for images on ephemeral Vercel instances).
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

export async function persistGeneratedBuffer({ buffer, filename, mimeType, subfolder = 'studio', localDir }) {
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
