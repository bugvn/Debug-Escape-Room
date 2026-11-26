// ANTI-CHEAT for REMEDIATE (loaded by game-room.html).
//
// What it does while a room is being played:
//   - blocks copy, cut, paste, drag-and-drop text and the right-click menu
//   - blocks big one-shot insertions into the editor (autofill, speech, injected text)
//   - notices when the player leaves the game window (alt-tab, other tab, other monitor)
//     and blurs the room until they come back, so a screenshot tool or second window sees nothing useful
//   - blocks the developer-tools shortcuts (F12, Ctrl+Shift+I/J/C, Ctrl+U)
//   - gives a STRIKE for each serious event; at maxStrikes the room is closed (onLimit)
//   - hands every event to onEvent(), so the game can save it to integrity_events for the analytics page
//
// HONEST LIMIT: this runs in the player's browser, so it is a deterrent and an audit trail, not a lock.
// Someone with a phone or a second computer can still look things up. That is why every event is logged:
// the analytics page can show and filter flagged games instead of pretending cheating is impossible.
//
// The pure helpers at the bottom are tested by tests/integrity.test.js (node --test).

const INTEGRITY = {
  maxStrikes: 3,        // strikes before the room is closed
  awayGraceMs: 2000,    // leaving the window for at least this long = strike
  awayIgnoreMs: 800,    // shorter than this is ignored (a permission popup, a notification)
  bigInsertChars: 30,   // one keystroke / input event adding more characters than this = pasted-like
  dedupeMs: 400         // the same event type inside this window is counted once
};

// events that cost a strike. Right-click and developer-tools keys are blocked and logged but are free.
const STRIKE_TYPES = ['paste', 'copy', 'cut', 'drop', 'big_jump'];
const BLOCKED_INPUT = { insertFromPaste: 'paste', insertFromPasteAsQuotation: 'paste', insertFromYank: 'paste', insertFromDrop: 'drop' };

function countsAsStrike(type, awayMs, cfg) {
  cfg = cfg || INTEGRITY;
  if (STRIKE_TYPES.includes(type)) return true;
  if (type === 'tab_hidden' || type === 'window_blur') return (awayMs || 0) >= cfg.awayGraceMs;
  return false;
}
function isDevtoolsKey(e) {
  const k = String(e.key || '').toLowerCase();
  if (e.key === 'F12') return true;
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (k === 'i' || k === 'j' || k === 'c')) return true;
  if (e.metaKey && e.altKey && (k === 'i' || k === 'j' || k === 'c')) return true;   // macOS
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && k === 'u') return true;             // view source
  return false;
}
function isBigInsert(inputType, data, cfg) {
  cfg = cfg || INTEGRITY;
  return inputType === 'insertText' && String(data || '').length > cfg.bigInsertChars;
}

/* ---------------------------------------------------------------------------------------------- */
function createIntegrityGuard(opts) {
  opts = opts || {};
  const cfg = Object.assign({}, INTEGRITY, opts);
  const onEvent = opts.onEvent || function () {};
  const onLimit = opts.onLimit || function () {};
  const getPuzzle = opts.getPuzzleId || function () { return null; };

  let strikes = 0, active = false, limitHit = false, away = null, wired = false, noticeT = null;
  const lastSeen = {};
  let chip = null, banner = null, overlay = null;

  /* ----- small self-contained UI (own z-index, so it shows above the game's dialogs) ----- */
  function injectUi() {
    if (chip) return;
    const st = document.createElement('style');
    st.textContent =
      '.ig-away #stage,.ig-away #modal,.ig-away #modal2{filter:blur(18px) brightness(.5);transition:none!important}' +
      '.sf .sfcode,.sf .mission,.sf .cc,.sf .eyebrow{-webkit-user-select:none;user-select:none}' +
      '#ig-chip{position:fixed;left:50%;bottom:10px;transform:translateX(-50%);z-index:99990;pointer-events:none;display:flex;align-items:center;gap:8px;' +
      'padding:6px 12px;background:rgba(6,8,20,.88);border:2px solid #4d6594;font:9px/1 "Press Start 2P",monospace;color:#89cff0;letter-spacing:.04em}' +
      '#ig-chip i{width:10px;height:10px;background:#1c2440;border:1px solid #4d6594}' +
      '#ig-chip i.on{background:#ff5c8a;border-color:#ff5c8a;box-shadow:0 0 8px #ff5c8a}' +
      '#ig-chip.hot{border-color:#ff5c8a;color:#ffb4c4}' +
      '#ig-banner{position:fixed;top:84px;right:24px;z-index:99998;max-width:min(92vw,340px);padding:10px 14px;background:rgba(21,25,44,.94);' +
      'border:3px solid #89cff0;box-shadow:4px 4px 0 #060810;font:9px/1.8 \"Press Start 2P\",monospace;color:#f5f7ff;text-align:left}' +
      '@media(max-width:767px){#ig-banner{top:auto;bottom:64px;left:50%;right:auto;transform:translateX(-50%);text-align:center}}' +
      '#ig-banner.bad{border-color:#ff5c8a;color:#ffd1dc}' +
      '#ig-overlay{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(3,5,14,.96)}' +
      '#ig-overlay .ig-card{max-width:480px;width:100%;padding:28px;background:#15192c;border:3px solid #ff5c8a;box-shadow:6px 6px 0 #060810,0 0 28px rgba(255,92,138,.35);text-align:center}' +
      '#ig-overlay h2{margin:0 0 16px;font:14px/1.7 "Press Start 2P",monospace;color:#ff5c8a}' +
      '#ig-overlay p{margin:0 0 14px;font:22px/1.25 "VT323",monospace;color:#dee1f9}' +
      '#ig-overlay .ig-count{font:12px/1.6 "Press Start 2P",monospace;color:#ffd166}' +
      '#ig-overlay button{margin-top:8px;padding:12px 18px;font:11px "Press Start 2P",monospace;color:#061d29;background:#89cff0;border:0;cursor:pointer;box-shadow:0 4px 0 #3b7f99}' +
      '#ig-overlay button:active{transform:translateY(3px);box-shadow:0 1px 0 #3b7f99}';
    document.head.appendChild(st);
    chip = document.createElement('div'); chip.id = 'ig-chip'; chip.setAttribute('role', 'status');
    banner = document.createElement('div'); banner.id = 'ig-banner'; banner.hidden = true; banner.setAttribute('role', 'status'); banner.setAttribute('aria-live', 'polite');
    document.body.append(chip, banner);
  }
  function renderChip() {
    if (!chip) return;
    let dots = '';
    for (let i = 0; i < cfg.maxStrikes; i++) dots += '<i class="' + (i < strikes ? 'on' : '') + '"></i>';
    chip.innerHTML = 'INTEGRITY ' + dots;
    chip.title = 'Strikes: ' + strikes + ' of ' + cfg.maxStrikes + '. Copy/paste and leaving this window are not allowed.';
    chip.classList.toggle('hot', strikes > 0);
  }
  function notice(msg, bad, ms) {
    if (!banner) return;
    banner.textContent = msg; banner.className = bad ? 'bad' : ''; banner.hidden = false;
    clearTimeout(noticeT); noticeT = setTimeout(() => { banner.hidden = true; }, ms || 3800);
  }
  const strikeText = () => ' STRIKE ' + strikes + ' OF ' + cfg.maxStrikes + '.';

  function showAway(ms) {
    if (overlay) overlay.remove();
    overlay = document.createElement('div'); overlay.id = 'ig-overlay';
    overlay.setAttribute('role', 'alertdialog'); overlay.setAttribute('aria-modal', 'true'); overlay.setAttribute('aria-labelledby', 'ig-title');
    const secs = Math.round(ms / 1000);
    overlay.innerHTML = '<div class="ig-card"><h2 id="ig-title">YOU LEFT THE GAME</h2>' +
      '<p>You were away from this window for ' + secs + ' second' + (secs === 1 ? '' : 's') + '. Switching windows or tabs is not allowed during a room, and it was recorded.</p>' +
      '<p class="ig-count">STRIKE ' + strikes + ' OF ' + cfg.maxStrikes + '</p>' +
      '<p>' + (cfg.maxStrikes - strikes) + ' more and the room closes.</p>' +
      '<button type="button">BACK TO THE ROOM</button></div>';
    document.body.appendChild(overlay);
    const b = overlay.querySelector('button');
    b.onclick = () => { overlay.remove(); overlay = null; };
    b.focus();
  }

  /* ----- recording ----- */
  function record(type, extra) {
    if (!active) return null;
    extra = extra || {};
    const now = Date.now();
    const isAway = type === 'tab_hidden' || type === 'window_blur';
    if (!isAway && lastSeen[type] && now - lastSeen[type] < cfg.dedupeMs) return null;   // one key press can fire two events
    lastSeen[type] = now;
    const strike = countsAsStrike(type, extra.away_ms, cfg);
    const ev = { event_type: type, puzzle_id: getPuzzle() || null, away_ms: extra.away_ms === undefined ? null : Math.round(extra.away_ms), strike: strike,
      detail: extra.detail ? String(extra.detail).slice(0, 200) : null };
    if (strike) strikes++;
    onEvent(ev);
    renderChip();
    let limit = false;
    if (strike && strikes >= cfg.maxStrikes && !limitHit) {
      limitHit = true; limit = true;
      onEvent({ event_type: 'auto_end', puzzle_id: null, away_ms: null, strike: false, detail: 'strike limit ' + cfg.maxStrikes });
      onLimit(strikes);
    }
    return { ev: ev, strikes: strikes, limit: limit };
  }

  /* ----- listeners ----- */
  const blockFlow = (type, msg) => function (e) {
    if (!active) return;
    e.preventDefault(); e.stopPropagation();
    const r = record(type);
    if (r && !r.limit) notice(msg + strikeText(), true);
  };

  function leave(kind) {
    if (!active || away) return;
    away = { t: Date.now(), kind: kind };
    document.documentElement.classList.add('ig-away');
  }
  function back() {
    if (!away) return;
    const ms = Date.now() - away.t, kind = away.kind;
    away = null; document.documentElement.classList.remove('ig-away');
    if (ms < cfg.awayIgnoreMs) return;
    const r = record(kind, { away_ms: ms });
    if (!r || r.limit) return;
    if (r.ev.strike) showAway(ms); else notice('Window focus lost for ' + (ms / 1000).toFixed(1) + 's. Stay in the game window.', false);
  }
  const maybeBack = () => { if (!document.hidden && document.hasFocus()) back(); };

  function wire() {
    if (wired) return; wired = true;
    document.addEventListener('paste', blockFlow('paste', 'PASTING IS DISABLED.'), true);
    document.addEventListener('copy', blockFlow('copy', 'COPYING IS DISABLED.'), true);
    document.addEventListener('cut', blockFlow('cut', 'CUTTING IS DISABLED.'), true);
    document.addEventListener('drop', blockFlow('drop', 'DRAGGING TEXT IN IS DISABLED.'), true);
    document.addEventListener('dragover', (e) => { if (active) e.preventDefault(); }, true);
    document.addEventListener('contextmenu', (e) => {
      if (!active) return;
      e.preventDefault(); record('contextmenu'); notice('RIGHT-CLICK IS DISABLED IN THE ROOM.', false, 2500);
    }, true);
    document.addEventListener('keydown', (e) => {
      if (!active || !isDevtoolsKey(e)) return;
      e.preventDefault(); e.stopPropagation(); record('devtools_key', { detail: e.key }); notice('DEVELOPER TOOLS ARE NOT ALLOWED IN THE ROOM.', true);
    }, true);
    // text that arrives in one piece instead of being typed
    document.addEventListener('beforeinput', (e) => {
      if (!active) return;
      const t = BLOCKED_INPUT[e.inputType];
      if (t) { e.preventDefault(); const r = record(t); if (r && !r.limit) notice('PASTED TEXT IS BLOCKED.' + strikeText(), true); return; }
      if (isBigInsert(e.inputType, e.data, cfg)) {
        e.preventDefault(); const r = record('big_jump', { detail: String(e.data).length + ' chars at once' });
        if (r && !r.limit) notice('TEXT MUST BE TYPED, NOT INSERTED.' + strikeText(), true);
      }
    }, true);
    document.addEventListener('visibilitychange', () => { if (document.hidden) leave('tab_hidden'); else maybeBack(); });
    window.addEventListener('blur', () => leave(document.hidden ? 'tab_hidden' : 'window_blur'));
    window.addEventListener('focus', maybeBack);
  }

  return {
    start() {
      injectUi(); wire(); active = true; strikes = 0; limitHit = false; renderChip();
      notice('ANTI-CHEAT ON: NO COPY/PASTE, NO SWITCHING WINDOWS. ' + cfg.maxStrikes + ' STRIKES CLOSES THE ROOM.', false, 7000);
    },
    stop() {
      active = false; away = null; document.documentElement.classList.remove('ig-away');
      if (overlay) { overlay.remove(); overlay = null; }
      if (chip) chip.hidden = true; if (banner) banner.hidden = true;
    },
    get strikes() { return strikes; },
    get active() { return active; }
  };
}

if (typeof module !== 'undefined') module.exports = { INTEGRITY, STRIKE_TYPES, BLOCKED_INPUT, countsAsStrike, isDevtoolsKey, isBigInsert };