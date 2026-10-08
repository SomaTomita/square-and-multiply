import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as nt from '../assets/js/nt.js';

test('square-and-multiply matches the worked example 5^9 mod 11', () => {
  const t = nt.powTrace(5n, 9n, 11n);
  assert.equal(t.bits, '1001');
  assert.deepEqual(t.rows.map((r) => r.value), [5n, 3n, 9n, 4n]);
  assert.equal(t.result, 9n);
});

test('powTrace agrees with modPow on random inputs', () => {
  for (let i = 0; i < 200; i++) {
    const a = BigInt(Math.floor(Math.random() * 1e6));
    const e = BigInt(Math.floor(Math.random() * 1e6));
    const n = BigInt(2 + Math.floor(Math.random() * 1e6));
    assert.equal(nt.powTrace(a, e, n).result, nt.modPow(a, e, n));
  }
});

test('extended Euclid table for 101^-1 mod 195', () => {
  const t = nt.egcdTable(195n, 101n);
  assert.deepEqual(t.rows.map((r) => r.r), [195n, 101n, 94n, 7n, 3n, 1n]);
  assert.deepEqual(t.rows.map((r) => r.q), [null, 1n, 1n, 13n, 2n, 3n]);
  assert.equal(t.s, -29n);
  assert.equal(t.t, 56n);
  assert.equal(t.inverse, 56n);
  for (const r of t.rows) assert.equal(r.r, 195n * r.s + 101n * r.t);
});

test('modInv and gcd', () => {
  assert.equal(nt.modInv(5n, 11n), 9n);
  assert.equal(nt.modInv(5n, 8n), 5n);
  assert.equal(nt.gcd(1624n, 6363n), 7n);
  assert.throws(() => nt.modInv(6n, 9n), nt.NtError);
});

test('euclidSquares ends at the gcd', () => {
  const s = nt.euclidSquares(1624n, 6363n);
  assert.equal(s.gcd, 7n);
  assert.equal(s.steps[0].a, 1624n);
});

test('phi and Carmichael lambda', () => {
  assert.equal(nt.phi(100n), 40n);
  assert.equal(nt.carmichael(8n).value, 2n);
  assert.equal(nt.carmichael(629n).value, 144n);
  assert.equal(nt.carmichael(133n).value, 18n);
  assert.equal(nt.order(3n, 8n), 2n);
});

test('CRT: both methods solve the same system', () => {
  const sys = [
    { a: 4n, m: 19n },
    { a: 7n, m: 11n },
    { a: 1n, m: 7n },
  ];
  const f = nt.crtTrace(sys);
  const s = nt.crtSieve(sys);
  assert.equal(f.x, s.x);
  for (const { a, m } of sys) assert.equal(f.x % m, a);
  assert.equal(f.M, 1463n);
  assert.throws(() => nt.crtTrace([{ a: 1n, m: 4n }, { a: 1n, m: 6n }]), nt.NtError);
});

test('Miller-Rabin: 33 is a Fermat pseudoprime to base 10 but not a strong one', () => {
  const t = nt.mrTrace(33n, 10n);
  assert.equal(t.fermat, 1n);
  assert.equal(t.s, 5);
  assert.equal(t.d, 1n);
  assert.equal(t.passes, false);
  assert.equal(nt.isPrime(1000003n), true);
  assert.equal(nt.isPrime(561n), false);
});

test('RSA keygen picks the smallest valid e', () => {
  const k = nt.rsaKeygen(37n, 17n);
  assert.equal(k.n, 629n);
  assert.equal(k.lambda, 144n);
  assert.equal(k.e, 5n);
  assert.equal(k.d, 29n);
  const c = nt.modPow(591n, k.e, k.n);
  assert.equal(nt.modPow(c, k.d, k.n), 591n);
  const crt = nt.rsaCrtDecrypt(c, k.d, 37n, 17n);
  assert.equal(crt.m, 591n);
});

test('RSA: e = 165 fails for 61 x 23, smallest e = 7 with d = 283', () => {
  const bad = nt.rsaKeygen(61n, 23n, 165n);
  assert.equal(bad.e, null);
  assert.equal(bad.tried[0].g, 165n);
  const ok = nt.rsaKeygen(61n, 23n);
  assert.equal(ok.e, 7n);
  assert.equal(ok.d, 283n);
});

test('RSA attacks', () => {
  const n = 629n;
  const m = 123n;
  const cm = nt.commonModulusAttack(n, 5n, 7n, nt.modPow(m, 5n, n), nt.modPow(m, 7n, n));
  assert.equal(cm.m, m);

  const ns = [1003n * 0n + 1007n, 1013n * 1019n, 1021n * 1031n];
  const mm = 999n;
  const h = nt.hastadAttack(ns.map((nn) => ({ n: nn, c: nt.modPow(mm, 3n, nn) })), 3n);
  assert.equal(h.m, mm);
  assert.equal(h.exact, true);

  const f = nt.fermatFactor(141367n);
  assert.deepEqual([f.p, f.q], [373n, 379n]);

  assert.equal(nt.smallDSearch(31n, 247n).d, 7n);
});

test('ElGamal signature round trip, a known key pair, and k reuse', () => {
  assert.equal(nt.modPow(12n, 74n, 991n), 2n);
  const p = 991n;
  const g = 12n;
  const x = 106n;
  const sig = nt.elgamalSign(p, g, x, 1n, 157n);
  assert.equal(nt.elgamalVerify(p, g, sig.y, 1n, sig.r, sig.s).ok, true);

  const s2 = nt.elgamalSign(p, g, x, 500n, 157n);
  const rec = nt.elgamalKReuse(p, g, sig.y, { m: 1n, r: sig.r, s: sig.s }, { m: 500n, r: s2.r, s: s2.s });
  assert.ok(rec.ks.includes(157n));
  assert.ok(rec.xs.includes(x));
});

test('Diffie-Hellman helpers', () => {
  assert.equal(nt.isGenerator(5n, 23n), true);
  assert.equal(nt.isGenerator(2n, 23n), false);
  assert.equal(nt.isSafePrime(23n), true);
  assert.equal(nt.discreteLog(5n, nt.modPow(5n, 13n, 23n), 23n).x, 13n);
  assert.equal(nt.smallestGenerator(23n), 5n);
});

test('birthday bound and integer roots', () => {
  assert.ok(Math.abs(nt.birthday(23, 365, true) - 0.5) < 0.02);
  assert.ok(Math.abs(nt.birthday(2 ** 32, 64) - 0.393) < 0.001);
  assert.equal(nt.iroot(1000000n, 3), 100n);
  assert.equal(nt.iroot(999999n, 3), 99n);
});

test('factorize refuses huge inputs', () => {
  assert.throws(() => nt.factorize(10n ** 14n), nt.NtError);
  assert.deepEqual(nt.factorize(1320n).map((f) => [f.p, f.k]), [[2n, 3], [3n, 1], [5n, 1], [11n, 1]]);
});
