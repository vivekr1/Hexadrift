// src/enemies.js
import { clock } from './clock.js';
import { sprite } from './assets.js';

export function spawn(game, wave) {
  switch (wave.spawn) {
    case 'scoutLine':   return line(game, wave.count);
    case 'scoutSine':   return sine(game, wave.count);
    case 'diver':       return divers(game, wave.count);
    case 'heavy':       return heavyWave(game, wave.count);
    case 'turretSides': return turrets(game);
    case 'midboss1':    return midboss1(game);
  }
}

const FLASH_TIME = 0.08;

function baseEnemy(game, x, y, hp, r, draw, update, spriteKey) {
  const e = {
    x, y, hp, r, alive: true, game,
    flash: 0,
    spriteKey,

    update(dt) {
      if (this.flash > 0) this.flash -= dt;
      update.call(this, dt);
    },

    draw(ctx) {
      const img = sprite(this.spriteKey);
      if (img) {
        const size = this.r * 2.4;
        ctx.drawImage(img, this.x - size / 2, this.y - size / 2, size, size);
      } else {
        draw.call(this, ctx);
      }

      if (this.flash > 0) {
        ctx.globalAlpha = Math.min(this.flash / FLASH_TIME, 1);
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    },

    hit(dmg) {
      this.hp -= dmg;
      this.flash = FLASH_TIME;
      if (this.hp <= 0) this.alive = false;
    },
  };
  game.entities.push(e);
  return e;
}

function line(game, count) {
  for (let i = 0; i < count; i++) {
    const x = 80 + i * 70;
    const y = -30 - i * 40;
    baseEnemy(game, x, y, 3, 14,
      function (ctx) {
        ctx.fillStyle = '#f66';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 14, 0, Math.PI * 2);
        ctx.fill();
      },
      function (dt) {
        this.y += 140 * dt;
        if (this.y > 900) this.alive = false;
      },
      'scout');
  }
}

function sine(game, count) {
  for (let i = 0; i < count; i++) {
    const e = baseEnemy(game, 0, -30 - i * 60, 3, 14,
      function (ctx) {
        ctx.fillStyle = '#fc6';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 14, 0, Math.PI * 2);
        ctx.fill();
      },
      function (dt) {
        this.t = (this.t || 0) + dt;
        this.y += 140 * dt;
        this.x = 240 + Math.sin(this.t * 2) * 160;
        if (this.y > 900) this.alive = false;
      },
      'scoutSine');
    e.t = i * 0.3;
  }
}

function divers(game, count) {
  for (let i = 0; i < count; i++) {
    clock.setTimeout(() => {
      const px = game.player?.x ?? 240;
      baseEnemy(game, px + (clock.random() - 0.5) * 200, -30, 2, 12,
        function (ctx) {
          ctx.fillStyle = '#f6c';
          ctx.fillRect(this.x - 10, this.y - 10, 20, 20);
        },
        function (dt) {
          this.y += 320 * dt;
          if (this.y > 900) this.alive = false;
        },
        'diver');
    }, i * 150);
  }
}

function turrets(game) {
  for (const x of [60, 420]) {
    baseEnemy(game, x, -30, 12, 20,
      function (ctx) {
        ctx.fillStyle = '#c9f';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 20, 0, Math.PI * 2);
        ctx.fill();
      },
      function (dt) {
        this.y += 60 * dt;
        if (this.y > 160) this.y = 160;
        this.cd = (this.cd ?? 1) - dt;
        if (this.cd <= 0 && this.y >= 155) {
          this.cd = 1.4;
          const p = game.player;
          if (!p) return;
          const dx = p.x - this.x, dy = p.y - this.y;
          const len = Math.hypot(dx, dy);
          const b = game.enemyBullets.spawn();
          b.x = this.x;
          b.y = this.y + 18;
          b.vx = (dx / len) * 220;
          b.vy = (dy / len) * 220;
          b.r = 5;
          b.color = '#f4f';
        }
      },
      'turret');
  }
}

function heavyWave(game, count) {
  const spacing = count <= 4 ? 100 : Math.floor(300 / (count - 1));
  const startX = 240 - (spacing * (count - 1)) / 2;
  for (let i = 0; i < count; i++) {
    baseEnemy(game, startX + i * spacing, -40 - i * 30, 15, 20,
      function (ctx) {
        ctx.fillStyle = '#f80';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#800';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 10, 0, Math.PI * 2);
        ctx.fill();
      },
      function (dt) {
        this.y += 90 * dt;
        this.cd = (this.cd ?? 2) - dt;
        if (this.cd <= 0 && this.y > 50) {
          this.cd = 2.5;
          const p = game.player;
          if (!p) return;
          const dx = p.x - this.x, dy = p.y - this.y;
          const len = Math.hypot(dx, dy);
          const b = game.enemyBullets.spawn();
          b.x = this.x;
          b.y = this.y + 20;
          b.vx = (dx / len) * 200;
          b.vy = (dy / len) * 200;
          b.r = 6;
          b.color = '#fa4';
        }
        if (this.y > 900) this.alive = false;
      },
      'heavy');
  }
}

function midboss1(game) {
  baseEnemy(game, 240, -60, 60, 40,
    function (ctx) {
      ctx.fillStyle = '#f88';
      ctx.fillRect(this.x - 40, this.y - 30, 80, 60);
    },
    function (dt) {
      if (this.y < 120) this.y += 60 * dt;
      this.t = (this.t || 0) + dt;
      this.cd = (this.cd ?? 0) - dt;
      if (this.cd <= 0) {
        this.cd = 0.8;
        for (let a = -1; a <= 1; a++) {
          const b = game.enemyBullets.spawn();
          b.x = this.x;
          b.y = this.y + 30;
          b.vx = Math.sin(this.t * 2 + a) * 180;
          b.vy = 180;
          b.r = 5;
          b.color = '#f4f';
        }
      }
    },
    'midboss1');
}