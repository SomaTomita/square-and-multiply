// DOM helpers shared by every mode.

import { sanitizeHTML } from './sanitize.js';

// h('div', { class: 'x', onclick }, child, 'text', ...)
// String children become text nodes, so user input is never parsed as HTML.
export function h(tag, props = {}, ...children) {
  const el = tag.startsWith('svg:')
    ? document.createElementNS('http://www.w3.org/2000/svg', tag.slice(4))
    : document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'string') el.style.cssText = v;
    else if (k === 'style' && typeof v === 'object') {
      for (let [prop, val] of Object.entries(v)) {
        if (prop.startsWith('--')) el.style.setProperty(prop, val);
        else el.style[prop] = val;
      }
    }
    else if (k === 'html') el.innerHTML = sanitizeHTML(v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  append(el, children);
  return el;
}

export const svg = (tag, props, ...children) => h(`svg:${tag}`, props, ...children);

function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

// Text in the current language; see i18n.js.
export { T, L } from './i18n.js';

// Small formula builder: f`a${sup('e')} mod n`. Returns trusted HTML strings.
export const v = (name) => `<var>${name}</var>`;
export const sup = (x) => `<sup>${x}</sup>`;
export const sub = (x) => `<sub>${x}</sub>`;
export const num = (x) => `<span class="n">${String(x)}</span>`;

// Thin-space digit grouping and a true minus sign keep numbers legible on the board.
export function fmt(x) {
  let s = String(x);
  let neg = s.startsWith('-');
  let digits = neg ? s.slice(1) : s;
  if (digits.length > 4) digits = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '\u2009');
  return neg ? `\u2212${digits}` : digits;
}

// ------------------------------------------------------------------ scrub

// A number written in a formula that you change by dragging sideways,
// arrow keys up/down, or by typing after a double-click.
export function scrub({
  value,
  min = 0,
  max = 999,
  step = 1,
  accept = () => true,
  label = 'value',
  tone = '',
  onInput,
}) {
  let cur = value;
  const el = h('span', {
    class: `scrub ${tone}`,
    tabindex: '0',
    role: 'spinbutton',
    'aria-label': label,
    'aria-valuemin': min,
    'aria-valuemax': max,
    title: 'Drag sideways, or double-click to type',
  });
  const show = () => {
    el.textContent = fmt(cur);
    el.setAttribute('aria-valuenow', cur);
  };
  // Move in a direction until `accept` agrees (e.g. next prime).
  const nudge = (from, dir, size) => {
    let x = from + dir * size;
    for (let i = 0; i < 5000 && x >= min && x <= max; i++, x += dir) {
      if (accept(x)) return x;
    }
    return from;
  };
  const set = (x) => {
    x = Math.max(min, Math.min(max, x));
    if (x === cur || !accept(x)) return false;
    cur = x;
    show();
    onInput?.(cur);
    return true;
  };

  let drag = null;
  el.addEventListener('pointerdown', (e) => {
    if (el.isContentEditable) return;
    drag = { x: e.clientX, base: cur, moved: false, touch: e.pointerType !== 'mouse' };
    el.setPointerCapture(e.pointerId);
    el.classList.add('is-dragging');
  });
  el.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (Math.abs(dx) < 3 && !drag.moved) return;
    drag.moved = true;
    // Accelerate for wide ranges so large moduli stay reachable.
    const span = (max - min) / step;
    const rate = span > 2000 ? 0.02 * Math.abs(dx) + 1 : span > 200 ? 0.01 * Math.abs(dx) + 0.6 : 0.2;
    const steps = Math.trunc(dx * rate / 4);
    const target = drag.base + steps * step;
    if (target === cur) return;
    const dir = Math.sign(target - cur);
    let x = Math.max(min, Math.min(max, target));
    if (!accept(x)) x = nudge(x, dir, 0);
    set(x);
  });
  const end = () => {
    if (!drag) return;
    el.classList.remove('is-dragging');
    drag = null;
  };
  // On touch screens a tap (no drag) opens the number for typing.
  el.addEventListener('pointerup', (e) => {
    let tapped = drag && drag.touch && !drag.moved;
    end();
    if (tapped) {
      e.preventDefault();
      startTyping();
    }
  });
  el.addEventListener('pointercancel', end);

  el.addEventListener('keydown', (e) => {
    if (el.isContentEditable) {
      if (e.key === 'Enter') {
        e.preventDefault();
        el.blur();
      } else if (e.key === 'Escape') {
        el.textContent = String(cur);
        el.blur();
      }
      e.stopPropagation();
      return;
    }
    const size = e.shiftKey ? 10 * step : step;
    if (e.key === 'ArrowUp') set(nudge(cur, 1, size));
    else if (e.key === 'ArrowDown') set(nudge(cur, -1, size));
    else if (e.key === 'Enter') startTyping();
    else return;
    e.preventDefault();
    e.stopPropagation();
  });

  const startTyping = () => {
    el.contentEditable = 'plaintext-only';
    el.inputMode = 'numeric';
    el.textContent = String(cur);
    el.classList.add('is-typing');
    el.focus();
    getSelection().selectAllChildren(el);
  };
  el.addEventListener('dblclick', startTyping);
  el.addEventListener('blur', () => {
    if (!el.isContentEditable) return;
    el.contentEditable = 'false';
    el.classList.remove('is-typing');
    const raw = el.textContent.replace(/[\s, ]/g, '');
    const x = /^\d+$/.test(raw) ? Number(raw) : NaN;
    if (!Number.isSafeInteger(x) || x < min || x > max || !accept(x)) {
      show();
      el.classList.add('is-rejected');
      setTimeout(() => el.classList.remove('is-rejected'), 600);
      return;
    }
    if (!set(x)) show();
  });

  show();
  return {
    el,
    get value() {
      return cur;
    },
    set value(x) {
      cur = x;
      show();
    },
  };
}

// Deterministic PRNG so a scene re-renders the same "random" draws at every step.
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

export const bytesToHex = (bytes, max = Infinity) => {
  const arr = [...new Uint8Array(bytes)];
  const hex = arr.slice(0, max).map((b) => b.toString(16).padStart(2, '0')).join('');
  return arr.length > max ? `${hex}…` : hex;
};
