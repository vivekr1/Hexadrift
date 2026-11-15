// src/game.js — Game class: state bag, fixed-timestep loop, render pipeline
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

        // Menu (title / highscores / nameEntry) — active when !game.started
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
            const k = this.shakeTime / this.shakeDur;   // 1 → 0 over duration
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

        // Game-over fade — dims world while ship flies away
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