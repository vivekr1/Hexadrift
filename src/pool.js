// src/pool.js
export class Pool {
  constructor(factory, initialSize = 0) {
    this.factory = factory;
    this.free = [];
    this.active = [];
    for (let i = 0; i < initialSize; i++) this.free.push(factory());
  }

  spawn() {
    const obj = this.free.pop() ?? this.factory();
    obj.alive = true;
    this.active.push(obj);
    return obj;
  }

  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const o = this.active[i];
      o.update(dt);
      if (!o.alive) {
        this.active.splice(i, 1);
        this.free.push(o);
      }
    }
  }

  cull(predicate) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const o = this.active[i];
      if (!predicate(o)) {
        this.active.splice(i, 1);
        o.alive = false;
        this.free.push(o);
      }
    }
  }

  draw(ctx) {
    for (const o of this.active) o.draw(ctx);
  }

  get list() { return this.active; }
  get size() { return this.active.length; }
  get freeCount() { return this.free.length; }
}