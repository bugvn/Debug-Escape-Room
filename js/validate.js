// LOGIN / SIGN-UP FIELD RULES. Pure functions (no page code) so node --test can check them.
// Each rule returns an error message, or '' when the value is fine. Moved unchanged out of js/login.js.
// mode = 'login' | 'create' | 'reset'

function validateEmail(v, mode) {
  v = String(v == null ? '' : v).trim();
  if (!v) return mode === 'login'
    ? 'Email is required. Enter the email you registered with.'
    : 'Email is required. Enter the email you want to use for your account.';
  if (v.length > 50) return `Email is too long. Maximum is 50 characters, you entered ${v.length}.`;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Enter a valid email, like you@example.com.';
  return '';
}

function validatePassword(v, mode) {
  v = v == null ? '' : String(v);
  if (!v) return 'Password is required.';
  if (mode === 'login') return '';   // an existing account only needs to type it, format rules are for new passwords
  if (v.length < 8) return `Password must be at least 8 characters. You entered ${v.length}.`;
  if (v.length > 32) return `Password is too long. Maximum is 32 characters, you entered ${v.length}.`;
  if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) return 'Use at least one letter and one number.';
  return '';
}

function validateName(v) {
  v = String(v == null ? '' : v).trim();
  if (!v) return 'Player name is required. Pick a handle to show on your profile.';
  if (v.length < 3) return `Player name must be at least 3 characters. You entered ${v.length}.`;
  if (v.length > 20) return `Player name is too long. Maximum is 20 characters, you entered ${v.length}.`;
  if (!/^[A-Za-z0-9_]+$/.test(v)) return 'Use only letters, numbers, and underscores (no spaces).';
  return '';
}

if (typeof module !== 'undefined') module.exports = { validateEmail, validatePassword, validateName };