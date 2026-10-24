// src/player.js
import { explosions } from './particles.js';

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
  }

  update(dt) {
    const { input, W, H } = this.game;
    let dx = 0, dy = 0;
    if (input.down('ArrowLeft') || input.down('KeyA'))  dx -= 1;
    if (input.down('ArrowRight')|| input.down('KeyD'))  dx += 1;
    if (input.down('ArrowUp')   || input.down('KeyW'))  dy -= 1;
    if (input.down('ArrowDown') || input.down('KeyS'))  dy += 1;

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
  }

  shoot() {
    const spd = 800;
    const lvl = this.weapon;

    if (lvl === 1) {
      // Single straight shot
      this.spawnBullet(0, 0, -spd, 1);

    } else if (lvl === 2) {
      // Two parallel shots, offset left/right
      this.spawnBullet(-8, 0, -spd, 1);
      this.spawnBullet( 8, 0, -spd, 1);

    } else {
      // Level 3: strong center + two angled wings
      const angle = 0.22;
      const vxOff = Math.sin(angle) * spd;   // ~175 px/s sideways
      this.spawnBullet( 0, 0,       -spd * 1.15, 2);
      this.spawnBullet(-6, -vxOff,  -spd,        1);
      this.spawnBullet( 6,  vxOff,  -spd,        1);
    }
  }

  // Signature: offsetX, vx, vy, damage
  spawnBullet(offsetX, vx, vy, damage = 1) {
    const b = this.game.bullets.spawn();
    this.game.audio.shoot();
    b.x = this.x + offsetX;
    b.y = this.y - 14;
    b.vx = vx;
    b.vy = vy;
    b.r = 4;
    b.damage = damage;
  }

  useBomb() {
    if (this.bombs <= 0) return;
    this.bombs--;

    this.invuln = Math.max(this.invuln, 1.6);

    // NOTE: .list — because enemyBullets is now a Pool, not an array
    for (const b of this.game.enemyBullets.list) b.alive = false;

    for (const e of this.game.entities) {
      if (e === this || !e.alive) continue;
      if (typeof e.hit !== 'function') continue;
      e.killedByBomb = true;
      e.hit(15);
    }

    this.game.bombFlash = 0.45;
    this.game.audio.bomb();explosions.bomb(this.game, this.x, this.y);
  }

  hit() {
    if (this.invuln > 0) return;
    this.lives--;
    this.game.audio.playerHit();
    this.invuln = 2;
    if (this.lives < 0) this.alive = false;
  }

  draw(ctx) {
    if (this.invuln > 0 && Math.floor(this.invuln * 20) % 2 === 0) return;
    ctx.fillStyle = '#5ef';
    ctx.beginPath();
    ctx.moveTo(this.x, this.y - 14);
    ctx.lineTo(this.x - 12, this.y + 10);
    ctx.lineTo(this.x, this.y + 4);
    ctx.lineTo(this.x + 12, this.y + 10);
    ctx.closePath();
    ctx.fill();
  }
}