document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);
  const goHome = () => { location.href = 'index.html'; };

  let mode = 'login';          // 'login' | 'create' | 'reset'
  let recovering = /type=recovery/.test(location.hash);

  const pw = $('account-password');
  const pwBtn = $('toggle-password-btn');
  const banner = $('form-banner');
  const bannerText = $('form-banner-text');

  // ---------- small ui helpers ----------
  const audioBtn = $('audio-toggle-btn');
  let muted = false;
  audioBtn.addEventListener('click', () => {
    muted = !muted;
    audioBtn.querySelector('span').textContent = muted ? 'MUSIC OFF' : 'MUSIC ON';
    audioBtn.classList.toggle('is-muted', muted);
  });

  pwBtn.addEventListener('click', () => {
    const showing = pw.type === 'text';
    pw.type = showing ? 'password' : 'text';
    pwBtn.textContent = showing ? '👁' : '🙈';
    pwBtn.title = showing ? 'Show password' : 'Hide password';
    pwBtn.setAttribute('aria-label', pwBtn.title);
  });

  const overlay = $('dialog-overlay');
  const closeDialog = () => overlay.classList.add('hidden');

  function openDialog({ tag, tone, title, body, actions }) {
    $('dialog-tag').textContent = tag;
    $('dialog-tag').className = 'dialog__tag tone-' + tone;
    $('dialog-title').textContent = title;
    $('dialog-body').textContent = body;
    const box = $('dialog-actions');
    box.innerHTML = '';
    actions.forEach((a) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = a.label;
      b.className = 'dialog__btn' + (a.primary ? ' dialog__btn--main' : '');
      b.addEventListener('click', () => { closeDialog(); if (a.onClick) a.onClick(); });
      box.appendChild(b);
    });
    overlay.classList.remove('hidden');
    box.querySelector('button').focus();
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDialog(); });

  let toastTimer;
  function toast(msg, ok = true) {
    const t = $('toast');
    t.textContent = (ok ? '✓ ' : '! ') + msg;
    t.className = 'toast ' + (ok ? 'toast--ok' : 'toast--bad');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.add('hidden'), 4000);
  }

  // ---------- validation: each rule returns an error message or '' ----------
  const rules = {
    email(v) {
      v = v.trim();
      if (!v) return mode === 'login'
        ? 'Email is required. Enter the email you registered with.'
        : 'Email is required. Enter the email you want to use for your account.';
      if (v.length > 50) return `Email is too long. Maximum is 50 characters, you entered ${v.length}.`;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Enter a valid email, like you@example.com.';
      return '';
    },
    password(v) {
      if (!v) return 'Password is required.';
      if (mode === 'login') return '';   // an existing account only needs to type it, format rules are for new passwords
      if (v.length < 8) return `Password must be at least 8 characters. You entered ${v.length}.`;
      if (v.length > 32) return `Password is too long. Maximum is 32 characters, you entered ${v.length}.`;
      if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) return 'Use at least one letter and one number.';
      return '';
    },
    name(v) {
      v = v.trim();
      if (!v) return 'Player name is required. Pick a handle to show on your profile.';
      if (v.length < 3) return `Player name must be at least 3 characters. You entered ${v.length}.`;
      if (v.length > 20) return `Player name is too long. Maximum is 20 characters, you entered ${v.length}.`;
      if (!/^[A-Za-z0-9_]+$/.test(v)) return 'Use only letters, numbers, and underscores (no spaces).';
      return '';
    },
    agree() {
      return $('agree-rules').checked ? '' : 'Please agree to data recording to continue.';
    }
  };

  const fields = {
    email:    { input: $('account-email'), wrap: $('email-field-wrap'),    err: $('email-error') },
    password: { input: pw,                 wrap: $('password-field-wrap'), err: $('password-error') },
    name:     { input: $('player-name'),   wrap: $('name-field-wrap'),     err: $('name-error') },
    agree:    { input: $('agree-rules'),   wrap: $('agree-rules-box'),     err: $('agree-error') }
  };

  function check(key) {
    const f = fields[key];
    const msg = rules[key](key === 'agree' ? '' : f.input.value);
    f.wrap.classList.toggle('field-error', !!msg);
    f.err.textContent = msg ? '⚠ ' + msg : '';
    f.err.classList.toggle('hidden', !msg);
    f.input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  }

  const touched = {};
  ['email', 'password', 'name'].forEach((k) => {
    fields[k].input.addEventListener('blur', () => { touched[k] = true; check(k); });
    fields[k].input.addEventListener('input', () => {
      if (touched[k]) check(k);
      banner.classList.add('hidden');
    });
  });
  fields.agree.input.addEventListener('change', () => { if (touched.agree) check('agree'); });
  fields.name.input.addEventListener('input', () => {
    $('name-count').textContent = fields.name.input.value.length + '/20';
  });

  // notice when a field hits its max length
  const MAX = { email: 50, password: 32, name: 20 };
  function limitNotice(k) {
    const full = fields[k].input.value.length >= MAX[k];
    const el = $(k + '-limit');
    el.textContent = full ? `Maximum of ${MAX[k]} characters reached.` : '';
    el.classList.toggle('hidden', !full);
    if (k === 'name') $('name-count').classList.toggle('is-full', full);
  }
  ['email', 'password', 'name'].forEach((k) => fields[k].input.addEventListener('input', () => limitNotice(k)));

  function showErr(msg, field) {
    bannerText.textContent = msg;
    banner.classList.remove('hidden');
    if (field) {
      fields[field].wrap.classList.add('field-error');
      fields[field].input.focus();
    }
  }

  // ---------- slow down repeated wrong passwords ----------
  // Only a speed bump on this page. The real rate limit lives on the Supabase server.
  const LOCK_KEY = 'remediate.lockUntil';
  const MAX_TRIES = 5;
  const LOCK_MS = 30000;
  let failedTries = 0;
  const lockLeft = () => Math.max(0, (Number(sessionStorage.getItem(LOCK_KEY)) || 0) - Date.now());
  function countFailure() {
    failedTries += 1;
    if (failedTries >= MAX_TRIES) {
      failedTries = 0;
      sessionStorage.setItem(LOCK_KEY, String(Date.now() + LOCK_MS));
    }
  }

  // ---------- modes ----------
  const COPY = {
    login:  { title: 'LOG IN TO REMEDIATE', divider: 'or log in with email',  btn: 'LOG IN',        pw: 'current-password' },
    create: { title: 'CREATE YOUR ACCOUNT', divider: 'or sign up with email', btn: 'CREATE ACCOUNT', pw: 'new-password' },
    reset:  { title: 'SET A NEW PASSWORD',  divider: '',                      btn: 'SAVE PASSWORD',  pw: 'new-password' }
  };

  function setMode(m) {
    mode = m;
    const c = COPY[m];
    const isReset = m === 'reset';

    $('tab-login').setAttribute('aria-selected', m === 'login');
    $('tab-create').setAttribute('aria-selected', m === 'create');
    $('form-title').textContent = c.title;
    $('divider-text').textContent = c.divider;
    $('start-game-btn').querySelector('span').textContent = c.btn;

    $('tabs').classList.toggle('hidden', isReset);
    $('google-signin-btn').classList.toggle('hidden', isReset);
    $('email-divider').classList.toggle('hidden', isReset);
    $('email-col').classList.toggle('hidden', isReset);
    $('account-pair').classList.toggle('pair--single', isReset);
    $('create-only').classList.toggle('hidden', m !== 'create');
    $('agree-wrap').classList.toggle('hidden', m !== 'create');
    $('forgot-password-btn').classList.toggle('hidden', m !== 'login');
    $('remember-wrap').classList.toggle('hidden', m !== 'login');
    $('options-row').classList.toggle('hidden', isReset);

    pw.setAttribute('autocomplete', c.pw);
    pw.placeholder = isReset ? 'New password' : '8+ characters';
    banner.classList.add('hidden');
    Object.values(fields).forEach((f) => {
      f.wrap.classList.remove('field-error');
      f.err.classList.add('hidden');
      f.input.setAttribute('aria-invalid', 'false');
    });
    Object.keys(touched).forEach((k) => delete touched[k]);
  }
  $('tab-login').addEventListener('click', () => setMode('login'));
  $('tab-create').addEventListener('click', () => setMode('create'));

  // ---------- google ----------
  $('google-signin-btn').addEventListener('click', async () => {
    if (mode === 'create') {
      touched.agree = true;
      if (!check('agree')) return;
    }
    setRemember(mode === 'create' ? true : $('remember-me').checked);
    const { error } = await db.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: pageUrl('index.html'),
        queryParams: { prompt: 'select_account' }
      }
    });
    if (error) toast('Google sign-in failed: ' + error.message, false);
  });

  // ---------- forgot password ----------
  $('forgot-password-btn').addEventListener('click', () => {
    touched.email = true;
    if (!check('email')) { fields.email.input.focus(); return; }
    const email = fields.email.input.value.trim().toLowerCase();
    openDialog({
      tag: 'Reset password', tone: 'warn', title: 'SEND RESET LINK?',
      body: `We will send a password reset link to ${email}.`,
      actions: [
        { label: 'Cancel' },
        { label: 'Send link', primary: true, onClick: async () => {
          const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo: pageUrl('login.html') });
          if (error) toast(error.message, false);
          else toast(`If ${email} has an account, a reset link is on its way.`);
        } }
      ]
    });
  });

  // ---------- submit ----------
  $('escape-login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    touched.email = touched.password = touched.name = touched.agree = true;

    const keys = mode === 'login' ? ['email', 'password']
               : mode === 'reset' ? ['password']
               : ['email', 'password', 'name', 'agree'];
    const results = keys.map((k) => [k, check(k)]);   // run all of them so every error shows at once
    const firstBad = results.find(([, ok]) => !ok);
    if (firstBad) {
      const n = results.filter(([, ok]) => !ok).length;
      bannerText.textContent = `${n} ${n === 1 ? 'field needs' : 'fields need'} your attention. Fix the highlighted ${n === 1 ? 'field' : 'fields'} and try again.`;
      banner.classList.remove('hidden');
      fields[firstBad[0]].input.focus();
      return;
    }
    banner.classList.add('hidden');

    if (mode === 'login' && lockLeft()) {
      showErr(`Too many failed attempts. Wait ${Math.ceil(lockLeft() / 1000)} seconds and try again.`);
      return;
    }

    const btn = $('start-game-btn');
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spin">◆</span><span>CHECKING ACCOUNT...</span>';
    const restore = () => { btn.innerHTML = original; btn.disabled = false; };

    const email = fields.email.input.value.trim().toLowerCase();

    try {
      if (mode === 'reset') {
        const { error } = await db.auth.updateUser({ password: pw.value });
        restore();
        if (error) { showErr(error.message, 'password'); return; }
        openDialog({
          tag: 'Password updated', tone: 'ok', title: 'ALL SET!',
          body: 'Your new password is saved and you are logged in.',
          actions: [{ label: 'Start playing', primary: true, onClick: goHome }]
        });
        return;
      }

      if (mode === 'login') {
        setRemember($('remember-me').checked);
        const { error } = await db.auth.signInWithPassword({ email, password: pw.value });
        restore();
        if (error) {
          if (error.status === 429) {
            showErr('Too many requests right now. Wait a minute and try again.');
          } else if (/confirm/i.test(error.message)) {
            showErr('Email not confirmed yet. Open the link we sent to your inbox, then log in.', 'email');
          } else {
            countFailure();
            showErr('Email or password is incorrect. Check both and try again, or select Forgot password? to reset it.');
            fields.password.wrap.classList.add('field-error');
            pw.value = '';
            pw.focus();
          }
          return;
        }
        failedTries = 0;
        sessionStorage.removeItem(LOCK_KEY);
        openDialog({
          tag: 'Logged in', tone: 'ok', title: 'WELCOME BACK!',
          body: 'Your progress and mistake history are loaded.',
          actions: [{ label: 'Start playing', primary: true, onClick: goHome }]
        });
        return;
      }

      // create account
      const name = fields.name.input.value.trim();
      const diff = document.querySelector('input[name="difficulty"]:checked').value;
      setRemember(true);
      const { data, error } = await db.auth.signUp({
        email,
        password: pw.value,
        options: {
          data: { player_name: name, difficulty: diff },
          emailRedirectTo: pageUrl('login.html')
        }
      });
      restore();
      if (error) { showErr(error.message, 'email'); return; }

      // supabase answers with an empty identities list when the email is already registered
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        showErr('An account with this email already exists. Select Log in, or use a different email.', 'email');
        return;
      }
      if (!data.session) {
        openDialog({
          tag: 'Check your email', tone: 'warn', title: 'CONFIRM YOUR EMAIL',
          body: `We sent a confirmation link to ${email}. Open it, then log in.`,
          actions: [{ label: 'Go to log in', primary: true, onClick: () => setMode('login') }]
        });
        return;
      }
      openDialog({
        tag: 'Account ready', tone: 'ok', title: 'WELCOME, ' + name.toUpperCase() + '!',
        body: `Your account is ready. Starting difficulty: ${diff.charAt(0) + diff.slice(1).toLowerCase()}. Your mistake history will be saved to your account.`,
        actions: [{ label: 'Start playing', primary: true, onClick: goHome }]
      });
    } catch (err) {
      restore();
      showErr('Cannot reach server. Check your internet connection and the keys in supabase-config.js.');
    }
  });

  // ---------- what the page does when it opens ----------

  // the password reset email lands here with a temporary session
  db.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') {
      recovering = true;
      setMode('reset');
    }
  });
  if (recovering) setMode('reset');

  // google (or the email link) can send the user back with an error in the url
  function urlError() {
    const found = new URLSearchParams(location.search);
    const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
    return found.get('error_description') || hash.get('error_description') || '';
  }
  const failure = urlError();
  if (failure) {
    history.replaceState(null, '', location.pathname);
    showErr(failure.replace(/\+/g, ' '));
  }

  // already signed in, no reason to show the form
  (async () => {
    if (recovering || failure) return;
    if (await getUser()) goHome();
  })();
});