import { unzipSync } from 'fflate';

const BAMBU_MODEL_IDS = {
  N1: 'Bambu Lab A1 mini',
  N2S: 'Bambu Lab A1',
  C11: 'Bambu Lab P1P',
  C12: 'Bambu Lab P1S',
  C13: 'Bambu Lab X1E',
  'BL-P001': 'Bambu Lab X1 Carbon',
  'BL-P002': 'Bambu Lab X1',
  O1D: 'Bambu Lab H2D',
};

function normalizePrinterName(raw) {
  const s = String(raw || '').trim();
  return BAMBU_MODEL_IDS[s] || s;
}

const TEXT_DECODER = new TextDecoder('utf-8', { fatal: false });

const PLA_COLOR_REFS = [
  { id: 'matt-schwarz', r: 28, g: 29, b: 34 },
  { id: 'matt-weiss', r: 242, g: 241, b: 236 },
  { id: 'rot-schwarz', r: 196, g: 30, b: 46 },
  { id: 'galaxy-blau-lila', r: 74, g: 62, b: 175 },
  { id: 'pink', r: 232, g: 76, b: 152 },
];

export function isSlicerFileName(name = '') {
  const lower = String(name).toLowerCase();
  return (
    lower.endsWith('.gcode.3mf') ||
    lower.endsWith('.3mf') ||
    lower.endsWith('.gcode') ||
    lower.endsWith('.gco') ||
    lower.endsWith('.bgcode')
  );
}

export function formatDurationCompact(totalSeconds) {
  const secs = Math.round(Number(totalSeconds) || 0);
  if (secs <= 0) return '';
  const days = Math.floor(secs / 86400);
  const hours = Math.floor((secs % 86400) / 3600);
  const mins = Math.max(1, Math.round((secs % 3600) / 60));
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0 && !(days > 0 && hours > 0 && mins === 60)) parts.push(`${mins}m`);
  return parts.join(' ') || '1m';
}

export function formatDurationGerman(totalSeconds) {
  const secs = Math.round(Number(totalSeconds) || 0);
  if (secs <= 0) return '';
  const days = Math.floor(secs / 86400);
  const hours = Math.floor((secs % 86400) / 3600);
  const mins = Math.round((secs % 3600) / 60);
  const parts = [];
  if (days > 0) parts.push(`${days} ${days === 1 ? 'Tag' : 'Tage'}`);
  if (hours > 0) parts.push(`${hours} Std.`);
  if (mins > 0 || parts.length === 0) parts.push(`${Math.max(1, mins)} Min.`);
  return parts.join(' ');
}

export function parseDurationToSeconds(raw) {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.round(raw);
  const str = String(raw).trim();
  if (!str) return 0;

  // Pure numeric seconds (e.g. Cura ";TIME:12345" or Bambu slice_info prediction="12345")
  if (/^\d+(\.\d+)?$/.test(str)) {
    return Math.round(parseFloat(str));
  }

  // HH:MM:SS format
  const colonMatch = str.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
  if (colonMatch) {
    const a = parseInt(colonMatch[1], 10);
    const b = parseInt(colonMatch[2], 10);
    const c = colonMatch[3] ? parseInt(colonMatch[3], 10) : 0;
    return colonMatch[3] ? a * 3600 + b * 60 + c : a * 60 + b;
  }

  // Human duration: "1d 3h 24m 12s", "3 Std. 15 Min.", "45m 10s"
  let total = 0;
  let matched = false;
  const d = str.match(/(\d+(?:\.\d+)?)\s*(?:d|day|days|t|tag|tage)\b/i);
  const h = str.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours|std\.?|stunde|stunden)\b/i);
  const m = str.match(/(\d+(?:\.\d+)?)\s*(?:m|min|mins|min\.|minute|minuten)\b/i);
  const s = str.match(/(\d+(?:\.\d+)?)\s*(?:s|sec|secs|sek\.?|sekunde|sekunden)\b/i);

  if (d) {
    total += parseFloat(d[1]) * 86400;
    matched = true;
  }
  if (h) {
    total += parseFloat(h[1]) * 3600;
    matched = true;
  }
  if (m) {
    total += parseFloat(m[1]) * 60;
    matched = true;
  }
  if (s) {
    total += parseFloat(s[1]);
    matched = true;
  }

  return matched ? Math.round(total) : 0;
}

function cleanTitleFromFilename(fileName = '') {
  let base = String(fileName)
    .replace(/\.gcode\.3mf$/i, '')
    .replace(/\.(3mf|gcode|gco|bgcode|stl)$/i, '')
    .replace(/[_\-]+/g, ' ');

  // Strip common Bambu/Orca/Prusa slicer suffixes like "0.2mm", "PLA", "A1", "4h15m", "plate 1"
  base = base
    .replace(/\bplate\s*\d+\b/gi, '')
    .replace(/\b\d+(?:\.\d+)?\s*mm\b/gi, '')
    .replace(/\b(?:PLA|PETG|ABS|ASA|TPU|Matte|Silk|Basic)\b/gi, '')
    .replace(/\b(?:\d+d)?(?:\d+h)?\d+m(?:\d+s)?\b/gi, '')
    .replace(/\b(?:Bambu|A1|A1mini|P1S|P1P|X1C|X1E|H2D|MK4|MK3S|MINI|K1|Ender3)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!base || /^plate\s*\d*$/i.test(base)) return '';
  return base.charAt(0).toUpperCase() + base.slice(1);
}

function hexToRgb(hex) {
  const clean = String(hex || '').replace('#', '').trim();
  if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(clean)) return null;
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function mapHexColorsToAnoFilaments(hexList = []) {
  const mapped = new Set();
  for (const hex of hexList) {
    const rgb = hexToRgb(hex);
    if (!rgb) continue;
    let bestId = 'matt-schwarz';
    let bestDist = Infinity;
    for (const ref of PLA_COLOR_REFS) {
      const dist =
        (rgb.r - ref.r) ** 2 + (rgb.g - ref.g) ** 2 + (rgb.b - ref.b) ** 2;
      if (dist < bestDist) {
        bestDist = dist;
        bestId = ref.id;
      }
    }
    mapped.add(bestId);
  }
  return Array.from(mapped);
}

function computeSuggestedPrice(weightGrams, printTimeSeconds) {
  const g = Number(weightGrams) || 0;
  const hrs = (Number(printTimeSeconds) || 0) / 3600;
  if (g <= 0 && hrs <= 0) return null;
  const raw = 3.5 + g * 0.032 + hrs * 1.45;
  const rounded = Math.max(4.9, Math.round(raw) - 0.1);
  return Math.round(rounded * 100) / 100;
}

function normalizeArrayOrScalar(val) {
  if (Array.isArray(val)) return val[0];
  return val;
}

function formatNumberClean(val, decimals = 2) {
  const n = Number(val);
  if (!Number.isFinite(n)) return '';
  return Number(n.toFixed(decimals)).toString();
}

function sumCommaOrSemicolonNumbers(raw) {
  if (!raw) return 0;
  const nums = String(raw)
    .split(/[,;\s]+/)
    .map((s) => parseFloat(s.replace(/[^\d.-]/g, '')))
    .filter((n) => Number.isFinite(n) && n > 0);
  return nums.reduce((acc, n) => acc + n, 0);
}

function parseGcodeText(text) {
  const result = {
    slicerName: '',
    printTimeSeconds: 0,
    weightGrams: 0,
    filamentMeters: 0,
    layerHeight: '',
    infillDensity: '',
    infillPattern: '',
    nozzleDiameter: '',
    nozzleTemp: null,
    bedTemp: null,
    printerModel: '',
    material: '',
    totalLayers: null,
    supports: null,
    dimensions: '',
    filamentColors: [],
    thumbnailBase64: null,
    thumbnailMime: 'image/png',
  };

  if (!text) return result;

  // Detect slicer name
  if (/BambuStudio|Bambu Studio/i.test(text)) result.slicerName = 'Bambu Studio';
  else if (/OrcaSlicer/i.test(text)) result.slicerName = 'OrcaSlicer';
  else if (/AnycubicSlicer/i.test(text)) result.slicerName = 'Anycubic Slicer';
  else if (/Creality_Print|Creality Print/i.test(text)) result.slicerName = 'Creality Print';
  else if (/PrusaSlicer/i.test(text)) result.slicerName = 'PrusaSlicer';
  else if (/SuperSlicer/i.test(text)) result.slicerName = 'SuperSlicer';
  else if (/Cura_SteamEngine|CURA|FLAVOR:Marlin[\s\S]{0,200};TIME:/i.test(text))
    result.slicerName = 'UltiMaker Cura';

  // Print time patterns (ordered from most authoritative to fallback)
  const timePatterns = [
    /;\s*total estimated time\s*[:=]\s*([^\r\n;]+)/i,
    /;\s*estimated printing time \(normal mode\)\s*[:=]\s*([^\r\n;]+)/i,
    /;\s*estimated printing time\s*[:=]\s*([^\r\n;]+)/i,
    /;\s*model printing time\s*[:=]\s*([^\r\n;]+)/i,
    /;\s*TIME\s*:\s*(\d+)/i,
    /;\s*Build time\s*:\s*([^\r\n;]+)/i,
    /;\s*print_time\s*[:=]\s*([^\r\n;]+)/i,
  ];
  for (const rx of timePatterns) {
    const m = text.match(rx);
    if (m) {
      const secs = parseDurationToSeconds(m[1]);
      if (secs > 0) {
        result.printTimeSeconds = secs;
        break;
      }
    }
  }

  // Filament weight [g]
  const weightPatterns = [
    /;\s*total filament weight\s*\[g\]\s*[:=]\s*([^\r\n]+)/i,
    /;\s*total filament used\s*\[g\]\s*[:=]\s*([^\r\n]+)/i,
    /;\s*filament used\s*\[g\]\s*[:=]\s*([^\r\n]+)/i,
    /;\s*filament_weight_g\s*[:=]\s*([^\r\n]+)/i,
    /;\s*Material#\d+\s+Weight\s*:\s*([\d.]+)/i,
  ];
  for (const rx of weightPatterns) {
    const m = text.match(rx);
    if (m) {
      const grams = sumCommaOrSemicolonNumbers(m[1]);
      if (grams > 0) {
        result.weightGrams = grams;
        break;
      }
    }
  }

  // Filament length [mm] or [m]
  const lenMmMatch = text.match(
    /;\s*(?:total )?filament (?:length|used)\s*\[mm\]\s*[:=]\s*([^\r\n]+)/i
  );
  if (lenMmMatch) {
    const mm = sumCommaOrSemicolonNumbers(lenMmMatch[1]);
    if (mm > 0) result.filamentMeters = mm / 1000;
  } else {
    const lenMMatch = text.match(/;\s*Filament used\s*:\s*([\d.]+)\s*m\b/i);
    if (lenMMatch) {
      result.filamentMeters = parseFloat(lenMMatch[1]) || 0;
    }
  }

  // If weight missing but filament length known -> calculate for 1.75 mm PLA (approx 2.98 g/m)
  if (!result.weightGrams && result.filamentMeters > 0) {
    result.weightGrams = result.filamentMeters * 2.98;
  }

  // Layer height
  const lhMatch =
    text.match(/;\s*layer_height\s*[:=]\s*([\d.]+)/i) ||
    text.match(/;\s*Layer height\s*:\s*([\d.]+)/i);
  if (lhMatch) {
    const lh = parseFloat(lhMatch[1]);
    if (lh > 0 && lh <= 2) result.layerHeight = `${lh.toFixed(2)} mm`;
  }

  // Infill density & pattern
  const infMatch =
    text.match(/;\s*sparse_infill_density\s*[:=]\s*([\d.]+%?)/i) ||
    text.match(/;\s*fill_density\s*[:=]\s*([\d.]+%?)/i);
  if (infMatch) {
    const raw = infMatch[1].trim();
    result.infillDensity = raw.endsWith('%') ? raw : `${raw}%`;
  }
  const patMatch =
    text.match(/;\s*sparse_infill_pattern\s*[:=]\s*([a-z0-9_\- ]+)/i) ||
    text.match(/;\s*fill_pattern\s*[:=]\s*([a-z0-9_\- ]+)/i);
  if (patMatch) {
    const p = patMatch[1].trim();
    if (p && p.length <= 24) {
      result.infillPattern = p.charAt(0).toUpperCase() + p.slice(1);
    }
  }

  // Nozzle diameter
  const nozMatch = text.match(/;\s*nozzle_diameter\s*[:=]\s*([\d.]+)/i);
  if (nozMatch) {
    result.nozzleDiameter = `${formatNumberClean(nozMatch[1], 2)} mm`;
  }

  // Temperatures
  const nozTempMatch =
    text.match(/;\s*nozzle_temperature\s*[:=]\s*(\d+)/i) ||
    text.match(/;\s*(?:first_layer_)?temperature\s*[:=]\s*(\d+)/i) ||
    text.match(/\bM104\s+S(\d{3})\b/);
  if (nozTempMatch) {
    const t = parseInt(nozTempMatch[1], 10);
    if (t >= 150 && t <= 350) result.nozzleTemp = t;
  }

  const bedTempMatch =
    text.match(/;\s*(?:textured_plate_temp|hot_plate_temp|cool_plate_temp|bed_temperature)\s*[:=]\s*(\d+)/i) ||
    text.match(/\bM140\s+S(\d{2,3})\b/);
  if (bedTempMatch) {
    const t = parseInt(bedTempMatch[1], 10);
    if (t >= 20 && t <= 130) result.bedTemp = t;
  }

  // Printer model
  const printerMatch =
    text.match(/;\s*printer_model\s*[:=]\s*([^\r\n]+)/i) ||
    text.match(/;\s*printer_settings_id\s*[:=]\s*([^\r\n]+)/i) ||
    text.match(/;\s*TARGET_MACHINE\.NAME\s*:\s*([^\r\n]+)/i);
  if (printerMatch) {
    result.printerModel = printerMatch[1].replace(/^["']|["']$/g, '').trim();
  }

  // Filament type
  const matMatch = text.match(/;\s*filament_type\s*[:=]\s*([^\r\n]+)/i);
  if (matMatch) {
    result.material = matMatch[1].split(/[;,]/)[0].replace(/^["']|["']$/g, '').trim();
  }

  // Filament hex colors
  const colMatch = text.match(/;\s*filament_colou?r\s*[:=]\s*([^\r\n]+)/i);
  if (colMatch) {
    result.filamentColors = colMatch[1]
      .split(/[;,\s]+/)
      .map((s) => s.replace(/^["']|["']$/g, '').trim())
      .filter((s) => /^#[0-9a-f]{6}/i.test(s));
  }

  // Total layers
  const layerCountMatch =
    text.match(/;\s*total layer number\s*[:=]\s*(\d+)/i) ||
    text.match(/;\s*LAYER_COUNT\s*:\s*(\d+)/i);
  if (layerCountMatch) {
    result.totalLayers = parseInt(layerCountMatch[1], 10);
  }

  // Supports
  const supMatch = text.match(/;\s*(?:enable_support|support_material)\s*[:=]\s*(\d|true|false)/i);
  if (supMatch) {
    result.supports = supMatch[1] === '1' || supMatch[1].toLowerCase() === 'true';
  }

  // Bounding Box (Cura MINX/MAXX... or max_z_height)
  const minX = text.match(/;\s*MINX\s*:\s*([\d.-]+)/i);
  const maxX = text.match(/;\s*MAXX\s*:\s*([\d.-]+)/i);
  const minY = text.match(/;\s*MINY\s*:\s*([\d.-]+)/i);
  const maxY = text.match(/;\s*MAXY\s*:\s*([\d.-]+)/i);
  const minZ = text.match(/;\s*MINZ\s*:\s*([\d.-]+)/i);
  const maxZ = text.match(/;\s*MAXZ\s*:\s*([\d.-]+)/i);
  if (minX && maxX && minY && maxY && maxZ) {
    const dx = Math.round(Math.abs(parseFloat(maxX[1]) - parseFloat(minX[1])));
    const dy = Math.round(Math.abs(parseFloat(maxY[1]) - parseFloat(minY[1])));
    const dz = Math.round(Math.abs(parseFloat(maxZ[1]) - (minZ ? parseFloat(minZ[1]) : 0)));
    if (dx > 0 && dy > 0 && dz > 0) {
      result.dimensions = `${dx} × ${dy} × ${dz} mm`;
    }
  }

  // Embedded G-Code Thumbnail (PrusaSlicer / OrcaSlicer / Bambu / Klipper)
  // Pick the largest thumbnail block if multiple exist
  const thumbRegex =
    /;\s*thumbnail(?:_JPG)?\s+begin\s+(\d+)x(\d+)\s+\d+[\r\n]+([\s\S]*?);\s*thumbnail(?:_JPG)?\s+end/gi;
  let bestThumb = null;
  let match;
  while ((match = thumbRegex.exec(text)) !== null) {
    const w = parseInt(match[1], 10) || 0;
    const h = parseInt(match[2], 10) || 0;
    const area = w * h;
    const isJpg = /thumbnail_JPG/i.test(match[0]);
    const b64 = match[3].replace(/^\s*;\s*/gm, '').replace(/\s+/g, '');
    if (b64.length > 100 && (!bestThumb || area > bestThumb.area)) {
      bestThumb = { area, b64, mime: isJpg ? 'image/jpeg' : 'image/png' };
    }
  }
  if (bestThumb) {
    result.thumbnailBase64 = bestThumb.b64;
    result.thumbnailMime = bestThumb.mime;
  }

  return result;
}

function base64ToUint8Array(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function extractXmlDimensions(xmlText) {
  if (!xmlText || xmlText.length > 16_000_000) return '';
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  let count = 0;

  const rx = /<vertex\s+x="([^"]+)"\s+y="([^"]+)"\s+z="([^"]+)"/g;
  let m;
  while ((m = rx.exec(xmlText)) !== null) {
    const x = parseFloat(m[1]);
    const y = parseFloat(m[2]);
    const z = parseFloat(m[3]);
    if (!Number.isFinite(x)) continue;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
    count++;
    // Safety cap on vertex scans for massive multi-million triangle meshes
    if (count > 250_000) break;
  }

  if (count < 3) return '';
  const dx = Math.round(maxX - minX);
  const dy = Math.round(maxY - minY);
  const dz = Math.round(maxZ - minZ);
  if (dx <= 0 || dy <= 0 || dz <= 0) return '';
  return `${dx} × ${dy} × ${dz} mm`;
}

function parseSliceInfoXml(xmlText) {
  const out = {
    printTimeSeconds: 0,
    weightGrams: 0,
    filamentMeters: 0,
    nozzleDiameter: '',
    printerModel: '',
    material: '',
    filamentColors: [],
    objectName: '',
    platesCount: 0,
  };
  if (!xmlText) return out;

  const plateMatches = xmlText.match(/<plate\b/gi);
  out.platesCount = plateMatches ? plateMatches.length : 1;

  // Parse all <metadata .../> tags regardless of attribute order or quote style
  const metaTagRegex = /<metadata\s+([^>]+?)\/?\s*>/gi;
  let m;
  while ((m = metaTagRegex.exec(xmlText)) !== null) {
    const attrs = m[1];
    const k = attrs.match(/\bkey=["']([^"']+)["']/i)?.[1]?.toLowerCase();
    const v = attrs.match(/\bvalue=["']([^"']+)["']/i)?.[1];
    if (!k || v === undefined) continue;
    if (k === 'prediction') {
      out.printTimeSeconds += parseDurationToSeconds(v);
    } else if (k === 'weight') {
      const w = parseFloat(v);
      if (Number.isFinite(w) && w > 0) out.weightGrams += w;
    } else if ((k === 'nozzle_diameters' || k === 'nozzle_diameter') && !out.nozzleDiameter) {
      const first = v.split(/[,;]/)[0];
      if (parseFloat(first) > 0) out.nozzleDiameter = `${formatNumberClean(first, 2)} mm`;
    } else if (k === 'printer_model' && v.trim()) {
      out.printerModel = v.trim();
    } else if (k === 'printer_model_id' && !out.printerModel && v.trim()) {
      out.printerModel = v.trim();
    }
  }

  // Check filament tags (Bambu Studio / OrcaSlicer)
  let filGrams = 0;
  let filMeters = 0;
  const filTagRegex = /<filament\s+([^>]+?)\/?\s*>/gi;
  while ((m = filTagRegex.exec(xmlText)) !== null) {
    const attrs = m[1];
    const g = attrs.match(/\bused_g=["']([^"']+)["']/i);
    const mt = attrs.match(/\bused_m=["']([^"']+)["']/i);
    const type = attrs.match(/\btype=["']([^"']+)["']/i);
    const col = attrs.match(/\bcolor=["']([^"']+)["']/i);
    if (g) filGrams += parseFloat(g[1]) || 0;
    if (mt) filMeters += parseFloat(mt[1]) || 0;
    if (type && !out.material) out.material = type[1].trim();
    if (col && /^#[0-9a-f]{6}/i.test(col[1])) out.filamentColors.push(col[1].trim());
  }
  if (!out.weightGrams && filGrams > 0) out.weightGrams = filGrams;
  if (filMeters > 0) out.filamentMeters = filMeters;

  const objMatch = xmlText.match(/<object\s+[^>]*\bname=["']([^"']+)["']/i);
  if (objMatch) {
    const candidate = cleanTitleFromFilename(objMatch[1]);
    if (candidate) out.objectName = candidate;
  }

  return out;
}

async function parse3mfFile(file) {
  const rawBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(rawBuffer);

  // Pass 1: Extract only fast lightweight metadata + thumbnail images
  const metaEntries = unzipSync(bytes, {
    filter(entry) {
      const lower = entry.name.toLowerCase();
      if (entry.originalSize > 8_000_000) return false;
      return (
        lower.endsWith('.config') ||
        lower.endsWith('.ini') ||
        lower.endsWith('.json') ||
        lower.endsWith('.png') ||
        lower.endsWith('.jpg') ||
        lower.endsWith('.jpeg')
      );
    },
  });

  const entryMap = new Map();
  for (const [k, v] of Object.entries(metaEntries)) {
    entryMap.set(k.toLowerCase(), { name: k, data: v });
  }

  let slicerName = '';
  let printTimeSeconds = 0;
  let weightGrams = 0;
  let filamentMeters = 0;
  let layerHeight = '';
  let infillDensity = '';
  let infillPattern = '';
  let nozzleDiameter = '';
  let nozzleTemp = null;
  let bedTemp = null;
  let printerModel = '';
  let material = '';
  let totalLayers = null;
  let supports = null;
  let dimensions = '';
  let filamentColors = [];
  let objectName = '';
  let platesCount = 1;

  // 1. Metadata/slice_info.config (Bambu Studio / OrcaSlicer / Anycubic / Creality)
  const sliceInfo = entryMap.get('metadata/slice_info.config');
  if (sliceInfo) {
    const xml = TEXT_DECODER.decode(sliceInfo.data);
    const info = parseSliceInfoXml(xml);
    printTimeSeconds = info.printTimeSeconds;
    weightGrams = info.weightGrams;
    filamentMeters = info.filamentMeters;
    nozzleDiameter = info.nozzleDiameter;
    printerModel = normalizePrinterName(info.printerModel);
    material = info.material;
    filamentColors = info.filamentColors;
    objectName = info.objectName;
    platesCount = info.platesCount || 1;
    if (/bambu/i.test(xml)) slicerName = 'Bambu Studio';
    else if (/orca/i.test(xml)) slicerName = 'OrcaSlicer';
    else slicerName = 'Bambu / Orca Slicer';
  }

  // 2. Metadata/project_settings.config (JSON settings)
  const projSettings = entryMap.get('metadata/project_settings.config');
  if (projSettings) {
    try {
      const cfg = JSON.parse(TEXT_DECODER.decode(projSettings.data));
      if (cfg.from) {
        if (/bambu/i.test(cfg.from)) slicerName = 'Bambu Studio';
        else if (/orca/i.test(cfg.from)) slicerName = 'OrcaSlicer';
      }
      const lh = parseFloat(normalizeArrayOrScalar(cfg.layer_height));
      if (lh > 0 && lh <= 2) layerHeight = `${lh.toFixed(2)} mm`;

      const inf = normalizeArrayOrScalar(cfg.sparse_infill_density);
      if (inf) {
        const s = String(inf).trim();
        infillDensity = s.endsWith('%') ? s : `${s}%`;
      }
      const pat = normalizeArrayOrScalar(cfg.sparse_infill_pattern);
      if (pat) {
        const p = String(pat).trim();
        infillPattern = p.charAt(0).toUpperCase() + p.slice(1);
      }

      const noz = parseFloat(normalizeArrayOrScalar(cfg.nozzle_diameter));
      if (!nozzleDiameter && noz > 0) nozzleDiameter = `${formatNumberClean(noz, 2)} mm`;

      const pm = normalizeArrayOrScalar(cfg.printer_model) || normalizeArrayOrScalar(cfg.printer_settings_id);
      if (pm) {
        printerModel = normalizePrinterName(pm);
      }

      const ft = normalizeArrayOrScalar(cfg.filament_type);
      if (!material && ft) material = String(ft).trim();

      const nt = parseInt(normalizeArrayOrScalar(cfg.nozzle_temperature), 10);
      if (nt >= 150 && nt <= 350) nozzleTemp = nt;

      const bt = parseInt(
        normalizeArrayOrScalar(cfg.textured_plate_temp) ||
          normalizeArrayOrScalar(cfg.hot_plate_temp) ||
          normalizeArrayOrScalar(cfg.cool_plate_temp),
        10
      );
      if (bt >= 20 && bt <= 130) bedTemp = bt;

      if (cfg.enable_support !== undefined) {
        supports = cfg.enable_support === '1' || cfg.enable_support === true;
      }

      if (filamentColors.length === 0 && Array.isArray(cfg.filament_colour)) {
        filamentColors = cfg.filament_colour.filter((c) => /^#[0-9a-f]{6}/i.test(String(c)));
      }
    } catch {
      // ignore malformed JSON
    }
  }

  // 3. PrusaSlicer / Slic3r config INI inside .3mf
  const prusaCfg =
    entryMap.get('metadata/prusaslicer_config.ini') ||
    entryMap.get('metadata/slic3r_pe.config');
  if (prusaCfg) {
    if (!slicerName) slicerName = 'PrusaSlicer';
    const ini = TEXT_DECODER.decode(prusaCfg.data);
    // Prefix lines with "; " so parseGcodeText extracts INI keys uniformly!
    const parsedIni = parseGcodeText(
      ini
        .split(/\r?\n/)
        .map((l) => `; ${l}`)
        .join('\n')
    );
    if (!layerHeight && parsedIni.layerHeight) layerHeight = parsedIni.layerHeight;
    if (!infillDensity && parsedIni.infillDensity) infillDensity = parsedIni.infillDensity;
    if (!infillPattern && parsedIni.infillPattern) infillPattern = parsedIni.infillPattern;
    if (!nozzleDiameter && parsedIni.nozzleDiameter) nozzleDiameter = parsedIni.nozzleDiameter;
    if (!nozzleTemp && parsedIni.nozzleTemp) nozzleTemp = parsedIni.nozzleTemp;
    if (!bedTemp && parsedIni.bedTemp) bedTemp = parsedIni.bedTemp;
    if (!printerModel && parsedIni.printerModel) printerModel = parsedIni.printerModel;
    if (!material && parsedIni.material) material = parsedIni.material;
    if (supports === null && parsedIni.supports !== null) supports = parsedIni.supports;
    if (filamentColors.length === 0 && parsedIni.filamentColors.length > 0) {
      filamentColors = parsedIni.filamentColors;
    }
  }

  // 4. Metadata/plate_1.json (Bambu / Orca bounding box & object name!)
  let bboxXY = null;
  const plateJson = entryMap.get('metadata/plate_1.json');
  if (plateJson) {
    try {
      const pj = JSON.parse(TEXT_DECODER.decode(plateJson.data));
      if (Array.isArray(pj.bbox_all) && pj.bbox_all.length >= 4) {
        bboxXY = {
          dx: Math.round(Math.abs(pj.bbox_all[2] - pj.bbox_all[0])),
          dy: Math.round(Math.abs(pj.bbox_all[3] - pj.bbox_all[1])),
        };
      }
      if (!objectName && Array.isArray(pj.bbox_objects) && pj.bbox_objects[0]?.name) {
        objectName = cleanTitleFromFilename(pj.bbox_objects[0].name);
      }
    } catch {
      // ignore
    }
  }

  // 5. Pass 2 (only when needed): check embedded Metadata/*.gcode for missing time/weight/layers/Z-height
  const needsGcode = !printTimeSeconds || !weightGrams || !totalLayers || (bboxXY && !dimensions);
  if (needsGcode) {
    try {
      const gcodeEntries = unzipSync(bytes, {
        filter(entry) {
          const lower = entry.name.toLowerCase();
          return lower.endsWith('.gcode') && entry.originalSize <= 35_000_000;
        },
      });
      const gcodeKeys = Object.keys(gcodeEntries);
      if (gcodeKeys.length > 0) {
        const gBytes = gcodeEntries[gcodeKeys[0]];
        const head = TEXT_DECODER.decode(gBytes.subarray(0, Math.min(gBytes.length, 140_000)));
        const tailStart = Math.max(0, gBytes.length - 180_000);
        const tail = TEXT_DECODER.decode(gBytes.subarray(tailStart));
        const gMeta = parseGcodeText(`${head}\n${tail}`);

        if (!slicerName && gMeta.slicerName) slicerName = gMeta.slicerName;
        if (!printTimeSeconds && gMeta.printTimeSeconds) printTimeSeconds = gMeta.printTimeSeconds;
        if (!weightGrams && gMeta.weightGrams) weightGrams = gMeta.weightGrams;
        if (!filamentMeters && gMeta.filamentMeters) filamentMeters = gMeta.filamentMeters;
        if (!layerHeight && gMeta.layerHeight) layerHeight = gMeta.layerHeight;
        if (!infillDensity && gMeta.infillDensity) infillDensity = gMeta.infillDensity;
        if (!infillPattern && gMeta.infillPattern) infillPattern = gMeta.infillPattern;
        if (!nozzleDiameter && gMeta.nozzleDiameter) nozzleDiameter = gMeta.nozzleDiameter;
        if (!nozzleTemp && gMeta.nozzleTemp) nozzleTemp = gMeta.nozzleTemp;
        if (!bedTemp && gMeta.bedTemp) bedTemp = gMeta.bedTemp;
        if (!printerModel && gMeta.printerModel) printerModel = gMeta.printerModel;
        if (!material && gMeta.material) material = gMeta.material;
        if (!totalLayers && gMeta.totalLayers) totalLayers = gMeta.totalLayers;
        if (supports === null && gMeta.supports !== null) supports = gMeta.supports;
        if (!dimensions && gMeta.dimensions) dimensions = gMeta.dimensions;

        // Combine plate_1.json XY bbox + max_z_height from embedded gcode!
        if (!dimensions && bboxXY) {
          const maxZMatch = `${head}\n${tail}`.match(/;\s*max_z_height\s*[:=]\s*([\d.]+)/i);
          if (maxZMatch) {
            const dz = Math.round(parseFloat(maxZMatch[1]));
            if (bboxXY.dx > 0 && bboxXY.dy > 0 && dz > 0) {
              dimensions = `${bboxXY.dx} × ${bboxXY.dy} × ${dz} mm`;
            }
          }
        }
      }
    } catch {
      // ignore if gcode too big or malformed
    }
  }

  // 6. Optional mesh bounding box scan from 3D/*.model if dimensions still missing
  if (!dimensions) {
    try {
      const modelEntries = unzipSync(bytes, {
        filter(entry) {
          const lower = entry.name.toLowerCase();
          return lower.endsWith('.model') && entry.originalSize <= 14_000_000;
        },
      });
      for (const data of Object.values(modelEntries)) {
        const dims = extractXmlDimensions(TEXT_DECODER.decode(data));
        if (dims) {
          dimensions = dims;
          break;
        }
      }
    } catch {
      // ignore
    }
  }

  // 7. Pick best embedded preview thumbnail!
  const preferredThumbKeys = [
    'metadata/plate_1.png',
    'metadata/plate_no_light_1.png',
    'metadata/thumbnail.png',
    'metadata/thumbnail_middle.png',
    'thumbnails/thumbnail.png',
    'metadata/top_1.png',
  ];
  let thumbEntry = null;
  for (const k of preferredThumbKeys) {
    if (entryMap.has(k)) {
      thumbEntry = entryMap.get(k);
      break;
    }
  }
  if (!thumbEntry) {
    // Fallback: pick largest PNG/JPG inside archive
    let bestSize = 0;
    for (const [k, v] of entryMap.entries()) {
      if (/\.(png|jpe?g)$/.test(k) && v.data.length > bestSize) {
        bestSize = v.data.length;
        thumbEntry = v;
      }
    }
  }

  let thumbnailFile = null;
  let thumbnailUrl = null;
  if (thumbEntry && thumbEntry.data.length > 64) {
    const isJpg = /\.jpe?g$/i.test(thumbEntry.name);
    const mime = isJpg ? 'image/jpeg' : 'image/png';
    const ext = isJpg ? 'jpg' : 'png';
    const cleanBase = (cleanTitleFromFilename(file.name) || 'slicer-preview')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');
    thumbnailFile = new File([thumbEntry.data], `${cleanBase}-preview.${ext}`, {
      type: mime,
    });
    thumbnailUrl = URL.createObjectURL(thumbnailFile);
  }

  const infill = [infillDensity, infillPattern].filter(Boolean).join(' ').trim();
  const suggestedTitle = objectName || cleanTitleFromFilename(file.name);

  return {
    sourceType: '3mf',
    slicerName: slicerName || '3MF Slicer',
    fileName: file.name,
    suggestedTitle,
    printTimeSeconds,
    printTimeLabel: formatDurationCompact(printTimeSeconds),
    printTimeLong: formatDurationGerman(printTimeSeconds),
    weightGrams: weightGrams ? Math.round(weightGrams * 10) / 10 : 0,
    weightLabel: weightGrams ? `${Math.round(weightGrams)} g` : '',
    filamentMeters: filamentMeters ? Math.round(filamentMeters * 10) / 10 : 0,
    layerHeight,
    infill,
    dimensions,
    nozzleDiameter,
    nozzleTemp,
    bedTemp,
    printerModel,
    material: material || 'PLA',
    totalLayers,
    supports,
    filamentColors,
    suggestedColorIds: mapHexColorsToAnoFilaments(filamentColors),
    suggestedPrice: computeSuggestedPrice(weightGrams, printTimeSeconds),
    thumbnailFile,
    thumbnailUrl,
    platesCount,
  };
}

async function parseGcodeFile(file) {
  // Fast chunked read: first 280 KB + last 320 KB (handles 100 MB+ files effortlessly)
  const headSize = Math.min(file.size, 280 * 1024);
  const tailStart = Math.max(headSize, file.size - 320 * 1024);

  const [headBuf, tailBuf] = await Promise.all([
    file.slice(0, headSize).arrayBuffer(),
    tailStart < file.size ? file.slice(tailStart).arrayBuffer() : Promise.resolve(new ArrayBuffer(0)),
  ]);

  const combined = `${TEXT_DECODER.decode(headBuf)}\n${TEXT_DECODER.decode(tailBuf)}`;
  const g = parseGcodeText(combined);

  let thumbnailFile = null;
  let thumbnailUrl = null;
  if (g.thumbnailBase64) {
    try {
      const imgBytes = base64ToUint8Array(g.thumbnailBase64);
      const ext = g.thumbnailMime === 'image/jpeg' ? 'jpg' : 'png';
      thumbnailFile = new File([imgBytes], `gcode-preview.${ext}`, {
        type: g.thumbnailMime,
      });
      thumbnailUrl = URL.createObjectURL(thumbnailFile);
    } catch {
      // ignore corrupt base64 thumbnail
    }
  }

  const infill = [g.infillDensity, g.infillPattern].filter(Boolean).join(' ').trim();

  return {
    sourceType: 'gcode',
    slicerName: g.slicerName || 'G-Code Slicer',
    fileName: file.name,
    suggestedTitle: cleanTitleFromFilename(file.name),
    printTimeSeconds: g.printTimeSeconds,
    printTimeLabel: formatDurationCompact(g.printTimeSeconds),
    printTimeLong: formatDurationGerman(g.printTimeSeconds),
    weightGrams: g.weightGrams ? Math.round(g.weightGrams * 10) / 10 : 0,
    weightLabel: g.weightGrams ? `${Math.round(g.weightGrams)} g` : '',
    filamentMeters: g.filamentMeters ? Math.round(g.filamentMeters * 10) / 10 : 0,
    layerHeight: g.layerHeight,
    infill,
    dimensions: g.dimensions,
    nozzleDiameter: g.nozzleDiameter,
    nozzleTemp: g.nozzleTemp,
    bedTemp: g.bedTemp,
    printerModel: g.printerModel,
    material: g.material || 'PLA',
    totalLayers: g.totalLayers,
    supports: g.supports,
    filamentColors: g.filamentColors,
    suggestedColorIds: mapHexColorsToAnoFilaments(g.filamentColors),
    suggestedPrice: computeSuggestedPrice(g.weightGrams, g.printTimeSeconds),
    thumbnailFile,
    thumbnailUrl,
    platesCount: 1,
  };
}

async function parseBgcodeFile(file) {
  // PrusaSlicer Binary G-Code: headers & metadata blocks live in the first ~2 MB
  const sliceBuf = await file.slice(0, Math.min(file.size, 3 * 1024 * 1024)).arrayBuffer();
  const view = new DataView(sliceBuf);
  const bytes = new Uint8Array(sliceBuf);

  if (
    bytes.length < 10 ||
    bytes[0] !== 0x47 ||
    bytes[1] !== 0x43 ||
    bytes[2] !== 0x44 ||
    bytes[3] !== 0x45
  ) {
    throw new Error('Ungültige .bgcode Datei.');
  }

  const checksumType = view.getUint16(8, true); // 0 = None, 1 = CRC32
  const checksumSize = checksumType === 1 ? 4 : 0;

  let offset = 10;
  const metaLines = [];
  let bestThumb = null;

  while (offset + 8 <= bytes.length) {
    const blockType = view.getUint16(offset, true);
    const compression = view.getUint16(offset + 2, true);
    const uncompressedSize = view.getUint32(offset + 4, true);
    offset += 8;

    let payloadSize = uncompressedSize;
    if (compression !== 0) {
      if (offset + 4 > bytes.length) break;
      payloadSize = view.getUint32(offset, true);
      offset += 4;
    }

    // Parameter header size per block type
    let paramSize = 0;
    let thumbFmt = -1;
    let thumbArea = 0;
    if (blockType === 0 || blockType === 2 || blockType === 3 || blockType === 4) {
      paramSize = 2; // uint16 encoding
    } else if (blockType === 1) {
      paramSize = 2; // GCode block — stop scanning after first gcode block
      break;
    } else if (blockType === 5) {
      paramSize = 6; // format(2) + width(2) + height(2)
      if (offset + 6 <= bytes.length) {
        thumbFmt = view.getUint16(offset, true);
        const w = view.getUint16(offset + 2, true);
        const h = view.getUint16(offset + 4, true);
        thumbArea = w * h;
      }
    }

    const dataStart = offset + paramSize;
    const dataEnd = dataStart + payloadSize;
    if (dataEnd > bytes.length) break;

    if (compression === 0 && (blockType === 0 || blockType === 2 || blockType === 3 || blockType === 4)) {
      const txt = TEXT_DECODER.decode(bytes.subarray(dataStart, dataEnd));
      for (const line of txt.split(/\r?\n/)) {
        if (line.trim()) metaLines.push(`; ${line.trim()}`);
      }
    } else if (blockType === 5 && compression === 0 && (thumbFmt === 0 || thumbFmt === 1)) {
      if (!bestThumb || thumbArea > bestThumb.area) {
        bestThumb = {
          area: thumbArea,
          mime: thumbFmt === 1 ? 'image/jpeg' : 'image/png',
          bytes: bytes.slice(dataStart, dataEnd),
        };
      }
    }

    offset = dataEnd + checksumSize;
  }

  const g = parseGcodeText(metaLines.join('\n'));
  let thumbnailFile = null;
  let thumbnailUrl = null;
  if (bestThumb && bestThumb.bytes.length > 64) {
    const ext = bestThumb.mime === 'image/jpeg' ? 'jpg' : 'png';
    thumbnailFile = new File([bestThumb.bytes], `bgcode-preview.${ext}`, {
      type: bestThumb.mime,
    });
    thumbnailUrl = URL.createObjectURL(thumbnailFile);
  }

  const infill = [g.infillDensity, g.infillPattern].filter(Boolean).join(' ').trim();

  return {
    sourceType: 'bgcode',
    slicerName: g.slicerName || 'PrusaSlicer (.bgcode)',
    fileName: file.name,
    suggestedTitle: cleanTitleFromFilename(file.name),
    printTimeSeconds: g.printTimeSeconds,
    printTimeLabel: formatDurationCompact(g.printTimeSeconds),
    printTimeLong: formatDurationGerman(g.printTimeSeconds),
    weightGrams: g.weightGrams ? Math.round(g.weightGrams * 10) / 10 : 0,
    weightLabel: g.weightGrams ? `${Math.round(g.weightGrams)} g` : '',
    filamentMeters: g.filamentMeters ? Math.round(g.filamentMeters * 10) / 10 : 0,
    layerHeight: g.layerHeight,
    infill,
    dimensions: g.dimensions,
    nozzleDiameter: g.nozzleDiameter,
    nozzleTemp: g.nozzleTemp,
    bedTemp: g.bedTemp,
    printerModel: g.printerModel,
    material: g.material || 'PLA',
    totalLayers: g.totalLayers,
    supports: g.supports,
    filamentColors: g.filamentColors,
    suggestedColorIds: mapHexColorsToAnoFilaments(g.filamentColors),
    suggestedPrice: computeSuggestedPrice(g.weightGrams, g.printTimeSeconds),
    thumbnailFile,
    thumbnailUrl,
    platesCount: 1,
  };
}

/**
 * Parses a sliced 3D print file (.gcode.3mf, .3mf, .gcode, .gco, .bgcode)
 * directly in the browser and extracts print time, filament weight, layer height,
 * infill, dimensions, temperatures, printer model & embedded preview image.
 */
export async function parseSlicerFile(file) {
  if (!file) throw new Error('Keine Datei ausgewählt.');
  const lower = String(file.name || '').toLowerCase();

  if (lower.endsWith('.3mf')) {
    return parse3mfFile(file);
  }
  if (lower.endsWith('.bgcode')) {
    return parseBgcodeFile(file);
  }
  if (lower.endsWith('.gcode') || lower.endsWith('.gco') || lower.endsWith('.g')) {
    return parseGcodeFile(file);
  }

  throw new Error(
    'Format nicht unterstützt. Bitte nutze .gcode.3mf, .3mf, .gcode oder .bgcode direkt aus deinem Slicer.'
  );
}
