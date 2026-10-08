import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const LANGS = ['en', 'nl', 'fr', 'de', 'es', 'el', 'hi', 'ja', 'ko', 'zh'];
const PARTS = ['core', 'basics', 'math', 'rsa', 'dh', 'tls'];
const PLACEHOLDER = /\{(\w+)\}/g;

async function catalog(code, part) {
  let mod = await import(join(ROOT, 'assets/i18n', code, `${part}.js`));
  return mod.strings;
}

function placeholders(text) {
  return [...String(text).matchAll(PLACEHOLDER)].map((m) => m[1]).toSorted();
}

test('every language has the same keys and placeholders as English', async () => {
  for (let part of PARTS) {
    let en = await catalog('en', part);
    for (let code of LANGS) {
      let other = await catalog(code, part);
      let missing = Object.keys(en).filter((k) => !(k in other));
      let extra = Object.keys(other).filter((k) => !(k in en));
      assert.deepEqual(missing, [], `${code}/${part}.js is missing keys`);
      assert.deepEqual(extra, [], `${code}/${part}.js has keys English lacks`);
      for (let k of Object.keys(en)) {
        assert.deepEqual(placeholders(other[k]), placeholders(en[k]), `${code}/${part}.js ${k} placeholders differ`);
        assert.ok(String(other[k]).trim(), `${code}/${part}.js ${k} is empty`);
      }
    }
  }
});

test('every L() key used in the code exists in English', async () => {
  let en = {};
  for (let part of PARTS) Object.assign(en, await catalog('en', part));
  let files = ['assets/js/stage.js', ...readdirSync(join(ROOT, 'assets/js/modes')).map((f) => `assets/js/modes/${f}`)];
  let used = new Set();
  for (let f of files) {
    let src = readFileSync(join(ROOT, f), 'utf8');
    for (let m of src.matchAll(/\bL\(\s*'([\w.-]+)'/g)) used.add(m[1]);
    for (let m of src.matchAll(/NtError\([^;]*?'(err\.[\w.-]+)'/g)) used.add(m[1]);
  }
  let unknown = [...used].filter((k) => !(k in en));
  assert.deepEqual(unknown, [], 'keys used in code but missing from assets/i18n/en');
});
