import { Game } from '../src/game.js';
import { clock } from '../src/clock.js';

// --- browser-global stubs (headless Node) ---
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

clock.enableVirtual();

function snapshot(game) {
  return {
    t: game.time,
    level: {
      state: game.level?.state,
      stage: game.level?.def?.stage,
      stateTime: game.level?.stateTime,
    },
    player: {
      x: game.player?.x,
      y: game.player?.y,
      lives: game.player?.lives,
      bombs: game.player?.bombs,
      weapon: game.player?.weapon,
      score: game.player?.score,
      alive: game.player?.alive,
      dying: game.player?.dying,
    },
    counts: {
      entities: game.entities.length,
      bullets: game.bullets.size,
      enemyBullets: game.enemyBullets.size,
      particles: game.particles.size,
      pickups: game.pickups.length,
    },
    poolFree: {
      bullets: game.bullets.freeCount,
      enemyBullets: game.enemyBullets.freeCount,
      particles: game.particles.freeCount,
    },
  };
}

const STEP = 1 / 60;

// Sim 1
clock.seed(42);
const g1 = new Game(canvas);
g1.startGame(0);
for (let i = 0; i < 600; i++) {
  g1.update(STEP);
  g1.render();
}
const s1 = snapshot(g1);

// Sim 2 — independent Game instance, same seed
clock.seed(42);
const g2 = new Game(canvas);
g2.startGame(0);
for (let i = 0; i < 600; i++) {
  g2.update(STEP);
  g2.render();
}
const s2 = snapshot(g2);

const j1 = JSON.stringify(s1);
const j2 = JSON.stringify(s2);

if (j1 === j2) {
  console.log('determinism: PASS — snapshots byte-identical');
  process.exit(0);
} else {
  const o1 = JSON.parse(j1);
  const o2 = JSON.parse(j2);
  function findDiff(a, b, path) {
    for (const k of Object.keys(a)) {
      const p = path ? `${path}.${k}` : k;
      if (typeof a[k] === 'object' && a[k] !== null && typeof b[k] === 'object' && b[k] !== null) {
        const d = findDiff(a[k], b[k], p);
        if (d) return d;
      } else if (a[k] !== b[k]) {
        return `${p}: ${JSON.stringify(a[k])} !== ${JSON.stringify(b[k])}`;
      }
    }
    return null;
  }
  const diff = findDiff(o1, o2, '');
  console.error(`determinism: FAIL — first differing field: ${diff}`);
  process.exit(1);
}