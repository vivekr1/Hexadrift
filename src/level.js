// src/level.js
import { spawn as spawnEnemy } from './enemies.js';
import { spawnBoss } from './boss.js';
import { LEVELS } from './levels/index.js';

export class Level {
  constructor(game, stageIndex = 0) {
    this.game = game;
    this.stageIndex = stageIndex;
    this.def = LEVELS[stageIndex];
    this.state = 'intro';
    this.stateTime = 0;
    this.time = 0;
    this.fired = new Set();
    this.bossSpawned = false;
    this.boss = null;

    this.introDuration = this.def.introDuration ?? 3.0;
    this.warningDuration = this.def.warningDuration ?? 2.5;
    this.clearDuration = this.def.clearDuration ?? 5.0;

    this.fadeAlpha = 0;      // 0..1
    this.fadeDir = 0;        // 0 = none, 1 = fading to black, -1 = fading from black
  }

  update(dt) {

    this.stateTime += dt;



    // Global game-over check — fires before the switch so it overrides any state.
    if (this.game.player && (this.game.player.dying || !this.game.player.alive) &&
  this.state !== 'gameover' && this.state !== 'clear' && this.state !== 'done') {
      this.state = 'gameover';
      this.stateTime = 0;
      this.game.audio?.gameOver();
      return;
    }
    // Transition fade — starts fading out when state becomes 'clear'
    if (this.state === 'clear' && this.stateTime > this.clearDuration - 0.4 && this.fadeDir === 0) {
      this.fadeDir = 1;
    }
    if (this.fadeDir === 1) {
      this.fadeAlpha = Math.min(1, this.fadeAlpha + dt / 0.4);
      if (this.fadeAlpha >= 1) {
        this.fadeDir = -1;
        this.fadeAlpha = 1;
        this.advanceStage();
      }
    }
    if (this.fadeDir === -1) {
      this.fadeAlpha = Math.max(0, this.fadeAlpha - dt / 0.4);
      if (this.fadeAlpha <= 0) this.fadeDir = 0;
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
          this.advanceStage();
        }
        break;

      case 'victory':
        if (this.stateTime >= 2.0 && this.game.input.justPressed('Enter')) {
          const score = this.game.player?.score ?? 0;
          if (!this.game.menu?.openNameEntry(score, this.def.stage)) {
            const p = this.game.player;
            if (p) {
              p.score = 0;
              p.lives = 3;
              p.bombs = 3;
              p.weapon = 1;
              p.alive = true;
              p.x = this.game.W / 2;
              p.y = this.game.H - 100;
              p.dying = false;
              p.dyingTime = 0;
            }
            this.game.entities = p ? [p] : [];
            this.game.bullets.cull(() => false);
            this.game.enemyBullets.cull(() => false);
            this.game.pickups = [];
            this.game.level = new Level(this.game, 0);
          }
        }
        break;

      case 'gameover':
        if (this.stateTime >= 2.0 && this.game.input.justPressed('Enter')) {
          const score = this.game.player?.score ?? 0;
          if (!this.game.menu?.openNameEntry(score, this.def.stage)) {
            this.restartLevel();
          }
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
    this.game.audio?.stopGameOverMusic();
    this.game.audio?.startMusic(this.stageIndex);
    this.game.audio?.startAmbience();
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
      p.dying = false;
      p.dyingTime = 0;
      p.deathVx = 0;
      p.deathVy = -400;
    }
    //this.game.level = new Level(this.game, this.def);
    this.game.level = new Level(this.game, this.stageIndex);
    this.game.entities = p ? [p] : [];
    this.game.bullets.cull(() => false);
    this.game.enemyBullets.cull(() => false);
    this.game.pickups = [];
  }

  // advanceStage() {
  //   const next = this.stageIndex + 1;
  //   if (next >= LEVELS.length) {
  //     this.state = 'victory';
  //     this.stateTime = 0;
  //     return;
  //   }

  //   const p = this.game.player;
  //   if (p) {
  //     p.x = this.game.W / 2;
  //     p.y = this.game.H - 100;
  //     p.lives = Math.max(p.lives, 3);
  //     p.bombs = Math.max(p.bombs, 3);
  //     p.invuln = 2;
  //     p.alive = true;
  //     // score + weapon preserved
  //   }

  //   this.game.entities = p ? [p] : [];
  //   this.game.bullets.cull(() => false);
  //   this.game.enemyBullets.cull(() => false);
  //   this.game.pickups = [];
  //   this.game.level = new Level(this.game, next);
  // }

  advanceStage() {
    const next = this.stageIndex + 1;
    if (next >= LEVELS.length) {
      this.state = 'victory';
      this.stateTime = 0;
      return;
    }

    this.game.fadeDir = 1;       // start fade out
    setTimeout(() => {
      const p = this.game.player;
      if (p) {
        p.x = this.game.W / 2;
        p.y = this.game.H - 100;
        p.lives = Math.max(p.lives, 3);
        p.bombs = Math.max(p.bombs, 3);
        p.invuln = 2;
        p.alive = true;
        p.dying = false;
        p.dyingTime = 0;
        p.deathVx = 0;
        p.deathVy = -400;
      }
      this.game.entities = p ? [p] : [];
      this.game.bullets.cull(() => false);
      this.game.enemyBullets.cull(() => false);
      this.game.pickups = [];
      this.game.level = new Level(this.game, next);
        this.game.audio?.startMusic(next);
      this.game.fadeDir = -1;  // start fade in
    }, 450);
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
      case 'victory':
        return {
          line1: 'ALL STAGES CLEAR',
          line2: this.stateTime >= 2.0 ? 'PRESS ENTER TO PLAY AGAIN' : 'YOU WIN',
          color: '#ff0',
          alpha: Math.min(1, this.stateTime / 0.8),
        };
      case 'gameover': {
        const showPrompt = this.stateTime >= 2.0;
        return {
          line1: 'GAME OVER',
          line2: showPrompt ? 'PRESS ENTER TO RETRY' : '',
          color: '#f44',
          alpha: 1,
        };
      }
      default:
        return null;
    }
  }
}