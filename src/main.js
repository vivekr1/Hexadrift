// Boot and game loop logic// src/main.js
import { Input } from './input.js';
import { Player } from './player.js';
import { Level } from './level.js';
import { Hud } from './hud.js';
import { level1 } from './levels/level1.js';

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
  entities: [],
  bullets: [],
  enemyBullets: [],
  particles: [],
  level: null,
  player: null,
};

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
  input.update();

  game.level.update(dt);
  for (const e of game.entities) e.update(dt);
  for (const b of game.bullets) b.update(dt);
  for (const b of game.enemyBullets) b.update(dt);
  for (const p of game.particles) p.update(dt);

  // cull
  const inView = o => o.y > -100 && o.y < H + 100 && o.x > -100 && o.x < W + 100;
  game.entities = game.entities.filter(e => e.alive && inView(e));
  game.bullets = game.bullets.filter(b => b.alive && inView(b));
  game.enemyBullets = game.enemyBullets.filter(b => b.alive && inView(b));
  game.particles = game.particles.filter(p => p.alive);
}

function render() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  // simple scrolling starfield as placeholder background
  drawStars(ctx, game.time);

  for (const p of game.particles) p.draw(ctx);
  for (const e of game.entities) e.draw(ctx);
  for (const b of game.bullets) b.draw(ctx);
  for (const b of game.enemyBullets) b.draw(ctx);

  hud.draw(game);
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