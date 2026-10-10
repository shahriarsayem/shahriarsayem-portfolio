// Admin login for local mode (when Firebase is not configured).
// Only a salted PBKDF2-SHA256 hash is stored here — the real password never appears in the code.
//
// Note: GitHub Pages is a static host, so this gate protects the admin UI. In local mode the
// panel can only change data inside the visitor's own browser, so the live site stays safe.
// Once Firebase is set up, real server-side protection comes from Firebase Auth + firestore.rules.
//
// To change the password: compute a new hash with derive(username, newPassword, newSalt)
// in the browser console and replace salt/hash below.
export const ADMIN = {
  username: 'sayem',
  email: 'sayemshahriar187@gmail.com', // used for Firebase login when a username is entered
  salt: 'f19c5e4e5b18fc0838d6a939ff0f79ec',
  iterations: 250000,
  hash: '8ac3b1794ea399fa007894a6bb8f7815d5ef3ce15dc1ce7b52d9407f3836d815',
};

const SESSION_KEY = 'admin-session';
const LOCK_KEY = 'admin-lock';
const MAX_TRIES = 5;
const LOCK_MS = 60 * 1000;
const SESSION_MS = 2 * 60 * 60 * 1000;

const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

export async function derive(username, password, salt = ADMIN.salt, iterations = ADMIN.iterations) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(`${username.toLowerCase()}:${salt}`), iterations }, key, 256);
  return hex(bits);
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const readLock = () => { try { return JSON.parse(localStorage.getItem(LOCK_KEY)) || { n: 0 }; } catch { return { n: 0 }; } };

export function lockedFor() {
  const s = readLock();
  return s.until && s.until > Date.now() ? s.until - Date.now() : 0;
}

function recordFailure() {
  const s = readLock();
  s.n = (s.n || 0) + 1;
  if (s.n >= MAX_TRIES) { s.until = Date.now() + LOCK_MS; s.n = 0; }
  localStorage.setItem(LOCK_KEY, JSON.stringify(s));
}

export async function verifyLocal(username, password) {
  if (lockedFor()) return false;
  const user = username.trim().toLowerCase();
  const ok = user === ADMIN.username && safeEqual(await derive(user, password), ADMIN.hash);
  if (ok) {
    localStorage.removeItem(LOCK_KEY);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ u: ADMIN.username, exp: Date.now() + SESSION_MS }));
  } else {
    recordFailure();
  }
  return ok;
}

export function hasLocalSession() {
  try {
    const s = JSON.parse(sessionStorage.getItem(SESSION_KEY));
    return Boolean(s && s.exp > Date.now());
  } catch { return false; }
}

export const endLocalSession = () => sessionStorage.removeItem(SESSION_KEY);
