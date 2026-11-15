// src/clouds.js — soft drifting cloud/ash backdrops for stages 3 & 4

const CLOUD_COUNT = 10;
const clouds = [];

const PALETTES = {
    2: {  // Planet Surface — salmon / pink atmosphere
        far:  'rgba(160, 110, 140, 0.22)',
        near: 'rgba(220, 170, 195, 0.32)',
        glow: 'rgba(255, 220, 240, 0.10)',
    },
    3: {  // Demon Starship Core — red / black ash clouds
        far:  'rgba(80, 15, 10, 0.28)',
        near: 'rgba(180, 55, 30, 0.30)',
        glow: 'rgba(255, 120, 40, 0.14)',
    },
};

function makeBlobs(size) {
    const num = 4 + Math.floor(Math.random() * 4);
    const blobs = [];
    for (let i = 0; i < num; i++) {
        const sides = 5 + Math.floor(Math.random() * 6);   // 5–10 vertices per blob
        const vertices = [];
        for (let j = 0; j < sides; j++) {
            const angle = (j / sides) * Math.PI * 2;
            const rr = 0.65 + Math.random() * 0.7;         // 0.65–1.35 radius multiplier
            vertices.push({ angle, r: rr });
        }
        blobs.push({
            dx: (Math.random() - 0.5) * size * 1.6,
            dy: (Math.random() - 0.5) * size * 0.5,
            r:  size * (0.35 + Math.random() * 0.45),
            vertices,
        });
    }
    return blobs;
}

function makeCloud(initial) {
    const near = Math.random() < 0.55;
    const size = near ? 50 + Math.random() * 70 : 30 + Math.random() * 50;
    return {
        x: Math.random() * 480,
        y: initial ? Math.random() * 800 : -200 - Math.random() * 200,
        vx: (Math.random() - 0.5) * 6,
        vy: near ? 55 + Math.random() * 30 : 25 + Math.random() * 20,
        blobs: makeBlobs(size),
        near,
    };
}

function ensureInit() {
    if (clouds.length === 0) {
        for (let i = 0; i < CLOUD_COUNT; i++) clouds.push(makeCloud(true));
    }
}

export function updateClouds(dt, stageIndex) {
    if (stageIndex !== 2 && stageIndex !== 3) return;
    ensureInit();
    for (let i = 0; i < clouds.length; i++) {
        const c = clouds[i];
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        if (c.y > 950 || c.x < -300 || c.x > 780) {
            clouds[i] = makeCloud(false);
        }
    }
}

export function drawClouds(ctx, stageIndex, inMenu) {
    if (inMenu) return;                                  // menu keeps asteroids
    if (stageIndex !== 2 && stageIndex !== 3) return;
    ensureInit();

    const p = PALETTES[stageIndex];
    if (!p) return;

    for (const c of clouds) {
        const color = c.near ? p.near : p.far;
        ctx.fillStyle = color;

        for (const b of c.blobs) {
            const cx = c.x + b.dx;
            const cy = c.y + b.dy;
            ctx.beginPath();
            for (let j = 0; j < b.vertices.length; j++) {
                const v = b.vertices[j];
                const px = cx + Math.cos(v.angle) * b.r * v.r;
                const py = cy + Math.sin(v.angle) * b.r * v.r;
                if (j === 0) ctx.moveTo(px, py);
                else         ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
        }

        // Soft highlight on near clouds
        if (c.near) {
            const b = c.blobs[0];
            ctx.fillStyle = p.glow;
            ctx.beginPath();
            ctx.arc(
                c.x + b.dx - b.r * 0.15,
                c.y + b.dy - b.r * 0.20,
                b.r * 0.65, 0, Math.PI * 2
            );
            ctx.fill();
        }
    }
}
