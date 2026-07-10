/* Procedural blueprint elevation drawings.
   Every listing photo in this build is a placeholder — a hand-drafted
   architectural elevation generated in the brand's own visual language,
   standing in for real listing photography the client will supply. */

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = Math.imul(31, h) + str.charCodeAt(i) | 0; }
  return h;
}

const NAVY = ['#060B16', '#0B1730', '#122142', '#1B2E56', '#2A4270', '#3E5A93'];
const SILVER = ['#FBFBFC', '#F4F5F7', '#E7E9ED', '#D6DADF', '#B9BFC7', '#9AA1AB'];

export function renderElevation(id, w = 900, h = 675) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  const rand = mulberry32(seedFromString(id));

  // paper
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, SILVER[1]);
  sky.addColorStop(1, SILVER[2]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // blueprint grid
  ctx.strokeStyle = 'rgba(6,11,22,0.06)';
  ctx.lineWidth = 1;
  const step = 36;
  for (let x = 0; x <= w; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y <= h; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

  const horizon = h * (0.62 + rand() * 0.06);

  // ground
  ctx.fillStyle = SILVER[2];
  ctx.fillRect(0, horizon, w, h - horizon);
  ctx.strokeStyle = NAVY[3];
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, horizon); ctx.lineTo(w, horizon); ctx.stroke();

  // massing: 1-3 stacked rectangular volumes forming the facade
  const volumes = 1 + Math.floor(rand() * 3);
  const baseW = w * (0.42 + rand() * 0.2);
  let cx = w * (0.3 + rand() * 0.2);
  let footY = horizon;

  ctx.save();
  ctx.strokeStyle = NAVY[2];
  ctx.lineWidth = 3;

  const roofStyle = Math.floor(rand() * 3); // 0 flat, 1 gable, 2 shed

  for (let v = 0; v < volumes; v++) {
    const vw = baseW * (1 - v * 0.22) * (0.85 + rand() * 0.3);
    const vh = h * (0.16 + rand() * 0.14);
    const vx = cx - vw / 2 + (rand() - 0.5) * 40;
    const vy = footY - vh;

    ctx.fillStyle = v % 2 === 0 ? SILVER[0] : SILVER[1];
    ctx.fillRect(vx, vy, vw, vh);
    ctx.strokeRect(vx, vy, vw, vh);

    // roof line on topmost volume
    if (v === volumes - 1) {
      ctx.beginPath();
      if (roofStyle === 1) {
        ctx.moveTo(vx - 14, vy);
        ctx.lineTo(vx + vw / 2, vy - vh * 0.32);
        ctx.lineTo(vx + vw + 14, vy);
      } else if (roofStyle === 2) {
        ctx.moveTo(vx - 10, vy + vh * 0.1);
        ctx.lineTo(vx + vw + 10, vy - vh * 0.22);
      } else {
        ctx.moveTo(vx - 10, vy);
        ctx.lineTo(vx + vw + 10, vy);
      }
      ctx.stroke();
    }

    // windows grid
    const cols = 2 + Math.floor(rand() * 3);
    const rows = 1 + Math.floor(rand() * 2);
    const pad = vw * 0.12;
    const gw = (vw - pad * 2) / cols;
    const gh = (vh - pad * 2) / (rows + 0.4);
    ctx.fillStyle = 'rgba(11,23,48,0.85)';
    ctx.strokeStyle = NAVY[1];
    ctx.lineWidth = 1.4;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const wx = vx + pad + c * gw + gw * 0.12;
        const wy = vy + pad + r * gh + gh * 0.12;
        const ww = gw * 0.76, wh = gh * 0.76;
        ctx.fillRect(wx, wy, ww, wh);
        ctx.strokeRect(wx, wy, ww, wh);
        ctx.beginPath();
        ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh);
        ctx.stroke();
      }
    }

    footY = vy;
    cx += (rand() - 0.5) * 30;
  }
  ctx.restore();

  // ground accents: hedge circles + a walk line
  const accents = 3 + Math.floor(rand() * 5);
  ctx.fillStyle = 'rgba(6,11,22,0.10)';
  for (let i = 0; i < accents; i++) {
    const r = 10 + rand() * 22;
    const gx = rand() * w;
    const gy = horizon + 14 + rand() * (h - horizon - 30);
    ctx.beginPath(); ctx.arc(gx, gy, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(6,11,22,0.18)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(w * 0.5, h);
  ctx.lineTo(w * (0.46 + rand() * 0.1), horizon + 10);
  ctx.stroke();
  ctx.setLineDash([]);

  // crop ticks (drafting mark)
  ctx.strokeStyle = 'rgba(6,11,22,0.35)';
  ctx.lineWidth = 1.5;
  const tick = 22, m = 18;
  [[m, m, 1, 1], [w - m, m, -1, 1], [m, h - m, 1, -1], [w - m, h - m, -1, -1]].forEach(([x, y, dx, dy]) => {
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x + tick * dx, y);
    ctx.moveTo(x, y); ctx.lineTo(x, y + tick * dy);
    ctx.stroke();
  });

  // placeholder label
  ctx.fillStyle = 'rgba(6,11,22,0.55)';
  ctx.font = '600 15px "IBM Plex Mono", monospace';
  ctx.textAlign = 'right';
  ctx.fillText('PLACEHOLDER ELEVATION — REPLACE WITH LISTING PHOTO', w - 30, h - 26);

  return canvas;
}

const cache = new Map();
export function getElevationCanvas(id) {
  if (!cache.has(id)) cache.set(id, renderElevation(id));
  return cache.get(id);
}
