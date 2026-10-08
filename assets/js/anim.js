// Animation scope. Scenes always render the FINAL state of a step into the
// DOM first, then attach "from" animations with fill: 'backwards'. Finishing
// every running animation therefore lands exactly on the rendered state, which
// makes stepping backwards, jumping, and fast clicking safe.

const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');

export const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';
export const EASE_IN_OUT = 'cubic-bezier(0.65, 0, 0.35, 1)';

export class Anim {
  constructor() {
    this.live = new Set();
    this.tickers = new Set();
    this.speed = 1;
  }

  get reduced() {
    return reducedQuery.matches;
  }

  run(el, keyframes, { delay = 0, duration = 520, easing = EASE_OUT } = {}) {
    if (!el || !el.animate) return null;
    let a;
    if (this.reduced) {
      a = el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: 'linear', fill: 'backwards' });
    } else {
      a = el.animate(keyframes, {
        delay: delay * this.speed,
        duration: duration * this.speed,
        easing,
        fill: 'backwards',
      });
    }
    this.live.add(a);
    a.finished.then(() => this.live.delete(a)).catch(() => this.live.delete(a));
    return a;
  }

  finishAll() {
    for (const a of this.live) {
      try {
        a.finish();
      } catch {
        a.cancel();
      }
    }
    this.live.clear();
    for (const t of this.tickers) t(1);
    this.tickers.clear();
  }

  // Elements appearing on the board.
  appear(el, { delay = 0, from = 'rise', duration = 520 } = {}) {
    const frames = {
      rise: [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
      drop: [{ opacity: 0, transform: 'translateY(-14px)' }, { opacity: 1, transform: 'none' }],
      scale: [{ opacity: 0, transform: 'scale(0.6)' }, { opacity: 1, transform: 'none' }],
      left: [{ opacity: 0, transform: 'translateX(-16px)' }, { opacity: 1, transform: 'none' }],
      fade: [{ opacity: 0 }, { opacity: 1 }],
      // Chalk writing: reveal left to right.
      write: [
        { opacity: 1, clipPath: 'inset(0 100% 0 0)' },
        { opacity: 1, clipPath: 'inset(0 0 0 0)' },
      ],
    }[from];
    return this.run(el, frames, { delay, duration, easing: from === 'write' ? EASE_IN_OUT : EASE_OUT });
  }

  // FLIP: animate `el` from where `source` sits on screen to its own place.
  fly(el, source, { delay = 0, duration = 700 } = {}) {
    if (!el || !source) return null;
    const a = source.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    if (!b.width || !a.width) return this.appear(el, { delay });
    const dx = a.left + a.width / 2 - (b.left + b.width / 2);
    const dy = a.top + a.height / 2 - (b.top + b.height / 2);
    const s = Math.max(0.4, Math.min(2.5, a.height / b.height || 1));
    return this.run(
      el,
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${s})`, opacity: 0.2 },
        { opacity: 1, offset: 0.25 },
        { transform: 'none', opacity: 1 },
      ],
      { delay, duration, easing: EASE_IN_OUT },
    );
  }

  // SVG stroke drawn like chalk.
  draw(path, { delay = 0, duration = 700 } = {}) {
    if (!path || !path.getTotalLength) return null;
    const len = path.getTotalLength();
    if (!len) return null;
    path.style.strokeDasharray = `${len}`;
    return this.run(path, [{ strokeDashoffset: len }, { strokeDashoffset: 0 }], {
      delay,
      duration,
      easing: EASE_IN_OUT,
    });
  }

  pulse(el, { delay = 0 } = {}) {
    return this.run(
      el,
      [{ transform: 'scale(1)' }, { transform: 'scale(1.18)', offset: 0.35 }, { transform: 'scale(1)' }],
      { delay, duration: 620, easing: EASE_IN_OUT },
    );
  }

  strike(el, { delay = 0 } = {}) {
    return this.run(el, [{ opacity: 1 }, { opacity: 1, offset: 0.5 }, { opacity: 0.28 }], {
      delay,
      duration: 500,
    });
  }

  // Count a number up/down. fn receives progress 0..1; finishAll() calls fn(1).
  tween(fn, { delay = 0, duration = 700 } = {}) {
    if (this.reduced) {
      fn(1);
      return;
    }
    const start = performance.now() + delay * this.speed;
    const total = duration * this.speed;
    fn(0);
    const tick = (now) => {
      if (!this.tickers.has(fn)) return;
      const t = Math.min(1, Math.max(0, (now - start) / total));
      fn(1 - (1 - t) ** 3);
      if (t < 1) requestAnimationFrame(tick);
      else this.tickers.delete(fn);
    };
    this.tickers.add(fn);
    requestAnimationFrame(tick);
  }
}
