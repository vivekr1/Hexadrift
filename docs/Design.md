# Game Design Document — Demon Starship

## 1. Vision

A faithful, modern-feeling tribute to arcade-era vertical shooters. Fast,
legible, punishing but fair. Every stage has a distinct feel. Every boss
is a distinct fight. The player's tools (weapons, bombs, positioning)
scale with their skill.

**Pillars**
1. **Readable chaos** — bullets are visible, patterns are learnable.
2. **Escalation** — stage 1 teaches, stage 4 tests everything.
3. **Impact** — hits feel like hits (shake, flash, sound, particles).
4. **Replayability** — the scoreboard is the reason to run it again.

## 2. Core loop
arkdown

# Game Design Document — Demon Starship

## 1. Vision

A faithful, modern-feeling tribute to arcade-era vertical shooters. Fast,
legible, punishing but fair. Every stage has a distinct feel. Every boss
is a distinct fight. The player's tools (weapons, bombs, positioning)
scale with their skill.

**Pillars**
1. **Readable chaos** — bullets are visible, patterns are learnable.
2. **Escalation** — stage 1 teaches, stage 4 tests everything.
3. **Impact** — hits feel like hits (shake, flash, sound, particles).
4. **Replayability** — the scoreboard is the reason to run it again.

## 2. Core loop

Title → Select Play → Stage 1 → Boss → Stage 2 → Boss
→ Stage 3 → Boss → Stage 4 → Boss → Victory → Title
↓
(death) → Game Over → Name Entry → Title
text


## 3. Player

| Property | Value |
|---|---|
| Hitbox radius | 6 px (sprite ~24 px) |
| Speed | 300 px/s |
| Lives | 3 |
| Bombs | 3 (cap 5) |
| Fire rate | 0.10 s |
| Invuln after hit | 2.0 s |
| Invuln on spawn | 1.0 s |
| Invuln after bomb | 1.6 s |
| Death animation | 1.2 s fly-up with spark trail |

### Weapons

| Level | Pattern | Damage | Shots/sec |
|---|---|---|---|
| 1 | Single forward | 1 | 10 |
| 2 | Two parallel | 1 each | 20 |
| 3 | Center (2 dmg) + 2 angled | 2 + 1 + 1 | 30 |

Weapon level caps at 3. Further W pickups grant +500 score.
Weapon persists across stages; resets to 1 on death.

### Bombs
- Clears all enemy bullets on screen
- 15 damage to all enemies and boss
- 1.6 s invulnerability
- Visual: expanding white ring + radial particle burst + screen flash + shake
- No loot drops from bomb kills (anti-farming)

## 4. Enemies

| Type | HP | Radius | Behaviour |
|---|---|---|---|
| Line scout | 3 | 14 | Straight down in V-formation |
| Sine scout | 3 | 14 | Sine-wave descent |
| Diver | 2 | 12 | Delayed spawn, fast dive toward player column |
| Turret | 12 | 20 | Descends to y=160, locks, fires aimed |
| Heavy | 15 | 20 | Slow descent, fires aimed orange bolts every 2.5 s |
| Midboss1 | 60 | 40 | Descends, fires 3-shot sweeping bursts |

### Hit flash
All enemies flash white for 0.08 s when damaged.

### Drops

| Rank | Chance | Type roll |
|---|---|---|
| Common (r < 20) | 4% | 60% W / 40% B |
| Uncommon (r ≥ 20) | 18% | 65% W / 35% B |
| Boss (r ≥ 40) | 100% | Weapon + extra bomb |

## 5. Bosses

All bosses:
- Enter from top (y = -120) over ~3 s
- Cannot be damaged while entering
- Have HP bar at top of screen
- Transition phases at 66% and 33% HP
- Flash white on hit
- Grant 5000 score on death
- Drop weapon + bomb guaranteed

| Boss | HP | Phase 0 | Phase 1 | Phase 2 |
|---|---|---|---|---|
| boss1 (Orbital Guardian) | 220 | 3-spread aimed | 12-ring rotating | 16-ring + aimed |
| boss2 (Dreadnought) | 400 | Twin aimed | 10-ring + aimed | 14-ring + twin aimed |
| boss3 (Fortress Core) | 550 | 1-arm spiral | 2-arm spiral + aimed | 3-arm spiral + aimed |
| boss4 (Demon Core) | 750 | 3-spread aimed | 18-ring + aimed | 24-ring + 3-spread aimed |

All rings/bursts use 1.1–2.5 s cadence in phase 0, tighten to 0.55–0.9 s
in phase 2.

## 6. Levels

| Stage | Name | Duration (to boss) | Theme | Palette |
|---|---|---|---|---|
| 1 | Orbital Belt | 60 s | Blue stars, asteroid field | Cool blues |
| 2 | Enemy Fleet | 75 s | Yellow stars, dense formations | Warned yellows |
| 3 | Planet Surface | 90 s | Pink stars, heavy enemy mix | Alien pinks |
| 4 | Demon Starship Core | 105 s | Red stars, max enemy density | Infernal reds |

Each stage has 7–16 wave entries with `{ t, spawn, count }` metadata. Waves
are fired relative to stage-play start (not global time). Late-stage waves
overlap more (higher pressure).

### Stage state machine

intro (3s) → playing → warning (2.5s) → boss → clear (4-6s) → advance
↓
(final) victory
↓ (player dies)
gameover → Enter → nameEntry (if qualifies) → restartLevel
↓ (no qualify)
restartLevel
text


### Banner text
- INTRO: "STAGE N" / "STAGE NAME" — 0.5 s fade in, hold, 0.5 s fade out
- WARNING: "!! WARNING !!" / "BOSS APPROACHING" — pulsing flash
- CLEAR: "STAGE CLEAR"
- VICTORY: "ALL STAGES CLEAR" / "YOU WIN" → "PRESS ENTER TO PLAY AGAIN"
- GAME OVER: "GAME OVER" / (2 s later) "PRESS ENTER TO RETRY"

## 7. Audio design

### Music
- **Menu** (`menu.mp3`): plays on title screen
- **Stage tracks** (`stage1-4.mp3`): one per stage, hard-cut on transition
- **Ambience** (`ambience.wav`): slow drone under battle music, mimics
  engine room / fuel burn
- **Game over** (`game_over.mp3`): ~60 s, loops; bgm and ambience hard-stop

Suggested genre mapping:
- Stage 1: Upbeat 138 BPM, chiptune arpeggios
- Stage 2: Rock 150 BPM, palm-muted riffs
- Stage 3: Trance 142 BPM, no build/drop
- Stage 4: Opera 110 BPM, choral, no solo vocals

### SFX
Sampled (WAV): explode_small, explode_medium, explode_large, playerHit,
pickup, bomb.
Synthesized: shoot, enemyHit, warning, stageClear (and all fallbacks).

Shot SFX rate-limited to 55 ms between plays so weapon level 3 doesn't
become a buzzsaw.

## 8. Visual design

### Aesthetic
- Geometric primitives (circles, rectangles, triangles, polygons) — no
  external sprite art in v1
- Pixel-perfect rendering (`image-rendering: pixelated`)
- Color language:
  - Player bullets: cyan
  - Enemy bullets: magenta, orange
  - Explosions: warm (orange, white)
  - Boss phases: yellow → orange → red

### Parallax
Two starfield layers:
- Far: slow (~30–90 px/s), dim, small
- Near: fast (~100–260 px/s), bright, larger

Color palette swaps per stage (see table above).

Stage 1 also shows ~14 asteroid polygons behind the playfield: sizes
30–180 px, slow rotation, irregular shapes with inner shading. Menu
screen previews them.

### Screen effects
| Effect | Trigger | Params |
|---|---|---|
| Shake | Player hit | 0.35 s / 14 px |
| Shake | Bomb | 0.5 s / 18 px |
| Shake | Small enemy death | 0.15 s / 6 px |
| Shake | Midboss death | 0.4 s / 12 px |
| Shake | Boss death | 0.8 s / 22 px |
| Hit-stop | Boss death | 0.12 s freeze |
| Muzzle flash | Player shot | 0.06 s white dot |
| Warning pulse | Warning state | 12 Hz red tint, 12% alpha |
| Fade | Stage transition | 0.4 s to black, then back |

### HUD
Top-left: `LIVES N`, `BOMB N`, `LV N` (weapon level)
Top-right: `LV stage name`, `SCORE N`
Boss fight: HP bar (40 px margin, full width, red fill)

## 9. Difficulty tuning

### Intended difficulty curve

Stage 1 ██░░░░░░░░ ← gentle, teaches mechanics
Stage 2 ████░░░░░░ ← moderate escalation
Stage 3 ██████░░░░ ← real challenge
Stage 4 █████████░ ← punishing but fair
text


### Per-stage wave count: 7 / 13 / 13 / 16

The jump from 7→13 waves between stage 1 and 2 is intentional — stage 1
is a long tutorial.

### Boss difficulty
- boss1 teaches phase-transition pacing
- boss2 punishes poor positioning (twin aimed shots force movement)
- boss3 punishes staying still (spiral)
- boss4 combines all: aimed + rings + fast movement

### Score economy
- Common enemy kill: +50
- Boss kill: +5000
- W pickup at max weapon: +500
- (Optional future) no-miss bonus, boss-time bonus

Target good-run score: ~25,000–35,000 (mostly from bosses).

## 10. UX flows

### Title → play
1. Land on title. Menu music. "PRESS ANY KEY" (audio locked).
2. First input: audio unlocks, prompt changes to "PRESS ENTER TO PLAY".
3. Enter → game starts. Menu music cuts, stage 1 music + ambience start.
4. Or H → high score view → Enter → back.

### Death → retry
1. Fourth hit: ship flies up, sparks trail, fades. World dims to 40%.
2. GAME OVER banner appears. Game-over theme loops.
3. 2 s later: "PRESS ENTER TO RETRY" appears.
4. Enter → name entry (if score qualifies) → high scores → Enter → title.
   - or → score doesn't qualify → restart current stage directly.

### Victory
1. Stage 4 boss dies. STAGE CLEAR banner for 6 s.
2. "ALL STAGES CLEAR / YOU WIN" for 2 s.
3. "PRESS ENTER TO PLAY AGAIN" appears.
4. Enter → name entry (if score qualifies) → title.

### Pause
1. P or Esc during play → world freezes, PAUSED overlay, "P / ESC to resume".
2. Input state cleared so the pause keypress doesn't leak into gameplay.
3. Resume → world continues from exact state.

## 11. Future direction (post-v1)

Priority order:
1. Real sprite art (player, enemies, bullets)
2. Per-stage background art (replacing procedural starfield)
3. Touch controls for mobile
4. Online leaderboards (Firebase or Supabase)
5. Additional stages (5–8) with new boss archetypes
6. Gamepad support
7. Ship selection / customization