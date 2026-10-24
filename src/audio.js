// src/audio.js
export class AudioManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.sfxGain = null;
        this.musicGain = null;
        this.musicTimer = null;
        this.musicPlaying = false;
        this.enabled = true;
        this.sfxVolume = 0.35;
        this.musicVolume = 0.25;
        this.lastShotAt = 0;

        // Loaded sample buffers (populated after init)
        this.buffers = {};
        this.musicBuffer = null;
        this.musicSource = null;
        this._pendingMusicStart = false;
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

        // Kick off async loads — safe, they resolve when ready
        this._loadSamples();

        // Attempt to resume context if suspended (common browser behavior)
        if (this.ctx.state === 'suspended') {
            this.ctx.resume().then(() => {
                console.log('AudioContext resumed successfully.');
            }).catch(err => {
                console.error('Failed to resume AudioContext:', err);
            });
        }
    }

    async _loadSamples() {
        const sfxFiles = {
            explode_medium: 'assets/sfx/explode_medium.wav',
            pickup: 'assets/sfx/pickup.wav',
        };
        const loads = Object.entries(sfxFiles).map(async ([key, url]) => {
            try {
                const res = await fetch(url);
                const buf = await res.arrayBuffer();
                this.buffers[key] = await this.ctx.decodeAudioData(buf);
            } catch (err) {
                console.warn('Failed to load', url, err);
            }
        });

        try {
            const res = await fetch('assets/music/bgm_main.mp3');
            if (!res.ok) {
                console.error(`Failed to fetch music: HTTP ${res.status}`);
                throw new Error(`HTTP ${res.status}`);
            }
            const buf = await res.arrayBuffer();
            this.musicBuffer = await this.ctx.decodeAudioData(buf);
            if (this._pendingMusicStart) {
                this._pendingMusicStart = false;
                this.startMusic();
                consle.log('Music started after load.');
            }
        } catch (err) {
            console.warn('Failed to load music', err);
            this._musicLoadFailed = true;
            if (this._pendingMusicStart) {
                this._pendingMusicStart = false;
                this._startSynthMusic();
            }
        }

        await Promise.all(loads);
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
        this._noise(0.14, { vol: 0.13 });
        this._tone(220, 0.14, { type: 'sawtooth', vol: 0.08, endFreq: 90 });
    }

    midboss() {
        // Try sample first, fall back to synth if not loaded
        if (this._sample('explode_medium', { vol: 0.7 })) return;
        this._noise(0.35, { vol: 0.18 });
        this._tone(150, 0.35, { type: 'sawtooth', vol: 0.14, endFreq: 40 });
    }

    boss() {
        this._noise(0.9, { vol: 0.22 });
        this._tone(100, 0.9, { type: 'sawtooth', vol: 0.18, endFreq: 30 });
        this._tone(60, 0.9, { type: 'square', vol: 0.12, endFreq: 20 });
    }

    playerHit() {
        this._noise(0.28, { vol: 0.2 });
        this._tone(320, 0.28, { type: 'sawtooth', vol: 0.14, endFreq: 60 });
    }

    pickup() {
        if (this._sample('pickup', { vol: 0.6 })) return;
        this._tone(880, 0.06, { type: 'sine', vol: 0.14 });
        setTimeout(() => this._tone(1320, 0.08, { type: 'sine', vol: 0.14 }), 50);
    }

    bomb() {
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

    // startMusic() {
    //     if (this.musicPlaying || !this.ctx) return;
    //     if (this.musicBuffer) {
    //         this.musicPlaying = true;
    //         this.musicSource = this.ctx.createBufferSource();
    //         this.musicSource.buffer = this.musicBuffer;
    //         this.musicSource.loop = true;
    //         this.musicSource.connect(this.musicGain);
    //         this.musicSource.start();
    //         return;
    //     }
    //     // Fallback: synth arpeggio if sample not loaded yet
    //     this.musicPlaying = true;
    //     const notes = [220, 262, 330, 262];
    //     let step = 0;
    //     this.musicTimer = setInterval(() => {
    //         if (!this.musicPlaying || !this.enabled) return;
    //         const now = this.ctx.currentTime;
    //         const freq = notes[step % notes.length];
    //         step++;
    //         const o = this.ctx.createOscillator();
    //         const g = this.ctx.createGain();
    //         o.type = 'triangle';
    //         o.frequency.value = freq;
    //         g.gain.setValueAtTime(0.06, now);
    //         g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    //         o.connect(g);
    //         g.connect(this.musicGain);
    //         o.start(now);
    //         o.stop(now + 0.24);
    //     }, 240);
    // }

    startMusic() {
        if (this.musicPlaying || !this.ctx) return;

        // Buffer ready → play the MP3
        if (this.musicBuffer) {
            this.musicPlaying = true;
            this.musicSource = this.ctx.createBufferSource();
            this.musicSource.buffer = this.musicBuffer;
            this.musicSource.loop = true;
            this.musicSource.connect(this.musicGain);
            this.musicSource.start();
            return;
        }

        // Load failed → permanent synth fallback
        if (this._musicLoadFailed) {
            this._startSynthMusic();
            return;
        }

        // Still loading → remember, will fire when buffer arrives
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
}