// ===== assets.js =====
// src/assets.js â€” image loader with headless guard
// Sprite paths match the audio convention: root-relative /assets/sprites/...
// Served from public/assets/sprites/ â†’ dist/assets/sprites/ at build time.

const IMAGES = {
  player:   'assets/sprites/player.png',
  scout:    'assets/sprites/scout.png',
  scoutSine:'assets/sprites/scout_sine.png',
  diver:    'assets/sprites/diver.png',
  turret:   'assets/sprites/turret.png',
  heavy:    'assets/sprites/heavy.png',
  midboss1: 'assets/sprites/midboss1.png',
  boss1: 'assets/sprites/boss1.png', boss2: 'assets/sprites/boss2.png',
  boss3: 'assets/sprites/boss3.png', boss4: 'assets/sprites/boss4.png',
  pickupWeapon: 'assets/sprites/pickup_weapon.png',
  pickupBomb:   'assets/sprites/pickup_bomb.png',
};

const cache = new Map();
export const assets = { ready: typeof Image === 'undefined' };

export function loadImages() {
  // Headless guard: Node test harness has no Image â†’ resolve immediately,
  // sprite() returns null, every draw() falls back to procedural geometry.
  if (typeof Image === 'undefined') { assets.ready = true; return Promise.resolve(); }
  return Promise.all(Object.entries(IMAGES).map(([key, url]) => new Promise((res) => {
    const img = new Image();
    img.onload  = () => { cache.set(key, img); res(); };
    img.onerror = () => { console.warn('sprite missing:', key); res(); }; // fallback path
    img.src = url;
  }))).then(() => { assets.ready = true; });
}

export function sprite(key) { return cache.get(key) ?? null; }


// ===== asteroids.js =====
// src/asteroids.js â€” asteroid field (stage 1 background)
import { clock } from './clock.js';

function makeAsteroidData(initial) {
    const sides = 6 + Math.floor(clock.random() * 4);      // 6â€“9 vertices
    const vertices = [];
    for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2;
        const r = 0.65 + clock.random() * 0.35;            // irregular radius
        vertices.push({ angle, r });
    }

    // Size distribution: 40% small, 45% medium, 15% large (rare planetoids)
    const roll = clock.random();
    let size;
    if (roll < 0.40)      size = 30 + clock.random() * 30;    // 30â€“60
    else if (roll < 0.85) size = 60 + clock.random() * 40;    // 60â€“100
    else                  size = 120 + clock.random() * 60;   // 120â€“180 (huge)

    return {
        x: initial ? clock.random() * 480 : clock.random() * 480,
        y: initial ? clock.random() * 800 : -200 - clock.random() * 200,
        size,
        vx: (clock.random() - 0.5) * 15,
        vy: 50 + clock.random() * 70,                       // scroll speed
        rot: clock.random() * Math.PI * 2,
        rotSpeed: (clock.random() - 0.5) * 0.35,
        vertices,
        alpha: 0.18 + clock.random() * 0.22,
    };
}

let asteroidsInitialized = false;
const asteroids = [];

function ensureInit() {
  if (asteroidsInitialized) return;
  for (let i = 0; i < 14; i++) asteroids.push(makeAsteroidData(true));
  asteroidsInitialized = true;
}

export function updateAsteroids(dt) {
    ensureInit();
    for (let i = 0; i < asteroids.length; i++) {
        const a = asteroids[i];
        a.x += a.vx * dt;
        a.y += a.vy * dt;
        a.rot += a.rotSpeed * dt;
        if (a.y > 950 || a.x < -250 || a.x > 730) {
            asteroids[i] = makeAsteroidData(false);
        }
    }
}

export function drawAsteroids(ctx, stageIndex, inMenu) {
    ensureInit();
    if (!inMenu && stageIndex !== 0) return;    // only stage 1 (and menu preview)

    for (const a of asteroids) {
        ctx.save();
        ctx.translate(a.x, a.y);
        ctx.rotate(a.rot);

        // Outer shape
        ctx.beginPath();
        for (let i = 0; i < a.vertices.length; i++) {
            const v = a.vertices[i];
            const px = Math.cos(v.angle) * a.size * v.r;
            const py = Math.sin(v.angle) * a.size * v.r;
            if (i === 0) ctx.moveTo(px, py);
            else         ctx.lineTo(px, py);
        }
        ctx.closePath();

        ctx.fillStyle = `rgba(70, 62, 55, ${a.alpha})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(130, 115, 100, ${a.alpha + 0.12})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Inner shading â€” smaller offset polygon for depth
        ctx.beginPath();
        for (let i = 0; i < a.vertices.length; i++) {
            const v = a.vertices[i];
            const px = Math.cos(v.angle) * a.size * v.r * 0.55 - a.size * 0.18;
            const py = Math.sin(v.angle) * a.size * v.r * 0.55 - a.size * 0.18;
            if (i === 0) ctx.moveTo(px, py);
            else         ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = `rgba(25, 20, 15, ${a.alpha * 0.75})`;
        ctx.fill();

        // Small crater highlight
        if (a.size > 60 && a.vertices.length >= 7) {
            const v = a.vertices[0];
            ctx.fillStyle = `rgba(180, 160, 140, ${a.alpha * 0.5})`;
            ctx.beginPath();
            ctx.arc(
                Math.cos(v.angle) * a.size * v.r * 0.35,
                Math.sin(v.angle) * a.size * v.r * 0.35,
                a.size * 0.08, 0, Math.PI * 2
            );
            ctx.fill();
        }

        ctx.restore();
    }
}


// ===== audio.js =====
// src/audio.js
import { clock } from './clock.js';

export class AudioManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.sfxGain = null;
        this.musicGain = null;
        this.ambienceGain = null;
        this.gameOverGain = null;

        this.enabled = true;
        this.sfxVolume = 0.35;
        this.musicVolume = 0.25;
        this.ambienceVolume = 0.15;
        this.lastShotAt = 0;

        // Buffers
        this.buffers = {};
        this.musicBuffers = [null, null, null, null];
        this.ambienceBuffer = null;
        this.menuBuffer = null;
        this.gameOverBuffer = null;

        // Music state
                // Music state
        this.musicPlaying = false;
        this.musicSource = null;
        this.musicTimer = null;
        this._pendingMusicStage = -1;
        this._musicLoadFailed = false;

        
        // Ambience state
        this.ambiencePlaying = false;
        this.ambienceSource = null;
        this._pendingAmbienceStart = false;

        // Menu music state
        this.menuPlaying = false;
        this.menuSource = null;
        this._pendingMenuStart = false;

        // Game-over music state
        this.gameOverPlaying = false;
        this.gameOverSource = null;
    }

    init() {
        if (this.ctx) return;
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 1;
        this.masterGain.connect(this.ctx.destination);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = this.sfxVolume;
        this.sfxGain.connect(this.masterGain);

        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = this.musicVolume;
        this.musicGain.connect(this.masterGain);

        this.ambienceGain = this.ctx.createGain();
        this.ambienceGain.gain.value = this.ambienceVolume;
        this.ambienceGain.connect(this.masterGain);

        this.gameOverGain = this.ctx.createGain();
        this.gameOverGain.gain.value = this.musicVolume;
        this.gameOverGain.connect(this.masterGain);

        this._loadSamples();
    }

    async _loadSamples() {
        const sfxFiles = {
            explode_small: 'assets/sfx/explode_small.wav',
            explode_medium: 'assets/sfx/explode_medium.wav',
            explode_large: 'assets/sfx/explode_large.wav',
            playerHit: 'assets/sfx/playerHit.wav',
            pickup: 'assets/sfx/pickup.wav',
            bomb: 'assets/sfx/bomb.wav',
        };

        const sfxLoads = Object.entries(sfxFiles).map(async ([key, url]) => {
            try {
                const res = await fetch(url);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const buf = await res.arrayBuffer();
                this.buffers[key] = await this.ctx.decodeAudioData(buf);
            } catch (err) {
                console.warn('Failed to load', url, err);
            }
        });

        // Music â€” load all 4 stage tracks in parallel
        const musicFiles = [
            'assets/music/stage1.mp3',
            'assets/music/stage2.mp3',
            'assets/music/stage3.mp3',
            'assets/music/stage4.mp3',
        ];
        musicFiles.forEach((url, i) => this._loadOneMusic(i, url));

        // Menu music
        try {
            const res = await fetch('assets/music/menu.mp3');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const buf = await res.arrayBuffer();
            this.menuBuffer = await this.ctx.decodeAudioData(buf);
            if (this._pendingMenuStart) {
                this._pendingMenuStart = false;
                this.startMenuMusic();
            }
        } catch (err) {
            console.warn('Failed to load menu music', err);
        }

        // Game-over theme
        try {
            const res = await fetch('assets/sfx/game_over.mp3');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const buf = await res.arrayBuffer();
            this.gameOverBuffer = await this.ctx.decodeAudioData(buf);
        } catch (err) {
            console.warn('Failed to load game_over', err);
        }

        // Ambience
        try {
            const res = await fetch('assets/sfx/ambience.wav');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const buf = await res.arrayBuffer();
            this.ambienceBuffer = await this.ctx.decodeAudioData(buf);
            if (this._pendingAmbienceStart) {
                this._pendingAmbienceStart = false;
                this.startAmbience();
            }
        } catch (err) {
            console.warn('Failed to load ambience', err);
        }

        await Promise.all(sfxLoads);
    }

    async _loadOneMusic(index, url) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const buf = await res.arrayBuffer();
            this.musicBuffers[index] = await this.ctx.decodeAudioData(buf);

            if (this._pendingMusicStage === index) {
                this._pendingMusicStage = -1;
                this.startMusic(index);
            }
        } catch (err) {
            console.warn(`Failed to load stage ${index + 1} music:`, url, err);
            if (this._pendingMusicStage === index) {
                this._pendingMusicStage = -1;
                if (index !== 0 && this.musicBuffers[0]) {
                    this.startMusic(0);
                } else {
                    this._musicLoadFailed = true;
                    this._startSynthMusic();
                }
            }
        }
    }


    resume() {
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    }

    toggleMute() {
        this.enabled = !this.enabled;
        if (this.masterGain) {
            this.masterGain.gain.value = this.enabled ? 1 : 0;
        }
    }

    // ---- primitives ----

    _tone(freq, dur, opts = {}) {
        if (!this.ctx || !this.enabled) return;
        const now = this.ctx.currentTime;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = opts.type || 'square';
        o.frequency.setValueAtTime(freq, now);
        if (opts.endFreq) {
            o.frequency.exponentialRampToValueAtTime(Math.max(opts.endFreq, 1), now + dur);
        }
        g.gain.setValueAtTime(opts.vol ?? 0.3, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + dur);
        o.connect(g);
        g.connect(this.sfxGain);
        o.start(now);
        o.stop(now + dur + 0.02);
    }

    _noise(dur, opts = {}) {
        if (!this.ctx || !this.enabled) return;
        const now = this.ctx.currentTime;
        const size = Math.floor(this.ctx.sampleRate * dur);
        const buffer = this.ctx.createBuffer(1, size, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(opts.vol ?? 0.3, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + dur);
        src.connect(g);
        g.connect(this.sfxGain);
        src.start(now);
        src.stop(now + dur + 0.02);
    }

    _sample(key, opts = {}) {
        if (!this.ctx || !this.enabled) return false;
        const buf = this.buffers[key];
        if (!buf) return false;
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        src.loop = !!opts.loop;
        const g = this.ctx.createGain();
        g.gain.value = opts.vol ?? 1;
        src.connect(g);
        g.connect(this.sfxGain);
        src.start();
        return true;
    }

    // ---- SFX presets ----

    shoot() {
        const now = clock.now();
        if (now - this.lastShotAt < 55) return;
        this.lastShotAt = now;
        this._tone(1100, 0.045, { type: 'square', vol: 0.05, endFreq: 550 });
    }

    enemyHit() {
        this._tone(520, 0.035, { type: 'square', vol: 0.06, endFreq: 260 });
    }

    scout() {
        if (this._sample('explode_small', { vol: 0.7 })) return;
        this._noise(0.14, { vol: 0.13 });
        this._tone(220, 0.14, { type: 'sawtooth', vol: 0.08, endFreq: 90 });
    }

    midboss() {
        if (this._sample('explode_medium', { vol: 0.7 })) return;
        this._noise(0.35, { vol: 0.18 });
        this._tone(150, 0.35, { type: 'sawtooth', vol: 0.14, endFreq: 40 });
    }

    boss() {
        if (this._sample('explode_large', { vol: 0.8 })) return;
        this._noise(0.9, { vol: 0.22 });
        this._tone(100, 0.9, { type: 'sawtooth', vol: 0.18, endFreq: 30 });
        this._tone(60, 0.9, { type: 'square', vol: 0.12, endFreq: 20 });
    }

    playerHit() {
        if (this._sample('playerHit', { vol: 0.8 })) return;
        this._noise(0.28, { vol: 0.2 });
        this._tone(320, 0.28, { type: 'sawtooth', vol: 0.14, endFreq: 60 });
    }

    pickup() {
        if (this._sample('pickup', { vol: 0.6 })) return;
        this._tone(880, 0.06, { type: 'sine', vol: 0.14 });
        setTimeout(() => this._tone(1320, 0.08, { type: 'sine', vol: 0.14 }), 50);
    }

    bomb() {
        if (this._sample('bomb', { vol: 0.8 })) return;
        this._noise(0.5, { vol: 0.28 });
        this._tone(200, 0.5, { type: 'sawtooth', vol: 0.18, endFreq: 40 });
    }

    warning() {
        this._tone(440, 0.12, { type: 'square', vol: 0.14 });
        setTimeout(() => this._tone(440, 0.12, { type: 'square', vol: 0.14 }), 180);
        setTimeout(() => this._tone(660, 0.2,  { type: 'square', vol: 0.16 }), 360);
    }

    stageClear() {
        this._tone(660, 0.15, { type: 'sine', vol: 0.16 });
        setTimeout(() => this._tone(880, 0.15, { type: 'sine', vol: 0.16 }), 150);
        setTimeout(() => this._tone(1320, 0.35, { type: 'sine', vol: 0.16 }), 300);
    }

    gameOver() {
        if (this.gameOverPlaying || !this.ctx) return;

        // Hard stop bgm + ambience â€” no fade race
        if (this.musicSource) {
            try { this.musicSource.stop(); } catch {}
            this.musicSource = null;
        }
        if (this.ambienceSource) {
            try { this.ambienceSource.stop(); } catch {}
            this.ambienceSource = null;
        }
        this.musicPlaying = false;
        this.ambiencePlaying = false;

        // Ensure gains are at their normal values (in case prior fade left them at 0)
        const now = this.ctx.currentTime;
        this.musicGain.gain.cancelScheduledValues(now);
        this.musicGain.gain.value = this.musicVolume;
        this.ambienceGain.gain.cancelScheduledValues(now);
        this.ambienceGain.gain.value = this.ambienceVolume;

        // Start looping game-over theme
        if (this.gameOverBuffer) {
            this.gameOverPlaying = true;
            this.gameOverSource = this.ctx.createBufferSource();
            this.gameOverSource.buffer = this.gameOverBuffer;
            this.gameOverSource.loop = true;
            this.gameOverSource.connect(this.gameOverGain);
            this.gameOverSource.start();
            return;
        }

        // Fallback synth
        this._tone(440, 0.3, { type: 'triangle', vol: 0.2, endFreq: 220 });
        setTimeout(() => this._tone(220, 0.6, { type: 'triangle', vol: 0.2, endFreq: 80 }), 350);
    }

    stopGameOverMusic() {
        this.gameOverPlaying = false;
        if (this.gameOverSource) {
            try { this.gameOverSource.stop(); } catch {}
            this.gameOverSource = null;
        }
    }

    // ---- music ----

        startMusic(stageIndex = 0) {
        if (!this.ctx) return;
        this._stopMusicSource();
        const buf = this.musicBuffers[stageIndex]
                 ?? this.musicBuffers[0]
                 ?? null;
        if (buf) {
            this.musicPlaying = true;
            this.musicSource = this.ctx.createBufferSource();
            this.musicSource.buffer = buf;
            this.musicSource.loop = true;
            this.musicSource.connect(this.musicGain);
            this.musicSource.start();
            return;
        }
        if (this._musicLoadFailed) {
            this._startSynthMusic();
            return;
        }
        this._pendingMusicStage = stageIndex;
    }

    _stopMusicSource() {
        this.musicPlaying = false;
        if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; }
        if (this.musicSource) { try { this.musicSource.stop(); } catch {} this.musicSource = null; }
    }

    _startSynthMusic() {
        if (this.musicPlaying || !this.ctx) return;
        this.musicPlaying = true;
        const notes = [220, 262, 330, 262];
        let step = 0;
        this.musicTimer = setInterval(() => {
            if (!this.musicPlaying || !this.enabled) return;
            const now = this.ctx.currentTime;
            const freq = notes[step % notes.length];
            step++;
            const o = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            o.type = 'triangle';
            o.frequency.value = freq;
            g.gain.setValueAtTime(0.06, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
            o.connect(g);
            g.connect(this.musicGain);
            o.start(now);
            o.stop(now + 0.24);
        }, 240);
    }

        stopMusic() {
        this._stopMusicSource();
    }

    // ---- ambience ----

    startAmbience() {
        if (this.ambiencePlaying || !this.ctx) return;

        if (this.ambienceBuffer) {
            this.ambiencePlaying = true;
            this.ambienceSource = this.ctx.createBufferSource();
            this.ambienceSource.buffer = this.ambienceBuffer;
            this.ambienceSource.loop = true;
            this.ambienceSource.connect(this.ambienceGain);
            this.ambienceSource.start();
            return;
        }

        this._pendingAmbienceStart = true;
    }

    stopAmbience() {
        this.ambiencePlaying = false;
        if (this.ambienceSource) {
            try { this.ambienceSource.stop(); } catch {}
            this.ambienceSource = null;
        }
    }

    // ---- menu music ----

    startMenuMusic() {
        if (this.menuPlaying || !this.ctx) return;

        if (this.menuBuffer) {
            this.menuPlaying = true;
            this.menuSource = this.ctx.createBufferSource();
            this.menuSource.buffer = this.menuBuffer;
            this.menuSource.loop = true;
            this.menuSource.connect(this.musicGain);
            this.menuSource.start();
            return;
        }

        this._pendingMenuStart = true;
    }

    stopMenuMusic() {
        this.menuPlaying = false;
        if (this.menuSource) {
            try { this.menuSource.stop(); } catch {}
            this.menuSource = null;
        }
    }
}


// ===== banner.js =====
// src/banner.js â€” gameplay banner renderer (STAGE, WARNING, CLEAR, etc.)

export function drawBanner(ctx, W, H, banner) {
    const a = banner.alpha ?? 1;
    if (a <= 0) return;

    ctx.save();
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Main line with drop shadow
    ctx.font = 'bold 36px monospace';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillText(banner.line1, W / 2 + 2, H / 2 - 30 + 2);
    ctx.fillStyle = banner.color;
    ctx.fillText(banner.line1, W / 2, H / 2 - 30);

    // Sub line
    if (banner.line2) {
        ctx.font = '20px monospace';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillText(banner.line2, W / 2 + 1, H / 2 + 10 + 1);
        ctx.fillStyle = '#fff';
        ctx.fillText(banner.line2, W / 2, H / 2 + 10);
    }

    ctx.restore();
}


// ===== boss.js =====
// src/boss.js
export function spawnBoss(game, name) {
  const factory = BOSSES[name];
  if (!factory) {
    console.warn('Unknown boss:', name);
    return null;
  }
  return factory(game);
}

const FLASH_TIME = 0.08;

function makeBoss(game, opts) {
  const b = {
    game, kind: 'boss',
    x: opts.x ?? 240, y: opts.y ?? -120, r: opts.r ?? 50,
    hp: opts.hp, maxHp: opts.hp,
    alive: true, t: 0, phase: 0,
    entering: true, invuln: 0, flash: 0,
    fireCd: 1.5, killedByBomb: false,
    ...opts.extra,
  };
  game.entities.push(b);
  return b;
}

function shootRing(game, x, y, count, speed, offset = 0, color = '#f6f') {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + offset;
    const b = game.enemyBullets.spawn();
    b.x = x;
    b.y = y;
    b.vx = Math.cos(a) * speed;
    b.vy = Math.sin(a) * speed;
    b.r = 6;
    b.color = color;
  }
}

function shootAimed(game, x, y, speed, spread = 0, color = '#f4f') {
  const p = game.player;
  if (!p) return;
  const dx = p.x - x, dy = p.y - y;
  const base = Math.atan2(dy, dx) + spread;
  const b = game.enemyBullets.spawn();
  b.x = x;
  b.y = y;
  b.vx = Math.cos(base) * speed;
  b.vy = Math.sin(base) * speed;
  b.r = 5;
  b.color = color;
}

function damageFlash(b, ctx) {
  if (b.flash > 0) {
    ctx.globalAlpha = Math.min(b.flash / FLASH_TIME, 1);
    ctx.fillStyle = '#fff';
    ctx.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
    ctx.globalAlpha = 1;
  }
}

function drawHpBar(b, ctx) {
  const W = b.game.W;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(40, 20, W - 80, 14);
  ctx.fillStyle = '#f33';
  ctx.fillRect(42, 22, (W - 84) * Math.max(b.hp, 0) / b.maxHp, 10);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.strokeRect(40, 20, W - 80, 14);
}

function bossCommon(b, dt, enterY) {
  b.t += dt;
  if (b.flash > 0) b.flash -= dt;
  if (b.invuln > 0) b.invuln -= dt;

  if (b.entering) {
    b.y += 80 * dt;
    if (b.y >= enterY) { b.y = enterY; b.entering = false; }
    return true;
  }

  const pct = b.hp / b.maxHp;
  if (b.phase === 0 && pct <= 0.66) { b.phase = 1; b.onPhase?.(1); }
  else if (b.phase === 1 && pct <= 0.33) { b.phase = 2; b.onPhase?.(2); }

  return false;
}

function boss1(game) {
  return makeBoss(game, {
    hp: 220,
    x: 240,
    y: -120,
    r: 55,
    extra: {
      entering: true,
      flash: 0,
      onPhase(p) { this.fireCd = 0.6; },
      hit(dmg) {
        this.hp -= dmg;
        this.flash = FLASH_TIME;
        if (this.hp <= 0) this.alive = false;
      },
      update(dt) {
        if (bossCommon(this, dt, 130)) return;
        this.x = 240 + Math.sin(this.t * 0.9) * 140;

        this.fireCd -= dt;
        if (this.fireCd > 0) return;

        if (this.phase === 0) {
          shootAimed(game, this.x, this.y + 30, 240, 0,     '#f4f');
          shootAimed(game, this.x, this.y + 30, 240, 0.15,  '#f4f');
          shootAimed(game, this.x, this.y + 30, 240, -0.15, '#f4f');
          this.fireCd = 1.1;
        } else if (this.phase === 1) {
          shootRing(game, this.x, this.y, 12, 180, this.t * 1.5, '#f6f');
          this.fireCd = 0.9;
        } else {
          shootRing(game, this.x, this.y, 16, 200, this.t * 2, '#f6f');
          shootAimed(game, this.x, this.y + 30, 280, 0, '#f4f');
          this.fireCd = 0.7;
        }
      },
      draw(ctx) {
        ctx.fillStyle = this.phase === 2 ? '#f44'
                      : this.phase === 1 ? '#fa4'
                      : '#fa3';
        ctx.fillRect(this.x - 55, this.y - 35, 110, 70);
        ctx.fillStyle = '#511';
        ctx.fillRect(this.x - 40, this.y - 20, 80, 40);
        damageFlash(this, ctx);
        drawHpBar(this, ctx);
      },
    },
  });
}

const BOSSES = { boss1, boss2, boss3, boss4 };

function boss2(game) {
  return makeBoss(game, {
    hp: 400, x: 240, y: -120, r: 70,
    extra: {
      entering: true, flash: 0,
      onPhase(_p) { this.fireCd = 0.5; },
      hit(dmg) { this.hp -= dmg; this.flash = FLASH_TIME; if (this.hp <= 0) this.alive = false; },
      update(dt) {
        if (bossCommon(this, dt, 140)) return;
        this.x = 240 + Math.sin(this.t * 0.6) * 160;

        this.fireCd -= dt;
        if (this.fireCd > 0) return;

        if (this.phase === 0) {
          shootAimed(game, this.x - 40, this.y + 20, 260, 0, '#f4f');
          shootAimed(game, this.x + 40, this.y + 20, 260, 0, '#f4f');
          this.fireCd = 1.0;
        } else if (this.phase === 1) {
          shootRing(game, this.x, this.y, 10, 200, this.t * 1.2, '#f6f');
          shootAimed(game, this.x, this.y + 30, 280, 0, '#f4f');
          this.fireCd = 0.8;
        } else {
          shootRing(game, this.x, this.y, 14, 220, this.t * 2, '#f6f');
          shootAimed(game, this.x - 40, this.y + 20, 300, 0, '#f4f');
          shootAimed(game, this.x + 40, this.y + 20, 300, 0, '#f4f');
          this.fireCd = 0.6;
        }
      },
      draw(ctx) {
        ctx.fillStyle = this.phase === 2 ? '#f44' : this.phase === 1 ? '#fa4' : '#fa3';
        ctx.fillRect(this.x - 70, this.y - 35, 140, 70);
        ctx.fillStyle = '#511';
        ctx.fillRect(this.x - 55, this.y - 20, 110, 40);
        ctx.fillStyle = '#600';
        ctx.fillRect(this.x - 50, this.y + 20, 20, 25);
        ctx.fillRect(this.x + 30, this.y + 20, 20, 25);
        damageFlash(this, ctx);
        drawHpBar(this, ctx);
      },
    },
  });
}


function boss3(game) {
  return makeBoss(game, {
    hp: 550, x: 240, y: -120, r: 75,
    extra: {
      entering: true, flash: 0, spiralAngle: 0, spiralCd: 0,
      onPhase(_p) { this.fireCd = 0.6; },
      hit(dmg) { this.hp -= dmg; this.flash = FLASH_TIME; if (this.hp <= 0) this.alive = false; },
      update(dt) {
        if (bossCommon(this, dt, 150)) return;
        this.x = 240 + Math.sin(this.t * 0.7) * 130;

        this.fireCd -= dt;
        this.spiralCd -= dt;

        // Rotating spiral (single arm â†’ double arm â†’ triple arm)
        if (this.spiralCd <= 0) {
          this.spiralCd = this.phase === 2 ? 0.06 : this.phase === 1 ? 0.08 : 0.1;
          this.spiralAngle += 0.35;
          const arms = this.phase === 2 ? 3 : this.phase === 1 ? 2 : 1;
          for (let a = 0; a < arms; a++) {
            const angle = this.spiralAngle + (a / arms) * Math.PI * 2;
            const b = game.enemyBullets.spawn();
            b.x = this.x;
            b.y = this.y;
            b.vx = Math.cos(angle) * 180;
            b.vy = Math.sin(angle) * 180;
            b.r = 5;
            b.color = '#c6f';
          }
        }

        // Aimed barrage in later phases
        if (this.fireCd <= 0 && this.phase >= 1) {
          shootAimed(game, this.x, this.y + 30, 300, 0, '#f4f');
          shootAimed(game, this.x, this.y + 30, 300, 0.2, '#f4f');
          shootAimed(game, this.x, this.y + 30, 300, -0.2, '#f4f');
          this.fireCd = this.phase === 2 ? 1.2 : 1.6;
        }
      },
      draw(ctx) {
        ctx.fillStyle = this.phase === 2 ? '#f44' : this.phase === 1 ? '#a4f' : '#96f';
        ctx.beginPath(); ctx.arc(this.x, this.y, 75, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#312';
        ctx.beginPath(); ctx.arc(this.x, this.y, 40, 0, Math.PI * 2); ctx.fill();
        // Rotating outer nodes
        for (let i = 0; i < 6; i++) {
          const a = this.t * 1.5 + (i / 6) * Math.PI * 2;
          ctx.fillStyle = '#f4f';
          ctx.beginPath();
          ctx.arc(this.x + Math.cos(a) * 60, this.y + Math.sin(a) * 60, 8, 0, Math.PI * 2);
          ctx.fill();
        }
        damageFlash(this, ctx);
        drawHpBar(this, ctx);
      },
    },
  });
}


function boss4(game) {
  return makeBoss(game, {
    hp: 750, x: 240, y: -120, r: 80,
    extra: {
      entering: true, flash: 0,
      onPhase(_p) { this.fireCd = 0.5; },
      hit(dmg) { this.hp -= dmg; this.flash = FLASH_TIME; if (this.hp <= 0) this.alive = false; },
      update(dt) {
        if (bossCommon(this, dt, 155)) return;
        this.x = 240 + Math.sin(this.t * 1.2) * 170;
        this.y = 155 + Math.sin(this.t * 0.8) * 30;

        this.fireCd -= dt;
        if (this.fireCd > 0) return;

        if (this.phase === 0) {
          shootAimed(game, this.x, this.y + 30, 300, 0, '#f44');
          shootAimed(game, this.x, this.y + 30, 300, 0.25, '#f44');
          shootAimed(game, this.x, this.y + 30, 300, -0.25, '#f44');
          this.fireCd = 0.7;
        } else if (this.phase === 1) {
          shootRing(game, this.x, this.y, 18, 220, this.t * 1.8, '#f6f');
          shootAimed(game, this.x, this.y + 30, 320, 0, '#f44');
          this.fireCd = 0.7;
        } else {
          shootRing(game, this.x, this.y, 24, 240, this.t * 2.5, '#f6f');
          shootAimed(game, this.x, this.y + 30, 340, 0, '#f44');
          shootAimed(game, this.x, this.y + 30, 340, 0.15, '#f44');
          shootAimed(game, this.x, this.y + 30, 340, -0.15, '#f44');
          this.fireCd = 0.55;
        }
      },
      draw(ctx) {
        ctx.fillStyle = this.phase === 2 ? '#f22' : this.phase === 1 ? '#f82' : '#f62';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - 80);
        ctx.lineTo(this.x + 80, this.y);
        ctx.lineTo(this.x, this.y + 80);
        ctx.lineTo(this.x - 80, this.y);
        ctx.closePath();
        ctx.fill();
        // Central eye
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(this.x, this.y, 35, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f00';
        ctx.beginPath(); ctx.arc(this.x, this.y, 20, 0, Math.PI * 2); ctx.fill();
        damageFlash(this, ctx);
        drawHpBar(this, ctx);
      },
    },
  });
}


// ===== bullets.js =====
// Bullet logic


// ===== clock.js =====
// src/clock.js â€” virtual clock + seedable PRNG (mulberry32)
// seed(n) resets PRNG state fully; same n â†’ same sequence, even after prior random() calls.

let _virtual = false;
let _base = 0;            // virtual ms
let _timers = [];         // { id, fn, fireAt, insertionIndex }
let _timerId = 0;
let _insertionIdx = 0;
let _a = 0;               // mulberry32 state
let _seeded = false;

export function now() {
    if (_virtual) return _base;
    return performance.now();
}

export function setTimeout(fn, ms) {
    if (!_virtual) {
        return globalThis.setTimeout(fn, ms);
    }
    const id = ++_timerId;
    _timers.push({ id, fn, fireAt: _base + ms, insertionIndex: ++_insertionIdx });
    return id;
}

export function advance(ms) {
    _base += ms;
    while (true) {
        let earliest = null;
        let earliestIdx = -1;
        for (let i = 0; i < _timers.length; i++) {
            const t = _timers[i];
            if (t.fireAt <= _base) {
                if (earliest === null ||
                    t.fireAt < earliest.fireAt ||
                    (t.fireAt === earliest.fireAt && t.insertionIndex < earliest.insertionIndex)) {
                    earliest = t;
                    earliestIdx = i;
                }
            }
        }
        if (earliest === null) break;
        _timers.splice(earliestIdx, 1);
        earliest.fn();
    }
}

export function enableVirtual() { _virtual = true; }
export function disableVirtual() {
  _virtual = false;
  _timers.length = 0;
  _timerId = 0;
  _insertionIdx = 0;
  // _seeded is intentionally NOT reset â€” seed() owns that contract
}

export function seed(n) {
    // resets state; not idempotent-guarded â€” intentional
    _a = n >>> 0;
    _seeded = true;
}

export function random() {
    if (!_seeded) return Math.random();
    var t = _a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const clock = {
    now,
    setTimeout,
    advance,
    enableVirtual,
    disableVirtual,
    seed,
    random,
};


// ===== clouds.js =====
// src/clouds.js â€” soft drifting cloud/ash backdrops for stages 3 & 4
import { clock } from './clock.js';

const CLOUD_COUNT = 10;
const clouds = [];

const PALETTES = {
    2: {  // Planet Surface â€” salmon / pink atmosphere
        far:  'rgba(160, 110, 140, 0.22)',
        near: 'rgba(220, 170, 195, 0.32)',
        glow: 'rgba(255, 220, 240, 0.10)',
    },
    3: {  // Demon Starship Core â€” red / black ash clouds
        far:  'rgba(80, 15, 10, 0.28)',
        near: 'rgba(180, 55, 30, 0.30)',
        glow: 'rgba(255, 120, 40, 0.14)',
    },
};

function makeBlobs(size) {
    const num = 4 + Math.floor(clock.random() * 4);
    const blobs = [];
    for (let i = 0; i < num; i++) {
        const sides = 5 + Math.floor(clock.random() * 6);   // 5â€“10 vertices per blob
        const vertices = [];
        for (let j = 0; j < sides; j++) {
            const angle = (j / sides) * Math.PI * 2;
            const rr = 0.65 + clock.random() * 0.7;         // 0.65â€“1.35 radius multiplier
            vertices.push({ angle, r: rr });
        }
        blobs.push({
            dx: (clock.random() - 0.5) * size * 1.6,
            dy: (clock.random() - 0.5) * size * 0.5,
            r:  size * (0.35 + clock.random() * 0.45),
            vertices,
        });
    }
    return blobs;
}

function makeCloud(initial) {
    const near = clock.random() < 0.55;
    const size = near ? 50 + clock.random() * 70 : 30 + clock.random() * 50;
    return {
        x: clock.random() * 480,
        y: initial ? clock.random() * 800 : -200 - clock.random() * 200,
        vx: (clock.random() - 0.5) * 6,
        vy: near ? 55 + clock.random() * 30 : 25 + clock.random() * 20,
        blobs: makeBlobs(size),
        near,
    };
}

function ensureInit() {
    if (clouds.length === 0) {
        for (let i = 0; i < CLOUD_COUNT; i++) clouds.push(makeCloud(true));
    }
}

export function updateClouds(dt, stageIndex) {
    if (stageIndex !== 2 && stageIndex !== 3) return;
    ensureInit();
    for (let i = 0; i < clouds.length; i++) {
        const c = clouds[i];
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        if (c.y > 950 || c.x < -300 || c.x > 780) {
            clouds[i] = makeCloud(false);
        }
    }
}

export function drawClouds(ctx, stageIndex, inMenu) {
    if (inMenu) return;                                  // menu keeps asteroids
    if (stageIndex !== 2 && stageIndex !== 3) return;
    ensureInit();

    const p = PALETTES[stageIndex];
    if (!p) return;

    for (const c of clouds) {
        const color = c.near ? p.near : p.far;
        ctx.fillStyle = color;

        for (const b of c.blobs) {
            const cx = c.x + b.dx;
            const cy = c.y + b.dy;
            ctx.beginPath();
            for (let j = 0; j < b.vertices.length; j++) {
                const v = b.vertices[j];
                const px = cx + Math.cos(v.angle) * b.r * v.r;
                const py = cy + Math.sin(v.angle) * b.r * v.r;
                if (j === 0) ctx.moveTo(px, py);
                else         ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
        }

        // Soft highlight on near clouds
        if (c.near) {
            const b = c.blobs[0];
            ctx.fillStyle = p.glow;
            ctx.beginPath();
            ctx.arc(
                c.x + b.dx - b.r * 0.15,
                c.y + b.dy - b.r * 0.20,
                b.r * 0.65, 0, Math.PI * 2
            );
            ctx.fill();
        }
    }
}



// ===== collision.js =====
// src/collision.js
import { maybeDrop, applyPickup } from './powerups.js'
import { explosions } from './particles.js';

// Squared-distance check â€” faster than Math.hypot in hot loops.
function hits(a, b, ar, br) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const r = ar + br;
  return dx * dx + dy * dy <= r * r;
}

export function runCollisions(game) {
    const bullets      = game.bullets.list;         // <-- Pool -> active array
  const enemyBullets = game.enemyBullets.list;    // <-- Pool -> active array
  const entities     = game.entities;
  const player       = game.player;

  // 1) Player bullets vs enemies/bosses
  for (let i = 0; i < bullets.length; i++) {
    const b = bullets[i];
    if (!b.alive) continue;

    for (let j = 0; j < entities.length; j++) {
      const e = entities[j];
      if (!e.alive) continue;
      if (e === player) continue;                // don't shoot yourself
      if (!e.hit) continue;                      // only damageables
      if (e.invuln > 0) continue;                // bosses during entrance etc.
      if (hits(b, e, b.r ?? 4, e.r ?? 12)) {
        e.hit(b.damage ?? 1);
        b.alive = false;
        explosions.bulletHit(game, b.x, b.y); 
        game.audio.enemyHit();
        if (!e.alive) onEnemyDeath(game, e);
        break;
      }
    }
  }

  // 2) Enemy bullets vs player
  if (player && player.alive && player.invuln <= 0) {
    for (let i = 0; i < enemyBullets.length; i++) {
      const b = enemyBullets[i];
      if (!b.alive) continue;
      if (hits(b, player, b.r ?? 5, player.r)) {
        b.alive = false;
        player.hit();
        explosions.playerHit(game, player.x, player.y);
        break;                                    // one hit per frame
      }
    }
  }

  // 3) Player vs enemy bodies (contact damage)
  if (player && player.alive && player.invuln <= 0) {
    for (let j = 0; j < entities.length; j++) {
      const e = entities[j];
      if (!e.alive || e === player) continue;
      if (!e.r) continue;
      if (hits(player, e, player.r, e.r * 0.8)) { // body hitbox slightly smaller
        player.hit();
        explosions.playerHit(game, player.x, player.y);
        break;
      }
    }
  }
  // 4) Player vs pickups
  if (player && player.alive) {
    for (let i = 0; i < game.pickups.length; i++) {
      const p = game.pickups[i];
      if (!p.alive) continue;
      if (hits(p, player, p.r, player.r + 6)) {   // generous pickup radius
        p.alive = false;
        applyPickup(game, p);
      }
    }
  }
}

// Central place to trigger death effects. Fill this in when we add particles.


export function onEnemyDeath(game, e) {
  if (game.triggerShake && e.y > 0 && e.y < game.H) {
    if (e.r >= 40)      game.triggerShake(0.8, 20);
    else if (e.r >= 20) game.triggerShake(0.4, 10);
    else                game.triggerShake(0.15, 4);
}
if (e.r >= 40) game.triggerHitStop?.(0.12);

  // Pick explosion size from enemy radius.
  if (e.r >= 40)      {explosions.boss(game, e.x, e.y);game.audio.boss();}
  else if (e.r >= 20) {explosions.midboss(game, e.x, e.y);game.audio.midboss();}
  else                {explosions.scout(game, e.x, e.y);game.audio.scout();}

  // No drops from bomb kills.
  if (e.killedByBomb) return;

  let rank = 'common';
  if (e.r >= 40)      rank = 'boss';
  else if (e.r >= 20) rank = 'uncommon';
  maybeDrop(game, e.x, e.y, rank);



  if (game.player) game.player.score += 50;
}


// ===== debug.js =====
// src/debug.js â€” dev-only hitbox drawing (gated before shipping)

export function drawHitboxes(game) {
    const ctx = game.ctx;
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#0f0';
    const circle = (x, y, r) => {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();
    };
    if (game.player?.alive) circle(game.player.x, game.player.y, game.player.r);
    for (const e of game.entities) if (e !== game.player && e.alive) circle(e.x, e.y, e.r ?? 12);
    for (const b of game.bullets.list) if (b.alive) circle(b.x, b.y, b.r ?? 4);
    for (const b of game.enemyBullets.list) if (b.alive) circle(b.x, b.y, b.r ?? 5);
}


// ===== enemies.js =====
// src/enemies.js
import { clock } from './clock.js';
import { sprite } from './assets.js';

export function spawn(game, wave) {
  switch (wave.spawn) {
    case 'scoutLine':   return line(game, wave.count);
    case 'scoutSine':   return sine(game, wave.count);
    case 'diver':       return divers(game, wave.count);
    case 'heavy':       return heavyWave(game, wave.count);
    case 'turretSides': return turrets(game);
    case 'midboss1':    return midboss1(game);
  }
}

const FLASH_TIME = 0.08;

function baseEnemy(game, x, y, hp, r, draw, update, spriteKey) {
  const e = {
    x, y, hp, r, alive: true, game,
    flash: 0,
    spriteKey,

    update(dt) {
      if (this.flash > 0) this.flash -= dt;
      update.call(this, dt);
    },

    draw(ctx) {
      const img = sprite(this.spriteKey);
      if (img) {
        const size = this.r * 2.4;
        ctx.drawImage(img, this.x - size / 2, this.y - size / 2, size, size);
      } else {
        draw.call(this, ctx);
      }

      if (this.flash > 0) {
        ctx.globalAlpha = Math.min(this.flash / FLASH_TIME, 1);
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    },

    hit(dmg) {
      this.hp -= dmg;
      this.flash = FLASH_TIME;
      if (this.hp <= 0) this.alive = false;
    },
  };
  game.entities.push(e);
  return e;
}

function line(game, count) {
  for (let i = 0; i < count; i++) {
    const x = 80 + i * 70;
    const y = -30 - i * 40;
    baseEnemy(game, x, y, 3, 14,
      function (ctx) {
        ctx.fillStyle = '#f66';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 14, 0, Math.PI * 2);
        ctx.fill();
      },
      function (dt) {
        this.y += 140 * dt;
        if (this.y > 900) this.alive = false;
      },
      'scout');
  }
}

function sine(game, count) {
  for (let i = 0; i < count; i++) {
    const e = baseEnemy(game, 0, -30 - i * 60, 3, 14,
      function (ctx) {
        ctx.fillStyle = '#fc6';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 14, 0, Math.PI * 2);
        ctx.fill();
      },
      function (dt) {
        this.t = (this.t || 0) + dt;
        this.y += 140 * dt;
        this.x = 240 + Math.sin(this.t * 2) * 160;
        if (this.y > 900) this.alive = false;
      },
      'scoutSine');
    e.t = i * 0.3;
  }
}

function divers(game, count) {
  for (let i = 0; i < count; i++) {
    clock.setTimeout(() => {
      const px = game.player?.x ?? 240;
      baseEnemy(game, px + (clock.random() - 0.5) * 200, -30, 2, 12,
        function (ctx) {
          ctx.fillStyle = '#f6c';
          ctx.fillRect(this.x - 10, this.y - 10, 20, 20);
        },
        function (dt) {
          this.y += 320 * dt;
          if (this.y > 900) this.alive = false;
        },
        'diver');
    }, i * 150);
  }
}

function turrets(game) {
  for (const x of [60, 420]) {
    baseEnemy(game, x, -30, 12, 20,
      function (ctx) {
        ctx.fillStyle = '#c9f';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 20, 0, Math.PI * 2);
        ctx.fill();
      },
      function (dt) {
        this.y += 60 * dt;
        if (this.y > 160) this.y = 160;
        this.cd = (this.cd ?? 1) - dt;
        if (this.cd <= 0 && this.y >= 155) {
          this.cd = 1.4;
          const p = game.player;
          if (!p) return;
          const dx = p.x - this.x, dy = p.y - this.y;
          const len = Math.hypot(dx, dy);
          const b = game.enemyBullets.spawn();
          b.x = this.x;
          b.y = this.y + 18;
          b.vx = (dx / len) * 220;
          b.vy = (dy / len) * 220;
          b.r = 5;
          b.color = '#f4f';
        }
      },
      'turret');
  }
}

function heavyWave(game, count) {
  const spacing = count <= 4 ? 100 : Math.floor(300 / (count - 1));
  const startX = 240 - (spacing * (count - 1)) / 2;
  for (let i = 0; i < count; i++) {
    baseEnemy(game, startX + i * spacing, -40 - i * 30, 15, 20,
      function (ctx) {
        ctx.fillStyle = '#f80';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#800';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 10, 0, Math.PI * 2);
        ctx.fill();
      },
      function (dt) {
        this.y += 90 * dt;
        this.cd = (this.cd ?? 2) - dt;
        if (this.cd <= 0 && this.y > 50) {
          this.cd = 2.5;
          const p = game.player;
          if (!p) return;
          const dx = p.x - this.x, dy = p.y - this.y;
          const len = Math.hypot(dx, dy);
          const b = game.enemyBullets.spawn();
          b.x = this.x;
          b.y = this.y + 20;
          b.vx = (dx / len) * 200;
          b.vy = (dy / len) * 200;
          b.r = 6;
          b.color = '#fa4';
        }
        if (this.y > 900) this.alive = false;
      },
      'heavy');
  }
}

function midboss1(game) {
  baseEnemy(game, 240, -60, 60, 40,
    function (ctx) {
      ctx.fillStyle = '#f88';
      ctx.fillRect(this.x - 40, this.y - 30, 80, 60);
    },
    function (dt) {
      if (this.y < 120) this.y += 60 * dt;
      this.t = (this.t || 0) + dt;
      this.cd = (this.cd ?? 0) - dt;
      if (this.cd <= 0) {
        this.cd = 0.8;
        for (let a = -1; a <= 1; a++) {
          const b = game.enemyBullets.spawn();
          b.x = this.x;
          b.y = this.y + 30;
          b.vx = Math.sin(this.t * 2 + a) * 180;
          b.vy = 180;
          b.r = 5;
          b.color = '#f4f';
        }
      }
    },
    'midboss1');
}


// ===== game.js =====
// src/game.js â€” Game class: state bag, fixed-timestep loop, render pipeline
import { Input } from './input.js';
import { Player } from './player.js';
import { Level } from './level.js';
import { Hud } from './hud.js';
import { Pool } from './pool.js';
import { AudioManager } from './audio.js';
import { Menu } from './menu.js';
import { runCollisions } from './collision.js';
import { drawStars } from './starfield.js';
import { updateAsteroids, drawAsteroids } from './asteroids.js';
import { updateClouds, drawClouds } from './clouds.js';
import { drawBanner } from './banner.js';
import { drawHitboxes } from './debug.js';
import { assets } from './assets.js';

// ----- Pooled object factories -----

function makePlayerBullet() {
    return {
        x: 0, y: 0, vx: 0, vy: 0,
        r: 4, damage: 1, alive: false,

        update(dt) {
            this.x += this.vx * dt;
            this.y += this.vy * dt;
            if (this.y < -20 || this.x < -20 || this.x > 500) this.alive = false;
        },

        draw(ctx) {
            if (this.damage >= 2) {
                ctx.fillStyle = '#fff';
                ctx.fillRect(this.x - 3, this.y - 7, 6, 14);
                ctx.fillStyle = '#7ff';
                ctx.fillRect(this.x - 4, this.y - 5, 8, 10);
            } else {
                ctx.fillStyle = '#7ff';
                ctx.fillRect(this.x - 2, this.y - 6, 4, 12);
            }
        },
    };
}

function makeEnemyBullet() {
    return {
        x: 0, y: 0, vx: 0, vy: 0,
        r: 5, color: '#f4f', alive: false,

        update(dt) {
            this.x += this.vx * dt;
            this.y += this.vy * dt;
            if (this.y > 900 || this.y < -40 || this.x < -40 || this.x > 520) {
                this.alive = false;
            }
        },

        draw(ctx) {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
            ctx.fill();
        },
    };
}

function makeParticle() {
    return {
        x: 0, y: 0, vx: 0, vy: 0,
        life: 0, maxLife: 0,
        r: 3, color: '#fff', drag: 0.9, alive: false,

        update(dt) {
            this.life -= dt;
            if (this.life <= 0) { this.alive = false; return; }
            this.x += this.vx * dt;
            this.y += this.vy * dt;
            const d = Math.pow(this.drag, dt * 60);
            this.vx *= d;
            this.vy *= d;
        },

        draw(ctx) {
            const t = this.life / this.maxLife;
            ctx.globalAlpha = t;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r * (0.4 + 0.6 * t), 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        },
    };
}

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.W = canvas.width;
        this.H = canvas.height;
        this.ctx.imageSmoothingEnabled = false;

        this.input = new Input();
        this.hud = new Hud(this.ctx, this.W, this.H);
        this.audio = new AudioManager();
        this.menu = new Menu(this);

        this.time = 0;
        this.running = true;
        this.bullets = new Pool(makePlayerBullet, 200);
        this.enemyBullets = new Pool(makeEnemyBullet, 400);
        this.particles = new Pool(makeParticle, 600);
        this.pickups = [];
        this.entities = [];
        this.bombFlash = 0;
        this.shakeTime = 0;      // seconds remaining
        this.shakeDur = 1;       // initial duration (for normalization)
        this.shakePower = 0;     // max px offset
        this.hitStop = 0;
        this.level = null;
        this.player = null;
        this.audioInited = false;
        this.started = false;
        this.paused = false;
        this.debugHit = false;
        this.pendingStart = null;
    }

    triggerShake(duration, power) {
        if (this.shakeTime <= 0 || duration > this.shakeTime) {
            this.shakeTime = duration;
            this.shakeDur = duration;
        }
        if (power > this.shakePower) this.shakePower = power;
    }

    triggerHitStop(seconds) {
        if (seconds > this.hitStop) this.hitStop = seconds;
    }

    startGame(stageIndex = 0) {
        if (this.started) return;
        if (!assets.ready) { this.pendingStart = stageIndex; return; }
        this.started = true;
        this.paused = false;
        this.audio.stopMenuMusic();
        this.audio.stopGameOverMusic();
        this.audio.startMusic(stageIndex);
        this.audio.startAmbience();

        this.bullets.cull(() => false);
        this.enemyBullets.cull(() => false);
        this.particles.cull(() => false);
        this.pickups = [];
        this.bombFlash = 0;

        this.player = new Player(this, this.W / 2, this.H - 100);
        this.level = new Level(this, stageIndex);
        this.entities = [this.player];
    }
    update(dt) {
        // Deferred start: assets loaded mid-flight, start the pending stage
        if (this.pendingStart != null && assets.ready) {
            const s = this.pendingStart;
            this.pendingStart = null;
            this.startGame(s);
        }
        this.time += dt;
        updateAsteroids(dt);
        updateClouds(dt, this.level?.stageIndex ?? 0);

        // Decay timers
        if (this.shakeTime > 0) this.shakeTime -= dt;
        if (this.shakeTime <= 0) this.shakePower = 0;

        // Hit-stop: freeze gameplay, don't update input (so keypresses carry over)
        if (this.hitStop > 0) {
            this.hitStop -= dt;
            return;
        }

        // Menu (title / highscores / nameEntry) â€” active when !game.started
        if (this.menu.active) {
            this.menu.update();
            this.input.update();
            return;
        }

        // Pause toggle
        if (this.input.justPressed('KeyP') || this.input.justPressed('Escape')) {
            this.paused = !this.paused;
        }
        if (this.paused) {
            this.input.update();
            return;
        }

        if (!this.running) { this.input.update(); return; }
        if (this.bombFlash > 0) this.bombFlash -= dt;

        this.level.update(dt);
        for (const e of this.entities) e.update(dt);

        this.bullets.update(dt);
        this.enemyBullets.update(dt);
        this.particles.update(dt);

        runCollisions(this);

        const inView = o => o.y > -100 && o.y < this.H + 100 && o.x > -100 && o.x < this.W + 100;
        const inViewEntity = e => e.y > -300 && e.y < this.H + 200 && e.x > -200 && e.x < this.W + 200;
        this.entities = this.entities.filter(e => e.alive && inViewEntity(e));
        this.bullets.cull(inView);
        this.enemyBullets.cull(inView);
        this.particles.cull(p => p.alive);
        this.pickups = this.pickups.filter(p => p.alive && inView(p));

        this.input.update();
    }

    render() {
        const { ctx, W, H } = this;

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, W, H);

        ctx.save();

        // Shake only the game world, not the HUD
        if (this.shakeTime > 0 && this.shakeDur > 0) {
            const k = this.shakeTime / this.shakeDur;   // 1 â†’ 0 over duration
            const mag = this.shakePower * k;
            const dx = (Math.random() - 0.5) * 2 * mag;
            const dy = (Math.random() - 0.5) * 2 * mag;
            ctx.translate(dx, dy);
        }

        drawStars(ctx, this.time, this.level?.stageIndex ?? 0);
        drawAsteroids(ctx, this.level?.stageIndex ?? 0, !this.started);
        drawClouds(ctx, this.level?.stageIndex ?? 0, !this.started);

        if (this.menu.active) {
            this.menu.render(ctx, W, H);
            ctx.restore();
            return;
        }

        this.particles.draw(ctx);
        for (const e of this.entities) e.draw(ctx);
        this.bullets.draw(ctx);
        for (const p of this.pickups) p.draw(ctx);
        this.enemyBullets.draw(ctx);

        if (this.bombFlash > 0 && this.player) {
            const a = this.bombFlash / 0.45;
            const radius = (1 - a) * 700;
            ctx.save();
            ctx.strokeStyle = `rgba(255, 255, 200, ${a * 0.9})`;
            ctx.lineWidth = 14 * a + 2;
            ctx.beginPath();
            ctx.arc(this.player.x, this.player.y, radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = `rgba(255, 255, 220, ${a * 0.25})`;
            ctx.fillRect(0, 0, W, H);
            ctx.restore();
        }

        const banner = this.level?.getBanner?.();
        if (banner) drawBanner(ctx, W, H, banner);

        ctx.restore();    // end of game-world save

        // Red pulse during WARNING state
        if (this.level?.state === 'warning') {
            const pulse = 0.5 + 0.5 * Math.sin(this.level.stateTime * 12);
            ctx.fillStyle = `rgba(180, 20, 20, ${pulse * 0.12})`;
            ctx.fillRect(0, 0, W, H);
        }

        // Game-over fade â€” dims world while ship flies away
        if (this.level?.state === 'gameover') {
            const t = this.level.stateTime;
            const fade = Math.min(0.4, t * 0.25);
            ctx.fillStyle = `rgba(0, 0, 0, ${fade})`;
            ctx.fillRect(0, 0, W, H);
        }

        this.hud.draw(this);
        if (this.debugHit) drawHitboxes(this);

        if (this.level?.fadeAlpha > 0) {
            ctx.fillStyle = `rgba(0, 0, 0, ${this.level.fadeAlpha})`;
            ctx.fillRect(0, 0, W, H);
        }

        if (this.paused) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
            ctx.fillRect(0, 0, W, H);
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'bold 48px monospace';
            ctx.fillStyle = '#5ef';
            ctx.fillText('PAUSED', W / 2, H / 2 - 20);
            ctx.font = '16px monospace';
            ctx.fillStyle = '#fff';
            ctx.fillText('P / ESC to resume', W / 2, H / 2 + 40);
            ctx.restore();
        }
    }
}


// ===== highscores.js =====
// src/highscores.js
const KEY = 'demonstar.highscores.v1';
const MAX = 5;

export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ';

export function loadScores() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function qualifies(score) {
  if (!score || score <= 0) return false;
  const s = loadScores();
  return s.length < MAX || score > s[s.length - 1].score;
}

export function addScore(name, score, stage) {
  const s = loadScores();
  s.push({ name, score, stage, ts: Date.now() });
  s.sort((a, b) => b.score - a.score);
  const top = s.slice(0, MAX);
  try { localStorage.setItem(KEY, JSON.stringify(top)); } catch {}
  return top;
}


// ===== hud.js =====
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
    ctx.fillText(`SCORE ${game.player?.score ?? 0}`, W - 8, 38);
    ctx.fillText(`B:${game.bullets.size}/${game.bullets.freeCount}`,       W - 8, 56);
    ctx.fillText(`E:${game.enemyBullets.size}/${game.enemyBullets.freeCount}`, W - 8, 74);
    ctx.fillText(`P:${game.particles.size}/${game.particles.freeCount}`,   W - 8, 92);
  }
}


// ===== input.js =====
// Input handling logic (keyboard/gamepad)// src/input.js
export class Input {
  constructor() {
    this.keys = {};
    this.pressed = {};   // edge-triggered this frame
    addEventListener('keydown', e => {
      if (!this.keys[e.code]) this.pressed[e.code] = true;
      this.keys[e.code] = true;
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', e => { this.keys[e.code] = false; });
  }
  
  update() { this.pressed = {}; }
  down(code) { return !!this.keys[code]; }
  justPressed(code) { return !!this.pressed[code]; }
}


// ===== level.js =====
// src/level.js
import { spawn as spawnEnemy } from './enemies.js';
import { spawnBoss } from './boss.js';
import { LEVELS } from './levels/index.js';
import { clock } from './clock.js';

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
    this.advancing = false;  // guard against double-fire from fade + clear timer
  }

  update(dt) {

    this.stateTime += dt;



    // Global game-over check â€” fires before the switch so it overrides any state.
    if (this.game.player && (this.game.player.dying || !this.game.player.alive) &&
  this.state !== 'gameover' && this.state !== 'clear' && this.state !== 'done') {
      this.state = 'gameover';
      this.stateTime = 0;
      this.game.audio?.gameOver();
      return;
    }
    // Transition fade â€” starts fading out when state becomes 'clear'
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
        // Fade-driven advance in update() is the canonical path (Path B).
        // This branch intentionally empty â€” Path A removed to prevent double-fire.
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
    if (this.advancing) return;
    this.advancing = true;
    const next = this.stageIndex + 1;
    if (next >= LEVELS.length) {
      this.state = 'victory';
      this.stateTime = 0;
      return;
    }

    this.game.fadeDir = 1;       // start fade out
    clock.setTimeout(() => {
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


// ===== main.js =====
// src/main.js — boot, input wiring, game loop
import { Game } from './game.js';
import { Level } from './level.js';
import { clock } from './clock.js';
import { loadImages } from './assets.js';

if (location.search.includes('?test=1')) {
    clock.enableVirtual();
    window.__clock = clock;
}

const canvas = document.getElementById('game');
const game = new Game(canvas);
loadImages();

window.__game = game;
window.__audio = game.audio;
window.__gameLevelModule = { Level };

const input = game.input;
const audio = game.audio;

// ---- Two-stage first gesture ----
// 1. First key/click: init audio, start menu music
// 2. Second key (Enter/Space) or click: stop menu music, start gameplay
const firstGesture = () => {
    if (game.audioInited) return;
    game.audioInited = true;
    audio.init();
    audio.resume();
    audio.startMenuMusic();
    input.pressed = {};         // swallow this keypress (so Enter doesn't also start the game)
    removeEventListener('keydown', firstGesture);
    removeEventListener('pointerdown', firstGesture);
};
addEventListener('keydown', firstGesture);
addEventListener('pointerdown', firstGesture);

// Mute toggle
addEventListener('keydown', e => {
    if (e.code === 'KeyM') audio.toggleMute();
});

// Debug hitboxes toggle (` key)
addEventListener('keydown', e => {
    if (e.code === 'Backquote') game.debugHit = !game.debugHit;
});

// Debug: K cycles to the next level index (1→2→3→4→1…)
// At the title screen it starts the game at that level; mid-game it jumps there immediately.
let debugStageIndex = 0;
addEventListener('keydown', e => {
    if (e.code !== 'KeyK') return;
    debugStageIndex = (debugStageIndex + 1) % 4;
    if (!game.started) {
        game.startGame(debugStageIndex);
    } else {
        const idx = debugStageIndex;
        game.level = new Level(game, idx);
        game.audio?.startMusic(idx);
        game.entities = game.player ? [game.player] : [];
        game.bullets.cull(() => false);
        game.enemyBullets.cull(() => false);
        game.pickups = [];
        game.bombFlash = 0;
    }
});
let last = performance.now();
let acc = 0;
const STEP = 1 / 60;

function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.25);
    last = now;
    acc += dt;

    while (acc >= STEP) {
        game.update(STEP);
        acc -= STEP;
    }
    game.render();
    requestAnimationFrame(frame);
}

requestAnimationFrame(frame);



// ===== menu.js =====
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
    ctx.fillText('Demon Starship', W / 2 + 3, H / 2 - 100 + 3);
    ctx.fillStyle = '#5ef';
    ctx.fillText('Demon Starship', W / 2, H / 2 - 100);

    ctx.font = '18px monospace';
    ctx.fillStyle = '#8af';
    ctx.fillText('a 4-stage shmup', W / 2, H / 2 - 50);

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
      ctx.fillText('H â€” HIGH SCORES', W / 2, H / 2 + 90);
    }

    ctx.font = '12px monospace';
    ctx.fillStyle = '#555';
    ctx.fillText('WASD / Arrows: move Â· Space/Z: fire Â· X: bomb', W / 2, H - 70);
    ctx.fillText('P: pause Â· M: mute Â· `: hitboxes', W / 2, H - 50);

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
    ctx.fillText('ENTER â€” BACK', W / 2, H - 60);

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
    ctx.fillText('â† â†’ move cursor Â· â†‘ â†“ change letter', W / 2, y + boxH + 50);
    ctx.fillStyle = '#fff';
    ctx.fillText('ENTER to confirm', W / 2, y + boxH + 80);

    ctx.restore();
  }
}


// ===== particles.js =====
// src/particles.js
import { clock } from './clock.js';

export function spawnParticle(game, opts) {
  const p = game.particles.spawn();
  p.x = opts.x;
  p.y = opts.y;
  p.vx = opts.vx ?? 0;
  p.vy = opts.vy ?? 0;
  p.life = opts.life ?? 0.5;
  p.maxLife = p.life;
  p.r = opts.r ?? 3;
  p.color = opts.color ?? '#fff';
  p.drag = opts.drag ?? 0.9;
  return p;
}

export function burst(game, x, y, count, opts = {}) {
  const speed = opts.speed ?? 180;
  const life = opts.life ?? 0.5;
  const color = opts.color ?? '#fa4';
  const r = opts.r ?? 3;

  for (let i = 0; i < count; i++) {
    const a = clock.random() * Math.PI * 2;
    const s = speed * (0.4 + clock.random() * 0.8);
    spawnParticle(game, {
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: life * (0.6 + clock.random() * 0.6),
      r,
      color,
      drag: 0.88,
    });
  }
}

export const explosions = {
  scout(game, x, y) {
    burst(game, x, y, 10, { speed: 180, life: 0.4, color: '#fc6', r: 3 });
    burst(game, x, y, 4,  { speed: 260, life: 0.25, color: '#fff', r: 2 });
  },
  midboss(game, x, y) {
    burst(game, x, y, 22, { speed: 240, life: 0.6, color: '#f88', r: 4 });
    burst(game, x, y, 10, { speed: 340, life: 0.35, color: '#fff', r: 2 });
  },
  boss(game, x, y) {
    burst(game, x, y, 50, { speed: 300, life: 0.9, color: '#fa3', r: 5 });
    burst(game, x, y, 30, { speed: 420, life: 0.5, color: '#fff', r: 3 });
  },
  bulletHit(game, x, y) {
    burst(game, x, y, 3, { speed: 90, life: 0.15, color: '#7ff', r: 2 });
  },
  playerHit(game, x, y) {
    burst(game, x, y, 24, { speed: 300, life: 0.6, color: '#5ef', r: 4 });
  },
  bomb(game, x, y) {
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      spawnParticle(game, {
        x, y,
        vx: Math.cos(a) * 500,
        vy: Math.sin(a) * 500,
        life: 0.45,
        r: 4,
        color: '#ffe',
        drag: 1,
      });
    }
  },
};


// ===== player.js =====
// src/player.js
import { explosions, burst } from './particles.js';
import { clock } from './clock.js';
import { sprite } from './assets.js';

export class Player {
  constructor(game, x, y) {
    this.game = game;
    this.x = x; this.y = y;
    this.r = 6;
    this.w = 24; this.h = 24;
    this.speed = 300;
    this.alive = true;
    this.lives = 3;
    this.bombs = 3;
    this.weapon = 1;
    this.cooldown = 0;
    this.fireRate = 0.10;
    this.invuln = 1.0;
    this.score = 0;
    this.muzzleFlash = 0;

    // Death fly-away
    this.dying = false;
    this.dyingTime = 0;
    this.dyingDuration = 1.2;
    this.deathVx = 0;
    this.deathVy = -400;
  }

  update(dt) {
    // Dying fly-away â€” ship accelerates upward, fades, then despawns
    if (this.dying) {
      this.dyingTime += dt;
      this.deathVy -= 350 * dt;
      this.x += this.deathVx * dt;
      this.y += this.deathVy * dt;
      if (this.muzzleFlash > 0) this.muzzleFlash -= dt;
      if (this.dyingTime >= this.dyingDuration || this.y < -60) {
        this.alive = false;
      }
      if (Math.random() < 0.3) {
        burst(this.game, this.x, this.y + 5, 2,
              { speed: 60, life: 0.3, color: '#f88', r: 2 });
      }
      return;
    }

    const { input, W, H } = this.game;
    let dx = 0, dy = 0;
    if (input.down('ArrowLeft') || input.down('KeyA')) dx -= 1;
    if (input.down('ArrowRight') || input.down('KeyD')) dx += 1;
    if (input.down('ArrowUp') || input.down('KeyW')) dy -= 1;
    if (input.down('ArrowDown') || input.down('KeyS')) dy += 1;

    const len = Math.hypot(dx, dy) || 1;
    this.x += (dx / len) * this.speed * dt;
    this.y += (dy / len) * this.speed * dt;

    const m = 16;
    this.x = Math.max(m, Math.min(W - m, this.x));
    this.y = Math.max(m, Math.min(H - m, this.y));

    this.cooldown -= dt;
    if ((input.down('Space') || input.down('KeyZ')) && this.cooldown <= 0) {
      this.shoot();
      this.cooldown = this.fireRate;
    }

    if (input.justPressed('KeyX')) this.useBomb();

    if (this.invuln > 0) this.invuln -= dt;
    if (this.muzzleFlash > 0) this.muzzleFlash -= dt;
  }

  shoot() {
    const spd = 800;
    const lvl = this.weapon;

    if (lvl === 1) {
      this.spawnBullet(0, 0, -spd, 1);
    } else if (lvl === 2) {
      this.spawnBullet(-8, 0, -spd, 1);
      this.spawnBullet(8, 0, -spd, 1);
    } else {
      const angle = 0.22;
      const vxOff = Math.sin(angle) * spd;
      this.spawnBullet(0, 0, -spd * 1.15, 2);
      this.spawnBullet(-6, -vxOff, -spd, 1);
      this.spawnBullet(6, vxOff, -spd, 1);
    }
  }

  spawnBullet(offsetX, vx, vy, damage = 1) {
    const b = this.game.bullets.spawn();
    this.game.audio.shoot();
    b.x = this.x + offsetX;
    b.y = this.y - 14;
    b.vx = vx;
    b.vy = vy;
    b.r = 4;
    b.damage = damage;
    this.muzzleFlash = 0.06;
  }

  useBomb() {
    if (this.bombs <= 0) return;
    this.bombs--;

    this.invuln = Math.max(this.invuln, 1.6);

    for (const b of this.game.enemyBullets.list) b.alive = false;

    for (const e of this.game.entities) {
      if (e === this || !e.alive) continue;
      if (typeof e.hit !== 'function') continue;
      e.killedByBomb = true;
      e.hit(15);
    }

    this.game.bombFlash = 0.45;
    this.game.triggerShake?.(0.5, 18);
    this.game.audio.bomb();
    explosions.bomb(this.game, this.x, this.y);
  }

  hit() {
    if (this.invuln > 0) return;
    this.lives--;
    this.game.triggerShake?.(0.35, 14);
    this.game.audio.playerHit();
    this.invuln = 2;
    if (this.lives <= 0) {
      this.dying = true;
      this.dyingTime = 0;
      this.deathVx = (clock.random() - 0.5) * 150;
      this.deathVy = -400;
    }
  }

  draw(ctx) {
    if (this.dying) {
      const fade = Math.max(0, 1 - this.dyingTime / this.dyingDuration);
      ctx.globalAlpha = fade;
    }

    if (this.muzzleFlash > 0) {
      const k = this.muzzleFlash / 0.06;
      ctx.save();
      ctx.globalAlpha *= k;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(this.x, this.y - 16, 6 * k, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (!this.dying && this.invuln > 0 && Math.floor(this.invuln * 20) % 2 === 0) {
      ctx.globalAlpha = 1;
      return;
    }

    ctx.fillStyle = '#5ef';
    ctx.beginPath();
    ctx.moveTo(this.x, this.y - 14);
    ctx.lineTo(this.x - 12, this.y + 10);
    ctx.lineTo(this.x, this.y + 4);
    ctx.lineTo(this.x + 12, this.y + 10);
    ctx.closePath();
    ctx.fill();

    if (this.dying) ctx.globalAlpha = 1;
  }
}


// ===== pool.js =====
// src/pool.js
export class Pool {
  constructor(factory, initialSize = 0) {
    this.factory = factory;
    this.free = [];
    this.active = [];
    for (let i = 0; i < initialSize; i++) this.free.push(factory());
  }

  spawn() {
    const obj = this.free.pop() ?? this.factory();
    obj.alive = true;
    this.active.push(obj);
    return obj;
  }

  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const o = this.active[i];
      o.update(dt);
      if (!o.alive) {
        this.active.splice(i, 1);
        this.free.push(o);
      }
    }
  }

  cull(predicate) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const o = this.active[i];
      if (!predicate(o)) {
        this.active.splice(i, 1);
        o.alive = false;
        this.free.push(o);
      }
    }
  }

  draw(ctx) {
    for (const o of this.active) o.draw(ctx);
  }

  get list() { return this.active; }
  get size() { return this.active.length; }
  get freeCount() { return this.free.length; }
}


// ===== powerups.js =====
// Powerup logic// src/powerups.js
import { clock } from './clock.js';

// Drop chance per enemy rank.
const DROP_CHANCE = {
  common:   0.04,
  uncommon: 0.18,
  boss:     1.00,
};

// Weighted roll for what actually drops.
function rollType(rank) {
  const r = clock.random();
  if (rank === 'boss')     return 'weapon';       // boss always drops a weapon
  if (rank === 'uncommon') return r < 0.65 ? 'weapon' : 'bomb';
  return r < 0.6 ? 'weapon' : 'bomb';             // common
}

export function maybeDrop(game, x, y, rank = 'common') {
  if (clock.random() > (DROP_CHANCE[rank] ?? 0.04)) return;
  spawnPickup(game, x, y, rollType(rank));

  // Boss also drops a bomb, for good measure.
  if (rank === 'boss') spawnPickup(game, x + 20, y + 10, 'bomb');
}

export function spawnPickup(game, x, y, type) {
  const p = {
    x, y, type,
    r: 14,
    vy: 40,
    t: 0,
    alive: true,

    update(dt) {
      this.t += dt;
      this.vy = Math.min(this.vy + 60 * dt, 140);
      this.y += this.vy * dt;

      // Magnet toward the player when close.
      const pl = game.player;
      if (pl && pl.alive) {
        const dx = pl.x - this.x;
        const dy = pl.y - this.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < 110) {
          this.x += (dx / d) * 220 * dt;
          this.y += (dy / d) * 220 * dt;
        }
      }

      if (this.y > 900) this.alive = false;
    },

    draw(ctx) {
      const pulse = 0.5 + 0.5 * Math.sin(this.t * 8);
      ctx.save();
      ctx.globalAlpha = 0.35 + 0.35 * pulse;
      ctx.fillStyle = this.type === 'weapon' ? '#4f8' : '#fa4';
      ctx.beginPath();
      ctx.arc(this.x, this.y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Ring
      ctx.strokeStyle = this.type === 'weapon' ? '#8fc' : '#fda';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 12, 0, Math.PI * 2);
      ctx.stroke();

      // Letter
      ctx.fillStyle = '#000';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.type === 'weapon' ? 'W' : 'B', this.x, this.y + 1);
    },
  };
  game.pickups.push(p);
  return p;
}

export function applyPickup(game, p) {
  const pl = game.player;
  if (!pl || !pl.alive) return;
  game.audio.pickup();

  if (p.type === 'weapon') {
    // Cap at level 3.
    if (pl.weapon < 3) pl.weapon++;
    else pl.score += 500;   // already maxed: bonus points
  } else if (p.type === 'bomb') {
    pl.bombs = Math.min(pl.bombs + 1, 5);
  }
}


// ===== starfield.js =====
// src/starfield.js â€” two-layer parallax starfield
import { clock } from './clock.js';

let starsInitialized = false;
const starsFar = [];
const starsNear = [];

function ensureInit() {
  if (starsInitialized) return;
  for (let i = 0; i < 60; i++) {
    starsFar.push({
      x: clock.random() * 480,
      y: clock.random() * 800,
      s: clock.random() * 1 + 0.5,
      v: clock.random() * 60 + 30,     // slow
    });
  }
  for (let i = 0; i < 40; i++) {
    starsNear.push({
      x: clock.random() * 480,
      y: clock.random() * 800,
      s: clock.random() * 2 + 1,
      v: clock.random() * 160 + 100,   // fast
    });
  }
  starsInitialized = true;
}

const STAGE_STAR_COLORS = [
    { far: '#446', near: '#8af' },  // stage 1 â€” orbital belt
    { far: '#553', near: '#fc8' },  // stage 2 â€” enemy fleet
    { far: '#534', near: '#f8a' },  // stage 3 â€” planet surface
    { far: '#411', near: '#f44' },  // stage 4 â€” Demon Starship core
];

export function drawStars(ctx, t, stageIndex) {
    ensureInit();
    const idx = stageIndex ?? 0;
    const palette = STAGE_STAR_COLORS[idx % STAGE_STAR_COLORS.length];

    ctx.fillStyle = palette.far;
    for (const s of starsFar) {
        const y = (s.y + t * s.v) % 800;
        ctx.fillRect(s.x | 0, y | 0, s.s | 0 || 1, s.s | 0 || 1);
    }

    ctx.fillStyle = palette.near;
    for (const s of starsNear) {
        const y = (s.y + t * s.v) % 800;
        ctx.fillRect(s.x | 0, y | 0, s.s | 0 || 1, s.s | 0 || 1);
    }
}


