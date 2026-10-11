// Heads-Up Display logic// src/hud.js
export class Hud {
  constructor(ctx, W, H) { this.ctx = ctx; this.W = W; this.H = H; }
  draw(game) {
    const { ctx, W, H } = this;
    ctx.fillStyle = '#fff';
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`LIVES ${game.player?.lives ?? 0}`, 8, 20);
    ctx.fillText(`BOMB  ${game.player?.bombs ?? 0}`, 8, 38);
    ctx.fillText(`LV    ${game.player?.weapon ?? 1}`, 8, 56);
    ctx.textAlign = 'right';
    ctx.fillText(`LV ${game.level?.def.name ?? ''}`, W - 8, 20);
  }
}