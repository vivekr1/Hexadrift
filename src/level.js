// src/level.js
import { spawn as spawnEnemy } from './enemies.js';
import { spawnBoss } from './boss.js';

export class Level {
  constructor(game, def) {
    this.game = game;
    this.def = def;
    this.state = 'intro';
    this.stateTime = 0;
    this.time = 0;              // time since 'playing' started
    this.fired = new Set();
    this.bossSpawned = false;
    this.boss = null;

    this.introDuration = def.introDuration ?? 3.0;
    this.warningDuration = def.warningDuration ?? 2.5;
    this.clearDuration = def.clearDuration ?? 5.0;
  }

  update(dt) {
    this.stateTime += dt;

    // Global game-over check — fires before the switch so it overrides any state.
    if (this.game.player && !this.game.player.alive &&
      this.state !== 'gameover' && this.state !== 'clear' && this.state !== 'done') {
      this.state = 'gameover';
      this.stateTime = 0;
      this.game.audio?.gameOver();
      return;
    }

    switch (this.state) {
      case 'intro':
        if (this.stateTime >= this.introDuration) {
          this.state = 'playing';
          this.stateTime = 0;
          this.time = 0;
        }
        break;

      case 'playing':
        this.time += dt;
        this.fireWaves();
        if (this.time >= this.def.bossAt - this.warningDuration) {
          this.state = 'warning';
          this.stateTime = 0;
          this.game.audio?.warning();
        }
        break;

      case 'warning':
        this.time += dt;
        if (this.stateTime >= this.warningDuration) {
          this.state = 'boss';
          this.stateTime = 0;
          this.spawnBossNow();
        }
        break;

      case 'boss':
  this.time += dt;
  if (this.boss && !this.boss.alive) {
    this.state = 'clear';
    this.stateTime = 0;
    if (this.game.player) this.game.player.score += 5000;
    this.game.audio?.stageClear();
  }
  break;

      case 'clear':
        if (this.stateTime >= this.clearDuration) {
          this.restartLevel();
        }
        break;

      case 'gameover':
        if (this.stateTime >= 4.0) {
          this.restartLevel();
        }
        break;
    }
  }

  fireWaves() {
    for (let i = 0; i < this.def.waves.length; i++) {
      const w = this.def.waves[i];
      if (!this.fired.has(i) && this.time >= w.t) {
        this.fired.add(i);
        spawnEnemy(this.game, w);
      }
    }
  }

  spawnBossNow() {
    if (this.bossSpawned) return;
    this.bossSpawned = true;
    this.boss = spawnBoss(this.game, this.def.boss);
  }

  restartLevel() {
    const p = this.game.player;
    if (p) {
      const prevScore = p.score;
      p.x = this.game.W / 2;
      p.y = this.game.H - 100;
      p.lives = 3;
      p.bombs = 3;
      p.weapon = 1;
      p.invuln = 2;
      p.alive = true;
      p.score = prevScore;
    }
    this.game.level = new Level(this.game, this.def);
    this.game.entities = p ? [p] : [];
    this.game.bullets.cull(() => false);
    this.game.enemyBullets.cull(() => false);
    this.game.pickups = [];
  }

  // Returns { line1, line2, color, alpha } or null. main.js renders it.
  getBanner() {
    switch (this.state) {
      case 'intro': {
        const t = this.stateTime, total = this.introDuration;
        let a = 1;
        if (t < 0.5) a = t / 0.5;
        else if (t > total - 0.5) a = (total - t) / 0.5;
        return {
          line1: `STAGE ${this.def.stage ?? 1}`,
          line2: this.def.name.toUpperCase(),
          color: '#8ef',
          alpha: Math.max(0, Math.min(1, a)),
        };
      }
      case 'warning': {
        const flash = Math.sin(this.stateTime * 12) > 0 ? 1 : 0.4;
        return {
          line1: '!! WARNING !!',
          line2: 'BOSS APPROACHING',
          color: '#f44',
          alpha: flash,
        };
      }
      case 'clear':
        return {
          line1: 'STAGE CLEAR',
          line2: '',
          color: '#8f8',
          alpha: Math.min(1, (this.clearDuration - this.stateTime) / 0.8),
        };
      case 'gameover':
        return {
          line1: 'GAME OVER',
          line2: '',
          color: '#f44',
          alpha: 1,
        };
      default:
        return null;
    }
  }
}