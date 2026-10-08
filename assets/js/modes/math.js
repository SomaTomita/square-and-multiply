import * as nt from '../nt.js';
import { h, svg, T, L, v, fmt, rng } from '../ui.js';
import { render } from '../i18n.js';
import { makeRotor } from '../rotor.js';
import { setFormula, op, param, presets, ledger, line, rollTo, stagger, work, figure } from '../kit.js';

const B = (x) => BigInt(x);

function sup(x) {
  return `<sup>${x}</sup>`;
}

// ================================================================ square and multiply

function powScene(ctx) {
  let p = { a: 5, e: 9, n: 11 };
  let t = null;
  let answer = h('span', { class: 'answer' }, '?');

  let sa = param(ctx, p, 'a', { min: 0, max: 99999, label: 'a' });
  let se = param(ctx, p, 'e', { min: 0, max: 65535, label: 'e' });
  let sn = param(ctx, p, 'n', { min: 2, max: 99999, label: 'n' });
  setFormula(ctx.formula, h('span', {}, sa.el, h('sup', {}, se.el)), op('mod'), sn, op('='), answer);

  let chips = presets(
    [
      { label: '5<sup>9</sup> mod 11', values: { a: 5, e: 9, n: 11 } },
      { label: '3<sup>200</sup> mod 50', values: { a: 3, e: 200, n: 50 } },
      { label: '21<sup>113</sup> mod 1829', values: { a: 21, e: 113, n: 1829 } },
    ],
    (vals) => {
      Object.assign(p, vals);
      sa.value = p.a;
      se.value = p.e;
      sn.value = p.n;
      ctx.refresh();
    },
  );

  function focus(k) {
    let nRows = t.rows.length;
    let U = t.partials.length;
    if (k === 0) return t.a;
    if (k <= nRows) return t.rows[k - 1].value;
    if (k <= nRows + U) return t.partials[k - nRows - 1].acc;
    return t.result;
  }

  return {
    steps() {
      t = nt.powTrace(B(p.a), B(p.e), B(p.n));
      let nRows = t.rows.length;
      let out = [L('math.pow.binary', { e: fmt(t.e), bits: t.bits })];
      for (let r of t.rows) {
        if (r.i === 0) {
          out.push(L('math.pow.row0', { v: fmt(r.value) }));
        } else {
          let prev = t.rows[r.i - 1].value;
          out.push(L('math.pow.square', { prev: fmt(prev), n: fmt(t.n), v: fmt(r.value) }));
        }
      }
      let acc = 1n;
      for (let q of t.partials) {
        out.push(L('math.pow.multiply', { i: q.i, acc: fmt(acc), v: fmt(q.value), n: fmt(t.n), out: fmt(q.acc) }));
        acc = q.acc;
      }
      let sq = nRows - 1;
      let mul = Math.max(t.partials.length - 1, 0);
      out.push(
        L('math.pow.done', {
          expr: `${fmt(t.a)}${sup(fmt(t.e))} mod ${fmt(t.n)}`,
          result: fmt(t.result),
          sq,
          mul,
        }),
      );
      return out;
    },

    show(k, prev) {
      let animate = k === prev + 1;
      let A = ctx.anim;
      let nRows = t.rows.length;
      let U = t.partials.length;
      let phase = k === 0 ? 'bits' : k <= nRows ? 'square' : k <= nRows + U ? 'multiply' : 'done';
      let rowNow = phase === 'square' ? k - 1 : -1;
      let partNow = phase === 'multiply' ? k - nRows - 1 : -1;
      let usedCount = phase === 'done' ? U : phase === 'multiply' ? partNow + 1 : 0;
      let usedRows = new Set(t.partials.slice(0, usedCount).map((q) => q.i));

      // ---- bits, most significant first
      let bitsEl = h(
        'span',
        { class: 'bits', 'aria-label': render(L('math.pow.binaryAria', { bits: t.bits })) },
        [...t.bits].map((b, j) => {
          let i = nRows - 1 - j;
          let cls = `bit${b === '1' ? ' one' : ''}${i === rowNow ? ' is-now' : ''}`;
          return h('span', { class: cls }, b);
        }),
      );
      let bitsLine = h('p', { class: 'line pow-bits' }, h('span', { html: `${v('e')} = ` }), bitsEl, h('sub', {}, '2'));

      // ---- ledger
      let rows = t.rows.map((r) => {
        let reached = phase !== 'bits' && (phase !== 'square' || r.i <= rowNow);
        let cls = !reached ? 'is-ahead' : r.i === rowNow ? 'is-now' : '';
        if (phase === 'multiply' && t.partials[partNow].i === r.i) cls = 'is-now';
        let markCls = `mark${reached && r.bit ? ' on' : ''}`;
        return {
          cls,
          cells: [String(r.i), `${fmt(t.a)}${sup(fmt(r.pow2))}`, r.value, h('span', { class: markCls, 'aria-label': render(L('math.pow.bitValue', { b: r.bit ? 1 : 0 })) })],
          cellCls: ['dim', 'dim', usedRows.has(r.i) && cls !== 'is-now' ? 'used' : '', ''],
        };
      });
      let table = ledger(['i', `${v('a')}${sup(`2${sup(v('i'))}`)}`, `mod ${fmt(t.n)}`, T(L('math.pow.colBit'))], rows);

      // ---- product lines
      let lines = [];
      if (phase === 'multiply' || phase === 'done') {
        let acc = 1n;
        let upto = phase === 'done' ? U : partNow + 1;
        for (let j = 0; j < upto; j++) {
          let q = t.partials[j];
          lines.push(
            line(`${fmt(acc)} <span class="op">·</span> ${fmt(q.value)} <span class="op">≡</span> ${fmt(q.acc)}`, j === partNow ? 'is-now' : ''),
          );
          acc = q.acc;
        }
      }
      let result = phase === 'done' ? h('p', { class: 'line big is-now' }, `= ${fmt(t.result)}`) : null;

      ctx.canvas.replaceChildren(work(chips, bitsLine, table, h('div', { class: 'pow-lines' }, lines, result)));

      // ---- rotor
      let rotor = makeRotor(t.n);
      let f = focus(k);
      if (phase === 'square' || phase === 'bits') {
        let upto = phase === 'bits' ? 0 : rowNow;
        for (let i = 1; i <= upto; i++) rotor.jump(t.rows[i - 1].value, t.rows[i].value, i === rowNow ? 'is-now' : '');
        for (let i = 0; i <= upto; i++) rotor.peg(t.rows[i].value, i === upto ? 'is-now' : '');
      } else {
        for (let q of t.partials) rotor.peg(q.value, '');
        let acc = 1n;
        let upto = phase === 'done' ? U : partNow + 1;
        for (let j = 0; j < upto; j++) {
          let q = t.partials[j];
          rotor.jump(acc, q.acc, j === upto - 1 ? 'is-now' : '');
          acc = q.acc;
        }
        rotor.peg(f, 'is-now');
        if (phase === 'done') rotor.target(t.result, 'hit');
      }
      rotor.turnTo(f, { from: animate ? focus(prev) : null, anim: A });
      ctx.canvas.append(figure(rotor.el));
      answer.textContent = phase === 'done' ? fmt(t.result) : '?';

      if (!animate) return;
      if (phase === 'bits') {
        bitsEl.querySelectorAll('.bit').forEach((b, j) => A.appear(b, { from: 'drop', delay: stagger(j, nRows, 500) }));
      }
      let nowRow = table.querySelector('tr.is-now');
      if (nowRow) A.appear(nowRow, { from: 'write', duration: 600, delay: 150 });
      let nowJump = rotor.el.querySelector('.jump.is-now');
      if (nowJump) A.draw(nowJump, { delay: 250, duration: 650 });
      let nowPeg = rotor.el.querySelector('.peg.is-now .peg-inner');
      if (nowPeg) A.appear(nowPeg, { from: 'scale', delay: 700 });
      let nowLine = ctx.canvas.querySelector('.pow-lines .line.is-now:not(.big)');
      if (nowLine) A.appear(nowLine, { from: 'left', delay: 200 });
      if (result) {
        A.appear(result, { from: 'rise', delay: 200 });
        A.pulse(answer, { delay: 500 });
      }
    },
  };
}

// ================================================================ extended Euclid

function euclidScene(ctx) {
  let p = { a: 101, n: 195 };
  let t = null;
  let tiles = null;
  let answer = h('span', { class: 'answer' }, '?');
  let sa = param(ctx, p, 'a', { min: 1, max: 99999, label: 'a' });
  let sn = param(ctx, p, 'n', { min: 2, max: 99999, label: 'n' });
  setFormula(ctx.formula, h('span', {}, sa.el, h('sup', { html: '−1' })), op('mod'), sn, op('='), answer);

  let chips = presets(
    [
      { label: '101<sup>−1</sup> mod 195', values: { a: 101, n: 195 } },
      { label: '17<sup>−1</sup> mod 3120', values: { a: 17, n: 3120 } },
      { label: L('math.inverse.presetPair', { a: 1624, b: 6363 }), values: { a: 1624, n: 6363 } },
    ],
    (vals) => {
      Object.assign(p, vals);
      sa.value = p.a;
      sn.value = p.n;
      ctx.refresh();
    },
  );

  function drawTiles(upto, nowStep) {
    let W = Number(t.n);
    let H = Number(t.a);
    let root = svg('svg', {
      class: 'tiling',
      viewBox: `0 0 ${W} ${H}`,
      preserveAspectRatio: 'xMidYMid meet',
      role: 'img',
      'aria-label': render(L('math.inverse.tilingAria', { w: W, h: H })),
    });
    root.append(svg('rect', { x: 0, y: 0, width: W, height: H, class: 'tile-frame' }));
    let rect = { x: 0, y: 0, w: W, h: H };
    let groups = [];
    tiles.steps.forEach((s, j) => {
      if (j >= upto) return;
      let side = Number(s.b);
      let q = Number(s.q);
      let horizontal = rect.w >= rect.h;
      let g = svg('g', { class: `tile-step${j === nowStep ? ' is-now' : ''}` });
      let drawn = Math.min(q, 24);
      for (let c = 0; c < drawn; c++) {
        let span = c === drawn - 1 && q > drawn ? side * (q - drawn + 1) : side;
        let x = horizontal ? rect.x + c * side : rect.x;
        let y = horizontal ? rect.y : rect.y + c * side;
        let w = horizontal ? span : side;
        let hh = horizontal ? side : span;
        let sq = svg('rect', { x, y, width: w, height: hh, class: 'tile' });
        g.append(sq);
        if (side / Math.max(W, H) > 0.07 && c === 0) {
          let label = svg('text', { x: x + w / 2, y: y + hh / 2, class: 'tile-label', style: `font-size:${side * 0.28}px` }, fmt(s.b));
          g.append(label);
        }
      }
      if (horizontal) {
        rect = { x: rect.x + q * side, y: rect.y, w: rect.w - q * side, h: rect.h };
      } else {
        rect = { x: rect.x, y: rect.y + q * side, w: rect.w, h: rect.h - q * side };
      }
      groups.push(g);
      root.append(g);
    });
    return { root, groups };
  }

  return {
    steps() {
      let a = B(p.a) % B(p.n);
      if (a === 0n) {
        throw new nt.NtError(
          `${p.a} is a multiple of ${p.n}, so it has no inverse.`,
          `${p.a} は ${p.n} の倍数なので逆元はありません。`,
          'err.math.multipleOf',
          { a: p.a, n: p.n },
        );
      }
      t = { ...nt.egcdTable(B(p.n), a), a, n: B(p.n) };
      tiles = nt.euclidSquares(t.n, t.a);
      let rows = t.rows;
      let out = [L('math.inverse.start', { n: fmt(t.n), a: fmt(t.a) })];
      for (let j = 2; j < rows.length; j++) {
        out.push(
          L('math.inverse.cut', {
            big: fmt(rows[j - 2].r),
            small: fmt(rows[j - 1].r),
            q: fmt(rows[j - 1].q),
            rest: fmt(rows[j].r),
          }),
        );
      }
      if (t.inverse !== null) {
        out.push(L('math.inverse.found', { a: fmt(t.a), t: fmt(t.t), inv: fmt(t.inverse) }));
      } else {
        out.push(L('math.inverse.none', { g: fmt(t.gcd) }));
      }
      return out;
    },

    show(k, prev) {
      let animate = k === prev + 1;
      let A = ctx.anim;
      let m = t.rows.length;
      let last = m - 1;
      let reachedRow = Math.min(k + 1, m - 1);
      let done = k === last;
      let rows = t.rows.map((r, i) => {
        let reached = i <= reachedRow;
        let cls = !reached ? 'is-ahead' : i === reachedRow && k > 0 && !done ? 'is-now' : '';
        return {
          cls: done && i === m - 1 ? 'is-now' : cls,
          cells: [String(i), r.r, r.q ?? '', r.s, r.t],
          cellCls: ['dim', '', 'dim', 'dim', ''],
        };
      });
      let table = ledger(['i', v('r'), v('q'), v('s'), v('t')], rows);
      let invariant = line(`${v('r')} <span class="op">=</span> ${fmt(t.n)}${v('s')} <span class="op">+</span> ${fmt(t.a)}${v('t')}`, 'dim-line');
      let result = null;
      if (done) {
        result =
          t.inverse !== null
            ? h(
                'p',
                { class: 'line big is-now' },
                h('span', { html: `${fmt(t.a)}<sup>−1</sup> ≡ ${fmt(t.t)} ≡ ${fmt(t.inverse)}` }),
              )
            : h('p', { class: 'line big eve' }, `gcd = ${fmt(t.gcd)}`);
      }
      ctx.canvas.replaceChildren(work(chips, invariant, table, result));

      let cut = done ? tiles.steps.length : k;
      let { root, groups } = drawTiles(cut, cut - 1);
      ctx.canvas.append(figure(h('div', { class: 'tiling-wrap' }, root)));
      answer.textContent = done ? (t.inverse !== null ? fmt(t.inverse) : '—') : '?';

      if (!animate) return;
      let g = groups[groups.length - 1];
      if (g) {
        let tilesNow = [...g.querySelectorAll('.tile')];
        tilesNow.forEach((r, i) => A.appear(r, { from: 'scale', delay: stagger(i, tilesNow.length, 700) + 100, duration: 420 }));
      }
      let nowRow = table.querySelector('tr.is-now');
      if (nowRow) A.appear(nowRow, { from: 'write', delay: 300, duration: 600 });
      if (result) {
        A.appear(result, { from: 'rise', delay: 300 });
        A.pulse(answer, { delay: 600 });
      }
    },
  };
}

// ================================================================ CRT

function crtScene(ctx) {
  let p = { a1: 4, m1: 19, a2: 7, m2: 11, a3: 1, m3: 7 };
  let sieve = null;
  let formulaT = null;
  let answer = h('span', { class: 'answer' }, '?');
  let scrubs = {};

  function congruence(i, tone) {
    let m = param(ctx, p, `m${i}`, {
      min: 2,
      max: 60,
      label: `m${i}`,
      after: (x) => {
        if (p[`a${i}`] >= x) {
          p[`a${i}`] = x - 1;
          scrubs[`a${i}`].value = x - 1;
        }
      },
    });
    let a = param(ctx, p, `a${i}`, { min: 0, max: 59, label: `a${i}`, accept: (x) => x < p[`m${i}`], tone });
    scrubs[`a${i}`] = a;
    scrubs[`m${i}`] = m;
    return h('div', { class: 'congruence' }, h('var', {}, 'x'), op('≡'), a.el, h('span', {}, op('(mod '), m.el, op(')')));
  }

  setFormula(
    ctx.formula,
    h('div', { class: 'system' }, congruence(1, 'alice'), congruence(2, 'bob'), congruence(3, 'eve')),
    h('div', { class: 'system-answer' }, h('var', {}, 'x'), op('='), answer),
  );

  let chips = presets(
    [
      { label: '4, 7, 1 mod 19, 11, 7', values: { a1: 4, m1: 19, a2: 7, m2: 11, a3: 1, m3: 7 } },
      { label: '2, 3, 2 mod 3, 5, 7', values: { a1: 2, m1: 3, a2: 3, m2: 5, a3: 2, m3: 7 } },
    ],
    (vals) => {
      Object.assign(p, vals);
      for (let [key, s] of Object.entries(scrubs)) s.value = p[key];
      ctx.refresh();
    },
  );

  let list = () => [1, 2, 3].map((i) => ({ a: B(p[`a${i}`]), m: B(p[`m${i}`]) }));
  let tones = ['alice', 'bob', 'eve'];

  return {
    steps() {
      formulaT = nt.crtTrace(list());
      sieve = nt.crtSieve(list(), 80);
      let out = [L('math.crt.start', { a: p.a1, a2: p.a1 + p.m1, a3: p.a1 + 2 * p.m1, m: p.m1 })];
      for (let s of sieve.stages) {
        out.push(L('math.crt.walk', { m: fmt(s.m), a: fmt(s.a), hit: fmt(s.hit) }));
      }
      out.push(
        L('math.crt.check', {
          sum: `Σ ${v('a')}${sub('i')}${v('M')}${sub('i')}${v('y')}${sub('i')}`,
          M: fmt(formulaT.M),
          x: fmt(formulaT.x),
        }),
      );
      return out;
    },

    show(k, prev) {
      let animate = k === prev + 1;
      let A = ctx.anim;
      let J = sieve.stages.length;
      let done = k === J + 1;
      answer.textContent = done ? fmt(formulaT.x) : '?';

      let blocks = [chips];
      let fig;
      if (k === 0) {
        let rotor = makeRotor(p.m1);
        let seq = [0, 1, 2, 3].map((i) => B(p.a1) + B(i) * B(p.m1));
        rotor.peg(p.a1, 'is-now alice');
        rotor.target(p.a1, 'hit');
        rotor.turnTo(p.a1, { anim: null });
        blocks.push(
          h(
            'p',
            { class: 'line candidates' },
            seq.map((x, i) => h('span', { class: `cand alice${i === 0 ? ' is-hit' : ''}` }, fmt(x))),
            h('span', { class: 'op' }, '…'),
          ),
        );
        fig = rotor.el;
      } else if (!done) {
        let s = sieve.stages[k - 1];
        let tone = tones[k];
        let rotor = makeRotor(s.m);
        rotor.target(s.a, 'hit');
        let prevR = null;
        s.candidates.forEach((c, i) => {
          if (prevR !== null) rotor.jump(prevR, c.r, c.ok ? 'is-now' : '');
          rotor.peg(c.r, c.ok ? `is-now ${tone}` : '');
          prevR = c.r;
        });
        rotor.turnTo(s.hit % s.m, { anim: null });
        fig = rotor.el;
        blocks.push(
          ledger(
            [v('x'), `mod ${fmt(s.m)}`],
            s.candidates.map((c) => ({ cls: c.ok ? 'is-now' : '', cells: [c.v, c.r], cellCls: ['', c.ok ? '' : 'dim'] })),
          ),
        );
        if (animate) {
          let pegs = [...rotor.el.querySelectorAll('.peg-inner')];
          let jumps = [...rotor.el.querySelectorAll('.jump')];
          let n = s.candidates.length;
          pegs.forEach((pg, i) => A.appear(pg, { from: 'scale', delay: 250 + stagger(i, n, 1400, 260), duration: 380 }));
          jumps.forEach((jp, i) => A.draw(jp, { delay: 250 + stagger(i + 1, n, 1400, 260) - 120, duration: 300 }));
        }
      } else {
        let rows = formulaT.terms.map((tm, i) => ({
          cls: '',
          cells: [h('span', { class: tones[i] }, fmt(tm.a)), tm.m, tm.Mi, tm.yi, tm.term],
          cellCls: ['', 'dim', '', '', ''],
        }));
        blocks.push(
          line(`${v('M')} = ${formulaT.terms.map((tm) => fmt(tm.m)).join(' · ')} = ${fmt(formulaT.M)}`),
          ledger([v('a') + sub('i'), v('m') + sub('i'), `${v('M')}${sub('i')} = ${v('M')}/${v('m')}${sub('i')}`, `${v('y')}${sub('i')} = ${v('M')}${sub('i')}${sup('−1')}`, `${v('a')}${sub('i')}${v('M')}${sub('i')}${v('y')}${sub('i')}`], rows),
          h('p', { class: 'line big is-now' }, `x = ${fmt(formulaT.x)}`),
        );
        let rotor = makeRotor(formulaT.M);
        rotor.peg(formulaT.x, 'is-now');
        rotor.target(formulaT.x, 'hit');
        rotor.turnTo(formulaT.x, { anim: null });
        fig = rotor.el;
      }
      ctx.canvas.replaceChildren(work(...blocks), figure(fig));
      if (animate && done) {
        let rows = [...ctx.canvas.querySelectorAll('.ledger tbody tr')];
        rows.forEach((r, i) => A.appear(r, { from: 'write', delay: 150 + i * 220, duration: 500 }));
        A.pulse(answer, { delay: 900 });
      }
    },
  };
}

function sub(x) {
  return `<sub>${x}</sub>`;
}

const SUPERSCRIPT = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };

// Unicode superscripts, for places that hold plain text (SVG labels, rolling numbers).
function superscript(nm) {
  return [...String(nm)].map((c) => SUPERSCRIPT[c] ?? c).join('');
}

// ================================================================ phi and lambda

function phiScene(ctx) {
  let p = { n: 100 };
  let data = null;
  let phiOut = h('span', { class: 'answer' }, '?');
  let lamOut = h('span', { class: 'answer' }, '?');
  let sn = param(ctx, p, 'n', { min: 2, max: 900, label: 'n' });
  setFormula(
    ctx.formula,
    h('span', { class: 'fn' }, h('span', { html: 'φ(' }), sn.el, ')'),
    op('='),
    phiOut,
    h('span', { class: 'fn-gap' }),
    h('span', { html: 'λ(<var>n</var>)' }),
    op('='),
    lamOut,
  );

  let chips = presets(
    [
      { label: '100', values: { n: 100 } },
      { label: '133', values: { n: 133 } },
      { label: '8', values: { n: 8 } },
      { label: '561', values: { n: 561 } },
    ],
    (vals) => {
      p.n = vals.n;
      sn.value = p.n;
      ctx.refresh();
    },
  );

  function compute() {
    let n = p.n;
    let factors = nt.factorize(B(n));
    let primes = factors.map((f) => Number(f.p));
    let struckBy = new Array(n + 1).fill(0);
    primes.forEach((q, j) => {
      for (let x = q; x <= n; x += q) if (!struckBy[x]) struckBy[x] = j + 1;
    });
    let orders = new Map();
    for (let a = 1; a <= n; a++) {
      if (struckBy[a] || (n === 1)) continue;
      let o = Number(nt.order(B(a), B(n)));
      orders.set(a, o);
    }
    let lam = nt.carmichael(B(n));
    return { n, factors, primes, struckBy, orders, phi: nt.phi(B(n)), lam };
  }

  return {
    steps() {
      data = compute();
      let fac = data.factors.map((f) => `${f.p}${f.k > 1 ? sup(f.k) : ''}`).join(' · ');
      let out = [L('math.phi.layout', { n: data.n }), L('math.phi.factor', { n: data.n, fac })];
      for (let q of data.primes) {
        out.push(L('math.phi.strike', { q, n: data.n }));
      }
      out.push(L('math.phi.left', { n: data.n, phi: fmt(data.phi) }));
      out.push(L('math.phi.order', { n: data.n, lam: fmt(data.lam.value) }));
      return out;
    },

    show(k, prev) {
      let animate = k === prev + 1;
      let A = ctx.anim;
      let P = data.primes.length;
      let strikeUpto = k < 2 ? 0 : Math.min(k - 1, P);
      let counted = k >= 2 + P;
      let ordered = k >= 3 + P;
      let n = data.n;
      let cols = Math.ceil(Math.sqrt(n * 1.25));
      let rowsN = Math.ceil(n / cols);
      let cell = 10;
      let lamV = Number(data.lam.value);
      let root = svg('svg', {
        class: 'grid-fig',
        viewBox: `0 0 ${cols * cell} ${rowsN * cell}`,
        role: 'img',
        'aria-label': render(L('math.phi.gridAria', { n })),
      });
      let cells = [];
      for (let x = 1; x <= n; x++) {
        let c = (x - 1) % cols;
        let r = Math.floor((x - 1) / cols);
        let sb = data.struckBy[x];
        let struck = sb && sb <= strikeUpto;
        let nowStrike = sb && sb === strikeUpto && k === 1 + strikeUpto && k >= 2;
        let cls = `cell${struck ? ' struck' : ''}${nowStrike ? ' is-now' : ''}${counted && !sb ? ' kept' : ''}`;
        let g = svg('g', { class: cls, transform: `translate(${c * cell} ${r * cell})` });
        let rect = svg('rect', { x: 0.6, y: 0.6, width: cell - 1.2, height: cell - 1.2, rx: 1.2 });
        if (ordered && !sb) {
          let o = data.orders.get(x);
          rect.style.fillOpacity = String(0.25 + 0.75 * (o / lamV));
          if (o === lamV) g.classList.add('max-order');
        }
        g.append(rect);
        if (n <= 400) g.append(svg('text', { x: cell / 2, y: cell / 2, class: 'cell-n', style: `font-size:${n <= 100 ? 3.6 : 3}px` }, String(x)));
        cells.push({ x, g, nowStrike });
        root.append(g);
      }

      let blocks = [chips];
      if (k >= 1) {
        blocks.push(
          h(
            'p',
            { class: 'line factor-line' },
            h('span', {}, `${n} = `),
            data.factors.map((f, j) =>
              h('span', { class: `factor${strikeUpto > j ? ' done' : ''}${strikeUpto === j + 1 && !counted ? ' is-now' : ''}`, html: `${f.p}${f.k > 1 ? sup(f.k) : ''}` }),
            ),
          ),
        );
      }
      if (counted) {
        let phiTerms = data.factors
          .map((f) => `${f.k > 1 ? `${f.p}${f.k > 2 ? sup(f.k - 1) : ''}` : ''}(${f.p} − 1)`)
          .join(' · ');
        blocks.push(line(`φ(${n}) = ${phiTerms} = ${fmt(data.phi)}`, ordered ? '' : 'is-now'));
      }
      if (ordered) {
        let hist = new Map();
        for (let o of data.orders.values()) hist.set(o, (hist.get(o) ?? 0) + 1);
        let keys = [...hist.keys()].toSorted((a, b) => a - b);
        let maxCount = Math.max(...hist.values());
        blocks.push(
          h(
            'div',
            { class: 'orders', role: 'img', 'aria-label': render(L('math.phi.ordersAria')) },
            keys.map((o) =>
              h(
                'div',
                { class: `order-bar${o === lamV ? ' is-max' : ''}` },
                h('span', { class: 'order-fill', style: { '--h': String(hist.get(o) / maxCount) } }),
                h('span', { class: 'order-k' }, String(o)),
              ),
            ),
          ),
          line(
            `λ(${n}) = lcm(${data.lam.parts.map((pt) => fmt(pt.v)).join(', ')}) = ${fmt(data.lam.value)}`,
            'is-now',
          ),
        );
      }
      ctx.canvas.replaceChildren(work(...blocks), figure(h('div', { class: 'grid-wrap' }, root)));
      phiOut.textContent = counted ? fmt(data.phi) : '?';
      lamOut.textContent = ordered ? fmt(data.lam.value) : '?';

      if (!animate) return;
      if (k === 0) {
        cells.forEach((c, i) => A.appear(c.g, { from: 'fade', delay: stagger(i, cells.length, 900, 12), duration: 300 }));
      }
      let striking = cells.filter((c) => c.nowStrike);
      striking.forEach((c, i) => A.strike(c.g, { delay: 150 + stagger(i, striking.length, 900, 40) }));
      if (counted && !ordered) {
        A.pulse(phiOut, { delay: 300 });
        rollTo(phiOut, 0, data.phi, A, { delay: 100, duration: 800 });
      }
      if (ordered) {
        ctx.canvas.querySelectorAll('.order-fill').forEach((b, i) => A.run(b, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { delay: 150 + i * 70, duration: 600 }));
        A.pulse(lamOut, { delay: 700 });
      }
    },
  };
}

// ================================================================ Miller–Rabin

function mrScene(ctx) {
  let p = { n: 561, a: 2 };
  let t = null;
  let verdict = h('span', { class: 'answer' }, '?');
  let sn = param(ctx, p, 'n', { min: 5, max: 999999, label: 'n', accept: (x) => x % 2 === 1, after: (x) => { if (p.a > x - 2) { p.a = 2; sa.value = 2; } } });
  let sa = param(ctx, p, 'a', { min: 2, max: 999997, label: 'a', accept: (x) => x <= p.n - 2, tone: 'alice' });
  setFormula(
    ctx.formula,
    h('span', {}, sn.el),
    h('span', { class: 'op' }, T(L('math.mr.primeQ'))),
    h('span', { class: 'op', html: '<var>a</var> =' }),
    sa,
    op('→'),
    verdict,
  );

  let chips = presets(
    [
      { label: '561, a = 2', values: { n: 561, a: 2 } },
      { label: '33, a = 10', values: { n: 33, a: 10 } },
      { label: '2047, a = 2', values: { n: 2047, a: 2 } },
      { label: '97, a = 5', values: { n: 97, a: 5 } },
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
      t = nt.mrTrace(B(p.n), B(p.a));
      t.prime = nt.isPrime(B(p.n));
      let out = [L('math.mr.halve', { nm1: fmt(t.n - 1n), s: t.s, d: fmt(t.d) })];
      t.seq.forEach((x, j) => {
        let tail = x === 1n ? 'One' : x === t.n - 1n ? 'Minus' : '';
        if (j === 0) {
          out.push(L(`math.mr.first${tail}`, { expr: `${fmt(t.a)}${sup(fmt(t.d))} mod ${fmt(t.n)}`, x: fmt(x) }));
        } else {
          out.push(L(`math.mr.square${tail}`, { prev: fmt(t.seq[j - 1]), n: fmt(t.n), x: fmt(x) }));
        }
      });
      if (t.passes) {
        out.push(t.prime ? L('math.mr.prime', { n: fmt(t.n) }) : L('math.mr.liar', { n: fmt(t.n), a: fmt(t.a) }));
      } else {
        out.push(L('math.mr.witness', { a: fmt(t.a), n: fmt(t.n) }));
      }
      return out;
    },

    show(k, prev) {
      let animate = k === prev + 1;
      let A = ctx.anim;
      let s = t.s;
      let done = k === s + 1;
      let upto = Math.min(k - 1, s - 1);
      let rotor = makeRotor(t.n);
      let one = rotor.target(1n, '');
      let minus = rotor.target(t.n - 1n, '');
      for (let j = 0; j <= upto; j++) {
        if (j > 0) rotor.jump(t.seq[j - 1], t.seq[j], j === upto && !done ? 'is-now' : '');
        let x = t.seq[j];
        rotor.peg(x, j === upto ? 'is-now' : '');
        if (x === 1n) one.classList.add('hit');
        if (x === t.n - 1n) minus.classList.add('hit');
      }
      let focusOf = (kk) => (kk <= 0 ? 1n : t.seq[Math.min(kk - 1, s - 1)]);
      rotor.turnTo(focusOf(k), { from: animate ? focusOf(prev) : null, anim: A });

      let chain = h(
        'p',
        { class: 'line halving' },
        t.halvings.map((x, j) => [j ? h('span', { class: 'op', html: '÷2→' }) : null, h('span', { class: j === t.halvings.length - 1 ? 'is-hit' : '' }, fmt(x))]),
      );
      let rows = t.seq.map((x, j) => {
        let reached = k >= 1 && j <= upto;
        return {
          cls: !reached ? 'is-ahead' : j === upto && !done ? 'is-now' : '',
          cells: [String(j), `${fmt(t.a)}${sup(`${j ? `2${sup(j)}·` : ''}${fmt(t.d)}`)}`, x === t.n - 1n ? '−1' : fmt(x)],
          cellCls: ['dim', 'dim', x === 1n || x === t.n - 1n ? 'used' : ''],
        };
      });
      let blocks = [chips, chain, ledger(['j', '', `mod ${fmt(t.n)}`], rows)];
      if (done) {
        blocks.push(
          h(
            'p',
            { class: `line big ${t.passes ? 'is-now' : 'eve'}` },
            T(L(t.passes ? (t.prime ? 'math.mr.probablyPrime' : 'math.mr.liarWord') : 'math.mr.composite')),
          ),
          line(`Fermat: ${fmt(t.a)}${sup(`${v('n')}−1`)} mod ${fmt(t.n)} = ${fmt(t.fermat)}`, 'dim-line'),
        );
      }
      ctx.canvas.replaceChildren(work(...blocks), figure(rotor.el));
      verdict.replaceChildren(done ? T(L(t.passes ? 'math.mr.pass' : 'math.mr.witnessWord')) : '?');
      verdict.classList.toggle('eve', done && !t.passes);

      if (!animate) return;
      if (k === 0) chain.querySelectorAll('span').forEach((el, i) => A.appear(el, { from: 'left', delay: i * 90 }));
      let nowJump = rotor.el.querySelector('.jump.is-now');
      if (nowJump) A.draw(nowJump, { delay: 200, duration: 650 });
      let nowPeg = rotor.el.querySelector('.peg.is-now .peg-inner');
      if (nowPeg) A.appear(nowPeg, { from: 'scale', delay: 650 });
      let nowRow = ctx.canvas.querySelector('tr.is-now');
      if (nowRow) A.appear(nowRow, { from: 'write', delay: 150, duration: 550 });
      if (done) A.pulse(verdict, { delay: 300 });
    },
  };
}

// ================================================================ birthday bound

function birthdayScene(ctx) {
  let p = { b: 64, t: 32, seed: 7 };
  let pOut = h('span', { class: 'answer' }, '?');
  let sb = param(ctx, p, 'b', { min: 8, max: 256, label: 'log2 N', after: (x) => { if (p.t > x) { p.t = x; st.value = x; } } });
  let st = param(ctx, p, 't', { min: 0, max: 256, label: 'log2 q', accept: (x) => x <= p.b, tone: 'alice' });
  setFormula(
    ctx.formula,
    h('span', { html: 'P(<var>q</var> = 2' }, h('sup', {}, st.el), ','),
    h('span', { html: '<var>N</var> = 2' }, h('sup', {}, sb.el), ')'),
    op('≈'),
    pOut,
  );

  let chips = presets(
    [
      { label: L('math.birthday.presetBlock', { b: 64 }), values: { b: 64, t: 32 } },
      { label: L('math.birthday.presetBlock', { b: 128 }), values: { b: 128, t: 48 } },
      { label: L('math.birthday.presetHash', { b: 160 }), values: { b: 160, t: 80 } },
    ],
    (vals) => {
      Object.assign(p, vals);
      sb.value = p.b;
      st.value = p.t;
      ctx.refresh();
    },
  );

  function prob(t, b) {
    return -Math.expm1(-(2 ** (2 * t - b - 1)));
  }

  function pct(x) {
    if (x >= 0.9995) return '≈ 100%';
    if (x < 1e-4) {
      let [m, e] = x.toExponential(1).split('e');
      return `${m}×10${superscript(Number(e))}`;
    }
    return `${(x * 100).toFixed(x < 0.01 ? 2 : 1)}%`;
  }

  function dataSize(t) {
    let bytes = 2 ** t * (p.b / 8);
    let units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB'];
    let u = 0;
    while (bytes >= 1024 && u < units.length - 1) {
      bytes /= 1024;
      u++;
    }
    if (bytes >= 1e6) return `2${superscript(Math.round(Math.log2(bytes)))} ${units[u]}`;
    return `${bytes >= 100 ? Math.round(bytes) : +bytes.toFixed(1)} ${units[u]}`;
  }

  let days = null;

  return {
    steps() {
      let r = rng(p.seed);
      let seen = new Map();
      let list = [];
      for (;;) {
        let d = Math.floor(r() * 365);
        list.push(d);
        if (seen.has(d)) {
          days = { list, first: seen.get(d), day: d };
          break;
        }
        seen.set(d, list.length - 1);
      }
      let P = prob(p.t, p.b);
      return [
        L('math.birthday.grows'),
        L('math.birthday.at', { t: p.t, b: p.b, p: pct(P) }),
        L('math.birthday.half', { h: p.b / 2 }),
        L('math.birthday.data', { h: p.b / 2, b: p.b, size: dataSize(p.b / 2) }),
        L('math.birthday.real', { n: days.list.length }),
      ];
    },

    show(k, prev) {
      let animate = k === prev + 1;
      let A = ctx.anim;
      let P = prob(p.t, p.b);
      pOut.textContent = k >= 1 ? pct(P) : '?';
      let blocks = [chips];
      let fig;

      if (k < 4) {
        let W = 300;
        let H = 170;
        let pad = { l: 34, r: 12, t: 12, b: 28 };
        let lo = Math.max(0, p.b / 2 - 12);
        let hi = Math.min(p.b, p.b / 2 + 6);
        let x = (t) => pad.l + ((Math.min(hi, Math.max(lo, t)) - lo) / (hi - lo)) * (W - pad.l - pad.r);
        let y = (pr) => pad.t + (1 - pr) * (H - pad.t - pad.b);
        let pts = [];
        for (let i = 0; i <= 240; i++) {
          let t = lo + ((hi - lo) * i) / 240;
          pts.push(`${x(t).toFixed(2)},${y(prob(t, p.b)).toFixed(2)}`);
        }
        let root = svg('svg', {
          class: 'curve',
          viewBox: `0 0 ${W} ${H}`,
          role: 'img',
          'aria-label': render(L('math.birthday.curveAria')),
        });
        root.append(
          svg('line', { x1: pad.l, y1: y(0), x2: W - pad.r, y2: y(0), class: 'axis' }),
          svg('line', { x1: pad.l, y1: y(0), x2: pad.l, y2: y(1), class: 'axis' }),
          svg('text', { x: pad.l - 6, y: y(1), class: 'axis-label end' }, '1'),
          svg('text', { x: pad.l - 6, y: y(0), class: 'axis-label end' }, '0'),
          svg('text', { x: pad.l, y: H - 8, class: 'axis-label' }, `2${superscript(lo)}`),
          svg('text', { x: W - pad.r, y: H - 8, class: 'axis-label end' }, `2${superscript(hi)}`),
        );
        let half = svg('g', { class: `half${k >= 2 ? ' is-on' : ''}` });
        half.append(
          svg('line', { x1: x(p.b / 2), y1: y(0), x2: x(p.b / 2), y2: y(1), class: 'half-line' }),
          svg('text', { x: x(p.b / 2), y: H - 8, class: 'axis-label mid' }, `2${superscript(p.b / 2)}`),
        );
        root.append(half);
        let path = svg('path', { d: `M ${pts.join(' L ')}`, class: 'curve-line' });
        root.append(path);
        let marker = null;
        if (k >= 1) {
          marker = svg('g', { class: 'marker', transform: `translate(${x(p.t)} ${y(P)})` });
          marker.append(svg('line', { x1: 0, y1: 0, x2: 0, y2: y(0) - y(P), class: 'marker-stem' }), svg('circle', { r: 4.5 }));
          root.append(marker);
        }
        fig = h('div', { class: 'curve-wrap' }, root);

        if (k >= 3) {
          let rowsT = [-16, -8, -4, -2, -1, 0, 1, 2].map((d) => p.b / 2 + d).filter((t) => t >= 0 && t <= p.b);
          blocks.push(
            ledger(
              [v('q'), T(L('math.birthday.colData')), 'P'],
              rowsT.map((t) => ({ cls: t === p.b / 2 ? 'is-now' : '', cells: [`2${sup(t)}`, dataSize(t), pct(prob(t, p.b))], cellCls: ['', 'dim', ''] })),
            ),
          );
        } else if (k >= 1) {
          blocks.push(h('p', { class: 'line big is-now' }, pct(P)));
        }
        if (animate && k === 0) A.draw(path, { duration: 1200 });
        if (animate && k === 1 && marker) A.appear(marker, { from: 'scale', delay: 200 });
        if (animate && k === 2) A.appear(half, { from: 'fade', duration: 600 });
      } else {
        let rotor = makeRotor(365, { hub: '365' });
        days.list.forEach((d, i) => {
          let hit = i === days.list.length - 1 || i === days.first;
          rotor.peg(d, hit ? 'is-now eve' : '');
        });
        rotor.target(days.day, 'hit');
        rotor.turnTo(days.day, { anim: null });
        fig = rotor.el;
        blocks.push(
          h('p', { class: 'line big is-now' }, T(L('math.birthday.person', { n: days.list.length }))),
          h('p', { class: 'line dim-line' }, T(L('math.birthday.p23', { p: pct(-Math.expm1(-(23 * 22) / (2 * 365))) }))),
          h(
            'button',
            {
              type: 'button',
              class: 'chip',
              onclick: () => {
                p.seed += 1;
                ctx.refresh();
              },
            },
            T(L('math.birthday.again')),
          ),
        );
        if (animate) {
          let pegs = [...rotor.el.querySelectorAll('.peg-inner')];
          pegs.forEach((pg, i) => A.appear(pg, { from: 'scale', delay: stagger(i, pegs.length, 1800, 110), duration: 300 }));
        }
      }
      ctx.canvas.replaceChildren(work(...blocks), figure(fig));
      if (animate && k === 3) {
        ctx.canvas.querySelectorAll('.ledger tbody tr').forEach((r, i) => A.appear(r, { from: 'write', delay: 100 + i * 90, duration: 420 }));
      }
    },
  };
}

export const mode = {
  scenes: [
    { id: 'pow', title: L('math.pow.title'), create: powScene },
    { id: 'inverse', title: L('math.inverse.title'), create: euclidScene },
    { id: 'crt', title: L('math.crt.title'), create: crtScene },
    { id: 'phi', title: L('math.phi.title'), create: phiScene },
    { id: 'mr', title: L('math.mr.title'), create: mrScene },
    { id: 'birthday', title: L('math.birthday.title'), create: birthdayScene },
  ],
};
