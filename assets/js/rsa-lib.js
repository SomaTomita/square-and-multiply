// Pure helpers for mode 2 (RSA and ElGamal). BigInt in, BigInt out.

import { NtError, gcd, mod, modPow } from './nt.js';

// x^e = x (mod pq) has (1 + gcd(e-1, p-1)) * (1 + gcd(e-1, q-1)) solutions.
export function fixedPointCount(e, p, q) {
  return (1n + gcd(e - 1n, p - 1n)) * (1n + gcd(e - 1n, q - 1n));
}

export function fixedPoints(e, n, cap = 50000n) {
  if (n > cap) return null;
  let out = [];
  for (let x = 0n; x < n; x++) if (modPow(x, e, n) === x) out.push(x);
  return out;
}

// Positions 0, e, 2e, ... (mod lambda) after each hop up to d hops.
// A long walk is cut to `cap` entries: the first hops, then the last one flagged as a skip.
export function hopChain(e, d, lambda, cap = 240) {
  let count = Number(d);
  let out = [];
  let head = count <= cap ? count : cap - 2;
  for (let j = 0; j <= head; j++) out.push({ j, v: mod(BigInt(j) * e, lambda), skip: false });
  if (count > cap) out.push({ j: count, v: mod(d * e, lambda), skip: true });
  return out;
}

// Which search tries get their own step: the first `head`, a gap marker, the last `tail`.
export function sampleTries(total, head = 10, tail = 2) {
  if (total <= head + tail + 1) return [...Array(total).keys()];
  let out = [];
  for (let i = 0; i < head; i++) out.push(i);
  out.push(-1);
  for (let i = total - tail; i < total; i++) out.push(i);
  return out;
}

// Try d = 1, 2, ...: decrypt c with d, re-encrypt with e. A real d also passes the probes.
export function smallDTrace(e, n, c, limit = 400) {
  let probes = [2n, 3n, 5n, 7n].filter((x) => x < n && gcd(x, n) === 1n);
  let tries = [];
  for (let d = 1n; d <= BigInt(limit); d++) {
    let m = modPow(c, d, n);
    let back = modPow(m, e, n);
    let ok = back === mod(c, n) && probes.every((x) => modPow(x, e * d, n) === x);
    tries.push({ d, m, back, ok });
    if (ok) return { tries, d, m };
  }
  throw new NtError('No small d found within the search limit.', '探索上限内で小さな d は見つかりませんでした。', 'err.noSmallD');
}

// Garner recombination with every intermediate value.
export function garner(mp, mq, p, q) {
  let qInv = modInvSafe(q, p);
  let diff = mod(mp - mq, p);
  let hh = mod(diff * qInv, p);
  return { qInv, diff, h: hh, m: mq + hh * q };
}

function modInvSafe(a, n) {
  let [r0, r1, t0, t1] = [n, mod(a, n), 0n, 1n];
  while (r1) {
    let q = r0 / r1;
    [r0, r1] = [r1, r0 - q * r1];
    [t0, t1] = [t1, t0 - q * t1];
  }
  if (r0 !== 1n) {
    throw new NtError(`${a} has no inverse mod ${n}.`, `${a} は mod ${n} で逆元を持ちません。`, 'err.noInverse', {
      a: String(a),
      n: String(n),
      g: String(r0),
    });
  }
  return mod(t0, n);
}
