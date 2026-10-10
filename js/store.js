import { firebaseConfig } from './firebase-config.js';

const CDN = 'https://www.gstatic.com/firebasejs/10.12.2';
const LOCAL_KEY = 'portfolio-local-data';

export const isFirebaseReady = Boolean(firebaseConfig && firebaseConfig.apiKey);

let fbPromise;
function fb() {
  fbPromise ??= (async () => {
    const [appM, fsM, authM] = await Promise.all([
      import(`${CDN}/firebase-app.js`),
      import(`${CDN}/firebase-firestore.js`),
      import(`${CDN}/firebase-auth.js`),
    ]);
    const app = appM.initializeApp(firebaseConfig);
    const db = fsM.getFirestore(app);
    return { fsM, authM, db, auth: authM.getAuth(app), ref: fsM.doc(db, 'portfolio', 'content') };
  })();
  return fbPromise;
}

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
function merge(def, saved) {
  if (isObj(def) && isObj(saved)) {
    const out = { ...def };
    for (const k of Object.keys(saved)) out[k] = merge(def[k], saved[k]);
    return out;
  }
  return saved === undefined ? def : saved;
}

export async function loadData() {
  const res = await fetch('content/data.json', { cache: 'no-cache' });
  const defaults = await res.json();
  let saved = null;
  try {
    if (isFirebaseReady) {
      const { fsM, ref } = await fb();
      const snap = await fsM.getDoc(ref);
      if (snap.exists()) saved = JSON.parse(snap.data().json);
    } else {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (raw) saved = JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Using default content:', err);
  }
  return saved ? merge(defaults, saved) : defaults;
}

export async function saveData(data) {
  const json = JSON.stringify(data);
  if (!isFirebaseReady) return localStorage.setItem(LOCAL_KEY, json);
  const { fsM, ref } = await fb();
  await fsM.setDoc(ref, { json, updatedAt: fsM.serverTimestamp() });
}

export const clearLocal = () => localStorage.removeItem(LOCAL_KEY);

export async function login(email, password) {
  const { authM, auth } = await fb();
  return authM.signInWithEmailAndPassword(auth, email, password);
}

export async function logout() {
  const { authM, auth } = await fb();
  return authM.signOut(auth);
}

export async function onAuth(cb) {
  const { authM, auth } = await fb();
  return authM.onAuthStateChanged(auth, cb);
}
