import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as nt from '../assets/js/nt.js';
import * as dh from '../assets/js/dh-lib.js';

test('both sides of Diffie–Hellman reach the same key', () => {
  for (let [p, g] of [[23n, 5n], [467n, 2n], [2039n, 7n]]) {
    for (let i = 0; i < 20; i++) {
      let xa = 1n + BigInt(Math.floor(Math.random() * Number(p - 2n)));
      let xb = 1n + BigInt(Math.floor(Math.random() * Number(p - 2n)));
      let r = dh.dhRun(p, g, xa, xb);
      assert.equal(r.kA, r.kB);
      assert.equal(r.kA, nt.modPow(g, xa * xb, p));
    }
  }
});

test('the preset primes are safe primes with the stated generators', () => {
  for (let [p, g] of [[23n, 5n], [467n, 2n], [2039n, 7n]]) {
    assert.ok(nt.isSafePrime(p));
    assert.ok(nt.isGenerator(g, p));
  }
});

test('person in the middle: Eve shares one key with each side', () => {
  let r = dh.pitm(23n, 5n, 6n, 15n, 9n);
  assert.equal(r.kAE, r.kAEeve);
  assert.equal(r.kBE, r.kBEeve);
  assert.notEqual(r.kAE, r.kBE);
});

test('substituted public values collapse the key into {-1, 0, 1}', () => {
  let p = 23n;
  for (let x = 1n; x < 22n; x++) {
    assert.equal(dh.collapse(p, 1n, x), 1n);
    assert.equal(dh.collapse(p, 0n, x), 0n);
    assert.equal(dh.collapse(p, p - 1n, x), x % 2n === 0n ? 1n : p - 1n);
  }
  assert.ok(dh.isTrap(p, 0n) && dh.isTrap(p, 1n) && dh.isTrap(p, 22n));
  assert.ok(!dh.isTrap(p, 5n));
});

test('property tables match the expected answers', () => {
  let { PROTOCOLS: P, propValue: pv, markAt } = dh;
  // Signed static DH: B proves itself to A, not the other way round; no FS.
  assert.equal(pv(P.static, 'ea', 'ab'), 'no');
  assert.equal(pv(P.static, 'ea', 'ba'), 3);
  assert.equal(pv(P.static, 'ika', 'ab'), 'cond');
  assert.equal(pv(P.static, 'kc', 'ab'), 'no');
  assert.equal(pv(P.static, 'fs'), 'no');
  assert.equal(pv(P.static, 'kk'), 'yes');
  assert.equal(pv(P.static, 'eka', 'ba'), 'no');
  // STS gives explicit key authentication both ways.
  assert.equal(pv(P.sts, 'eka', 'ab'), 3);
  assert.equal(pv(P.sts, 'eka', 'ba'), 2);
  assert.equal(pv(P.sts, 'fs'), 'yes');
  // Plain DH: nothing authenticated.
  for (let id of ['ea', 'ika', 'kc', 'eka']) {
    assert.equal(pv(P.plain, id, 'ab'), 'no');
    assert.equal(pv(P.plain, id, 'ba'), 'no');
  }
  assert.equal(markAt(2, 1, 3), 'pending');
  assert.equal(markAt(2, 2, 3), 'yes');
  assert.equal(markAt('no', 3, 3), 'pending');
  assert.equal(markAt('no', 4, 3), 'no');
  assert.equal(markAt('cond', 4, 3), 'cond');
});

test('duration labels stay finite for huge searches', () => {
  assert.equal(dh.duration(10), '< 1 ms');
  assert.equal(dh.duration(40), '18 min');
  assert.match(dh.duration(1024), /^10\^\d+ y$/);
  assert.match(dh.duration(2048), /^10\^\d+ y$/);
  assert.deepEqual(dh.durationParts(10), { unit: 'lt1ms', v: '' });
  assert.deepEqual(dh.durationParts(40), { unit: 'min', v: '18' });
  assert.equal(dh.durationParts(2048).unit, 'y');
  assert.match(dh.durationParts(2048).v, /^10<sup>\d+<\/sup>$/);
});

test('protocol texts are catalog keys', () => {
  for (let proto of Object.values(dh.PROTOCOLS)) {
    assert.match(proto.title, /^dh\.proto\./);
    assert.match(proto.setup, /^dh\.proto\./);
    for (let m of proto.messages) assert.match(m.caption, /^dh\.proto\./);
    for (let p of Object.values(proto.props)) assert.match(p.why, /^dh\.proto\./);
  }
  for (let p of dh.PROPS) assert.match(p.title, /^dh\.prop\./);
});
