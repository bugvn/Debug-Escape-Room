// Reads the settings saved by the index.html settings dialog
// (localStorage 'remediate.settings.v1') and applies the visual ones to any page.
// Pages read values with RemediateSettings.get() and react to changes with
// RemediateSettings.onChange(fn).

const RemediateSettings = (() => {
  const KEY = 'remediate.settings.v1';
  const DEF = {
    master: 100, bgm: 80, sfx: 95, uiSounds: true, quality: 'high', crt: true, vignette: true,
    colorblind: 'off', reduceMotion: false, difficulty: 'standard', hints: true, timer: true, captions: true,
    keys: { interact: 'Space', hint: 'KeyH', inventory: 'KeyI' }
  };
  const listeners = [];

  function get() {
    try {
      const x = JSON.parse(localStorage.getItem(KEY));
      if (!x) return { ...DEF, keys: { ...DEF.keys }, reduceMotion: matchMedia('(prefers-reduced-motion: reduce)').matches };
      return { ...DEF, ...x, keys: { ...DEF.keys, ...x.keys } };
    } catch (e) { return { ...DEF, keys: { ...DEF.keys } }; }
  }

  const CB = {
    protanopia: '1.000 0.000 0.000 0 0 -0.255 1.255 0.000 0 0 0.303 -0.545 1.242 0 0 0 0 0 1 0',
    deuteranopia: '1.000 0.000 0.000 0 0 -0.438 1.438 0.000 0 0 0.262 -0.562 1.300 0 0 0 0 0 1 0',
    tritanopia: '1.050 -0.382 0.332 0 0 0.000 1.234 -0.234 0 0 0.000 0.000 1.000 0 0 0 0 0 1 0'
  };

  function ensureDom() {
    if (document.getElementById('rs-fx')) return;
    const box = document.createElement('div');
    box.id = 'rs-fx';
    box.setAttribute('aria-hidden', 'true');
    box.innerHTML =
      '<svg width="0" height="0" style="position:absolute" focusable="false"><defs>' +
      Object.keys(CB).map((k) => '<filter id="cb-' + k + '" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="' + CB[k] + '"/></filter>').join('') +
      '</defs></svg>' +
      '<div id="rs-vignette" style="position:fixed;inset:0;z-index:89;pointer-events:none;background:radial-gradient(ellipse at center,transparent 55%,rgba(0,0,0,.65) 100%)"></div>' +
      '<div id="rs-crt" style="position:fixed;inset:0;z-index:90;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(0,0,0,.28) 0,rgba(0,0,0,.28) 1px,transparent 1px,transparent 3px)"></div>';
    document.body.appendChild(box);
    const st = document.createElement('style');
    st.textContent = '.reduce-motion *,.reduce-motion *::before,.reduce-motion *::after{animation:none!important;transition:none!important}';
    document.head.appendChild(st);
  }

  function apply() {
    const s = get();
    ensureDom();
    const r = document.documentElement;
    r.classList.toggle('reduce-motion', !!s.reduceMotion);
    r.style.filter = s.colorblind === 'off' ? '' : 'url(#cb-' + s.colorblind + ')';
    document.getElementById('rs-crt').style.display = s.crt ? 'block' : 'none';
    document.getElementById('rs-vignette').style.display = s.vignette ? 'block' : 'none';
    listeners.forEach((fn) => fn(s));
  }

  addEventListener('storage', (e) => { if (e.key === KEY) apply(); });
  document.addEventListener('DOMContentLoaded', apply);

  return { get, apply, onChange: (fn) => listeners.push(fn) };
})();