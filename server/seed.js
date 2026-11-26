import crypto from 'crypto';

export function hashPin(pin, existingSalt) {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(pin), salt, 64).toString('hex');
  return { salt, hash };
}

export function verifyPin(pin, salt, expectedHash) {
  if (!salt || !expectedHash) return false;
  const computed = crypto.scryptSync(String(pin), salt, 64);
  const expected = Buffer.from(expectedHash, 'hex');
  if (computed.length !== expected.length) return false;
  return crypto.timingSafeEqual(computed, expected);
}

export function envPinDigest(pin) {
  return crypto.createHash('sha256').update(`ano-env-pin:${String(pin)}`).digest('hex');
}

export function buildEnvPinAuth(envPin) {
  const deterministicSalt = crypto
    .createHash('sha256')
    .update(`ano-env-salt:${process.env.AUTH_SECRET || 'ano'}:${envPin}`)
    .digest('hex')
    .slice(0, 32);
  const { salt, hash } = hashPin(envPin, deterministicSalt);
  return {
    pinSalt: salt,
    pinHash: hash,
    isDefaultPin: false,
    envPinDigest: envPinDigest(envPin),
  };
}

export function getInitialStore() {
  const envPin = (process.env.ADMIN_PIN || '').trim();
  const auth = envPin
    ? buildEnvPinAuth(envPin)
    : (() => {
        const { salt, hash } = hashPin('2026', 'ano-default-pin-salt-2026');
        return {
          pinSalt: salt,
          pinHash: hash,
          isDefaultPin: true,
        };
      })();

  return {
    auth,
    studio: {
      brandName: 'Ano',
      tagline: '3D-DRUCK // 100% PLA',
      printerStatus: {
        active: false,
        modelName: '',
        printer: 'Mein 3D-Drucker',
        material: 'PLA Matt-Schwarz',
        progress: 0,
        nozzleTemp: 210,
        bedTemp: 60,
        remaining: '',
      },
    },
    products: [],
    orders: [],
    inquiries: [],
    studioPhotos: [],
  };
}
