/* One header for every page.
   Usage:  <header id="siteHeader" data-title="Dashboard" data-actions="rules,settings"></header>
           <script src="site-header.js"></script>
   data-title    text after "REMEDIATE /"
   data-actions  optional page buttons: rules, settings, skip
   Keeps the ids older page scripts rely on: navAnalytics, playerName, logoutBtn, skipTop. */
(function () {
  var host = document.getElementById('siteHeader');
  if (!host) return;

  var file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var NAV = [['index.html', 'Menu']];
  var ACTIONS = {
    rules: '<button class="sh-link" type="button" onclick="openModal(\'rulesModal\')">Rules</button>',
    settings: '<button class="sh-link" type="button" onclick="openSettings()">Settings</button>',
    skip: '<button class="sh-link sh-link--go" id="skipTop" type="button">Skip to game</button>'
  };

  var css = [
    '.sh{position:relative;z-index:20;width:100%;padding:.75rem 1rem;border-bottom:2px solid rgba(34,211,238,.4);background:rgba(8,27,42,.92);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);font-family:"VT323",monospace}',
    '.sh *,.sh *::before,.sh *::after{box-sizing:border-box}',
    '.sh__in{max-width:80rem;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.75rem}',
    '.sh__brand{flex-shrink:0;display:flex;align-items:center;gap:.75rem;color:inherit;text-decoration:none}',
    '.sh__mark{width:1.75rem;height:1.75rem;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:rgba(56,225,255,.2);border:2px solid #38e1ff;color:#38e1ff;font:.75rem/1rem "Press Start 2P",monospace;box-shadow:0 0 8px rgba(56,225,255,.6)}',
    '.sh__name{font:10px "Press Start 2P",monospace;letter-spacing:.05em;text-transform:uppercase;color:#38e1ff;filter:drop-shadow(0 0 5px rgba(56,225,255,.5))}',
    '.sh__slash{margin:0 .5rem;font:.75rem "Press Start 2P",monospace;color:#232a4e}',
    '.sh__sub{margin:0;display:inline;font:9px "Press Start 2P",monospace;letter-spacing:.025em;text-transform:uppercase;color:#a594f9}',
    '.sh__nav{display:flex;flex-wrap:wrap;align-items:center;gap:.375rem}',
    '.sh-link{display:inline-flex;align-items:center;padding:.3rem .6rem;font:1.125rem/1.5rem "VT323",monospace;color:#cbd5e1;text-transform:uppercase;text-decoration:none;cursor:pointer;background:rgba(10,13,26,.9);border:1px solid #232a4e;transition:border-color .15s,color .15s}',
    '.sh-link:hover{border-color:#38e1ff;color:#fff}',
    '.sh-link--on{border-color:#38e1ff;color:#38e1ff}',
    '.sh-link--go{border-color:rgba(255,209,102,.6);color:#ffd166}',
    '.sh-link--out:hover{border-color:#ff5c8a}',
    '.sh-link--in{background:#38e1ff;color:#061d29;border-color:#a5f3fc}',
    '.sh-link--in:hover{color:#061d29;filter:brightness(1.1)}',
    '.sh-sep{display:none}',
    '.sh-player{text-decoration:none;cursor:pointer;transition:border-color .15s;display:inline-flex;align-items:center;gap:.5rem;padding:.3rem .6rem;background:rgba(10,13,26,.9);border:1px solid #232a4e;color:#cbd5e1;font:1.125rem/1.5rem "VT323",monospace;max-width:9.5rem}',
    '.sh-player span:last-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.sh-player:hover{border-color:#a594f9}.sh-player--on{border-color:#a594f9;color:#fff}.sh-av{position:relative;flex-shrink:0;width:1.25rem;height:1.25rem;display:flex;align-items:center;justify-content:center;background:#161b33;border:1px solid #a594f9;font:10px "Press Start 2P",monospace;color:#a594f9}',
    '.sh-av i{position:absolute;right:-2px;bottom:-2px;width:.375rem;height:.375rem;background:#ffd166;border:1px solid #070a14}',
    '.sh-um{position:relative}',
    '.sh-player{font-family:"VT323",monospace;cursor:pointer}',
    '.sh-player::after{content:"";margin-left:.25rem;border:4px solid transparent;border-top-color:#a594f9;border-bottom:0}',
    '.sh-um--open .sh-player{border-color:#a594f9;color:#fff}',
    '.sh-menu{position:absolute;right:0;top:calc(100% + .375rem);min-width:11rem;padding:.25rem;background:#0a0d1a;border:1px solid #a594f9;box-shadow:0 8px 24px rgba(0,0,0,.7);display:none;z-index:30}',
    '.sh-um--open .sh-menu{display:block}',
    '.sh-menu a,.sh-menu button{display:block;width:100%;text-align:left;padding:.35rem .6rem;font:1.125rem/1.5rem "VT323",monospace;color:#cbd5e1;text-transform:uppercase;text-decoration:none;background:none;border:0;cursor:pointer}',
    '.sh-menu a:hover,.sh-menu button:hover{background:#161b33;color:#fff}',
    '.sh-menu .on{color:#38e1ff}',
    '.sh-menu #logoutBtn:hover{color:#ff5c8a}',
    '.sh-menu hr{margin:.25rem 0;border:0;border-top:1px solid #232a4e}',
    '.sh .hidden{display:none!important}',
    '@media(min-width:640px){.sh{padding-left:2rem;padding-right:2rem}.sh__name{font-size:.75rem;line-height:1rem}}',
    '@media(max-width:639px){.sh__sub,.sh__slash{display:none}.sh__nav{width:100%}.sh-link{padding:.3rem .55rem}}'
  ].join('');
  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  var title = host.getAttribute('data-title') || '';
  var actions = (host.getAttribute('data-actions') || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);

  var links = NAV.map(function (n) {
    var on = n[0] === file;
    return '<a class="sh-link' + (on ? ' sh-link--on' : '') + (n[2] ? ' hidden' : '') + '"' +
      (n[2] ? ' id="' + n[2] + '"' : '') + ' href="' + n[0] + '"' + (on ? ' aria-current="page"' : '') + '>' + n[1] + '</a>';
  }).join('');
  var acts = actions.map(function (a) { return ACTIONS[a] || ''; }).join('');

  host.className = 'sh';
  host.innerHTML =
    '<div class="sh__in">' +
      '<a class="sh__brand" href="index.html"><div class="sh__mark">&lt;&gt;</div>' +
        '<div><span class="sh__name">Remediate</span>' +
        (title ? '<span class="sh__slash">/</span><h1 class="sh__sub">' + title + '</h1>' : '') + '</div></a>' +
      '<nav class="sh__nav" aria-label="Main">' + links +
        (acts ? '<span class="sh-sep" aria-hidden="true"></span>' + acts : '') +
        '<span class="sh-sep" aria-hidden="true"></span>' +
        '<div class="sh-um hidden" id="shUser">' +
          '<button class="sh-player" id="shPlayer" type="button" aria-haspopup="true" aria-expanded="false"><span class="sh-av"><b id="shInitial" style="font-weight:400">?</b><i></i></span><span id="playerName">Player</span></button>' +
          '<div class="sh-menu" id="shMenu" role="menu">' +
            '<a role="menuitem" href="dashboard.html"' + (file === 'dashboard.html' ? ' class="on" aria-current="page"' : '') + '>Dashboard</a>' +
            '<a role="menuitem" id="navAnalytics" class="hidden' + (file === 'analytics.html' ? ' on' : '') + '" href="analytics.html">Analytics</a>' +
            '<hr><button role="menuitem" id="logoutBtn" type="button">Log out</button>' +
          '</div>' +
        '</div>' +
        '<a class="sh-link sh-link--in" id="authBtn" href="login.html">Login / Register</a>' +
      '</nav>' +
    '</div>';

  /* signed-in state: runs once the page's own scripts (supabase-config.js) have loaded */
  function hydrate() {
    if (typeof db === 'undefined' || typeof getUser !== 'function') return;
    var out = document.getElementById('logoutBtn');
    out.onclick = function () { if (typeof logout === 'function') logout(); };
    var um = document.getElementById('shUser'), pb = document.getElementById('shPlayer');
    function setOpen(o) { um.classList.toggle('sh-um--open', o); pb.setAttribute('aria-expanded', o ? 'true' : 'false'); }
    pb.onclick = function (e) { e.stopPropagation(); setOpen(!um.classList.contains('sh-um--open')); };
    document.addEventListener('click', function (e) { if (!um.contains(e.target)) setOpen(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { setOpen(false); pb.focus(); } });
    getUser().then(function (u) {
      if (!u) return;
      document.getElementById('authBtn').classList.add('hidden');
      um.classList.remove('hidden');
      if (file === 'analytics.html') document.getElementById('navAnalytics').classList.remove('hidden');
      return getProfile(u.id).then(function (p) {
        if (!p) return;
        var name = p.player_name || 'Player';
        document.getElementById('playerName').textContent = name;
        document.getElementById('shInitial').textContent = name.charAt(0).toUpperCase();
        if (p.is_admin) document.getElementById('navAnalytics').classList.remove('hidden');
      });
    }).catch(function (e) { console.error(e); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hydrate);
  else hydrate();
})();