// src/levels/level1.js
export const level1 = {
  stage: 1,
  name: 'Orbital Belt',
  backdrop: 'asteroids',
  introDuration: 3.0,       // seconds of stage-name banner
  warningDuration: 2.5,     // seconds of WARNING before boss
  clearDuration: 5.0,       // seconds of STAGE CLEAR before restart
  waves: [
    { t: 1,  spawn: 'scoutLine', count: 5 },
    { t: 6,  spawn: 'scoutSine', count: 5 },
    { t: 12, spawn: 'scoutLine', count: 6 },
    { t: 20, spawn: 'turretSides' },
    { t: 30, spawn: 'midboss1' },
    { t: 45, spawn: 'diver', count: 8 },
    { t: 52, spawn: 'scoutSine', count: 8 },
  ],
  bossAt: 60,
  boss: 'boss1',
};