## v0.3-clock — 2026-10-25

**Landed:** clock.js (mulberry32 + virtual timers), 4 integrations,
determinism.mjs, main.js ?test=1 gate.

**Verified:** determinism byte-identical × 2 runs, boot.mjs unchanged,
boundary files untouched, seed reset contract present in code.

**Coverage gap (intentional, TODO before bot session):**
- determinism.mjs does 600 passive steps → 0 calls to clock.random()
  (no explosions, no divers spawn, no drops, no player death).
- Test proves the harness works, not that seeded-RNG paths are exercised.
- Break test (clock.random → Math.random in divers) would still exit 0
  today because divers never spawn.
- Fix in follow-up: scripted input + clock.advance() calls in test.

**Small bugs noted, deferred:**
- clock.disableVirtual() does not reset _seeded or clear _timers.
  Fine today (test exits), a real bug for in-process test-then-play flows.