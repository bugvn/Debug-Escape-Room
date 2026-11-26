// supabase-js (detectSessionInUrl) removes the #hash from the address bar while it
// reads it. Save the original first, so pages can still tell "password recovery"
// or an auth error apart. Read INITIAL_HASH, not location.hash.
const INITIAL_HASH = location.hash;

const SUPABASE_URL = 'https://qvrhufogwyvgbwbdxtal.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_cXTah0HuNBWRl9hKr3_ntQ_TKeSwgjP';

// "Remember me" picks where the session is kept:
// localStorage survives a browser restart, sessionStorage dies with the tab.
const REMEMBER_KEY = 'remediate.remember';

function sessionStore() {
  return localStorage.getItem(REMEMBER_KEY) === 'no' ? sessionStorage : localStorage;
}

// supabase-js reads and writes the session through this object
const authStorage = {
  getItem: (key) => sessionStore().getItem(key),
  setItem: (key, value) => sessionStore().setItem(key, value),
  removeItem: (key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
};

function setRemember(on) {
  const before = sessionStore();
  localStorage.setItem(REMEMBER_KEY, on ? 'yes' : 'no');
  if (before !== sessionStore()) {
    // don't leave an old session behind in the store we stopped using
    Object.keys(before)
      .filter((k) => k.startsWith('sb-'))
      .forEach((k) => before.removeItem(k));
  }
}

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: authStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Build an absolute url next to the current page. Works on localhost,
// a custom domain and a subfolder host like github.io/repo/.
function pageUrl(name) {
  return new URL(name, location.href).href;
}

// Quick local read, fine for showing/hiding UI. Not trusted for access control.
async function getUser() {
  try {
    const { data, error } = await db.auth.getSession();
    if (error) throw error;
    return data.session ? data.session.user : null;
  } catch (e) {
    console.error(e);
    return null;
  }
}

// Asks the Supabase server to check the token, so an expired,
// revoked or hand-edited session can't get into a protected page.
async function requireLogin() {
  document.body.style.visibility = 'hidden';
  let user = null;
  try {
    const { data, error } = await db.auth.getUser();
    user = data && data.user;

    if (!user && error && error.name === 'AuthRetryableFetchError') {
      // server unreachable: fall back to the local session, row level security still guards the data
      user = await getUser();
    }
  } catch (e) {
    console.error(e);
    // server unreachable: fall back to the local session instead of hiding the page forever
    user = await getUser();
  }
  if (!user) {
    await db.auth.signOut({ scope: 'local' }).catch(() => {});
    location.replace('login.html');
    return null;
  }
  document.body.style.visibility = '';

  // research consent: also catches Google sign-ins, which skip the sign-up checkbox
  let agreed = true;
  try { agreed = await consentGate(user); } catch (e) { console.error(e); }
  if (!agreed) { await logout(); return null; }
  return user;
}

// Full-screen dialog shown until the player agrees to data recording.
// Resolves true (agreed and saved) or false (declined).
async function consentGate(user) {
  const { data: p, error } = await db.from('profiles').select('consented_at').eq('id', user.id).maybeSingle();
  if (error || !p || p.consented_at) return true;   // offline or no profile row: don't lock the player out
  return new Promise((resolve) => {
    const o = document.createElement('div');
    o.setAttribute('role', 'dialog');
    o.setAttribute('aria-modal', 'true');
    o.setAttribute('aria-labelledby', 'consent-title');
    o.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;background:#020d1a;color:#e2e8f0;font-family:system-ui,sans-serif';
    o.innerHTML = '<div style="max-width:440px;width:100%;border:2px solid #7ae8ff;background:#081b2b;padding:24px;box-shadow:0 0 28px rgba(122,232,255,.25)">'
      + '<h2 id="consent-title" style="font:14px/1.6 \'Press Start 2P\',monospace;color:#7ae8ff;margin:0 0 16px">BEFORE YOU PLAY</h2>'
      + '<p style="line-height:1.6;margin:0 0 12px">Remediate records your gameplay for a research study: your code attempts, hints used, time spent and results.</p>'
      + '<p id="consent-err" style="color:#fca5a5;margin:0 0 12px;display:none"></p>'
      + '<div style="display:flex;gap:12px;justify-content:flex-end;flex-wrap:wrap">'
      + '<button id="consent-no" type="button" style="padding:10px 16px;background:transparent;color:#bfefff;border:2px solid rgba(122,232,255,.4);cursor:pointer">No, log out</button>'
      + '<button id="consent-yes" type="button" style="padding:10px 16px;background:#7ae8ff;color:#061d29;border:0;font-weight:700;cursor:pointer">I agree</button>'
      + '</div></div>';
    document.documentElement.appendChild(o);
    const yes = o.querySelector('#consent-yes'), no = o.querySelector('#consent-no'), err = o.querySelector('#consent-err');
    yes.focus();
    no.onclick = () => { o.remove(); resolve(false); };
    yes.onclick = async () => {
      yes.disabled = true;
      const { error: e } = await db.from('profiles').update({ consented_at: new Date().toISOString() }).eq('id', user.id);
      if (e) { yes.disabled = false; err.textContent = 'Could not save your answer. Check your connection and try again.'; err.style.display = 'block'; return; }
      o.remove(); resolve(true);
    };
  });
}

async function getProfile(uid) {
  const { data } = await db.from('profiles').select('*').eq('id', uid).maybeSingle();
  return data;
}

async function logout() {
  await db.auth.signOut();
  sessionStorage.removeItem('lastSessionId');
  location.href = 'index.html';
}