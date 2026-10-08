// Pure helpers and protocol data for the Diffie–Hellman mode.

import * as nt from './nt.js';

export function dhRun(p, g, xa, xb) {
  let ya = nt.modPow(g, xa, p);
  let yb = nt.modPow(g, xb, p);
  return { ya, yb, kA: nt.modPow(yb, xa, p), kB: nt.modPow(ya, xb, p) };
}

// Eve answers each side with her own value and ends up with one key per side.
export function pitm(p, g, xa, xb, xe) {
  let ya = nt.modPow(g, xa, p);
  let yb = nt.modPow(g, xb, p);
  let ye = nt.modPow(g, xe, p);
  return {
    ya,
    yb,
    ye,
    kAE: nt.modPow(ye, xa, p),
    kAEeve: nt.modPow(ya, xe, p),
    kBE: nt.modPow(ye, xb, p),
    kBEeve: nt.modPow(yb, xe, p),
  };
}

// A substituted public value v in {1, 0, p-1} collapses any key v^x into {-1, 0, 1}.
export function collapse(p, v, x) {
  return nt.modPow(v, x, p);
}

export function isTrap(p, y) {
  let r = nt.mod(y, p);
  return r === 0n || r === 1n || r === p - 1n;
}

export function honestExponent(p) {
  return (p - 1n) / 3n + 1n;
}

const YEAR_S = 31557600;

// Wall-clock time for 2^log2Tries tries at `rate` per second, as { unit, v }.
// `unit` names a catalog entry (dh.unit.*); `v` is the number, as trusted HTML.
// Works in log space so 2^2048 tries does not overflow.
export function durationParts(log2Tries, rate = 1e9) {
  let l = log2Tries * Math.log10(2) - Math.log10(rate);
  if (l < -3) return { unit: 'lt1ms', v: '' };
  if (l < 0) return { unit: 'ms', v: String(Math.round(10 ** l * 1000)) };
  let s = 10 ** l;
  if (s < 60) return { unit: 's', v: String(+s.toPrecision(2)) };
  if (s < 3600) return { unit: 'min', v: String(+(s / 60).toPrecision(2)) };
  if (s < 86400) return { unit: 'h', v: String(+(s / 3600).toPrecision(2)) };
  if (s < YEAR_S) return { unit: 'd', v: String(+(s / 86400).toPrecision(2)) };
  let ly = l - Math.log10(YEAR_S);
  if (ly < 4) return { unit: 'y', v: String(+(10 ** ly).toPrecision(2)) };
  let e = Math.round(ly);
  return { unit: 'y', v: `10<sup>${e}</sup>`, exp: e };
}

const EN_UNIT = { ms: 'ms', s: 's', min: 'min', h: 'h', d: 'd', y: 'y' };

// The same duration as a short English label.
export function duration(log2Tries, rate = 1e9) {
  let d = durationParts(log2Tries, rate);
  if (d.unit === 'lt1ms') return '< 1 ms';
  if (d.exp != null) return `10^${d.exp} y`;
  return `${d.v} ${EN_UNIT[d.unit]}`;
}

// ---------------------------------------------------------------- protocol properties
// Texts are catalog keys (assets/i18n/<code>/dh.js).
// A property value is the 1-based message index at which it becomes true,
// 'no' (never), 'cond' (holds only under a stated condition), or for whole-protocol
// properties 'yes' / 'no'.

export const PROPS = [
  { id: 'ea', two: true, title: 'dh.prop.ea' },
  { id: 'ika', two: true, title: 'dh.prop.ika' },
  { id: 'kc', two: true, title: 'dh.prop.kc' },
  { id: 'eka', two: true, title: 'dh.prop.eka' },
  { id: 'fs', two: false, title: 'dh.prop.fs' },
  { id: 'kk', two: false, title: 'dh.prop.kk' },
];

export const PROTOCOLS = {
  plain: {
    title: 'dh.proto.plain.title',
    key: 'α<sup><var>xy</var></sup>',
    setup: 'dh.proto.plain.setup',
    messages: [
      { from: 'a', to: 'b', html: 'α<sup><var>x</var></sup>', caption: 'dh.proto.plain.m1' },
      { from: 'b', to: 'a', html: 'α<sup><var>y</var></sup>', caption: 'dh.proto.plain.m2' },
    ],
    props: {
      ea: { ab: 'no', ba: 'no', why: 'dh.proto.plain.ea' },
      ika: { ab: 'no', ba: 'no', why: 'dh.proto.plain.ika' },
      kc: { ab: 'no', ba: 'no', why: 'dh.proto.plain.kc' },
      fs: { v: 'yes', why: 'dh.proto.plain.fs' },
      kk: { v: 'yes', why: 'dh.proto.plain.kk' },
    },
    note: null,
  },
  static: {
    title: 'dh.proto.static.title',
    key: 'α<sup><var>ay</var></sup>',
    setup: 'dh.proto.static.setup',
    messages: [
      { from: 'b', to: 'a', html: 'cert<sub>B</sub>', caption: 'dh.proto.static.m1' },
      { from: 'a', to: 'b', html: 'α<sup><var>a</var></sup> ‖ <var>r</var><sub>A</sub>', caption: 'dh.proto.static.m2' },
      {
        from: 'b',
        to: 'a',
        html: 'α<sup><var>y</var></sup> ‖ Sig<sub>B</sub>(<var>r</var><sub>A</sub> ‖ α<sup><var>y</var></sup>)',
        caption: 'dh.proto.static.m3',
      },
    ],
    props: {
      ea: { ab: 'no', ba: 3, why: 'dh.proto.static.ea' },
      ika: { ab: 'cond', ba: 3, why: 'dh.proto.static.ika' },
      kc: { ab: 'no', ba: 'no', why: 'dh.proto.static.kc' },
      fs: { v: 'no', why: 'dh.proto.static.fs' },
      kk: { v: 'yes', why: 'dh.proto.static.kk' },
    },
    note: null,
  },
  sts: {
    title: 'dh.proto.sts.title',
    key: 'α<sup><var>xy</var></sup>',
    setup: 'dh.proto.sts.setup',
    messages: [
      { from: 'a', to: 'b', html: 'α<sup><var>x</var></sup>', caption: 'dh.proto.sts.m1' },
      {
        from: 'b',
        to: 'a',
        html: 'α<sup><var>y</var></sup>, E<sub><var>k</var></sub>(Sig<sub>B</sub>(α<sup><var>y</var></sup>, α<sup><var>x</var></sup>))',
        caption: 'dh.proto.sts.m2',
      },
      {
        from: 'a',
        to: 'b',
        html: 'E<sub><var>k</var></sub>(Sig<sub>A</sub>(α<sup><var>x</var></sup>, α<sup><var>y</var></sup>))',
        caption: 'dh.proto.sts.m3',
      },
    ],
    props: {
      ea: { ab: 3, ba: 2, why: 'dh.proto.sts.ea' },
      ika: { ab: 3, ba: 2, why: 'dh.proto.sts.ika' },
      kc: { ab: 3, ba: 2, why: 'dh.proto.sts.kc' },
      fs: { v: 'yes', why: 'dh.proto.sts.fs' },
      kk: { v: 'yes', why: 'dh.proto.sts.kk' },
    },
    note: 'dh.proto.sts.note',
  },
};

// Explicit key authentication = implicit key authentication + key confirmation.
export function propValue(proto, id, dir) {
  if (id === 'eka') {
    let a = propValue(proto, 'ika', dir);
    let b = propValue(proto, 'kc', dir);
    if (typeof a === 'number' && typeof b === 'number') return Math.max(a, b);
    if (a === 'cond' && typeof b === 'number') return 'cond';
    return 'no';
  }
  let p = proto.props[id];
  return dir ? p[dir] : p.v;
}

// The mark a property cell shows at step k (0 = setup, 1..M = messages, M+1 = verdict).
export function markAt(value, k, M) {
  let final = k > M;
  if (typeof value === 'number') return value <= k ? 'yes' : final ? 'no' : 'pending';
  if (value === 'yes') return final ? 'yes' : 'pending';
  if (value === 'cond') return final ? 'cond' : 'pending';
  return final ? 'no' : 'pending';
}
