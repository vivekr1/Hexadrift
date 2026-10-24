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

const BOSSES = { boss1, boss2, boss3, boss4 };

function boss2(game) {
  return makeBoss(game, {
    hp: 400, x: 240, y: -120, r: 70,
    extra: {
      entering: true, flash: 0,
      onPhase(_p) { this.fireCd = 0.5; },
      hit(dmg) { this.hp -= dmg; this.flash = FLASH_TIME; if (this.hp <= 0) this.alive = false; },
      update(dt) {
        if (bossCommon(this, dt, 140)) return;
        this.x = 240 + Math.sin(this.t * 0.6) * 160;

        this.fireCd -= dt;
        if (this.fireCd > 0) return;

        if (this.phase === 0) {
          shootAimed(game, this.x - 40, this.y + 20, 260, 0, '#f4f');
          shootAimed(game, this.x + 40, this.y + 20, 260, 0, '#f4f');
          this.fireCd = 1.0;
        } else if (this.phase === 1) {
          shootRing(game, this.x, this.y, 10, 200, this.t * 1.2, '#f6f');
          shootAimed(game, this.x, this.y + 30, 280, 0, '#f4f');
          this.fireCd = 0.8;
        } else {
          shootRing(game, this.x, this.y, 14, 220, this.t * 2, '#f6f');
          shootAimed(game, this.x - 40, this.y + 20, 300, 0, '#f4f');
          shootAimed(game, this.x + 40, this.y + 20, 300, 0, '#f4f');
          this.fireCd = 0.6;
        }
      },
      draw(ctx) {
        ctx.fillStyle = this.phase === 2 ? '#f44' : this.phase === 1 ? '#fa4' : '#fa3';
        ctx.fillRect(this.x - 70, this.y - 35, 140, 70);
        ctx.fillStyle = '#511';
        ctx.fillRect(this.x - 55, this.y - 20, 110, 40);
        ctx.fillStyle = '#600';
        ctx.fillRect(this.x - 50, this.y + 20, 20, 25);
        ctx.fillRect(this.x + 30, this.y + 20, 20, 25);
        damageFlash(this, ctx);
        drawHpBar(this, ctx);
      },
    },
  });
}


function boss3(game) {
  return makeBoss(game, {
    hp: 550, x: 240, y: -120, r: 75,
    extra: {
      entering: true, flash: 0, spiralAngle: 0, spiralCd: 0,
      onPhase(_p) { this.fireCd = 0.6; },
      hit(dmg) { this.hp -= dmg; this.flash = FLASH_TIME; if (this.hp <= 0) this.alive = false; },
      update(dt) {
        if (bossCommon(this, dt, 150)) return;
        this.x = 240 + Math.sin(this.t * 0.7) * 130;

        this.fireCd -= dt;
        this.spiralCd -= dt;

        // Rotating spiral (single arm → double arm → triple arm)
        if (this.spiralCd <= 0) {
          this.spiralCd = this.phase === 2 ? 0.06 : this.phase === 1 ? 0.08 : 0.1;
          this.spiralAngle += 0.35;
          const arms = this.phase === 2 ? 3 : this.phase === 1 ? 2 : 1;
          for (let a = 0; a < arms; a++) {
            const angle = this.spiralAngle + (a / arms) * Math.PI * 2;
            const b = game.enemyBullets.spawn();
            b.x = this.x;
            b.y = this.y;
            b.vx = Math.cos(angle) * 180;
            b.vy = Math.sin(angle) * 180;
            b.r = 5;
            b.color = '#c6f';
          }
        }

        // Aimed barrage in later phases
        if (this.fireCd <= 0 && this.phase >= 1) {
          shootAimed(game, this.x, this.y + 30, 300, 0, '#f4f');
          shootAimed(game, this.x, this.y + 30, 300, 0.2, '#f4f');
          shootAimed(game, this.x, this.y + 30, 300, -0.2, '#f4f');
          this.fireCd = this.phase === 2 ? 1.2 : 1.6;
        }
      },
      draw(ctx) {
        ctx.fillStyle = this.phase === 2 ? '#f44' : this.phase === 1 ? '#a4f' : '#96f';
        ctx.beginPath(); ctx.arc(this.x, this.y, 75, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#312';
        ctx.beginPath(); ctx.arc(this.x, this.y, 40, 0, Math.PI * 2); ctx.fill();
        // Rotating outer nodes
        for (let i = 0; i < 6; i++) {
          const a = this.t * 1.5 + (i / 6) * Math.PI * 2;
          ctx.fillStyle = '#f4f';
          ctx.beginPath();
          ctx.arc(this.x + Math.cos(a) * 60, this.y + Math.sin(a) * 60, 8, 0, Math.PI * 2);
          ctx.fill();
        }
        damageFlash(this, ctx);
        drawHpBar(this, ctx);
      },
    },
  });
}


function boss4(game) {
  return makeBoss(game, {
    hp: 750, x: 240, y: -120, r: 80,
    extra: {
      entering: true, flash: 0,
      onPhase(_p) { this.fireCd = 0.5; },
      hit(dmg) { this.hp -= dmg; this.flash = FLASH_TIME; if (this.hp <= 0) this.alive = false; },
      update(dt) {
        if (bossCommon(this, dt, 155)) return;
        this.x = 240 + Math.sin(this.t * 1.2) * 170;
        this.y = 155 + Math.sin(this.t * 0.8) * 30;

        this.fireCd -= dt;
        if (this.fireCd > 0) return;

        if (this.phase === 0) {
          shootAimed(game, this.x, this.y + 30, 300, 0, '#f44');
          shootAimed(game, this.x, this.y + 30, 300, 0.25, '#f44');
          shootAimed(game, this.x, this.y + 30, 300, -0.25, '#f44');
          this.fireCd = 0.7;
        } else if (this.phase === 1) {
          shootRing(game, this.x, this.y, 18, 220, this.t * 1.8, '#f6f');
          shootAimed(game, this.x, this.y + 30, 320, 0, '#f44');
          this.fireCd = 0.7;
        } else {
          shootRing(game, this.x, this.y, 24, 240, this.t * 2.5, '#f6f');
          shootAimed(game, this.x, this.y + 30, 340, 0, '#f44');
          shootAimed(game, this.x, this.y + 30, 340, 0.15, '#f44');
          shootAimed(game, this.x, this.y + 30, 340, -0.15, '#f44');
          this.fireCd = 0.55;
        }
      },
      draw(ctx) {
        ctx.fillStyle = this.phase === 2 ? '#f22' : this.phase === 1 ? '#f82' : '#f62';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - 80);
        ctx.lineTo(this.x + 80, this.y);
        ctx.lineTo(this.x, this.y + 80);
        ctx.lineTo(this.x - 80, this.y);
        ctx.closePath();
        ctx.fill();
        // Central eye
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(this.x, this.y, 35, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f00';
        ctx.beginPath(); ctx.arc(this.x, this.y, 20, 0, Math.PI * 2); ctx.fill();
        damageFlash(this, ctx);
        drawHpBar(this, ctx);
      },
    },
  });
}