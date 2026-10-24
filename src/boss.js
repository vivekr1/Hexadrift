// src/boss.js
export function spawnBoss(game, name) {
  const factory = BOSSES[name];
  if (!factory) {
    console.warn('Unknown boss:', name);
    return null;
  }
  return factory(game);
}

const FLASH_TIME = 0.08;

function makeBoss(game, opts) {
  const b = {
    game, kind: 'boss',
    x: opts.x ?? 240, y: opts.y ?? -120, r: opts.r ?? 50,
    hp: opts.hp, maxHp: opts.hp,
    alive: true, t: 0, phase: 0,
    entering: true, invuln: 0, flash: 0,
    fireCd: 1.5, killedByBomb: false,
    ...opts.extra,
  };
  game.entities.push(b);
  return b;
}

function shootRing(game, x, y, count, speed, offset = 0, color = '#f6f') {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + offset;
    const b = game.enemyBullets.spawn();
    b.x = x;
    b.y = y;
    b.vx = Math.cos(a) * speed;
    b.vy = Math.sin(a) * speed;
    b.r = 6;
    b.color = color;
  }
}

function shootAimed(game, x, y, speed, spread = 0, color = '#f4f') {
  const p = game.player;
  if (!p) return;
  const dx = p.x - x, dy = p.y - y;
  const base = Math.atan2(dy, dx) + spread;
  const b = game.enemyBullets.spawn();
  b.x = x;
  b.y = y;
  b.vx = Math.cos(base) * speed;
  b.vy = Math.sin(base) * speed;
  b.r = 5;
  b.color = color;
}

function damageFlash(b, ctx) {
  if (b.flash > 0) {
    ctx.globalAlpha = Math.min(b.flash / FLASH_TIME, 1);
    ctx.fillStyle = '#fff';
    ctx.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
    ctx.globalAlpha = 1;
  }
}

function drawHpBar(b, ctx) {
  const W = b.game.W;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(40, 20, W - 80, 14);
  ctx.fillStyle = '#f33';
  ctx.fillRect(42, 22, (W - 84) * Math.max(b.hp, 0) / b.maxHp, 10);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.strokeRect(40, 20, W - 80, 14);
}

function bossCommon(b, dt, enterY) {
  b.t += dt;
  if (b.flash > 0) b.flash -= dt;
  if (b.invuln > 0) b.invuln -= dt;

  if (b.entering) {
    b.y += 80 * dt;
    if (b.y >= enterY) { b.y = enterY; b.entering = false; }
    return true;
  }

  const pct = b.hp / b.maxHp;
  if (b.phase === 0 && pct <= 0.66) { b.phase = 1; b.onPhase?.(1); }
  else if (b.phase === 1 && pct <= 0.33) { b.phase = 2; b.onPhase?.(2); }

  return false;
}

function boss1(game) {
  return makeBoss(game, {
    hp: 220,
    x: 240,
    y: -120,
    r: 55,
    extra: {
      entering: true,
      flash: 0,
      onPhase(p) { this.fireCd = 0.6; },
      hit(dmg) {
        this.hp -= dmg;
        this.flash = FLASH_TIME;
        if (this.hp <= 0) this.alive = false;
      },
      update(dt) {
        if (bossCommon(this, dt, 130)) return;
        this.x = 240 + Math.sin(this.t * 0.9) * 140;

        this.fireCd -= dt;
        if (this.fireCd > 0) return;

        if (this.phase === 0) {
          shootAimed(game, this.x, this.y + 30, 240, 0,     '#f4f');
          shootAimed(game, this.x, this.y + 30, 240, 0.15,  '#f4f');
          shootAimed(game, this.x, this.y + 30, 240, -0.15, '#f4f');
          this.fireCd = 1.1;
        } else if (this.phase === 1) {
          shootRing(game, this.x, this.y, 12, 180, this.t * 1.5, '#f6f');
          this.fireCd = 0.9;
        } else {
          shootRing(game, this.x, this.y, 16, 200, this.t * 2, '#f6f');
          shootAimed(game, this.x, this.y + 30, 280, 0, '#f4f');
          this.fireCd = 0.7;
        }
      },
      draw(ctx) {
        ctx.fillStyle = this.phase === 2 ? '#f44'
                      : this.phase === 1 ? '#fa4'
                      : '#fa3';
        ctx.fillRect(this.x - 55, this.y - 35, 110, 70);
        ctx.fillStyle = '#511';
        ctx.fillRect(this.x - 40, this.y - 20, 80, 40);
        damageFlash(this, ctx);
        drawHpBar(this, ctx);
      },
    },
  });
}

const BOSSES = { boss1 };