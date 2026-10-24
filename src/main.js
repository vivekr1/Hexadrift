// Boot and game loop logic// src/main.js
import { Input } from './input.js';
import { Player } from './player.js';
import { Level } from './level.js';
import { Hud } from './hud.js';
import { level1 } from './levels/level1.js';
import { runCollisions } from './collision.js'
import { Pool } from './pool.js';


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

const game = {
    W, H, ctx, input,
    time: 0,
    running: true,
    bullets:      new Pool(makePlayerBullet, 200),
    enemyBullets: new Pool(makeEnemyBullet, 400),
    particles:    new Pool(makeParticle, 600),
    pickups: [],
    entities: [],
    bombFlash: 0,
    level: null,
    player: null,
};

// near the top
let debugHit = false;
addEventListener('keydown', e => {
    if (e.code === 'Backquote') debugHit = !debugHit; // ` key
});

function start() {
    game.player = new Player(game, W / 2, H - 100);
    game.level = new Level(game, level1);
    game.entities.push(game.player);
}

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
  if (!game.running) return;
  game.time += dt;

  if (game.bombFlash > 0) game.bombFlash -= dt;

  game.level.update(dt);
  for (const e of game.entities) e.update(dt);

  game.bullets.update(dt);
  game.enemyBullets.update(dt);
  game.particles.update(dt);

  runCollisions(game);

  const inView = o => o.y > -100 && o.y < H + 100 && o.x > -100 && o.x < W + 100;
  game.entities = game.entities.filter(e => e.alive && inView(e));
  game.bullets.cull(inView);
  game.enemyBullets.cull(inView);
  game.particles.cull(p => p.alive);
  game.pickups = game.pickups.filter(p => p.alive && inView(p));

  input.update();
}

function render() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    // simple scrolling starfield as placeholder background
    drawStars(ctx, game.time);

    game.particles.draw(ctx);
    for (const e of game.entities) e.draw(ctx);
    game.bullets.draw(ctx);
    for (const p of game.pickups) p.draw(ctx);
    game.enemyBullets.draw(ctx);

    // Bomb flash: expanding white ring from the player
    if (game.bombFlash > 0 && game.player) {
        const a = game.bombFlash / 0.45;              // 0..1
        const radius = (1 - a) * 700;
        ctx.save();
        ctx.strokeStyle = `rgba(255, 255, 200, ${a * 0.9})`;
        ctx.lineWidth = 14 * a + 2;
        ctx.beginPath();
        ctx.arc(game.player.x, game.player.y, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Soft white overlay
        ctx.fillStyle = `rgba(255, 255, 220, ${a * 0.25})`;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
    }

    hud.draw(game);
    if (debugHit) drawHitboxes(game, ctx);
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
const stars = Array.from({ length: 80 }, () => ({
    x: Math.random() * 480,
    y: Math.random() * 800,
    s: Math.random() * 2 + 0.5,
    v: Math.random() * 120 + 60,
}));
function drawStars(ctx, t) {
    ctx.fillStyle = '#8af';
    for (const s of stars) {
        const y = (s.y + t * s.v) % 800;
        ctx.fillRect(s.x | 0, y | 0, s.s | 0 || 1, s.s | 0 || 1);
    }
}

start();
requestAnimationFrame(frame);