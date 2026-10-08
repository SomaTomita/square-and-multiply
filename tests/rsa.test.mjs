import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as nt from '../assets/js/nt.js';
import * as lib from '../assets/js/rsa-lib.js';

test('fixed point count matches brute force', () => {
  for (let [p, q, e] of [[37n, 17n, 5n], [61n, 23n, 7n], [11n, 13n, 7n]]) {
    let pts = lib.fixedPoints(e, p * q);
    assert.equal(BigInt(pts.length), lib.fixedPointCount(e, p, q));
    assert.ok(pts.includes(0n) && pts.includes(1n) && pts.includes(p * q - 1n));
  }
  assert.equal(lib.fixedPoints(3n, 10n ** 6n), null);
});

test('hop chain lands on 1 after d hops of e', () => {
  let k = nt.rsaKeygen(37n, 17n);
  let chain = lib.hopChain(k.e, k.d, k.lambda);
  assert.equal(chain.length, Number(k.d) + 1);
  assert.equal(chain.at(-1).v, 1n);
  let long = lib.hopChain(7n, 283n, 660n, 100);
  assert.equal(long.length, 100);
  assert.equal(long.at(-1).skip, true);
  assert.equal(long.at(-1).v, 1n);
});

test('sampleTries keeps head, gap, tail', () => {
  assert.deepEqual(lib.sampleTries(5), [0, 1, 2, 3, 4]);
  assert.deepEqual(lib.sampleTries(30, 3, 2), [0, 1, 2, -1, 28, 29]);
});

test('small d trace finds d = 7 for (31, 247)', () => {
  let t = lib.smallDTrace(31n, 247n, 23n);
  assert.equal(t.d, 7n);
  assert.equal(t.m, nt.modPow(23n, 7n, 247n));
  assert.equal(nt.modPow(t.m, 31n, 247n), 23n);
});

test('garner matches direct decryption', () => {
  let k = nt.rsaKeygen(37n, 17n);
  let c = nt.modPow(591n, k.e, k.n);
  let mp = nt.modPow(c, k.d % 36n, 37n);
  let mq = nt.modPow(c, k.d % 16n, 17n);
  assert.equal(lib.garner(mp, mq, 37n, 17n).m, nt.modPow(c, k.d, k.n));
});

test('ElGamal verify-only preset values compute without throwing', () => {
  let v = nt.elgamalVerify(89n, 3n, 69n, 77n, 66n, 77n);
  assert.equal(typeof v.ok, 'boolean');
  assert.equal(v.rhs, nt.modPow(3n, 77n, 89n));
});
