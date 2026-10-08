// Allowlist for the small amount of markup the site renders as HTML (math
// notation in captions and formulas). Every string that reaches innerHTML goes
// through here, so a mistake in a catalog or a future change that lets user
// text into a message cannot inject elements, attributes, or scripts.

const ALLOWED_TAGS = new Set(['var', 'sup', 'sub', 'span', 'code', 'b', 'i', 'em', 'strong', 'small', 'br']);
const TAG = /<[^<>]*>?/g;
const OPEN = /^<([a-z]+)((?:\s+(?:class|lang)="[\w\s-]*")*)\s*\/?>$/;
const CLOSE = /^<\/([a-z]+)\s*>$/;

function escapeTag(text) {
  return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function sanitizeHTML(html) {
  return String(html).replace(TAG, (tag) => {
    let open = OPEN.exec(tag);
    if (open && ALLOWED_TAGS.has(open[1])) return tag;
    let close = CLOSE.exec(tag);
    if (close && ALLOWED_TAGS.has(close[1])) return tag;
    return escapeTag(tag);
  });
}
