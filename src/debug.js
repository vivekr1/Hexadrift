// src/debug.js — dev-only hitbox drawing (gated before shipping)

export function drawHitboxes(game) {
    const ctx = game.ctx;
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#0f0';
    const circle = (x, y, r) => {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();
    };
    if (game.player?.alive) circle(game.player.x, game.player.y, game.player.r);
    for (const e of game.entities) if (e !== game.player && e.alive) circle(e.x, e.y, e.r ?? 12);
    for (const b of game.bullets.list) if (b.alive) circle(b.x, b.y, b.r ?? 4);
    for (const b of game.enemyBullets.list) if (b.alive) circle(b.x, b.y, b.r ?? 5);
}