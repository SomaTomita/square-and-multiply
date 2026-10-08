# Security

Square & Multiply is a static site: HTML, CSS, JavaScript, and font files served as they are. It has no server code, no accounts, no forms, no cookies, no analytics, and no third-party requests.

## What the site does to stay safe

- **Content Security Policy.** `index.html` sets a strict policy in a `<meta>` tag: everything (scripts, styles, fonts, images, module imports) must come from the site itself. No inline scripts, no `eval`, no remote origins, no plugins, no form submissions.
- **No third parties.** Fonts are self-hosted in `assets/fonts/` (SIL Open Font License, see `assets/fonts/LICENSES.md`). The page sends no referrer and loads nothing from other hosts, so visitors' IP addresses are not shared with anyone but the host.
- **HTML allowlist.** The little markup the site renders (math notation such as `<var>`, `<sup>`, `<sub>`) passes through `assets/js/sanitize.js`, which keeps a short list of tags with only `class` and `lang` attributes and escapes everything else.
- **Validated input.** Numbers you type or drag are checked to be integers inside fixed bounds before any computation. Long searches (factoring, discrete logs) have hard limits so the page cannot be made to hang. The URL hash and stored preferences (language, text size) are only ever matched against fixed lists.
- **Local storage holds two preferences only:** the language and the text size. Nothing else is stored.
- **TLS mode** generates its keys with WebCrypto in your browser and never sends them anywhere. They exist only to demonstrate the handshake and are discarded when you leave the page.
- **No dependencies.** There is no npm package in the shipped site and none in the tests beyond Node's built-in test runner, so there is no supply chain to compromise.

`npm test` includes checks for the policy, the allowlist, and the absence of remote URLs and dynamic code in the shipped files.

## Hosting on GitHub Pages

- Turn on **Enforce HTTPS** in the repository's Pages settings. WebCrypto requires a secure context, and the TLS mode will not run over plain HTTP.
- GitHub Pages cannot set HTTP response headers, so `frame-ancestors` (clickjacking protection) is not available from a `<meta>` policy. The site has no actions worth hijacking, so this is accepted.

## Not for real use

The numbers in modes 0 to 3 are deliberately tiny, and the TLS handshake is simplified. Nothing here is meant to protect real data.

## Reporting a problem

Open a GitHub issue, or use the repository's private vulnerability reporting if it is enabled.
