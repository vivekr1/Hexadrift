# Requirements — Demon Starship

## 1. Overview

**Demon Starship** is a browser-based vertical-scrolling shoot-'em-up (shmup),
inspired by *DemonStar* (1997). The player pilots a single ship through four
stages, defeating waves of enemies and a unique multi-phase boss per stage.
Progress and score are tracked locally; high scores persist across sessions.

## 2. Scope

### In scope (v1)
- 4 playable stages with distinct themes, wave compositions, and bosses
- 3-tier weapon upgrade system
- Screen-clearing bomb mechanic with limited ammo
- Power-up drops (weapon / bomb)
- Local high-score table (top 5, localStorage)
- Title screen, pause, game-over, name entry, victory
- Audio: SFX, ambient drone, menu music, per-stage music, game-over theme
- Keyboard input (WASD/Arrows, Space/Z, X, P/Esc, M)
- Full polish pass: screen shake, hit-stop, parallax, death animation,
  stage fade transitions

### Out of scope (v1)
- Multiplayer (local or online)
- Online leaderboards
- Mobile/touch input
- Gamepad support
- Save-game (mid-campaign resume)
- Procedural generation
- Customization (ships, weapons, skins)
- Localization (English only)

## 3. Functional requirements

### FR-1 — Player controls
- FR-1.1: Player ship moves in 8 directions via keyboard, clamped to playfield.
- FR-1.2: Fire button (Space or Z) fires continuously at a fixed rate while held.
- FR-1.3: Bomb button (X) triggers screen-clear effect, consumes 1 bomb.
- FR-1.4: Pause (P or Esc) freezes all gameplay updates and shows overlay.
- FR-1.5: Mute (M) toggles all audio output.

### FR-2 — Weapons
- FR-2.1: Weapon level ranges 1–3.
- FR-2.2: Level 1: single forward shot, 1 damage.
- FR-2.3: Level 2: two parallel shots, 1 damage each.
- FR-2.4: Level 3: center shot (2 damage) + two angled wing shots (1 damage each).
- FR-2.5: Picking up a W power-up at level 3 grants 500 bonus score.

### FR-3 — Bombs
- FR-3.1: Player starts with 3 bombs, capped at 5.
- FR-3.2: Bomb clears all enemy bullets on screen.
- FR-3.3: Bomb deals 15 damage to every enemy and boss.
- FR-3.4: Bomb grants 1.6 s invulnerability.
- FR-3.5: Bomb kills do not drop power-ups.

### FR-4 — Enemies
- FR-4.1: Six enemy types: line, sine, diver, turret, heavy, midboss.
- FR-4.2: All enemies flash white for 0.08 s on hit.
- FR-4.3: Enemies drop power-ups according to tier:
  - Common (small): 4% chance
  - Uncommon (midboss, heavy): 18% chance
  - Boss: 100% chance (weapon + bomb)

### FR-5 — Bosses
- FR-5.1: One unique boss per stage (4 total).
- FR-5.2: Bosses have 3 attack phases, triggered at 66% and 33% HP.
- FR-5.3: Boss cannot be damaged during entrance animation.
- FR-5.4: Boss HP bar displays at top of screen during fight.
- FR-5.5: Boss death grants 5000 score and stage-clear state.

### FR-6 — Level flow
- FR-6.1: Stage begins with 3 s intro banner (stage number + name).
- FR-6.2: Waves fire on a schedule relative to stage-play start.
- FR-6.3: 2.5 s WARNING banner precedes boss appearance.
- FR-6.4: After boss death, 4–6 s STAGE CLEAR state, then next stage.
- FR-6.5: After stage 4 boss, VICTORY state; press Enter to play again.
- FR-6.6: Weapon level carries between stages; resets to 1 on death.
- FR-6.7: Lives and bombs are restored to a minimum of 3 on stage advance.

### FR-7 — Player death and game over
- FR-7.1: Player has 3 lives. Contact or projectile damage decrements by 1.
- FR-7.2: Player is invulnerable for 2 s after taking damage.
- FR-7.3: At 0 lives, ship flies upward, fades, sparks trail, then game over.
- FR-7.4: GAME OVER banner appears; 2 s later "PRESS ENTER TO RETRY" shows.
- FR-7.5: Enter restarts the current stage (score preserved).

### FR-8 — High scores
- FR-8.1: Top 5 scores stored in `localStorage` under `demonstar.highscores.v1`.
- FR-8.2: On qualifying score, player enters 3-letter arcade-style name.
- FR-8.3: High-score view accessible from title via H key.
- FR-8.4: High-score entries display name, score, and stage reached.

### FR-9 — Audio
- FR-9.1: Audio initializes on first user gesture (browser autoplay policy).
- FR-9.2: Menu music plays on title; battle music per stage; ambience loops
  under battle music; game-over theme loops on death.
- FR-9.3: Per-stage music file selection: `assets/music/stage{1-4}.mp3`.
- FR-9.4: Missing music falls back to stage 1 track, then to synth arpeggio.
- FR-9.5: Missing SFX fall back to synthesized equivalents.

### FR-10 — Visual effects
- FR-10.1: Screen shake on player hit (0.35 s / 14 px), bomb (0.5 s / 18 px),
  enemy death (scaled by size), boss death (0.8 s / 22 px).
- FR-10.2: Hit-stop freeze for 0.12 s on boss death.
- FR-10.3: Muzzle flash 0.06 s on each shot.
- FR-10.4: Two-layer parallax starfield, per-stage color palette.
- FR-10.5: Red pulse tint during WARNING state.
- FR-10.6: 0.4 s fade-to-black between stages.
- FR-10.7: Stage 1 (and menu) shows drifting asteroid field background.

## 4. Non-functional requirements

### NFR-1 — Performance
- NFR-1.1: Target 60 FPS on mid-range 2018 hardware in Chrome.
- NFR-1.2: No frame-rate drops during boss fights with weapon level 3 and
  full particle load.
- NFR-1.3: Memory allocation flat during steady-state gameplay (object pools).
- NFR-1.4: Total assets < 30 MB (audio is the main contributor).

### NFR-2 — Compatibility
- NFR-2.1: Runs in Chrome, Firefox, Safari, Edge — current stable versions.
- NFR-2.2: Requires ES2020+ (modules, optional chaining).
- NFR-2.3: Requires WebAudio API (universal support in modern browsers).
- NFR-2.4: Static hosting — no backend required.

### NFR-3 — Accessibility
- NFR-3.1: Keyboard-only playable.
- NFR-3.2: Pause available at any time during gameplay.
- NFR-3.3: Mute available without pausing.
- NFR-3.4: (Aspirational) colorblind-safe bullet colors — deferred to v2.

### NFR-4 — Maintainability
- NFR-4.1: Level definitions are data-driven (JSON-like objects in
  `levels/*.js`); no code changes to add new waves.
- NFR-4.2: Enemy/boss behaviour in dedicated factory files; registration
  through a registry pattern.
- NFR-4.3: All spawn/despawn paths respect object pools — no `new` in hot loops.

### NFR-5 — Deployment
- NFR-5.1: Single `npm run build` produces a self-contained `dist/` folder.
- NFR-5.2: `dist/` is deployable to itch.io (HTML5), GitHub Pages, or
  Netlify without configuration.
- NFR-5.3: Assets served from relative paths (`assets/...`), no absolute URLs.

## 5. Acceptance criteria

The game is considered complete for v1 when:
- All functional requirements FR-1 through FR-10 pass manual testing.
- All four stages are playable start-to-finish.
- All four bosses are defeatable.
- High scores persist after page reload.
- No uncaught console errors during a full playthrough.
- 60 FPS sustained on target hardware.