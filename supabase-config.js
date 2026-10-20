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
  const { data } = await db.auth.getSession();
  return data.session ? data.session.user : null;
}

// Asks the Supabase server to check the token, so an expired,
// revoked or hand-edited session can't get into a protected page.
async function requireLogin() {
  document.body.style.visibility = 'hidden';
  const { data, error } = await db.auth.getUser();
  let user = data && data.user;

  if (!user && error && error.name === 'AuthRetryableFetchError') {
    // server unreachable: fall back to the local session, row level security still guards the data
    user = await getUser();
  }
  if (!user) {
    await db.auth.signOut({ scope: 'local' }).catch(() => {});
    location.replace('login.html');
    return null;
  }
  document.body.style.visibility = '';
  return user;
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