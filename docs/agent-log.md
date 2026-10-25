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

  ## v0.4-reviewer — 2026-10-25

**Landed:** ai/reviewerLocal.mjs (llama.cpp code reviewer),
ai/reviewer.cline.md (Cline prompt), ai/README.md.

**Empty-diff fix:** reviewer now exits early with "No committed changes
to review" instead of printing "no bugs found" on empty diffs.

**Acceptance testing (2 cases against feat/reviewer branch):**

Case 1 — AMBIGUOUS: collision.js `<=` → `<` (tangent objects pass through)
- llama.cpp: flagged as logic error — high recall, sees pattern change
- Cline: "no bugs found" — reasoned floats never hit exact tangency
- Both defensible. Neither wrong. Case was a philosophical edge, not
  a defect. My test choice — not the reviewers'.

Case 2 — UNAMBIGUOUS: collision.js `<=` → `>=` (inverted collision)
- llama.cpp: CAUGHT. Named semantic inversion + traced four affected
  collision passes. Correct.
- Cline: CAUGHT. Same analysis PLUS noticed "Triggering shake" spam
  in test output as corroborating evidence. More thorough.

**Reviewer reliability:**
- llama.cpp: 2/2 (flags ambiguous patterns, flags clear bugs)
- Cline: 1/2 (misses philosophical edges, catches clear bugs, uses
  test output as signal)

**What the pair is for:**
- llama.cpp: pre-merge gate, err on the side of flagging. High recall.
- Cline: second opinion, high precision + better evidence use.
- Disagreements indicate genuine ambiguity → manual review decides.
- Agreement indicates strong signal (positive or negative).

**Confirmed coverage gap:**
boot.mjs and determinism.mjs both passed the inverted-comparator bug.
Test outputs are compatible with the bug (collisions fire constantly,
"Triggering shake" spam, but tests exit 0). This is exactly the class
of bug reviewers catch and tests miss. Both are needed.