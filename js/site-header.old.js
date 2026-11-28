/* One header for every page.
   Usage:  <header id="siteHeader"></header>
           <script src="js/site-header.js"></script>
   data-actions  optional extra buttons: music (mute, login page), skip
                 "rules" and "settings" need no attribute: signed-in players get them in the user menu.
   data-title    no longer shown. The top left is always just "Remediate".
   Layout:
     signed out   Rules, Login / Register   (login page: mute button only)
     signed in    user menu: profile, Dashboard, Analytics (admin), Review Lessons, Rules, Settings, Log out
                  on the index page, Rules sits beside the menu instead of inside it
   The lesson page header is sticky.
   Keeps the ids older page scripts rely on: navAnalytics, playerName, logoutBtn, skipTop,
   audio-toggle-btn, settings-toggle-btn. */
(function () {
  var host = document.getElementById('siteHeader');
  if (!host) return;

  /* page name without ".html", so /dashboard and /dashboard.html both work */
  var page = (location.pathname.split('/').pop() || 'index').toLowerCase().replace(/\.html$/, '');
  var isIndex = page === 'index', isLogin = page === 'login', isLesson = page === 'lesson';

  var ACTIONS = {
    /* icon-only mute button, same look as the game room. The svg and span stay in the page (hidden by CSS) for older scripts */
    music: '<button class="sh-mute music-btn" id="audio-toggle-btn" type="button" data-icon="🔊" title="Mute / unmute music" aria-label="Mute music">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77zm-2.5-2.23l-5.5 5h-4v12h4l5.5 5v-22z"/></svg>' +
      '<span>MUSIC ON</span></button>',
    /* login page only: never visible, kept so scripts that look up this id don't crash */
    settings: isLogin ? '<button class="hidden" id="settings-toggle-btn" type="button" tabindex="-1"></button>' : '',
    /* the lesson page has its own skip button beside Back / Next */
    skip: isLesson ? '' : '<button class="sh-link sh-link--go" id="skipTop" type="button">Skip to game</button>'
  };

  var css = [
    '.sh{box-sizing:border-box;position:relative;z-index:20;width:100%;padding:.75rem 1rem;border-bottom:2px solid rgba(34,211,238,.4);background:rgba(8,27,42,.92);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);font-family:"VT323",monospace}',
    '.sh.sh--sticky{position:-webkit-sticky;position:sticky;top:0;z-index:50}',
    '.sh *,.sh *::before,.sh *::after{box-sizing:border-box}',
    '.sh__in{max-width:80rem;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.75rem}',
    '.sh__brand{flex-shrink:0;display:flex;align-items:center;gap:.75rem;color:inherit;text-decoration:none}',
    '.sh__mark{width:1.75rem;height:1.75rem;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:rgba(56,225,255,.2);border:2px solid #38e1ff;color:#38e1ff;font:.75rem/1rem "Press Start 2P",monospace;box-shadow:0 0 8px rgba(56,225,255,.6)}',
    '.sh__name{font:10px "Press Start 2P",monospace;letter-spacing:.05em;text-transform:uppercase;color:#38e1ff;filter:drop-shadow(0 0 5px rgba(56,225,255,.5))}',
    '.sh__nav{display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-end;gap:.375rem;margin-left:auto}',
    '.sh .sh-link{display:inline-flex;align-items:center;margin:0;padding:.3rem .6rem;font:1.125rem/1.5rem "VT323",monospace;letter-spacing:normal;color:#cbd5e1;text-transform:uppercase;text-decoration:none;cursor:pointer;background:rgba(10,13,26,.9);border:1px solid #232a4e;border-radius:0;box-shadow:none;transition:border-color .15s,color .15s}',
    '.sh .sh-link:hover{border-color:#38e1ff;color:#fff}',
    '.sh button.sh-mute{display:inline-flex;align-items:center;justify-content:center;min-width:55px;height:35px;margin:0;padding:0 12px;font-size:0;line-height:1;background:rgba(34,45,90,.95);border:2px solid rgba(148,163,184,.38);border-radius:4px;box-shadow:0 0 6px rgba(148,163,184,.18),inset 0 0 0 1px rgba(255,255,255,.04);cursor:pointer;transition:background .15s}',
    '.sh button.sh-mute:hover{background:rgba(30,27,75,.8)}',
    '.sh button.sh-mute>*{display:none!important}',
    '.sh button.sh-mute::before{content:attr(data-icon);font-size:20px;line-height:1;color:#cbd5e1}',
    '.sh .sh-link--go{border-color:rgba(255,209,102,.6);color:#ffd166}',
    '.sh .sh-link--in{background:#38e1ff;color:#061d29;border-color:#a5f3fc}',
    '.sh .sh-link--in:hover{color:#061d29;filter:brightness(1.1)}',
    '.sh-um{position:relative}',
    '.sh-player{display:inline-flex;align-items:center;gap:.5rem;max-width:9.5rem;padding:.3rem .6rem;background:rgba(10,13,26,.9);border:1px solid #232a4e;color:#cbd5e1;font:1.125rem/1.5rem "VT323",monospace;cursor:pointer;transition:border-color .15s}',
    '.sh-player #playerName{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.sh-player::after{content:"";flex-shrink:0;margin-left:.25rem;border:4px solid transparent;border-top-color:#a594f9;border-bottom:0}',
    '.sh-player:hover{border-color:#a594f9}',
    '.sh-um--open .sh-player{border-color:#a594f9;color:#fff}',
    '.sh-av{position:relative;flex-shrink:0;width:1.25rem;height:1.25rem;display:flex;align-items:center;justify-content:center;background:#161b33;border:1px solid #a594f9;font:10px "Press Start 2P",monospace;color:#a594f9}',
    '.sh-av i{position:absolute;right:-2px;bottom:-2px;width:.375rem;height:.375rem;background:#ffd166;border:1px solid #070a14}',
    '.sh-menu{position:absolute;right:0;top:calc(100% + .375rem);min-width:13rem;max-width:calc(100vw - 2rem);padding:.25rem;background:#0a0d1a;border:1px solid #a594f9;box-shadow:0 8px 24px rgba(0,0,0,.7);display:none;z-index:30}',
    '.sh-um--open .sh-menu{display:block}',
    '.sh-who{display:flex;align-items:center;gap:.625rem;padding:.4rem .6rem}',
    '.sh-who>div{min-width:0}',
    '.sh-who__name{display:block;font:1.25rem/1.4rem "VT323",monospace;color:#fff;overflow-wrap:anywhere}',
    '.sh-who__role{display:block;font:1rem/1.1rem "VT323",monospace;color:#a594f9;text-transform:uppercase}',
    '.sh-menu a,.sh-menu button{display:block;width:100%;margin:0;text-align:left;padding:.35rem .6rem;font:1.125rem/1.5rem "VT323",monospace;color:#cbd5e1;text-transform:uppercase;text-decoration:none;background:none;border:0;cursor:pointer}',
    '.sh-menu a:hover,.sh-menu button:hover{background:#161b33;color:#fff}',
    '.sh-menu .on{color:#38e1ff}',
    '.sh-menu #logoutBtn:hover{color:#ff5c8a}',
    '.sh-menu hr{height:0;margin:.25rem 0;border:0;border-top:1px solid #232a4e}',
    '.sh .hidden{display:none!important}',
    '@media(min-width:640px){.sh{padding-left:2rem;padding-right:2rem}.sh__name{font-size:.75rem;line-height:1rem}}',
    '@media(max-width:639px){.sh .sh-link{padding:.3rem .55rem}}'
  ].join('');
  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  var actions = (host.getAttribute('data-actions') || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  var acts = actions.map(function (a) { return ACTIONS[a] || ''; }).join('');

  function item(name, label, id, extra) {
    var on = name === page;
    var cls = [on ? 'on' : '', extra || ''].join(' ').trim();
    return '<a role="menuitem" href="' + name + '.html"' + (id ? ' id="' + id + '"' : '') +
      (cls ? ' class="' + cls + '"' : '') + (on ? ' aria-current="page"' : '') + '>' + label + '</a>';
  }
  function panelButton(name, label) {
    return '<button role="menuitem" type="button" data-panel="' + name + '">' + label + '</button>';
  }

  host.className = 'sh' + (isLesson ? ' sh--sticky' : '');
  host.innerHTML =
    '<div class="sh__in">' +
      '<a class="sh__brand" href="index.html"><div class="sh__mark">&lt;&gt;</div><span class="sh__name">Remediate</span></a>' +
      '<nav class="sh__nav" aria-label="Main">' + acts +
        (isLogin ? '' : '<button class="sh-link" id="shRules" type="button" data-panel="rules">Rules</button>') +
        '<div class="sh-um hidden" id="shUser">' +
          '<button class="sh-player" id="shPlayer" type="button" aria-haspopup="true" aria-expanded="false"><span class="sh-av"><b id="shInitial" style="font-weight:400">?</b><i></i></span><span id="playerName">Player</span></button>' +
          '<div class="sh-menu" id="shMenu" role="menu">' +
            /* 1. user profile */
            '<div class="sh-who" role="presentation"><span class="sh-av"><b id="shWhoInitial" style="font-weight:400">?</b></span>' +
              '<div><span class="sh-who__name" id="shWhoName">Player</span><span class="sh-who__role" id="shWhoRole">Player</span></div></div>' +
            '<hr>' +
            item('dashboard', 'Dashboard') +                                    /* 2 */
            item('analytics', 'Analytics', 'navAnalytics', 'hidden') +          /* 3, admin only */
            item('lesson', 'Review Lessons') +                                  /* 4 */
            (isIndex ? '' : panelButton('rules', 'Rules')) +                    /* 5 */
            panelButton('settings', 'Settings') +                               /* 6 */
            '<hr><button role="menuitem" id="logoutBtn" type="button">Log out</button>' + /* 7 */
          '</div>' +
        '</div>' +
        (isLogin ? '' : '<a class="sh-link sh-link--in" id="authBtn" href="login.html">Login / Register</a>') +
      '</nav>' +
    '</div>';

  /* mute icon follows js/ambient-music.js; the click itself is handled by the page's own script */
  var mute = host.querySelector('.sh-mute');
  if (mute) {
    var syncMute = function () {
      if (typeof RemediateAmbient === 'undefined') return;
      var off = RemediateAmbient.getMuted();
      mute.setAttribute('data-icon', off ? '🔇' : '🔊');
      mute.setAttribute('aria-label', off ? 'Unmute music' : 'Mute music');
    };
    window.addEventListener('load', syncMute);
    document.addEventListener('click', function () { setTimeout(syncMute, 0); }, true);
  }

  var um = document.getElementById('shUser'), pb = document.getElementById('shPlayer');
  function setOpen(o) { um.classList.toggle('sh-um--open', o); pb.setAttribute('aria-expanded', o ? 'true' : 'false'); }

  /* Rules pop-up for pages without their own: same text as the index page, shown on the current page */
  var rulesCss = [
    '.shr{position:fixed;top:0;right:0;bottom:0;left:0;z-index:80;display:flex;align-items:center;justify-content:center;padding:1rem;background:rgba(0,0,0,.75);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)}',
    '.shr *{box-sizing:border-box}',
    '.shr__box{position:relative;width:100%;max-width:522px;max-height:100%;overflow-y:auto;padding:38px 35px 36px;background:#071b29;border:2px solid #4cc3da;box-shadow:0 0 22px rgba(56,225,255,.2);text-align:left;scrollbar-width:thin;scrollbar-color:rgba(122,232,255,.4) transparent}',
    '.shr h2{margin:0 0 20px;padding:0 40px 0 4px;font:14px/1.5 "Press Start 2P",monospace;color:#67e8f9}',
    '.shr__body{font:400 14px/1.625 "Nunito",sans-serif;color:#cbd5e1}',
    '.shr__body p{margin:0 0 16px}',
    '.shr__body p:last-child{margin-bottom:0}',
    '.shr__body b,.shr__body strong{font-weight:800;color:#fff}',
    '.shr .shr__x{position:absolute;top:20px;right:20px;width:36px;height:36px;margin:0;padding:0;background:none;border:0;color:#22d3ee;font:20px/1 sans-serif;cursor:pointer}',
    '.shr .shr__x:hover{color:#fff}',
    '.shr__foot{display:flex;justify-content:flex-end;margin-top:24px;padding-top:20px;border-top:1px solid rgba(148,163,184,.2)}',
    '.shr .shr__ok{min-width:94px;height:42px;margin:0;padding:0 17px;font:10px "Press Start 2P",monospace;text-transform:uppercase;background:#7ae8ff;color:#061d29;border:0;cursor:pointer;box-shadow:inset -3px -3px 0 rgba(0,0,0,.5),inset 3px 3px 0 rgba(255,255,255,.25)}',
    '.shr .shr__ok:hover{filter:brightness(1.12)}'
  ].join('');

  function loadRules() {
    return fetch('index.html').then(function (res) {
      if (!res.ok) throw new Error('index.html returned ' + res.status);
      return res.text();
    }).then(function (text) {
      var src = new DOMParser().parseFromString(text, 'text/html').getElementById('rulesModal');
      if (!src) throw new Error('rulesModal not found in index.html');
      /* only the rule paragraphs, stripped of the index page's classes and handlers */
      var rules = Array.prototype.filter.call(src.querySelectorAll('p'), function (p) { return p.textContent.trim(); });
      if (!rules.length) throw new Error('no rule paragraphs in rulesModal');
      return rules.map(function (p) {
        Array.prototype.forEach.call(p.querySelectorAll('script,style,button,input,img,svg,iframe'), function (el) { el.remove(); });
        [p].concat(Array.prototype.slice.call(p.querySelectorAll('*'))).forEach(function (el) {
          Array.prototype.slice.call(el.attributes).forEach(function (a) { el.removeAttribute(a.name); });
        });
        return p.outerHTML;
      }).join('');
    });
  }

  function showRules() {
    if (document.getElementById('shRulesPop')) return;
    if (!document.getElementById('shRulesCss')) {
      var font = document.createElement('link');
      font.rel = 'stylesheet';
      font.href = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Nunito:wght@400;800&display=swap';
      var style = document.createElement('style');
      style.id = 'shRulesCss';
      style.textContent = rulesCss;
      document.head.appendChild(font);
      document.head.appendChild(style);
    }
    var pop = document.createElement('div');
    pop.className = 'shr';
    pop.id = 'shRulesPop';
    pop.innerHTML =
      '<div class="shr__box" role="dialog" aria-modal="true" aria-labelledby="shRulesTitle">' +
        '<button class="shr__x" type="button" aria-label="Close">✕</button>' +
        '<h2 id="shRulesTitle">📜 GAME RULES</h2>' +
        '<div class="shr__body">Loading rules...</div>' +
        '<div class="shr__foot"><button class="shr__ok" type="button">Got it</button></div>' +
      '</div>';
    document.body.appendChild(pop);
    var box = pop.firstChild, x = pop.querySelector('.shr__x'), ok = pop.querySelector('.shr__ok'), body = pop.querySelector('.shr__body');
    var back = document.activeElement, overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function close() {
      document.removeEventListener('keydown', keys, true);
      document.body.style.overflow = overflow;
      pop.remove();
      if (back && back.focus) back.focus();
    }
    /* while open, keys stay in the pop-up (so the lesson page's arrow keys don't change lessons) */
    function keys(e) {
      e.stopPropagation();
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'Tab') { e.preventDefault(); (document.activeElement === ok ? x : ok).focus(); }
    }
    document.addEventListener('keydown', keys, true);
    x.onclick = ok.onclick = close;
    pop.addEventListener('click', function (e) { e.stopPropagation(); if (e.target === pop) close(); });
    ok.focus({ preventScroll: true });
    loadRules().then(function (html) { body.innerHTML = html; }).catch(function (e) {
      console.error(e);
      body.textContent = 'The rules could not be loaded. Close this and try again.';
    }).then(function () { box.scrollTop = 0; });
  }

  /* Rules always opens on the current page. Settings uses the page's own pop-up, or the index page's */
  function openPanel(name) {
    if (name === 'rules') {
      if (typeof openModal === 'function' && document.getElementById('rulesModal')) return openModal('rulesModal');
      return showRules();
    }
    if (typeof openSettings === 'function') return openSettings();
    if (typeof openRemediateSettings === 'function') return openRemediateSettings();
    if (!isIndex) location.href = 'index.html#settings';
  }
  Array.prototype.forEach.call(host.querySelectorAll('[data-panel]'), function (b) {
    b.addEventListener('click', function () { setOpen(false); openPanel(b.getAttribute('data-panel')); });
  });

  /* arriving from another page as index.html#settings */
  if (isIndex && location.hash === '#settings') {
    window.addEventListener('load', function () {
      history.replaceState(null, '', location.pathname + location.search);
      openPanel('settings');
    });
  }

  pb.addEventListener('click', function (e) { e.stopPropagation(); setOpen(!um.classList.contains('sh-um--open')); });
  document.addEventListener('click', function (e) { if (!um.contains(e.target)) setOpen(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && um.classList.contains('sh-um--open')) { setOpen(false); pb.focus(); }
  });

  function showName(name) {
    var initial = name.charAt(0).toUpperCase();
    document.getElementById('playerName').textContent = name;
    document.getElementById('shWhoName').textContent = name;
    document.getElementById('shInitial').textContent = initial;
    document.getElementById('shWhoInitial').textContent = initial;
  }

  /* signed-in state: runs once the page's own scripts (js/supabase-config.js) have loaded */
  function hydrate() {
    if (typeof db === 'undefined' || typeof getUser !== 'function') return;
    document.getElementById('logoutBtn').onclick = function () { if (typeof logout === 'function') logout(); };
    getUser().then(function (u) {
      if (!u) return;
      var auth = document.getElementById('authBtn');
      if (auth) auth.classList.add('hidden');
      /* signed in: Rules stays beside the menu on the index page only */
      var rules = document.getElementById('shRules');
      if (rules && !isIndex) rules.classList.add('hidden');
      um.classList.remove('hidden');
      if (page === 'analytics') document.getElementById('navAnalytics').classList.remove('hidden');
      return getProfile(u.id).then(function (p) {
        if (!p) return;
        showName(p.player_name || 'Player');
        if (p.is_admin) {
          document.getElementById('navAnalytics').classList.remove('hidden');
          document.getElementById('shWhoRole').textContent = 'Admin';
        }
      });
    }).catch(function (e) { console.error(e); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hydrate);
  else hydrate();
})();
