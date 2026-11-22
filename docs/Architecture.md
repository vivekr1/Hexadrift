# Architecture — Hexadrift

## 1. Overview

Hexadrift is a **static client-side web application** with no backend.
Built with vanilla JavaScript (ES modules), HTML5 Canvas2D, and WebAudio.
Bundled by Vite for production.

### Constraints
- No game engine — everything is hand-written on top of Canvas2D
- No server — assets served as static files, state in `localStorage`
- No dependencies at runtime (zero deps in `dependencies`, only `vite`
  in `devDependencies`)
- Must run at 60 FPS on mid-range 2018 hardware

### Style
- Object pools for anything spawned per-frame (bullets, particles)
- Plain arrays for low-frequency entities (enemies, pickups)
- Data-driven level definitions
- Factory registry pattern for bosses
- State machines for player, level, and menus

## 2. High-level architecture

┌─────────────────────────────────────────────────────┐
│ Browser │
│ │
│ ┌───────────────────────────────────────────────┐ │
│ │ Canvas element (480×800) │ │
│ └───────────────────────────────────────────────┘ │
│ ↑ render │
│ ┌───────────────────────────────────────────────┐ │
│ │ main.js — boot, game loop, render pipeline │ │
│ │ • fixed-timestep 60 Hz update │ │
│ │ • rAF render (uncapped) │ │
│ │ • object pools (bullets, enemyBullets, │ │
│ │ particles) │ │
│ │ • screen shake / hit-stop / fade │ │
│ │ • parallax stars + asteroid field │ │
│ └───────────────────────────────────────────────┘ │
│ ↓ update ↓ calls │
│ ┌─────────────┐ ┌─────────────┐ ┌────────────┐ │
│ │ level.js │ │ player.js │ │ menu.js │ │
│ │ state │ │ weapons │ │ title / │ │
│ │ machine │ │ bombs │ │ scores / │ │
│ │ │ │ dying │ │ name entry│ │
│ └─────┬───────┘ └──────┬──────┘ └──────┬─────┘ │
│ │ │ │ │
│ ↓ spawn ↓ fire ↓ save │
│ ┌─────────────┐ ┌─────────────┐ ┌────────────┐ │
│ │ enemies.js │ │ collision.js│ │highscores │ │
│ │ boss.js │ │ particles.js│ │ .js │ │
│ │ │ │ powerups.js │ │ │ │
│ └─────┬───────┘ └──────┬──────┘ └──────┬─────┘ │
│ │ │ │ │
│ └────────┬────────┴────────────────┘ │
│ ↓ │
│ ┌──────────────┐ ┌──────────────┐ │
│ │ audio.js │ │ pool.js │ │
│ │ (WebAudio) │ │ (generic) │ │
│ └──────────────┘ └──────────────┘ │
│ │
│ localStorage ←──── highscores persistence │
│ assets/ ←──── fetched via HTTP │
└─────────────────────────────────────────────────────┘
text


## 3. File responsibilities

| File | Responsibility | LOC ~ |
|---|---|---|
| `main.js` | Boot, game loop, render pipeline, pools, factories, shake/hitstop/fade, asteroid field, parallax | 500 |
| `input.js` | Keyboard capture, edge-triggered `justPressed` | 20 |
| `player.js` | Movement, shooting, weapon tiers, bombs, hit/death | 200 |
| `enemies.js` | Base enemy + 6 types | 250 |
| `boss.js` | Factory registry + 4 boss definitions | 350 |
| `particles.js` | Pooled particles + explosion presets | 100 |
| `powerups.js` | Drop table, spawn, apply effect | 100 |
| `collision.js` | 4-pass collision + onEnemyDeath | 100 |
| `pool.js` | Generic object pool | 50 |
| `level.js` | Level state machine, wave dispatch, fade, advance | 250 |
| `menu.js` | Title / high scores / name entry screens | 250 |
| `highscores.js` | localStorage CRUD | 40 |
| `hud.js` | HUD text rendering | 30 |
| `audio.js` | WebAudio init, gain graph, sample decode, playback, fallbacks | 400 |
| `levels/*.js` | Per-stage wave definitions (data only) | 30 each |

Total: ~2,700 LOC (excluding assets).

## 4. Core patterns

### 4.1 Fixed-timestep game loop

```js
function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.25);
    last = now;
    acc += dt;
    while (acc >= STEP) {           // STEP = 1/60
        update(STEP);
        acc -= STEP;
    }
    render();
    requestAnimationFrame(frame);
}

Why: deterministic updates; render runs uncapped for smooth visuals.
Delta cap at 0.25 s prevents runaway catch-up after tab-switch.
4.2 Object pooling

Anything spawned at >10 Hz lives in a Pool:
js

class Pool {
    spawn()              // pop from free list, mark alive, push to active
    update(dt)           // update each active; if !alive, splice + push to free
    cull(predicate)      // force-free dead or off-screen objects
    draw(ctx)            // iterate active for rendering
    get list()           // for read-only iteration by collision
    get size()           // active count
    get freeCount()      // free count (debug)
}

Three pools: game.bullets (200), game.enemyBullets (400),
game.particles (600). Entities and pickups use plain arrays because
their spawn rate is O(1) per second, not O(10+).

Invariant: every .spawn() must set every field the object uses.
Missing field assignment causes state to leak from the previous life of
that pooled object (e.g., wrong bullet color).
4.3 Level state machine

Level.update() switches on state:
State	Duration	Transition
intro	3 s	→ playing
playing	until bossAt-warning	→ warning
warning	2.5 s	→ boss
boss	until boss.alive = false	→ clear
clear	4–6 s	→ advance (fade out) or → victory (final)
victory	Enter-gated	→ stage 0 (fresh game)
gameover	2 s + Enter	→ nameEntry → restart current stage

Global game-over check runs before the switch:
if (player.dying || !player.alive) { state = 'gameover'; }
4.4 Boss factory registry
js

const BOSSES = { boss1, boss2, boss3, boss4 };
export function spawnBoss(game, name) {
    return BOSSES[name]?.(game) ?? null;
}

Levels reference bosses by string name in their data file. Adding a boss
requires only a function + registry entry.
4.5 Data-driven waves

Each level is a plain object:
js

export const level1 = {
    stage: 1, name: 'Orbital Belt',
    introDuration: 3.0, warningDuration: 2.5, clearDuration: 5.0,
    waves: [
        { t: 1,  spawn: 'scoutLine', count: 5 },
        { t: 6,  spawn: 'scoutSine', count: 5 },
        ...
    ],
    bossAt: 60, boss: 'boss1',
};

Level.fireWaves() compares this.time against wave.t and calls
enemies.spawn(game, wave) once per wave (tracked in this.fired Set).
No code changes required to add waves.
4.6 Audio fallback chain
text

requested sample → buffers[key] → synth equivalent
requested stage music → musicBuffers[stage] → musicBuffers[0] → synth arpeggio

Buffers are decoded asynchronously on init. If startMusic(stage) is
called before buffers are ready, _pendingMusicStage is set and the
load callback fires the pending start when the buffer arrives.
5. Data flow
Frame update order (strict)
text

input.update()*  ←──── called at END of previous frame
    ↓
update(dt):
    1. game.time += dt
    2. decay timers (shake, hitstop, bombFlash)
    3. if hitstop > 0: return (skip all gameplay)
    4. if menu.active: menu.update(); return
    5. if paused: return
    6. level.update(dt)          ← may transition state, spawn boss/waves
    7. entities.update(dt)       ← player + enemies + bosses
    8. bullets.update(dt)
    9. enemyBullets.update(dt)
    10. particles.update(dt)
    11. runCollisions(game)      ← damage resolution
    12. cull off-screen entities and pooled objects
    13. input.update()*          ← clear edge-triggered state

Invariant: input.update() must run after all systems have
consumed justPressed() for the frame, or edge-triggered inputs are lost.
Frame render order
text

render():
    1. fill black
    2. ctx.save(); apply shake translate
    3. drawStars (parallax)
    4. drawAsteroids (stage 1 only)
    5. if menu.active: menu.render(); ctx.restore(); return
    6. particles.draw
    7. entities.draw (player, enemies, bosses)
    8. bullets.draw
    9. pickups.draw
    10. enemyBullets.draw
    11. bombFlash overlay
    12. banner (WARNING / STAGE CLEAR / etc)
    13. ctx.restore()                 ← end shake scope
    14. warning red pulse
    15. hud.draw                      ← NOT shaken
    16. debug hitboxes
    17. fade overlay
    18. pause overlay

Invariant: every ctx.save() must pair with exactly one
ctx.restore() on every code path. The menu early-return must restore
before returning.
6. Collision architecture

Four independent passes per frame, all using squared-distance:
Pass	For each	Against	On hit
1	Player bullet	Entity	e.hit(dmg), kill bullet, spark, onEnemyDeath if dead
2	Enemy bullet	Player (if invuln ≤ 0)	player.hit(), kill bullet
3	Player	Entity body	player.hit(), break
4	Player	Pickup	applyPickup, kill pickup

Why squared distance: Math.hypot calls Math.sqrt, which is slow in hot
loops. dx*dx + dy*dy <= r*r is equivalent and ~3× faster.

Collision layers: implicit through e === player and e.hit checks.
Player doesn't damage itself; pickups don't damage player; etc.

Boss invulnerability during entrance: if (e.invuln > 0) continue; in
pass 1. invuln is set by makeBoss to 0 and only used for custom boss
behaviour.
7. Rendering
Canvas

    480 × 800 logical pixels

    CSS scales to fit viewport (aspect-ratio + max-height)

    image-rendering: pixelated for crisp geometry

Shape primitives

Everything is drawn with ctx.beginPath/fill/stroke — circles, rects,
triangles, polygons. No external sprite art in v1.
Parallax

Two star arrays (starsFar, starsNear) with different speeds and
sizes. Colors come from STAGE_STAR_COLORS[stageIndex].

Asteroid field (stage 1 only): 14 objects in asteroids[], each with
vertices (6–9 sides, irregular radii), rotation state, and scroll velocity.
Wraps to top when off bottom.
Effects

    Shake: translate the game-world ctx.save() scope by a random
    offset scaled by shakePower * (shakeTime / shakeDur)

    Hit-stop: freeze update(), keep render() running (so the last
    frame is shown, then resumes)

    Fade: overlay a rgba(0,0,0,fadeAlpha) rect

8. Audio architecture
Gain graph
text

masterGain (1.0) — mute toggles this
    ├── sfxGain (0.35)
    ├── musicGain (0.25)   ← music, menu, stage tracks
    ├── ambienceGain (0.15)
    └── gameOverGain (0.25)

Each channel is independently adjustable. Mute is a single
masterGain.gain.value = 0 toggle.
Primitive SFX

    _tone(freq, dur, opts) — oscillator with optional exponential ramp

    _noise(dur, opts) — white-noise buffer with linear gain envelope

    _sample(key, opts) — plays a decoded AudioBuffer if available, else
    returns false so caller can fall back

Each SFX preset (shoot, scout, bomb, etc.) tries _sample first,
then falls back to _tone/_noise.
Music lifecycle

    init() starts 4 async music loads via _loadOneMusic(i, url)

    startMusic(stageIndex):

        Stops any current musicSource

        Picks musicBuffers[stageIndex] or falls back

        Starts a looping buffer source on musicGain

        If buffers not loaded yet, sets _pendingMusicStage and returns

    _loadOneMusic on completion checks _pendingMusicStage and fires
    startMusic if it matches

Same pattern for menu, gameOver, ambience (each with own buffer
slot, source, and start/stop methods).
9. Persistence

Only localStorage, key hexadrift.highscores.v1.
js

{
  "highscores": [
    { name: "AAA", score: 27000, stage: 4, ts: 1700000000000 },
    ...
  ]
}

Top 5 entries retained. qualifies(score) returns true if score > 0 and
the score is higher than the 5th entry (or the list has < 5 entries).

addScore(name, score, stage) inserts, sorts descending, truncates to 5,
writes back.
10. Build & deployment
Development
text

npm run dev        → Vite dev server at localhost:5173

Production
text

npm run build      → dist/ folder

Vite:

    Bundles all src/*.js into a single chunk

    Copies public/ verbatim to dist/

    Minifies, hashes filenames

Requirement: all assets/* must be under public/assets/ for the
build to include them. During dev, files can be at root assets/
(Vite serves both), but for production they must be in public/.