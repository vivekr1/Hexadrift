# Hexadrift

A 4-stage vertical-scrolling shoot 'em up (shmup) built with vanilla JavaScript, HTML5 Canvas2D, and WebAudio. Pilot your ship through four distinct stages, each with unique waves, a multi-phase boss, and escalating challenge. Built with Vite.

## Features

- 4 stages with distinct themes, palettes, and music
- 3-tier weapon upgrade system
- Screen-clearing bombs (limited ammo)
- Power-up drops (weapon / bomb)
- 4 unique multi-phase bosses
- Local high-score table (top 5, localStorage)
- Title screen, pause, game-over, name entry, victory
- Screen shake, hit-stop, parallax starfields, stage fade transitions
- Keyboard controls (WASD/Arrows, Space/Z, X, P/Esc, M)

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server (localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```

## Controls

| Key | Action |
|-----|--------|
| WASD / Arrow keys | Move ship |
| Space / Z | Fire weapon |
| X | Bomb (screen clear) |
| P / Esc | Pause |
| M | Mute audio |

## Tech Stack

- Vanilla JavaScript (ES modules)
- HTML5 Canvas 2D rendering
- WebAudio API
- Vite (dev server + production build)

## Project Structure

```
Hexadrift/
├── index.html        # Entry point (canvas + script)
├── style.css         # Basic styling
├── vite.config.js    # Vite build config
├── package.json      # Scripts & devDependencies
├── public/           # Static assets (sprites, audio) → copied to dist/
├── src/              # Game source (main, game, player, enemies, bosses, etc.)
├── levels/           # Data-driven wave definitions per stage
├── docs/             # Architecture, design, and requirements
└── test/             # Test harness
```

## License

MIT