export const FILAMENTS = [
  {
    id: 'matt-schwarz',
    name: 'Matt-Schwarz',
    hex: '#1A1C22',
    swatch: '#1A1C22',
    ring: '#3E4352',
    finish: 'Matte',
    material: 'PLA Matte',
    temp: '210°C',
    note: 'Tiefmattes Schwarz — edel & kaum sichtbare Layer',
  },
  {
    id: 'matt-weiss',
    name: 'Matt-Weiß',
    hex: '#EFEFEA',
    swatch: '#EFEFEA',
    ring: '#FFFFFF',
    finish: 'Matte',
    material: 'PLA Matte',
    temp: '210°C',
    note: 'Cleanes, warmes Matt-Weiß für modernen Look',
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
    material: 'PLA Dual-Color',
    temp: '215°C',
    note: 'Zweifarbig gemixt — wechselt je nach Blickwinkel',
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
    material: 'PLA Galaxy',
    temp: '215°C',
    note: 'Schimmernder Blau-Lila-Verlauf mit Galaxy-Effekt',
  },
  {
    id: 'pink',
    name: 'Pink',
    hex: '#F43F8E',
    swatch: '#F43F8E',
    ring: '#F9A8D4',
    finish: 'Satin',
    material: 'PLA+',
    temp: '215°C',
    note: 'Knalliges, sattes Studio-Pink als echter Hingucker',
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

export const MATERIALS = [
  'PLA Matte',
  'PLA+',
  'PLA Dual-Color',
  'PLA Galaxy',
  'PLA Silk',
  'PETG',
  'TPU Flex',
];

export const ORDER_STEPS = [
  { key: 'neu', label: 'Eingegangen', desc: 'Bestellung bestätigt' },
  { key: 'slicing', label: 'Slicing & Setup', desc: 'Druckprofil wird vorbereitet' },
  { key: 'im_druck', label: 'Auf dem Druckbett', desc: 'Schicht für Schicht im Druck' },
  { key: 'finish', label: 'Qualitätscheck', desc: 'Finishing & Verpackung' },
  { key: 'versendet', label: 'Versendet', desc: 'Auf dem Weg zu dir' },
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
