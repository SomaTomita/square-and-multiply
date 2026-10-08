# Square & Multiply

Live site: https://somatomita.github.io/square-and-multiply/

Learn how cryptography works by watching it happen, one step at a time. Drag any number in a formula and every step of the computation moves with it: the values on a rotating ring of residues, the working table filling row by row, the messages crossing between Alice, Bob, and Eve.

## What you can learn

| Mode | Topics |
|---|---|
| 0 Basics | what mod means, addition and multiplication tables mod n, primes and the sieve, gcd and coprime numbers, powers going round in cycles, dividing mod n |
| 1 Number theory | square-and-multiply, inverses with the extended Euclidean algorithm, the Chinese remainder theorem, φ and λ, the Miller–Rabin test, the birthday bound |
| 2 RSA · ElGamal | key generation, encryption and decryption, faster decryption with the CRT, attacks on textbook RSA (common modulus, small e, close primes, small d), ElGamal signatures, what goes wrong when a nonce is reused |
| 3 Diffie–Hellman | key agreement, the person-in-the-middle attack, bad public values, brute-forcing a discrete log, which security properties a key-exchange protocol gives you |
| 4 TLS | the TLS 1.2 RSA handshake and why it lacks forward secrecy, the TLS 1.3 handshake with ephemeral ECDH, how a proxy intercepts TLS |

Start anywhere: every mode and topic opens directly, and Basics is there if you want to begin from the ground up.

Modes 0 to 3 use small numbers so you can follow every step by hand. They are not secure parameters. Mode 4 runs real WebCrypto (RSA-OAEP, ECDH and ECDSA on P-256, HKDF, AES-GCM) on a simplified handshake.

## Languages

English, Nederlands, Français, Deutsch, Español, Ελληνικά, हिन्दी, 日本語, 한국어, 中文. The site starts in your browser's language when it can and switches from the globe menu at any time. The translations have not been reviewed by native speakers yet; corrections are welcome.

## Controls

| Key | Action |
|---|---|
| → or Space | next step |
| ← | previous step |
| P | play all steps |
| 0 to 4 | switch mode |
| click a tape frame | jump to that step |
| drag a number sideways, ↑ ↓ | change it |
| double-click a number (tap on touch screens) | type a value |

The three A buttons set the text size. The layout adapts to phones, tablets, and desktops, and follows your system's light or dark setting.

## Privacy and security

No accounts, no tracking, no cookies, and no requests to other sites: fonts are self-hosted and a strict Content Security Policy allows only the site's own files. See [SECURITY.md](SECURITY.md).

## Run locally

No build step. Any static server works:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

ES modules do not load from `file://`, so opening `index.html` directly will not work.

## Tests

```sh
npm test
```

The number theory behind every scene lives in `assets/js/nt.js` and is checked against hand-worked examples. Another test checks that every language has the same text keys and placeholders as English.

## Deployment

Every push to `main` runs the tests and, if they pass, publishes the site to GitHub Pages through GitHub Actions (`.github/workflows/pages.yml`). Only `index.html`, `.nojekyll`, and `assets/` are published. Pull requests and other branches run the tests only (`.github/workflows/ci.yml`). Actions are pinned to commit hashes and kept current by Dependabot.

## Structure

```
index.html              page shell: mode switch, board, tape deck
assets/css/base.css     tokens, layout, rotor, tape, per-language fonts
assets/css/*.css        per-mode figures
assets/js/stage.js      modes, topics, stepping, keyboard, language menu
assets/js/i18n.js       translation lookup and live language switching
assets/i18n/<lang>/     text for each language, one file per mode
assets/js/nt.js         number theory on BigInt (tested)
assets/js/rotor.js      the rotor figure
assets/js/modes/*.js    one file per mode, each a list of scenes
tests/                  node --test suites
```
