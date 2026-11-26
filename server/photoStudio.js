import fs from 'fs';
import os from 'os';
import { generateText } from 'ai';
import { persistGeneratedBuffer } from './storage.js';

export const STUDIO_STYLES = {
  'obsidian-dark': {
    label: 'Dark Obsidian Studio',
    prompt:
      'Keep the exact 3D-printed object from the input photo with its true geometry, proportions, and fine realistic PLA layer texture, and place it naturally on a dark matte charcoal slate surface inside a sleek dark industrial design studio. Dramatic moody side rim-lighting with a subtle warm signal-orange accent reflection, crisp shadow on the surface, ultra-clean dark charcoal background, professional 4:3 studio product photography, sharp focus, no text, no watermarks.',
  },
  'cyber-galaxy': {
    label: 'Cyber Neon Desk',
    prompt:
      'Keep the exact 3D-printed object from the input photo with its true geometry and authentic 3D-printed PLA texture, and stage it on a dark brushed anodized aluminum desk inside a modern dark tech studio. Dramatic rim-lighting with subtle indigo-purple and cool ice-blue ambient glow reflections, crisp product photography, 4:3 framing, shallow depth of field, no text, no watermarks.',
  },
  'warm-atelier': {
    label: 'Architektur-Beton Warm',
    prompt:
      'Keep the exact 3D-printed object from the input photo with its true geometry and subtle horizontal 3D-print PLA layer lines, and place it on a dark matte architectural concrete plinth in a minimalist gallery studio. Warm golden-amber spotlight from the side casting sculptural soft shadows, rich moody dark backdrop, editorial industrial design product photograph, 4:3 aspect ratio, no text, no watermarks.',
  },
  'clean-gallery': {
    label: 'Minimalist Hell-Grau',
    prompt:
      'Keep the exact 3D-printed object from the input photo with its true geometry and realistic 3D-printed PLA texture, and place it on a clean minimalist matte light-gray architectural pedestal with soft diffused studio daylight, gentle natural shadow, high-contrast boutique e-commerce product photography, 4:3 aspect ratio, no text, no watermarks.',
  },
};

const COLOR_PROMPTS = {
  original: 'Preserve the original PLA filament color and finish of the 3D-printed object faithfully.',
  'matt-schwarz':
    'Render the 3D-printed object in deep matte obsidian black PLA filament with subtle fine layer lines.',
  'matt-weiss':
    'Render the 3D-printed object in clean warm matte white PLA filament with subtle fine layer lines.',
  'rot-schwarz':
    'Render the 3D-printed object in glossy dual-color red and black mixed silk PLA filament that shifts between crimson red and obsidian black across curved surfaces.',
  'galaxy-blau-lila':
    'Render the 3D-printed object in shimmering galaxy blue-to-purple iridescent PLA filament with fine metallic galaxy sparkle.',
  pink:
    'Render the 3D-printed object in vibrant saturated satin studio pink PLA filament with crisp highlights.',
};

export function getLanUrls(port = 5173) {
  const nets = os.networkInterfaces();
  const urls = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        urls.push(`http://${net.address}:${port}`);
      }
    }
  }
  return urls;
}

export function isAiGatewayAvailable() {
  return Boolean(
    process.env.AI_GATEWAY_API_KEY ||
      process.env.VERCEL_OIDC_TOKEN ||
      process.env.VERCEL
  );
}

export function buildStudioPrompt({ style = 'obsidian-dark', colorOverride = 'original', customNote = '' }) {
  const preset = STUDIO_STYLES[style] || STUDIO_STYLES['obsidian-dark'];
  const colorInstruction = COLOR_PROMPTS[colorOverride] || COLOR_PROMPTS.original;
  const extra = customNote?.trim() ? ` Additional styling request: ${customNote.trim()}.` : '';
  return `${preset.prompt} ${colorInstruction}${extra}`;
}

export async function transformPhotoWithAiGateway({
  imagePath,
  mimeType,
  style,
  colorOverride,
  customNote,
  outputDir,
}) {
  const modelId = process.env.AI_GATEWAY_IMAGE_MODEL || 'google/gemini-3.1-flash-image';
  const prompt = buildStudioPrompt({ style, colorOverride, customNote });
  const imageBuffer = fs.readFileSync(imagePath);

  const result = await generateText({
    model: modelId,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'file',
            data: imageBuffer,
            mediaType: mimeType || 'image/jpeg',
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      },
    ],
  });

  const imageFile = (result.files || []).find((f) => f.mediaType?.startsWith('image/'));
  if (!imageFile) {
    throw new Error(
      result.text || 'AI Gateway hat kein Bild zurückgegeben. Bitte anderes Foto probieren.'
    );
  }

  const outMime = imageFile.mediaType || 'image/png';
  const ext = outMime.includes('jpeg') || outMime.includes('jpg') ? '.jpg' : '.png';
  const filename = `studio-${Date.now()}-${Math.random().toString(36).slice(2, 7)}${ext}`;
  const buffer = Buffer.from(imageFile.uint8Array);

  const studioUrl = await persistGeneratedBuffer({
    buffer,
    filename,
    mimeType: outMime,
    subfolder: 'studio',
    localDir: outputDir,
  });

  return {
    filename,
    studioUrl,
    modelUsed: `ai-gateway:${modelId}`,
  };
}

export async function transformPhotoWithGemini({
  apiKey,
  imagePath,
  mimeType,
  style,
  colorOverride,
  customNote,
  outputDir,
}) {
  if (!apiKey) {
    throw new Error('Kein direkter Gemini API-Key hinterlegt.');
  }

  const base64Data = fs.readFileSync(imagePath).toString('base64');
  const prompt = buildStudioPrompt({ style, colorOverride, customNote });

  const preferred = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image-preview';
  const modelsToTry = Array.from(
    new Set([preferred, 'gemini-2.5-flash-image'])
  );

  let lastError = 'Unbekannter Gemini API Fehler.';

  for (const model of modelsToTry) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: mimeType || 'image/jpeg',
                  data: base64Data,
                },
              },
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      lastError = data.error?.message || `Gemini API Fehler (${res.status})`;
      if (res.status === 404 || lastError.toLowerCase().includes('not found')) {
        continue;
      }
      throw new Error(lastError);
    }

    const parts = data.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p) => p.inlineData?.data || p.inline_data?.data);

    if (imagePart) {
      const inline = imagePart.inlineData || imagePart.inline_data;
      const outMime = inline.mimeType || inline.mime_type || 'image/png';
      const ext = outMime.includes('jpeg') || outMime.includes('jpg') ? '.jpg' : '.png';
      const filename = `studio-${Date.now()}-${Math.random().toString(36).slice(2, 7)}${ext}`;
      const buffer = Buffer.from(inline.data, 'base64');
      const studioUrl = await persistGeneratedBuffer({
        buffer,
        filename,
        mimeType: outMime,
        subfolder: 'studio',
        localDir: outputDir,
      });

      return {
        filename,
        studioUrl,
        modelUsed: model,
      };
    }

    const textReply = parts.map((p) => p.text).filter(Boolean).join(' ');
    lastError = textReply || 'Gemini hat kein Bild zurückgegeben.';
  }

  throw new Error(lastError);
}
