// Fixed scenes for screenshots: ?shot=editor shows the page with sample
// photos loaded; ?shot=cover shows the cover alone. Query knobs: layout,
// grade, size, caption, subtitle, pos, sun, palms, and photo (one sample
// for every panel) or p0..p3 (a sample per panel). window.__shotReady is
// set once the cover has been painted.
const SAMPLE_IDS = ['pier', 'boulevard'];

function pickSample(value, fallback) {
  return SAMPLE_IDS.includes(value) ? value : fallback;
}

export async function runShot(shot, query, apply) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const photo = pickSample(query.get('photo'), 'pier');
  const panels = [];
  for (let i = 0; i < 4; i++) {
    const sample = pickSample(query.get(`p${i}`), photo);
    const zoom = Number(query.get(`zoom${i}`));
    panels.push({
      sample,
      zoom: Number.isFinite(zoom) && zoom >= 1 ? zoom : 1.15,
      ox: Number(query.get(`ox${i}`)) || 0,
      oy: Number(query.get(`oy${i}`)) || 0,
    });
  }
  const patch = {
    state: {
      layout: ['diagonal', 'grid', 'strip'].includes(query.get('layout'))
        ? query.get('layout') : 'diagonal',
      grade: ['sunset', 'neon', 'noir', 'gold'].includes(query.get('grade'))
        ? query.get('grade') : 'sunset',
      size: ['square', 'portrait', 'wide'].includes(query.get('size'))
        ? query.get('size') : 'square',
      caption: query.get('caption') ?? 'Neon Shore',
      subtitle: query.get('subtitle') ?? 'Leonida — two worlds, one night',
      captionPos: query.get('pos') === 'top' ? 'top' : 'bottom',
      sun: query.get('sun') !== 'off',
      palms: query.get('palms') !== 'off',
    },
    panels,
  };
  await apply(patch);
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
