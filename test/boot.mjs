// NOTE: enemies spawned via setTimeout (divers, level.advanceStage)
// will not appear here — synchronous loop. step 2 (clock.js) fixes this.
// Also: asteroids respawn on Y>950 (~8-15s sim time), so 600 frames
// exercises respawn only partially. Intentional for the boot test.

import { Game } from '../src/game.js';

// --- browser-global stubs (no DOM, no WebAudio) ---
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
globalThis.performance = { now: () => 0 };
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
globalThis.window = globalThis.window || { AudioContext: class {} };

const ctx = new Proxy({}, {
  get(_, prop) {
    if (prop === 'measureText') return () => ({ width: 0 });
    return () => {};
  },
});

const canvas = { width: 480, height: 800, getContext: () => ctx };

let i = 0;
try {
  const game = new Game(canvas);
  game.startGame(0);

  const STEP = 1 / 60;
  for (i = 0; i < 600; i++) {
    game.update(STEP);
    game.render();
  }

  if (!game.started) throw new Error('startGame did not take');
  if (!game.player) throw new Error('no player after startGame');
  if (!game.level) throw new Error('no level after startGame');
  if (game.level.state !== 'playing' && game.level.state !== 'boss') {
    throw new Error(`unexpected level state: ${game.level.state}`);
  }

  console.log(`boot: 600 ticks @ 1/60s = 10.00s sim | state: ${game.level?.state} | entities: ${game.entities.length} | bullets: ${game.bullets.size}/${game.enemyBullets.size} | particles: ${game.particles.size} | score: ${game.player?.score ?? 0}`);
  process.exit(0);
} catch (err) {
  console.error(`boot FAILED at step ${i}:`, err.stack);
  process.exit(1);
}