// Input handling logic (keyboard/gamepad)// src/input.js
export class Input {
  constructor() {
    this.keys = {};
    this.pressed = {};   // edge-triggered this frame
    addEventListener('keydown', e => {
      if (!this.keys[e.code]) this.pressed[e.code] = true;
      this.keys[e.code] = true;
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', e => { this.keys[e.code] = false; });
  }
  
  update() { this.pressed = {}; }
  down(code) { return !!this.keys[code]; }
  justPressed(code) { return !!this.pressed[code]; }
}