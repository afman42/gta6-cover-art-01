// Leonida Nights — the cover engine. Draws a multi-panel GTA-poster-style
// cover onto a canvas: slanted photo panels, a Vice City sunset or neon
// colour grade, a hand-drawn sun and palm silhouettes, and bold caption
// lettering. Every shape and letter is drawn here from scratch — no
// Rockstar logo, artwork or font is used anywhere.

export const EXPORT_SIZES = {
  square: { w: 1080, h: 1080, label: '1080 x 1080' },
  portrait: { w: 1080, h: 1350, label: '1080 x 1350' },
  wide: { w: 1920, h: 1080, label: '1920 x 1080' },
};

// Panel polygons in normalised coordinates, one set per layout. The
// slanted edges are what make the cover read as a poster, not a grid.
export const LAYOUTS = {
  diagonal: {
    label: 'Diagonal bands',
    panels: [
      [[0, 0], [1, 0], [1, 0.3], [0, 0.44]],
      [[0, 0.48], [1, 0.34], [1, 0.68], [0, 0.8]],
      [[0, 0.84], [1, 0.72], [1, 1], [0, 1]],
    ],
  },
  grid: {
    label: 'Four-panel grid',
    panels: [
      [[0, 0], [0.5, 0], [0.5, 0.5], [0, 0.5]],
      [[0.5, 0], [1, 0], [1, 0.5], [0.5, 0.5]],
      [[0, 0.5], [0.5, 0.5], [0.5, 1], [0, 1]],
      [[0.5, 0.5], [1, 0.5], [1, 1], [0.5, 1]],
    ],
  },
  strip: {
    label: 'Vertical strips',
    panels: [
      [[0, 0], [0.36, 0], [0.3, 1], [0, 1]],
      [[0.38, 0], [0.7, 0], [0.64, 1], [0.32, 1]],
      [[0.72, 0], [1, 0], [1, 1], [0.66, 1]],
    ],
  },
};

export const GRADES = {
  sunset: {
    label: 'Sunset',
    tint: 'rgba(255, 94, 122, 0.26)', tint2: 'rgba(255, 154, 61, 0.16)',
    sun: '#ffd166', sunCore: '#fff3b0', accent: '#ff5e7a', accent2: '#ffb347',
    dark: '#1a0b2e', band: 'rgba(16, 5, 32, 0.88)',
  },
  neon: {
    label: 'Neon',
    tint: 'rgba(255, 46, 166, 0.28)', tint2: 'rgba(123, 47, 255, 0.20)',
    sun: '#00f0ff', sunCore: '#d8fbff', accent: '#ff2ea6', accent2: '#00f0ff',
    dark: '#0d0221', band: 'rgba(10, 2, 33, 0.88)',
  },
  noir: {
    label: 'Noir',
    tint: 'rgba(20, 40, 55, 0.32)', tint2: 'rgba(120, 180, 200, 0.14)',
    sun: '#e8f4f8', sunCore: '#ffffff', accent: '#e8f4f8', accent2: '#9db8c4',
    dark: '#06121a', band: 'rgba(4, 14, 22, 0.88)',
  },
  gold: {
    label: 'Gold hour',
    tint: 'rgba(245, 197, 66, 0.24)', tint2: 'rgba(255, 122, 61, 0.18)',
    sun: '#fff3b0', sunCore: '#fffbe0', accent: '#f5c542', accent2: '#ff7a3d',
    dark: '#241300', band: 'rgba(32, 16, 0, 0.88)',
  },
};

export function panelCount(layout) {
  return LAYOUTS[layout].panels.length;
}

/** Shrinks a normalised polygon toward its centroid, leaving a gutter. */
function shrinkPolygon(poly, factor) {
  let cx = 0, cy = 0;
  for (const [x, y] of poly) { cx += x; cy += y; }
  cx /= poly.length; cy /= poly.length;
  return poly.map(([x, y]) => [cx + (x - cx) * factor, cy + (y - cy) * factor]);
}

function tracePolygon(ctx, poly, w, h) {
  ctx.beginPath();
  ctx.moveTo(poly[0][0] * w, poly[0][1] * h);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0] * w, poly[i][1] * h);
  ctx.closePath();
}

/** Draws one photo cover-fitting a panel, with its zoom and pan applied. */
export function drawPanelPhoto(ctx, img, poly, w, h, zoom, ox, oy) {
  if (!img) return;
  const xs = poly.map(([x]) => x * w), ys = poly.map(([, y]) => y * h);
  const bx = Math.min(...xs), by = Math.min(...ys);
  const bw = Math.max(...xs) - bx, bh = Math.max(...ys) - by;
  const scale = Math.max(bw / img.naturalWidth, bh / img.naturalHeight) * (zoom || 1);
  const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
  const cx = bx + bw / 2 + (ox || 0) * bw * 0.5;
  const cy = by + bh / 2 + (oy || 0) * bh * 0.5;
  ctx.save();
  tracePolygon(ctx, poly, w, h);
  ctx.clip();
  ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
  ctx.restore();
}

/** Washes a panel with the grade's sunset or neon tint, plus a vignette. */
function drawSunsetGrade(ctx, poly, w, h, grade) {
  ctx.save();
  tracePolygon(ctx, poly, w, h);
  ctx.clip();
  const wash = ctx.createLinearGradient(0, 0, 0, h);
  wash.addColorStop(0, grade.tint2);
  wash.addColorStop(1, grade.tint);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  const vig = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75,
  );
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(10, 2, 24, 0.28)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Draws the grade's sun: a glowing disc with retro horizontal slats cut
 *  through its lower half, so it reads as a poster sun, not a plain ball. */
export function drawCoverSun(ctx, w, h, grade) {
  const sx = w * 0.8, sy = h * 0.16, r = Math.min(w, h) * 0.11;
  const glow = ctx.createRadialGradient(sx, sy, r * 0.2, sx, sy, r * 2.1);
  glow.addColorStop(0, grade.sun);
  glow.addColorStop(0.35, grade.sun + '44');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = glow;
  ctx.fillRect(sx - r * 2.1, sy - r * 2.1, r * 4.2, r * 4.2);
  ctx.globalAlpha = 1;
  const disc = ctx.createRadialGradient(sx - r * 0.3, sy - r * 0.3, r * 0.1, sx, sy, r);
  disc.addColorStop(0, grade.sunCore);
  disc.addColorStop(1, grade.sun);
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.fill();
  // Slats across the lower half, growing thicker toward the bottom.
  ctx.fillStyle = grade.dark;
  const slats = [[0.08, 0.035], [0.3, 0.05], [0.55, 0.065]];
  for (const [dy, thick] of slats) {
    const y = sy + r * dy;
    const half = Math.sqrt(Math.max(0, r * r - (y - sy) * (y - sy)));
    ctx.fillRect(sx - half, y, half * 2, r * thick);
  }
}

/** Draws one palm silhouette, trunk and fronds, from canvas paths. */
export function drawPalmSilhouette(ctx, x, y, s, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  // Trunk, leaning slightly.
  ctx.lineWidth = s * 0.055;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + s * 0.02, y - s * 0.55, x + s * 0.12, y - s * 0.92);
  ctx.stroke();
  const tx = x + s * 0.12, ty = y - s * 0.92;
  // Fronds arching up from the crown and drooping down past it, the way
  // a real palm's fronds do — never straight spikes in every direction.
  ctx.lineWidth = s * 0.05;
  const fronds = [-0.62, -0.42, -0.2, 0.05, 0.3, 0.52];
  for (const dx of fronds) {
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(
      tx + dx * s * 0.5, ty - s * 0.42,
      tx + dx * s, ty + s * (0.22 + Math.abs(dx) * 0.25),
    );
    ctx.stroke();
  }
  // Coconuts at the crown.
  ctx.beginPath();
  ctx.arc(tx - s * 0.03, ty + s * 0.03, s * 0.035, 0, Math.PI * 2);
  ctx.arc(tx + s * 0.04, ty + s * 0.04, s * 0.03, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Draws the bold caption lettering with a neon outline and glow. */
export function drawCaptionLettering(ctx, w, h, caption, subtitle, grade, position) {
  const bandH = h * 0.26;
  const bandY = position === 'top' ? 0 : h - bandH;
  const band = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
  if (position === 'top') {
    band.addColorStop(0, grade.band);
    band.addColorStop(1, 'rgba(0, 0, 0, 0)');
  } else {
    band.addColorStop(0, 'rgba(0, 0, 0, 0)');
    band.addColorStop(1, grade.band);
  }
  ctx.fillStyle = band;
  ctx.fillRect(0, bandY, w, bandH);

  const text = (caption || '').trim().toUpperCase();
  const textY = position === 'top' ? h * 0.17 : h - h * 0.055;
  if (text) {
    let size = h * 0.115;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const setFont = () => { ctx.font = `900 ${size}px "Arial Black", Arial, sans-serif`; };
    setFont();
    while (ctx.measureText(text).width > w * 0.92 && size > 14) {
      size -= 3;
      setFont();
    }
    ctx.shadowColor = grade.accent;
    ctx.shadowBlur = size * 0.22;
    ctx.lineWidth = Math.max(2, size * 0.07);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = grade.accent;
    ctx.strokeText(text, w / 2, textY);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, w / 2, textY);
  }

  const sub = (subtitle || '').trim().toUpperCase();
  if (sub) {
    const subSize = Math.max(12, h * 0.021);
    ctx.font = `700 ${subSize}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = grade.accent2;
    const subY = position === 'top' ? h * 0.055 : h - h * 0.165;
    ctx.fillText(sub, w / 2, subY);
    // Thin rules either side of the subtitle.
    const sw = ctx.measureText(sub).width;
    ctx.strokeStyle = grade.accent2;
    ctx.lineWidth = Math.max(1, subSize * 0.08);
    ctx.beginPath();
    ctx.moveTo(w / 2 - sw / 2 - w * 0.06, subY - subSize * 0.35);
    ctx.lineTo(w / 2 - sw / 2 - w * 0.015, subY - subSize * 0.35);
    ctx.moveTo(w / 2 + sw / 2 + w * 0.015, subY - subSize * 0.35);
    ctx.lineTo(w / 2 + sw / 2 + w * 0.06, subY - subSize * 0.35);
    ctx.stroke();
  }
}

/** Draws the thin white poster frame around the whole cover. */
function drawPosterFrame(ctx, w, h) {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.lineWidth = Math.max(3, w * 0.004);
  ctx.strokeRect(w * 0.012, h * 0.012, w * 0.976, h * 0.976);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.lineWidth = Math.max(2, w * 0.002);
  ctx.strokeRect(w * 0.024, h * 0.024, w * 0.952, h * 0.952);
}

/**
 * Draws the whole cover for `state` onto the canvas, at the canvas's own
 * size: panels, grade, sun, palms, caption and frame, in that order.
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const layout = LAYOUTS[state.layout] || LAYOUTS.diagonal;

  ctx.fillStyle = grade.dark;
  ctx.fillRect(0, 0, w, h);

  layout.panels.forEach((poly, i) => {
    const panel = state.panels[i] || {};
    const shrunk = shrinkPolygon(poly, 0.982);
    drawPanelPhoto(ctx, panel.img || null, shrunk, w, h, panel.zoom, panel.ox, panel.oy);
    drawSunsetGrade(ctx, shrunk, w, h, grade);
    // White divider between panels.
    ctx.save();
    tracePolygon(ctx, shrunk, w, h);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = Math.max(2, w * 0.003);
    ctx.stroke();
    ctx.restore();
  });

  if (state.sun) drawCoverSun(ctx, w, h, grade);
  if (state.palms) {
    const s = Math.min(w, h) * 0.22;
    drawPalmSilhouette(ctx, w * 0.02, h * 0.99, s, grade.dark);
    drawPalmSilhouette(ctx, w * 0.86, h * 1.0, s * 0.85, grade.dark);
  }
  drawCaptionLettering(ctx, w, h, state.caption, state.subtitle, grade, state.captionPos || 'bottom');
  drawPosterFrame(ctx, w, h);
}
