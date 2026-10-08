import * as nt from '../nt.js';
import { h, svg, T, L, v, fmt } from '../ui.js';
import { render } from '../i18n.js';
import { makeRotor } from '../rotor.js';
import { setFormula, op, param, presets, ledger, line, rollTo, stagger, work, figure } from '../kit.js';

function sup(x) {
  return `<sup>${x}</sup>`;
}

function gcdN(a, b) {
  return Number(nt.gcd(BigInt(a), BigInt(b)));
}

function modN(a, n) {
  return ((a % n) + n) % n;
}

// Animate an element from a remembered screen rectangle to where it now sits.
function flyFromRect(anim, el, rect, { delay = 0, duration = 700 } = {}) {
  if (!rect || !el) return;
  let b = el.getBoundingClientRect();
  let dx = rect.left - b.left;
  let dy = rect.top - b.top;
  if (!dx && !dy) return;
  anim.run(el, [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { delay, duration });
}

// ================================================================ what mod means

function clockScene(ctx) {
  let p = { a: 17, n: 5 };
  let answer = h('span', { class: 'answer' }, '?');
  let sa = param(ctx, p, 'a', { min: 0, max: 200, label: 'a' });
  let sn = param(ctx, p, 'n', { min: 2, max: 24, label: 'n', tone: 'alice' });
  setFormula(ctx.formula, sa, op('mod'), sn, op('='), answer);

  let chips = presets(
    [
      { label: '17 mod 5', values: { a: 17, n: 5 } },
      { label: '26 mod 12', values: { a: 26, n: 12 } },
      { label: '100 mod 7', values: { a: 100, n: 7 } },
    ],
    (vals) => {
      Object.assign(p, vals);
      sa.value = p.a;
      sn.value = p.n;
      ctx.refresh();
    },
  );

  return {
    steps() {
      let q = Math.floor(p.a / p.n);
      let r = p.a % p.n;
      return [
        L('basics.mod.ring', { n: p.n, n1: p.n - 1 }),
        L('basics.mod.walk', { a: p.a, n: p.n, q }),
        L('basics.mod.rest', { a: p.a, n: p.n, q, r }),
      ];
    },

    show(k, prev) {
      let animate = k === prev + 1;
      let A = ctx.anim;
      let q = Math.floor(p.a / p.n);
      let r = p.a % p.n;

      let dots = h(
        'div',
        { class: 'dots', style: { '--cols': String(p.n) }, role: 'img', 'aria-label': render(L('basics.mod.dotsAria', { a: p.a, n: p.n })) },
        Array.from({ length: p.a }, (_, i) => {
          let rest = i >= q * p.n;
          return h('span', { class: `dot${k >= 2 && rest ? ' is-rest' : ''}${k >= 2 && !rest ? ' is-lap' : ''}` });
        }),
      );
      let laps = h('span', { class: 'n' }, String(k >= 1 ? q : 0));
      let blocks = [chips];
      if (k >= 1) {
        blocks.push(
          h('p', { class: 'line' }, T(L('basics.mod.laps')), ' ', laps),
          dots,
        );
      }
      if (k >= 2) {
        blocks.push(
          h('p', { class: 'line big is-now', html: `${p.a} <span class="op">=</span> ${q} <span class="op">·</span> ${p.n} <span class="op">+</span> ${r}` }),
        );
      }
      let rotor = makeRotor(p.n);
      if (k >= 1) {
        rotor.peg(r, 'is-now');
        if (k >= 2) rotor.target(r, 'hit');
      } else {
        rotor.peg(0, 'is-now');
      }
      rotor.turnTo(k >= 1 ? r : 0, { from: animate && k === 1 ? 0 : null, anim: A, laps: q, duration: Math.min(3200, 700 + q * 450) });
      ctx.canvas.replaceChildren(work(...blocks), figure(rotor.el));
      answer.textContent = k >= 2 ? String(r) : '?';

      if (!animate) return;
      if (k === 1) {
        let all = [...dots.children];
        let dur = Math.min(3200, 700 + q * 450);
        all.forEach((d, i) => A.appear(d, { from: 'scale', delay: (dur * i) / Math.max(1, all.length), duration: 260 }));
        rollTo(laps, 0, q, A, { duration: dur });
      }
      if (k === 2) A.pulse(answer, { delay: 200 });
    },
  };
}

// ================================================================ tables

function tableScene(ctx) {
  let p = { n: 7, a: 3 };
  let sn = param(ctx, p, 'n', { min: 2, max: 13, label: 'n', after: (x) => { if (p.a >= x) { p.a = x - 1; sa.value = p.a; } } });
  let sa = param(ctx, p, 'a', { min: 0, max: 12, label: 'row a', tone: 'alice', accept: (x) => x < p.n });
  setFormula(ctx.formula, T(L('basics.tables.row')), sa, op('mod'), sn);

  let chips = presets(
    [
      { label: 'n = 7', values: { n: 7, a: 3 } },
      { label: 'n = 8', values: { n: 8, a: 2 } },
      { label: 'n = 12', values: { n: 12, a: 5 } },
    ],
    (vals) => {
      Object.assign(p, vals);
      sn.value = p.n;
      sa.value = p.a;
      ctx.refresh();
    },
  );

  function grid(kind, highlightRow, unitRows) {
    let n = p.n;
    let c = 10;
    let root = svg('svg', { class: 'optable', viewBox: `0 0 ${(n + 1) * c} ${(n + 1) * c}`, role: 'img', 'aria-label': render(L(kind === 'add' ? 'basics.tables.ariaAdd' : 'basics.tables.ariaMul', { n })) });
    let cells = [];
    root.append(svg('text', { x: c / 2, y: c / 2, class: 'op-sign' }, kind === 'add' ? '+' : '·'));
    for (let i = 0; i < n; i++) {
      root.append(svg('text', { x: (i + 1.5) * c, y: c / 2, class: 'op-head' }, String(i)));
      root.append(svg('text', { x: c / 2, y: (i + 1.5) * c, class: `op-head${i === highlightRow ? ' is-row' : ''}` }, String(i)));
    }
    for (let r = 0; r < n; r++) {
      for (let col = 0; col < n; col++) {
        let val = kind === 'add' ? (r + col) % n : (r * col) % n;
        let rowOn = highlightRow === r || (unitRows && unitRows.has(r));
        let dim = (highlightRow !== null || unitRows) && !rowOn;
        let g = svg('g', { class: `op-cell${rowOn ? ' is-row' : ''}${dim ? ' is-dim' : ''}${val === 1 && rowOn && kind === 'mul' ? ' is-one' : ''}`, transform: `translate(${(col + 1) * c} ${(r + 1) * c})` });
        let rect = svg('rect', { x: 0.5, y: 0.5, width: c - 1, height: c - 1, rx: 1 });
        rect.style.fillOpacity = String(0.08 + (0.5 * val) / Math.max(1, n - 1));
        g.append(rect, svg('text', { x: c / 2, y: c / 2, class: 'op-val' }, String(val)));
        cells.push({ g, r, col });
        root.append(g);
      }
    }
    return { root, cells };
  }

  return {
    steps() {
      let g = gcdN(p.a, p.n);
      let units = [];
      for (let i = 1; i < p.n; i++) if (gcdN(i, p.n) === 1) units.push(i);
      return [
        L('basics.tables.add', { n: p.n, n1: p.n - 1 }),
        L('basics.tables.addRow', { a: p.a }),
        L('basics.tables.mul', { n: p.n }),
        g === 1 ? L('basics.tables.unit', { a: p.a, n: p.n }) : L('basics.tables.zeroDiv', { a: p.a, n: p.n, g }),
        L('basics.tables.units', { list: units.join(', '), n: p.n }),
      ];
    },

    show(k, prev) {
      let animate = k === prev + 1;
      let A = ctx.anim;
      let kind = k <= 1 ? 'add' : 'mul';
      let row = k === 1 || k === 3 ? p.a : null;
      let unitRows = null;
      if (k === 4) {
        unitRows = new Set();
        for (let i = 1; i < p.n; i++) if (gcdN(i, p.n) === 1) unitRows.add(i);
      }
      let { root, cells } = grid(kind, row, unitRows);
      let blocks = [chips];
      if (row !== null) {
        let vals = Array.from({ length: p.n }, (_, c) => (kind === 'add' ? (row + c) % p.n : (row * c) % p.n));
        let seen = new Set();
        blocks.push(
          h(
            'p',
            { class: 'line seq' },
            vals.map((x) => {
              let dup = seen.has(x);
              seen.add(x);
              return h('span', { class: `${dup ? 'eve' : ''}${x === 1 && kind === 'mul' ? ' is-hit' : ''}` }, String(x));
            }),
          ),
        );
      }
      if (k === 4) {
        blocks.push(line(`φ(${p.n}) = ${unitRows.size}`, 'is-now'));
      }
      ctx.canvas.replaceChildren(work(...blocks), figure(h('div', { class: 'optable-wrap' }, root)));

      if (!animate) return;
      if (k === 0 || k === 2) {
        cells.forEach((c) => A.appear(c.g, { from: 'scale', delay: (c.r + c.col) * 40, duration: 320 }));
      } else {
        cells.filter((c) => c.g.classList.contains('is-row')).forEach((c) => A.pulse(c.g, { delay: c.col * 60 }));
      }
    },
  };
}

// ================================================================ primes

function sieveScene(ctx) {
  let p = { N: 100 };
  let sn = param(ctx, p, 'N', { min: 10, max: 400, label: 'N' });
  let count = h('span', { class: 'answer' }, '?');
  setFormula(ctx.formula, h('span', { html: 'π(' }), sn, h('span', { html: ')' }), op('='), count);

  let chips = presets(
    [
      { label: 'N = 30', values: { N: 30 } },
      { label: 'N = 100', values: { N: 100 } },
      { label: 'N = 400', values: { N: 400 } },
    ],
    (vals) => {
      p.N = vals.N;
      sn.value = p.N;
      ctx.refresh();
    },
  );

  let sievers = [];
  let struckBy = [];

  return {
    steps() {
      sievers = [];
      struckBy = new Array(p.N + 1).fill(0);
      for (let x = 2; x * x <= p.N; x++) {
        if (struckBy[x]) continue;
        sievers.push(x);
        for (let m = x * x; m <= p.N; m += x) if (!struckBy[m]) struckBy[m] = x;
      }
      let primes = 0;
      for (let x = 2; x <= p.N; x++) if (!struckBy[x]) primes++;
      this.primes = primes;
      return [
        L('basics.primes.write', { N: p.N }),
        ...sievers.map((x) => L('basics.primes.strike', { s: x, sq: x * x })),
        L('basics.primes.done', { N: p.N, count: primes }),
      ];
    },

    show(k, prev) {
      let animate = k === prev + 1;
      let A = ctx.anim;
      let S = sievers.length;
      let upto = Math.min(k, S);
      let done = k === S + 1;
      let n = p.N;
      let cols = n <= 100 ? 10 : 20;
      let rowsN = Math.ceil(n / cols);
      let cell = 10;
      let root = svg('svg', { class: 'grid-fig', viewBox: `0 0 ${cols * cell} ${rowsN * cell}`, role: 'img', 'aria-label': render(L('basics.primes.aria', { n })) });
      let now = [];
      let primeCells = [];
      for (let x = 1; x <= n; x++) {
        let by = struckBy[x] ?? 0;
        let byIdx = by ? sievers.indexOf(by) + 1 : 0;
        let struck = x === 1 || (by && byIdx <= upto);
        let isNow = by && byIdx === upto && k === upto && k >= 1;
        let isSiever = sievers.indexOf(x) !== -1 && sievers.indexOf(x) < upto;
        let isPrime = !by && x > 1;
        let cls = `cell${struck ? ' struck' : ''}${isNow ? ' is-now' : ''}${isSiever || (done && isPrime) ? ' kept' : ''}`;
        let g = svg('g', { class: cls, transform: `translate(${((x - 1) % cols) * cell} ${Math.floor((x - 1) / cols) * cell})` });
        g.append(svg('rect', { x: 0.6, y: 0.6, width: cell - 1.2, height: cell - 1.2, rx: 1.2 }));
        g.append(svg('text', { x: cell / 2, y: cell / 2, class: 'cell-n', style: `font-size:${n <= 100 ? 3.6 : 3}px` }, String(x)));
        if (isNow) now.push(g);
        if (done && isPrime) primeCells.push(g);
        root.append(g);
      }
      let found = sievers.slice(0, upto);
      let blocks = [chips];
      if (upto > 0 || done) {
        blocks.push(h('p', { class: 'line seq' }, found.map((s, i) => h('span', { class: i === upto - 1 && !done ? 'is-hit' : '' }, String(s))), done ? h('span', { class: 'op' }, '…') : null));
      }
      if (done) blocks.push(h('p', { class: 'line big is-now', html: `π(${n}) = ${this.primes}` }));
      ctx.canvas.replaceChildren(work(...blocks), figure(h('div', { class: 'grid-wrap' }, root)));
      count.textContent = done ? String(this.primes) : '?';

      if (!animate) return;
      now.forEach((g, i) => A.strike(g, { delay: 120 + stagger(i, now.length, 900, 40) }));
      primeCells.forEach((g, i) => A.pulse(g, { delay: stagger(i, primeCells.length, 900, 25) }));
    },
  };
}

// ================================================================ gcd and coprime

function gcdScene(ctx) {
  let p = { a: 84, b: 120 };
  let answer = h('span', { class: 'answer' }, '?');
  let sa = param(ctx, p, 'a', { min: 2, max: 9999, label: 'a', tone: 'alice' });
  let sb = param(ctx, p, 'b', { min: 2, max: 9999, label: 'b', tone: 'bob' });
  setFormula(ctx.formula, h('span', {}, T(L('basics.gcd.fn')), '('), sa, h('span', { html: ',' }), sb, h('span', { html: ')' }), op('='), answer);

  let chips = presets(
    [
      { label: '84, 120', values: { a: 84, b: 120 } },
      { label: '35, 64', values: { a: 35, b: 64 } },
      { label: '462, 1071', values: { a: 462, b: 1071 } },
    ],
    (vals) => {
      Object.assign(p, vals);
      sa.value = p.a;
      sb.value = p.b;
      ctx.refresh();
    },
  );

  let lastRects = new Map();

  function split() {
    let fa = nt.factorize(BigInt(p.a)).flatMap((f) => Array(f.k).fill(Number(f.p)));
    let fb = nt.factorize(BigInt(p.b)).flatMap((f) => Array(f.k).fill(Number(f.p)));
    let rest = [...fb];
    let shared = [];
    let onlyA = [];
    for (let x of fa) {
      let i = rest.indexOf(x);
      if (i !== -1) {
        shared.push(x);
        rest.splice(i, 1);
      } else {
        onlyA.push(x);
      }
    }
    return { fa, fb, shared, onlyA, onlyB: rest };
  }

  return {
    steps() {
      let s = split();
      let g = s.shared.reduce((x, y) => x * y, 1);
      return [
        L('basics.gcd.split', { x: p.a, f: s.fa.join(' · ') }),
        L('basics.gcd.split', { x: p.b, f: s.fb.join(' · ') }),
        s.shared.length ? L('basics.gcd.shared', { f: s.shared.join(' · ') }) : L('basics.gcd.none'),
        s.shared.length ? L('basics.gcd.product', { g }) : L('basics.gcd.coprime', { a: p.a, b: p.b }),
      ];
    },

    show(k, prev) {
      let animate = k === prev + 1;
      let A = ctx.anim;
      let s = split();
      let g = s.shared.reduce((x, y) => x * y, 1);
      let venn = h('div', { class: 'venn', role: 'img', 'aria-label': render(L('basics.gcd.aria', { a: p.a, b: p.b })) });
      venn.append(h('div', { class: 'venn-circle alice' }, h('span', { class: 'venn-name' }, String(p.a))));
      venn.append(h('div', { class: 'venn-circle bob' }, h('span', { class: 'venn-name' }, String(p.b))));
      let chipsOut = [];

      function place(list, region, tone, keyPrefix, startIdx = 0) {
        list.forEach((x, i) => {
          let el = h('span', { class: `factor-chip ${tone}`, 'data-key': `${keyPrefix}${i + startIdx}` }, String(x));
          let col = i % 3;
          let row = Math.floor(i / 3);
          let left = region === 'a' ? 13 + col * 9 : region === 'b' ? 69 + col * 9 : 45.5 + (i % 2) * 9;
          let top = region === 'mid' ? 40 + Math.floor(i / 2) * 15 : 40 + row * 15;
          el.style.left = `${left}%`;
          el.style.top = `${top}%`;
          venn.append(el);
          chipsOut.push(el);
        });
      }

      if (k <= 1) {
        place([...s.shared, ...s.onlyA], 'a', 'alice', 'a');
        if (k >= 1) place([...s.shared, ...s.onlyB], 'b', 'bob', 'b');
      } else {
        place(s.onlyA, 'a', 'alice', 'a', s.shared.length);
        place(s.onlyB, 'b', 'bob', 'b', s.shared.length);
        place(s.shared, 'mid', `shared${k >= 3 ? ' is-now' : ''}`, 'a');
      }
      let blocks = [chips];
      if (k >= 3) {
        blocks.push(h('p', { class: 'line big is-now' }, T(L('basics.gcd.result', { g }))));
        blocks.push(h('p', { class: 'line dim-line' }, T(L('basics.gcd.lcm', { l: (p.a / g) * p.b }))));
        if (g === 1) blocks.push(h('p', { class: 'line' }, T(L('basics.gcd.coprimeWord'))));
      }
      ctx.canvas.replaceChildren(work(...blocks), figure(venn));
      answer.textContent = k >= 3 ? String(g) : '?';

      if (animate) {
        for (let el of chipsOut) {
          let rect = lastRects.get(el.dataset.key);
          if (rect && k === 2) flyFromRect(A, el, rect, { duration: 800 });
          else if (!rect || (k === 1 && el.classList.contains('bob'))) A.appear(el, { from: 'scale', delay: 100 + chipsOut.indexOf(el) * 70 });
        }
        if (k === 3) A.pulse(answer, { delay: 200 });
      }
      lastRects = new Map();
      requestAnimationFrame(() => {
        for (let el of chipsOut) lastRects.set(el.dataset.key, el.getBoundingClientRect());
      });
    },
  };
}

// ================================================================ powers cycle

function powersScene(ctx) {
  let p = { a: 3, n: 7 };
  let sa = param(ctx, p, 'a', { min: 1, max: 60, label: 'a', tone: 'alice' });
  let sn = param(ctx, p, 'n', { min: 2, max: 60, label: 'n' });
  let answer = h('span', { class: 'answer' }, '?');
  setFormula(ctx.formula, h('span', {}, sa.el, h('sup', { html: '<var>k</var>' })), op('mod'), sn, op('→'), T(L('basics.powers.cycle')), answer);

  let chips = presets(
    [
      { label: '3 mod 7', values: { a: 3, n: 7 } },
      { label: '2 mod 7', values: { a: 2, n: 7 } },
      { label: '2 mod 11', values: { a: 2, n: 11 } },
      { label: '2 mod 12', values: { a: 2, n: 12 } },
    ],
    (vals) => {
      Object.assign(p, vals);
      sa.value = p.a;
      sn.value = p.n;
      ctx.refresh();
    },
  );

  let seq = [];
  let loopStart = 0;

  return {
    steps() {
      seq = [1 % p.n];
      let seen = new Map([[seq[0], 0]]);
      for (;;) {
        let next = (seq[seq.length - 1] * p.a) % p.n;
        if (seen.has(next)) {
          loopStart = seen.get(next);
          seq.push(next);
          break;
        }
        seen.set(next, seq.length);
        seq.push(next);
      }
      let period = seq.length - 1 - loopStart;
      let out = [L('basics.powers.start', { a: p.a })];
      for (let k = 1; k < seq.length - 1; k++) {
        out.push(L('basics.powers.mul', { a: p.a, k, n: p.n, v: seq[k] }));
      }
      out.push(loopStart === 0 ? L('basics.powers.back', { len: period, a: p.a }) : L('basics.powers.noReturn', { a: p.a, n: p.n }));
      return out;
    },

    show(k, prev) {
      let animate = k === prev + 1;
      let A = ctx.anim;
      let last = seq.length - 1;
      let upto = Math.min(k, last);
      let rotor = makeRotor(p.n);
      for (let i = 1; i <= upto; i++) rotor.jump(seq[i - 1], seq[i], i === upto ? 'is-now' : '');
      for (let i = 0; i <= Math.min(upto, last - 1); i++) rotor.peg(seq[i], i === upto ? 'is-now' : '');
      if (k === last) rotor.target(seq[last], 'hit');
      rotor.turnTo(seq[upto], { from: animate ? seq[upto - 1] : null, anim: A });
      let period = last - loopStart;
      let rows = seq.slice(0, last).map((x, i) => ({
        cls: i > upto ? 'is-ahead' : i === upto ? 'is-now' : '',
        cells: [`${p.a}${sup(i)}`, x],
        cellCls: ['dim', i >= loopStart && k === last ? 'used' : ''],
      }));
      let blocks = [chips, ledger([v('a') + sup(v('k')), `mod ${p.n}`], rows)];
      ctx.canvas.replaceChildren(work(...blocks), figure(rotor.el));
      answer.textContent = k === last ? String(period) : '?';

      if (!animate) return;
      let j = rotor.el.querySelector('.jump.is-now');
      if (j) A.draw(j, { delay: 150, duration: 600 });
      let pg = rotor.el.querySelector('.peg.is-now .peg-inner');
      if (pg) A.appear(pg, { from: 'scale', delay: 600 });
      let r = ctx.canvas.querySelector('tr.is-now');
      if (r) A.appear(r, { from: 'write', delay: 200 });
      if (k === last) A.pulse(answer, { delay: 500 });
    },
  };
}

// ================================================================ dividing mod n

function divideScene(ctx) {
  let p = { a: 3, n: 7 };
  let sa = param(ctx, p, 'a', { min: 1, max: 40, label: 'a', tone: 'alice', accept: (x) => x < p.n });
  let sn = param(ctx, p, 'n', { min: 2, max: 41, label: 'n', after: (x) => { if (p.a >= x) { p.a = x - 1; sa.value = p.a; } } });
  let answer = h('span', { class: 'answer' }, '?');
  setFormula(ctx.formula, sa, op('·'), h('var', {}, 'x'), op('≡'), '1', h('span', { class: 'op', html: '(mod' }), h('span', {}, sn.el, op(')')), op('→'), h('var', {}, 'x'), op('='), answer);

  let chips = presets(
    [
      { label: '3 mod 7', values: { a: 3, n: 7 } },
      { label: '4 mod 10', values: { a: 4, n: 10 } },
      { label: '5 mod 12', values: { a: 5, n: 12 } },
    ],
    (vals) => {
      Object.assign(p, vals);
      sn.value = p.n;
      sa.value = p.a;
      ctx.refresh();
    },
  );

  return {
    steps() {
      let g = gcdN(p.a, p.n);
      let x = null;
      for (let i = 1; i < p.n; i++) if ((p.a * i) % p.n === 1) x = i;
      this.x = x;
      return [
        L('basics.divide.meaning', { a: p.a }),
        L('basics.divide.try', { a: p.a }),
        x !== null ? L('basics.divide.found', { a: p.a, x, ax: p.a * x, n: p.n }) : L('basics.divide.none', { g }),
      ];
    },

    show(k, prev) {
      let animate = k === prev + 1;
      let A = ctx.anim;
      let rotor = makeRotor(p.n);
      rotor.target(1, k >= 2 && this.x !== null ? 'hit' : '');
      let landed = [];
      if (k >= 1) {
        let prevV = 0;
        for (let i = 1; i < p.n; i++) {
          let val = (p.a * i) % p.n;
          let hit = val === 1;
          rotor.jump(prevV, val, k >= 2 && hit ? 'is-now' : '');
          landed.push(rotor.peg(val, k >= 2 && hit ? 'is-now' : ''));
          prevV = val;
        }
      }
      rotor.turnTo(k >= 2 && this.x !== null ? 1 : 0, { anim: null });
      let blocks = [chips];
      if (k >= 1) {
        blocks.push(
          h(
            'p',
            { class: 'line seq seq-wrap' },
            Array.from({ length: p.n - 1 }, (_, i) => {
              let val = (p.a * (i + 1)) % p.n;
              return h('span', { class: k >= 2 && val === 1 ? 'is-hit' : '', html: `${p.a}·${i + 1}<span class="op">→</span>${val}` });
            }),
          ),
        );
      }
      if (k >= 2) blocks.push(h('p', { class: `line big ${this.x !== null ? 'is-now' : 'eve'}` }, this.x !== null ? `${p.a}⁻¹ = ${this.x}` : T(L('basics.divide.noInverse'))));
      ctx.canvas.replaceChildren(work(...blocks), figure(rotor.el));
      answer.textContent = k >= 2 ? (this.x !== null ? String(this.x) : '—') : '?';
      answer.classList.toggle('eve', k >= 2 && this.x === null);

      if (!animate) return;
      if (k === 1) {
        let jumps = [...rotor.el.querySelectorAll('.jump')];
        jumps.forEach((jp, i) => A.draw(jp, { delay: stagger(i, jumps.length, 1800, 220), duration: 320 }));
        landed.forEach((pg, i) => A.appear(pg, { from: 'scale', delay: stagger(i, landed.length, 1800, 220) + 250, duration: 260 }));
        ctx.canvas.querySelectorAll('.seq span').forEach((s, i) => A.appear(s, { from: 'fade', delay: stagger(i, landed.length, 1800, 220) + 250, duration: 260 }));
      }
      if (k === 2) A.pulse(answer, { delay: 200 });
    },
  };
}

export const mode = {
  scenes: [
    { id: 'mod', title: L('basics.mod.title'), create: clockScene },
    { id: 'tables', title: L('basics.tables.title'), create: tableScene },
    { id: 'primes', title: L('basics.primes.title'), create: sieveScene },
    { id: 'gcd', title: L('basics.gcd.title'), create: gcdScene },
    { id: 'powers', title: L('basics.powers.title'), create: powersScene },
    { id: 'divide', title: L('basics.divide.title'), create: divideScene },
  ],
};
