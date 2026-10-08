import { sanitizeHTML } from '../sanitize.js';
import * as nt from '../nt.js';
import * as dh from '../dh-lib.js';
import { h, svg, v, sup, sub, fmt } from '../ui.js';
import { T, L, render } from '../i18n.js';
import { makeRotor } from '../rotor.js';
import { setFormula, op, param, ledger, stagger, work, figure } from '../kit.js';

const B = (x) => BigInt(x);
const MAX_P = 99991;

function xa() {
  return `${v('x')}${sub('A')}`;
}

function xb() {
  return `${v('x')}${sub('B')}`;
}

function xe() {
  return `${v('x')}${sub('E')}`;
}

function y(who) {
  return `${v('y')}${sub(who)}`;
}

// Residues next to p are easier to read as negatives (p − 1 is −1).
function sym(x, p) {
  return x === p - 1n ? '−1' : fmt(x);
}

function lockIcon() {
  let s = svg('svg', { class: 'lock', viewBox: '0 0 12 14', 'aria-hidden': 'true' });
  s.append(svg('rect', { x: 1.5, y: 6, width: 9, height: 7, rx: 1.5 }), svg('path', { d: 'M3.5 6V4.2a2.5 2.5 0 0 1 5 0V6' }));
  return s;
}

function generatorNote(g, p) {
  let ord = nt.order(g, p);
  if (ord === p - 1n) {
    return h('p', { class: 'line dim-line wrap' }, T(L('dh.gen.full', { g: fmt(g), n: fmt(p - 1n) })));
  }
  return h('p', { class: 'line wrap warn' }, T(L('dh.gen.partial', { g: fmt(g), ord: fmt(ord), n: fmt(p - 1n) })));
}

// Preset buttons; `label` is a message or a plain string.
function presetChips(list, onPick, labelKey = 'chrome.examples') {
  return h(
    'div',
    { class: 'presets', role: 'group', 'aria-label': render(L(labelKey)) },
    list.map((c) => h('button', { type: 'button', class: 'chip', onclick: () => onPick(c.values) }, typeof c.label === 'string' ? c.label : T(c.label))),
  );
}

// Prime modulus scrub; `after` clamps dependent values when p moves.
function primeParam(ctx, params, after) {
  return param(ctx, params, 'p', {
    min: 5,
    max: MAX_P,
    label: 'prime p',
    accept: (x) => nt.isPrime(B(x)),
    after,
  });
}

function exponentParam(ctx, params, key, tone, label) {
  return param(ctx, params, key, { min: 1, max: MAX_P - 2, label, tone, accept: (x) => x <= params.p - 2 });
}

// ---------------------------------------------------------------- sequence lanes

// parties: [{ id, name, tone }]
// items: [{ step, row, kind: 'note' | 'msg' | 'band', at | from/to, html | node, tone, cutAt }]
function lanesView(parties, items, k) {
  let col = new Map(parties.map((p, i) => [p.id, 2 * i + 1]));
  let weights = [];
  parties.forEach((_, i) => {
    if (i) weights.push(1.35);
    weights.push(1);
  });
  let grid = h('div', {
    class: 'lanes',
    style: { gridTemplateColumns: weights.map((w) => `minmax(0, ${w}fr)`).join(' ') },
  });
  let maxRow = Math.max(1, ...items.map((i) => i.row));
  for (let p of parties) {
    let c = String(col.get(p.id));
    grid.append(
      h('div', { class: `lane-line ${p.tone}`, style: { gridColumn: c, gridRow: `2 / ${maxRow + 2}` }, 'aria-hidden': 'true' }),
      h('div', { class: `lane-head ${p.tone}`, style: { gridColumn: c, gridRow: '1' } }, p.name),
    );
  }
  let nowEls = [];
  for (let it of items) {
    let state = it.step < k ? 'is-past' : it.step === k ? 'is-now' : 'is-ahead';
    let cut = it.cutAt != null && k >= it.cutAt ? ' is-cut' : '';
    let body = it.node ?? h('span', { html: it.html });
    let el;
    if (it.kind === 'msg') {
      let c1 = col.get(it.from);
      let c2 = col.get(it.to);
      let left = Math.min(c1, c2);
      let right = Math.max(c1, c2);
      let span = weights.slice(left - 1, right).reduce((a, b) => a + b, 0);
      let inset = `${(50 / span).toFixed(3)}%`;
      el = h(
        'div',
        {
          class: `msg ${c2 > c1 ? 'to-right' : 'to-left'} ${it.tone ?? ''} ${state}${cut}`,
          style: { gridColumn: `${left} / ${right + 1}`, gridRow: String(it.row + 1), '--inset': inset },
        },
        h('span', { class: 'msg-label' }, body),
        h('span', { class: 'msg-line', 'aria-hidden': 'true' }),
      );
    } else if (it.kind === 'band') {
      el = h('div', { class: `band ${it.tone ?? ''} ${state}${cut}`, style: { gridColumn: '1 / -1', gridRow: String(it.row + 1) } }, body);
    } else {
      el = h(
        'div',
        { class: `note ${it.tone ?? ''} ${state}${cut}`, style: { gridColumn: String(col.get(it.at)), gridRow: String(it.row + 1) } },
        body,
      );
    }
    if (state === 'is-now') nowEls.push(el);
    grid.append(el);
  }
  return { el: grid, nowEls };
}

function animateLanes(A, nowEls, base = 150) {
  nowEls.forEach((el, i) => {
    let delay = base + i * 260;
    if (el.classList.contains('msg')) {
      let lineEl = el.querySelector('.msg-line');
      let from = el.classList.contains('to-right') ? 'inset(0 100% 0 0)' : 'inset(0 0 0 100%)';
      A.run(lineEl, [{ clipPath: from }, { clipPath: 'inset(0 0 0 0)' }], { delay, duration: 620 });
      A.appear(el.querySelector('.msg-label'), { from: 'fade', delay: delay + 200, duration: 420 });
    } else {
      A.appear(el, { from: el.classList.contains('band') ? 'fade' : 'rise', delay });
    }
  });
}

function secretNote(label, value, extra = null) {
  return h(
    'span',
    { class: 'secret-note' },
    h('span', { class: 'kv' }, lockIcon(), h('span', { html: `${label} = ${value}` })),
    extra ? h('span', { class: 'kv' }, h('span', { html: extra })) : null,
  );
}

const ALICE = { id: 'a', name: 'Alice', tone: 'alice' };
const BOB = { id: 'b', name: 'Bob', tone: 'bob' };
const EVE = { id: 'e', name: 'Eve', tone: 'eve' };

// ================================================================ key agreement

function agreementScene(ctx) {
  let p = { p: 23, g: 5, xa: 6, xb: 15 };
  let r = null;
  let answer = h('span', { class: 'answer' }, '?');
  let sg = param(ctx, p, 'g', { min: 2, max: MAX_P - 2, label: 'generator alpha', accept: (x) => x <= p.p - 2 });
  let sxa = exponentParam(ctx, p, 'xa', 'alice', 'Alice secret x_A');
  let sxb = exponentParam(ctx, p, 'xb', 'bob', 'Bob secret x_B');
  let sp = primeParam(ctx, p, () => {
    if (p.g > p.p - 2) p.g = Number(nt.smallestGenerator(B(p.p)));
    p.xa = Math.min(p.xa, p.p - 2);
    p.xb = Math.min(p.xb, p.p - 2);
    sg.value = p.g;
    sxa.value = p.xa;
    sxb.value = p.xb;
  });
  setFormula(ctx.formula, h('span', {}, sg.el, h('sup', {}, sxa.el, h('span', { class: 'op' }, '·'), sxb.el)), op('mod'), sp, op('='), answer);

  function load(vals) {
    Object.assign(p, vals);
    sp.value = p.p;
    sg.value = p.g;
    sxa.value = p.xa;
    sxb.value = p.xb;
    ctx.refresh();
  }

  let chips = presetChips(
    [
      { label: 'p = 23, α = 5', values: { p: 23, g: 5, xa: 6, xb: 15 } },
      { label: 'p = 467, α = 2', values: { p: 467, g: 2, xa: 153, xb: 197 } },
      { label: L('dh.agree.safePrime', { p: 2039 }), values: { p: 2039, g: 7, xa: 1200, xb: 377 } },
    ],
    load,
  );

  function focus(k) {
    return [B(p.g), r.ya, r.yb, r.yb, r.kA, r.kA, r.kA][k];
  }

  return {
    steps() {
      let P = B(p.p);
      r = dh.dhRun(P, B(p.g), B(p.xa), B(p.xb));
      return [
        L('dh.agree.s0', { p: fmt(P), g: p.g }),
        L('dh.agree.s1', { x: p.xa, y: fmt(r.ya) }),
        L('dh.agree.s2', { x: p.xb, y: fmt(r.yb) }),
        L('dh.agree.s3'),
        L('dh.agree.s4', { yb: fmt(r.yb), xa: p.xa, p: fmt(P), k: fmt(r.kA) }),
        L('dh.agree.s5', { k: fmt(r.kB) }),
        L('dh.agree.s6'),
      ];
    },

    show(k, prev) {
      let animate = k === prev + 1;
      let A = ctx.anim;
      let P = B(p.p);
      answer.textContent = k >= 4 ? fmt(r.kA) : '?';

      let items = [
        { step: 0, row: 1, kind: 'band', html: `p = ${fmt(P)}, α = ${p.g}` },
        { step: 1, row: 2, kind: 'note', at: 'a', tone: 'alice', node: secretNote(xa(), p.xa, `${y('A')} = ${fmt(r.ya)}`) },
        { step: 2, row: 2, kind: 'note', at: 'b', tone: 'bob', node: secretNote(xb(), p.xb, `${y('B')} = ${fmt(r.yb)}`) },
        { step: 3, row: 3, kind: 'msg', from: 'a', to: 'b', tone: 'alice', html: `${y('A')} = ${fmt(r.ya)}` },
        { step: 3, row: 4, kind: 'msg', from: 'b', to: 'a', tone: 'bob', html: `${y('B')} = ${fmt(r.yb)}` },
        { step: 4, row: 5, kind: 'note', at: 'a', tone: 'alice', html: `${v('k')} = ${y('B')}${sup(xa())} = ${fmt(r.kA)}` },
        { step: 5, row: 5, kind: 'note', at: 'b', tone: 'bob', html: `${v('k')} = ${y('A')}${sup(xb())} = ${fmt(r.kB)}` },
        {
          step: 6,
          row: 6,
          kind: 'band',
          tone: 'eve',
          node: T(L('dh.agree.band')),
        },
      ];
      let lanes = lanesView([ALICE, BOB], items, k);

      let rotor = makeRotor(P);
      let g = B(p.g);
      rotor.peg(g, k === 0 ? 'is-now' : '');
      if (k >= 1) {
        rotor.jump(g, r.ya, k === 1 ? 'is-now' : 'alice');
        rotor.peg(r.ya, k === 1 ? 'is-now' : 'alice');
      }
      if (k >= 2) {
        rotor.jump(g, r.yb, k === 2 ? 'is-now' : 'bob');
        rotor.peg(r.yb, k === 2 ? 'is-now' : 'bob');
      }
      if (k >= 4) rotor.jump(r.yb, r.kA, k === 4 ? 'is-now' : 'alice');
      if (k >= 5) {
        rotor.jump(r.ya, r.kB, k === 5 ? 'is-now' : 'bob');
        rotor.target(r.kA, 'hit');
      }
      if (k >= 4) rotor.peg(r.kA, k <= 5 ? 'is-now' : 'key');
      rotor.turnTo(focus(k), { from: animate ? focus(prev) : null, anim: A });

      ctx.canvas.replaceChildren(work(chips, generatorNote(g, P), lanes.el), figure(rotor.el));

      if (!animate) return;
      animateLanes(A, lanes.nowEls);
      let nowJump = rotor.el.querySelector('.jump.is-now');
      if (nowJump) A.draw(nowJump, { delay: 250, duration: 700 });
      let nowPeg = rotor.el.querySelector('.peg.is-now .peg-inner');
      if (nowPeg && k !== 3) A.appear(nowPeg, { from: 'scale', delay: 750 });
      if (k === 4) A.pulse(answer, { delay: 600 });
    },
  };
}

// ================================================================ person in the middle

function pitmScene(ctx) {
  let p = { p: 23, g: 5, xa: 6, xb: 15, xe: 9 };
  let r = null;
  let gText = h('span', {}, '5');
  let xeText = h('span', { class: 'eve' }, '9');
  let sg = param(ctx, p, 'g', { min: 2, max: MAX_P - 2, label: 'generator alpha', accept: (x) => x <= p.p - 2 });
  let sxa = exponentParam(ctx, p, 'xa', 'alice', 'Alice secret x_A');
  let sxb = exponentParam(ctx, p, 'xb', 'bob', 'Bob secret x_B');
  let sxe = exponentParam(ctx, p, 'xe', 'eve', 'Eve secret x_E');
  let sp = primeParam(ctx, p, () => {
    if (p.g > p.p - 2) p.g = Number(nt.smallestGenerator(B(p.p)));
    for (let key of ['xa', 'xb', 'xe']) p[key] = Math.min(p[key], p.p - 2);
    sg.value = p.g;
    sxa.value = p.xa;
    sxb.value = p.xb;
    sxe.value = p.xe;
  });
  setFormula(
    ctx.formula,
    h('span', {}, sg.el, h('sup', {}, sxa.el, h('span', { class: 'op' }, '·'), sxe.el)),
    op('≠'),
    h('span', {}, gText, h('sup', {}, sxb.el, h('span', { class: 'op' }, '·'), xeText)),
    op('mod'),
    sp,
  );

  function focus(k) {
    return [r.ye, r.ya, r.ye, r.yb, r.ye, r.kAE, r.kBE, r.kBE, r.kBE][k];
  }

  return {
    steps() {
      r = dh.pitm(B(p.p), B(p.g), B(p.xa), B(p.xb), B(p.xe));
      return [
        L('dh.middle.s0', { x: p.xe, y: fmt(r.ye) }),
        L('dh.middle.s1', { y: fmt(r.ya) }),
        L('dh.middle.s2', { y: fmt(r.ye) }),
        L('dh.middle.s3', { y: fmt(r.yb) }),
        L('dh.middle.s4'),
        L('dh.middle.s5', { k: fmt(r.kAE) }),
        L('dh.middle.s6', { k: fmt(r.kBE) }),
        L('dh.middle.s7'),
        L('dh.middle.s8'),
      ];
    },

    show(k, prev) {
      let animate = k === prev + 1;
      let A = ctx.anim;
      let P = B(p.p);
      gText.textContent = String(p.g);
      xeText.textContent = String(p.xe);

      let items = [
        { step: 0, row: 1, kind: 'note', at: 'e', tone: 'eve', node: secretNote(xe(), p.xe, `${y('E')} = ${fmt(r.ye)}`) },
        { step: 1, row: 1, kind: 'note', at: 'a', tone: 'alice', node: secretNote(xa(), p.xa) },
        { step: 3, row: 1, kind: 'note', at: 'b', tone: 'bob', node: secretNote(xb(), p.xb) },
        { step: 1, row: 2, kind: 'msg', from: 'a', to: 'e', tone: 'alice', html: `${y('A')} = ${fmt(r.ya)}` },
        { step: 2, row: 3, kind: 'msg', from: 'e', to: 'b', tone: 'eve', html: `${y('E')} = ${fmt(r.ye)}`, cutAt: 8 },
        { step: 3, row: 4, kind: 'msg', from: 'b', to: 'e', tone: 'bob', html: `${y('B')} = ${fmt(r.yb)}` },
        { step: 4, row: 5, kind: 'msg', from: 'e', to: 'a', tone: 'eve', html: `${y('E')} = ${fmt(r.ye)}`, cutAt: 8 },
        { step: 5, row: 6, kind: 'note', at: 'a', tone: 'alice', html: `${v('k')}${sub('AE')} = ${fmt(r.kAE)}` },
        { step: 5, row: 6, kind: 'note', at: 'e', tone: 'eve', html: `${v('k')}${sub('AE')} = ${fmt(r.kAEeve)}` },
        { step: 6, row: 7, kind: 'note', at: 'e', tone: 'eve', html: `${v('k')}${sub('BE')} = ${fmt(r.kBEeve)}` },
        { step: 6, row: 7, kind: 'note', at: 'b', tone: 'bob', html: `${v('k')}${sub('BE')} = ${fmt(r.kBE)}` },
        { step: 7, row: 8, kind: 'msg', from: 'a', to: 'e', tone: 'alice', html: `E${sub(`${v('k')}${sub('AE')}`)}(${v('m')})` },
        { step: 7, row: 9, kind: 'msg', from: 'e', to: 'b', tone: 'eve', html: `E${sub(`${v('k')}${sub('BE')}`)}(${v('m')})` },
        {
          step: 8,
          row: 10,
          kind: 'band',
          node: h(
            'span',
            { class: 'kv' },
            lockIcon(),
            T(L('dh.middle.fix')),
          ),
        },
      ];
      let lanes = lanesView([ALICE, EVE, BOB], items, k);

      let rotor = makeRotor(P);
      rotor.peg(r.ye, k === 0 || k === 2 || k === 4 ? 'is-now' : 'eve');
      if (k >= 1) rotor.peg(r.ya, k === 1 ? 'is-now' : 'alice');
      if (k >= 3) rotor.peg(r.yb, k === 3 ? 'is-now' : 'bob');
      if (k >= 5) {
        rotor.jump(r.ye, r.kAE, k === 5 ? 'is-now' : 'alice');
        rotor.jump(r.ya, r.kAE, 'eve');
        rotor.peg(r.kAE, k === 5 ? 'is-now' : 'key');
      }
      if (k >= 6) {
        rotor.jump(r.ye, r.kBE, k === 6 ? 'is-now' : 'bob');
        rotor.jump(r.yb, r.kBE, 'eve');
        rotor.peg(r.kBE, k === 6 ? 'is-now' : 'key');
      }
      rotor.turnTo(focus(k), { from: animate ? focus(prev) : null, anim: A });

      let keys = null;
      if (k >= 6) {
        keys = h(
          'p',
          { class: 'line big pitm-keys' },
          h('span', { class: 'alice', html: `${v('k')}${sub('AE')} = ${fmt(r.kAE)}` }),
          h('span', { class: 'op' }, '≠'),
          h('span', { class: 'bob', html: `${v('k')}${sub('BE')} = ${fmt(r.kBE)}` }),
        );
      }
      ctx.canvas.replaceChildren(work(lanes.el, keys), figure(rotor.el));

      if (!animate) return;
      animateLanes(A, lanes.nowEls);
      if (k === 5 || k === 6) {
        for (let jp of [...rotor.el.querySelectorAll('.jump')].slice(-2)) A.draw(jp, { delay: 250, duration: 700 });
      }
      let nowPeg = rotor.el.querySelector('.peg.is-now .peg-inner');
      if (nowPeg) A.appear(nowPeg, { from: 'scale', delay: 700 });
      if (keys) A.appear(keys, { from: 'rise', delay: 400 });
      if (k === 8) {
        for (let cut of lanes.el.querySelectorAll('.msg.is-cut')) A.strike(cut, { delay: 500 });
      }
    },
  };
}

// ================================================================ bad public values

const BAD = [
  { id: 'one', label: '1', value: () => 1n },
  { id: 'zero', label: '0', value: () => 0n },
  { id: 'minus', label: '−1', value: (p) => p - 1n },
];

function badValueScene(ctx) {
  let p = { p: 23, xa: 6, bad: 'minus' };
  let r = null;
  let base = h('span', { class: 'bob' }, '?');
  let answer = h('span', { class: 'answer' }, '?');
  let sxa = exponentParam(ctx, p, 'xa', 'alice', 'Alice secret x_A');
  let sp = primeParam(ctx, p, () => {
    p.xa = Math.min(p.xa, p.p - 2);
    sxa.value = p.xa;
  });
  setFormula(ctx.formula, h('span', {}, '(', base, ')', h('sup', {}, sxa.el)), op('mod'), sp, op('='), answer);

  function pick(id) {
    p.bad = id;
    ctx.refresh();
  }

  function focus(k) {
    return [r.kh, r.v, r.c, r.c2, r.v][k];
  }

  return {
    steps() {
      let P = B(p.p);
      let g = nt.smallestGenerator(P);
      let xB = dh.honestExponent(P);
      let yb = nt.modPow(g, xB, P);
      let bad = BAD.find((b) => b.id === p.bad);
      let val = bad.value(P);
      r = {
        P,
        g,
        xB,
        yb,
        kh: nt.modPow(yb, B(p.xa), P),
        v: val,
        c: dh.collapse(P, val, B(p.xa)),
        c2: dh.collapse(P, val, xB),
        label: bad.label,
      };
      return [
        L('dh.bad.s0', { y: fmt(yb), k: fmt(r.kh) }),
        L('dh.bad.s1', { v: r.label }),
        L('dh.bad.s2', { v: r.label, x: p.xa, k: sym(r.c, P) }),
        L('dh.bad.s3'),
        L('dh.bad.s4'),
      ];
    },

    show(k, prev) {
      let animate = k === prev + 1;
      let A = ctx.anim;
      let P = r.P;
      base.textContent = k === 0 ? fmt(r.yb) : r.label;
      base.className = k === 0 ? 'bob' : 'eve';
      answer.textContent = k === 0 ? fmt(r.kh) : k >= 2 ? sym(r.c, P) : '?';

      let chips = h(
        'div',
        { class: 'presets', role: 'group', 'aria-label': render(L('dh.bad.chips')) },
        BAD.map((b) =>
          h(
            'button',
            { type: 'button', class: 'chip', 'aria-pressed': String(b.id === p.bad), onclick: () => pick(b.id) },
            T(L('dh.bad.chip', { v: b.label })),
          ),
        ),
      );

      let items = [
        { step: 0, row: 1, kind: 'note', at: 'a', tone: 'alice', node: secretNote(xa(), p.xa) },
        { step: 0, row: 1, kind: 'note', at: 'b', tone: 'bob', html: `${y('B')} = ${fmt(r.yb)}` },
        { step: 0, row: 2, kind: 'msg', from: 'b', to: 'a', tone: 'bob', html: `${y('B')} = ${fmt(r.yb)}`, cutAt: 1 },
        { step: 0, row: 3, kind: 'note', at: 'a', tone: 'alice', html: `${v('k')} = ${fmt(r.kh)}`, cutAt: 1 },
        { step: 1, row: 4, kind: 'msg', from: 'e', to: 'a', tone: 'eve', html: r.label, cutAt: 4 },
        { step: 2, row: 5, kind: 'note', at: 'a', tone: 'alice', html: `${v('k')} = ${r.label}${sup(xa())} = ${sym(r.c, P)}` },
        { step: 3, row: 6, kind: 'msg', from: 'e', to: 'b', tone: 'eve', html: r.label, cutAt: 4 },
        { step: 3, row: 7, kind: 'note', at: 'b', tone: 'bob', html: `${v('k')}′ = ${sym(r.c2, P)}` },
        {
          step: 4,
          row: 8,
          kind: 'band',
          node: T(L('dh.bad.reject')),
        },
      ];
      let lanes = lanesView([ALICE, EVE, BOB], items, k);

      let blocks = [chips, lanes.el];
      if (k >= 3) {
        blocks.push(
          ledger(
            [v('y'), `${v('y')}${sup(xa())}`, `${v('y')}${sup(xb())}`],
            BAD.map((b) => {
              let val = b.value(P);
              return {
                cls: b.id === p.bad ? 'is-now' : '',
                cells: [b.label, sym(dh.collapse(P, val, B(p.xa)), P), sym(dh.collapse(P, val, r.xB), P)],
              };
            }),
          ),
        );
      }

      let rotor = makeRotor(P);
      for (let t of [0n, 1n, P - 1n]) rotor.target(t, 'trap');
      if (k === 0) {
        rotor.jump(r.yb, r.kh, 'is-now');
        rotor.peg(r.yb, 'bob');
        rotor.peg(r.kh, 'is-now');
      } else {
        rotor.peg(r.v, `${k === 1 ? 'is-now' : 'eve'}${k === 4 ? ' rejected' : ''}`);
        if (k >= 2) {
          rotor.jump(r.v, r.c, k === 2 ? 'is-now' : 'alice');
          rotor.peg(r.c, k === 2 ? 'is-now' : 'key');
        }
        if (k >= 3) {
          rotor.jump(r.v, r.c2, k === 3 ? 'is-now' : 'bob');
          rotor.peg(r.c2, k === 3 ? 'is-now' : 'key');
        }
      }
      rotor.turnTo(focus(k), { from: animate ? focus(prev) : null, anim: A });
      ctx.canvas.replaceChildren(work(...blocks), figure(rotor.el));

      if (!animate) return;
      animateLanes(A, lanes.nowEls);
      let nowJump = rotor.el.querySelector('.jump.is-now');
      if (nowJump) A.draw(nowJump, { delay: 250, duration: 600 });
      let nowPeg = rotor.el.querySelector('.peg.is-now .peg-inner');
      if (nowPeg) A.appear(nowPeg, { from: 'scale', delay: 650 });
      if (k === 1) A.pulse(base, { delay: 300 });
      if (k === 2) A.pulse(answer, { delay: 600 });
      if (k === 3) ctx.canvas.querySelectorAll('.ledger tbody tr').forEach((tr, i) => A.appear(tr, { from: 'write', delay: 300 + i * 140, duration: 450 }));
      if (k === 4) for (let cut of lanes.el.querySelectorAll('.is-cut.msg')) A.strike(cut, { delay: 300 });
    },
  };
}

// ================================================================ brute-force discrete log

const DRAW_PEGS = 720;
const DRAW_JUMPS = 60;

function bruteScene(ctx) {
  let p = { p: 101, g: 2, xa: 37 };
  let r = null;
  let yText = h('span', { class: 'alice' }, '?');
  let answer = h('span', { class: 'answer' }, '?');
  let sg = param(ctx, p, 'g', { min: 2, max: MAX_P - 2, label: 'generator alpha', accept: (x) => x <= p.p - 2 });
  let sxa = exponentParam(ctx, p, 'xa', 'alice', 'Alice secret x_A');
  let sp = primeParam(ctx, p, () => {
    if (p.g > p.p - 2) p.g = Number(nt.smallestGenerator(B(p.p)));
    p.xa = Math.min(p.xa, p.p - 2);
    sg.value = p.g;
    sxa.value = p.xa;
  });
  setFormula(
    ctx.formula,
    h('span', {}, sg.el, h('sup', {}, answer)),
    op('mod'),
    sp,
    op('='),
    yText,
    h('span', { class: 'secret' }, lockIcon(), h('span', { html: `${xa()} =` }), sxa.el),
  );

  function load(vals) {
    Object.assign(p, vals);
    sp.value = p.p;
    sg.value = p.g;
    sxa.value = p.xa;
    ctx.refresh();
  }

  let chips = presetChips(
    [
      { label: 'p = 101', values: { p: 101, g: 2, xa: 37 } },
      { label: 'p = 2039', values: { p: 2039, g: 7, xa: 1500 } },
      { label: 'p = 99991', values: { p: 99991, g: Number(nt.smallestGenerator(99991n)), xa: 80000 } },
    ],
    load,
  );

  function focus(k) {
    return [r.y, r.walk[Math.min(9, r.walk.length - 1)], r.y, r.y][k];
  }

  return {
    steps() {
      let P = B(p.p);
      let g = B(p.g);
      let yv = nt.modPow(g, B(p.xa), P);
      let dl = nt.discreteLog(g, yv, P, 200000);
      if (dl.x === null) throw new nt.NtError('The walk is too long to show here.', 'ここで表示するには探索が長すぎます。', 'err.dlogWalk');
      let walk = [];
      let cur = 1n;
      for (let i = 0n; i <= dl.x; i++) {
        walk.push(cur);
        cur = (cur * g) % P;
      }
      r = { P, g, y: yv, x: dl.x, tries: dl.steps, walk, bits: P.toString(2).length };
      return [
        L('dh.dlog.s0', { y: fmt(yv) }),
        L('dh.dlog.s1'),
        L('dh.dlog.s2', { n: fmt(r.tries), x: fmt(r.x) }),
        L('dh.dlog.s3'),
      ];
    },

    show(k, prev) {
      let animate = k === prev + 1;
      let A = ctx.anim;
      let P = r.P;
      yText.textContent = fmt(r.y);
      if (k >= 2) answer.textContent = fmt(r.x);
      else answer.replaceChildren(h('var', {}, 'x'));

      let rotor = makeRotor(P);
      rotor.target(r.y, k >= 2 ? 'hit' : 'trap');
      let count = k === 0 ? 0 : k === 1 ? Math.min(10, r.walk.length) : r.walk.length;
      let every = Math.max(1, Math.ceil(count / DRAW_PEGS));
      let drawn = [];
      for (let i = 0; i < count; i += every) drawn.push(i);
      if (count && drawn[drawn.length - 1] !== count - 1) drawn.push(count - 1);
      if (count <= DRAW_JUMPS) {
        for (let i = 1; i < count; i++) rotor.jump(r.walk[i - 1], r.walk[i], i === count - 1 ? 'is-now' : 'eve');
      }
      for (let i of drawn) rotor.peg(r.walk[i], i === count - 1 ? 'is-now' : 'eve');
      rotor.turnTo(focus(k), { from: animate ? focus(prev) : null, anim: A });

      let blocks = [chips];
      if (k >= 1) {
        let shown = r.walk.slice(0, Math.min(count, 6));
        let rows = shown.map((val, i) => ({ cls: '', cells: [`α${sup(i)}`, fmt(val)], cellCls: ['dim', ''] }));
        if (count > 6) rows.push({ cls: '', cells: ['…', ''], cellCls: ['dim', ''] });
        if (k >= 2 && count > 6) rows.push({ cls: 'is-now', cells: [`α${sup(fmt(r.x))}`, fmt(r.walk[count - 1])] });
        if (k >= 2 && count <= 6) rows[rows.length - 1].cls = 'is-now';
        blocks.push(ledger(['', 'mod ' + fmt(P)], rows));
      }
      if (k >= 2) blocks.push(h('p', { class: 'line big is-now' }, T(L('dh.dlog.tries', { n: fmt(r.tries) }))));
      if (k >= 3) {
        let rows = [
          { bits: r.bits, label: T(L('dh.dlog.bits', { p: fmt(P), b: r.bits })), now: true },
          { bits: 40, label: '2⁴⁰' },
          { bits: 64, label: '2⁶⁴' },
          { bits: 128, label: '2¹²⁸' },
          { bits: 2048, label: '2²⁰⁴⁸' },
        ];
        blocks.push(
          ledger(
            [v('p'), T(L('dh.dlog.time'))],
            rows.map((row) => {
              let d = dh.durationParts(row.bits);
              return { cls: row.now ? 'is-now' : '', cells: [row.label, T(L(`dh.unit.${d.unit}`, { v: d.v }))] };
            }),
          ),
          h('p', { class: 'line dim-line wrap' }, T(L('dh.dlog.note'))),
        );
      }
      ctx.canvas.replaceChildren(work(...blocks), figure(rotor.el));

      if (!animate) return;
      if (k === 1 || k === 2) {
        let pegs = [...rotor.el.querySelectorAll('.peg-inner')];
        let from = k === 2 ? Math.min(10, pegs.length) : 0;
        let fresh = pegs.slice(from);
        fresh.forEach((pg, i) => A.appear(pg, { from: 'scale', delay: 100 + stagger(i, fresh.length, 1600, 160), duration: 300 }));
        let jumps = [...rotor.el.querySelectorAll('.jump')].slice(k === 2 ? 9 : 0);
        jumps.forEach((jp, i) => A.draw(jp, { delay: 60 + stagger(i, jumps.length, 1600, 160), duration: 260 }));
      }
      if (k === 2) A.pulse(answer, { delay: 1500 });
      if (k === 3) ctx.canvas.querySelectorAll('.ledger:last-of-type tbody tr').forEach((tr, i) => A.appear(tr, { from: 'write', delay: 150 + i * 160, duration: 450 }));
    },
  };
}

// ================================================================ protocol properties

const PROTO_ORDER = ['plain', 'static', 'sts'];

function markEl(state, now = false) {
  let label = render(L(`dh.mark.${state}`));
  return h('span', { class: `pmark ${state}${now ? ' is-now' : ''}`, role: 'img', 'aria-label': label, title: label });
}

function propertiesScene(ctx) {
  let p = { proto: 'static' };
  let proto = null;
  let keyEl = h('span', { class: 'answer' });
  setFormula(ctx.formula, h('span', { html: `${v('k')} =` }), keyEl);

  return {
    steps() {
      proto = dh.PROTOCOLS[p.proto];
      return [L(proto.setup), ...proto.messages.map((m) => L(m.caption)), L('dh.props.final')];
    },

    show(k, prev) {
      let animate = k === prev + 1;
      let A = ctx.anim;
      let M = proto.messages.length;
      let final = k > M;
      keyEl.innerHTML = sanitizeHTML(proto.key);

      let chips = h(
        'div',
        { class: 'presets', role: 'group', 'aria-label': render(L('dh.props.protocol')) },
        PROTO_ORDER.map((id) =>
          h(
            'button',
            {
              type: 'button',
              class: 'chip',
              'aria-pressed': String(id === p.proto),
              onclick: () => {
                p.proto = id;
                ctx.refresh();
              },
            },
            T(L(dh.PROTOCOLS[id].title)),
          ),
        ),
      );

      // Property grid
      let body = dh.PROPS.map((prop) => {
        let decidedNow = false;
        let decided = final;
        let cells;
        if (prop.two) {
          cells = ['ab', 'ba'].map((dir) => {
            let val = dh.propValue(proto, prop.id, dir);
            let state = dh.markAt(val, k, M);
            let now = typeof val === 'number' && val === k;
            if (state !== 'pending') decided = true;
            if (now) decidedNow = true;
            return h('td', {}, markEl(state, now));
          });
        } else {
          let state = dh.markAt(dh.propValue(proto, prop.id), k, M);
          cells = [h('td', { colspan: '2' }, markEl(state, final && animate))];
        }
        let why = prop.id === 'eka' ? 'dh.prop.eka.why' : proto.props[prop.id].why;
        return h(
          'tr',
          { class: decidedNow ? 'is-now' : '' },
          h('th', { scope: 'row' }, h('span', { class: 'prop-name' }, T(L(prop.title))), h('span', { class: `why${decided ? '' : ' is-ahead'}` }, T(L(why)))),
          cells,
        );
      });
      let table = h(
        'table',
        { class: 'props' },
        h('thead', {}, h('tr', {}, h('th', { scope: 'col' }), h('th', { scope: 'col' }, 'A → B'), h('th', { scope: 'col' }, 'B → A'))),
        h('tbody', {}, body),
      );
      let legend = h(
        'p',
        { class: 'legend' },
        h('span', {}, T(L('dh.props.legend'))),
        ['yes', 'no', 'cond', 'pending'].map((s) => h('span', { class: 'legend-item' }, markEl(s), T(L(`dh.mark.${s}`)))),
      );
      let note = final && proto.note ? h('p', { class: 'line dim-line proto-note' }, T(L(proto.note))) : null;

      // Sequence diagram
      let items = [
        { step: 0, row: 1, kind: 'band', node: T(L(proto.setup)) },
        ...proto.messages.map((m, i) => ({ step: i + 1, row: i + 2, kind: 'msg', from: m.from, to: m.to, tone: m.from === 'a' ? 'alice' : 'bob', html: m.html })),
      ];
      let lanes = lanesView([ALICE, BOB], items, Math.min(k, M + 1));

      ctx.canvas.replaceChildren(work(chips, table, legend, note), figure(h('div', { class: 'proto-figure' }, lanes.el)));

      if (!animate) return;
      animateLanes(A, lanes.nowEls);
      let fresh = [...table.querySelectorAll('.pmark.is-now')];
      fresh.forEach((m, i) => A.pulse(m, { delay: 700 + i * 120 }));
      if (final) {
        let marks = [...table.querySelectorAll('.pmark')];
        marks.forEach((m, i) => A.appear(m, { from: 'scale', delay: 150 + i * 60, duration: 360 }));
        table.querySelectorAll('.why').forEach((w, i) => A.appear(w, { from: 'fade', delay: 300 + i * 60 }));
      } else {
        table.querySelectorAll('tr.is-now .why').forEach((w) => A.appear(w, { from: 'fade', delay: 800 }));
      }
    },
  };
}

export const mode = {
  scenes: [
    { id: 'agree', title: L('dh.agree.title'), create: agreementScene },
    { id: 'middle', title: L('dh.middle.title'), create: pitmScene },
    { id: 'bad-value', title: L('dh.bad.title'), create: badValueScene },
    { id: 'dlog', title: L('dh.dlog.title'), create: bruteScene },
    { id: 'properties', title: L('dh.props.title'), create: propertiesScene },
  ],
};
