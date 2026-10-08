import { NtError } from '../nt.js';
import { h, svg, bytesToHex } from '../ui.js';
import { T, L, render } from '../i18n.js';
import { setFormula, op, ledger, stagger, work, figure } from '../kit.js';
import { tls12Session, tls13Session, REQUEST } from '../tls-lib.js';

const REQ = { req: REQUEST };

function note(key) {
  return h('p', { class: 'line dim-line note' }, T(L(key)));
}

const ICONS = {
  lock: 'M6 11h12v9H6z M9 11V8a3 3 0 0 1 6 0v3',
  open: 'M6 11h12v9H6z M9 11V8a3 3 0 0 1 5.8-1',
  key: 'M4 15a4 4 0 1 0 8 0a4 4 0 1 0-8 0 M11 12l9-9 M16 7l3 3 M14 9l2 2',
  check: 'M5 12.5l4.5 4.5L19 7',
  cross: 'M6 6l12 12M18 6L6 18',
  warn: 'M12 4l9 16H3z M12 10v4.5 M12 17.2v.3',
  pen: 'M4 20l4-1 11-11-3-3L5 16z M14 6l3 3',
};

function icon(name, cls = '') {
  return svg(
    'svg',
    { class: `ico ico-${name} ${cls}`, viewBox: '0 0 24 24', 'aria-hidden': 'true' },
    svg('path', { d: ICONS[name] }),
  );
}

function hex(bytes, max = 10) {
  return h('span', { class: 'hex' }, bytesToHex(bytes, max));
}

function stateOf(step, k) {
  if (step < k) return 'is-done';
  if (step === k) return 'is-now';
  return 'is-ahead';
}

// ---------------------------------------------------------------- sequence diagram

// rows: { step, kind: 'msg' | 'event', dir, label, sub, lock, rec, tone, icon }
function sequence(rows, k) {
  let list = h('ol', { class: 'seq-rows' });
  for (let r of rows) {
    let state = stateOf(r.step, k);
    if (r.kind === 'event') {
      list.append(
        h(
          'li',
          { class: `seq-row seq-event ${state} ${r.tone ?? ''}` },
          h('span', { class: 'seq-event-body' }, r.icon ? icon(r.icon) : null, h('span', {}, T(r.label))),
        ),
      );
      continue;
    }
    let pkt = h(
      'span',
      { class: 'pkt' },
      r.lock ? icon('lock') : null,
      h('span', { class: 'pkt-name', html: r.label }),
      r.sub ? h('span', { class: 'pkt-sub', html: r.sub }) : null,
    );
    list.append(
      h(
        'li',
        { class: `seq-row seq-msg dir-${r.dir} ${state}` },
        h('span', { class: 'wire' }, h('span', { class: 'wire-line' }), pkt),
        h('span', { class: `seq-rec${r.rec ? ' on' : ''}`, 'aria-label': r.rec ? render(L('tls.aria.recorded')) : null }),
      ),
    );
  }
  return h(
    'div',
    { class: 'seq' },
    h(
      'div',
      { class: 'seq-head' },
      h('span', { class: 'lane alice' }, T(L('tls.lane.client'))),
      h('span', { class: 'lane bob' }, T(L('tls.lane.server'))),
      h('span', { class: 'lane eve' }, T(L('tls.lane.eve'))),
    ),
    list,
  );
}

function animateRow(A, root) {
  let li = root.querySelector('.seq-row.is-now');
  if (!li) return;
  if (li.classList.contains('seq-event')) {
    A.appear(li.firstChild, { from: 'write', duration: 700, delay: 100 });
    return;
  }
  let pkt = li.querySelector('.pkt');
  let wireLine = li.querySelector('.wire-line');
  let dist = Math.max(0, (wireLine.clientWidth - pkt.offsetWidth) / 2);
  let dir = li.classList.contains('dir-right') ? -1 : li.classList.contains('dir-left') ? 1 : 0;
  A.run(wireLine, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 600 });
  if (dir) {
    A.run(
      pkt,
      [
        { transform: `translateX(${dir * dist}px)`, opacity: 0 },
        { opacity: 1, offset: 0.12 },
        { transform: 'none', opacity: 1 },
      ],
      { delay: 120, duration: 950 },
    );
  } else {
    A.appear(pkt, { from: 'scale', delay: 250 });
  }
  let rec = li.querySelector('.seq-rec.on');
  if (rec) A.appear(rec, { from: 'scale', delay: 1000, duration: 360 });
}

// ---------------------------------------------------------------- values ledger

// items: { step, name (HTML or node), value (bytes | string | node), tone, eveFrom, gone }
// Only values that exist by step k get a row, so the table never shows empty rows.
function valuesTable(items, k) {
  let rows = items.filter((it) => it.step <= k).map((it) => {
    let eveHas = it.eveFrom != null && it.eveFrom <= k;
    let gone = it.gone != null && it.gone <= k;
    let cls = it.step === k || it.eveFrom === k || it.gone === k ? 'is-now' : '';
    if (it.eveFrom === k && it.step !== k) cls = 'eve-now';
    let value;
    if (gone) value = h('span', { class: 'gone' }, T(L('tls.values.deleted')));
    else if (it.value instanceof Uint8Array) value = hex(it.value, it.max ?? 10);
    else if (it.value instanceof Node) value = it.value;
    else value = h('span', { class: 'hex' }, String(it.value));
    return {
      cls,
      cells: [
        it.name instanceof Node ? h('span', { class: it.tone ?? '' }, it.name) : h('span', { class: it.tone ?? '', html: it.name }),
        value,
        h('span', { class: `mark${eveHas ? ' on eve-mark' : ''}`, 'aria-label': render(L(eveHas ? 'tls.aria.eveHas' : 'tls.aria.eveNot')) }),
      ],
      cellCls: ['', '', ''],
    };
  });
  let table = ledger(['', T(L('tls.values.value')), 'Eve'], rows);
  table.classList.add('tls-values');
  return table;
}

function chip(label, onclick, pressed = null) {
  return h(
    'button',
    { type: 'button', class: `chip${pressed ? ' is-on' : ''}`, onclick, 'aria-pressed': pressed == null ? null : String(pressed) },
    T(label),
  );
}

function waiting() {
  return h(
    'div',
    { class: 'tls-wait', role: 'status' },
    h('span', { class: 'hole punched' }),
    h('span', { class: 'hole punched' }),
    h('span', { class: 'hole punched' }),
  );
}

// Shared async lifecycle: generate real keys once, regenerate on demand.
function liveSession(ctx, build) {
  let s = { data: null, failed: false, token: 0, dead: false };
  async function regenerate(announce) {
    let my = ++s.token;
    s.data = null;
    s.failed = false;
    if (announce) ctx.refresh();
    try {
      let data = await build();
      if (s.dead || my !== s.token) return;
      s.data = data;
    } catch (err) {
      console.error(err);
      if (s.dead || my !== s.token) return;
      s.failed = true;
    }
    ctx.refresh();
  }
  s.regenerate = regenerate;
  s.check = () => {
    if (s.failed) {
      throw new NtError(
        'This browser could not run WebCrypto. Open the page over https or localhost in a current browser.',
        'このブラウザでは WebCrypto を実行できませんでした。https か localhost で、最新のブラウザから開いてください。',
        'tls.err.webcrypto',
      );
    }
  };
  regenerate(false);
  return s;
}

const WAIT_CAPTION = L('tls.wait');

// ================================================================ TLS 1.2 RSA key transport

function tls12Scene(ctx) {
  let lockSlot = h('span', { class: 'lock-slot' });
  setFormula(
    ctx.formula,
    h('span', {}, T(L('tls.key'))),
    op('='),
    h('span', { html: 'HKDF(' }),
    h('span', { class: 'alice', html: 'pms' }),
    h('span', { html: ', <var>r</var><sub>C</sub> ‖ <var>r</var><sub>S</sub>)' }),
    lockSlot,
  );
  let session = liveSession(ctx, tls12Session);
  let newChip = chip(L('tls.newSession'), () => session.regenerate(true));

  function rows() {
    return [
      { step: 0, kind: 'msg', dir: 'right', label: 'ClientHello', sub: '<var>r</var><sub>C</sub>', rec: true },
      { step: 1, kind: 'msg', dir: 'left', label: 'ServerHello', sub: '<var>r</var><sub>S</sub>', rec: true },
      { step: 2, kind: 'msg', dir: 'left', label: 'Certificate', sub: 'pk<sub>S</sub>', rec: true },
      { step: 3, kind: 'msg', dir: 'right', label: 'ClientKeyExchange', sub: 'RSA(pms)', lock: true, rec: true },
      { step: 4, kind: 'event', icon: 'key', label: L('tls.ev.derive') },
      { step: 5, kind: 'msg', dir: 'both', label: 'Finished', lock: true, rec: true },
      { step: 6, kind: 'msg', dir: 'right', label: REQUEST, lock: true, rec: true },
      { step: 7, kind: 'event', tone: 'eve', icon: 'key', label: L('tls.ev.leak') },
      { step: 8, kind: 'event', tone: 'eve', icon: 'open', label: L('tls.ev.decryptPms') },
      { step: 9, kind: 'event', tone: 'eve', icon: 'open', label: L('tls.ev.reads', REQ) },
    ];
  }

  function items(d) {
    return [
      { step: 0, name: '<var>r</var><sub>C</sub>', value: d.rC, eveFrom: 0 },
      { step: 1, name: '<var>r</var><sub>S</sub>', value: d.rS, eveFrom: 1 },
      { step: 2, name: 'pk<sub>S</sub> <span class="dim">n</span>', value: d.modulus, eveFrom: 2 },
      { step: 3, name: 'pms', tone: 'alice', value: d.pms, eveFrom: 8 },
      { step: 3, name: 'RSA(pms)', value: d.encPms, eveFrom: 3 },
      { step: 4, name: T(L('tls.key')), tone: 'alice', value: d.clientKey, eveFrom: 9, max: 16 },
      { step: 6, name: T(L('tls.request')), value: d.request, eveFrom: 6 },
      { step: 7, name: 'sk<sub>S</sub>', tone: 'bob', value: 'RSA-2048', eveFrom: 7 },
      { step: 9, name: T(L('tls.eveReads')), tone: 'eve', value: d.eveReads, eveFrom: 9 },
    ];
  }

  return {
    steps() {
      session.check();
      if (!session.data) return [WAIT_CAPTION];
      return [
        L('tls.tls12.s0'),
        L('tls.tls12.s1'),
        L('tls.tls12.s2'),
        L('tls.tls12.s3'),
        L('tls.tls12.s4'),
        L('tls.tls12.s5'),
        L('tls.tls12.s6', REQ),
        L('tls.tls12.s7'),
        L('tls.tls12.s8'),
        L('tls.tls12.s9', REQ),
      ];
    },

    show(k, prev) {
      let d = session.data;
      if (!d) {
        lockSlot.replaceChildren(icon('lock', 'brass'));
        ctx.canvas.replaceChildren(work(h('div', { class: 'presets' }, newChip)), figure(waiting()));
        return;
      }
      let animate = k === prev + 1;
      let A = ctx.anim;
      let broken = k >= 9;
      lockSlot.replaceChildren(icon(broken ? 'open' : 'lock', broken ? 'eve' : 'brass'));
      let fig = sequence(rows(), k);
      ctx.canvas.replaceChildren(
        work(
          h('div', { class: 'presets' }, newChip),
          valuesTable(items(d), k),
          note('tls.tls12.note'),
        ),
        figure(fig),
      );
      if (!animate) return;
      animateRow(A, fig);
      let fresh = ctx.canvas.querySelectorAll('.tls-values tr.is-now, .tls-values tr.eve-now');
      fresh.forEach((r, i) => A.appear(r, { from: 'write', delay: 500 + i * 120, duration: 520 }));
      if (broken) A.pulse(lockSlot.firstChild, { delay: 700 });
    },

    destroy() {
      session.dead = true;
    },
  };
}

// ================================================================ TLS 1.3 ephemeral ECDH

function tls13Scene(ctx) {
  let lockSlot = h('span', { class: 'lock-slot' });
  setFormula(
    ctx.formula,
    h('var', {}, 'z'),
    op('='),
    h('span', { html: '<var>g</var><sup><var class="alice">x</var><var class="bob">y</var></sup>' }),
    h('span', { class: 'op' }, '→ ', T(L('tls.keys'))),
    lockSlot,
  );
  let session = liveSession(ctx, tls13Session);
  let newChip = chip(L('tls.newSession'), () => session.regenerate(true));

  function rows() {
    return [
      { step: 0, kind: 'msg', dir: 'right', label: 'ClientHello', sub: '<var>r</var><sub>C</sub>, <var>g</var><sup><var>x</var></sup>', rec: true },
      { step: 1, kind: 'msg', dir: 'left', label: 'ServerHello', sub: '<var>r</var><sub>S</sub>, <var>g</var><sup><var>y</var></sup>', rec: true },
      { step: 2, kind: 'event', icon: 'key', label: L('tls.ev.both13') },
      { step: 3, kind: 'msg', dir: 'left', label: '{Certificate}', lock: true, rec: true },
      { step: 4, kind: 'msg', dir: 'left', label: '{CertificateVerify}', sub: 'Sig<sub>S</sub>', lock: true, rec: true },
      { step: 5, kind: 'msg', dir: 'both', label: '{Finished}', lock: true, rec: true },
      { step: 6, kind: 'msg', dir: 'right', label: REQUEST, lock: true, rec: true },
      { step: 7, kind: 'event', icon: 'cross', label: L('tls.ev.deleted') },
      { step: 8, kind: 'event', tone: 'eve', icon: 'key', label: L('tls.ev.leak') },
      { step: 9, kind: 'event', icon: 'lock', label: L('tls.ev.sealed') },
      { step: 10, kind: 'event', tone: 'eve', icon: 'pen', label: L('tls.ev.sign') },
    ];
  }

  function verified(ok) {
    return h('span', { class: `hex verdict ${ok ? 'ok' : 'eve'}` }, icon(ok ? 'check' : 'cross'), T(L(ok ? 'tls.verifies' : 'tls.fails')));
  }

  function items(d) {
    return [
      { step: 0, name: '<var>g</var><sup><var>x</var></sup>', tone: 'alice', value: d.gx, eveFrom: 0 },
      { step: 1, name: '<var>g</var><sup><var>y</var></sup>', tone: 'bob', value: d.gy, eveFrom: 1 },
      { step: 0, name: '<var>x</var>, <var>y</var>', value: T(L('tls.neverSent')), gone: 7 },
      { step: 2, name: '<var>z</var>', value: d.z, gone: 7 },
      { step: 3, name: '{Certificate}', value: d.encCert, eveFrom: 3 },
      { step: 4, name: 'Sig<sub>S</sub>', tone: 'bob', value: verified(d.signatureOk) },
      { step: 5, name: 'Finished', value: verified(d.finishedOk) },
      { step: 6, name: T(L('tls.request')), value: d.request, eveFrom: 6 },
      { step: 8, name: 'sk<sub>S</sub>', tone: 'bob', value: 'ECDSA P-256', eveFrom: 8 },
      { step: 10, name: T(L('tls.forgedSig')), tone: 'eve', value: verified(d.forgedOk), eveFrom: 10 },
    ];
  }

  return {
    steps() {
      session.check();
      if (!session.data) return [WAIT_CAPTION];
      return [
        L('tls.tls13.s0'),
        L('tls.tls13.s1'),
        L('tls.tls13.s2'),
        L('tls.tls13.s3'),
        L('tls.tls13.s4'),
        L('tls.tls13.s5'),
        L('tls.tls13.s6', REQ),
        L('tls.tls13.s7'),
        L('tls.tls13.s8'),
        L('tls.tls13.s9'),
        L('tls.tls13.s10'),
      ];
    },

    show(k, prev) {
      let d = session.data;
      lockSlot.replaceChildren(icon('lock', 'brass'));
      if (!d) {
        ctx.canvas.replaceChildren(work(h('div', { class: 'presets' }, newChip)), figure(waiting()));
        return;
      }
      let animate = k === prev + 1;
      let A = ctx.anim;
      let fig = sequence(rows(), k);
      ctx.canvas.replaceChildren(
        work(
          h('div', { class: 'presets' }, newChip),
          valuesTable(items(d), k),
          note('tls.tls13.note'),
        ),
        figure(fig),
      );
      if (!animate) return;
      animateRow(A, fig);
      let fresh = ctx.canvas.querySelectorAll('.tls-values tr.is-now, .tls-values tr.eve-now');
      fresh.forEach((r, i) => A.appear(r, { from: 'write', delay: 500 + i * 120, duration: 520 }));
      if (k === 9) A.pulse(lockSlot.firstChild, { delay: 600 });
    },

    destroy() {
      session.dead = true;
    },
  };
}

// ================================================================ interception

const SITUATIONS = [
  { id: 'direct', label: L('tls.sit.direct') },
  { id: 'installed', label: L('tls.sit.installed') },
  { id: 'untrusted', label: L('tls.sit.untrusted') },
];

function interceptScene(ctx) {
  let p = { situation: 'installed' };
  let answer = h('span', { class: 'answer' }, '?');
  setFormula(
    ctx.formula,
    h('span', {}, T(L('tls.intercept.whoReads'))),
    h('code', { class: 'req' }, REQUEST),
    h('span', { class: 'answer-pair' }, op('→'), answer),
  );

  function node(letter, name, tone, mark = null) {
    return h(
      'div',
      { class: `node ${tone}` },
      h('span', { class: 'disc' }, h('span', { class: 'disc-letter' }, letter), mark ? h('span', { class: `disc-mark ${mark}` }, icon(mark === 'ok' ? 'check' : 'cross')) : null),
      h('span', { class: 'node-name' }, T(name)),
    );
  }

  function tunnel(state, pkt) {
    return h('div', { class: `tunnel ${state}` }, h('span', { class: 'tunnel-band' }), pkt);
  }

  function packet(label, locked = true) {
    return h('span', { class: 'pkt' }, locked ? icon('lock') : null, h('span', { class: 'pkt-name', html: label }));
  }

  return {
    steps() {
      let s = p.situation;
      let proxy = s !== 'direct';
      return [
        L(proxy ? 'tls.intercept.s0.proxy' : 'tls.intercept.s0.direct'),
        L(proxy ? 'tls.intercept.s1.proxy' : 'tls.intercept.s1.direct'),
        L(`tls.intercept.s2.${s}`),
        L(`tls.intercept.s3.${s}`, REQ),
        L('tls.intercept.s4'),
      ];
    },

    show(k, prev) {
      let animate = k === prev + 1;
      let A = ctx.anim;
      let s = p.situation;
      let proxy = s !== 'direct';
      let refused = s === 'untrusted' && k >= 2;
      let checked = k >= 2;

      let pkt1 = null;
      let pkt2 = null;
      let plain = null;
      if (k === 1) pkt1 = packet('ClientHello', false);
      if (k >= 3 && !refused) {
        pkt1 = packet(REQUEST);
        if (proxy) {
          pkt2 = packet(REQUEST);
          plain = h('span', { class: 'plain' }, REQUEST);
        }
      }

      let browserMark = checked ? (refused ? 'bad' : 'ok') : null;
      let topo = h(
        'div',
        { class: `topo${proxy ? ' has-proxy' : ''}`, role: 'img', 'aria-label': render(L(proxy ? 'tls.aria.topoProxy' : 'tls.aria.topoDirect')) },
        node('B', L('tls.node.browser'), 'alice', browserMark),
        tunnel(refused && k >= 3 ? 'is-broken' : k === 1 || (k >= 3 && !refused) ? 'is-live' : '', pkt1),
        proxy ? h('div', { class: 'proxy-slot' }, node('P', L('tls.node.proxy'), 'eve', checked && !refused ? 'ok' : null), plain) : null,
        proxy ? tunnel(refused ? 'is-idle' : k >= 3 ? 'is-live' : '', pkt2) : null,
        node('S', L('tls.lane.server'), 'bob'),
      );
      if (refused) topo.append(h('div', { class: 'warning' }, icon('warn'), T(L('tls.notPrivate'))));

      let chips = h(
        'div',
        { class: 'presets' },
        SITUATIONS.map((sit) =>
          chip(sit.label, () => {
            p.situation = sit.id;
            ctx.refresh();
          }, sit.id === s),
        ),
      );

      let blocks = [chips];
      if (checked) {
        let ok = (yes) => h('span', { class: `verdict ${yes ? 'ok' : 'eve'}` }, icon(yes ? 'check' : 'cross'));
        let chainRows = {
          direct: [{ cells: [T(L('tls.route.bs')), 'server.example ← Public CA', ok(true)] }],
          installed: [
            { cls: 'eve-now', cells: [T(L('tls.route.bp')), h('span', {}, 'server.example ← ', h('span', { class: 'eve' }, 'Proxy CA')), ok(true)] },
            { cells: [T(L('tls.route.ps')), 'server.example ← Public CA', ok(true)] },
          ],
          untrusted: [{ cells: [T(L('tls.route.bp')), h('span', {}, 'server.example ← ', h('span', { class: 'eve' }, 'Proxy CA')), ok(false)] }],
        }[s];
        blocks.push(ledger([T(L('tls.intercept.conn')), T(L('tls.intercept.chain')), ''], chainRows));
        if (s === 'installed') blocks.push(h('p', { class: 'line dim-line' }, T(L('tls.intercept.installedNote'))));
      }
      if (k >= 4) {
        blocks.push(
          h(
            'ul',
            { class: 'try-list' },
            h('li', { class: 'tape-note' }, T(L('tls.tip.keylog'))),
            h('li', { class: 'tape-note' }, T(L('tls.tip.mitm'))),
            h('li', { class: 'tape-note' }, T(L('tls.tip.remove'))),
          ),
        );
      }

      ctx.canvas.replaceChildren(work(...blocks), figure(topo));

      answer.replaceChildren(k >= 3 ? T(L(`tls.readers.${s}`)) : '?');
      answer.classList.toggle('eve', k >= 3 && s === 'installed');

      if (!animate) return;
      if (k === 0) {
        topo.querySelectorAll('.node, .tunnel').forEach((el, i) => A.appear(el, { from: 'scale', delay: i * 140, duration: 480 }));
      }
      for (let [i, pk] of [pkt1, pkt2].entries()) {
        if (!pk) continue;
        let band = pk.parentElement;
        let dist = Math.max(0, (band.clientWidth - pk.offsetWidth) / 2);
        A.run(pk, [{ transform: `translateX(${-dist}px)`, opacity: 0 }, { opacity: 1, offset: 0.12 }, { transform: 'none', opacity: 1 }], {
          delay: 150 + i * 1100,
          duration: 900,
        });
      }
      if (plain) A.appear(plain, { from: 'drop', delay: 1000 });
      let marks = topo.querySelectorAll('.disc-mark');
      if (k === 2) marks.forEach((m, i) => A.appear(m, { from: 'scale', delay: 300 + i * 200 }));
      let warn = topo.querySelector('.warning');
      if (warn && k === 2) A.appear(warn, { from: 'rise', delay: 500 });
      if (k === 3) A.pulse(answer, { delay: 900 });
      if (k === 4) ctx.canvas.querySelectorAll('.try-list li').forEach((li, i) => A.appear(li, { from: 'write', delay: stagger(i, 3, 600, 220), duration: 600 }));
      let fresh = ctx.canvas.querySelectorAll('.work .ledger tbody tr');
      if (k === 2) fresh.forEach((r, i) => A.appear(r, { from: 'write', delay: 200 + i * 160, duration: 500 }));
    },
  };
}

export const mode = {
  scenes: [
    { id: 'tls12', title: L('tls.tls12.title'), create: tls12Scene },
    { id: 'tls13', title: L('tls.tls13.title'), create: tls13Scene },
    { id: 'intercept', title: L('tls.intercept.title'), create: interceptScene },
  ],
};
