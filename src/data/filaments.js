export const FILAMENTS = [
  {
    id: 'matt-schwarz',
    name: 'Matt-Schwarz',
    hex: '#1A1C22',
    swatch: '#1A1C22',
    ring: '#3E4352',
    finish: 'Matte',
    material: 'PLA',
    temp: '210°C',
    note: 'Tiefmattes PLA-Schwarz — clean & edel',
  },
  {
    id: 'matt-weiss',
    name: 'Matt-Weiß',
    hex: '#EFEFEA',
    swatch: '#EFEFEA',
    ring: '#FFFFFF',
    finish: 'Matte',
    material: 'PLA',
    temp: '210°C',
    note: 'Warmes Matt-Weiß für minimalistischen Look',
  },
  {
    id: 'rot-schwarz',
    name: 'Rot-Schwarz Mix',
    hex: '#C81D2B',
    secondaryHex: '#15171E',
    swatch:
      'linear-gradient(135deg, #EF4444 0%, #B91C1C 46%, #181A22 54%, #0B0C10 100%)',
    ring: '#F87171',
    finish: 'Dual-Color',
    material: 'PLA',
    temp: '215°C',
    note: 'Zweifarbiges PLA — schimmert je nach Winkel',
  },
  {
    id: 'galaxy-blau-lila',
    name: 'Galaxy Blau-Lila',
    hex: '#5B46E8',
    secondaryHex: '#9333EA',
    swatch:
      'linear-gradient(135deg, #1D4ED8 0%, #5B46E8 48%, #9333EA 82%, #D8B4FE 100%)',
    ring: '#A78BFA',
    finish: 'Galaxy Sparkle',
    material: 'PLA',
    temp: '215°C',
    note: 'Blau-Lila PLA mit coolem Galaxy-Schimmer',
  },
  {
    id: 'pink',
    name: 'Pink',
    hex: '#F43F8E',
    swatch: '#F43F8E',
    ring: '#F9A8D4',
    finish: 'Satin',
    material: 'PLA',
    temp: '215°C',
    note: 'Kräftiges, sattes PLA-Pink als Hingucker',
  },
];

export const ALL_FILAMENT_IDS = FILAMENTS.map((f) => f.id);

export const CATEGORIES = [
  'Alle',
  'Deko & Licht',
  'Gaming & Desk',
  'Gadgets & Tools',
  'Art & Figuren',
  'Home & Pflanzen',
];

export const MATERIALS = ['PLA'];

export const ORDER_STEPS = [
  { key: 'neu', label: 'Eingegangen', desc: 'Anfrage ist bei mir' },
  { key: 'slicing', label: 'Vorbereitung', desc: 'Modell wird vorbereitet' },
  { key: 'im_druck', label: 'Im 3D-Drucker', desc: 'Wird gerade gedruckt' },
  { key: 'finish', label: 'Fertig', desc: 'Bereit zur Übergabe / Versand' },
  { key: 'versendet', label: 'Übergeben / Versendet', desc: 'Erledigt' },
];

export function getFilamentById(id) {
  return FILAMENTS.find((f) => f.id === id) || FILAMENTS[0];
}

export function formatEUR(amount) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(amount) || 0);
}
