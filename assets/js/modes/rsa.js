import * as nt from '../nt.js';
import * as lib from '../rsa-lib.js';
import { h, svg, T, L, v, fmt } from '../ui.js';
import { render } from '../i18n.js';
import { makeRotor } from '../rotor.js';
import { setFormula, op, param, presets, ledger, line, rollTo, stagger, work, figure } from '../kit.js';

function B(x) {
  return BigInt(x);
}

function sup(x) {
  return `<sup>${x}</sup>`;
}

function sub(x) {
  return `<sub>${x}</sub>`;
}

function isPrimeNum(x) {
  return nt.isPrime(BigInt(x));
}

function gap() {
  return h('span', { class: 'fn-gap' });
}

function lbl(html) {
  return h('span', { html });
}

function syncScrubs(scrubs, p) {
  for (let [key, s] of Object.entries(scrubs)) s.value = p[key];
}

function distinctPrimes() {
  return new nt.NtError('Pick two different primes.', '異なる 2 つの素数を選んでください。', 'err.rsa.distinctPrimes');
}

// Draw the brass stroke of this step, then drop its peg in place.
function animateNow(A, root, delay = 0) {
  for (let j of root.querySelectorAll('.jump.is-now')) A.draw(j, { delay: delay + 200, duration: 650 });
  for (let p of root.querySelectorAll('.peg.is-now .peg-inner')) A.appear(p, { from: 'scale', delay: delay + 650 });
}

function writeNowRows(A, root, delay = 150) {
  for (let r of root.querySelectorAll('tr.is-now')) A.appear(r, { from: 'write', delay, duration: 550 });
  for (let l of root.querySelectorAll('.line.is-now')) A.appear(l, { from: 'left', delay });
}

function rotorPair(a, b) {
  return h('div', { class: 'rsa-pair' }, a, b);
}

function captioned(el, html, cls = '') {
  return h('div', { class: `rsa-cell ${cls}` }, el, h('p', { class: 'rsa-cell-label', html }));
}

// ================================================================ key generation

function areaFigure(P, Q, n) {
  let ratio = Math.min(4, Math.max(0.25, Q / P));
  let W = 240;
  let H = 240 * ratio;
  if (H > 240) {
    W = 240 / ratio;
    H = 240;
  }
  let root = svg('svg', { class: 'rsa-area', viewBox: `-34 -30 ${W + 48} ${H + 48}`, role: 'img', 'aria-label': render(L('rsa.keygen.areaAria', { p: fmt(P), q: fmt(Q), n: fmt(n) })) });
  root.append(
    svg('rect', { x: 0, y: 0, width: W, height: H, class: 'rsa-area-rect' }),
    svg('text', { x: W / 2, y: -12, class: 'rsa-area-side' }, `p = ${fmt(P)}`),
    svg('text', { x: -12, y: H / 2, class: 'rsa-area-side', transform: `rotate(-90 -12 ${H / 2})` }, `q = ${fmt(Q)}`),
    svg('text', { x: W / 2, y: H / 2, class: 'rsa-area-n', style: `font-size:${Math.min(W, H) * 0.24}px` }, fmt(n)),
  );
  return root;
}

const HOPS_DRAWN = 6;

// Positions j·e mod λ for the last HOPS_DRAWN hops, ending on d·e = 1.
function lastHops(e, d, lambda) {
  let first = d > BigInt(HOPS_DRAWN) ? d - BigInt(HOPS_DRAWN) : 0n;
  let out = [];
  for (let j = first; j <= d; j++) out.push(nt.mod(j * e, lambda));
  return out;
}

function keygenScene(ctx) {
  let p = { p: 37, q: 17, e: 5, auto: true };
  let k = null;
  let nOut = h('span', { class: 'answer' }, '?');
  ctx.formula.classList.add('compact');
  let sp = param(ctx, p, 'p', { min: 3, max: 9973, label: 'prime p', accept: isPrimeNum });
  let sq = param(ctx, p, 'q', { min: 3, max: 9973, label: 'prime q', accept: isPrimeNum });
  let se = param(ctx, p, 'e', {
    min: 2,
    max: 99999,
    label: 'public exponent e',
    after: () => {
      p.auto = false;
    },
  });
  let scrubs = { p: sp, q: sq, e: se };
  setFormula(ctx.formula, lbl(`${v('n')} =`), sp, op('·'), sq, op('='), nOut, gap(), lbl(`${v('e')} =`), se);

  let chips = presets(
    [
      { label: '37 · 17', values: { p: 37, q: 17, auto: true } },
      { label: '61 · 23', values: { p: 61, q: 23, auto: true } },
      { label: '61 · 23, <var>e</var> = 165', values: { p: 61, q: 23, e: 165, auto: false } },
      { label: '59 · 31, <var>e</var> = 113', values: { p: 59, q: 31, e: 113, auto: false } },
      { label: L('rsa.keygen.chipSmallest'), values: { auto: true } },
    ],
    (vals) => {
      Object.assign(p, vals);
      syncScrubs(scrubs, p);
      ctx.refresh();
    },
  );

  function forcedBad() {
    return !p.auto && k.e === null;
  }

  return {
    steps() {
      if (p.p === p.q) throw distinctPrimes();
      k = nt.rsaKeygen(B(p.p), B(p.q), p.auto ? null : B(p.e));
      if (p.auto && k.e !== null) {
        p.e = Number(k.e);
        se.value = p.e;
      }
      let out = [
        L('rsa.keygen.n', { p: fmt(k.p), q: fmt(k.q), n: fmt(k.n) }),
        L('rsa.keygen.lambda', { p1: fmt(k.p - 1n), q1: fmt(k.q - 1n), lambda: fmt(k.lambda) }),
      ];
      if (p.auto) {
        out.push(L('rsa.keygen.tryE', { lambda: fmt(k.lambda), e: fmt(k.e) }));
      } else if (k.e === null) {
        out.push(L('rsa.keygen.badE', { e: fmt(p.e), lambda: fmt(k.lambda), g: fmt(k.tried[0].g) }));
        return out;
      } else {
        out.push(L('rsa.keygen.okE', { e: fmt(k.e), lambda: fmt(k.lambda) }));
      }
      out.push(
        L('rsa.keygen.d', { d: fmt(k.d), e: fmt(k.e), lambda: fmt(k.lambda) }),
        L('rsa.keygen.key', { n: fmt(k.n), e: fmt(k.e), d: fmt(k.d) }),
      );
      return out;
    },

    show(step, prev) {
      let animate = step === prev + 1;
      let A = ctx.anim;
      nOut.textContent = fmt(k.n);
      let blocks = [chips];
      blocks.push(line(`${v('n')} = ${fmt(k.p)} · ${fmt(k.q)} = ${fmt(k.n)}`, step === 0 ? 'is-now' : ''));
      if (step >= 1) {
        blocks.push(line(`λ(${v('n')}) = lcm(${fmt(k.p - 1n)}, ${fmt(k.q - 1n)}) = ${fmt(k.lambda)}`, step === 1 ? 'is-now' : ''));
        blocks.push(line(`φ(${v('n')}) = ${fmt(k.phi)}`, 'dim-line'));
      }
      let cands = null;
      if (step >= 2) {
        cands = h(
          'p',
          { class: 'line rsa-cands', 'aria-label': render(L('rsa.keygen.candidatesAria')) },
          k.tried.map((t) =>
            h(
              'span',
              { class: `rsa-cand${t.g === 1n ? ' ok' : ' struck'}` },
              h('span', { class: 'rsa-cand-e' }, fmt(t.e)),
              h('span', { class: 'rsa-cand-g', html: `gcd ${fmt(t.g)}` }),
            ),
          ),
        );
        blocks.push(cands);
      }
      let table = null;
      if (step >= 3 && k.e !== null) {
        let eg = nt.egcdTable(k.lambda, k.e);
        table = ledger(
          [v('r'), v('q'), v('t')],
          eg.rows.map((r, i) => ({ cls: i === eg.rows.length - 1 ? 'is-now' : '', cells: [r.r, r.q ?? '', r.t], cellCls: ['', 'dim', ''] })),
        );
        blocks.push(
          table,
          line(`${v('d')} = ${fmt(eg.t)} mod ${fmt(k.lambda)} = ${fmt(k.d)}`, step === 3 ? 'is-now' : ''),
          h('p', { class: 'line dim-line' }, T(L('rsa.keygen.hops', { d: fmt(k.d), e: fmt(k.e), shown: Math.min(HOPS_DRAWN, Number(k.d)) }))),
        );
      }
      if (step >= 4) {
        blocks.push(
          h(
            'div',
            { class: 'rsa-key' },
            h('p', { class: 'rsa-key-row' }, T(L('rsa.keygen.public')), lbl(`(${fmt(k.n)}, ${fmt(k.e)})`)),
            h('p', { class: 'rsa-key-row is-secret' }, T(L('rsa.keygen.private')), lbl(`${v('d')} = ${fmt(k.d)}`)),
            line(`${fmt(k.e)} · ${fmt(k.d)} = ${fmt(k.e * k.d)} ≡ 1 (mod ${fmt(k.lambda)})`, 'dim-line'),
          ),
        );
      }

      let fig;
      if (step === 0) {
        fig = h('div', { class: 'rsa-area-wrap' }, areaFigure(Number(k.p), Number(k.q), k.n));
      } else {
        let rotor = makeRotor(k.lambda, { hub: `λ = ${fmt(k.lambda)}` });
        let rest = 0n;
        if (step === 2) {
          for (let t of k.tried) rotor.peg(t.e, t.g === 1n ? 'is-now' : 'eve');
          rest = k.e ?? k.tried.at(-1).e;
        } else if (step >= 3) {
          // Only the last few hops are drawn, so each one stays countable.
          let hops = lastHops(k.e, k.d, k.lambda);
          for (let i = 1; i < hops.length; i++) rotor.jump(hops[i - 1], hops[i], i === hops.length - 1 ? 'is-now' : 'rsa-hop');
          for (let i = 0; i < hops.length - 1; i++) rotor.peg(hops[i], i === 0 ? 'alice' : 'rsa-hop');
          rotor.peg(1n, 'is-now');
          rotor.target(1n, 'hit');
          rest = 1n;
        }
        let prevRest = prev === 2 ? k.e ?? 0n : 0n;
        rotor.turnTo(rest, { from: animate ? prevRest : null, anim: A, delay: step === 3 ? 1200 : 0 });
        fig = rotor.el;
        if (animate && step === 3) {
          let jumps = [...rotor.el.querySelectorAll('.jump')];
          let pegs = [...rotor.el.querySelectorAll('.peg-inner')];
          jumps.forEach((j, i) => A.draw(j, { delay: 200 + i * 320, duration: 300 }));
          pegs.forEach((pg, i) => A.appear(pg, { from: 'scale', delay: 200 + i * 320, duration: 260 }));
        }
      }
      ctx.canvas.replaceChildren(work(...blocks), figure(fig));

      if (!animate) return;
      if (step === 0) {
        A.appear(fig.querySelector('.rsa-area-rect'), { from: 'scale', duration: 700 });
        rollTo(nOut, 0, k.n, A, { delay: 200 });
      }
      if (step === 2 && cands) {
        let items = [...cands.children];
        items.forEach((c, i) => {
          A.appear(c, { from: 'drop', delay: stagger(i, items.length, 1000, 240) });
          if (c.classList.contains('struck')) A.run(c.querySelector('.rsa-cand-e'), [{ backgroundSize: '0% 2px' }, { backgroundSize: '100% 2px' }], { delay: stagger(i, items.length, 1000, 240) + 300, duration: 380 });
        });
        for (let pg of ctx.canvas.querySelectorAll('.peg-inner')) A.appear(pg, { from: 'scale', delay: 400 });
      }
      if (step === 3 && table) {
        [...table.querySelectorAll('tbody tr')].forEach((r, i) => A.appear(r, { from: 'write', delay: 100 + i * 160, duration: 420 }));
      }
      if (step === 1 || step === 4) writeNowRows(A, ctx.canvas);
    },
  };
}

// ================================================================ encrypt and decrypt

function cryptScene(ctx) {
  let p = { p: 37, q: 17, m: 591 };
  let st = null;
  let cOut = h('span', { class: 'answer' }, '?');
  ctx.formula.classList.add('compact');
  function clampM() {
    let n = p.p * p.q;
    if (p.m >= n) {
      p.m = n - 1;
      sm.value = p.m;
    }
  }
  let sp = param(ctx, p, 'p', { min: 3, max: 997, label: 'prime p', accept: isPrimeNum, after: clampM });
  let sq = param(ctx, p, 'q', { min: 3, max: 997, label: 'prime q', accept: isPrimeNum, after: clampM });
  let sm = param(ctx, p, 'm', { min: 0, max: 994008, label: 'message m', accept: (x) => x < p.p * p.q, tone: 'alice' });
  let scrubs = { p: sp, q: sq, m: sm };
  setFormula(ctx.formula, lbl(`${v('m')} =`), sm, gap(), lbl(`${v('n')} =`), sp, op('·'), sq, op('→'), lbl(`${v('c')} =`), cOut);

  let chips = presets(
    [
      { label: L('rsa.crypt.chip', { m: 591, p: 37, q: 17 }), values: { p: 37, q: 17, m: 591 } },
      { label: L('rsa.crypt.chip', { m: 100, p: 37, q: 17 }), values: { p: 37, q: 17, m: 100 } },
      { label: L('rsa.crypt.chip', { m: 21, p: 61, q: 23 }), values: { p: 61, q: 23, m: 21 } },
    ],
    (vals) => {
      Object.assign(p, vals);
      syncScrubs(scrubs, p);
      ctx.refresh();
    },
  );

  return {
    steps() {
      if (p.p === p.q) throw distinctPrimes();
      let k = nt.rsaKeygen(B(p.p), B(p.q));
      let m = B(p.m);
      let c = nt.modPow(m, k.e, k.n);
      let back = nt.modPow(c, k.d, k.n);
      let count = lib.fixedPointCount(k.e, k.p, k.q);
      st = { k, m, c, back, count, fixed: lib.fixedPoints(k.e, k.n), isFixed: c === m };
      return [
        L('rsa.crypt.key', { n: fmt(k.n), e: fmt(k.e), d: fmt(k.d), m: fmt(m) }),
        L('rsa.crypt.enc', { m: fmt(m), e: fmt(k.e), n: fmt(k.n), c: fmt(c) }),
        L('rsa.crypt.dec', { c: fmt(c), d: fmt(k.d), n: fmt(k.n), back: fmt(back) }),
        st.isFixed ? L('rsa.crypt.fixed', { m: fmt(m), count: fmt(count) }) : L('rsa.crypt.notFixed', { m: fmt(m), count: fmt(count) }),
      ];
    },

    show(step, prev) {
      let animate = step === prev + 1;
      let A = ctx.anim;
      let { k, m, c, back } = st;
      cOut.textContent = step >= 1 ? fmt(c) : '?';
      cOut.classList.toggle('eve', step >= 1 && st.isFixed);
      let rotor = makeRotor(k.n);
      let rest = m;
      rotor.peg(m, step === 0 ? 'is-now alice' : 'alice');
      if (step >= 1) {
        rotor.jump(m, c, step === 1 ? 'is-now' : '');
        rotor.peg(c, step === 1 ? 'is-now' : '');
        rest = c;
      }
      if (step >= 2) {
        rotor.jump(c, back, step === 2 ? 'is-now bob' : 'bob');
        rotor.peg(back, step === 2 ? 'is-now bob' : 'bob');
        rest = back;
      }
      if (step >= 3) {
        for (let x of st.fixed ?? []) rotor.target(x, x === m ? 'hit' : '');
      }
      let restOf = (s) => (s <= 0 ? m : s === 1 ? c : back);
      rotor.turnTo(rest, { from: animate ? restOf(prev) : null, anim: A });

      let blocks = [
        chips,
        line(`(${v('n')}, ${v('e')}) = (${fmt(k.n)}, ${fmt(k.e)})${'&emsp;'}${v('d')} = ${fmt(k.d)}`, 'dim-line'),
        line(`${v('m')} = <span class="alice">${fmt(m)}</span>`, step === 0 ? 'is-now' : ''),
      ];
      if (step >= 1) blocks.push(line(`${v('c')} = ${fmt(m)}${sup(fmt(k.e))} mod ${fmt(k.n)} = ${fmt(c)}`, step === 1 ? 'is-now' : ''));
      if (step >= 2) blocks.push(line(`${fmt(c)}${sup(fmt(k.d))} mod ${fmt(k.n)} = <span class="bob">${fmt(back)}</span>`, step === 2 ? 'is-now' : ''));
      if (step >= 3) {
        blocks.push(
          h(
            'p',
            { class: `line big ${st.isFixed ? 'eve' : 'is-now'}` },
            st.isFixed ? `${fmt(m)} → ${fmt(c)}` : T(L('rsa.crypt.fixedCount', { count: fmt(st.count) })),
          ),
          line(`(1 + gcd(${v('e')}−1, ${v('p')}−1)) · (1 + gcd(${v('e')}−1, ${v('q')}−1)) = ${fmt(st.count)}`, 'dim-line'),
        );
      }
      ctx.canvas.replaceChildren(work(...blocks), figure(rotor.el));
      if (!animate) return;
      animateNow(A, rotor.el);
      writeNowRows(A, ctx.canvas);
      if (step === 3) {
        let rings = [...rotor.el.querySelectorAll('.target')];
        rings.forEach((r, i) => A.appear(r, { from: 'fade', delay: stagger(i, rings.length, 900, 60) }));
        if (st.isFixed) A.pulse(cOut, { delay: 400 });
      }
    },
  };
}

// ================================================================ CRT decryption

function crtScene(ctx) {
  let c0 = Number(nt.modPow(100n, 5n, 629n));
  let p = { p: 37, q: 17, c: c0 };
  let st = null;
  let mOut = h('span', { class: 'answer' }, '?');
  ctx.formula.classList.add('compact');
  function clampC() {
    let n = p.p * p.q;
    if (p.c >= n) {
      p.c = n - 1;
      sc.value = p.c;
    }
  }
  let sp = param(ctx, p, 'p', { min: 3, max: 997, label: 'prime p', accept: isPrimeNum, after: clampC });
  let sq = param(ctx, p, 'q', { min: 3, max: 997, label: 'prime q', accept: isPrimeNum, after: clampC });
  let sc = param(ctx, p, 'c', { min: 0, max: 994008, label: 'ciphertext c', accept: (x) => x < p.p * p.q });
  let scrubs = { p: sp, q: sq, c: sc };
  setFormula(ctx.formula, h('span', {}, sc.el, h('sup', { html: '<var>d</var>' })), op('mod'), sp, op('·'), sq, op('='), mOut);

  let chips = presets(
    [
      { label: `<var>c</var> = ${fmt(c0)}, 37 · 17`, values: { p: 37, q: 17, c: c0 } },
      { label: '<var>c</var> = 21, 61 · 23', values: { p: 61, q: 23, c: 21 } },
    ],
    (vals) => {
      Object.assign(p, vals);
      syncScrubs(scrubs, p);
      ctx.refresh();
    },
  );

  return {
    steps() {
      if (p.p === p.q) throw distinctPrimes();
      let k = nt.rsaKeygen(B(p.p), B(p.q));
      let c = B(p.c);
      let r = nt.rsaCrtDecrypt(c, k.d, k.p, k.q);
      let g = lib.garner(r.mp, r.mq, k.p, k.q);
      let direct = nt.modPow(c, k.d, k.n);
      st = { k, c, r, g, direct, cp: c % k.p, cq: c % k.q };
      return [
        L('rsa.crt.split', { d: fmt(k.d), p1: fmt(k.p - 1n), q1: fmt(k.q - 1n), dp: fmt(r.dp), dq: fmt(r.dq) }),
        L('rsa.crt.modp', { p: fmt(k.p), cp: fmt(st.cp), dp: fmt(r.dp), mp: fmt(r.mp) }),
        L('rsa.crt.modq', { q: fmt(k.q), cq: fmt(st.cq), dq: fmt(r.dq), mq: fmt(r.mq) }),
        L('rsa.crt.join', { mq: fmt(r.mq), q: fmt(k.q), h: fmt(g.h), m: fmt(g.m) }),
        L('rsa.crt.same', { direct: fmt(direct) }),
      ];
    },

    show(step, prev) {
      let animate = step === prev + 1;
      let A = ctx.anim;
      let { k, c, r, g, direct } = st;
      mOut.textContent = step >= 3 ? fmt(g.m) : '?';

      let fig;
      if (step <= 2) {
        let left = makeRotor(k.p);
        let right = makeRotor(k.q);
        left.peg(st.cp, step === 0 ? 'is-now alice' : 'alice');
        right.peg(st.cq, step === 0 ? 'is-now bob' : 'bob');
        let restL = st.cp;
        let restR = st.cq;
        if (step >= 1) {
          left.jump(st.cp, r.mp, step === 1 ? 'is-now' : '');
          left.peg(r.mp, step === 1 ? 'is-now' : '');
          restL = r.mp;
        }
        if (step >= 2) {
          right.jump(st.cq, r.mq, 'is-now');
          right.peg(r.mq, 'is-now');
          restR = r.mq;
        }
        left.turnTo(restL, { from: animate && step === 1 ? st.cp : null, anim: A });
        right.turnTo(restR, { from: animate && step === 2 ? st.cq : null, anim: A });
        fig = rotorPair(
          captioned(left.el, `${v('d')}${sub('p')} = ${fmt(r.dp)}`, 'alice'),
          captioned(right.el, `${v('d')}${sub('q')} = ${fmt(r.dq)}`, 'bob'),
        );
      } else {
        let rotor = makeRotor(k.n);
        rotor.jump(r.mq, g.m, step === 3 ? 'is-now' : '');
        rotor.peg(r.mq, 'bob');
        rotor.peg(g.m, 'is-now');
        if (step === 4) rotor.target(direct, 'hit');
        rotor.turnTo(g.m, { from: animate && step === 3 ? r.mq : null, anim: A });
        fig = rotor.el;
      }

      let rows = [
        { cells: [`${v('d')}${sub('p')}`, `${fmt(k.d)} mod ${fmt(k.p - 1n)}`, r.dp], cls: step === 0 ? 'is-now' : '' },
        { cells: [`${v('d')}${sub('q')}`, `${fmt(k.d)} mod ${fmt(k.q - 1n)}`, r.dq], cls: step === 0 ? 'is-now' : '' },
        { cells: [`${v('m')}${sub('p')}`, `${fmt(st.cp)}${sup(fmt(r.dp))} mod ${fmt(k.p)}`, r.mp], cls: step < 1 ? 'is-ahead' : step === 1 ? 'is-now' : '' },
        { cells: [`${v('m')}${sub('q')}`, `${fmt(st.cq)}${sup(fmt(r.dq))} mod ${fmt(k.q)}`, r.mq], cls: step < 2 ? 'is-ahead' : step === 2 ? 'is-now' : '' },
        { cells: [`${v('h')}`, `(${fmt(r.mp)} − ${fmt(r.mq)}) · ${fmt(g.qInv)} mod ${fmt(k.p)}`, g.h], cls: step < 3 ? 'is-ahead' : step === 3 ? 'is-now' : '' },
        { cells: [v('m'), `${fmt(r.mq)} + ${fmt(k.q)} · ${fmt(g.h)}`, g.m], cls: step < 3 ? 'is-ahead' : step === 3 ? 'is-now' : '' },
      ].map((row) => ({ ...row, cellCls: ['', 'dim', ''] }));
      let blocks = [chips, line(`${v('d')} = ${fmt(k.d)}${'&emsp;'}${v('q')}${sup('−1')} mod ${v('p')} = ${fmt(g.qInv)}`, 'dim-line'), ledger(['', '', ''], rows)];
      if (step === 4) blocks.push(line(`${fmt(c)}${sup(fmt(k.d))} mod ${fmt(k.n)} = ${fmt(direct)}`, 'is-now'));
      ctx.canvas.replaceChildren(work(...blocks), figure(fig));
      if (!animate) return;
      animateNow(A, ctx.canvas);
      writeNowRows(A, ctx.canvas);
      if (step === 3) A.pulse(mOut, { delay: 700 });
    },
  };
}

// ================================================================ common modulus

function commonScene(ctx) {
  let p = { n: 629, e: 5, f: 7, m: 123 };
  let st = null;
  let mOut = h('span', { class: 'answer eve' }, '?');
  ctx.formula.classList.add('compact');
  let sn = param(ctx, p, 'n', {
    min: 6,
    max: 99999,
    label: 'shared modulus n',
    after: (x) => {
      if (p.m >= x) {
        p.m = x - 1;
        sm.value = p.m;
      }
    },
  });
  let se = param(ctx, p, 'e', { min: 2, max: 999, label: 'exponent e', tone: 'alice' });
  let sf = param(ctx, p, 'f', { min: 2, max: 999, label: 'exponent f', tone: 'bob' });
  let sm = param(ctx, p, 'm', { min: 0, max: 99998, label: 'message m', accept: (x) => x < p.n });
  let scrubs = { n: sn, e: se, f: sf, m: sm };
  setFormula(ctx.formula, lbl(`${v('m')} =`), sm, gap(), lbl(`${v('n')} =`), sn, gap(), lbl(`${v('e')} =`), se, lbl(`${v('f')} =`), sf, op('→'), mOut);

  let chips = presets(
    [
      { label: '<var>n</var> = 629, <var>e</var> = 5, <var>f</var> = 7', values: { n: 629, e: 5, f: 7, m: 123 } },
      { label: '<var>n</var> = 1403, <var>e</var> = 7, <var>f</var> = 13', values: { n: 1403, e: 7, f: 13, m: 1000 } },
    ],
    (vals) => {
      Object.assign(p, vals);
      syncScrubs(scrubs, p);
      ctx.refresh();
    },
  );

  return {
    steps() {
      let n = B(p.n);
      let m = B(p.m);
      let e = B(p.e);
      let f = B(p.f);
      if (nt.gcd(m, n) !== 1n) {
        throw new nt.NtError(`Pick m coprime to n (gcd(${p.m}, ${p.n}) ≠ 1).`, `m は n と互いに素にしてください (gcd(${p.m}, ${p.n}) ≠ 1)。`, 'err.rsa.mCoprime', { m: fmt(p.m), n: fmt(p.n) });
      }
      let ce = nt.modPow(m, e, n);
      let cf = nt.modPow(m, f, n);
      let atk = nt.commonModulusAttack(n, e, f, ce, cf);
      st = { n, m, e, f, ce, cf, atk, eg: nt.egcdTable(e, f) };
      return [
        L('rsa.common.send', { ce: fmt(ce), cf: fmt(cf) }),
        L('rsa.common.euclid', { e: fmt(e), f: fmt(f), x: fmt(atk.x), y: fmt(atk.y) }),
        L('rsa.common.recover', { x: fmt(atk.x), y: fmt(atk.y), m: fmt(atk.m) }),
      ];
    },

    show(step, prev) {
      let animate = step === prev + 1;
      let A = ctx.anim;
      let { n, ce, cf, atk, eg } = st;
      mOut.textContent = step >= 2 ? fmt(atk.m) : '?';
      let rotor = makeRotor(n);
      rotor.peg(ce, step === 0 ? 'is-now alice' : 'alice');
      rotor.peg(cf, step === 0 ? 'is-now bob' : 'bob');
      let rest = cf;
      if (step >= 2) {
        rotor.jump(ce, atk.m, 'is-now eve');
        rotor.jump(cf, atk.m, 'is-now eve');
        rotor.peg(atk.m, 'is-now eve');
        rotor.target(atk.m, 'hit');
        rest = atk.m;
      }
      rotor.turnTo(rest, { from: animate && step === 2 ? cf : null, anim: A });

      let blocks = [
        chips,
        line(`<span class="alice">${v('c')}${sub('e')} = ${fmt(ce)}</span>${'&emsp;'}<span class="bob">${v('c')}${sub('f')} = ${fmt(cf)}</span>`, step === 0 ? 'is-now' : ''),
      ];
      if (step >= 1) {
        blocks.push(
          ledger(
            [v('r'), v('q'), v('s'), v('t')],
            eg.rows.map((r, i) => ({ cls: i === eg.rows.length - 1 && step === 1 ? 'is-now' : '', cells: [r.r, r.q ?? '', r.s, r.t], cellCls: ['', 'dim', '', ''] })),
          ),
          line(`${v('x')} = ${fmt(atk.x)}, ${v('y')} = ${fmt(atk.y)}`, step === 1 ? 'is-now' : ''),
        );
      }
      if (step >= 2) {
        blocks.push(line(`${fmt(ce)}${sup(fmt(atk.x))} · ${fmt(cf)}${sup(fmt(atk.y))} mod ${fmt(n)} = <span class="eve">${fmt(atk.m)}</span>`, 'is-now'));
      }
      ctx.canvas.replaceChildren(work(...blocks), figure(rotor.el));
      if (!animate) return;
      animateNow(A, rotor.el);
      writeNowRows(A, ctx.canvas);
      if (step === 2) A.pulse(mOut, { delay: 800 });
    },
  };
}

// ================================================================ Håstad broadcast, e = 3

// Each modulus is a product of primes = 2 (mod 3), so e = 3 is a valid exponent for all three.
const HASTAD_MODULI = [55n, 391n, 1189n];

function hastadScene(ctx) {
  let p = { m: 42 };
  let st = null;
  let mOut = h('span', { class: 'answer eve' }, '?');
  ctx.formula.classList.add('compact');
  let sm = param(ctx, p, 'm', { min: 2, max: 54, label: 'message m', tone: 'alice' });
  setFormula(
    ctx.formula,
    lbl(`${v('c')}${sub('i')} = `),
    h('span', {}, sm.el, h('sup', {}, '3')),
    op('mod'),
    lbl(`${v('n')}${sub('i')}`),
    op('→'),
    lbl(`${v('m')} =`),
    mOut,
  );

  return {
    steps() {
      let m = B(p.m);
      let list = HASTAD_MODULI.map((n) => ({ n, c: nt.modPow(m, 3n, n) }));
      let atk = nt.hastadAttack(list, 3n);
      st = { m, list, atk, N: atk.crt.M };
      return [
        L('rsa.hastad.send', { list: list.map((x) => `${fmt(x.c)} mod ${fmt(x.n)}`).join(', ') }),
        L('rsa.hastad.join', { N: fmt(st.N), C: fmt(atk.C) }),
        L('rsa.hastad.root', { C: fmt(atk.C), m: fmt(atk.m) }),
      ];
    },

    show(step, prev) {
      let animate = step === prev + 1;
      let A = ctx.anim;
      let { list, atk, N } = st;
      mOut.textContent = step >= 2 ? fmt(atk.m) : '?';
      let fig;
      let tones = ['alice', 'bob', 'eve'];
      if (step === 0) {
        fig = h(
          'div',
          { class: 'rsa-trio' },
          list.map((x, i) => {
            let r = makeRotor(x.n);
            r.peg(x.c, `is-now ${tones[i]}`);
            r.turnTo(x.c, { from: animate ? 0n : null, anim: A, delay: i * 200 });
            return captioned(r.el, `${v('c')}${sub(i + 1)} = ${fmt(x.c)}`, tones[i]);
          }),
        );
      } else {
        let rotor = makeRotor(N);
        rotor.jump(0n, atk.C, step === 1 ? 'is-now' : '');
        rotor.peg(atk.C, step === 1 ? 'is-now' : 'eve');
        rotor.target(0n, '');
        rotor.turnTo(atk.C, { from: animate && step === 1 ? 0n : null, anim: A });
        fig = rotor.el;
      }
      let blocks = [
        ledger(
          [v('n') + sub('i'), v('c') + sub('i')],
          list.map((x, i) => ({ cells: [x.n, h('span', { class: tones[i] }, fmt(x.c))], cellCls: ['dim', ''] })),
        ),
      ];
      if (step >= 1) {
        blocks.push(line(`${v('C')} = ${fmt(atk.C)} (mod ${fmt(N)})`, step === 1 ? 'is-now' : ''));
        blocks.push(h('div', { class: 'rsa-scale', role: 'img', 'aria-label': render(L('rsa.hastad.scaleAria')) }, h('span', { class: 'rsa-scale-fill', style: { '--w': String(Math.max(0.01, Number(atk.C) / Number(N))) } })));
      }
      if (step >= 2) blocks.push(line(`∛${fmt(atk.C)} = <span class="eve">${fmt(atk.m)}</span>`, 'is-now'));
      ctx.canvas.replaceChildren(work(...blocks), figure(fig));
      if (!animate) return;
      if (step === 0) {
        for (let pg of ctx.canvas.querySelectorAll('.peg-inner')) A.appear(pg, { from: 'scale', delay: 500 });
      }
      animateNow(A, ctx.canvas);
      writeNowRows(A, ctx.canvas);
      let fill = ctx.canvas.querySelector('.rsa-scale-fill');
      if (fill && step === 1) A.run(fill, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { delay: 300, duration: 700 });
      if (step === 2) A.pulse(mOut, { delay: 300 });
    },
  };
}

// ================================================================ Fermat factoring

function fermatScene(ctx) {
  let p = { p: 373, q: 379 };
  let st = null;
  let out = h('span', { class: 'answer eve' }, '?');
  let nOut = h('span', { class: 'rsa-n' });
  ctx.formula.classList.add('compact');
  let sp = param(ctx, p, 'p', { min: 3, max: 9973, label: 'prime p', accept: isPrimeNum });
  let sq = param(ctx, p, 'q', { min: 3, max: 9973, label: 'prime q', accept: isPrimeNum });
  let scrubs = { p: sp, q: sq };
  setFormula(ctx.formula, lbl(`${v('n')} =`), sp, op('·'), sq, op('='), nOut, op('→'), out);

  let chips = presets(
    [
      { label: '<var>n</var> = 141 367', values: { p: 373, q: 379 } },
      { label: L('rsa.fermat.chipTwin'), values: { p: 9929, q: 9931 } },
      { label: L('rsa.fermat.chipFar'), values: { p: 101, q: 997 } },
    ],
    (vals) => {
      Object.assign(p, vals);
      syncScrubs(scrubs, p);
      ctx.refresh();
    },
  );

  return {
    steps() {
      if (p.p === p.q) throw distinctPrimes();
      let n = B(p.p) * B(p.q);
      let f = nt.fermatFactor(n);
      let picks = lib.sampleTries(f.tries.length, 10, 2);
      st = { n, f, picks };
      nOut.textContent = fmt(n);
      let caps = picks.map((i, j) => {
        if (i === -1) return L('rsa.fermat.skip', { count: fmt(f.tries.length - 12) });
        let t = f.tries[i];
        let params = { n: fmt(n), a: fmt(t.a), b2: fmt(t.b2), b: fmt(t.b) };
        if (j === 0) return L(t.square ? 'rsa.fermat.firstYes' : 'rsa.fermat.firstNo', params);
        return L(t.square ? 'rsa.fermat.yes' : 'rsa.fermat.no', params);
      });
      let done = { p: fmt(f.p), q: fmt(f.q), tries: fmt(f.tries.length) };
      caps.push(L(f.tries.length <= 3 ? 'rsa.fermat.doneFast' : 'rsa.fermat.doneSlow', done));
      return caps;
    },

    show(step, prev) {
      let animate = step === prev + 1;
      let A = ctx.anim;
      let { n, f, picks } = st;
      let done = step === picks.length;
      let shownIdx = done ? f.tries.length - 1 : picks[step] === -1 ? picks[step + 1] - 1 : picks[step];
      let t = f.tries[shownIdx];
      out.textContent = done ? `${fmt(f.p)} · ${fmt(f.q)}` : '?';

      let fig = done ? rectFigure(f, A, animate) : squareFigure(n, t);
      let rows = picks.slice(0, Math.min(step + 1, picks.length)).map((i, j) => {
        if (i === -1) return { cells: ['…', '', ''], cellCls: ['dim', '', ''] };
        let tr = f.tries[i];
        return {
          cls: j === step ? 'is-now' : '',
          cells: [tr.a, tr.b2, h('span', { class: `mark${tr.square ? ' on' : ''}`, 'aria-label': render(L(tr.square ? 'rsa.fermat.isSquare' : 'rsa.fermat.notSquare')) })],
          cellCls: ['', tr.square ? 'used' : '', ''],
        };
      });
      let blocks = [chips, ledger([v('a'), `${v('a')}${sup('2')} − ${v('n')}`, '□'], rows)];
      if (done) {
        let last = f.tries.at(-1);
        blocks.push(line(`(${fmt(last.a)} − ${fmt(last.b)})(${fmt(last.a)} + ${fmt(last.b)}) = <span class="eve">${fmt(f.p)} · ${fmt(f.q)}</span>`, 'is-now'));
        blocks.push(h('p', { class: 'line dim-line' }, T(L('rsa.fermat.tries', { tries: fmt(f.tries.length) }))));
      }
      ctx.canvas.replaceChildren(work(...blocks), figure(fig));
      if (!animate) return;
      writeNowRows(A, ctx.canvas);
      if (!done) {
        let corner = fig.querySelector('.rsa-corner');
        if (corner) A.appear(corner, { from: 'scale', delay: 200, duration: 500 });
      } else {
        A.pulse(out, { delay: 900 });
      }
    },
  };
}

// Square of side a with the corner square b^2 = a^2 - n; the L-shaped rest is n.
function squareFigure(n, t) {
  let a = Number(t.a);
  let b = Math.sqrt(Number(t.b2));
  let s = 240 / a;
  let root = svg('svg', { class: 'rsa-square', viewBox: '-36 -30 300 300', role: 'img', 'aria-label': render(L('rsa.fermat.squareAria', { b2: fmt(t.b2) })) });
  let bb = Math.max(b * s, 2);
  root.append(
    svg('rect', { x: 0, y: 0, width: 240, height: 240, class: 'rsa-sq-n' }),
    svg('rect', { x: 240 - bb, y: 240 - bb, width: bb, height: bb, class: `rsa-corner${t.square ? ' is-square' : ''}` }),
    svg('text', { x: 120, y: -12, class: 'rsa-area-side' }, `a = ${fmt(t.a)}`),
    svg('text', { x: 100, y: 110, class: 'rsa-area-n', style: 'font-size:26px' }, `n`),
    svg('text', { x: 240 - bb / 2, y: 240 + 18, class: 'rsa-area-side' }, t.square ? `b = ${fmt(t.b)}` : `√${fmt(t.b2)}`),
  );
  return h('div', { class: 'rsa-area-wrap' }, root);
}

// The L-shape rearranged into the rectangle (a - b) x (a + b).
function rectFigure(f, A, animate) {
  let p = Number(f.p);
  let q = Number(f.q);
  let W = 260;
  let H = Math.max(260 * (p / q), 12);
  let root = svg('svg', { class: 'rsa-square', viewBox: `-36 -30 ${W + 60} ${H + 70}`, role: 'img', 'aria-label': render(L('rsa.fermat.rectAria', { p: fmt(p), q: fmt(q) })) });
  let rect = svg('rect', { x: 0, y: 0, width: W, height: H, class: 'rsa-sq-n is-now' });
  root.append(
    rect,
    svg('text', { x: W / 2, y: -12, class: 'rsa-area-side' }, `a + b = ${fmt(f.q)}`),
    svg('text', { x: -12, y: H / 2, class: 'rsa-area-side', transform: `rotate(-90 -12 ${H / 2})` }, `a − b = ${fmt(f.p)}`),
  );
  if (animate) A.run(rect, [{ transform: 'scaleX(0.6) scaleY(1.6)', opacity: 0.4 }, { transform: 'none', opacity: 1 }], { delay: 150, duration: 800 });
  return h('div', { class: 'rsa-area-wrap' }, root);
}

// ================================================================ small private exponent

function smallDScene(ctx) {
  let p = { e: 31, n: 247, c: 23 };
  let st = null;
  let mOut = h('span', { class: 'answer eve' }, '?');
  ctx.formula.classList.add('compact');
  let se = param(ctx, p, 'e', { min: 3, max: 99999, label: 'public exponent e' });
  let sn = param(ctx, p, 'n', {
    min: 6,
    max: 99999,
    label: 'modulus n',
    after: (x) => {
      if (p.c >= x) {
        p.c = x - 1;
        sc.value = p.c;
      }
    },
  });
  let sc = param(ctx, p, 'c', { min: 0, max: 99998, label: 'ciphertext c', accept: (x) => x < p.n, tone: 'alice' });
  let scrubs = { e: se, n: sn, c: sc };
  setFormula(ctx.formula, lbl(`(${v('n')}, ${v('e')}) =`), lbl('('), sn, lbl(','), se, lbl(')'), gap(), lbl(`${v('c')} =`), sc, op('→'), lbl(`${v('m')} =`), mOut);

  let chips = presets(
    [
      { label: '(247, 31), <var>c</var> = 23', values: { e: 31, n: 247, c: 23 } },
      { label: '(629, 29), <var>c</var> = 100', values: { e: 29, n: 629, c: 100 } },
    ],
    (vals) => {
      Object.assign(p, vals);
      syncScrubs(scrubs, p);
      ctx.refresh();
    },
  );

  return {
    steps() {
      let tr = lib.smallDTrace(B(p.e), B(p.n), B(p.c));
      let picks = lib.sampleTries(tr.tries.length, 10, 2);
      st = { tr, picks, n: B(p.n), c: B(p.c), e: B(p.e) };
      let caps = picks.map((i) => {
        if (i === -1) return L('rsa.smalld.skip', { count: fmt(tr.tries.length - 12) });
        let t = tr.tries[i];
        let params = { d: fmt(t.d), c: fmt(st.c), m: fmt(t.m), e: fmt(st.e), back: fmt(t.back) };
        return L(t.ok ? 'rsa.smalld.ok' : 'rsa.smalld.guess', params);
      });
      caps.push(L('rsa.smalld.lesson'));
      return caps;
    },

    show(step, prev) {
      let animate = step === prev + 1;
      let A = ctx.anim;
      let { tr, picks, n, c } = st;
      let done = step === picks.length;
      let idx = done ? tr.tries.length - 1 : picks[step] === -1 ? picks[step + 1] - 1 : picks[step];
      let t = tr.tries[idx];
      mOut.textContent = done || t.ok ? fmt(tr.m) : '?';
      let rotor = makeRotor(n);
      rotor.target(c, t.ok ? 'hit' : '');
      rotor.peg(c, 'alice');
      rotor.jump(c, t.m, 'is-now eve');
      rotor.peg(t.m, 'is-now eve');
      if (t.m !== t.back) rotor.jump(t.m, t.back, '');
      rotor.turnTo(t.m, { from: animate && !done ? c : null, anim: A });
      let rows = picks.slice(0, Math.min(step + 1, picks.length)).map((i, j) => {
        if (i === -1) return { cells: ['…', '', ''], cellCls: ['dim', '', ''] };
        let x = tr.tries[i];
        return { cls: j === step ? 'is-now' : '', cells: [x.d, x.m, x.back], cellCls: ['', '', x.ok ? 'used' : 'dim'] };
      });
      let blocks = [chips, ledger([v('d'), `${v('c')}${sup(v('d'))}`, `(${v('c')}${sup(v('d'))})${sup(v('e'))}`], rows)];
      if (done) blocks.push(line(`${v('d')} = ${fmt(tr.d)}${'&emsp;'}${v('m')} = <span class="eve">${fmt(tr.m)}</span>`, 'is-now'));
      ctx.canvas.replaceChildren(work(...blocks), figure(rotor.el));
      if (!animate) return;
      animateNow(A, rotor.el);
      writeNowRows(A, ctx.canvas);
      if (t.ok) A.pulse(mOut, { delay: 700 });
    },
  };
}

// ================================================================ ElGamal signature

function signScene(ctx) {
  let p = { p: 991, g: 12, x: 106, m: 1, k: 157, given: null };
  let st = null;
  let sigOut = h('span', { class: 'answer' }, '?');
  ctx.formula.classList.add('compact');
  function own() {
    p.given = null;
  }
  let sp = param(ctx, p, 'p', {
    min: 5,
    max: 99991,
    label: 'prime p',
    accept: isPrimeNum,
    after: (x) => {
      own();
      if (p.g >= x) {
        p.g = 2;
        sg.value = 2;
      }
    },
  });
  let sg = param(ctx, p, 'g', { min: 2, max: 99990, label: 'generator g', accept: (x) => x < p.p, after: own });
  let sx = param(ctx, p, 'x', { min: 1, max: 99990, label: 'private key x', accept: (x) => x < p.p - 1, after: own, tone: 'alice' });
  let sm = param(ctx, p, 'm', { min: 0, max: 99990, label: 'message m', after: own });
  let sk = param(ctx, p, 'k', {
    min: 1,
    max: 99990,
    label: 'nonce k',
    accept: (x) => x < p.p - 1 && nt.gcd(BigInt(x), BigInt(p.p - 1)) === 1n,
    after: own,
  });
  let scrubs = { p: sp, g: sg, x: sx, m: sm, k: sk };
  setFormula(
    ctx.formula,
    lbl(`${v('p')} =`),
    sp,
    lbl(`${v('g')} =`),
    sg,
    lbl(`${v('x')} =`),
    sx,
    gap(),
    lbl(`${v('m')} =`),
    sm,
    lbl(`${v('k')} =`),
    sk,
    op('→'),
    sigOut,
  );

  let chips = presets(
    [
      { label: L('rsa.sign.chipSign', { m: 1, k: 157 }), values: { p: 991, g: 12, x: 106, m: 1, k: 157, given: null } },
      { label: L('rsa.sign.chipCheck', { r: 66, s: 77, m: 77 }), values: { p: 89, g: 3, x: 1, m: 77, k: 1, given: { y: 69n, r: 66n, s: 77n } } },
    ],
    (vals) => {
      Object.assign(p, vals);
      syncScrubs(scrubs, p);
      ctx.refresh();
    },
  );

  return {
    steps() {
      let P = B(p.p);
      let g = B(p.g);
      let m = B(p.m);
      if (p.given) {
        let { y, r, s } = p.given;
        let ver = nt.elgamalVerify(P, g, y, m, r, s);
        st = { P, g, m, y, r, s, ver, given: true };
        return [
          L('rsa.sign.given', { r: fmt(r), s: fmt(s), m: fmt(m), y: fmt(y) }),
          L('rsa.sign.left', { yr: fmt(ver.yr), rs: fmt(ver.rs), p: fmt(P), lhs: fmt(ver.lhs) }),
          verdictCaption(ver, g, m, P),
        ];
      }
      let x = B(p.x);
      let k = B(p.k);
      let sig = nt.elgamalSign(P, g, x, m, k);
      let ver = nt.elgamalVerify(P, g, sig.y, m, sig.r, sig.s);
      st = { P, g, m, x, k, y: sig.y, r: sig.r, s: sig.s, kInv: sig.kInv, ver, given: false };
      return [
        L('rsa.sign.key', { g: fmt(g), x: fmt(x), p: fmt(P), y: fmt(sig.y) }),
        L('rsa.sign.nonce', { g: fmt(g), k: fmt(k), p: fmt(P), r: fmt(sig.r) }),
        L('rsa.sign.s', { p1: fmt(P - 1n), s: fmt(sig.s), r: fmt(sig.r) }),
        L('rsa.sign.verifyLeft', { p: fmt(P), lhs: fmt(ver.lhs) }),
        verdictCaption(ver, g, m, P),
      ];
    },

    show(step, prev) {
      let animate = step === prev + 1;
      let A = ctx.anim;
      let s = st;
      let base = s.given ? 0 : 2;
      let leftAt = base + 1;
      let rightAt = base + 2;
      sigOut.textContent = s.given || step >= 2 ? `(${fmt(s.r)}, ${fmt(s.s)})` : '?';

      let rotor = makeRotor(s.P);
      let rest = s.y;
      rotor.peg(s.y, step === 0 ? 'is-now alice' : 'alice');
      if (!s.given && step >= 1) {
        rotor.peg(s.r, step === 1 || step === 2 ? 'is-now' : '');
        rest = s.r;
      }
      if (step >= leftAt) {
        rotor.jump(s.y, s.ver.lhs, step === leftAt ? 'is-now bob' : 'bob');
        rotor.peg(s.ver.lhs, step === leftAt ? 'is-now bob' : 'bob');
        rest = s.ver.lhs;
      }
      if (step >= rightAt) {
        rotor.jump(s.g, s.ver.rhs, 'is-now');
        rotor.peg(s.ver.rhs, s.ver.ok ? 'is-now' : 'is-now eve');
        rotor.target(s.ver.lhs, s.ver.ok ? 'hit' : '');
        rest = s.ver.rhs;
      }
      let restOf = (k) => {
        if (k >= rightAt) return s.ver.rhs;
        if (k >= leftAt) return s.ver.lhs;
        if (!s.given && k >= 1) return s.r;
        return s.y;
      };
      rotor.turnTo(rest, { from: animate ? restOf(prev) : null, anim: A });

      let blocks = [chips, line(`${v('y')} = <span class="alice">${fmt(s.y)}</span>`, step === 0 ? 'is-now' : '')];
      if (!s.given) {
        if (step >= 1) blocks.push(line(`${v('r')} = ${fmt(s.g)}${sup(fmt(s.k))} mod ${fmt(s.P)} = ${fmt(s.r)}`, step === 1 ? 'is-now' : ''));
        if (step >= 2) {
          blocks.push(
            line(`${v('k')}${sup('−1')} mod ${fmt(s.P - 1n)} = ${fmt(s.kInv)}`, 'dim-line'),
            line(`${v('s')} = (${fmt(s.m)} − ${fmt(s.x)} · ${fmt(s.r)}) · ${fmt(s.kInv)} = ${fmt(s.s)}`, step === 2 ? 'is-now' : ''),
          );
        }
      }
      if (step >= leftAt) blocks.push(line(`${fmt(s.y)}${sup(fmt(s.r))} · ${fmt(s.r)}${sup(fmt(s.s))} ≡ <span class="bob">${fmt(s.ver.lhs)}</span>`, step === leftAt ? 'is-now' : ''));
      if (step >= rightAt) {
        blocks.push(
          line(`${fmt(s.g)}${sup(fmt(s.m))} ≡ ${fmt(s.ver.rhs)}`, 'is-now'),
          h('p', { class: `line big ${s.ver.ok ? 'is-now' : 'eve'}` }, T(L(s.ver.ok ? 'rsa.sign.valid' : 'rsa.sign.invalid'))),
        );
      }
      ctx.canvas.replaceChildren(work(...blocks), figure(rotor.el));
      if (!animate) return;
      animateNow(A, rotor.el);
      writeNowRows(A, ctx.canvas);
      if (step === rightAt) A.pulse(ctx.canvas.querySelector('.line.big'), { delay: 800 });
    },
  };
}

function verdictCaption(ver, g, m, P) {
  let params = { g: fmt(g), m: fmt(m), p: fmt(P), rhs: fmt(ver.rhs), lhs: fmt(ver.lhs) };
  return L(ver.ok ? 'rsa.sign.rightValid' : 'rsa.sign.rightInvalid', params);
}

// ================================================================ ElGamal nonce reuse

function reuseScene(ctx) {
  let p = { p: 991, g: 12, x: 106, k: 157, m1: 1, m2: 500 };
  let st = null;
  let xOut = h('span', { class: 'answer eve' }, '?');
  ctx.formula.classList.add('compact');
  let sx = param(ctx, p, 'x', { min: 1, max: 989, label: 'private key x', tone: 'alice' });
  let sk = param(ctx, p, 'k', {
    min: 1,
    max: 989,
    label: 'nonce k',
    accept: (x) => nt.gcd(BigInt(x), 990n) === 1n,
  });
  let s1 = param(ctx, p, 'm1', { min: 0, max: 989, label: 'first message' });
  let s2 = param(ctx, p, 'm2', { min: 0, max: 989, label: 'second message' });
  setFormula(ctx.formula, lbl(`${v('m')}${sub('1')} =`), s1, lbl(`${v('m')}${sub('2')} =`), s2, gap(), lbl(`${v('k')} =`), sk, gap(), lbl(`${v('x')} =`), sx, op('→'), xOut);

  return {
    steps() {
      if (p.m1 === p.m2) throw new nt.NtError('Use two different messages.', '異なる 2 つのメッセージを使ってください。', 'err.rsa.distinctMessages');
      let P = B(p.p);
      let g = B(p.g);
      let x = B(p.x);
      let k = B(p.k);
      let a = nt.elgamalSign(P, g, x, B(p.m1), k);
      let b = nt.elgamalSign(P, g, x, B(p.m2), k);
      let rec = nt.elgamalKReuse(P, g, a.y, { m: B(p.m1), r: a.r, s: a.s }, { m: B(p.m2), r: b.r, s: b.s });
      if (!rec.ks.length || !rec.xs.length) {
        throw new nt.NtError(
          'These two signatures do not pin down k; try other messages.',
          'この 2 つの署名からは k が決まりません。別のメッセージを試してください。',
          'err.rsa.kNotPinned',
        );
      }
      st = { P, g, y: a.y, r: a.r, s1: a.s, s2: b.s, m1: B(p.m1), m2: B(p.m2), k: rec.ks[0], x: rec.xs[0] };
      let q = P - 1n;
      return [
        L('rsa.reuse.same', { r: fmt(a.r), s1: fmt(a.s), s2: fmt(b.s) }),
        L('rsa.reuse.subtract', { q: fmt(q), k: fmt(st.k) }),
        L('rsa.reuse.x', { q: fmt(q), x: fmt(st.x) }),
        L('rsa.reuse.lesson'),
      ];
    },

    show(step, prev) {
      let animate = step === prev + 1;
      let A = ctx.anim;
      let s = st;
      xOut.textContent = step >= 2 ? fmt(s.x) : '?';
      let rotor = makeRotor(s.P);
      rotor.peg(s.y, 'alice');
      rotor.peg(s.r, step === 0 ? 'is-now' : '');
      let rest = s.r;
      if (step >= 1) {
        let gk = nt.modPow(s.g, s.k, s.P);
        rotor.jump(s.g, gk, step === 1 ? 'is-now eve' : 'eve');
        rotor.target(s.r, 'hit');
        rest = gk;
      }
      if (step >= 2) {
        rotor.jump(s.g, s.y, step === 2 ? 'is-now eve' : 'eve');
        rotor.peg(s.y, 'is-now eve');
        rotor.target(s.y, 'hit');
        rest = s.y;
      }
      let restOf = (k) => (k >= 2 ? s.y : s.r);
      rotor.turnTo(rest, { from: animate ? restOf(prev) : null, anim: A });

      let blocks = [
        ledger(
          ['', v('m'), v('r'), v('s')],
          [
            { cells: ['1', s.m1, s.r, s.s1], cellCls: ['dim', '', step === 0 ? 'used' : '', ''] },
            { cells: ['2', s.m2, s.r, s.s2], cellCls: ['dim', '', step === 0 ? 'used' : '', ''] },
          ],
        ),
      ];
      if (step >= 1) blocks.push(line(`<span class="eve">${v('k')} = ${fmt(s.k)}</span>`, step === 1 ? 'is-now' : ''));
      if (step >= 2) blocks.push(line(`<span class="eve">${v('x')} = ${fmt(s.x)}</span>${'&emsp;'}${fmt(s.g)}${sup(fmt(s.x))} mod ${fmt(s.P)} = ${fmt(s.y)}`, step === 2 ? 'is-now' : ''));
      if (step >= 3) blocks.push(h('p', { class: 'line big eve' }, T(L('rsa.reuse.recovered'))));
      ctx.canvas.replaceChildren(work(...blocks), figure(rotor.el));
      if (!animate) return;
      animateNow(A, rotor.el);
      writeNowRows(A, ctx.canvas);
      if (step === 2) A.pulse(xOut, { delay: 700 });
      if (step === 3) A.appear(ctx.canvas.querySelector('.line.big'), { from: 'rise' });
    },
  };
}

export const mode = {
  scenes: [
    { id: 'keygen', title: L('rsa.keygen.title'), create: keygenScene },
    { id: 'crypt', title: L('rsa.crypt.title'), create: cryptScene },
    { id: 'crt', title: L('rsa.crt.title'), create: crtScene },
    { id: 'common', title: L('rsa.common.title'), create: commonScene },
    { id: 'hastad', title: L('rsa.hastad.title'), create: hastadScene },
    { id: 'fermat', title: L('rsa.fermat.title'), create: fermatScene },
    { id: 'smalld', title: L('rsa.smalld.title'), create: smallDScene },
    { id: 'sign', title: L('rsa.sign.title'), create: signScene },
    { id: 'reuse', title: L('rsa.reuse.title'), create: reuseScene },
  ],
};
