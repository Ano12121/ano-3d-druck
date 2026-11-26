/**
 * Renders a crisp 1200x900 (4:3) studio-graded product photo directly in the browser
 * as an instant zero-key fallback alongside full Gemini AI background regeneration.
 */
export async function renderLocalStudioLook(file, style = 'obsidian-dark') {
  const bitmap = await createImageBitmap(file);
  const width = 1200;
  const height = 900;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // 1. Cover crop to crisp 4:3
  const targetRatio = width / height;
  const srcRatio = bitmap.width / bitmap.height;
  let sx = 0;
  let sy = 0;
  let sw = bitmap.width;
  let sh = bitmap.height;

  if (srcRatio > targetRatio) {
    sw = bitmap.height * targetRatio;
    sx = (bitmap.width - sw) / 2;
  } else {
    sh = bitmap.width / targetRatio;
    sy = (bitmap.height - sh) / 2;
  }

  // 2. Style-matched studio color grading
  const filterMap = {
    'obsidian-dark': 'contrast(1.18) saturate(1.1) brightness(0.92)',
    'cyber-galaxy': 'contrast(1.22) saturate(1.2) brightness(0.9)',
    'warm-atelier': 'contrast(1.15) saturate(1.08) sepia(0.1) brightness(0.94)',
    'clean-gallery': 'contrast(1.08) saturate(1.05) brightness(1.06)',
  };

  ctx.filter = filterMap[style] || filterMap['obsidian-dark'];
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, width, height);
  ctx.filter = 'none';

  // 3. Dramatic studio lighting & rim vignette
  if (style !== 'clean-gallery') {
    const vig = ctx.createRadialGradient(
      width * 0.5,
      height * 0.46,
      width * 0.2,
      width * 0.5,
      height * 0.5,
      width * 0.72
    );
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(0.68, 'rgba(7,8,12,0.34)');
    vig.addColorStop(1, 'rgba(6,7,11,0.88)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, width, height);
  }

  // 4. Rim-light studio accent glow
  if (style === 'obsidian-dark') {
    const rim = ctx.createRadialGradient(
      width * 0.85,
      height * 0.15,
      20,
      width * 0.85,
      height * 0.15,
      width * 0.55
    );
    rim.addColorStop(0, 'rgba(255, 95, 25, 0.24)');
    rim.addColorStop(1, 'rgba(255, 95, 25, 0)');
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = rim;
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'source-over';
  } else if (style === 'cyber-galaxy') {
    const leftRim = ctx.createRadialGradient(
      width * 0.12,
      height * 0.2,
      20,
      width * 0.12,
      height * 0.2,
      width * 0.52
    );
    leftRim.addColorStop(0, 'rgba(139, 92, 246, 0.28)');
    leftRim.addColorStop(1, 'rgba(139, 92, 246, 0)');
    const rightRim = ctx.createRadialGradient(
      width * 0.88,
      height * 0.8,
      20,
      width * 0.88,
      height * 0.8,
      width * 0.48
    );
    rightRim.addColorStop(0, 'rgba(56, 189, 248, 0.24)');
    rightRim.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = leftRim;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = rightRim;
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'source-over';
  } else if (style === 'warm-atelier') {
    const warm = ctx.createRadialGradient(
      width * 0.2,
      height * 0.15,
      20,
      width * 0.2,
      height * 0.15,
      width * 0.62
    );
    warm.addColorStop(0, 'rgba(251, 191, 36, 0.22)');
    warm.addColorStop(1, 'rgba(251, 191, 36, 0)');
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = warm;
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'source-over';
  }

  bitmap.close?.();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('Bild konnte nicht gerendert werden.'));
        resolve(
          new File([blob], `studio-${Date.now()}.jpg`, { type: 'image/jpeg' })
        );
      },
      'image/jpeg',
      0.93
    );
  });
}
