// Compact settings dialog for pages that do not embed the index.html config panel.
// It deliberately uses the same localStorage key as the full settings panel.
const RemediateSharedSettings = (() => {
  const KEY = 'remediate.settings.v1';
  const DEF = {
    master: 100, bgm: 80, sfx: 95, uiSounds: true, quality: 'high',
    crt: true, vignette: true, colorblind: 'off', reduceMotion: false,
    hints: true, timer: true, captions: true,
    keys: { interact: 'Space', hint: 'KeyH', inventory: 'KeyI' }
  };
  let modal, draft;

  const clone = x => JSON.parse(JSON.stringify(x));
  function get() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY));
      return saved ? { ...clone(DEF), ...saved, keys: { ...DEF.keys, ...saved.keys } } : clone(DEF);
    } catch (e) { return clone(DEF); }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(draft)); } catch (e) { console.error(e); }
  }
  function apply() {
    const r = document.documentElement;
    r.classList.toggle('reduce-motion', !!draft.reduceMotion);
    r.style.filter = draft.colorblind === 'off' ? '' : `url(#cb-${draft.colorblind})`;
    const crt = document.getElementById('rs-crt');
    const vignette = document.getElementById('rs-vignette');
    if (crt) crt.style.display = draft.crt ? 'block' : 'none';
    if (vignette) vignette.style.display = draft.vignette ? 'block' : 'none';
    document.dispatchEvent(new CustomEvent('remediate:settings', { detail: draft }));
  }
  function switchValue(name) {
    const on = !!(draft || DEF)[name];
    return `<button type="button" class="rss-switch" role="switch" aria-checked="${on}" data-setting="${name}"><i></i></button>`;
  }
  function render() {
    modal.querySelector('[data-setting="master"]').value = draft.master;
    modal.querySelector('[data-setting="bgm"]').value = draft.bgm;
    modal.querySelector('[data-setting="master-output"]').textContent = draft.master + '%';
    modal.querySelector('[data-setting="bgm-output"]').textContent = draft.bgm + '%';
    modal.querySelectorAll('[data-setting]:is(.rss-switch)').forEach(button => {
      button.setAttribute('aria-checked', String(!!draft[button.dataset.setting]));
    });
  }
  function inject() {
    if (document.getElementById('rss-modal')) return;
    const style = document.createElement('style');
    style.textContent =
      '#rss-modal{position:fixed;inset:0;z-index:99980;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(2,6,18,.78);backdrop-filter:blur(8px)}' +
      '#rss-modal.rss-hidden{display:none}.rss-panel{width:min(480px,100%);max-height:calc(100dvh - 32px);overflow:auto;background:#071722;border:2px solid #7ae8ff;box-shadow:0 0 32px rgba(122,232,255,.25),0 20px 60px #000;color:#dceaf1;padding:18px}' +
      '.rss-head{display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid rgba(122,232,255,.25);padding-bottom:12px}.rss-head h2{margin:0;color:#fff;font:10px "Press Start 2P",monospace}.rss-close,.rss-button{border:1px solid rgba(122,232,255,.45);background:#091d2b;color:#bfefff;cursor:pointer}.rss-close{font-size:18px;padding:4px 10px}.rss-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 0;border-bottom:1px solid rgba(122,232,255,.12)}.rss-label{font:20px VT323,monospace;color:#fff}.rss-desc{font-size:12px;color:#9fb7c3;margin-top:2px}.rss-range{display:flex;align-items:center;gap:10px}.rss-range input{width:150px;accent-color:#7ae8ff}.rss-output{min-width:44px;text-align:right;color:#7ae8ff;font:20px VT323,monospace}.rss-switch{position:relative;width:58px;height:28px;border:1px solid #74b4c8;background:#071621;cursor:pointer}.rss-switch i{position:absolute;top:3px;left:3px;width:20px;height:20px;background:#5d7a8b}.rss-switch[aria-checked="true"]{border-color:#7ae8ff;box-shadow:0 0 10px rgba(122,232,255,.35)}.rss-switch[aria-checked="true"] i{left:33px;background:#7ae8ff}.rss-actions{display:flex;justify-content:flex-end;gap:8px;padding-top:14px}.rss-button{padding:.65rem .8rem;font:8px "Press Start 2P",monospace;text-transform:uppercase}.rss-button.primary{background:#7ae8ff;color:#061d29}.rss-hidden{display:none!important}' +
      '@media(max-width:520px){.rss-row{align-items:flex-start}.rss-range input{width:110px}}';
    document.head.appendChild(style);
    const box = document.createElement('div');
    box.id = 'rss-modal';
    box.className = 'rss-hidden';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Remediate settings');
    box.innerHTML =
      '<div class="rss-panel"><div class="rss-head"><h2>SYSTEM SETTINGS</h2><button type="button" class="rss-close" aria-label="Close settings">&times;</button></div>' +
      '<div class="rss-row"><div><div class="rss-label">Master Volume</div><div class="rss-desc">Overall sound level.</div></div><div class="rss-range"><input type="range" min="0" max="100" data-setting="master"><output class="rss-output" data-setting="master-output"></output></div></div>' +
      '<div class="rss-row"><div><div class="rss-label">Music</div><div class="rss-desc">Ambient cosmic soundtrack.</div></div><div class="rss-range"><input type="range" min="0" max="100" data-setting="bgm"><output class="rss-output" data-setting="bgm-output"></output></div></div>' +
      '<div class="rss-row"><div><div class="rss-label">CRT Scanlines</div><div class="rss-desc">Retro terminal overlay.</div></div>' + switchValue('crt') + '</div>' +
      '<div class="rss-row"><div><div class="rss-label">Vignette</div><div class="rss-desc">Darken screen edges.</div></div>' + switchValue('vignette') + '</div>' +
      '<div class="rss-row"><div><div class="rss-label">Reduce Motion</div><div class="rss-desc">Minimize animation.</div></div>' + switchValue('reduceMotion') + '</div>' +
      '<div class="rss-actions"><button type="button" class="rss-button" data-rss-action="reset">Reset</button><button type="button" class="rss-button" data-rss-action="cancel">Close</button><button type="button" class="rss-button primary" data-rss-action="save">Save</button></div></div>';
    document.body.appendChild(box);
    modal = box;
    box.querySelector('.rss-close').onclick = close;
    box.querySelector('[data-rss-action="cancel"]').onclick = close;
    box.querySelector('[data-rss-action="save"]').onclick = () => { save(); apply(); close(); };
    box.querySelector('[data-rss-action="reset"]').onclick = () => { draft = clone(DEF); apply(); render(); save(); };
    box.querySelectorAll('input[type="range"]').forEach(input => input.oninput = () => {
      draft[input.dataset.setting] = Number(input.value); apply(); render();
    });
    box.querySelectorAll('.rss-switch').forEach(button => button.onclick = () => {
      draft[button.dataset.setting] = !draft[button.dataset.setting]; apply(); render();
    });
  }
  function open() {
    inject();
    draft = get();
    render();
    modal.classList.remove('rss-hidden');
  }
  function close() {
    if (!modal) return;
    modal.classList.add('rss-hidden');
  }
  window.openRemediateSettings = open;
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && modal && !modal.classList.contains('rss-hidden')) close();
  });
  document.addEventListener('DOMContentLoaded', () => {
    draft = get();
    inject();
    apply();
  });
  addEventListener('storage', event => {
    if (event.key === KEY) { draft = get(); apply(); if (modal) render(); }
  });
  return { open, get, apply: () => { draft = get(); apply(); } };
})();