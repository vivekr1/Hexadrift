// Enemy logic// src/enemies.js
export function spawn(game, wave) {
  switch (wave.spawn) {
    case 'scoutLine': return line(game, wave.count, 'scout');
    case 'scoutSine': return sine(game, wave.count, 'scout');
    case 'diver': return divers(game, wave.count);
    case 'turretSides': return turrets(game);
    case 'midboss1': return midboss1(game);
  }
}

function baseEnemy(game, x, y, hp, r, draw, update) {
  const e = {
    x, y, hp, r, alive: true, game,
    update(dt) { update.call(this, dt); },
    draw(ctx) { draw.call(this, ctx); },
    hit(dmg) { this.hp -= dmg; if (this.hp <= 0) this.alive = false; },
  };
  game.entities.push(e);
  return e;
}

function line(game, count, kind) {
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
      });
  }
}

function sine(game, count, kind) {
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
      });
    e.t = i * 0.3;
  }
}

function divers(game, count) {
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const px = game.player?.x ?? 240;
      baseEnemy(game, px + (Math.random() - 0.5) * 200, -30, 2, 12,
        function (ctx) {
          ctx.fillStyle = '#f6c';
          ctx.fillRect(this.x - 10, this.y - 10, 20, 20);
        },
        function (dt) {
          this.y += 320 * dt;
          if (this.y > 900) this.alive = false;
        });
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
          // shoot at player
          const p = game.player;
          if (!p) return;
          // const dx = p.x - this.x, dy = p.y - this.y;
          // const len = Math.hypot(dx, dy);
          // game.enemyBullets.push({
          //   x: this.x, y: this.y + 18,
          //   vx: (dx / len) * 220, vy: (dy / len) * 220,
          //   r: 5, alive: true,
          //   update(dt) {
          //     this.x += this.vx * dt; this.y += this.vy * dt;
          //     if (this.y > 820 || this.y < -20) this.alive = false;
          //   },
          //   draw(ctx) {
          //     ctx.fillStyle = '#f4f';
          //     ctx.beginPath();
          //     ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
          //     ctx.fill();
          //   },
          // });
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
      });
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
      // if (this.cd <= 0) {
      //   this.cd = 0.8;
      //   for (let a = -1; a <= 1; a++) {
      //     game.enemyBullets.push({
      //       x: this.x, y: this.y + 30,
      //       vx: Math.sin(this.t * 2 + a) * 180,
      //       vy: 180, r: 5, alive: true,
      //       update(dt) { this.x += this.vx * dt; this.y += this.vy * dt; if (this.y > 900) this.alive = false; },
      //       draw(ctx) { ctx.fillStyle = '#f4f'; ctx.beginPath(); ctx.arc(this.x, this.y, 5, 0, Math.PI * 2); ctx.fill(); },
      //     });
      //   }
      // }
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
    });
}

export function spawnBoss(game, name) {
  // placeholder: reuse midboss for now, expand later
  baseEnemy(game, 240, -80, 400, 60,
    function (ctx) {
      ctx.fillStyle = '#fa3';
      ctx.fillRect(this.x - 60, this.y - 40, 120, 80);
      // hp bar
      ctx.fillStyle = '#000';
      ctx.fillRect(40, 20, 400, 14);
      ctx.fillStyle = '#f33';
      ctx.fillRect(40, 20, 400 * Math.max(this.hp, 0) / 400, 14);
    },
    function (dt) {
      if (this.y < 140) this.y += 40 * dt;
      this.t = (this.t || 0) + dt;
      this.cd = (this.cd ?? 0) - dt;
      // if (this.cd <= 0 && this.y >= 135) {
      //   this.cd = 0.5;
      //   for (let i = 0; i < 8; i++) {
      //     const a = (i / 8) * Math.PI * 2 + this.t;
      //     game.enemyBullets.push({
      //       x: this.x, y: this.y,
      //       vx: Math.cos(a) * 160, vy: Math.sin(a) * 160,
      //       r: 6, alive: true,
      //       update(dt) { this.x += this.vx * dt; this.y += this.vy * dt; if (this.y > 900 || this.y < -20) this.alive = false; },
      //       draw(ctx) { ctx.fillStyle = '#f6f'; ctx.beginPath(); ctx.arc(this.x, this.y, 6, 0, Math.PI * 2); ctx.fill(); },
      //     });
      //   }
      // }

      if (this.cd <= 0 && this.y >= 135) {
        this.cd = 0.5;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + this.t;
          const b = game.enemyBullets.spawn();
          b.x = this.x;
          b.y = this.y;
          b.vx = Math.cos(a) * 160;
          b.vy = Math.sin(a) * 160;
          b.r = 6;
          b.color = '#f6f';
        }
      }
    });
}