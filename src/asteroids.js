// src/asteroids.js — asteroid field (stage 1 background)

function makeAsteroidData(initial) {
    const sides = 6 + Math.floor(Math.random() * 4);      // 6–9 vertices
    const vertices = [];
    for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2;
        const r = 0.65 + Math.random() * 0.35;            // irregular radius
        vertices.push({ angle, r });
    }

    // Size distribution: 40% small, 45% medium, 15% large (rare planetoids)
    const roll = Math.random();
    let size;
    if (roll < 0.40)      size = 30 + Math.random() * 30;    // 30–60
    else if (roll < 0.85) size = 60 + Math.random() * 40;    // 60–100
    else                  size = 120 + Math.random() * 60;   // 120–180 (huge)

    return {
        x: initial ? Math.random() * 480 : Math.random() * 480,
        y: initial ? Math.random() * 800 : -200 - Math.random() * 200,
        size,
        vx: (Math.random() - 0.5) * 15,
        vy: 50 + Math.random() * 70,                       // scroll speed
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.35,
        vertices,
        alpha: 0.18 + Math.random() * 0.22,
    };
}

const asteroids = Array.from({ length: 14 }, () => makeAsteroidData(true));

export function updateAsteroids(dt) {
    for (let i = 0; i < asteroids.length; i++) {
        const a = asteroids[i];
        a.x += a.vx * dt;
        a.y += a.vy * dt;
        a.rot += a.rotSpeed * dt;
        if (a.y > 950 || a.x < -250 || a.x > 730) {
            asteroids[i] = makeAsteroidData(false);
        }
    }
}

export function drawAsteroids(ctx, stageIndex, inMenu) {
    if (!inMenu && stageIndex !== 0) return;    // only stage 1 (and menu preview)

    for (const a of asteroids) {
        ctx.save();
        ctx.translate(a.x, a.y);
        ctx.rotate(a.rot);

        // Outer shape
        ctx.beginPath();
        for (let i = 0; i < a.vertices.length; i++) {
            const v = a.vertices[i];
            const px = Math.cos(v.angle) * a.size * v.r;
            const py = Math.sin(v.angle) * a.size * v.r;
            if (i === 0) ctx.moveTo(px, py);
            else         ctx.lineTo(px, py);
        }
        ctx.closePath();

        ctx.fillStyle = `rgba(70, 62, 55, ${a.alpha})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(130, 115, 100, ${a.alpha + 0.12})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Inner shading — smaller offset polygon for depth
        ctx.beginPath();
        for (let i = 0; i < a.vertices.length; i++) {
            const v = a.vertices[i];
            const px = Math.cos(v.angle) * a.size * v.r * 0.55 - a.size * 0.18;
            const py = Math.sin(v.angle) * a.size * v.r * 0.55 - a.size * 0.18;
            if (i === 0) ctx.moveTo(px, py);
            else         ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = `rgba(25, 20, 15, ${a.alpha * 0.75})`;
        ctx.fill();

        // Small crater highlight
        if (a.size > 60 && a.vertices.length >= 7) {
            const v = a.vertices[0];
            ctx.fillStyle = `rgba(180, 160, 140, ${a.alpha * 0.5})`;
            ctx.beginPath();
            ctx.arc(
                Math.cos(v.angle) * a.size * v.r * 0.35,
                Math.sin(v.angle) * a.size * v.r * 0.35,
                a.size * 0.08, 0, Math.PI * 2
            );
            ctx.fill();
        }

        ctx.restore();
    }
}