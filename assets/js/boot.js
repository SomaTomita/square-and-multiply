// Runs before first paint: pick the language and text size so the page does not flash.
(function () {
  var codes = ['en', 'nl', 'fr', 'de', 'es', 'el', 'hi', 'ja', 'ko', 'zh'];
  var lang = null;
  var size = 'm';
  try {
    lang = localStorage.getItem('sm-lang');
    size = localStorage.getItem('sm-size') || 'm';
  } catch (e) {}
  if (codes.indexOf(lang) === -1) {
    lang = 'en';
    var prefs = navigator.languages || [navigator.language || 'en'];
    for (var i = 0; i < prefs.length; i++) {
      var base = String(prefs[i]).toLowerCase().split('-')[0];
      if (codes.indexOf(base) !== -1) { lang = base; break; }
    }
  }
  document.documentElement.dataset.size = /^(s|m|l)$/.test(size) ? size : 'm';
  document.documentElement.dataset.lang = lang;
  document.documentElement.lang = lang;
})();
