// src/assets.js — image loader with headless guard
// Sprite paths match the audio convention: root-relative /assets/sprites/...
// Served from public/assets/sprites/ → dist/assets/sprites/ at build time.

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
  // Headless guard: Node test harness has no Image → resolve immediately,
  // sprite() returns null, every draw() falls back to procedural geometry.
  if (typeof Image === 'undefined') { assets.ready = true; return Promise.resolve(); }
  return Promise.all(Object.entries(IMAGES).map(([key, url]) => new Promise((res) => {
    const img = new Image();
    // Prepend Vite base URL so sprites load correctly on GitHub Pages
    // (e.g. /Hexadrift/assets/sprites/player.png instead of /assets/sprites/player.png)
    const src = (import.meta.env.BASE_URL || '') + url;
    img.onload  = () => { 
        // Strip the white background from boss sprites
        if (key.startsWith('boss')) {
            cache.set(key, removeWhiteBackground(img)); 
        } else {
            cache.set(key, img); 
        }
        res(); 
    };
    img.onerror = () => { console.warn('sprite missing:', key, 'tried', src); res(); }; // fallback path
    img.src = src;
  }))).then(() => { assets.ready = true; });
}


function removeWhiteBackground(img) {
    if (typeof document === 'undefined') return img;
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    
    const imageData = x.getImageData(0, 0, c.width, c.height);
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
        // If the pixel is almost pure white (RGB > 240), make it transparent
        if (d[i] > 240 && d[i+1] > 240 && d[i+2] > 240) {
            d[i+3] = 0; 
        }
    }
    x.putImageData(imageData, 0, 0);
    
    const out = new Image();
    out.src = c.toDataURL();
    return out;
}

export function sprite(key) { return cache.get(key) ?? null; }