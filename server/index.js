import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { getInitialStore, hashPin, verifyPin } from './seed.js';
import {
  isSmtpConfigured,
  sendOrderConfirmationEmail,
  sendOrderStatusEmail,
} from './mailer.js';
import {
  getLanUrls,
  isAiGatewayAvailable,
  transformPhotoWithAiGateway,
  transformPhotoWithGemini,
} from './photoStudio.js';
import {
  IS_VERCEL,
  isBlobConfigured,
  loadCloudStore,
  saveCloudStore,
  persistUploadedFile,
} from './storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3001;
const WRITABLE_ROOT = IS_VERCEL ? path.join(os.tmpdir(), 'layerlab') : __dirname;
const DATA_DIR = path.join(WRITABLE_ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');
const SECRETS_FILE = path.join(DATA_DIR, 'secrets.json');
const UPLOADS_DIR = path.join(WRITABLE_ROOT, 'uploads');
const MODELS_DIR = path.join(UPLOADS_DIR, 'models');
const RAW_DIR = path.join(UPLOADS_DIR, 'raw');
const STUDIO_IMG_DIR = path.join(UPLOADS_DIR, 'studio');
const DIST_DIR = path.join(__dirname, '..', 'dist');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
fs.mkdirSync(MODELS_DIR, { recursive: true });
fs.mkdirSync(RAW_DIR, { recursive: true });
fs.mkdirSync(STUDIO_IMG_DIR, { recursive: true });

function readSecrets() {
  if (!fs.existsSync(SECRETS_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(SECRETS_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function writeSecrets(secrets) {
  fs.writeFileSync(SECRETS_FILE, JSON.stringify(secrets, null, 2), 'utf-8');
}

function getGeminiApiKey() {
  const secrets = readSecrets();
  return (secrets.geminiApiKey || process.env.GEMINI_API_KEY || '').trim();
}

const VALID_FILAMENT_IDS = new Set([
  'matt-schwarz',
  'matt-weiss',
  'rot-schwarz',
  'galaxy-blau-lila',
  'pink',
]);

const DEFAULT_USER_COLORS = [
  'matt-schwarz',
  'matt-weiss',
  'rot-schwarz',
  'galaxy-blau-lila',
  'pink',
];

function normalizeStore(store) {
  const defaults = getInitialStore();

  if (!store.auth?.pinHash) {
    store.auth = defaults.auth;
  }
  const envPin = (process.env.ADMIN_PIN || '').trim();
  if (
    envPin &&
    !verifyPin(envPin, store.auth.pinSalt, store.auth.pinHash) &&
    (IS_VERCEL || store.auth.isDefaultPin)
  ) {
    const { salt, hash } = hashPin(envPin);
    store.auth = { pinSalt: salt, pinHash: hash, isDefaultPin: false };
  }
  if (!store.studio) {
    store.studio = defaults.studio;
  }
  if (!store.studio.legal) {
    store.studio.legal = defaults.studio.legal;
  }
  if (!Array.isArray(store.products)) store.products = [];
  if (!Array.isArray(store.orders)) store.orders = [];
  if (!Array.isArray(store.inquiries)) store.inquiries = [];
  if (!Array.isArray(store.emailLog)) store.emailLog = [];
  if (!Array.isArray(store.studioPhotos)) store.studioPhotos = [];

  store.products = store.products.map((p) => ({
    ...p,
    material: 'PLA',
    colors:
      Array.isArray(p.colors) &&
      p.colors.length > 0 &&
      p.colors.every((c) => VALID_FILAMENT_IDS.has(c))
        ? p.colors
        : [...DEFAULT_USER_COLORS],
  }));

  return store;
}

function readLocalStoreSync() {
  if (!fs.existsSync(DATA_FILE)) {
    const initial = getInitialStore();
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    return normalizeStore(JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')));
  } catch {
    const initial = getInitialStore();
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
}

async function readStore() {
  const base = getInitialStore();
  if (isBlobConfigured()) {
    const cloud = await loadCloudStore(base);
    if (cloud) {
      return normalizeStore(cloud);
    }
    return normalizeStore(base);
  }
  return readLocalStoreSync();
}

async function writeStore(store) {
  if (isBlobConfigured()) {
    await saveCloudStore(store);
  }
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch {
    // ignore local write errors on serverless if Blob already saved
  }
}

// Stateless HMAC-SHA256 Admin Tokens (works seamlessly across Vercel Serverless & locally!)
function getSigningKey(store) {
  return process.env.AUTH_SECRET || store.auth?.pinHash || 'ano-local-secret';
}

function createSessionToken(store) {
  const payload = Buffer.from(
    JSON.stringify({
      role: 'admin',
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    })
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', getSigningKey(store))
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

function isValidAdmin(req, store) {
  const token = getBearerToken(req);
  if (!token || !token.includes('.')) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  try {
    const expectedSig = crypto
      .createHmac('sha256', getSigningKey(store))
      .update(payload)
      .digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    return Boolean(decoded?.role === 'admin' && decoded.exp > Date.now());
  } catch {
    return false;
  }
}

async function requireAdmin(req, res, next) {
  try {
    const store = await readStore();
    if (!isValidAdmin(req, store)) {
      return res
        .status(401)
        .json({ error: 'Creator Studio gesperrt. Bitte melde dich mit deiner PIN an.' });
    }
    req._store = store;
    next();
  } catch (err) {
    res.status(500).json({ error: err.message || 'Auth-Fehler' });
  }
}

// Multer Storage for Images and 3D Models (.stl / .obj / .3mf)
const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (
      ['.stl', '.obj', '.3mf'].includes(ext) ||
      file.fieldname === 'modelFile' ||
      file.fieldname === 'stlFile'
    ) {
      cb(null, MODELS_DIR);
    } else if (file.fieldname === 'rawPhoto' || file.fieldname === 'originalPhoto') {
      cb(null, RAW_DIR);
    } else if (file.fieldname === 'styledPhoto') {
      cb(null, STUDIO_IMG_DIR);
    } else {
      cb(null, UPLOADS_DIR);
    }
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '.png').toLowerCase() || '.png';
    const allowed = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif', '.stl', '.obj', '.3mf'];
    const safeExt = allowed.includes(ext) ? ext : '.bin';
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${safeExt}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 35 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const isImage = file.mimetype?.startsWith('image/');
    const is3d = ['.stl', '.obj', '.3mf'].includes(ext);
    if (isImage || is3d) {
      cb(null, true);
    } else {
      cb(
        new Error(
          'Nur Bilder (PNG, JPG, WEBP) oder 3D-Dateien (.STL, .OBJ, .3MF) sind erlaubt.'
        )
      );
    }
  },
});

const isStripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

function parseJsonField(val, fallback) {
  if (val === undefined || val === null || val === '') return fallback;
  if (typeof val !== 'string') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

// ===================== AUTH ROUTES =====================
app.get('/api/auth/status', async (req, res) => {
  const store = await readStore();
  res.json({
    authenticated: isValidAdmin(req, store),
    isDefaultPin: Boolean(store.auth?.isDefaultPin),
    stripeConfigured: isStripeConfigured(),
    smtpConfigured: isSmtpConfigured(),
    blobConfigured: isBlobConfigured(),
  });
});

app.post('/api/auth/login', async (req, res) => {
  const store = await readStore();
  const pin = String(req.body?.pin || '').trim();
  if (!pin) {
    return res.status(400).json({ error: 'Bitte gib deine Studio-PIN / dein Passwort ein.' });
  }
  if (!verifyPin(pin, store.auth.pinSalt, store.auth.pinHash)) {
    return res.status(401).json({ error: 'Falsche Studio-PIN. Bitte erneut versuchen.' });
  }
  const token = createSessionToken(store);
  res.json({
    token,
    isDefaultPin: Boolean(store.auth.isDefaultPin),
  });
});

app.post('/api/auth/logout', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/auth/change-pin', requireAdmin, async (req, res) => {
  const store = req._store;
  const { currentPin, newPin } = req.body || {};
  if (!newPin || String(newPin).trim().length < 4) {
    return res
      .status(400)
      .json({ error: 'Neue PIN/Passwort muss mindestens 4 Zeichen lang sein.' });
  }
  if (!verifyPin(String(currentPin || '').trim(), store.auth.pinSalt, store.auth.pinHash)) {
    return res.status(401).json({ error: 'Aktuelle PIN ist nicht korrekt.' });
  }
  const { salt, hash } = hashPin(String(newPin).trim());
  store.auth = { pinSalt: salt, pinHash: hash, isDefaultPin: false };
  await writeStore(store);
  res.json({ ok: true, isDefaultPin: false });
});

// ===================== PUBLIC BOOTSTRAP =====================
app.get('/api/bootstrap', async (req, res) => {
  const store = await readStore();
  const authed = isValidAdmin(req, store);
  res.json({
    studio: store.studio,
    products: store.products,
    authenticated: authed,
    isDefaultPin: Boolean(store.auth?.isDefaultPin),
    stripeConfigured: isStripeConfigured(),
    smtpConfigured: isSmtpConfigured(),
    blobConfigured: isBlobConfigured(),
    geminiConfigured: Boolean(getGeminiApiKey() || isAiGatewayAvailable()),
    directGeminiConfigured: Boolean(getGeminiApiKey()),
    lanUrls: authed ? getLanUrls(5173) : [],
    orders: authed ? store.orders : [],
    inquiries: authed ? store.inquiries : [],
    emailLog: authed ? store.emailLog : [],
    studioPhotos: authed ? store.studioPhotos || [] : [],
  });
});

// ===================== ADMIN DASHBOARD =====================
app.get('/api/admin/dashboard', requireAdmin, async (req, res) => {
  const store = req._store;
  res.json({
    studio: store.studio,
    products: store.products,
    orders: store.orders,
    inquiries: store.inquiries,
    emailLog: store.emailLog || [],
    studioPhotos: store.studioPhotos || [],
    isDefaultPin: Boolean(store.auth?.isDefaultPin),
    stripeConfigured: isStripeConfigured(),
    smtpConfigured: isSmtpConfigured(),
    blobConfigured: isBlobConfigured(),
    geminiConfigured: Boolean(getGeminiApiKey() || isAiGatewayAvailable()),
    directGeminiConfigured: Boolean(getGeminiApiKey()),
    lanUrls: getLanUrls(5173),
  });
});

// ===================== AI PHOTO STUDIO ROUTES =====================
app.post('/api/studio/photo-key', requireAdmin, (req, res) => {
  const key = String(req.body?.apiKey || '').trim();
  const secrets = readSecrets();
  if (key) {
    secrets.geminiApiKey = key;
  } else {
    delete secrets.geminiApiKey;
  }
  writeSecrets(secrets);
  res.json({
    geminiConfigured: Boolean(getGeminiApiKey() || isAiGatewayAvailable()),
    directGeminiConfigured: Boolean(getGeminiApiKey()),
  });
});

app.post(
  '/api/studio/photo-transform',
  requireAdmin,
  upload.single('rawPhoto'),
  async (req, res) => {
    if (!req.file) {
      return res
        .status(400)
        .json({ error: 'Bitte lade zuerst ein Handyfoto deines 3D-Drucks hoch.' });
    }

    const store = req._store;
    const style = req.body.style || 'obsidian-dark';
    const colorOverride = req.body.colorOverride || 'original';
    const customNote = (req.body.customNote || '').trim();
    const title = (
      req.body.title ||
      req.file.originalname.replace(/\.[^.]+$/, '') ||
      '3D-Druck Foto'
    ).trim();
    const mode = req.body.mode || 'gemini';
    const originalUrl = await persistUploadedFile(req.file, 'raw');

    if (mode === 'raw-inbox') {
      const entry = {
        id: `PHOTO-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title,
        originalUrl,
        originalFile: req.file.filename,
        studioUrl: null,
        style,
        colorOverride,
        customNote,
        status: 'wartet_auf_ki',
        engine: 'raw-inbox',
        createdAt: new Date().toISOString(),
      };
      store.studioPhotos = [entry, ...(store.studioPhotos || [])];
      await writeStore(store);
      return res.status(201).json(entry);
    }

    const headerKey = String(req.headers['x-gemini-key'] || '').trim();
    const directApiKey = headerKey || getGeminiApiKey();
    const useGateway = !directApiKey && isAiGatewayAvailable();

    if (!directApiKey && !useGateway) {
      return res.status(400).json({
        error:
          'Weder Vercel AI Gateway noch ein Gemini API-Key ist verbunden — nutze „Prompt kopieren & Gemini öffnen“ oder den „Sofort-Look (4:3)“.',
      });
    }

    try {
      const result = directApiKey
        ? await transformPhotoWithGemini({
            apiKey: directApiKey,
            imagePath: req.file.path,
            mimeType: req.file.mimetype,
            style,
            colorOverride,
            customNote,
            outputDir: STUDIO_IMG_DIR,
          })
        : await transformPhotoWithAiGateway({
            imagePath: req.file.path,
            mimeType: req.file.mimetype,
            style,
            colorOverride,
            customNote,
            outputDir: STUDIO_IMG_DIR,
          });

      const entry = {
        id: `PHOTO-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title,
        originalUrl,
        originalFile: req.file.filename,
        studioUrl: result.studioUrl,
        style,
        colorOverride,
        customNote,
        status: 'fertig',
        engine: result.modelUsed,
        createdAt: new Date().toISOString(),
      };

      store.studioPhotos = [entry, ...(store.studioPhotos || [])];
      await writeStore(store);
      res.status(201).json(entry);
    } catch (err) {
      const msg = err.message || 'Unbekannter Fehler';
      const friendly =
        msg.includes('limit: 0') || msg.includes('exceeded your current quota')
          ? 'Google blockiert Bild-Generierung im kostenlosen API-Tarif (limit: 0 — dein normales Gemini-Abo zählt dort leider nicht mit). Nutz einfach den Button „Prompt kopieren & Gemini öffnen“ (0 € mit deinem Gemini-Abo) oder aktiviere API-Billing in aistudio.google.com.'
          : msg.includes('customer_verification_required') || msg.includes('credit card')
          ? 'Vercel AI Gateway verlangt einmalig eine hinterlegte Karte für die kostenlosen Credits. Nutz einfach „Prompt kopieren & Gemini öffnen“ oder den „Sofort-Look (4:3)“!'
          : msg.includes('insufficient_funds') || msg.includes('402')
          ? 'Credits aufgebraucht — nutz einfach „Prompt kopieren & Gemini öffnen“ oder den „Sofort-Look (4:3)“!'
          : `KI-Bildgenerierung fehlgeschlagen: ${msg}`;
      res.status(502).json({ error: friendly });
    }
  }
);

app.post(
  '/api/studio/photo-save-local',
  requireAdmin,
  upload.fields([
    { name: 'originalPhoto', maxCount: 1 },
    { name: 'styledPhoto', maxCount: 1 },
  ]),
  async (req, res) => {
    const orig = req.files?.originalPhoto?.[0];
    const styled = req.files?.styledPhoto?.[0];
    if (!styled) {
      return res.status(400).json({ error: 'Kein Studio-Foto übermittelt.' });
    }

    const studioUrl = await persistUploadedFile(styled, 'studio');
    const originalUrl = orig ? await persistUploadedFile(orig, 'raw') : studioUrl;

    const store = req._store;
    const entry = {
      id: `PHOTO-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: (req.body.title || 'Studio-Foto').trim(),
      originalUrl,
      originalFile: orig?.filename || null,
      studioUrl,
      style: req.body.style || 'obsidian-dark',
      colorOverride: req.body.colorOverride || 'original',
      customNote: (req.body.customNote || '').trim(),
      status: 'fertig',
      engine: 'sofort-studio-filter',
      createdAt: new Date().toISOString(),
    };

    store.studioPhotos = [entry, ...(store.studioPhotos || [])];
    await writeStore(store);
    res.status(201).json(entry);
  }
);

app.delete('/api/studio/photos/:id', requireAdmin, async (req, res) => {
  const store = req._store;
  store.studioPhotos = (store.studioPhotos || []).filter((p) => p.id !== req.params.id);
  await writeStore(store);
  res.json({ deleted: req.params.id });
});

// ===================== PRODUCTS =====================
app.get('/api/products', async (_req, res) => {
  const store = await readStore();
  res.json(store.products);
});

const productUploadFields = upload.fields([
  { name: 'images', maxCount: 6 },
  { name: 'modelFile', maxCount: 1 },
]);

app.post('/api/products', requireAdmin, productUploadFields, async (req, res) => {
  const store = req._store;
  const imgFiles = req.files?.images || [];
  const modelFiles = req.files?.modelFile || [];
  const uploadedUrls = await Promise.all(imgFiles.map((f) => persistUploadedFile(f, '')));
  const externalUrls = parseJsonField(req.body.existingImages, []);
  const images = [...uploadedUrls, ...externalUrls];
  const modelUrl = modelFiles[0]
    ? await persistUploadedFile(modelFiles[0], 'models')
    : null;

  if (!req.body.title || !req.body.title.trim()) {
    return res.status(400).json({ error: 'Bitte gib einen Namen für deine Kreation an.' });
  }
  if (images.length === 0) {
    return res
      .status(400)
      .json({ error: 'Bitte lade mindestens ein Foto deiner 3D-Kreation hoch.' });
  }

  const product = {
    id: `prod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: req.body.title.trim(),
    subtitle: (req.body.subtitle || '').trim(),
    description: (req.body.description || '').trim(),
    price: Math.max(0.5, parseFloat(req.body.price) || 19.9),
    compareAtPrice: req.body.compareAtPrice ? parseFloat(req.body.compareAtPrice) : null,
    category: req.body.category || 'Gadgets & Tools',
    badge: (req.body.badge || '').trim(),
    images,
    modelUrl,
    demoModel: null,
    material: 'PLA',
    colors: parseJsonField(req.body.colors, DEFAULT_USER_COLORS),
    specs: {
      layerHeight: req.body.layerHeight || '0.16 mm',
      printTime: req.body.printTime || '3h 30m',
      dimensions: req.body.dimensions || '120 × 120 × 100 mm',
      weight: req.body.weight || '110 g',
      infill: req.body.infill || '15%',
    },
    stockMode: req.body.stockMode === 'in-stock' ? 'in-stock' : 'made-to-order',
    stockCount: Math.max(0, parseInt(req.body.stockCount, 10) || 1),
    leadTime: (req.body.leadTime || '2–3 Tage').trim(),
    featured: req.body.featured === 'true' || req.body.featured === true,
    published: req.body.published !== 'false' && req.body.published !== false,
    likes: 0,
    createdAt: new Date().toISOString(),
  };

  store.products.unshift(product);
  await writeStore(store);
  res.status(201).json(product);
});

app.put('/api/products/:id', requireAdmin, productUploadFields, async (req, res) => {
  const store = req._store;
  const idx = store.products.findIndex((p) => p.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Kreation nicht gefunden.' });
  }

  const existing = store.products[idx];
  const imgFiles = req.files?.images || [];
  const modelFiles = req.files?.modelFile || [];
  const uploadedUrls = await Promise.all(imgFiles.map((f) => persistUploadedFile(f, '')));
  const keptImages = parseJsonField(req.body.existingImages, existing.images);
  const combinedImages = [...keptImages, ...uploadedUrls];

  let nextModelUrl = existing.modelUrl || null;
  if (req.body.removeModel === 'true') nextModelUrl = null;
  if (modelFiles[0]) nextModelUrl = await persistUploadedFile(modelFiles[0], 'models');

  const updated = {
    ...existing,
    title: req.body.title !== undefined ? req.body.title.trim() : existing.title,
    subtitle: req.body.subtitle !== undefined ? req.body.subtitle.trim() : existing.subtitle,
    description:
      req.body.description !== undefined ? req.body.description.trim() : existing.description,
    price:
      req.body.price !== undefined
        ? Math.max(0.5, parseFloat(req.body.price) || existing.price)
        : existing.price,
    compareAtPrice:
      req.body.compareAtPrice !== undefined
        ? req.body.compareAtPrice
          ? parseFloat(req.body.compareAtPrice)
          : null
        : existing.compareAtPrice,
    category: req.body.category || existing.category,
    badge: req.body.badge !== undefined ? req.body.badge.trim() : existing.badge,
    images: combinedImages.length > 0 ? combinedImages : existing.images,
    modelUrl: nextModelUrl,
    material: 'PLA',
    colors: parseJsonField(req.body.colors, existing.colors),
    specs: {
      layerHeight: req.body.layerHeight || existing.specs?.layerHeight || '0.16 mm',
      printTime: req.body.printTime || existing.specs?.printTime || '3h 30m',
      dimensions: req.body.dimensions || existing.specs?.dimensions || '120 × 120 × 100 mm',
      weight: req.body.weight || existing.specs?.weight || '110 g',
      infill: req.body.infill || existing.specs?.infill || '15%',
    },
    stockMode: req.body.stockMode || existing.stockMode,
    stockCount:
      req.body.stockCount !== undefined
        ? Math.max(0, parseInt(req.body.stockCount, 10) || 0)
        : existing.stockCount,
    leadTime: req.body.leadTime !== undefined ? req.body.leadTime.trim() : existing.leadTime,
    featured:
      req.body.featured !== undefined
        ? req.body.featured === 'true' || req.body.featured === true
        : existing.featured,
    published:
      req.body.published !== undefined
        ? req.body.published === 'true' || req.body.published === true
        : existing.published,
  };

  store.products[idx] = updated;
  await writeStore(store);
  res.json(updated);
});

app.delete('/api/products/:id', requireAdmin, async (req, res) => {
  const store = req._store;
  const idx = store.products.findIndex((p) => p.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Kreation nicht gefunden.' });
  }
  const [removed] = store.products.splice(idx, 1);
  await writeStore(store);
  res.json({ deleted: removed.id });
});

app.post('/api/products/:id/like', async (req, res) => {
  const store = await readStore();
  const product = store.products.find((p) => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Kreation nicht gefunden.' });
  }
  product.likes = (product.likes || 0) + 1;
  await writeStore(store);
  res.json({ id: product.id, likes: product.likes });
});

// ===================== ORDERS =====================
app.get('/api/orders', requireAdmin, (req, res) => {
  res.json(req._store.orders);
});

app.get('/api/orders/:id', async (req, res) => {
  const store = await readStore();
  const target = req.params.id.trim().toUpperCase();
  const order = store.orders.find((o) => o.id.toUpperCase() === target);
  if (!order) {
    return res.status(404).json({ error: 'Keine Bestellung mit dieser Nummer gefunden.' });
  }
  res.json({
    id: order.id,
    status: order.status,
    progress: Number(order.progress ?? 0),
    paymentStatus: order.paymentStatus || 'ausstehend',
    paymentMethod: order.paymentMethod,
    createdAt: order.createdAt,
    items: order.items,
    total: order.total,
    city: order.customer?.city || '',
  });
});

app.post('/api/orders', async (req, res) => {
  const store = await readStore();
  const { customer, items, paymentMethod } = req.body || {};

  if (!customer?.name || !customer.name.trim()) {
    return res.status(400).json({ error: 'Bitte gib zumindest deinen Namen ein.' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Dein Warenkorb ist leer.' });
  }

  let subtotal = 0;
  const cleanItems = items.map((item) => {
    const product = store.products.find((p) => p.id === item.productId);
    const sizeMultiplier =
      item.sizeOption === 'Groß (+25%)' || item.sizeOption === 'Large (+25%)' ? 1.25 : 1;
    const basePrice = product ? product.price : Number(item.unitPrice) || 0;
    const unitPrice = Math.round(basePrice * sizeMultiplier * 100) / 100;
    const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);
    subtotal += unitPrice * quantity;

    if (product && product.stockMode === 'in-stock' && product.stockCount > 0) {
      product.stockCount = Math.max(0, product.stockCount - quantity);
    }

    return {
      productId: item.productId,
      title: product?.title || item.title,
      image: product?.images?.[0] || item.image || '',
      colorId: item.colorId || 'matt-schwarz',
      colorName: item.colorName || 'Matt-Schwarz',
      colorHex: item.colorHex || '#1A1C22',
      sizeOption: item.sizeOption || 'Standard (100%)',
      quantity,
      unitPrice,
    };
  });

  subtotal = Math.round(subtotal * 100) / 100;
  const wantsShipping = customer.deliveryMode === 'Versand';
  const shipping = wantsShipping ? (subtotal >= 50 ? 0 : 4.9) : 0;
  const total = Math.round((subtotal + shipping) * 100) / 100;
  const code = `ANO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const order = {
    id: code,
    customer: {
      name: customer.name.trim(),
      contact: (customer.contact || customer.email || '').trim(),
      email: (customer.email || '').trim(),
      deliveryMode: wantsShipping ? 'Versand' : 'Abholung / Übergabe',
      street: (customer.street || '').trim(),
      postalCode: (customer.postalCode || '').trim(),
      city: (customer.city || '').trim(),
      notes: (customer.notes || '').trim(),
    },
    paymentMethod: paymentMethod || 'PayPal / Bar',
    paymentStatus: 'ausstehend',
    items: cleanItems,
    subtotal,
    shipping,
    total,
    status: 'neu',
    progress: 0,
    createdAt: new Date().toISOString(),
  };

  store.orders.unshift(order);

  if (order.customer.email && order.customer.email.includes('@')) {
    const mailEntry = await sendOrderConfirmationEmail(order, store.studio);
    store.emailLog = [mailEntry, ...(store.emailLog || [])].slice(0, 60);
  }

  await writeStore(store);
  res.status(201).json({ order, checkoutUrl: null });
});

app.patch('/api/orders/:id', requireAdmin, async (req, res) => {
  const store = req._store;
  const order = store.orders.find((o) => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Bestellung nicht gefunden.' });
  }
  const allowed = ['neu', 'slicing', 'im_druck', 'finish', 'versendet'];
  if (req.body.status) {
    if (!allowed.includes(req.body.status)) {
      return res.status(400).json({ error: 'Ungültiger Status.' });
    }
    order.status = req.body.status;
    if (order.customer?.email && order.customer.email.includes('@')) {
      const mailEntry = await sendOrderStatusEmail(order, store.studio);
      store.emailLog = [mailEntry, ...(store.emailLog || [])].slice(0, 60);
    }
  }
  if (req.body.paymentStatus) {
    order.paymentStatus = req.body.paymentStatus;
  }
  if (req.body.progress !== undefined) {
    order.progress = Math.max(0, Math.min(100, Math.round(Number(req.body.progress) || 0)));
  }
  await writeStore(store);
  res.json(order);
});

app.delete('/api/orders/:id', requireAdmin, async (req, res) => {
  const store = req._store;
  const idx = store.orders.findIndex((o) => o.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Bestellung nicht gefunden.' });
  }
  const [removed] = store.orders.splice(idx, 1);
  await writeStore(store);
  res.json({ deleted: removed.id });
});

// ===================== CUSTOM PRINT INQUIRIES =====================
const inquiryUploadFields = upload.fields([
  { name: 'referenceImage', maxCount: 1 },
  { name: 'stlFile', maxCount: 1 },
]);

app.post('/api/inquiries', inquiryUploadFields, async (req, res) => {
  const store = await readStore();
  if (!req.body.name || !req.body.name.trim()) {
    return res.status(400).json({ error: 'Bitte gib kurz deinen Namen ein.' });
  }

  const refImg = req.files?.referenceImage?.[0];
  const stlFile = req.files?.stlFile?.[0];
  const refUrl = refImg ? await persistUploadedFile(refImg, '') : null;
  const stlUrl = stlFile ? await persistUploadedFile(stlFile, 'models') : null;

  const autoTitle =
    (req.body.projectTitle || '').trim() ||
    (stlFile ? stlFile.originalname.replace(/\.stl$/i, '') : '') ||
    (req.body.stlLink ? '3D-Modell Link' : 'Wunschdruck');

  const inquiry = {
    id: `REQ-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    name: req.body.name.trim(),
    contact: (req.body.contact || req.body.email || '').trim(),
    email: (req.body.email || '').trim(),
    projectTitle: autoTitle,
    description: (req.body.description || '').trim(),
    stlLink: (req.body.stlLink || '').trim(),
    material: 'PLA',
    colorName: req.body.colorName || 'Matt-Schwarz',
    dimensions: (req.body.dimensions || '').trim(),
    budget: (req.body.budget || '').trim(),
    referenceImage: refUrl,
    stlFileUrl: stlUrl,
    stlFileName: stlFile ? stlFile.originalname : null,
    stlMetrics: parseJsonField(req.body.stlMetrics, null),
    status: 'offen',
    createdAt: new Date().toISOString(),
  };

  store.inquiries.unshift(inquiry);
  await writeStore(store);
  res.status(201).json(inquiry);
});

app.patch('/api/inquiries/:id', requireAdmin, async (req, res) => {
  const store = req._store;
  const inq = store.inquiries.find((i) => i.id === req.params.id);
  if (!inq) {
    return res.status(404).json({ error: 'Anfrage nicht gefunden.' });
  }
  inq.status = req.body.status || inq.status;
  await writeStore(store);
  res.json(inq);
});

// ===================== STUDIO SETTINGS =====================
app.put('/api/studio', requireAdmin, async (req, res) => {
  const store = req._store;
  store.studio = {
    ...store.studio,
    ...req.body,
    printerStatus: {
      ...store.studio.printerStatus,
      ...(req.body.printerStatus || {}),
    },
    legal: {
      ...store.studio.legal,
      ...(req.body.legal || {}),
    },
  };
  await writeStore(store);
  res.json(store.studio);
});

// Multer error handler
app.use((err, _req, res, _next) => {
  res.status(400).json({ error: err.message || 'Upload-Fehler' });
});

// Production static frontend serving (local / VPS only — Vercel serves dist/ via CDN)
if (!IS_VERCEL && fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

if (!IS_VERCEL) {
  app.listen(PORT, () => {
    console.log(`Ano 3D API Server läuft auf http://localhost:${PORT}`);
  });
}

export default app;
