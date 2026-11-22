// src/planet.js — planet surface backdrop for stage 3 (stageIndex === 2)
// Three parallax layers scrolling downward:
//   - far:  large ground patches (craters / plateaus)
//   - mid:  boulders / rocky debris
//   - near: fast-moving dust motes / embers
import { clock } from './clock.js';

const TERRAIN_COUNT = 12;
const ROCK_COUNT    = 16;
const DUST_COUNT    = 70;

const terrain = [];
const rocks   = [];
const dust    = [];

let initialized = false;

// ---- factories ------------------------------------------------------------

function makeTerrain(initial) {
    const size = 110 + clock.random() * 110;          // 110–220 px
    const sides = 7 + Math.floor(clock.random() * 4);
    const verts = [];
    for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2;
        const r = 0.7 + clock.random() * 0.3;         // smoother than rocks
        verts.push({ a, r });
    }
    return {
        x: clock.random() * 480,
        y: initial ? clock.random() * 800 : -300 - clock.random() * 250,
        size,
        vx: (clock.random() - 0.5) * 6,
        vy: 25 + clock.random() * 25,                 // very slow → distant
        rot: clock.random() * Math.PI * 2,
        rotSpeed: (clock.random() - 0.5) * 0.06,
        verts,
        kind: clock.random() < 0.6 ? 'crater' : 'plateau',
        alpha: 0.4 + clock.random() * 0.35,
    };
}

function makeRock(initial) {
    const size = 20 + clock.random() * 45;            // 20–65 px
    const sides = 5 + Math.floor(clock.random() * 5);
    const verts = [];
    for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2;
        const r = 0.6 + clock.random() * 0.55;
        verts.push({ a, r });
    }
    return {
        x: clock.random() * 480,
        y: initial ? clock.random() * 800 : -150 - clock.random() * 250,
        size,
        vx: (clock.random() - 0.5) * 14,
        vy: 90 + clock.random() * 100,                // mid-speed
        rot: clock.random() * Math.PI * 2,
        rotSpeed: (clock.random() - 0.5) * 0.45,
        verts,
    };
}

function makeDust(initial) {
    return {
        x: clock.random() * 480,
        y: initial ? clock.random() * 800 : -20 - clock.random() * 60,
        r: 0.8 + clock.random() * 1.8,
        vx: (clock.random() - 0.5) * 26,
        vy: 180 + clock.random() * 180,               // fast → foreground
        warm: clock.random() < 0.55,
        alpha: 0.12 + clock.random() * 0.28,
    };
}

function ensureInit() {
    if (initialized) return;
    for (let i = 0; i < TERRAIN_COUNT; i++) terrain.push(makeTerrain(true));
    for (let i = 0; i < ROCK_COUNT;    i++) rocks.push(makeRock(true));
    for (let i = 0; i < DUST_COUNT;    i++) dust.push(makeDust(true));
    initialized = true;
}

// ---- update ---------------------------------------------------------------

export function updatePlanet(dt, stageIndex) {
    if (stageIndex !== 2) return;
    ensureInit();

    for (const t of terrain) {
        t.x += t.vx * dt;
        t.y += t.vy * dt;
        t.rot += t.rotSpeed * dt;
        if (t.y > 1050 || t.x < -320 || t.x > 800) {
            Object.assign(t, makeTerrain(false));
        }
    }

    for (let i = 0; i < rocks.length; i++) {
        const r = rocks[i];
        r.x += r.vx * dt;
        r.y += r.vy * dt;
        r.rot += r.rotSpeed * dt;
        if (r.y > 950 || r.x < -200 || r.x > 680) {
            rocks[i] = makeRock(false);
        }
    }

    for (const d of dust) {
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        if (d.y > 850 || d.x < -20 || d.x > 500) {
            Object.assign(d, makeDust(false));
        }
    }
}

// ---- drawing helpers ------------------------------------------------------

// Build a polygon path centred at (x, y). Rotation applied per-vertex so
// we can keep fill/stroke calls outside a save/restore block.
function pathPoly(ctx, x, y, size, verts, rot) {
    ctx.beginPath();
    for (let i = 0; i < verts.length; i++) {
        const v = verts[i];
        const a = v.a + rot;
        const px = Math.cos(a) * size * v.r;
        const py = Math.sin(a) * size * v.r;
        if (i === 0) ctx.moveTo(x + px, y + py);
        else         ctx.lineTo(x + px, y + py);
    }
    ctx.closePath();
}

export function drawPlanet(ctx, stageIndex, inMenu) {
    if (inMenu) return;
    if (stageIndex !== 2) return;
    ensureInit();

    // --- Layer 1: far terrain patches -------------------------------------
    for (const t of terrain) {
        if (t.kind === 'crater') {
            // Outer base
            ctx.fillStyle = `rgba(70, 42, 20, ${t.alpha})`;
            pathPoly(ctx, t.x, t.y, t.size, t.verts, t.rot);
            ctx.fill();

            // Rim
            ctx.strokeStyle = `rgba(35, 20, 8, ${t.alpha * 0.85})`;
            ctx.lineWidth = 2;
            pathPoly(ctx, t.x, t.y, t.size, t.verts, t.rot);
            ctx.stroke();

            // Dark pit
            ctx.fillStyle = `rgba(22, 12, 5, ${t.alpha * 0.85})`;
            ctx.beginPath();
            ctx.arc(t.x, t.y, t.size * 0.52, 0, Math.PI * 2);
            ctx.fill();

            // Lit rim highlight (single arc, offset)
            ctx.strokeStyle = `rgba(190, 135, 80, ${t.alpha * 0.55})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(t.x, t.y, t.size * 0.52, Math.PI * 0.95, Math.PI * 1.55);
            ctx.stroke();
        } else {
            // Plateau — outer shape
            ctx.fillStyle = `rgba(110, 70, 35, ${t.alpha})`;
            pathPoly(ctx, t.x, t.y, t.size, t.verts, t.rot);
            ctx.fill();

            // Inner shaded polygon for depth
            ctx.fillStyle = `rgba(145, 95, 50, ${t.alpha * 0.7})`;
            pathPoly(ctx, t.x - t.size * 0.12, t.y - t.size * 0.12,
                     t.size * 0.72, t.verts, t.rot);
            ctx.fill();

            // Edge
            ctx.strokeStyle = `rgba(40, 22, 10, ${t.alpha * 0.7})`;
            ctx.lineWidth = 1.5;
            pathPoly(ctx, t.x, t.y, t.size, t.verts, t.rot);
            ctx.stroke();
        }
    }

    // --- Layer 2: boulders -------------------------------------------------
    for (const r of rocks) {
        // Ground shadow
        ctx.fillStyle = 'rgba(12, 6, 3, 0.55)';
        pathPoly(ctx, r.x + r.size * 0.16, r.y + r.size * 0.22,
                 r.size, r.verts, r.rot);
        ctx.fill();

        // Rock body
        ctx.fillStyle = 'rgba(108, 72, 40, 0.94)';
        pathPoly(ctx, r.x, r.y, r.size, r.verts, r.rot);
        ctx.fill();

        // Sunlit top
        ctx.fillStyle = 'rgba(165, 118, 70, 0.6)';
        pathPoly(ctx, r.x - r.size * 0.10, r.y - r.size * 0.12,
                 r.size * 0.68, r.verts, r.rot);
        ctx.fill();

        // Outline
        ctx.strokeStyle = 'rgba(38, 20, 8, 0.7)';
        ctx.lineWidth = 1;
        pathPoly(ctx, r.x, r.y, r.size, r.verts, r.rot);
        ctx.stroke();
    }

    // --- Layer 3: foreground dust / embers ---------------------------------
    for (const d of dust) {
        ctx.fillStyle = d.warm ? '#c99a63' : '#7a5230';
        ctx.globalAlpha = d.alpha;
        // Vertically stretched to suggest downward motion
        ctx.fillRect(d.x, d.y, d.r, d.r * 2.4);
    }
    ctx.globalAlpha = 1;
}