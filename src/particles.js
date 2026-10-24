// src/particles.js

export function spawnParticle(game, opts) {
  const p = game.particles.spawn();
  p.x = opts.x;
  p.y = opts.y;
  p.vx = opts.vx ?? 0;
  p.vy = opts.vy ?? 0;
  p.life = opts.life ?? 0.5;
  p.maxLife = p.life;
  p.r = opts.r ?? 3;
  p.color = opts.color ?? '#fff';
  p.drag = opts.drag ?? 0.9;
  return p;
}

export function burst(game, x, y, count, opts = {}) {
  const speed = opts.speed ?? 180;
  const life = opts.life ?? 0.5;
  const color = opts.color ?? '#fa4';
  const r = opts.r ?? 3;

  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.4 + Math.random() * 0.8);
    spawnParticle(game, {
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: life * (0.6 + Math.random() * 0.6),
      r,
      color,
      drag: 0.88,
    });
  }
}

export const explosions = {
  scout(game, x, y) {
    burst(game, x, y, 10, { speed: 180, life: 0.4, color: '#fc6', r: 3 });
    burst(game, x, y, 4,  { speed: 260, life: 0.25, color: '#fff', r: 2 });
  },
  midboss(game, x, y) {
    burst(game, x, y, 22, { speed: 240, life: 0.6, color: '#f88', r: 4 });
    burst(game, x, y, 10, { speed: 340, life: 0.35, color: '#fff', r: 2 });
  },
  boss(game, x, y) {
    burst(game, x, y, 50, { speed: 300, life: 0.9, color: '#fa3', r: 5 });
    burst(game, x, y, 30, { speed: 420, life: 0.5, color: '#fff', r: 3 });
  },
  bulletHit(game, x, y) {
    burst(game, x, y, 3, { speed: 90, life: 0.15, color: '#7ff', r: 2 });
  },
  playerHit(game, x, y) {
    burst(game, x, y, 24, { speed: 300, life: 0.6, color: '#5ef', r: 4 });
  },
  bomb(game, x, y) {
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      spawnParticle(game, {
        x, y,
        vx: Math.cos(a) * 500,
        vy: Math.sin(a) * 500,
        life: 0.45,
        r: 4,
        color: '#ffe',
        drag: 1,
      });
    }
  },
};