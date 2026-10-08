import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { sanitizeHTML } from '../assets/js/sanitize.js';

const ROOT = new URL('..', import.meta.url).pathname;

test('sanitizer keeps math markup', () => {
  let html = '<var>a</var><sup>2</sup> <sub>i</sub> <span class="op">=</span> <code>x</code><br>';
  assert.equal(sanitizeHTML(html), html);
});

test('sanitizer neutralises anything else', () => {
  let cases = [
    '<script>alert(1)</script>',
    '<img src=x onerror=alert(1)>',
    '<span onclick="alert(1)">x</span>',
    '<span class="a" style="color:red">x</span>',
    '<a href="javascript:alert(1)">x</a>',
    '<svg onload=alert(1)>',
    '<var class="x" data-x="1">a</var>',
    '<iframe src="https://example.com">',
    '<<script>script>',
  ];
  for (let c of cases) {
    let out = sanitizeHTML(c);
    assert.ok(!/<(script|img|a|svg|iframe)\b/i.test(out), `${c} -> ${out}`);
    assert.ok(!/\son\w+=|style=|data-/i.test(out.replace(/&lt;[^]*?&gt;/g, '')), `${c} -> ${out}`);
  }
});

function files(dir) {
  return readdirSync(dir).flatMap((f) => {
    let p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}

test('index.html has a strict CSP and no inline script or remote resources', () => {
  let html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  let csp = /http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html)?.[1] ?? '';
  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /script-src 'self'(;|$)/);
  assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval|https?:|\*/);
  assert.doesNotMatch(html, /<script>(?!<\/script>)/, 'inline <script> found');
  assert.doesNotMatch(html, /\son[a-z]+=/i, 'inline event handler found');
  assert.doesNotMatch(html, /(src|href)="https?:/, 'remote resource found');
});

test('shipped code makes no network requests to other origins', () => {
  let shipped = files(join(ROOT, 'assets')).filter((f) => ['.js', '.css'].includes(extname(f)));
  for (let f of shipped) {
    let src = readFileSync(f, 'utf8').replace(/http:\/\/www\.w3\.org\/2000\/svg/g, '');
    assert.doesNotMatch(src, /https?:\/\//, `${f} references a remote URL`);
    assert.doesNotMatch(src, /\beval\(|new Function\(|document\.write/, `${f} uses a dynamic code sink`);
  }
});
