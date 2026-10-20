const SUPABASE_URL = 'https://qvrhufogwyvgbwbdxtal.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_cXTah0HuNBWRl9hKr3_ntQ_TKeSwgjP';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function getUser() {
  const { data } = await db.auth.getSession();
  return data.session ? data.session.user : null;
}
async function requireLogin() {
  const u = await getUser();
  if (!u) { location.href = 'login.html'; return null; }
  return u;
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