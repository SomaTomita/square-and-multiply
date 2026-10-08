// Translations. Text is referenced by key: L('math.pow.square', { prev, n, v }).
// Catalogs live in assets/i18n/<code>/ and hold trusted HTML strings with
// {name} placeholders. Every T() node registers itself, so switching language
// repaints the page in place. Missing keys fall back to English.

import { sanitizeHTML } from './sanitize.js';

export const LANGS = [
  { code: 'en', name: 'English' },
  { code: 'nl', name: 'Nederlands' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'es', name: 'Español' },
  { code: 'el', name: 'Ελληνικά' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'zh', name: '中文' },
];

const CODES = new Set(LANGS.map((l) => l.code));
const PLACEHOLDER = /\{(\w+)\}/g;

const catalogs = new Map();
const messages = new WeakMap();
let current = 'en';
let request = 0;

export function isLang(code) {
  return CODES.has(code);
}

export function lang() {
  return current;
}

// The best supported language for this browser, English otherwise.
export function preferredLang() {
  for (let tag of navigator.languages ?? [navigator.language]) {
    let base = String(tag).toLowerCase().split('-')[0];
    if (CODES.has(base)) return base;
  }
  return 'en';
}

export function L(key, params = {}, fallback = null) {
  return { key, params, fallback };
}

async function load(code) {
  if (catalogs.has(code)) return;
  let mod = await import(`../i18n/${code}/index.js`);
  catalogs.set(code, mod.strings);
}

function interpolate(text, params) {
  return text.replace(PLACEHOLDER, (whole, name) => (name in params ? String(params[name]) : whole));
}

// Resolve a message to HTML in the current language.
export function render(msg) {
  if (msg == null) return '';
  if (typeof msg === 'string') return msg;
  if ('key' in msg) {
    let text = catalogs.get(current)?.[msg.key] ?? catalogs.get('en')?.[msg.key];
    if (text == null) return msg.fallback ?? msg.key;
    return interpolate(text, msg.params ?? {});
  }
  // Legacy { en, ja } pairs.
  return msg[current] ?? msg.en ?? '';
}

function paint(el, msg) {
  el.lang = current;
  el.innerHTML = sanitizeHTML(render(msg));
}

// A text node in the current language that follows language switches.
// Accepts L(...) messages, { en, ja } pairs, or (en, ja) strings.
export function T(a, b) {
  let msg = a !== null && typeof a === 'object' ? a : { en: a, ja: b ?? a };
  let el = document.createElement('span');
  el.className = 'i18n';
  messages.set(el, msg);
  paint(el, msg);
  return el;
}

// Returns false when the catalog could not be loaded; the page then stays in
// the current language and the next attempt retries the download.
export async function setLanguage(code) {
  let next = isLang(code) ? code : 'en';
  let ticket = ++request;
  try {
    await load('en');
    await load(next);
  } catch (err) {
    console.error(`Could not load the ${next} text`, err);
    return false;
  }
  // A later choice made while this one was loading wins.
  if (ticket !== request) return false;
  current = next;
  document.documentElement.lang = next;
  document.documentElement.dataset.lang = next;
  for (let el of document.querySelectorAll('.i18n')) {
    let msg = messages.get(el);
    if (msg) paint(el, msg);
  }
  return true;
}
