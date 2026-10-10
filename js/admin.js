import { loadData, saveData, isFirebaseReady, login, logout, onAuth, clearLocal } from './store.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const pretty = (k) => k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, '');
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  e.append(...kids.flat().filter((k) => k != null));
  return e;
}

/* ---------- What can be edited ---------- */
const SKILL_CATS = ['Programming Languages', 'Databases', 'Core CS', 'Networking', 'Web Development', 'AI & ML', 'Tools', 'Other'];
const SCHEMA = {
  profile: { type: 'object', label: 'Profile', icon: '👤', hint: 'Your name, intro, photo and headline stats.', fields: {
    name: { type: 'text', label: 'Display name (hero)' },
    fullName: { type: 'text', label: 'Full name' },
    tagline: { type: 'textarea', label: 'Hero tagline' },
    roles: { type: 'lines', label: 'Typing roles (one per line)' },
    about: { type: 'textarea', label: 'About me', rows: 6 },
    photo: { type: 'image', label: 'Profile photo' },
    status: { type: 'text', label: 'Status badge' },
    location: { type: 'text' },
    hometown: { type: 'text' },
    cv: { type: 'text', label: 'CV / Resume link (PDF URL)' },
    stats: { type: 'list', label: 'Stats', title: 'label', item: { value: { type: 'text' }, label: { type: 'text' } } },
  } },
  skills: { type: 'list', label: 'Skills', icon: '⚡', hint: 'Shown in the 3D sphere and the skill bars. Tick "Currently learning" for future skills.', title: 'name', item: {
    name: { type: 'text' },
    category: { type: 'select', options: SKILL_CATS },
    level: { type: 'range', label: 'Level (%)' },
    learning: { type: 'bool', label: 'Currently learning' },
  } },
  education: { type: 'list', label: 'Education', icon: '🎓', hint: 'Newest first. The first item also appears in the About section.', title: 'institution', item: {
    degree: { type: 'text' },
    institution: { type: 'text' },
    period: { type: 'text', label: 'Period (e.g. 2021 – 2025)' },
    result: { type: 'text', label: 'Result (e.g. GPA 5.00)' },
    location: { type: 'text' },
    details: { type: 'textarea' },
    logo: { type: 'image', label: 'Logo' },
  } },
  projects: { type: 'list', label: 'Projects', icon: '🚀', title: 'title', item: {
    title: { type: 'text' },
    summary: { type: 'textarea', label: 'Short summary (card)' },
    description: { type: 'textarea', label: 'Full description (popup)', rows: 5 },
    features: { type: 'lines', label: 'Key features (one per line)' },
    tech: { type: 'lines', label: 'Tech stack (one per line)' },
    image: { type: 'image', label: 'Screenshot' },
    github: { type: 'text', label: 'GitHub link' },
    live: { type: 'text', label: 'Live demo link' },
    featured: { type: 'bool', label: 'Featured' },
  } },
  certificates: { type: 'list', label: 'Certificates', icon: '📜', title: 'title', item: {
    title: { type: 'text' },
    issuer: { type: 'text' },
    date: { type: 'text' },
    image: { type: 'image', label: 'Certificate image' },
    link: { type: 'text', label: 'Verification / PDF link' },
  } },
  contact: { type: 'object', label: 'Contact', icon: '✉️', fields: {
    email: { type: 'text' }, phone: { type: 'text' }, showPhone: { type: 'bool', label: 'Show phone on site' },
    github: { type: 'text' }, linkedin: { type: 'text' }, facebook: { type: 'text' },
  } },
  sections: { type: 'object', label: 'Sections', icon: '🧩', hint: 'Show or hide whole sections of the site.', fields: {
    about: { type: 'bool', label: 'About' }, skills: { type: 'bool', label: 'Skills' }, education: { type: 'bool', label: 'Education' },
    projects: { type: 'bool', label: 'Projects' }, certificates: { type: 'bool', label: 'Certificates' }, contact: { type: 'bool', label: 'Contact' },
  } },
  theme: { type: 'object', label: 'Theme', icon: '🎨', hint: 'The site colour shifts from the base hue as the cursor moves. Watch this page change as you drag.', fields: {
    hueStart: { type: 'range', max: 360, label: 'Base hue' },
    hueRange: { type: 'range', max: 360, label: 'Hue shift with cursor' },
  } },
};

let data = null;
let dirty = false;

function markDirty() {
  dirty = true;
  $('#dirty').textContent = 'Unsaved changes';
  $('#save-btn').classList.add('pulse');
  updateSize();
}
function updateSize() {
  const kb = new Blob([JSON.stringify(data)]).size / 1024;
  const el = $('#size');
  el.textContent = `${kb.toFixed(0)} KB / 1000 KB`;
  el.classList.toggle('warn', isFirebaseReady && kb > 850);
  el.title = 'Firestore documents are limited to ~1 MB. Use image links instead of uploads if this gets full.';
}
function previewTheme() {
  document.documentElement.style.setProperty('--h', data.theme?.hueStart ?? 185);
}

function blank(fields) {
  const o = {};
  for (const [k, d] of Object.entries(fields)) {
    o[k] = d.type === 'bool' ? false : d.type === 'range' ? 50 : ['lines', 'list'].includes(d.type) ? []
      : d.type === 'object' ? blank(d.fields) : d.type === 'select' ? d.options[0] : '';
  }
  return o;
}

const wrap = (label, control) => h('label', { class: 'field' }, h('span', {}, label), control);

function renderField(d, obj, key) {
  const label = d.label || pretty(key);
  switch (d.type) {
    case 'list': return renderList(d, obj, key, label);
    case 'bool': {
      const inp = h('input', { type: 'checkbox' });
      inp.checked = !!obj[key];
      inp.onchange = () => { obj[key] = inp.checked; markDirty(); };
      return h('label', { class: 'field check' }, inp, h('span', {}, label));
    }
    case 'select': {
      const opts = d.options.includes(obj[key]) || !obj[key] ? d.options : [...d.options, obj[key]];
      const sel = h('select', {}, opts.map((o) => h('option', { value: o }, o)));
      sel.value = obj[key] || d.options[0];
      sel.onchange = () => { obj[key] = sel.value; markDirty(); };
      return wrap(label, sel);
    }
    case 'range': {
      const inp = h('input', { type: 'range', min: 0, max: d.max ?? 100 });
      inp.value = obj[key] ?? 0;
      const out = h('output', {}, String(inp.value));
      inp.oninput = () => { obj[key] = Number(inp.value); out.textContent = inp.value; markDirty(); if (key.startsWith('hue')) previewTheme(); };
      return wrap(label, h('div', { class: 'range' }, inp, out));
    }
    case 'lines': {
      const ta = h('textarea', { rows: d.rows ?? 4 });
      ta.value = (obj[key] || []).join('\n');
      ta.oninput = () => { obj[key] = ta.value.split('\n').map((s) => s.trim()).filter(Boolean); markDirty(); };
      return wrap(label, ta);
    }
    case 'textarea': {
      const ta = h('textarea', { rows: d.rows ?? 3 });
      ta.value = obj[key] ?? '';
      ta.oninput = () => { obj[key] = ta.value; markDirty(); };
      return wrap(label, ta);
    }
    case 'image': return renderImage(label, obj, key);
    default: {
      const inp = h('input', { type: 'text' });
      inp.value = obj[key] ?? '';
      inp.oninput = () => { obj[key] = inp.value; markDirty(); };
      return wrap(label, inp);
    }
  }
}

async function compress(file, max = 800, quality = 0.78) {
  const img = await createImageBitmap(file);
  const s = Math.min(1, max / Math.max(img.width, img.height));
  const c = h('canvas', { width: Math.round(img.width * s), height: Math.round(img.height * s) });
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', quality);
}

function renderImage(label, obj, key) {
  const prev = h('img', { class: 'img-prev', alt: '' });
  const inp = h('input', { type: 'text', placeholder: 'https://…  or  assets/photo.jpg' });
  const sync = () => {
    const v = obj[key] || '';
    inp.value = v.startsWith('data:') ? '(uploaded image)' : v;
    prev.src = v;
    prev.hidden = !v;
  };
  inp.oninput = () => { obj[key] = inp.value; prev.src = inp.value; prev.hidden = !inp.value; markDirty(); };
  const file = h('input', { type: 'file', accept: 'image/*', hidden: true });
  file.onchange = async () => {
    const f = file.files[0];
    if (!f) return;
    try {
      obj[key] = await compress(f);
      sync(); markDirty();
      toast(`Image added (${Math.round(obj[key].length / 1024)} KB)`);
    } catch { toast('Could not read that image', true); }
    file.value = '';
  };
  sync();
  return h('div', { class: 'field wide' }, h('span', {}, label),
    h('div', { class: 'img-row' }, prev, h('div', { class: 'img-ctrl' }, inp,
      h('div', { class: 'row' },
        h('button', { type: 'button', class: 'btn sm', onclick: () => file.click() }, 'Upload'),
        h('button', { type: 'button', class: 'btn sm', onclick: () => { obj[key] = ''; sync(); markDirty(); } }, 'Remove'),
        file))));
}

function renderList(d, obj, key, label) {
  if (!Array.isArray(obj[key])) obj[key] = [];
  const arr = obj[key];
  const items = h('div', { class: 'items' });
  const titleOf = (it, i) => String(it[d.title] ?? '').trim() || `Item ${i + 1}`;
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    markDirty(); draw(j);
  };
  const ctrl = (txt, title, fn, cls = '') =>
    h('button', { type: 'button', class: `icon ${cls}`, title, onclick: (e) => { e.preventDefault(); e.stopPropagation(); fn(); } }, txt);
  function draw(openIdx = -1) {
    items.replaceChildren(...arr.map((it, i) => {
      const t = h('b', {}, titleOf(it, i));
      const body = h('div', { class: 'fields' }, Object.entries(d.item).map(([k, f]) => renderField(f, it, k)));
      body.addEventListener('input', () => (t.textContent = titleOf(it, i)));
      return h('details', { class: 'item', open: i === openIdx },
        h('summary', {}, h('span', { class: 'idx' }, String(i + 1)), t,
          h('span', { class: 'ctrls' },
            ctrl('↑', 'Move up', () => move(i, -1)),
            ctrl('↓', 'Move down', () => move(i, 1)),
            ctrl('✕', 'Delete', () => { if (confirm(`Delete "${titleOf(it, i)}"?`)) { arr.splice(i, 1); markDirty(); draw(); } }, 'danger'))),
        body);
    }));
    if (!arr.length) items.append(h('p', { class: 'muted' }, 'Nothing here yet — click “+ Add”.'));
  }
  draw();
  return h('div', { class: 'list' },
    h('div', { class: 'list-head' }, h('h3', {}, label),
      h('button', { type: 'button', class: 'btn sm', onclick: () => { arr.push(blank(d.item)); markDirty(); draw(arr.length - 1); } }, '+ Add')),
    items);
}

/* ---------- Tabs ---------- */
function buildTabs() {
  const tabs = [...Object.entries(SCHEMA).map(([k, d]) => [k, `${d.icon} ${d.label}`]), ['__json', '{ } Raw JSON']];
  $('#tabs').replaceChildren(...tabs.map(([k, label]) => h('button', { 'data-k': k, onclick: () => showTab(k) }, label)));
}

function showTab(k) {
  $$('#tabs button').forEach((b) => b.classList.toggle('active', b.dataset.k === k));
  const panel = $('#panel');
  panel.replaceChildren();
  if (k === '__json') return renderJson(panel);
  const d = SCHEMA[k];
  panel.append(h('h2', {}, d.label), h('p', { class: 'hint' }, d.hint || ''));
  if (d.type === 'object') {
    if (!data[k] || typeof data[k] !== 'object') data[k] = {};
    panel.append(h('div', { class: 'fields' }, Object.entries(d.fields).map(([kk, f]) => renderField(f, data[k], kk))));
  } else {
    panel.append(renderList(d, data, k, d.label));
  }
}

function renderJson(panel) {
  const ta = h('textarea', { class: 'json-area', spellcheck: 'false' });
  ta.value = JSON.stringify(data, null, 2);
  const apply = h('button', { class: 'btn primary', onclick: () => {
    try {
      const next = JSON.parse(ta.value);
      Object.keys(data).forEach((k) => delete data[k]);
      Object.assign(data, next);
      markDirty(); previewTheme();
      toast('JSON applied — remember to Save');
    } catch (e) { toast('Invalid JSON: ' + e.message, true); }
  } }, 'Apply JSON');
  panel.append(h('h2', {}, 'Raw JSON'), h('p', { class: 'hint' }, 'Advanced: edit everything at once.'), ta, h('div', { style: 'margin-top:14px' }, apply));
}

/* ---------- Actions ---------- */
let toastTimer;
function toast(msg, err = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.toggle('err', err);
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

async function save() {
  const btn = $('#save-btn');
  btn.disabled = true;
  try {
    await saveData(data);
    dirty = false;
    $('#dirty').textContent = 'All changes saved';
    btn.classList.remove('pulse');
    toast(isFirebaseReady ? 'Saved — your site is updated! 🎉' : 'Saved in this browser (local preview)');
  } catch (e) {
    console.error(e);
    toast(e.code === 'permission-denied' ? 'Permission denied — check firestore.rules and your login email.' : 'Save failed: ' + (e.message || e), true);
  } finally {
    btn.disabled = false;
  }
}

function exportJson() {
  const a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })), download: 'data.json' });
  a.click();
  URL.revokeObjectURL(a.href);
}

async function openEditor(user) {
  $('#login-view').hidden = true;
  $('#editor-view').hidden = false;
  $('#who').textContent = user ? user.email : 'Local mode';
  $('#logout-btn').hidden = !user;
  $('#reset-btn').hidden = isFirebaseReady;
  if (!data) {
    data = await loadData();
    buildTabs();
    showTab('profile');
    updateSize();
    previewTheme();
  }
}

function showLogin() {
  $('#editor-view').hidden = true;
  $('#login-view').hidden = false;
}

$('#save-btn').onclick = save;
$('#export-btn').onclick = exportJson;
$('#import-btn').onclick = () => $('#import-file').click();
$('#import-file').onchange = async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    const next = JSON.parse(await f.text());
    Object.keys(data).forEach((k) => delete data[k]);
    Object.assign(data, next);
    markDirty(); showTab('profile'); previewTheme();
    toast('Imported — remember to Save');
  } catch { toast('That file is not valid JSON', true); }
  e.target.value = '';
};
$('#reset-btn').onclick = () => {
  if (confirm('Discard local changes and go back to content/data.json?')) { clearLocal(); dirty = false; location.reload(); }
};
$('#logout-btn').onclick = async () => { await logout(); location.reload(); };
addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's' && data) { e.preventDefault(); save(); }
});
addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('#login-btn'), err = $('#login-error');
  btn.disabled = true; err.textContent = '';
  try {
    await login($('#email').value.trim(), $('#password').value);
  } catch (ex) {
    err.textContent = /invalid|wrong|not-found|credential/i.test(ex.code || '') ? 'Wrong email or password.' : (ex.message || 'Login failed');
  } finally {
    btn.disabled = false;
  }
});

if (isFirebaseReady) {
  onAuth((user) => (user ? openEditor(user) : showLogin()));
} else {
  const b = $('#banner');
  b.hidden = false;
  b.innerHTML = '<b>Local mode:</b> Firebase is not set up yet, so changes are saved only in <i>this browser</i> (a preview). '
    + 'To enable login and live saving, add your config to <code>js/firebase-config.js</code>. '
    + 'You can also <b>Export</b> and replace <code>content/data.json</code> in the repo.';
  openEditor(null);
}
