// Number theory on BigInt. Pure functions only: every scene builds its
// animation trace from these, and tests/nt.test.mjs checks them against
// hand-worked examples.

// A user-facing error. `key` names the message in the i18n catalogs (err.*);
// `en` is the English text, used when no catalog entry exists.
export class NtError extends Error {
  constructor(en, ja, key = null, params = {}) {
    super(en);
    this.en = en;
    this.ja = ja;
    this.key = key;
    this.params = params;
  }
}

export const big = (v) => (typeof v === 'bigint' ? v : BigInt(v));

export const mod = (a, n) => {
  const r = a % n;
  return r < 0n ? r + n : r;
};

export const abs = (a) => (a < 0n ? -a : a);

export function gcd(a, b) {
  a = abs(a);
  b = abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

export const lcm = (a, b) => (a === 0n || b === 0n ? 0n : abs(a / gcd(a, b) * b));

export function modPow(base, exp, n) {
  if (n === 1n) return 0n;
  if (exp < 0n) {
    base = modInv(base, n);
    exp = -exp;
  }
  let r = 1n;
  let b = mod(base, n);
  let e = exp;
  while (e > 0n) {
    if (e & 1n) r = (r * b) % n;
    b = (b * b) % n;
    e >>= 1n;
  }
  return r;
}

// Square-and-multiply in the usual hand-worked table layout:
// one row per bit i of the exponent, holding a^(2^i) mod n.
export function powTrace(a, e, n) {
  if (n < 2n) throw new NtError('Modulus must be at least 2.', '法は 2 以上にしてください。', 'err.modulusMin');
  if (e < 0n) throw new NtError('Exponent must be non-negative.', '指数は 0 以上にしてください。', 'err.exponentNeg');
  const bits = e.toString(2);
  const rows = [];
  let sq = mod(a, n);
  for (let i = 0; i < bits.length; i++) {
    const bit = bits[bits.length - 1 - i] === '1';
    rows.push({ i, pow2: 1n << BigInt(i), value: sq, bit });
    sq = (sq * sq) % n;
  }
  const used = rows.filter((r) => r.bit);
  const partials = [];
  let acc = 1n;
  for (const r of used) {
    acc = (acc * r.value) % n;
    partials.push({ i: r.i, value: r.value, acc });
  }
  return { a: mod(a, n), e, n, bits, rows, partials, result: acc % n };
}

// Extended Euclid in table form:
// r_{i+1} = r_{i-1} - q_i r_i, same recurrence for s and t,
// with the invariant r_i = n*s_i + a*t_i.
export function egcdTable(n, a) {
  if (n <= 0n || a < 0n) throw new NtError('Use positive integers.', '正の整数を使ってください。', 'err.positiveInts');
  const rows = [
    { i: 0, r: n, q: null, s: 1n, t: 0n },
    { i: 1, r: a, q: null, s: 0n, t: 1n },
  ];
  if (a === 0n) return { rows: rows.slice(0, 1), gcd: n, s: 1n, t: 0n, inverse: null };
  for (;;) {
    const prev = rows[rows.length - 2];
    const cur = rows[rows.length - 1];
    const q = prev.r / cur.r;
    cur.q = q;
    const r = prev.r - q * cur.r;
    if (r === 0n) break;
    rows.push({ i: cur.i + 1, r, q: null, s: prev.s - q * cur.s, t: prev.t - q * cur.t });
  }
  const last = rows[rows.length - 1];
  const g = last.r;
  return { rows, gcd: g, s: last.s, t: last.t, inverse: g === 1n ? mod(last.t, n) : null };
}

export function modInv(a, n) {
  const { gcd: g, inverse } = egcdTable(n, mod(a, n));
  if (g !== 1n) {
    throw new NtError(
      `${a} has no inverse mod ${n} (gcd = ${g}).`,
      `${a} は mod ${n} で逆元を持ちません (gcd = ${g})。`,
      'err.noInverse',
      { a: String(a), n: String(n), g: String(g) },
    );
  }
  return inverse;
}

// Euclid's algorithm as rectangle tiling: each step cuts q squares of side b
// from an a x b rectangle. Used for the geometric picture.
export function euclidSquares(a, b) {
  const steps = [];
  let x = abs(a);
  let y = abs(b);
  while (y > 0n) {
    steps.push({ a: x, b: y, q: x / y, r: x % y });
    [x, y] = [y, x % y];
  }
  return { steps, gcd: x };
}

// Solve a*x = b (mod n). Returns every solution in [0, n).
export function solveLinear(a, b, n, cap = 64) {
  a = mod(a, n);
  b = mod(b, n);
  const g = gcd(a, n);
  if (b % g !== 0n) return [];
  const n2 = n / g;
  const x0 = n2 === 1n ? 0n : mod((b / g) * modInv(a / g, n2), n2);
  const out = [];
  for (let i = 0n; i < g && out.length < cap; i++) out.push(x0 + i * n2);
  return out;
}

const TRIAL_LIMIT = 10n ** 13n;

export function factorize(n) {
  n = big(n);
  if (n < 1n) throw new NtError('Use a positive integer.', '正の整数を使ってください。', 'err.positiveInt');
  if (n > TRIAL_LIMIT) {
    throw new NtError('Too large to factor here (limit 10^13).', 'ここで素因数分解できる上限は 10^13 です。', 'err.factorLimit');
  }
  // Number arithmetic is far faster than BigInt and exact below 2^53.
  let m = Number(n);
  const out = [];
  const take = (p) => {
    let k = 0;
    while (m % p === 0) {
      m /= p;
      k++;
    }
    if (k) out.push({ p: BigInt(p), k });
  };
  take(2);
  take(3);
  for (let p = 5; p * p <= m; p += 6) {
    take(p);
    take(p + 2);
  }
  if (m > 1) out.push({ p: BigInt(m), k: 1 });
  return out;
}

export function phi(n) {
  return factorize(n).reduce((acc, { p, k }) => acc * (p - 1n) * p ** BigInt(k - 1), 1n);
}

// Carmichael function: lcm over prime powers, with the 2^k (k > 2) rule.
export function carmichael(n) {
  const parts = factorize(n).map(({ p, k }) => {
    const v = p === 2n && k > 2 ? 2n ** BigInt(k - 2) : (p - 1n) * p ** BigInt(k - 1);
    return { p, k, v };
  });
  return { parts, value: parts.reduce((acc, x) => lcm(acc, x.v), 1n) };
}

export function order(a, n) {
  a = mod(a, n);
  if (gcd(a, n) !== 1n) return null;
  let x = a;
  let k = 1n;
  while (x !== 1n) {
    x = (x * a) % n;
    k++;
  }
  return k;
}

export function crtTrace(list) {
  if (!list.length) throw new NtError('Add at least one congruence.', '合同式を 1 つ以上入れてください。', 'err.noCongruence');
  for (let i = 0; i < list.length; i++) {
    if (list[i].m < 2n) throw new NtError('Every modulus must be at least 2.', '法はすべて 2 以上にしてください。', 'err.moduliMin');
    for (let j = i + 1; j < list.length; j++) {
      const g = gcd(list[i].m, list[j].m);
      if (g !== 1n) {
        throw new NtError(
          `Moduli ${list[i].m} and ${list[j].m} share the factor ${g}.`,
          `法 ${list[i].m} と ${list[j].m} は共通因数 ${g} を持ちます。`,
          'err.moduliShare',
          { a: String(list[i].m), b: String(list[j].m), g: String(g) },
        );
      }
    }
  }
  const M = list.reduce((acc, c) => acc * c.m, 1n);
  const terms = list.map(({ a, m }) => {
    const Mi = M / m;
    const yi = modInv(Mi, m);
    return { a: mod(a, m), m, Mi, yi, term: mod(a, m) * Mi * yi };
  });
  const x = mod(terms.reduce((acc, t) => acc + t.term, 0n), M);
  return { M, terms, x };
}

// Sieve view of CRT: walk a1, a1 + m1, ... and keep what also fits m2, then m3.
export function crtSieve(list, cap = 40) {
  const stages = [];
  let start = mod(list[0].a, list[0].m);
  let step = list[0].m;
  for (let j = 1; j < list.length; j++) {
    const { a, m } = list[j];
    const candidates = [];
    let hit = null;
    for (let k = 0n; k < m && candidates.length < cap; k++) {
      const v = start + k * step;
      const ok = mod(v, m) === mod(a, m);
      candidates.push({ v, r: mod(v, m), ok });
      if (ok) {
        hit = v;
        break;
      }
    }
    stages.push({ m, a: mod(a, m), step, candidates, hit });
    if (hit === null) break;
    start = hit;
    step *= m;
  }
  return { stages, x: start, M: step };
}

const MR_BASES = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n];

export function isPrime(n) {
  n = big(n);
  if (n < 2n) return false;
  for (const p of MR_BASES) {
    if (n === p) return true;
    if (n % p === 0n) return false;
  }
  return MR_BASES.every((a) => mrTrace(n, a).passes);
}

// One Miller-Rabin round: n - 1 = 2^s d, then a^d, a^(2d), ..., a^(2^(s-1) d).
export function mrTrace(n, a) {
  if (n < 5n || n % 2n === 0n) {
    throw new NtError('Use an odd n of at least 5.', 'n は 5 以上の奇数にしてください。', 'err.oddN');
  }
  let d = n - 1n;
  let s = 0;
  const halvings = [d];
  while (d % 2n === 0n) {
    d /= 2n;
    s++;
    halvings.push(d);
  }
  const seq = [];
  let x = modPow(a, d, n);
  for (let j = 0; j < s; j++) {
    seq.push(x);
    x = (x * x) % n;
  }
  const passes = seq[0] === 1n || seq.some((v) => v === n - 1n);
  return { n, a: mod(a, n), s, d, halvings, seq, passes, fermat: modPow(a, n - 1n, n) };
}

// P(collision) for q draws from 2^b values, birthday approximation.
export function birthday(q, bitsOrSpace, isSpace = false) {
  const space = isSpace ? bitsOrSpace : 2 ** bitsOrSpace;
  return -Math.expm1(-(q * q) / (2 * space));
}

// Integer k-th root (floor).
export function iroot(x, k) {
  if (x < 0n) throw new NtError('No real root of a negative number.', '負の数の実根はありません。', 'err.negRoot');
  if (x < 2n) return x;
  const kk = BigInt(k);
  let lo = 0n;
  let hi = 1n << (BigInt(x.toString(2).length) / kk + 1n);
  while (lo < hi) {
    const mid = (lo + hi + 1n) / 2n;
    if (mid ** kk <= x) lo = mid;
    else hi = mid - 1n;
  }
  return lo;
}

// ---------------------------------------------------------------- RSA

export function rsaKeygen(p, q, e = null) {
  if (!isPrime(p) || !isPrime(q)) {
    throw new NtError('p and q must both be prime.', 'p と q はどちらも素数にしてください。', 'err.pqPrime');
  }
  if (p === q) throw new NtError('p and q must differ.', 'p と q は別の素数にしてください。', 'err.pqDiffer');
  const n = p * q;
  const phiN = (p - 1n) * (q - 1n);
  const lambda = lcm(p - 1n, q - 1n);
  // Try e = 2, 3, 4, ... and record why each is rejected.
  const tried = [];
  let chosen = null;
  if (e === null) {
    for (let c = 2n; c < lambda; c++) {
      const g = gcd(c, lambda);
      tried.push({ e: c, g });
      if (g === 1n) {
        chosen = c;
        break;
      }
    }
  } else {
    const g = gcd(e, lambda);
    tried.push({ e, g });
    if (g === 1n) chosen = e;
  }
  return {
    p,
    q,
    n,
    phi: phiN,
    lambda,
    tried,
    e: chosen,
    d: chosen === null ? null : modInv(chosen, lambda),
    dPhi: chosen === null ? null : modInv(chosen, phiN),
  };
}

export function rsaCrtDecrypt(c, d, p, q) {
  const dp = mod(d, p - 1n);
  const dq = mod(d, q - 1n);
  const mp = modPow(c, dp, p);
  const mq = modPow(c, dq, q);
  const qInv = modInv(q, p);
  const h = mod(qInv * (mp - mq), p);
  return { dp, dq, mp, mq, qInv, h, m: mq + h * q };
}

// Same message, same modulus, coprime exponents e and f.
export function commonModulusAttack(n, e, f, ce, cf) {
  const t = egcdTable(e, f); // e*s + f*t = gcd
  if (t.gcd !== 1n) {
    throw new NtError('The exponents must be coprime.', '2 つの指数は互いに素である必要があります。', 'err.expCoprime');
  }
  const x = t.s;
  const y = t.t;
  const m = mod(modPow(ce, x, n) * modPow(cf, y, n), n);
  return { x, y, m };
}

// Håstad: the same m sent to k receivers with e = k.
export function hastadAttack(list, e) {
  const crt = crtTrace(list.map(({ n, c }) => ({ a: c, m: n })));
  const root = iroot(crt.x, Number(e));
  return { crt, C: crt.x, m: root, exact: root ** big(e) === crt.x };
}

// Fermat factoring: n = a^2 - b^2 with a starting at ceil(sqrt n).
export function fermatFactor(n, cap = 100000) {
  if (n % 2n === 0n) return { tries: [], p: 2n, q: n / 2n };
  let a = iroot(n, 2);
  if (a * a < n) a++;
  const tries = [];
  for (let i = 0; i < cap; i++, a++) {
    const b2 = a * a - n;
    const b = iroot(b2, 2);
    const square = b * b === b2;
    tries.push({ a, b2, b, square });
    if (square) return { tries, p: a - b, q: a + b };
  }
  throw new NtError('No factors found within the search limit.', '探索上限内で因数が見つかりませんでした。', 'err.noFactors');
}

// Small private exponent: find the smallest d with x^(ed) = x for test values.
export function smallDSearch(e, n, limit = 100000) {
  const probes = [2n, 3n, 5n, 7n].filter((x) => x < n && gcd(x, n) === 1n);
  for (let d = 1n; d <= BigInt(limit); d++) {
    if (probes.every((x) => modPow(x, e * d, n) === x)) return { d, probes };
  }
  throw new NtError('No small d found within the search limit.', '探索上限内で小さな d は見つかりませんでした。', 'err.noSmallD');
}

// ---------------------------------------------------------------- ElGamal signatures

export function elgamalSign(p, g, x, m, k) {
  const pm1 = p - 1n;
  if (gcd(k, pm1) !== 1n) {
    throw new NtError(`k must be coprime to p - 1 = ${pm1}.`, `k は p - 1 = ${pm1} と互いに素である必要があります。`, 'err.kCoprime', { pm1: String(pm1) });
  }
  const r = modPow(g, k, p);
  const kInv = modInv(k, pm1);
  const s = mod((m - x * r) * kInv, pm1);
  return { r, s, kInv, y: modPow(g, x, p) };
}

export function elgamalVerify(p, g, y, m, r, s) {
  if (r <= 0n || r >= p) return { ok: false, lhs: null, rhs: modPow(g, m, p), reason: 'range' };
  const yr = modPow(y, r, p);
  const rs = modPow(r, s, p);
  const lhs = (yr * rs) % p;
  const rhs = modPow(g, m, p);
  return { ok: lhs === rhs, yr, rs, lhs, rhs };
}

// Two signatures that reused k reveal k, then x.
export function elgamalKReuse(p, g, y, sig1, sig2) {
  const pm1 = p - 1n;
  const ks = solveLinear(sig1.s - sig2.s, sig1.m - sig2.m, pm1).filter((k) => modPow(g, k, p) === sig1.r);
  const xs = [];
  for (const k of ks) {
    for (const x of solveLinear(sig1.r, sig1.m - k * sig1.s, pm1)) {
      if (modPow(g, x, p) === y) xs.push(x);
    }
  }
  return { ks, xs };
}

// ---------------------------------------------------------------- Diffie-Hellman

export function isGenerator(g, p) {
  if (!isPrime(p)) return false;
  const pm1 = p - 1n;
  return factorize(pm1).every(({ p: q }) => modPow(g, pm1 / q, p) !== 1n);
}

export function isSafePrime(p) {
  return isPrime(p) && isPrime((p - 1n) / 2n);
}

export function discreteLog(g, y, p, limit = 200000) {
  let x = 1n;
  for (let k = 0n; k < BigInt(limit); k++) {
    if (x === mod(y, p)) return { x: k, steps: Number(k) + 1 };
    x = (x * g) % p;
  }
  return { x: null, steps: limit };
}

export function smallestGenerator(p) {
  for (let g = 2n; g < p; g++) if (isGenerator(g, p)) return g;
  return null;
}
