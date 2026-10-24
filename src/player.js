// src/player.js
import { explosions, burst } from './particles.js';

export class Player {
  constructor(game, x, y) {
    this.game = game;
    this.x = x; this.y = y;
    this.r = 6;
    this.w = 24; this.h = 24;
    this.speed = 300;
    this.alive = true;
    this.lives = 3;
    this.bombs = 3;
    this.weapon = 1;
    this.cooldown = 0;
    this.fireRate = 0.10;
    this.invuln = 1.0;
    this.score = 0;
    this.muzzleFlash = 0;

    // Death fly-away
    this.dying = false;
    this.dyingTime = 0;
    this.dyingDuration = 1.2;
    this.deathVx = 0;
    this.deathVy = -400;
  }

  update(dt) {
    // Dying fly-away — ship accelerates upward, fades, then despawns
    if (this.dying) {
      this.dyingTime += dt;
      this.deathVy -= 350 * dt;
      this.x += this.deathVx * dt;
      this.y += this.deathVy * dt;
      if (this.muzzleFlash > 0) this.muzzleFlash -= dt;
      if (this.dyingTime >= this.dyingDuration || this.y < -60) {
        this.alive = false;
      }
      if (Math.random() < 0.3) {
        burst(this.game, this.x, this.y + 5, 2,
              { speed: 60, life: 0.3, color: '#f88', r: 2 });
      }
      return;
    }

    const { input, W, H } = this.game;
    let dx = 0, dy = 0;
    if (input.down('ArrowLeft') || input.down('KeyA')) dx -= 1;
    if (input.down('ArrowRight') || input.down('KeyD')) dx += 1;
    if (input.down('ArrowUp') || input.down('KeyW')) dy -= 1;
    if (input.down('ArrowDown') || input.down('KeyS')) dy += 1;

    const len = Math.hypot(dx, dy) || 1;
    this.x += (dx / len) * this.speed * dt;
    this.y += (dy / len) * this.speed * dt;

    const m = 16;
    this.x = Math.max(m, Math.min(W - m, this.x));
    this.y = Math.max(m, Math.min(H - m, this.y));

    this.cooldown -= dt;
    if ((input.down('Space') || input.down('KeyZ')) && this.cooldown <= 0) {
      this.shoot();
      this.cooldown = this.fireRate;
    }

    if (input.justPressed('KeyX')) this.useBomb();

    if (this.invuln > 0) this.invuln -= dt;
    if (this.muzzleFlash > 0) this.muzzleFlash -= dt;
  }

  shoot() {
    const spd = 800;
    const lvl = this.weapon;

    if (lvl === 1) {
      this.spawnBullet(0, 0, -spd, 1);
    } else if (lvl === 2) {
      this.spawnBullet(-8, 0, -spd, 1);
      this.spawnBullet(8, 0, -spd, 1);
    } else {
      const angle = 0.22;
      const vxOff = Math.sin(angle) * spd;
      this.spawnBullet(0, 0, -spd * 1.15, 2);
      this.spawnBullet(-6, -vxOff, -spd, 1);
      this.spawnBullet(6, vxOff, -spd, 1);
    }
  }

  spawnBullet(offsetX, vx, vy, damage = 1) {
    const b = this.game.bullets.spawn();
    this.game.audio.shoot();
    b.x = this.x + offsetX;
    b.y = this.y - 14;
    b.vx = vx;
    b.vy = vy;
    b.r = 4;
    b.damage = damage;
    this.muzzleFlash = 0.06;
  }

  useBomb() {
    if (this.bombs <= 0) return;
    this.bombs--;

    this.invuln = Math.max(this.invuln, 1.6);

    for (const b of this.game.enemyBullets.list) b.alive = false;

    for (const e of this.game.entities) {
      if (e === this || !e.alive) continue;
      if (typeof e.hit !== 'function') continue;
      e.killedByBomb = true;
      e.hit(15);
    }

    this.game.bombFlash = 0.45;
    this.game.triggerShake?.(0.5, 18);
    this.game.audio.bomb();
    explosions.bomb(this.game, this.x, this.y);
  }

  hit() {
    if (this.invuln > 0) return;
    this.lives--;
    this.game.triggerShake?.(0.35, 14);
    this.game.audio.playerHit();
    this.invuln = 2;
    if (this.lives < 0) {
      this.dying = true;
      this.dyingTime = 0;
      this.deathVx = (Math.random() - 0.5) * 150;
      this.deathVy = -400;
    }
  }

  draw(ctx) {
    if (this.dying) {
      const fade = Math.max(0, 1 - this.dyingTime / this.dyingDuration);
      ctx.globalAlpha = fade;
    }

    if (this.muzzleFlash > 0) {
      const k = this.muzzleFlash / 0.06;
      ctx.save();
      ctx.globalAlpha *= k;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(this.x, this.y - 16, 6 * k, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (!this.dying && this.invuln > 0 && Math.floor(this.invuln * 20) % 2 === 0) {
      ctx.globalAlpha = 1;
      return;
    }

    ctx.fillStyle = '#5ef';
    ctx.beginPath();
    ctx.moveTo(this.x, this.y - 14);
    ctx.lineTo(this.x - 12, this.y + 10);
    ctx.lineTo(this.x, this.y + 4);
    ctx.lineTo(this.x + 12, this.y + 10);
    ctx.closePath();
    ctx.fill();

    if (this.dying) ctx.globalAlpha = 1;
  }
}