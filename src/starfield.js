// src/starfield.js — two-layer parallax starfield
import { clock } from './clock.js';

let starsInitialized = false;
const starsFar = [];
const starsNear = [];

function ensureInit() {
  if (starsInitialized) return;
  for (let i = 0; i < 60; i++) {
    starsFar.push({
      x: clock.random() * 480,
      y: clock.random() * 800,
      s: clock.random() * 1 + 0.5,
      v: clock.random() * 60 + 30,     // slow
    });
  }
  for (let i = 0; i < 40; i++) {
    starsNear.push({
      x: clock.random() * 480,
      y: clock.random() * 800,
      s: clock.random() * 2 + 1,
      v: clock.random() * 160 + 100,   // fast
    });
  }
  starsInitialized = true;
}


const STAGE_STAR_COLORS = [
    { far: '#446', near: '#8af' },   // stage 1 — orbital belt
    { far: '#553', near: '#fc8' },   // stage 2 — enemy fleet
    { far: '#3a2410', near: '#8a6030' }, // stage 3 — planet surface (dust, not stars)
    { far: '#411', near: '#f44' },   // stage 4 — Demon Starship core
];

export function drawStars(ctx, t, stageIndex) {
    ensureInit();
    const idx = stageIndex ?? 0;
    const palette = STAGE_STAR_COLORS[idx % STAGE_STAR_COLORS.length];

    ctx.fillStyle = palette.far;
    for (const s of starsFar) {
        const y = (s.y + t * s.v) % 800;
        ctx.fillRect(s.x | 0, y | 0, s.s | 0 || 1, s.s | 0 || 1);
    }

    ctx.fillStyle = palette.near;
    for (const s of starsNear) {
        const y = (s.y + t * s.v) % 800;
        ctx.fillRect(s.x | 0, y | 0, s.s | 0 || 1, s.s | 0 || 1);
    }
}