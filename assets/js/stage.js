// The stage: mode switching (keys 1-4), topic switching, and the tape of steps.
//
// A mode module (assets/js/modes/<id>.js) exports
//   mode = { scenes: [{ id, title: { en, ja }, create(ctx) }] }
// create(ctx) writes its formula into ctx.formula once and returns
//   { steps(): [{ en, ja }, ...]   captions, recomputed after ctx.refresh()
//     show(k, prev): void          renders step k into ctx.canvas
//     destroy?(): void }
// show() renders the final state of step k synchronously, then attaches
// animations through ctx.anim (only when k === prev + 1), so finishing every
// animation always lands on the rendered state.

import { Anim } from './anim.js';
import { h } from './ui.js';
import { T, L, LANGS, render, setLanguage, preferredLang, isLang, lang } from './i18n.js';
import { NtError } from './nt.js';

const MODES = [
  { id: 'basics', key: '0' },
  { id: 'math', key: '1' },
  { id: 'rsa', key: '2' },
  { id: 'dh', key: '3' },
  { id: 'tls', key: '4' },
];

const LEADER_FRAMES = 48;

const PLAY_MS = 2100;
const TAPE_ANCHOR = 0.22;
const TAPE_ANCHOR_NARROW = 0.06;

const anim = new Anim();

const state = {
  mode: null,
  module: null,
  sceneIndex: 0,
  scene: null,
  ctx: null,
  steps: [],
  k: 0,
  playing: null,
  routeToken: 0,
};

function $(sel) {
  return document.querySelector(sel);
}

// ------------------------------------------------------------------ language

async function setLang(code) {
  await setLanguage(code);
  try {
    localStorage.setItem('sm-lang', lang());
  } catch {
    // Storage can be blocked; the choice still applies for this visit.
  }
  $('#lang').value = lang();
  $('#lang-code').textContent = lang().toUpperCase();
  $('#lang').setAttribute('aria-label', render(L('chrome.language')));
  for (let [id, key, hint] of [['prev', 'chrome.prev', '←'], ['next', 'chrome.next', '→'], ['play', 'chrome.play', 'P']]) {
    let label = render(L(key));
    $(`#${id}`).setAttribute('aria-label', label);
    $(`#${id}`).title = `${label} (${hint})`;
  }
  for (let b of document.querySelectorAll('[data-set-size]')) {
    b.setAttribute('aria-label', render(L(`chrome.size${b.dataset.setSize.toUpperCase()}`)));
  }
  $('#modes').setAttribute('aria-label', render(L('chrome.modes')));
  $('#scenes').setAttribute('aria-label', render(L('chrome.topics')));
  $('#tape').setAttribute('aria-label', render(L('chrome.steps')));
  if (state.module) document.title = `${render(state.module.scenes[state.sceneIndex].title)} · Square & Multiply`;
  placeTape(false);
}

function setSize(size) {
  document.documentElement.dataset.size = size;
  try {
    localStorage.setItem('sm-size', size);
  } catch {
    // Storage can be blocked; the size still applies for this visit.
  }
  for (let b of document.querySelectorAll('[data-set-size]')) {
    b.setAttribute('aria-pressed', String(b.dataset.setSize === size));
  }
  placeTape(false);
}

// ------------------------------------------------------------------ chrome

function buildModes() {
  let nav = $('#modes');
  for (let m of MODES) {
    nav.append(
      h(
        'a',
        { href: `#${m.id}`, class: 'mode', 'data-mode': m.id, 'aria-keyshortcuts': m.key },
        h('span', { class: 'mode-n' }, m.key),
        h('span', { class: 'mode-name' }, T(L(`mode.${m.id}`))),
        h('span', { class: 'mode-short' }, T(L(`modeShort.${m.id}`))),
      ),
    );
  }
}

function markActive() {
  for (let a of document.querySelectorAll('.mode')) {
    let on = a.dataset.mode === state.mode;
    a.classList.toggle('is-active', on);
    if (on) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  $('#scenes').replaceChildren(
    ...state.module.scenes.map((s, i) =>
      h(
        'a',
        {
          href: `#${state.mode}/${s.id}`,
          class: `scene-link${i === state.sceneIndex ? ' is-active' : ''}`,
          'aria-current': i === state.sceneIndex ? 'true' : null,
        },
        T(s.title),
      ),
    ),
  );
}

// ------------------------------------------------------------------ routing

async function route() {
  let [modeId, sceneId] = location.hash.replace(/^#/, '').split('/');
  let modeIdOk = MODES.some((m) => m.id === modeId) ? modeId : 'basics';
  let token = ++state.routeToken;
  if (modeIdOk !== state.mode) {
    let mod;
    try {
      mod = await import(`./modes/${modeIdOk}.js`);
    } catch (err) {
      console.error(err);
      $('#board').replaceChildren(
        h('p', { class: 'stage-error' }, T(L('chrome.loadFail'))),
      );
      return;
    }
    if (token !== state.routeToken) return;
    state.mode = modeIdOk;
    state.module = mod.mode;
  }
  let idx = state.module.scenes.findIndex((s) => s.id === sceneId);
  mountScene(Math.max(0, idx));
}

function mountScene(i) {
  stop();
  anim.finishAll();
  state.scene?.destroy?.();
  state.sceneIndex = i;
  markActive();

  let def = state.module.scenes[i];
  let formula = h('div', { class: 'formula', id: 'formula' });
  let canvas = h('div', { class: 'canvas', id: 'canvas' });
  let board = $('#board');
  board.replaceChildren(formula, canvas);
  board.dataset.scene = `${state.mode}-${def.id}`;

  state.ctx = {
    formula,
    canvas,
    anim,
    refresh: () => recompute(false),
  };
  state.k = 0;
  state.scene = def.create(state.ctx);
  recompute(true);
  document.title = `${render(def.title)} · Square & Multiply`;
}

function errorText(err) {
  return T(err.key ? L(err.key, err.params, err.en) : { en: err.en, ja: err.ja });
}

function showError(err) {
  stop();
  state.steps = [];
  state.k = 0;
  state.ctx.canvas.replaceChildren(h('p', { class: 'stage-error' }, errorText(err)));
}

// Params changed (or first mount): rebuild captions, keep the step when possible.
function recompute(fresh) {
  anim.finishAll();
  try {
    state.steps = state.scene.steps();
    state.k = fresh ? 0 : Math.min(state.k, state.steps.length - 1);
    state.scene.show(state.k, state.k);
  } catch (err) {
    if (!(err instanceof NtError)) throw err;
    showError(err);
  }
  renderTape(false);
}

// ------------------------------------------------------------------ stepping

function go(k) {
  if (!state.steps.length) return;
  let target = Math.max(0, Math.min(state.steps.length - 1, k));
  if (target === state.k) return;
  let prev = state.k;
  anim.finishAll();
  state.k = target;
  try {
    state.scene.show(target, prev);
  } catch (err) {
    if (!(err instanceof NtError)) throw err;
    showError(err);
  }
  if (target === prev + 1) pullLever();
  renderTape(true);
  keepRowInView();
}

// On narrow screens the board scrolls under the deck; keep the row being
// worked on in view.
function keepRowInView() {
  if (!matchMedia('(max-width: 900px)').matches) return;
  let row = document.querySelector('#board tr.is-now');
  if (row) row.scrollIntoView({ block: 'nearest', behavior: anim.reduced ? 'auto' : 'smooth' });
}

function pullLever() {
  let lever = $('#next');
  lever.classList.remove('is-pulled');
  void lever.offsetWidth;
  lever.classList.add('is-pulled');
}

function play() {
  if (state.playing) {
    stop();
    return;
  }
  if (state.k >= state.steps.length - 1) go(0);
  state.playing = setInterval(() => {
    if (state.k >= state.steps.length - 1) {
      stop();
      return;
    }
    go(state.k + 1);
  }, PLAY_MS);
  renderControls();
}

function stop() {
  if (!state.playing) return;
  clearInterval(state.playing);
  state.playing = null;
  renderControls();
}

// ------------------------------------------------------------------ tape

// Each step is a frame of five-hole tape; the holes punch the step number.
function frameHoles(n) {
  let holes = [];
  for (let bit = 0; bit < 6; bit++) {
    if (bit === 3) {
      holes.push(h('span', { class: 'hole sprocket' }));
      continue;
    }
    let b = bit > 3 ? bit - 1 : bit;
    holes.push(h('span', { class: `hole${(n >> b) & 1 ? ' punched' : ''}` }));
  }
  return h('span', { class: 'frame-holes', 'aria-hidden': 'true' }, holes);
}

function leader(count) {
  return Array.from({ length: count }, () => h('li', { class: 'frame leader', 'aria-hidden': 'true' }, frameHoles(0)));
}

function renderTape(animate) {
  let tape = $('#tape');
  let frames = state.steps.map((caption, i) => {
    let cls = i < state.k ? 'is-done' : i === state.k ? 'is-now' : 'is-ahead';
    let li = h(
      'li',
      {
        class: `frame ${cls}`,
        'aria-current': i === state.k ? 'step' : null,
        'aria-label': i === state.k ? null : render(L('chrome.step', { n: i + 1 })),
        title: i === state.k ? null : render(L('chrome.step', { n: i + 1 })),
        onclick:
          i === state.k
            ? null
            : () => {
                stop();
                go(i);
              },
      },
      frameHoles(i + 1),
    );
    if (i === state.k) li.append(h('span', { class: 'caption' }, T(caption)));
    return li;
  });
  tape.replaceChildren(...(frames.length ? [...leader(LEADER_FRAMES), ...frames, ...leader(LEADER_FRAMES)] : []));
  placeTape(animate);
  if (animate && state.steps.length) {
    let cap = tape.querySelector('.caption');
    anim.appear(cap, { from: 'write', duration: 700, delay: 120 });
  }
  renderControls();
}

// Slide the tape so the current frame sits at a fixed point in the window.
function placeTape(animate) {
  let tape = $('#tape');
  let now = tape.querySelector('.frame.is-now');
  if (!now) {
    tape.style.transform = 'translateX(0)';
    return;
  }
  let win = tape.parentElement.getBoundingClientRect();
  let anchor = win.width < 600 ? TAPE_ANCHOR_NARROW : TAPE_ANCHOR;
  let x = win.width * anchor - now.offsetLeft;
  tape.style.transition = animate ? '' : 'none';
  tape.style.transform = `translateX(${Math.round(x)}px)`;
  if (!animate) {
    void tape.offsetWidth;
    tape.style.transition = '';
  }
}

function renderControls() {
  let n = state.steps.length;
  $('#count').textContent = n ? `${state.k + 1} / ${n}` : '';
  $('#prev').disabled = !n || state.k === 0;
  $('#next').disabled = !n || state.k === n - 1;
  $('#play').disabled = n < 2;
  $('#play').setAttribute('aria-pressed', String(Boolean(state.playing)));
  $('#play').classList.toggle('is-playing', Boolean(state.playing));
}

// ------------------------------------------------------------------ input

function isTyping(target) {
  return target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"], [contenteditable="plaintext-only"]');
}

function onKey(e) {
  if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
  let mode = MODES.find((m) => m.key === e.key);
  if (mode) {
    location.hash = `#${mode.id}`;
    return;
  }
  if (e.key === 'ArrowRight' || (e.key === ' ' && !(e.target instanceof Element && e.target.closest('button, a, [role="spinbutton"]')))) {
    e.preventDefault();
    stop();
    go(state.k + 1);
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    stop();
    go(state.k - 1);
  } else if (e.key === 'Home') {
    stop();
    go(0);
  } else if (e.key === 'End') {
    stop();
    go(state.steps.length - 1);
  } else if (e.key === 'p' || e.key === 'P') {
    play();
  }
}

async function init() {
  let select = $('#lang');
  for (let l of LANGS) select.append(h('option', { value: l.code, lang: l.code }, l.name));
  select.addEventListener('change', () => setLang(select.value));
  let saved = null;
  try {
    saved = localStorage.getItem('sm-lang');
  } catch {
    // Fall back to the browser language below.
  }
  await setLang(isLang(saved) ? saved : preferredLang());
  buildModes();
  for (let b of document.querySelectorAll('[data-set-size]')) {
    b.addEventListener('click', () => setSize(b.dataset.setSize));
  }
  setSize(document.documentElement.dataset.size || 'm');
  $('#prev').addEventListener('click', () => {
    stop();
    go(state.k - 1);
  });
  $('#next').addEventListener('click', () => {
    stop();
    go(state.k + 1);
  });
  $('#play').addEventListener('click', play);
  addEventListener('keydown', onKey);
  addEventListener('hashchange', route);
  addEventListener('resize', () => placeTape(false));
  route();
}

init();
