// Powerup logic// src/powerups.js

// Drop chance per enemy rank.
const DROP_CHANCE = {
  common:   0.04,
  uncommon: 0.18,
  boss:     1.00,
};

// Weighted roll for what actually drops.
function rollType(rank) {
  const r = Math.random();
  if (rank === 'boss')     return 'weapon';       // boss always drops a weapon
  if (rank === 'uncommon') return r < 0.65 ? 'weapon' : 'bomb';
  return r < 0.6 ? 'weapon' : 'bomb';             // common
}

export function maybeDrop(game, x, y, rank = 'common') {
  if (Math.random() > (DROP_CHANCE[rank] ?? 0.04)) return;
  spawnPickup(game, x, y, rollType(rank));

  // Boss also drops a bomb, for good measure.
  if (rank === 'boss') spawnPickup(game, x + 20, y + 10, 'bomb');
}

export function spawnPickup(game, x, y, type) {
  const p = {
    x, y, type,
    r: 14,
    vy: 40,
    t: 0,
    alive: true,

    update(dt) {
      this.t += dt;
      this.vy = Math.min(this.vy + 60 * dt, 140);
      this.y += this.vy * dt;

      // Magnet toward the player when close.
      const pl = game.player;
      if (pl && pl.alive) {
        const dx = pl.x - this.x;
        const dy = pl.y - this.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < 110) {
          this.x += (dx / d) * 220 * dt;
          this.y += (dy / d) * 220 * dt;
        }
      }

      if (this.y > 900) this.alive = false;
    },

    draw(ctx) {
      const pulse = 0.5 + 0.5 * Math.sin(this.t * 8);
      ctx.save();
      ctx.globalAlpha = 0.35 + 0.35 * pulse;
      ctx.fillStyle = this.type === 'weapon' ? '#4f8' : '#fa4';
      ctx.beginPath();
      ctx.arc(this.x, this.y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Ring
      ctx.strokeStyle = this.type === 'weapon' ? '#8fc' : '#fda';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 12, 0, Math.PI * 2);
      ctx.stroke();

      // Letter
      ctx.fillStyle = '#000';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.type === 'weapon' ? 'W' : 'B', this.x, this.y + 1);
    },
  };
  game.pickups.push(p);
  return p;
}

export function applyPickup(game, p) {
  const pl = game.player;
  if (!pl || !pl.alive) return;

  if (p.type === 'weapon') {
    // Cap at level 3.
    if (pl.weapon < 3) pl.weapon++;
    else pl.score += 500;   // already maxed: bonus points
  } else if (p.type === 'bomb') {
    pl.bombs = Math.min(pl.bombs + 1, 5);
  }
}