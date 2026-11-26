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

export function getInitialStore() {
  const envPin = (process.env.ADMIN_PIN || '').trim();
  const initialPin = envPin || '2026';
  const { salt, hash } = hashPin(initialPin);

  return {
    auth: {
      pinSalt: salt,
      pinHash: hash,
      isDefaultPin: !envPin,
    },
    studio: {
      brandName: 'Ano',
      tagline: '3D-DRUCK // 100% PLA',
      announcement: '100% PLA 3D-Drucke • Such dir was aus oder schick mir einfach dein Wunsch-Modell',
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
      legal: {
        ownerName: 'Ano 3D-Druck',
        street: '',
        postalCity: '',
        country: 'Deutschland',
        email: '',
        phone: '',
        taxNotice: '',
        shippingTime: '2–3 Tage',
      },
    },
    products: [],
    orders: [],
    inquiries: [],
    emailLog: [],
    studioPhotos: [],
  };
}
