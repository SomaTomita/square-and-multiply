# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML, CSS, and vanilla JavaScript (ES modules), no build step. Hosted on GitHub Pages from a public repository. Tests run with Node's built-in test runner (`npm test`).

## Users

Anyone learning the basics of cryptography: students working through the mathematics, developers who want to see what TLS actually does, and self-learners starting from what "mod" means. They often have notes or a textbook open next to the site and want to understand why a computation works, not just get its result. They come back to replay a procedure step by step.

## Product Purpose

Make the core procedures of introductory cryptography understandable by watching them happen: change a number in a formula and see each step of the computation move. Success means a learner can redo the procedure by hand on paper afterwards.

Five modes, switchable at any time, each topic reachable directly:

0. Basics: what mod means, tables mod n, primes, gcd and coprime, powers going round, dividing mod n.
1. Number theory: square-and-multiply, extended Euclid and inverses, CRT, φ and λ, Miller–Rabin, birthday bound.
2. RSA and ElGamal: key generation, encryption and decryption, CRT decryption, textbook-RSA attacks, ElGamal signatures and nonce reuse.
3. Diffie–Hellman: key agreement, person-in-the-middle, bad public values, brute-force discrete log, protocol properties (entity authentication, implicit key authentication, key confirmation, forward secrecy, known-key resistance).
4. TLS: TLS 1.2 RSA key transport versus TLS 1.3 ephemeral (EC)DH, forward secrecy, and TLS interception by a proxy.

## Positioning

Every number in a formula is live and every procedure is a sequence of discrete, replayable steps that show the intermediate values a learner writes on paper. Toy parameters for intuition, real WebCrypto where it matters (TLS mode).

## Operating Context

Used next to notes or a textbook. Learners step forward and backward with the keyboard, scrub numbers to test "what if", and load preset values that show typical cases and edge cases.

## Capabilities and Constraints

- Ten languages: English (default), Dutch, French, German, Spanish, Greek, Hindi, Japanese, Korean, Chinese. The browser language picks the first one; a menu switches at any time. Translations were written without native-speaker review.
- Notation: α as generator, λ(n) Carmichael function, d = e⁻¹ mod λ(n).
- No backend, no accounts, no analytics. Works offline once loaded except web fonts.
- Toy-sized numbers in modes 0–3; the site must state that these are not secure parameters.
- Responsive from phones to desktops, with a three-step text size switch.

## Brand Commitments

- Name: Square & Multiply.
- A general learning resource: it teaches the topics on their own terms and is not tied to any particular syllabus or institution.

## Evidence on Hand

Hand-worked examples are encoded as unit tests in `tests/`. No testimonials, usage numbers, or endorsements exist; none may be invented.

## Product Principles

1. Show the computation, not the conclusion: every intermediate value a learner would write down is visible at some step.
2. Formulas are the interface. Inputs live inside the math they change.
3. One step, one idea. A step changes one thing and says it in one short line.
4. Correctness first: every number shown is computed, never hard-coded, and the math core is tested.
5. Honest about scope: toy parameters and simplified TLS are labelled as such.

## Accessibility & Inclusion

Full keyboard operation (steps, mode switching, number editing). Respect reduced motion: steps must read correctly with animation off. Color is never the only carrier of meaning (Alice, Bob, Eve are also labelled). Text contrast at least 4.5:1 in both color schemes.
