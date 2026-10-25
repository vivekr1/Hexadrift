// src/collision.js
import { maybeDrop, applyPickup } from './powerups.js'
import { explosions } from './particles.js';

// Squared-distance check — faster than Math.hypot in hot loops.
function hits(a, b, ar, br) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const r = ar + br;
  return dx * dx + dy * dy < r * r;
}

export function runCollisions(game) {
    const bullets      = game.bullets.list;         // <-- Pool -> active array
  const enemyBullets = game.enemyBullets.list;    // <-- Pool -> active array
  const entities     = game.entities;
  const player       = game.player;

  // 1) Player bullets vs enemies/bosses
  for (let i = 0; i < bullets.length; i++) {
    const b = bullets[i];
    if (!b.alive) continue;

    for (let j = 0; j < entities.length; j++) {
      const e = entities[j];
      if (!e.alive) continue;
      if (e === player) continue;                // don't shoot yourself
      if (!e.hit) continue;                      // only damageables
      if (e.invuln > 0) continue;                // bosses during entrance etc.
      if (hits(b, e, b.r ?? 4, e.r ?? 12)) {
        e.hit(b.damage ?? 1);
        b.alive = false;
        explosions.bulletHit(game, b.x, b.y); 
        game.audio.enemyHit();
        if (!e.alive) onEnemyDeath(game, e);
        break;
      }
    }
  }

  // 2) Enemy bullets vs player
  if (player && player.alive && player.invuln <= 0) {
    for (let i = 0; i < enemyBullets.length; i++) {
      const b = enemyBullets[i];
      if (!b.alive) continue;
      if (hits(b, player, b.r ?? 5, player.r)) {
        b.alive = false;
        player.hit();
        explosions.playerHit(game, player.x, player.y);
        break;                                    // one hit per frame
      }
    }
  }

  // 3) Player vs enemy bodies (contact damage)
  if (player && player.alive && player.invuln <= 0) {
    for (let j = 0; j < entities.length; j++) {
      const e = entities[j];
      if (!e.alive || e === player) continue;
      if (!e.r) continue;
      if (hits(player, e, player.r, e.r * 0.8)) { // body hitbox slightly smaller
        player.hit();
        explosions.playerHit(game, player.x, player.y);
        break;
      }
    }
  }
  // 4) Player vs pickups
  if (player && player.alive) {
    for (let i = 0; i < game.pickups.length; i++) {
      const p = game.pickups[i];
      if (!p.alive) continue;
      if (hits(p, player, p.r, player.r + 6)) {   // generous pickup radius
        p.alive = false;
        applyPickup(game, p);
      }
    }
  }
}

// Central place to trigger death effects. Fill this in when we add particles.


export function onEnemyDeath(game, e) {
  if (game.triggerShake && e.y > 0 && e.y < game.H) {
    if (e.r >= 40)      game.triggerShake(0.8, 20);
    else if (e.r >= 20) game.triggerShake(0.4, 10);
    else                game.triggerShake(0.15, 4);
}
if (e.r >= 40) game.triggerHitStop?.(0.12);

  // Pick explosion size from enemy radius.
  if (e.r >= 40)      {explosions.boss(game, e.x, e.y);game.audio.boss();}
  else if (e.r >= 20) {explosions.midboss(game, e.x, e.y);game.audio.midboss();}
  else                {explosions.scout(game, e.x, e.y);game.audio.scout();}

  // No drops from bomb kills.
  if (e.killedByBomb) return;

  let rank = 'common';
  if (e.r >= 40)      rank = 'boss';
  else if (e.r >= 20) rank = 'uncommon';
  maybeDrop(game, e.x, e.y, rank);



  if (game.player) game.player.score += 50;
}