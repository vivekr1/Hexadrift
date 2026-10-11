// Level management and wave spawner logic// src/level.js
import { spawn as spawnEnemy } from './enemies.js';
//import { spawnBoss } from './boss.js';
import { spawnBoss } from './enemies.js';

export class Level {
  constructor(game, def) {
    this.game = game;
    this.def = def;
    this.time = 0;
    this.fired = new Set();
    this.bossSpawned = false;
  }

  update(dt) {
    this.time += dt;

    for (let i = 0; i < this.def.waves.length; i++) {
      const w = this.def.waves[i];
      if (!this.fired.has(i) && this.time >= w.t) {
        this.fired.add(i);
        spawnEnemy(this.game, w);
      }
    }

    if (!this.bossSpawned && this.time >= this.def.bossAt) {
      this.bossSpawned = true;
      spawnBoss(this.game, this.def.boss);
    }
  }
}