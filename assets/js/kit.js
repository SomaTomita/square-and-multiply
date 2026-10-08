// Building blocks shared by scenes: formula assembly, presets, ledgers, rolling numbers.

import { h, T, fmt, scrub } from './ui.js';
import { L, render } from './i18n.js';

// Fill ctx.formula with a mix of trusted HTML strings, nodes, and scrubs.
export function setFormula(target, ...parts) {
  let nodes = parts.flat().map((p) => {
    if (p == null) return null;
    if (p instanceof Node) return p;
    if (p.el instanceof Node) return p.el;
    return h('span', { html: p });
  });
  target.replaceChildren(...nodes.filter(Boolean));
}

export function op(text) {
  return h('span', { class: 'op', html: text });
}

// A scrub bound to a params object; changing it triggers ctx.refresh().
export function param(ctx, params, key, opts) {
  return scrub({
    value: params[key],
    label: opts.label ?? key,
    ...opts,
    onInput: (x) => {
      params[key] = x;
      opts.after?.(x);
      ctx.refresh();
    },
  });
}

// Typed tape labels that load a set of values.
export function presets(list, apply) {
  return h(
    'div',
    { class: 'presets', role: 'group', 'aria-label': render(L('chrome.examples')) },
    list.map((p) =>
      h('button', { type: 'button', class: 'chip', onclick: () => apply(p.values) }, T(p.label)),
    ),
  );
}

// Working table. head: HTML strings or nodes (use T(L(...)) for words).
// rows: [{ cells: [...], cls }] — cells are strings, numbers, or nodes.
export function ledger(head, rows) {
  return h(
    'table',
    { class: 'ledger' },
    h('thead', {}, h('tr', {}, head.map((c) => (c instanceof Node ? h('th', { scope: 'col' }, c) : h('th', { scope: 'col', html: c }))))),
    h(
      'tbody',
      {},
      rows.map((r) =>
        h(
          'tr',
          { class: r.cls ?? '' },
          r.cells.map((c, i) => {
            let cls = r.cellCls?.[i] ?? '';
            if (c instanceof Node) return h('td', { class: cls }, c);
            return h('td', { class: cls, html: typeof c === 'bigint' ? fmt(c) : String(c ?? '') });
          }),
        ),
      ),
    ),
  );
}

// A worked line of math, e.g. line('x', '=', 5).
export function line(html, cls = '') {
  return h('p', { class: `line ${cls}`, html });
}

// Digits that roll from one value to another.
export function rollTo(el, from, to, anim, { delay = 0, duration = 700 } = {}) {
  el.textContent = fmt(to);
  if (from == null || from === to) return;
  let a = Number(from);
  let b = Number(to);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return;
  anim.tween(
    (p) => {
      el.textContent = fmt(Math.round(a + (b - a) * p));
    },
    { delay, duration },
  );
}

// Stagger helper that keeps long sequences inside a time budget.
export function stagger(i, count, budget = 900, max = 90) {
  if (count <= 1) return 0;
  return Math.min(max, budget / count) * i;
}

export function work(...children) {
  return h('div', { class: 'work' }, ...children);
}

export function figure(...children) {
  return h('div', { class: 'figure' }, ...children);
}
