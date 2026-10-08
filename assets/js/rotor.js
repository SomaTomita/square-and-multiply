import { svg, fmt } from './ui.js';

// Residues mod n engraved on a rotor rim. The rim turns so the current value
// sits under the brass index pin, and the window above the pin shows it.

const BAND_R = 104;
const PEG_R = 79;
const TICK_IN = 88;
const TICK_OUT = 92;

function engravingStep(n) {
  if (n <= 60) return 1;
  return Math.ceil(n / 40);
}

function engravingSize(n) {
  if (n <= 8) return 16;
  if (n <= 16) return 12.5;
  if (n <= 30) return 10;
  if (n <= 45) return 8.5;
  return 7.5;
}

export function makeRotor(n, { hub = null, className = '' } = {}) {
  let N = Number(n);
  let root = svg('svg', { viewBox: '-124 -158 248 286', class: `rotor ${className}`, role: 'img' });
  root.setAttribute('aria-label', `Rotor with residues modulo ${N}`);

  let turn = svg('g', { class: 'turn' });
  let pegs = svg('g', { class: 'pegs' });
  let jumps = svg('g', { class: 'jumps' });
  let numerals = new Map();

  function theta(v) {
    return (360 * (((Number(v) % N) + N) % N)) / N;
  }

  function at(v, r) {
    let a = (theta(v) * Math.PI) / 180;
    return { x: r * Math.sin(a), y: -r * Math.cos(a) };
  }

  root.append(svg('circle', { r: BAND_R - 11, class: 'face' }));
  turn.append(svg('circle', { r: BAND_R, class: 'rim-band' }));
  turn.append(svg('circle', { r: BAND_R + 13, class: 'rim-edge' }));
  turn.append(svg('circle', { r: BAND_R - 13, class: 'rim-edge' }));

  if (N <= 120) {
    let ticks = svg('g');
    for (let i = 0; i < N; i++) {
      let a = at(i, TICK_IN);
      let b = at(i, TICK_OUT);
      ticks.append(svg('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: 'tick' }));
    }
    turn.append(ticks);
  }

  let step = engravingStep(N);
  let size = engravingSize(N);
  let engraved = svg('g');
  for (let i = 0; i < N; i += step) {
    // Leave room before the wrap back to 0.
    if (i > 0 && N - i < step * 0.75) continue;
    let p = at(i, BAND_R);
    let t = svg('text', { class: 'engraved', x: p.x, y: p.y, style: `font-size:${size}px` }, String(i));
    numerals.set(i, { el: t, x: p.x, y: p.y, deg: theta(i) });
    engraved.append(t);
  }
  turn.append(engraved, jumps, pegs);
  root.append(turn);

  root.append(svg('circle', { r: 24, class: 'hub' }));
  let hubText = svg('text', { class: 'hub-text', x: 0, y: 0 }, hub ?? `mod ${fmt(N)}`);
  root.append(hubText);

  // Fixed parts: the pin and the reading window above it.
  root.append(svg('path', { class: 'pin', d: `M -7 -${BAND_R + 22} L 7 -${BAND_R + 22} L 0 -${BAND_R + 9} Z` }));
  root.append(svg('rect', { class: 'window', x: -38, y: -155, width: 76, height: 28, rx: 4 }));
  let windowText = svg('text', { class: 'window-text', x: 0, y: -141 }, '');
  root.append(windowText);

  let current = 0;

  // Engraved numerals face outward, flipped on the lower half so they always read upright
  // once the rim has come to rest.
  function orient(rest) {
    for (let t of numerals.values()) {
      let screen = (((t.deg - rest) % 360) + 360) % 360;
      let flip = screen > 90 && screen < 270 ? 180 : 0;
      t.el.setAttribute('transform', `rotate(${t.deg + flip} ${t.x} ${t.y})`);
    }
  }
  orient(0);

  return {
    el: root,
    n: N,
    at,

    clear() {
      pegs.replaceChildren();
      jumps.replaceChildren();
      for (let t of numerals.values()) t.el.classList.remove('is-mark');
    },

    setHub(text) {
      hubText.textContent = text;
    },

    // Turn so v sits under the pin. Always turns forward, like a rotor.
    turnTo(v, { from = null, anim = null, delay = 0, duration = 900, laps = 0 } = {}) {
      let target = theta(v);
      turn.style.transform = `rotate(${-target}deg)`;
      orient(target);
      windowText.textContent = fmt(((BigInt(v) % BigInt(N)) + BigInt(N)) % BigInt(N));
      current = Number(v);
      if (!anim || from == null) return;
      let delta = ((((Number(v) - Number(from)) % N) + N) % N) + laps * N;
      if (!delta) return;
      let deg = (360 * delta) / N;
      anim.run(turn, [{ transform: `rotate(${-target + deg}deg)` }, { transform: `rotate(${-target}deg)` }], {
        delay,
        duration,
      });
      let start = ((Number(from) % N) + N) % N;
      anim.tween(
        (p) => {
          windowText.textContent = fmt((start + Math.round(p * delta)) % N);
        },
        { delay, duration },
      );
    },

    get value() {
      return current;
    },

    peg(v, cls = '') {
      let p = at(v, PEG_R);
      let g = svg('g', { class: `peg ${cls}`, transform: `translate(${p.x} ${p.y})` });
      let inner = svg('g', { class: 'peg-inner' });
      inner.append(svg('circle', { r: 5.5 }));
      g.append(inner);
      pegs.append(g);
      let key = ((Number(v) % N) + N) % N;
      if (numerals.has(key) && cls.includes('is-now')) numerals.get(key).el.classList.add('is-mark');
      return inner;
    },

    target(v, cls = '') {
      let p = at(v, PEG_R);
      let c = svg('circle', { cx: p.x, cy: p.y, r: 10, class: `target ${cls}` });
      pegs.prepend(c);
      return c;
    },

    // A curved jump from a to b, bowing toward the hub.
    jump(a, b, cls = '') {
      let p = at(a, PEG_R);
      let q = at(b, PEG_R);
      let d;
      if (((Number(a) - Number(b)) % N) === 0) {
        let k = 0.45;
        d = `M ${p.x} ${p.y} C ${p.x * k - p.y * 0.35} ${p.y * k + p.x * 0.35} ${p.x * k + p.y * 0.35} ${p.y * k - p.x * 0.35} ${p.x} ${p.y}`;
      } else {
        let k = 0.3;
        d = `M ${p.x} ${p.y} Q ${(p.x + q.x) * k} ${(p.y + q.y) * k} ${q.x} ${q.y}`;
      }
      let path = svg('path', { d, class: `jump ${cls}` });
      jumps.append(path);
      return path;
    },
  };
}
