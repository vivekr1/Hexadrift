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
