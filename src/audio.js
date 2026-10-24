// src/audio.js
export class AudioManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.sfxGain = null;
        this.musicGain = null;
        this.ambienceGain = null;

        this.enabled = true;
        this.sfxVolume = 0.35;       // all SFX
        this.musicVolume = 0.25;     // bgm_main.mp3
        this.ambienceVolume = 0.15;  // ambience.wav
        this.lastShotAt = 0;

        // Sample buffers
        this.buffers = {};
        this.musicBuffer = null;
        this.ambienceBuffer = null;

        // Playback state
        this.musicPlaying = false;
        this.musicSource = null;
        this.musicTimer = null;

        this.ambiencePlaying = false;
        this.ambienceSource = null;

        // Pending starts (buffer not loaded yet)
        this._pendingMusicStart = false;
        this._pendingAmbienceStart = false;
        this._musicLoadFailed = false;
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

        // Music
        try {
            const res = await fetch('assets/music/bgm_main.mp3');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const buf = await res.arrayBuffer();
            this.musicBuffer = await this.ctx.decodeAudioData(buf);
            if (this._pendingMusicStart) {
                this._pendingMusicStart = false;
                this.startMusic();
            }
        } catch (err) {
            console.warn('Failed to load music', err);
            this._musicLoadFailed = true;
            if (this._pendingMusicStart) {
                this._pendingMusicStart = false;
                this._startSynthMusic();
            }
        }

        // Ambience (looping texture — no synth fallback)
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
        const now = performance.now();
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
        setTimeout(() => this._tone(660, 0.2, { type: 'square', vol: 0.16 }), 360);
    }

    stageClear() {
        this._tone(660, 0.15, { type: 'sine', vol: 0.16 });
        setTimeout(() => this._tone(880, 0.15, { type: 'sine', vol: 0.16 }), 150);
        setTimeout(() => this._tone(1320, 0.35, { type: 'sine', vol: 0.16 }), 300);
    }

    gameOver() {
        this._tone(440, 0.3, { type: 'triangle', vol: 0.2, endFreq: 220 });
        setTimeout(() => this._tone(220, 0.6, { type: 'triangle', vol: 0.2, endFreq: 80 }), 350);
    }

    // ---- music ----

    startMusic() {
        if (this.musicPlaying || !this.ctx) return;

        if (this.musicBuffer) {
            this.musicPlaying = true;
            this.musicSource = this.ctx.createBufferSource();
            this.musicSource.buffer = this.musicBuffer;
            this.musicSource.loop = true;
            this.musicSource.connect(this.musicGain);
            this.musicSource.start();
            return;
        }

        if (this._musicLoadFailed) {
            this._startSynthMusic();
            return;
        }

        this._pendingMusicStart = true;
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
        this.musicPlaying = false;
        if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; }
        if (this.musicSource) { try { this.musicSource.stop(); } catch { } this.musicSource = null; }
    }

    // ---- ambience (looping background texture) ----

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
            try { this.ambienceSource.stop(); } catch { }
            this.ambienceSource = null;
        }
    }
}