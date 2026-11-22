// src/menu.js
import { loadScores, qualifies, addScore, LETTERS } from './highscores.js';

export class Menu {
  constructor(game) {
    this.game = game;
    this.screen = 'title';       // 'title' | 'highscores' | 'nameEntry'
    this.scores = loadScores();
    this.nameEntry = null;
  }

  get active() {
    return !this.game.started;
  }

  openNameEntry(score, stage) {
    if (!qualifies(score)) return false;
    this.nameEntry = { chars: ['A', 'A', 'A'], cursor: 0, score, stage };
    this.screen = 'nameEntry';
    this.game.started = false;    // freeze gameplay
    return true;
  }

  update() {
    const i = this.game.input;
    if (!this.game.audioInited) return;

    if (this.screen === 'title') {
      if (i.justPressed('Enter')) this.game.startGame();
      else if (i.justPressed('KeyH')) this.screen = 'highscores';

    } else if (this.screen === 'highscores') {
      if (i.justPressed('Enter') || i.justPressed('Escape')) this.screen = 'title';

    } else if (this.screen === 'nameEntry') {
      const ne = this.nameEntry;
      if (i.justPressed('ArrowLeft'))  ne.cursor = (ne.cursor + 2) % 3;
      if (i.justPressed('ArrowRight')) ne.cursor = (ne.cursor + 1) % 3;
      if (i.justPressed('ArrowUp')) {
        const idx = LETTERS.indexOf(ne.chars[ne.cursor]);
        ne.chars[ne.cursor] = LETTERS[(idx + 1) % LETTERS.length];
      }
      if (i.justPressed('ArrowDown')) {
        const idx = LETTERS.indexOf(ne.chars[ne.cursor]);
        ne.chars[ne.cursor] = LETTERS[(idx - 1 + LETTERS.length) % LETTERS.length];
      }
      if (i.justPressed('Enter')) {
        addScore(ne.chars.join('').trim() || 'AAA', ne.score, ne.stage);
        this.scores = loadScores();
        this.nameEntry = null;
        this.screen = 'highscores';
      }
    }
  }

  render(ctx, W, H) {
    if (this.screen === 'title') this.renderTitle(ctx, W, H);
    else if (this.screen === 'highscores') this.renderHighscores(ctx, W, H);
    else if (this.screen === 'nameEntry') this.renderNameEntry(ctx, W, H);
  }

  renderTitle(ctx, W, H) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 52px monospace';
    ctx.fillStyle = '#111';
    ctx.fillText('HEXADRIFT', W / 2 + 3, H / 2 - 100 + 3);
    ctx.fillStyle = '#5ef';
    ctx.fillText('HEXADRIFT', W / 2, H / 2 - 100);

    ctx.font = '18px monospace';
    ctx.fillStyle = '#8af';
    ctx.fillText('Drift. Shoot. Survive.', W / 2, H / 2 - 50);

    const blink = 0.5 + 0.5 * Math.sin(performance.now() / 400);
    ctx.globalAlpha = blink;
    ctx.font = '22px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText(
      this.game.audioInited ? 'PRESS ENTER TO PLAY' : 'PRESS ANY KEY',
      W / 2, H / 2 + 40
    );
    ctx.globalAlpha = 1;

    if (this.game.audioInited) {
      ctx.font = '16px monospace';
      ctx.fillStyle = '#8af';
      ctx.fillText('H — HIGH SCORES', W / 2, H / 2 + 90);
    }

    ctx.font = '12px monospace';
    ctx.fillStyle = '#555';
    ctx.fillText('WASD / Arrows: move · Space/Z: fire · X: bomb', W / 2, H - 70);
    ctx.fillText('P: pause · M: mute · `: hitboxes', W / 2, H - 50);

    ctx.restore();
  }

  renderHighscores(ctx, W, H) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 36px monospace';
    ctx.fillStyle = '#5ef';
    ctx.fillText('HIGH SCORES', W / 2, 80);

    if (this.scores.length === 0) {
      ctx.font = '18px monospace';
      ctx.fillStyle = '#888';
      ctx.fillText('No scores yet', W / 2, H / 2);
    } else {
      ctx.font = '22px monospace';
      for (let i = 0; i < this.scores.length; i++) {
        const s = this.scores[i];
        const y = 180 + i * 55;
        ctx.fillStyle = i === 0 ? '#ff0' : '#fff';
        ctx.textAlign = 'left';
        ctx.fillText(`${i + 1}. ${s.name}`, 80, y);
        ctx.textAlign = 'right';
        ctx.fillText(`${s.score}`, W - 80, y);
        ctx.textAlign = 'center';
        if (s.stage) {
          ctx.font = '13px monospace';
          ctx.fillStyle = '#666';
          ctx.fillText(`stage ${s.stage}`, W / 2, y + 20);
          ctx.font = '22px monospace';
        }
      }
    }

    ctx.font = '16px monospace';
    ctx.fillStyle = '#8af';
    ctx.fillText('ENTER — BACK', W / 2, H - 60);

    ctx.restore();
  }

  renderNameEntry(ctx, W, H) {
    const ne = this.nameEntry;
    if (!ne) return;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 40px monospace';
    ctx.fillStyle = '#ff0';
    ctx.fillText('NEW HIGH SCORE!', W / 2, 120);

    ctx.font = '18px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText(`SCORE: ${ne.score}`, W / 2, 180);
    ctx.fillText(`STAGE: ${ne.stage}`, W / 2, 210);

    const boxW = 60, boxH = 70, gap = 12;
    const total = boxW * 3 + gap * 2;
    const startX = W / 2 - total / 2;
    const y = H / 2 - 20;

    for (let i = 0; i < 3; i++) {
      const x = startX + i * (boxW + gap);
      const active = i === ne.cursor;
      ctx.fillStyle = active ? 'rgba(255,255,0,0.15)' : 'rgba(255,255,255,0.05)';
      ctx.fillRect(x, y, boxW, boxH);
      ctx.strokeStyle = active ? '#ff0' : '#555';
      ctx.lineWidth = active ? 3 : 1;
      ctx.strokeRect(x, y, boxW, boxH);
      ctx.font = 'bold 40px monospace';
      ctx.fillStyle = active ? '#ff0' : '#fff';
      ctx.fillText(ne.chars[i], x + boxW / 2, y + boxH / 2);
    }

    ctx.font = '14px monospace';
    ctx.fillStyle = '#8af';
    ctx.fillText('← → move cursor · ↑ ↓ change letter', W / 2, y + boxH + 50);
    ctx.fillStyle = '#fff';
    ctx.fillText('ENTER to confirm', W / 2, y + boxH + 80);

    ctx.restore();
  }
}