// Leonida Nights — wires the cover maker: photo panels, layouts, grades,
// caption, export sizes and the PNG export. A `?shot=` query sets up a
// fixed scene for a screenshot instead (./shots.js). Photos are read on
// this machine only and never uploaded anywhere.
import { drawCover, EXPORT_SIZES, LAYOUTS, GRADES, panelCount } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const captionInput = document.getElementById('caption');
const subtitleInput = document.getElementById('subtitle');
const status = document.getElementById('status');
const sizeLabel = document.getElementById('sizeLabel');
const panelEditors = document.getElementById('panelEditors');

const PANEL_NAMES = ['A', 'B', 'C', 'D'];
const SAMPLES = [
  { id: 'pier', label: 'Pier' },
  { id: 'boulevard', label: 'Boulevard' },
];

const state = {
  layout: 'diagonal',
  grade: 'sunset',
  size: 'square',
  caption: 'Neon Shore',
  subtitle: 'Leonida — two worlds, one night',
  captionPos: 'bottom',
  sun: true,
  palms: true,
  panels: [
    { img: null, sample: 'pier', zoom: 1.15, ox: 0, oy: 0 },
    { img: null, sample: 'boulevard', zoom: 1.1, ox: 0, oy: -0.05 },
    { img: null, sample: 'pier', zoom: 1.3, ox: 0.1, oy: 0 },
    { img: null, sample: 'boulevard', zoom: 1.05, ox: 0, oy: 0 },
  ],
};

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function redraw() {
  const size = EXPORT_SIZES[state.size];
  canvas.width = size.w;
  canvas.height = size.h;
  sizeLabel.textContent = `Live preview — ${size.label}`;
  drawCover(canvas, state);
}

/** Builds one panel's editor: photo picker, sample buttons, zoom and pan. */
function buildPanelEditor(i) {
  const panel = state.panels[i];
  const box = document.createElement('fieldset');
  box.className = 'panel-editor';
  box.dataset.panel = String(i);
  box.innerHTML = `
    <legend>Panel ${PANEL_NAMES[i]}</legend>
    <label>Photo <input type="file" accept="image/*" data-role="file"></label>
    <span class="sample-row">
      <button type="button" data-sample="pier">Pier sample</button>
      <button type="button" data-sample="boulevard">Boulevard sample</button>
      <button type="button" data-role="use-all">Use for all panels</button>
    </span>
    <label>Zoom <input type="range" min="1" max="2" step="0.01" value="${panel.zoom}" data-role="zoom"></label>
    <label>Pan left–right <input type="range" min="-0.5" max="0.5" step="0.01" value="${panel.ox}" data-role="ox"></label>
    <label>Pan up–down <input type="range" min="-0.5" max="0.5" step="0.01" value="${panel.oy}" data-role="oy"></label>`;
  box.querySelector('[data-role="file"]').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    panel.img = await loadImage(URL.createObjectURL(file));
    panel.sample = null;
    redraw();
  });
  box.querySelectorAll('[data-sample]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      panel.sample = btn.dataset.sample;
      panel.img = await loadImage(`samples/${panel.sample}.jpg`);
      redraw();
    });
  });
  box.querySelector('[data-role="use-all"]').addEventListener('click', () => {
    for (const other of state.panels) {
      other.img = panel.img;
      other.sample = panel.sample;
    }
    redraw();
  });
  const bindRange = (role, key) => {
    box.querySelector(`[data-role="${role}"]`).addEventListener('input', (e) => {
      panel[key] = Number(e.target.value);
      redraw();
    });
  };
  bindRange('zoom', 'zoom');
  bindRange('ox', 'ox');
  bindRange('oy', 'oy');
  return box;
}

function refreshPanelEditors() {
  const count = panelCount(state.layout);
  [...panelEditors.children].forEach((box, i) => {
    box.hidden = i >= count;
  });
}

function buildOptionButtons(containerId, entries, current, onPick) {
  const container = document.getElementById(containerId);
  for (const [id, entry] of Object.entries(entries)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = entry.label;
    btn.dataset.value = id;
    btn.setAttribute('aria-pressed', String(id === current));
    btn.addEventListener('click', () => {
      onPick(id);
      [...container.children].forEach((b) => {
        b.setAttribute('aria-pressed', String(b.dataset.value === id));
      });
    });
    container.appendChild(btn);
  }
}

buildOptionButtons('layoutButtons', LAYOUTS, state.layout, (id) => {
  state.layout = id;
  refreshPanelEditors();
  redraw();
});
buildOptionButtons('gradeButtons', GRADES, state.grade, (id) => {
  state.grade = id;
  redraw();
});
buildOptionButtons('sizeButtons', EXPORT_SIZES, state.size, (id) => {
  state.size = id;
  document.getElementById('export').textContent = `Export PNG ${EXPORT_SIZES[id].label}`;
  redraw();
});

for (let i = 0; i < 4; i++) panelEditors.appendChild(buildPanelEditor(i));
refreshPanelEditors();

captionInput.addEventListener('input', () => { state.caption = captionInput.value; redraw(); });
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; redraw(); });
document.getElementById('captionPos').addEventListener('change', (e) => {
  state.captionPos = e.target.value;
  redraw();
});
document.getElementById('sunToggle').addEventListener('change', (e) => {
  state.sun = e.target.checked;
  redraw();
});
document.getElementById('palmsToggle').addEventListener('change', (e) => {
  state.palms = e.target.checked;
  redraw();
});

document.getElementById('export').addEventListener('click', () => {
  const size = EXPORT_SIZES[state.size];
  canvas.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `leonida-nights-${size.w}x${size.h}.png`;
    a.click();
    status.textContent = `Saved leonida-nights-${size.w}x${size.h}.png`;
  }, 'image/png');
});

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), async (patch) => {
    Object.assign(state, patch.state);
    for (let i = 0; i < patch.panels.length; i++) {
      const p = patch.panels[i];
      if (!p) continue;
      Object.assign(state.panels[i], p);
      if (p.sample) state.panels[i].img = await loadImage(`samples/${p.sample}.jpg`);
    }
    captionInput.value = state.caption;
    subtitleInput.value = state.subtitle;
    document.getElementById('export').textContent = `Export PNG ${EXPORT_SIZES[state.size].label}`;
    refreshPanelEditors();
    redraw();
  });
} else {
  (async () => {
    for (const panel of state.panels) {
      panel.img = await loadImage(`samples/${panel.sample}.jpg`);
    }
    redraw();
  })();
}
