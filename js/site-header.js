
/* REMEDIATE shared site header
   - Logged-out users: no Rules button and no Login/Register button in the header.
   - The index page's PLAY NOW button becomes LOG IN / REGISTER.
   - Logged-in users are redirected from index.html straight to dashboard.html.
   - Logged-in sidebar: Dashboard, Review Lessons, Rules.
   - Account popup: Analytics (admins), Settings, Log Out.
*/
(function () {
  'use strict';

  var host = document.getElementById('siteHeader');
  if (!host) return;

  var page = (location.pathname.split('/').pop() || 'index')
    .toLowerCase().replace(/\.html$/, '');

  var isIndex = page === 'index';
  var isLogin = page === 'login';
  var isLesson = page === 'lesson';

  var css = [
    '.sh{box-sizing:border-box;position:relative;z-index:20;width:100%;padding:.75rem 1rem;border-bottom:2px solid rgba(34,211,238,.4);background:rgba(8,27,42,.96);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);font-family:"VT323",monospace}',
    '.sh.sh--sticky{position:sticky;top:0;z-index:100}',
    '.sh *,.sh *::before,.sh *::after{box-sizing:border-box}',
    '.sh__in{max-width:80rem;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.75rem}',
    '.sh__brand{flex-shrink:0;display:flex;align-items:center;gap:.75rem;color:inherit;text-decoration:none}',
    '.sh__mark{width:1.75rem;height:1.75rem;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:rgba(56,225,255,.2);border:2px solid #38e1ff;color:#38e1ff;font:.75rem/1rem "Press Start 2P",monospace;box-shadow:0 0 8px rgba(56,225,255,.6)}',
    '.sh__name{font:10px "Press Start 2P",monospace;letter-spacing:.05em;text-transform:uppercase;color:#38e1ff;filter:drop-shadow(0 0 5px rgba(56,225,255,.5))}',
    '.sh__nav{display:flex;align-items:center;justify-content:flex-end;gap:.375rem;margin-left:auto}',
    '.sh .sh-link{display:inline-flex;align-items:center;margin:0;padding:.3rem .6rem;font:1.125rem/1.5rem "VT323",monospace;color:#cbd5e1;text-transform:uppercase;text-decoration:none;cursor:pointer;background:rgba(10,13,26,.9);border:1px solid #232a4e}',
    '.sh .sh-link:hover{border-color:#38e1ff;color:#fff}',
    '.sh-um{position:relative}',
    '.sh-player{display:inline-flex;align-items:center;gap:.5rem;max-width:9.5rem;padding:.3rem .6rem;background:rgba(10,13,26,.9);border:1px solid #232a4e;color:#cbd5e1;font:1.125rem/1.5rem "VT323",monospace;cursor:pointer}',
    '.sh-player #playerName{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.sh-player::after{content:"";flex-shrink:0;margin-left:.25rem;border:4px solid transparent;border-top-color:#a594f9;border-bottom:0}',
    '.sh-player:hover{border-color:#a594f9}',
    '.sh-um--open .sh-player{border-color:#a594f9;color:#fff}',
    '.sh-av{position:relative;flex-shrink:0;width:1.25rem;height:1.25rem;display:flex;align-items:center;justify-content:center;background:#161b33;border:1px solid #a594f9;font:10px "Press Start 2P",monospace;color:#a594f9}',
    '.sh-av i{position:absolute;right:-2px;bottom:-2px;width:.375rem;height:.375rem;background:#ffd166;border:1px solid #070a14}',
    '.sh-menu{position:absolute;right:0;top:calc(100% + .375rem);min-width:13rem;max-width:calc(100vw - 2rem);padding:.25rem;background:#0a0d1a;border:1px solid #a594f9;box-shadow:0 8px 24px rgba(0,0,0,.7);display:none;z-index:30}',
    '.sh-um--open .sh-menu{display:block}',
    '.sh-menu a,.sh-menu button{display:block;width:100%;margin:0;text-align:left;padding:.35rem .6rem;font:1.125rem/1.5rem "VT323",monospace;color:#cbd5e1;text-transform:uppercase;text-decoration:none;background:none;border:0;cursor:pointer}',
    '.sh-menu a:hover,.sh-menu button:hover{background:#161b33;color:#fff}',
    '.sh-menu .on{color:#38e1ff}',
    '.sh-menu #logoutBtn:hover{color:#ff5c8a}',
    '.sh-menu hr{height:0;margin:.25rem 0;border:0;border-top:1px solid #232a4e}',

    /* Permanent left navigation */
    '.sh-sidebar{position:fixed!important;z-index:95!important;left:0!important;top:0!important;bottom:0!important;width:60px!important;height:100vh!important;height:100dvh!important;margin:0!important;padding:78px 0 16px!important;background:#081b2b!important;border-right:1px solid rgba(56,225,255,.3)!important;display:none;flex-direction:column;align-items:stretch!important;gap:8px!important;box-shadow:3px 0 16px rgba(0,0,0,.3)!important}',
    '.sh-sidebar.sh-sidebar--visible{display:flex!important}',
    '.sh-sidebar a,.sh-sidebar button{position:relative!important;display:flex!important;align-items:center!important;justify-content:center!important;width:100%!important;min-width:0!important;height:48px!important;min-height:48px!important;margin:0!important;padding:0!important;border:0!important;border-left:3px solid transparent!important;border-radius:0!important;background:transparent!important;color:#9aafbd!important;text-decoration:none!important;cursor:pointer!important;font:22px/1 "VT323",monospace!important;box-shadow:none!important}',
    '.sh-sidebar a:hover,.sh-sidebar button:hover{background:rgba(56,225,255,.12)!important;color:#38e1ff!important}',
    '.sh-sidebar a.on,.sh-sidebar button.on{background:rgba(56,225,255,.13)!important;color:#38e1ff!important;border-left-color:#38e1ff!important}',
    '.sh-sidebar a span,.sh-sidebar button span{position:absolute;left:calc(100% + 8px);top:50%;transform:translateY(-50%);display:none;white-space:nowrap;padding:5px 9px;background:#0a0d1a;border:1px solid #38e1ff;color:#e6faff;font:18px VT323,monospace;z-index:110}',
    '.sh-sidebar a:hover span,.sh-sidebar button:hover span{display:block}',
    'body.sh-has-sidebar{padding-left:60px!important}',
    '.sh .hidden{display:none!important}',
    '@media(max-width:639px){.sh-sidebar{width:54px!important}.sh-sidebar a,.sh-sidebar button{width:100%!important}body.sh-has-sidebar{padding-left:54px!important}}'
  ].join('');

  var style = document.createElement('style');
  style.id = 'remediateSharedHeaderStyles';
  style.textContent = css;
  document.head.appendChild(style);

  host.className = 'sh' + (isLesson ? ' sh--sticky' : '');

  host.innerHTML =
    '<div class="sh__in">' +
      '<a class="sh__brand" href="index.html">' +
        '<div class="sh__mark" style="width:44px;height:44px;border:none;background:transparent;padding:0;"><img src="media/R.png" alt="Remediate" style="width:100%;height:100%;object-fit:contain;display:block;"></div>' +
        '<span class="sh__name">Remediate</span>' +
      '</a>' +
      '<nav class="sh__nav" aria-label="Account">' +
        '<div class="sh-um hidden" id="shUser">' +
          '<button class="sh-player" id="shPlayer" type="button" aria-haspopup="true" aria-expanded="false">' +
            '<span class="sh-av"><b id="shInitial" style="font-weight:400">?</b><i></i></span>' +
            '<span id="playerName">Player</span>' +
          '</button>' +
          '<div class="sh-menu" id="shMenu" role="menu">' +
            '<a role="menuitem" href="analytics.html" id="navAnalytics" class="hidden">Analytics</a>' +
            '<button role="menuitem" type="button" data-panel="settings">Settings</button>' +
            '<hr>' +
            '<button role="menuitem" id="logoutBtn" type="button">Log Out</button>' +
          '</div>' +
        '</div>' +
      '</nav>' +
    '</div>' +

    '<nav class="sh-sidebar" id="shSidebar" aria-label="Main navigation">' +
      '<a href="dashboard.html" data-side="dashboard" aria-label="Dashboard">▦<span>Dashboard</span></a>' +
      '<a href="lesson.html" data-side="lesson" aria-label="Review Lessons">▤<span>Review Lessons</span></a>' +
      '<button type="button" data-panel="rules" aria-label="Rules">♧<span>Rules</span></button>' +
    '</nav>';

  var um = document.getElementById('shUser');
  var playerButton = document.getElementById('shPlayer');
  var sidebar = document.getElementById('shSidebar');

  function setOpen(open) {
    um.classList.toggle('sh-um--open', open);
    playerButton.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  playerButton.addEventListener('click', function (e) {
    e.stopPropagation();
    setOpen(!um.classList.contains('sh-um--open'));
  });

  document.addEventListener('click', function (e) {
    if (!um.contains(e.target)) setOpen(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && um.classList.contains('sh-um--open')) {
      setOpen(false);
      playerButton.focus();
    }
  });

  function openRules() {
    if (typeof openModal === 'function' && document.getElementById('rulesModal')) {
      openModal('rulesModal');
      return;
    }

    if (document.getElementById('shRulesPop')) return;

    var css = document.createElement('style');
    css.textContent =
      '.shr{position:fixed;inset:0;z-index:120;display:flex;align-items:center;justify-content:center;padding:1rem;background:rgba(0,0,0,.78);backdrop-filter:blur(4px)}' +
      '.shr__box{position:relative;width:100%;max-width:522px;max-height:90vh;overflow-y:auto;padding:36px;background:#071b29;border:2px solid #4cc3da;box-shadow:0 0 22px rgba(56,225,255,.2)}' +
      '.shr h2{margin:0 0 20px;font:14px/1.5 "Press Start 2P",monospace;color:#67e8f9}' +
      '.shr__body{font:14px/1.625 sans-serif;color:#cbd5e1}' +
      '.shr__body p{margin:0 0 16px}' +
      '.shr__body strong{color:white}' +
      '.shr__x{position:absolute;top:12px;right:14px;background:none;border:0;color:#22d3ee;font-size:22px;cursor:pointer}' +
      '.shr__ok{margin-top:20px;padding:12px 18px;background:#7ae8ff;color:#061d29;border:0;cursor:pointer;font-weight:bold}';

    if (!document.getElementById('shRulesStyle')) {
      css.id = 'shRulesStyle';
      document.head.appendChild(css);
    }

    var pop = document.createElement('div');
    pop.className = 'shr';
    pop.id = 'shRulesPop';
    pop.innerHTML =
      '<div class="shr__box" role="dialog" aria-modal="true">' +
        '<button class="shr__x" type="button" aria-label="Close">✕</button>' +
        '<h2>GAME RULES</h2>' +
        '<div class="shr__body">Loading rules...</div>' +
        '<button class="shr__ok" type="button">GOT IT</button>' +
      '</div>';

    document.body.appendChild(pop);

    var body = pop.querySelector('.shr__body');

    function close() {
      pop.remove();
      document.removeEventListener('keydown', onKey, true);
    }

    function onKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    }

    pop.querySelector('.shr__x').onclick = close;
    pop.querySelector('.shr__ok').onclick = close;
    pop.addEventListener('click', function (e) {
      if (e.target === pop) close();
    });
    document.addEventListener('keydown', onKey, true);

    fetch('index.html').then(function (r) {
      if (!r.ok) throw new Error('Could not load rules');
      return r.text();
    }).then(function (html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var source = doc.getElementById('rulesModal');
      if (!source) throw new Error('Rules not found');

      var paragraphs = Array.prototype.slice.call(source.querySelectorAll('p'));
      body.innerHTML = paragraphs.map(function (p) {
        return p.outerHTML;
      }).join('');
    }).catch(function (err) {
      console.error(err);
      body.textContent = 'The rules could not be loaded.';
    });
  }

  function openSettings() {
    if (typeof openSettingsModal === 'function') {
      openSettingsModal();
      return;
    }
    if (typeof openSettings === 'function') {
      openSettings();
      return;
    }
    if (typeof openRemediateSettings === 'function') {
      openRemediateSettings();
      return;
    }
    if (!isIndex) {
      location.href = 'index.html#settings';
    }
  }

  Array.prototype.forEach.call(host.querySelectorAll('[data-panel]'), function (button) {
    button.addEventListener('click', function () {
      setOpen(false);
      if (button.getAttribute('data-panel') === 'rules') {
        openRules();
      } else {
        openSettings();
      }
    });
  });

  if (isIndex && location.hash === '#settings') {
    window.addEventListener('load', function () {
      history.replaceState(null, '', location.pathname + location.search);
      openSettings();
    });
  }

  function setPlayerName(name) {
    var playerName = document.getElementById('playerName');
    var initial = document.getElementById('shInitial');
    if (playerName) playerName.textContent = name;
    if (initial) initial.textContent = (name || 'P').charAt(0).toUpperCase();
  }

  /* Convert the main-menu PLAY NOW action into a login/register link. */
  function configureLoggedOutMainMenu() {
    if (!isIndex) return;

    var button = document.getElementById('playNowBtn');
    if (!button) return;

    button.removeAttribute('onclick');
    button.onclick = function () {
      location.href = 'login.html';
    };

    var label = button.querySelector('span span');
    if (label) {
      label.textContent = 'LOG IN / REGISTER';
    } else {
      button.textContent = 'LOG IN / REGISTER';
    }

    var icon = button.querySelector('svg');
    if (icon) icon.style.display = 'none';

    var hint = document.getElementById('launchHint');
    if (hint) hint.textContent = 'CREATE AN ACCOUNT OR LOG IN TO CONTINUE';

    var review = document.getElementById('reviewLessonsBtn');
    if (review) review.classList.add('hidden');
  }

  function hydrate() {
    if (typeof getUser !== 'function') {
      configureLoggedOutMainMenu();
      return;
    }

    getUser().then(function (user) {
      if (!user) {
        configureLoggedOutMainMenu();
        return;
      }

      /* The main menu is not shown after login. Go straight to the dashboard. */
      if (isIndex) {
        location.replace('dashboard.html');
        return;
      }

      um.classList.remove('hidden');
      sidebar.classList.add('sh-sidebar--visible');
      document.body.classList.add('sh-has-sidebar');

      var current = sidebar.querySelector('[data-side="' + page + '"]');
      if (current) current.classList.add('on');

      var logoutButton = document.getElementById('logoutBtn');
      if (logoutButton) {
        logoutButton.addEventListener('click', function () {
          if (typeof logout === 'function') {
            logout();
          }
        });
      }

      var profilePromise = typeof getProfile === 'function'
        ? getProfile(user.id)
        : Promise.resolve(null);

      return profilePromise.then(function (profile) {
        if (profile) {
          setPlayerName(profile.player_name || 'Player');

          if (profile.is_admin) {
            var analytics = document.getElementById('navAnalytics');
            if (analytics) analytics.classList.remove('hidden');
          }
        }

        if (page === 'analytics') {
          var analyticsLink = document.getElementById('navAnalytics');
          if (analyticsLink) analyticsLink.classList.remove('hidden');
        }
      });
    }).catch(function (error) {
      console.error('Header authentication check failed:', error);
      configureLoggedOutMainMenu();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydrate);
  } else {
    hydrate();
  }
})();
