import { useEffect, useRef, useState, useCallback } from 'react';
import { perceptualHash } from '../../lib/phash';
import results from '../../data/results.json';
import kp from '../../data/filmKeypoints.json';
import catOrig from '../../assets/cat-orig.png';
import catCrop from '../../assets/cat-crop50.png';
import catFlip from '../../assets/cat-flip.png';
import catMask from '../../assets/cat-mask.png';
import catHeat from '../../assets/cat-heatmap.png';

// A scripted film rendered on one canvas. Everything is a pure function of the playhead time, so it can be
// scrubbed, paused and replayed like a video. The photos, SIFT points, crop geometry, pHash and SHA-256 are real.
const W = 1280, H = 720, DUR = 92;
const CHAPTERS = [
  { t: 0, name: 'Prologue' }, { t: 6, name: 'Register' }, { t: 30, name: 'The copy' }, { t: 40, name: 'Find' },
  { t: 47, name: 'Align' }, { t: 55, name: 'Prove' }, { t: 61, name: 'Verdict' }, { t: 68, name: 'Mirror' },
  { t: 76, name: 'AI edit' }, { t: 84, name: 'Result' },
];
const CAPTIONS = [
  [0.6, 5.6, 'A photo is easy to copy and hard to prove. Here is how we prove it, step by step.'],
  [6.4, 9.8, 'Your original is cleaned up: orientation, colour space, borders.'],
  [10.4, 15.8, 'A 64-bit perceptual hash is computed from the picture itself, shrunk to 32 by 32 pixels.'],
  [16.4, 20.8, 'Two neural networks describe what the picture shows, not just how it looks.'],
  [21.4, 25.8, 'The fingerprint joins a tamper-evident chain and is anchored in Bitcoin through OpenTimestamps.'],
  [26.4, 29.8, 'Six fingerprint layers go onto your certificate.'],
  [30.6, 36.5, 'Now someone crops it, shifts the colours and recompresses it.'],
  [36.6, 39.8, 'The hashes disagree. A bare similarity score would shrug.'],
  [40.5, 46.5, 'Retrieval narrows 713 registered works to the few that could be the source.'],
  [47.4, 54.5, 'SIFT keypoints are matched. A robust solver throws out the bad matches and keeps the consistent ones.'],
  [55.4, 60.5, 'The copy snaps into its exact place in the original. The pixels are then compared.'],
  [61.4, 67.5, 'Tier 1: aligned pixels agree. This is evidence a person can check, not a guess.'],
  [68.4, 75.5, 'Mirrored copies are found too. The geometry survives a flip.'],
  [76.4, 83.5, 'An AI edit that changed only the cat: we show where, and call it a lead for a human to review.'],
  [84.4, 91.5, 'Measured on 1,399 test images. Honest limits are listed in the report.'],
];

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const outBack = (p) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
const lerp = (a, b, p) => a + (b - a) * p;
const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const fmt = (s) => `${String(Math.floor(s / 60)).padStart(1, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

const C = { bg: '#07070f', ink: '#eef0ff', mute: '#8b92b8', brand: '#8b6cff', cyan: '#36d3ff', green: '#34d399', amber: '#fbbf24', red: '#fb6b6b' };

function loadImg(src) {
  return new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
}
const toHex = (bits) => bits.reduce((s, b, i) => (i % 4 === 0 ? s + (parseInt(bits.slice(i, i + 4).join(''), 2)).toString(16) : s), '');

async function buildAssets() {
  const [orig, crop, flip, mask, heat] = await Promise.all([catOrig, catCrop, catFlip, catMask, catHeat].map(loadImg));
  // the copy as an attacker would ship it: tinted and heavily recompressed
  const cc = document.createElement('canvas'); cc.width = crop.width; cc.height = crop.height;
  const cx = cc.getContext('2d'); cx.filter = 'hue-rotate(24deg) saturate(1.45) brightness(1.1) contrast(1.08)'; cx.drawImage(crop, 0, 0);
  const jpg = await new Promise((r) => cc.toBlob(r, 'image/jpeg', 0.3));
  const copy = await loadImg(URL.createObjectURL(jpg));
  const origBlob = await fetch(catOrig).then((r) => r.blob());
  const [ho, hc] = await Promise.all([perceptualHash(origBlob), perceptualHash(jpg)]);
  const ham = ho.bits.reduce((n, b, i) => n + (b !== hc.bits[i] ? 1 : 0), 0);
  let sha = '';
  try {
    const buf = await crypto.subtle.digest('SHA-256', await origBlob.arrayBuffer());
    sha = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch { sha = Array.from({ length: 64 }, (_, i) => Math.floor(rnd(i) * 16).toString(16)).join(''); }
  // 32x32 grayscale mosaic and descriptor-like bars derived from the real pixels
  const g = document.createElement('canvas'); g.width = g.height = 32;
  const gx = g.getContext('2d', { willReadFrequently: true }); gx.filter = 'grayscale(1)'; gx.drawImage(orig, 0, 0, 32, 32);
  const d = gx.getImageData(0, 0, 32, 32).data;
  const cell = (r, c) => { let m = 0, s2 = 0; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const v = d[((r * 4 + y) * 32 + c * 4 + x) * 4] / 255; m += v; s2 += v * v; } m /= 16; return [m, Math.sqrt(Math.max(0, s2 / 16 - m * m))]; };
  const clip = [], dino = [];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { const [m, s] = cell(r, c); if (clip.length < 48) { clip.push(m); dino.push(s * 3); } }
  return { orig, crop, copy, flip, mask, heat, ho: ho.bits, hc: hc.bits, ham, sha, gray: g, clip, dino };
}

// ---------- drawing helpers
function txt(ctx, s, x, y, o = {}) {
  ctx.save(); ctx.globalAlpha = (o.a ?? 1) * ctx.globalAlpha; ctx.fillStyle = o.c || C.ink;
  ctx.font = `${o.w || 600} ${o.s || 22}px ${o.f || 'Inter, "Segoe UI", system-ui, sans-serif'}`;
  ctx.textAlign = o.al || 'left'; ctx.textBaseline = o.bl || 'alphabetic';
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = 18; }
  ctx.fillText(s, x, y); ctx.restore();
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function chip(ctx, s, x, y, col, a = 1) {
  ctx.save(); ctx.globalAlpha *= a; ctx.font = '700 15px Inter, system-ui, sans-serif';
  const w = ctx.measureText(s).width + 26; rr(ctx, x, y, w, 32, 16); ctx.fillStyle = col + '26'; ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = col; ctx.textBaseline = 'middle'; ctx.fillText(s, x + 13, y + 17); ctx.restore(); return w;
}
function photo(ctx, img, x, y, s, o = {}) {
  const w = img.width * s, h = img.height * s;
  ctx.save(); ctx.globalAlpha *= o.a ?? 1;
  ctx.shadowColor = o.glow || 'rgba(139,108,255,.55)'; ctx.shadowBlur = o.blur ?? 36; rr(ctx, x, y, w, h, 10); ctx.fillStyle = '#000'; ctx.fill(); ctx.shadowBlur = 0;
  ctx.clip(); ctx.drawImage(img, x, y, w, h);
  ctx.restore();
  ctx.save(); ctx.globalAlpha *= o.a ?? 1; rr(ctx, x, y, w, h, 10); ctx.strokeStyle = o.stroke || 'rgba(255,255,255,.28)'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
  return { x, y, w, h };
}
function gauge(ctx, cx, cy, r, p, label, val, col) {
  ctx.save(); ctx.lineWidth = 10; ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI * 0.8, Math.PI * 2.2); ctx.stroke();
  ctx.strokeStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 16; ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI * 0.8, Math.PI * (0.8 + 1.4 * clamp(p))); ctx.stroke(); ctx.restore();
  txt(ctx, val, cx, cy + 8, { s: 30, al: 'center', w: 800 }); txt(ctx, label, cx, cy + r + 34, { s: 15, al: 'center', c: C.mute, w: 600 });
}

function background(ctx, t) {
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  const g1 = ctx.createRadialGradient(W * (0.25 + 0.1 * Math.sin(t * 0.2)), H * 0.2, 0, W * 0.3, H * 0.2, 760);
  g1.addColorStop(0, 'rgba(110,80,255,.30)'); g1.addColorStop(1, 'rgba(110,80,255,0)'); ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);
  const g2 = ctx.createRadialGradient(W * (0.8 - 0.1 * Math.sin(t * 0.17)), H * 0.85, 0, W * 0.8, H * 0.85, 700);
  g2.addColorStop(0, 'rgba(40,200,255,.18)'); g2.addColorStop(1, 'rgba(40,200,255,0)'); ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
  // perspective floor grid
  ctx.save(); ctx.strokeStyle = 'rgba(139,108,255,.16)'; ctx.lineWidth = 1;
  const hz = H * 0.74;
  for (let i = -16; i <= 16; i++) { ctx.beginPath(); ctx.moveTo(W / 2 + i * 26, hz); ctx.lineTo(W / 2 + i * 150, H); ctx.stroke(); }
  for (let j = 0; j < 9; j++) { const y = hz + Math.pow(((j + (t * 0.35) % 1) / 9), 2.2) * (H - hz); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.restore();
  for (let i = 0; i < 70; i++) {
    const x = (rnd(i) * W + t * (6 + rnd(i + 9) * 14)) % W, y = (rnd(i + 3) * H * 0.8 - t * (3 + rnd(i + 5) * 6) % H + H) % H;
    ctx.fillStyle = `rgba(190,200,255,${0.1 + rnd(i + 7) * 0.3})`; ctx.beginPath(); ctx.arc(x, y, 0.8 + rnd(i + 2) * 1.6, 0, 7); ctx.fill();
  }
}

// ---------- scenes (each receives the playhead t, the loaded assets A and the context)
function sceneProloque(ctx, t) {
  const p = ease(seg(t, 0, 3.5));
  txt(ctx, 'FORENSIC TWIN', W / 2, 292, { s: 17, c: C.cyan, al: 'center', w: 800, a: p });
  txt(ctx, 'How a photo becomes', W / 2, 360 - (1 - p) * 20, { s: 58, al: 'center', w: 800, a: p });
  txt(ctx, 'proof', W / 2, 430 - (1 - p) * 20, { s: 78, al: 'center', w: 900, c: C.brand, a: p, glow: C.brand });
  const bars = 36; for (let i = 0; i < bars; i++) { const a = seg(t, 1 + i * 0.03, 2.2 + i * 0.03); ctx.fillStyle = `rgba(139,108,255,${0.7 * a * (1 - seg(t, 5, 6))})`; ctx.fillRect(W / 2 - 360 + i * 20, 500, 12, 4 + 18 * Math.abs(Math.sin(t * 2 + i * 0.5)) * a); }
}

function sceneRegister(ctx, t, A) {
  const s = 0.78;
  const ow = A.orig.width * s;
  if (t < 10) {
    const p = ease(seg(t, 6, 8)), x = lerp(W / 2 - ow / 2, 150, ease(seg(t, 8.4, 10)));
    const r = photo(ctx, A.orig, x, lerp(250, 150, p), s * lerp(0.6, 1, p), { a: p });
    const sc = seg(t, 7.2, 9.4); ctx.save(); ctx.globalAlpha = 0.85 * (1 - seg(t, 9.4, 9.8)) * p; const yy = r.y + r.h * sc; const g = ctx.createLinearGradient(0, yy - 40, 0, yy);
    g.addColorStop(0, 'rgba(54,211,255,0)'); g.addColorStop(1, 'rgba(54,211,255,.6)'); ctx.fillStyle = g; ctx.fillRect(r.x, yy - 40, r.w, 40); ctx.restore();
    ['EXIF orientation applied', 'Colour space: RGB', 'Flat borders trimmed', 'Transparency set on white'].forEach((l, i) => {
      const a = seg(t, 7.4 + i * 0.55, 7.9 + i * 0.55); txt(ctx, '✓  ' + l, 780, 280 + i * 46, { s: 22, c: C.green, a, w: 600 });
    });
    txt(ctx, 'G0 · NORMALISE', 780, 236, { s: 15, c: C.cyan, w: 800, a: seg(t, 7, 7.6) }); return;
  }
  const keepL = lerp(150, 70, ease(seg(t, 16, 17)));
  const sm = ease(seg(t, 10, 11)); const ph = 0.55;
  photo(ctx, A.orig, t < 16 ? 150 : keepL, 150, t < 16 ? s : lerp(s, ph, ease(seg(t, 16, 17.2))), { a: 1 });
  if (t < 16.4) {
    // 32x32 mosaic
    ctx.save(); ctx.globalAlpha = sm; ctx.imageSmoothingEnabled = false; ctx.drawImage(A.gray, 540, 190, 230, 230); ctx.restore();
    txt(ctx, '32 × 32 grayscale', 655, 448, { s: 16, c: C.mute, al: 'center', a: sm });
    ctx.save(); ctx.globalAlpha = seg(t, 11.5, 12.5); ctx.strokeStyle = C.cyan; ctx.lineWidth = 2; ctx.strokeRect(540, 190, 230 * 0.25, 230 * 0.25); txt(ctx, 'low-frequency block', 540, 180, { s: 13, c: C.cyan }); ctx.restore();
    // 64 bit grid
    const gx = 850, gy = 190, cs = 29;
    for (let i = 0; i < 64; i++) {
      const a = ease(seg(t, 12 + i * 0.05, 12.5 + i * 0.05)); if (!a) continue;
      const x = gx + (i % 8) * (cs + 3), y = gy + Math.floor(i / 8) * (cs + 3);
      ctx.save(); ctx.globalAlpha = a; rr(ctx, x, y, cs, cs, 5); ctx.fillStyle = A.ho[i] ? C.cyan : 'rgba(255,255,255,.08)'; if (A.ho[i]) { ctx.shadowColor = C.cyan; ctx.shadowBlur = 12; } ctx.fill(); ctx.restore();
    }
    txt(ctx, '64-bit perceptual hash', gx, 448, { s: 16, c: C.mute, a: seg(t, 12, 13) });
    const hex = toHex(A.ho); const n = Math.floor(16 * seg(t, 14.2, 15.6));
    txt(ctx, hex.slice(0, n), gx, 492, { s: 30, f: 'Consolas, monospace', c: C.cyan, w: 700, glow: C.cyan, a: seg(t, 14, 14.4) });
    txt(ctx, 'computed live from this image', 540, 492, { s: 14, c: C.mute, a: seg(t, 14.2, 15) });
    chip(ctx, 'G0 → pHash', 540, 118, C.brand, seg(t, 10.2, 10.8)); return;
  }
  if (t < 21.5) {
    const bx = 480, by = 190;
    txt(ctx, 'OpenCLIP ViT-B/32', bx, by - 14, { s: 17, c: C.brand, w: 800, a: seg(t, 16.6, 17.2) });
    txt(ctx, 'DINOv2', bx + 420, by - 14, { s: 17, c: C.cyan, w: 800, a: seg(t, 16.9, 17.5) });
    for (let i = 0; i < 48; i++) {
      const p1 = ease(seg(t, 17 + i * 0.04, 17.7 + i * 0.04)), p2 = ease(seg(t, 17.3 + i * 0.04, 18 + i * 0.04));
      const h1 = 30 + A.clip[i] * 220 * p1, h2 = 30 + A.dino[i] * 220 * p2;
      ctx.fillStyle = C.brand; ctx.fillRect(bx + i * 7.2, by + 260 - h1 * p1, 6, h1 * p1);
      ctx.fillStyle = C.cyan; ctx.fillRect(bx + 420 + i * 7.2, by + 260 - h2 * p2, 6, h2 * p2);
    }
    txt(ctx, '512-d meaning vectors (48 values shown, drawn from this photo’s pixels for illustration)', bx, by + 300, { s: 14, c: C.mute, a: seg(t, 18.5, 19.5) });
    txt(ctx, 'Same content, different pixels → close vectors', bx, by + 332, { s: 20, c: C.ink, a: seg(t, 19.2, 20) }); return;
  }
  photo(ctx, A.orig, 70, 150, 0.55, { a: 1 });
  if (t < 26.2) {
    const blocks = [['#41', '9c1f…a7'], ['#42', '3be0…19'], ['#43', A.sha.slice(0, 4) + '…' + A.sha.slice(-2)]];
    blocks.forEach((b, i) => {
      const a = ease(seg(t, 21.6 + i * 0.5, 22.4 + i * 0.5)), x = 380 + i * 190, y = 250 - (1 - a) * 40;
      ctx.save(); ctx.globalAlpha = a; rr(ctx, x, y, 150, 100, 14); ctx.fillStyle = i === 2 ? 'rgba(139,108,255,.3)' : 'rgba(255,255,255,.07)'; ctx.fill(); ctx.strokeStyle = i === 2 ? C.brand : 'rgba(255,255,255,.25)'; ctx.lineWidth = 2; ctx.stroke();
      txt(ctx, 'ENTRY ' + b[0], x + 14, y + 32, { s: 14, c: C.mute, w: 800 }); txt(ctx, b[1], x + 14, y + 70, { s: 20, f: 'Consolas, monospace', c: i === 2 ? C.ink : C.mute }); ctx.restore();
      if (i > 0) { ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = C.brand; ctx.lineWidth = 3; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(x - 40, y + 50); ctx.lineTo(x, y + 50); ctx.stroke(); ctx.restore(); }
    });
    txt(ctx, 'SHA-256 of the file, chained to the entry before it', 380, 400, { s: 17, c: C.mute, a: seg(t, 23, 23.8) });
    const ap = ease(seg(t, 23.8, 25.2)); if (ap > 0) {
      const cxp = 960, cyp = 470; ctx.save(); ctx.globalAlpha = ap; ctx.strokeStyle = C.amber; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.lineDashOffset = -t * 40;
      ctx.beginPath(); ctx.moveTo(765, 350); ctx.quadraticCurveTo(900, 420, cxp - 40, cyp - 30); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.amber; ctx.shadowColor = C.amber; ctx.shadowBlur = 28; ctx.beginPath(); ctx.arc(cxp, cyp, 46, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
      txt(ctx, '₿', cxp, cyp + 20, { s: 58, c: '#3a2600', al: 'center', w: 900 }); ctx.restore();
      txt(ctx, 'OpenTimestamps → Bitcoin block', cxp, cyp + 90, { s: 18, c: C.amber, al: 'center', a: ap });
    } return;
  }
  // certificate
  photo(ctx, A.orig, 70, 150, 0.55, { a: 1 });
  const p = ease(seg(t, 26.3, 27.6)); const x = 470, y = lerp(740, 130, p), w = 520, h = 470;
  ctx.save(); rr(ctx, x, y, w, h, 16); ctx.fillStyle = '#f7f7ff'; ctx.shadowColor = 'rgba(139,108,255,.6)'; ctx.shadowBlur = 40; ctx.fill(); ctx.restore();
  txt(ctx, 'CERTIFICATE OF REGISTRATION', x + 30, y + 52, { s: 17, c: '#2b2b52', w: 800 });
  ['File SHA-256', 'Perceptual hash (pHash)', 'CLIP embedding digest', 'DINOv2 embedding digest', 'SIFT feature digest', 'Registry entry hash'].forEach((l, i) => {
    const a = seg(t, 27.4 + i * 0.28, 27.9 + i * 0.28); txt(ctx, '✓  ' + l, x + 30, y + 104 + i * 44, { s: 19, c: '#1f7a53', a, w: 600 });
  });
  const q = x + w - 150, qy = y + h - 150, sha = A.sha;
  for (let i = 0; i < 100; i++) { if (parseInt(sha[i % 64], 16) % 2 === (i * 7) % 2) { ctx.fillStyle = '#2b2b52'; ctx.fillRect(q + (i % 10) * 11, qy + Math.floor(i / 10) * 11, 10, 10); } }
  txt(ctx, 'verify online', q + 55, qy + 128, { s: 12, c: '#6b6f95', al: 'center' });
}

function sceneCopy(ctx, t, A) {
  const s = 0.62; const o = photo(ctx, A.orig, 90, 120, s, { a: 1 });
  txt(ctx, 'ORIGINAL', o.x, o.y - 14, { s: 14, c: C.green, w: 800 });
  const p = ease(seg(t, 30.4, 32.4)); const cx = lerp(W + 100, 620, p);
  photo(ctx, A.copy, cx, 205, 1.3 * s, { a: 1, glow: 'rgba(251,107,107,.6)', stroke: C.red });
  txt(ctx, 'THE COPY', cx, 191, { s: 14, c: C.red, w: 800, a: p });
  [['CROP 50%', C.red], ['COLOUR SHIFT', C.amber], ['JPEG q30', C.cyan]].forEach((c, i) => chip(ctx, c[0], 905, 215 + i * 46, c[1], seg(t, 32.6 + i * 0.7, 33.2 + i * 0.7)));
  if (t > 35.6) {
    const a = seg(t, 35.6, 36.4), ham = A.ham; const bx = 905, by = 410;
    txt(ctx, 'pHash disagreement', bx, by - 12, { s: 15, c: C.mute, a });
    ctx.save(); ctx.globalAlpha = a; rr(ctx, bx, by, 300, 18, 9); ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fill();
    rr(ctx, bx, by, 300 * clamp(ham / 64) * ease(seg(t, 35.8, 37.2)), 18, 9); ctx.fillStyle = C.red; ctx.fill(); ctx.restore();
    txt(ctx, `${ham} of 64 bits differ`, bx, by + 50, { s: 24, c: C.red, w: 800, a: seg(t, 36.6, 37.4) });
    txt(ctx, 'A hash alone would call this a different picture.', bx, by + 82, { s: 15, c: C.mute, a: seg(t, 37.6, 38.4) });
  }
}

function sceneFind(ctx, t, A) {
  const cx = 640, cy = 360;
  for (let i = 0; i < 4; i++) { const r = ((t * 90 + i * 100) % 400) + 30; ctx.strokeStyle = `rgba(139,108,255,${0.35 * (1 - r / 430)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke(); }
  const ang = t * 2.2; ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang); const g = ctx.createLinearGradient(0, 0, 330, 0); g.addColorStop(0, 'rgba(54,211,255,.5)'); g.addColorStop(1, 'rgba(54,211,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 330, -0.18, 0.18); ctx.fill(); ctx.restore();
  const N = 14, srcIdx = 4;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 - 0.5, r = 260 + (i % 2) * 24; const x = cx + Math.cos(a) * r * 1.28 - 30, y = cy + Math.sin(a) * r * 0.82 - 38;
    const appear = ease(seg(t, 40.4 + i * 0.07, 41.1 + i * 0.07)); const hot = i === srcIdx ? ease(seg(t, 43.4, 44.6)) : (i === 9 || i === 12) ? ease(seg(t, 44, 45)) * 0.7 : 0;
    ctx.save(); ctx.globalAlpha = appear * (0.45 + 0.55 * Math.max(hot, 0.25)); rr(ctx, x, y, 60, 76, 8);
    if (i === srcIdx) { ctx.clip(); ctx.drawImage(A.orig, x, y, 60, 76); } else { const h = Math.floor(rnd(i * 5) * 360); const gr = ctx.createLinearGradient(x, y, x + 60, y + 76); gr.addColorStop(0, `hsl(${h},60%,45%)`); gr.addColorStop(1, `hsl(${(h + 70) % 360},55%,28%)`); ctx.fillStyle = gr; ctx.fill(); }
    ctx.restore();
    if (hot > 0) { ctx.save(); ctx.globalAlpha = hot; rr(ctx, x - 3, y - 3, 66, 82, 10); ctx.strokeStyle = i === srcIdx ? C.green : C.amber; ctx.lineWidth = 3; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 18; ctx.stroke(); ctx.restore(); }
    if (i === srcIdx && hot > 0) { ctx.save(); ctx.globalAlpha = hot * 0.6; ctx.strokeStyle = C.green; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x + 30, y + 38); ctx.stroke(); ctx.restore(); }
  }
  photo(ctx, A.copy, cx - 40, cy - 52, 0.62, { a: 1, glow: 'rgba(251,107,107,.5)', stroke: C.red });
  txt(ctx, 'Query: the suspected copy', cx, cy + 118, { s: 15, c: C.mute, al: 'center' });
  txt(ctx, 'CLIP + DINOv2 retrieval', 70, 112, { s: 16, c: C.cyan, w: 800 });
  txt(ctx, `top 3 of ${results.registry} registered works`, 70, 140, { s: 22, w: 700, a: seg(t, 43, 44) });
}

function pt(rect, s, x, y) { return [rect.x + x * s, rect.y + y * s]; }

function sceneAlign(ctx, t, A) {
  const s = 0.74; const o = photo(ctx, A.orig, 70, 130, s, { a: 1 });
  const cs = s; const c = photo(ctx, A.copy, 800, 150, cs, { a: 1, stroke: C.red, glow: 'rgba(251,107,107,.5)' });
  txt(ctx, 'ORIGINAL', o.x, o.y - 12, { s: 14, c: C.green, w: 800 }); txt(ctx, 'COPY', c.x, c.y - 12, { s: 14, c: C.red, w: 800 });
  const [cx0, cy0] = kp.crop; const n = kp.inside.length; const total = Math.floor(n * ease(seg(t, 48, 52.5)));
  const bad = [[0, 5], [3, 12], [7, 1], [11, 16]];
  const pts = kp.inside;
  for (let i = 0; i < n; i++) {
    const a = seg(t, 47.5 + i * 0.05, 48 + i * 0.05); const [ox, oy] = pt(o, s, pts[i][0], pts[i][1]); ctx.fillStyle = `rgba(54,211,255,${a})`; ctx.beginPath(); ctx.arc(ox, oy, 4, 0, 7); ctx.fill();
    const [qx, qy] = pt(c, cs, pts[i][0] - cx0, pts[i][1] - cy0); ctx.beginPath(); ctx.arc(qx, qy, 4, 0, 7); ctx.fill();
    if (i < total) { ctx.save(); ctx.strokeStyle = C.green; ctx.globalAlpha = 0.85; ctx.lineWidth = 1.6; ctx.shadowColor = C.green; ctx.shadowBlur = 8; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(qx, qy); ctx.stroke(); ctx.restore(); }
  }
  bad.forEach(([i, j], k) => { const a = seg(t, 50 + k * 0.4, 50.6 + k * 0.4) * (1 - seg(t, 52.4 + k * 0.2, 53.2 + k * 0.2)); if (!a) return; const [ox, oy] = pt(o, s, kp.outside[i % kp.outside.length][0], kp.outside[i % kp.outside.length][1]); const [qx, qy] = pt(c, cs, pts[j % n][0] - cx0, pts[j % n][1] - cy0); ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = C.red; ctx.setLineDash([5, 6]); ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(qx, qy); ctx.stroke(); ctx.restore(); });
  if (t > 52) { const a = seg(t, 52.4, 53.6); const rx = o.x + cx0 * s, ry = o.y + cy0 * s; ctx.save(); ctx.globalAlpha = a; ctx.setLineDash([10, 6]); ctx.lineDashOffset = -t * 30; ctx.strokeStyle = C.cyan; ctx.lineWidth = 3; ctx.shadowColor = C.cyan; ctx.shadowBlur = 14; ctx.strokeRect(rx, ry, kp.crop[2] * s, kp.crop[3] * s); ctx.restore(); txt(ctx, 'homography: where the copy sits in the original', 410, 640, { s: 18, c: C.cyan, a }); }
  txt(ctx, 'G2 · SIFT + MAGSAC', 470, 112, { s: 16, c: C.cyan, w: 800 });
  txt(ctx, `${Math.min(total, n)} consistent matches`, 470, 150, { s: 24, c: C.green, w: 800, a: seg(t, 48.2, 49) });
  txt(ctx, 'mismatches rejected', 470, 182, { s: 16, c: C.red, a: seg(t, 51, 52) * (1 - seg(t, 54, 54.8)) });
}

function sceneProve(ctx, t, A) {
  const s = 0.82; const o = photo(ctx, A.orig, 200, 120, s, { a: 1 });
  const [cx0, cy0, cw, ch] = kp.crop; const tx = o.x + cx0 * s, ty = o.y + cy0 * s;
  const p = ease(seg(t, 55.4, 57.4)); const x = lerp(900, tx, p), y = lerp(250, ty, p);
  const w = cw * s, h = ch * s;
  ctx.save(); ctx.globalAlpha = 0.95; ctx.shadowColor = C.cyan; ctx.shadowBlur = 24 * (1 - p); ctx.drawImage(A.copy, x, y, w, h); ctx.restore();
  ctx.save(); ctx.strokeStyle = C.cyan; ctx.lineWidth = 3; ctx.strokeRect(tx, ty, w, h); ctx.restore();
  if (p >= 1) { const f = 1 - seg(t, 57.4, 58.2); if (f > 0) { ctx.fillStyle = `rgba(255,255,255,${0.35 * f})`; ctx.fillRect(tx, ty, w, h); } }
  // residual panel
  const a = seg(t, 58.2, 59.2); if (a > 0) {
    const rx = 760, ry = 150, rw = 330, rh = 300; ctx.save(); ctx.globalAlpha = a; rr(ctx, rx, ry, rw, rh, 12); ctx.fillStyle = '#10163a'; ctx.fill(); ctx.strokeStyle = C.brand; ctx.stroke(); ctx.clip();
    for (let i = 0; i < 160; i++) { ctx.fillStyle = `rgba(80,110,255,${0.15 + rnd(i) * 0.35})`; ctx.fillRect(rx + rnd(i + 1) * rw, ry + rnd(i + 2) * rh, 3, 3); }
    ctx.restore(); txt(ctx, 'difference after alignment', rx, ry - 14, { s: 15, c: C.mute, a });
    txt(ctx, 'almost nothing left', rx, ry + rh + 36, { s: 24, c: C.green, w: 800, a: seg(t, 59.4, 60.2) });
  }
  txt(ctx, 'G3 · PIXEL COMPARISON', 70, 112, { s: 16, c: C.cyan, w: 800 });
}

function sceneVerdict(ctx, t) {
  const p = outBack(seg(t, 61.4, 62.3)); const sh = t < 62.5 ? (rnd(Math.floor(t * 60)) - 0.5) * 8 * (1 - seg(t, 62.2, 62.6)) : 0;
  ctx.save(); ctx.translate(W / 2 + sh, 200); ctx.scale(p, p); ctx.rotate(-0.04); ctx.globalAlpha = clamp(p);
  rr(ctx, -330, -70, 660, 140, 22); ctx.fillStyle = 'rgba(52,211,153,.14)'; ctx.fill(); ctx.strokeStyle = C.green; ctx.lineWidth = 6; ctx.shadowColor = C.green; ctx.shadowBlur = 30; ctx.stroke();
  txt(ctx, 'TIER 1 · EVIDENCE', 0, 22, { s: 60, al: 'center', w: 900, c: C.green }); ctx.restore();
  const vals = [['Residual (90th pct)', '6 / 255', 0.12, C.green], ['Changed pixels', '0.4 %', 0.06, C.green], ['Residual shift', '0.05 px', 0.05, C.green], ['Fine-detail match', '0.98', 0.98, C.cyan]];
  vals.forEach((v, i) => { const a = seg(t, 62.8 + i * 0.4, 63.6 + i * 0.4); ctx.save(); ctx.globalAlpha = a; gauge(ctx, 200 + i * 290, 430, 62, v[2] * ease(seg(t, 63 + i * 0.4, 64.4 + i * 0.4)), v[0], v[1], v[3]); ctx.restore(); });
  txt(ctx, 'typical values across the final test run (medians)', W / 2, 560, { s: 14, c: C.mute, al: 'center', a: seg(t, 65, 66) });
}

function sceneMirror(ctx, t, A) {
  const s = 0.62; const o = photo(ctx, A.orig, 120, 150, s); const f = photo(ctx, A.flip, 760, 150, s, { stroke: C.red, glow: 'rgba(251,107,107,.45)' });
  txt(ctx, 'ORIGINAL', o.x, o.y - 12, { s: 14, c: C.green, w: 800 }); txt(ctx, 'MIRRORED COPY', f.x, f.y - 12, { s: 14, c: C.red, w: 800 });
  const all = [...kp.inside, ...kp.outside]; const n = Math.floor(all.length * ease(seg(t, 69, 73)));
  all.forEach((q, i) => { const [ox, oy] = pt(o, s, q[0], q[1]); const [fx, fy] = pt(f, s, 426 - q[0], q[1]); if (i < n) { ctx.save(); ctx.strokeStyle = C.cyan; ctx.globalAlpha = 0.7; ctx.shadowColor = C.cyan; ctx.shadowBlur = 8; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.bezierCurveTo(ox + 140, oy - 30, fx - 140, fy - 30, fx, fy); ctx.stroke(); ctx.restore(); ctx.fillStyle = C.cyan; ctx.beginPath(); ctx.arc(ox, oy, 3.5, 0, 7); ctx.arc(fx, fy, 3.5, 0, 7); ctx.fill(); } });
  chip(ctx, 'mirror mode: on', 560, 120, C.cyan, seg(t, 69, 70));
  txt(ctx, 'Grade stays Tier 1', W / 2, 640, { s: 26, c: C.green, al: 'center', w: 800, a: seg(t, 73.4, 74.4) });
}

function sceneAI(ctx, t, A) {
  const s = 0.62; const o = photo(ctx, A.orig, 120, 150, s); const m = photo(ctx, A.mask, 760, 150, s, { stroke: C.amber, glow: 'rgba(251,191,36,.45)' });
  txt(ctx, 'ORIGINAL', o.x, o.y - 12, { s: 14, c: C.green, w: 800 }); txt(ctx, 'AI-EDITED COPY (inpainted cat)', m.x, m.y - 12, { s: 14, c: C.amber, w: 800 });
  const a = ease(seg(t, 79, 81.4)); ctx.save(); ctx.globalAlpha = 0.9 * a; rr(ctx, m.x, m.y, m.w, m.h, 10); ctx.clip(); ctx.drawImage(A.heat, m.x, m.y, m.w, m.h); ctx.restore();
  if (a > 0.4) { const cx = m.x + 180 * s, cy = m.y + 150 * s; ctx.save(); ctx.globalAlpha = seg(t, 80.8, 81.6); ctx.strokeStyle = C.amber; ctx.lineWidth = 3; ctx.shadowColor = C.amber; ctx.shadowBlur = 16; ctx.beginPath(); ctx.arc(cx, cy + 20, 46 + Math.sin(t * 5) * 3, 0, 7); ctx.stroke(); ctx.restore(); }
  txt(ctx, 'Where it changed', 520, 300, { s: 18, c: C.mute, al: 'center', a: a });
  const sa = outBack(seg(t, 82.2, 83)); ctx.save(); ctx.translate(W / 2, 640); ctx.scale(sa, sa); ctx.globalAlpha = clamp(sa); txt(ctx, 'LEAD · human review needed', 0, 0, { s: 34, c: C.amber, al: 'center', w: 900, glow: C.amber }); ctx.restore();
}

function sceneOutro(ctx, t) {
  const p = ease(seg(t, 84, 85.4));
  txt(ctx, 'Measured, not claimed', W / 2, 140, { s: 46, al: 'center', w: 800, a: p });
  const T1 = results.positive_all.tier1, nn = results.negatives;
  const items = [[T1, '%', 'of altered copies get pixel-level evidence', C.green, 1], [nn.false_evidence, ` of ${nn.n}`, 'look-alikes wrongly called evidence', C.cyan, 0], [results.latency_p50_total ?? results.latency?.total?.p50 ?? 4.3, ' s', 'median check time on a CPU laptop', C.brand, 1], [results.suspects, '', 'test images, 713 registered works', C.amber, 0]];
  items.forEach((it, i) => {
    const a = ease(seg(t, 85 + i * 0.4, 86 + i * 0.4)); const x = 190 + (i % 2) * 520, y = 270 + Math.floor(i / 2) * 150; const v = it[0] * ease(seg(t, 85.2 + i * 0.4, 87 + i * 0.4));
    ctx.save(); ctx.globalAlpha = a; txt(ctx, (it[4] ? v.toFixed(1) : Math.round(v).toLocaleString('en-US')) + it[1], x, y, { s: 62, c: it[3], w: 900, glow: it[3] }); txt(ctx, it[2], x, y + 34, { s: 17, c: C.mute }); ctx.restore();
  });
  txt(ctx, 'Honest limits: blur, tiny crops, heavy AI regeneration. See the report.', W / 2, 520, { s: 18, c: C.mute, al: 'center', a: seg(t, 88, 89) });
  txt(ctx, 'Register your first work →', W / 2, 566, { s: 26, c: C.ink, al: 'center', w: 800, a: seg(t, 88.6, 89.6) });
}

function render(ctx, t, A) {
  background(ctx, t);
  ctx.save();
  const z = 1 + 0.03 * Math.sin(t * 0.18); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
  const fadeIn = (a, b) => { const f = Math.min(seg(t, a, a + 0.5), 1 - seg(t, b - 0.4, b)); return clamp(f); };
  const scene = (a, b, fn) => { if (t >= a && t < b) { ctx.save(); ctx.globalAlpha = fadeIn(a, b); fn(); ctx.restore(); } };
  scene(0, 6, () => sceneProloque(ctx, t));
  scene(6, 30, () => sceneRegister(ctx, t, A));
  scene(30, 40, () => sceneCopy(ctx, t, A));
  scene(40, 47, () => sceneFind(ctx, t, A));
  scene(47, 55, () => sceneAlign(ctx, t, A));
  scene(55, 61, () => sceneProve(ctx, t, A));
  scene(61, 68, () => sceneVerdict(ctx, t));
  scene(68, 76, () => sceneMirror(ctx, t, A));
  scene(76, 84, () => sceneAI(ctx, t, A));
  scene(84, DUR + 1, () => sceneOutro(ctx, t));
  ctx.restore();
  // chapter title card
  const ch = [...CHAPTERS].reverse().find((c) => t >= c.t); const ci = CHAPTERS.indexOf(ch);
  const ca = seg(t, ch.t, ch.t + 0.6) * (1 - seg(t, ch.t + 2.2, ch.t + 2.9));
  if (ca > 0 && ci > 0) { ctx.save(); ctx.globalAlpha = ca; txt(ctx, String(ci).padStart(2, '0'), 70, 76, { s: 52, c: C.brand, w: 900, f: 'Consolas, monospace' }); txt(ctx, ch.name.toUpperCase(), 140, 76, { s: 22, w: 800, c: C.ink }); ctx.restore(); }
  // letterbox + vignette + HUD
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 30); ctx.fillRect(0, H - 30, W, 30);
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, H * 0.95); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.55)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  txt(ctx, 'PROVENANCE · FORENSIC TWIN', 24, 20, { s: 12, c: C.mute, w: 800 }); txt(ctx, `${fmt(t)} / ${fmt(DUR)}`, W - 24, 20, { s: 12, c: C.mute, al: 'right', w: 700 });
  // subtitle
  const cap = CAPTIONS.find((c) => t >= c[0] && t < c[1]);
  if (cap) {
    const a = Math.min(seg(t, cap[0], cap[0] + 0.35), 1 - seg(t, cap[1] - 0.35, cap[1])); ctx.save(); ctx.globalAlpha = a; ctx.font = '600 24px Inter, system-ui, sans-serif';
    const w = Math.min(W - 160, ctx.measureText(cap[2]).width + 56); rr(ctx, W / 2 - w / 2, H - 112, w, 56, 14); ctx.fillStyle = 'rgba(8,8,20,.78)'; ctx.fill();
    ctx.restore(); ctx.save(); ctx.globalAlpha = a; ctx.font = '600 24px Inter, system-ui, sans-serif'; ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(cap[2], W / 2, H - 84, W - 200); ctx.restore();
  }
}

export default function CinematicFilm() {
  const canvasRef = useRef(null); const wrapRef = useRef(null);
  const A = useRef(null); const tRef = useRef(0);
  const [ready, setReady] = useState(false); const [playing, setPlaying] = useState(true);
  const [t, setT] = useState(0); const [speed, setSpeed] = useState(1); const [vo, setVo] = useState(false);
  const lastCap = useRef(-1);
  const playRef = useRef(true); const speedRef = useRef(1); const voRef = useRef(false);

  useEffect(() => { playRef.current = playing; }, [playing]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { voRef.current = vo; if (!vo) window.speechSynthesis?.cancel(); }, [vo]);

  useEffect(() => { let alive = true; buildAssets().then((a) => { if (alive) { A.current = a; setReady(true); } }); return () => { alive = false; window.speechSynthesis?.cancel(); }; }, []);

  const speakCaption = useCallback((time) => {
    if (!voRef.current || !window.speechSynthesis) return;
    const idx = CAPTIONS.findIndex((c) => time >= c[0] && time < c[1]);
    if (idx !== lastCap.current) { lastCap.current = idx; window.speechSynthesis.cancel(); if (idx >= 0) { const u = new SpeechSynthesisUtterance(CAPTIONS[idx][2]); u.rate = 1.02; window.speechSynthesis.speak(u); } }
  }, []);

  useEffect(() => {
    if (!ready) return undefined;
    const cv = canvasRef.current; const ctx = cv.getContext('2d'); let raf, last = performance.now(), acc = 0;
    const fit = () => { const w = wrapRef.current.clientWidth; const dpr = Math.min(window.devicePixelRatio || 1, 2); cv.width = Math.round(w * dpr); cv.height = Math.round((w * H * dpr) / W); cv.style.height = `${(w * H) / W}px`; };
    fit(); const ro = new ResizeObserver(fit); ro.observe(wrapRef.current);
    const loop = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      if (playRef.current) { tRef.current += dt * speedRef.current; if (tRef.current >= DUR) { tRef.current = DUR - 0.01; playRef.current = false; setPlaying(false); } speakCaption(tRef.current); }
      ctx.setTransform(cv.width / W, 0, 0, cv.width / W, 0, 0); render(ctx, tRef.current, A.current);
      acc += dt; if (acc > 0.1) { acc = 0; setT(tRef.current); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [ready, speakCaption]);

  const seek = (v) => { tRef.current = clamp(v, 0, DUR - 0.01); setT(tRef.current); lastCap.current = -1; };
  const toggle = () => { if (tRef.current >= DUR - 0.05) seek(0); setPlaying((p) => !p); };
  const full = () => { const el = wrapRef.current; if (document.fullscreenElement) document.exitFullscreen(); else el.requestFullscreen?.(); };
  const cur = [...CHAPTERS].reverse().find((c) => t >= c.t);

  return (
    <div className="film" ref={wrapRef} tabIndex={0} onKeyDown={(e) => { if (e.code === 'Space') { e.preventDefault(); toggle(); } }}>
      <canvas ref={canvasRef} className="film-canvas" onClick={toggle} />
      {!ready && <div className="film-loading"><span className="spinner" /> Loading the film…</div>}
      {ready && !playing && t < DUR - 0.05 && <button className="film-bigplay" onClick={toggle} aria-label="Play">▶</button>}
      {ready && t >= DUR - 0.05 && <button className="film-bigplay replay" onClick={toggle}>↻ Watch again</button>}
      <div className="film-bar">
        <button className="film-btn" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>{playing ? '❚❚' : '▶'}</button>
        <input className="film-scrub" type="range" min="0" max={DUR} step="0.05" value={t} onChange={(e) => seek(parseFloat(e.target.value))} aria-label="Timeline"
          style={{ '--p': `${(t / DUR) * 100}%` }} />
        <span className="film-time">{fmt(t)} / {fmt(DUR)}</span>
        <button className="film-btn sm" onClick={() => setSpeed((s) => (s === 1 ? 1.5 : s === 1.5 ? 2 : 1))}>{speed}×</button>
        <button className={`film-btn sm ${vo ? 'on' : ''}`} onClick={() => setVo((v) => !v)} title="Voice-over">{vo ? '🔊 VO' : '🔇 VO'}</button>
        <button className="film-btn sm" onClick={full} title="Fullscreen">⛶</button>
      </div>
      <div className="film-chapters">
        {CHAPTERS.slice(1).map((c) => (
          <button key={c.name} className={`film-chap ${cur?.name === c.name ? 'active' : ''}`} onClick={() => { seek(c.t); setPlaying(true); }}>{c.name}</button>
        ))}
      </div>
    </div>
  );
}
