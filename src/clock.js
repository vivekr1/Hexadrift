// src/clock.js — virtual clock + seedable PRNG (mulberry32)
// seed(n) resets PRNG state fully; same n → same sequence, even after prior random() calls.

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
  // _seeded is intentionally NOT reset — seed() owns that contract
}

export function seed(n) {
    // resets state; not idempotent-guarded — intentional
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