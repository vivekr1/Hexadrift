// src/starfield.js — two-layer parallax starfield

const starsFar = Array.from({ length: 60 }, () => ({
    x: Math.random() * 480,
    y: Math.random() * 800,
    s: Math.random() * 1 + 0.5,
    v: Math.random() * 60 + 30,     // slow
}));
const starsNear = Array.from({ length: 40 }, () => ({
    x: Math.random() * 480,
    y: Math.random() * 800,
    s: Math.random() * 2 + 1,
    v: Math.random() * 160 + 100,   // fast
}));

const STAGE_STAR_COLORS = [
    { far: '#446', near: '#8af' },  // stage 1 — orbital belt
    { far: '#553', near: '#fc8' },  // stage 2 — enemy fleet
    { far: '#534', near: '#f8a' },  // stage 3 — planet surface
    { far: '#411', near: '#f44' },  // stage 4 — demon star core
];

export function drawStars(ctx, t, stageIndex) {
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