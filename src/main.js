// Boot and game loop logic// src/main.js
import { Input } from './input.js';
import { Player } from './player.js';
import { Level } from './level.js';
import { Hud } from './hud.js';
import { LEVELS } from './levels/index.js';
import { runCollisions } from './collision.js'
import { Pool } from './pool.js';
import { AudioManager } from './audio.js';
import { Menu } from './menu.js';


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

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const W = canvas.width;
const H = canvas.height;

const input = new Input();
const hud = new Hud(ctx, W, H);
const audio = new AudioManager();
window.__audio = audio;

const game = {
    W, H, ctx, input,
    time: 0,
    running: true,
    bullets: new Pool(makePlayerBullet, 200),
    enemyBullets: new Pool(makeEnemyBullet, 400),
    particles: new Pool(makeParticle, 600),
    pickups: [],
    entities: [],
    bombFlash: 0,
    shakeTime: 0,      // seconds remaining
    shakeDur: 1,       // initial duration (for normalization)
    shakePower: 0,     // max px offset
    hitStop: 0,
    level: null,
    player: null,
    audio,
    audioInited: false,
    started: false,
    fadeAlpha: 0,
    fadeDir: 0,
};


function triggerShake(duration, power) {
    console.log(`Triggering shake: ${duration}s, ${power}px`);
    if (game.shakeTime <= 0 || duration > game.shakeTime) {
        game.shakeTime = duration;
        game.shakeDur = duration;
    }
    if (power > game.shakePower) game.shakePower = power;
}
game.triggerShake = triggerShake;

function triggerHitStop(seconds) {
    if (seconds > game.hitStop) game.hitStop = seconds;
}
game.triggerHitStop = triggerHitStop;

window.__game = game;
window.__gameLevelModule = { Level };
const menu = new Menu(game);
game.menu = menu;
game.paused = false;

game.startGame = () => {
    if (game.started) return;
    game.started = true;
    game.paused = false;
    audio.stopMenuMusic();
    audio.stopGameOverMusic();
    audio.startMusic(0);
    audio.startAmbience();

    game.bullets.cull(() => false);
    game.enemyBullets.cull(() => false);
    game.particles.cull(() => false);
    game.pickups = [];
    game.bombFlash = 0;

    game.player = new Player(game, W / 2, H - 100);
    game.level = new Level(game, 0);
    game.entities = [game.player];
};

// near the top
let debugHit = false;
addEventListener('keydown', e => {
    if (e.code === 'Backquote') debugHit = !debugHit; // ` key
});


let last = performance.now();
let acc = 0;
const STEP = 1 / 60;

function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.25);
    last = now;
    acc += dt;

    while (acc >= STEP) {
        update(STEP);
        acc -= STEP;
    }
    render();
    requestAnimationFrame(frame);
}

function update(dt) {
    game.time += dt;
    // Decay timers
    if (game.shakeTime > 0) game.shakeTime -= dt;
    if (game.shakeTime <= 0) game.shakePower = 0;

    // Hit-stop: freeze gameplay, don't update input (so keypresses carry over)
    if (game.hitStop > 0) {
        game.hitStop -= dt;
        return;
    }

    // Menu (title / highscores / nameEntry) — active when !game.started
    if (menu.active) {
        menu.update();
        input.update();
        return;
    }

    // Pause toggle
    if (input.justPressed('KeyP') || input.justPressed('Escape')) {
        game.paused = !game.paused;
    }
    if (game.paused) {
        input.update();
        return;
    }

    if (!game.running) { input.update(); return; }
    if (game.bombFlash > 0) game.bombFlash -= dt;

    game.level.update(dt);
    for (const e of game.entities) e.update(dt);

    game.bullets.update(dt);
    game.enemyBullets.update(dt);
    game.particles.update(dt);

    runCollisions(game);

    const inView = o => o.y > -100 && o.y < H + 100 && o.x > -100 && o.x < W + 100;
    const inViewEntity = e => e.y > -300 && e.y < H + 200 && e.x > -200 && e.x < W + 200;
    game.entities = game.entities.filter(e => e.alive && inViewEntity(e));
    game.bullets.cull(inView);
    game.enemyBullets.cull(inView);
    game.particles.cull(p => p.alive);
    game.pickups = game.pickups.filter(p => p.alive && inView(p));

    input.update();
}

function render() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    ctx.save();

    // Shake only the game world, not the HUD
    if (game.shakeTime > 0 && game.shakeDur > 0) {
        const k = game.shakeTime / game.shakeDur;   // 1 → 0 over duration
        const mag = game.shakePower * k;
        const dx = (Math.random() - 0.5) * 2 * mag;
        const dy = (Math.random() - 0.5) * 2 * mag;
        ctx.translate(dx, dy);
        console.log('[render-shake]', game.shakeTime, mag, dx, dy);
    }

    drawStars(ctx, game.time);

    if (menu.active) {
        menu.render(ctx, W, H);
        ctx.restore();
        return;
    }

    game.particles.draw(ctx);
    for (const e of game.entities) e.draw(ctx);
    game.bullets.draw(ctx);
    for (const p of game.pickups) p.draw(ctx);
    game.enemyBullets.draw(ctx);

    if (game.bombFlash > 0 && game.player) {
        const a = game.bombFlash / 0.45;
        const radius = (1 - a) * 700;
        ctx.save();
        ctx.strokeStyle = `rgba(255, 255, 200, ${a * 0.9})`;
        ctx.lineWidth = 14 * a + 2;
        ctx.beginPath();
        ctx.arc(game.player.x, game.player.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = `rgba(255, 255, 220, ${a * 0.25})`;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
    }

    const banner = game.level?.getBanner?.();
    if (banner) drawBanner(banner);

    ctx.restore();    // end of game-world save


    // Red pulse during WARNING state
    if (game.level?.state === 'warning') {
        const pulse = 0.5 + 0.5 * Math.sin(game.level.stateTime * 12);
        ctx.fillStyle = `rgba(180, 20, 20, ${pulse * 0.12})`;
        ctx.fillRect(0, 0, W, H);
    }

    // Game-over fade — dims world while ship flies away
   if (game.level?.state === 'gameover') {
    const t = game.level.stateTime;
    const fade = Math.min(0.4, t * 0.25);
    ctx.fillStyle = `rgba(0, 0, 0, ${fade})`;
    ctx.fillRect(0, 0, W, H);
}

    hud.draw(game);
    if (debugHit) drawHitboxes(game, ctx);

    if (game.level?.fadeAlpha > 0) {
        ctx.fillStyle = `rgba(0, 0, 0, ${game.level.fadeAlpha})`;
        ctx.fillRect(0, 0, W, H);
    }

    if (game.paused) {
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

function drawHitboxes(game, ctx) {
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#0f0';
    const circle = (x, y, r) => {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();
    };
    if (game.player?.alive) circle(game.player.x, game.player.y, game.player.r);
    for (const e of game.entities) if (e !== game.player && e.alive) circle(e.x, e.y, e.r ?? 12);
    for (const b of game.bullets) if (b.alive) circle(b.x, b.y, b.r ?? 4);
    for (const b of game.enemyBullets) if (b.alive) circle(b.x, b.y, b.r ?? 5);
}

// cheap starfield
// const stars = Array.from({ length: 80 }, () => ({
//     x: Math.random() * 480,
//     y: Math.random() * 800,
//     s: Math.random() * 2 + 0.5,
//     v: Math.random() * 120 + 60,
// }));
// function drawStars(ctx, t) {
//     const starColors = ['#8af', '#fc8', '#f8a', '#f44'];   // 4 stages, 4 colors
//     const idx = game.level?.stageIndex ?? 0;
//     ctx.fillStyle = starColors[idx % starColors.length];
//     for (const s of stars) {
//         const y = (s.y + t * s.v) % 800;
//         ctx.fillRect(s.x | 0, y | 0, s.s | 0 || 1, s.s | 0 || 1);
//     }
// }

// Two-layer parallax starfield
const starsFar = Array.from({ length: 60 }, () => ({
    x: Math.random() * 480,
    y: Math.random() * 800,
    s: Math.random() * 1 + 0.5,
    v: Math.random() * 60 + 30,     // slow
}));
const starsNear = Array.from({ length: 40 }, () => ({
    x: Math.random() * 480,
    y: Math.random() * 800,
    s: Math.random() * 2 + 1,
    v: Math.random() * 160 + 100,   // fast
}));

const STAGE_STAR_COLORS = [
    { far: '#446', near: '#8af' },  // stage 1 — orbital belt
    { far: '#553', near: '#fc8' },  // stage 2 — enemy fleet
    { far: '#534', near: '#f8a' },  // stage 3 — planet surface
    { far: '#411', near: '#f44' },  // stage 4 — demon star core
];

function drawStars(ctx, t) {
    const idx = game.level?.stageIndex ?? 0;
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



function drawBanner(banner) {
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

requestAnimationFrame(frame);

// const startGameHandler = (e) => {
//     if (game.started) return;
//     if (e.type === 'keydown' && e.code !== 'Enter' && e.code !== 'Space') return;

//     game.started = true;
//     audio.stopMenuMusic();
//     audio.startMusic();
//     audio.startAmbience();
//     start();

//     removeEventListener('keydown', startGameHandler);
//     removeEventListener('pointerdown', startGameHandler);
// };

// addEventListener('keydown', firstGesture);
// addEventListener('pointerdown', firstGesture);

// // Mute toggle
// addEventListener('keydown', e => {
//     if (e.code === 'KeyM') audio.toggleMute();
//});

