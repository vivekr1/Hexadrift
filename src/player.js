// Player logic// src/player.js
export class Player {
  constructor(game, x, y) {
    this.game = game;
    this.x = x; this.y = y;
    this.r = 6;             // tiny hitbox
    this.w = 24; this.h = 24;
    this.speed = 300;
    this.alive = true;
    this.lives = 3;
    this.bombs = 3;
    this.weapon = 1;        // 1..3 power level
    this.cooldown = 0;
    this.fireRate = 0.10;
    this.invuln = 1.0;      // seconds after spawn
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

    if (this.invuln > 0) this.invuln -= dt;
  }

  shoot() {
    const { game } = this;
    const spd = 800;
    if (this.weapon === 1) {
      this.spawnBullet(0, -spd);
    } else if (this.weapon === 2) {
      this.spawnBullet(-90, -spd);
      this.spawnBullet( 90, -spd);
    } else {
      this.spawnBullet(0, -spd * 1.1);
      this.spawnBullet(-120, -spd);
      this.spawnBullet( 120, -spd);
    }
  }

  spawnBullet(vx, vy) {
    this.game.bullets.push({
      x: this.x, y: this.y - 14, vx, vy, alive: true,
      r: 4,
      update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        if (this.y < -20) this.alive = false;
      },
      draw(ctx) {
        ctx.fillStyle = '#7ff';
        ctx.fillRect(this.x - 2, this.y - 6, 4, 12);
      },
    });
  }

  hit() {
    if (this.invuln > 0) return;
    this.lives--;
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