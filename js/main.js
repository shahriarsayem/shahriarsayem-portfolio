import { loadData } from './store.js';
import { initHud } from './hud.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const okUrl = (u) => { u = String(u ?? '').trim(); return /^(javascript|vbscript|data:(?!image\/))/i.test(u) ? '' : u; };
const attrUrl = (u) => esc(okUrl(u));
const initials = (s = '') => s.split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 3).toUpperCase();
const empty = (msg) => `<div class="empty">${esc(msg)}</div>`;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(pointer: fine)').matches;

const svg = (body, fill = false) =>
  `<svg viewBox="0 0 24 24" ${fill ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"'}>${body}</svg>`;
const ICON = {
  github: svg('<path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.4-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"/>', true),
  linkedin: svg('<path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z"/>', true),
  facebook: svg('<path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.62 23.1 24 18.1 24 12.07Z"/>', true),
  mail: svg('<rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="m3 6 9 7 9-7"/>'),
  pin: svg('<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>'),
  home: svg('<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z"/>'),
  cap: svg('<path d="M2 9 12 4l10 5-10 5Z"/><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/>'),
  arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  ext: svg('<path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>'),
  check: svg('<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>'),
  award: svg('<circle cx="12" cy="9" r="6"/><path d="m8.5 14-1.5 7 5-3 5 3-1.5-7"/>'),
  phone: svg('<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2Z"/>'),
};

let scene = null;
let hue = 185;

/* ================= Render ================= */
function socials(c) {
  return [
    c.github && ['github', c.github, 'GitHub'],
    c.linkedin && ['linkedin', c.linkedin, 'LinkedIn'],
    c.facebook && ['facebook', c.facebook, 'Facebook'],
    c.email && ['mail', `mailto:${c.email}`, 'Email'],
  ].filter(Boolean).map(([i, href, label]) =>
    `<a href="${attrUrl(href)}" target="_blank" rel="noopener" aria-label="${label}" class="magnetic">${ICON[i]}</a>`).join('');
}

function initialsImage(name) {
  return 'data:image/svg+xml,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0d1430"/><stop offset="1" stop-color="#1a1240"/></linearGradient></defs><rect width="400" height="500" fill="url(#g)"/><text x="50%" y="56%" font-size="140" font-family="Arial" font-weight="700" text-anchor="middle" fill="#38e8ff">${esc(initials(name))}</text></svg>`);
}

function render(d) {
  const p = d.profile || {}, c = d.contact || {};
  document.title = `${p.fullName || p.name} — Portfolio`;

  Object.entries(d.sections || {}).forEach(([k, on]) => {
    if (!on) { $('#' + k)?.remove(); $(`#nav-links a[href="#${k}"]`)?.remove(); }
  });
  $$('.sec-tag').forEach((t, i) => (t.dataset.n = String(i + 1).padStart(2, '0')));

  // Hero
  const status = $('#status');
  if (p.status) status.innerHTML = `<i></i>${esc(p.status)}`; else status.remove();
  const words = String(p.name || '').split(/\s+/).filter(Boolean);
  $('#hero-name').innerHTML = words.map((w, i) =>
    `<span class="word${i === words.length - 1 ? ' grad' : ''}">${[...w].map((ch) => `<span class="char">${esc(ch)}</span>`).join('')}</span>`).join(' ');
  $('#hero-lead').textContent = p.tagline || '';
  typing($('#typing'), p.roles || []);
  if (okUrl(p.cv)) { const b = $('#cv-btn'); b.href = okUrl(p.cv); b.hidden = false; }
  $('#hero-socials').innerHTML = socials(c);
  const photo = $('#photo');
  photo.alt = p.fullName || p.name || '';
  photo.onerror = () => { photo.onerror = null; photo.src = initialsImage(p.name); };
  photo.src = okUrl(p.photo) || initialsImage(p.name);

  // About
  if ($('#about')) {
    $('#about-text').innerHTML = esc(p.about).replace(/\n/g, '<br><br>');
    const edu0 = (d.education || [])[0];
    $('#about-info').innerHTML = [
      p.location && [ICON.pin, `Lives in ${p.location}`],
      p.hometown && [ICON.home, `From ${p.hometown}`],
      edu0 && [ICON.cap, `${edu0.degree} · ${edu0.institution}`],
      c.email && [ICON.mail, c.email],
    ].filter(Boolean).map(([i, t]) => `<li>${i}<span>${esc(t)}</span></li>`).join('');
    $('#stats').innerHTML = (p.stats || []).map((s) =>
      `<div class="card stat tilt"><div class="num">${esc(s.value)}</div><div class="lbl">${esc(s.label)}</div></div>`).join('');
  }

  // Skills
  if ($('#skills')) {
    const skills = d.skills || [];
    tagSphere($('#sphere'), skills);
    const groups = {};
    skills.forEach((s) => (groups[s.category || 'Other'] ??= []).push(s));
    $('#skill-groups').innerHTML = Object.entries(groups).map(([g, list]) => `<div class="card skill-group tilt"><h3>${esc(g)}</h3>${list.map((s) => {
      const lvl = Math.min(100, Math.max(0, Number(s.level) || 0));
      return `<div class="skill-row"><div class="skill-top"><span>${esc(s.name)}${s.learning ? '<em>learning</em>' : ''}</span><span>${lvl}%</span></div><div class="bar"><i data-w="${lvl}"></i></div></div>`;
    }).join('')}</div>`).join('') || empty('Skills coming soon.');
  }

  // Education
  if ($('#education')) {
    $('#timeline').innerHTML = (d.education || []).map((e) => `
      <div class="t-item reveal"><span class="t-dot"></span><div class="card tilt">
        <div class="t-head">
          ${okUrl(e.logo) ? `<img class="t-logo" src="${attrUrl(e.logo)}" alt="">` : `<span class="t-logo">${ICON.cap}</span>`}
          <div><span class="period">${esc(e.period)}</span><h3>${esc(e.degree)}</h3><p class="inst">${esc(e.institution)}${e.location ? ` · ${esc(e.location)}` : ''}</p></div>
          ${e.result ? `<span class="result">${esc(e.result)}</span>` : ''}
        </div>
        ${e.details ? `<p class="t-details">${esc(e.details)}</p>` : ''}
      </div></div>`).join('') || empty('Education details coming soon.');
  }

  // Projects
  if ($('#projects')) {
    const projects = d.projects || [];
    $('#projects-grid').innerHTML = projects.map((pr, i) => `
      <article class="card project tilt" data-i="${i}" data-cursor="View" tabindex="0">
        <div class="p-cover">${okUrl(pr.image) ? `<img src="${attrUrl(pr.image)}" alt="" loading="lazy">` : `<div class="p-art"><span>${esc(initials(pr.title))}</span></div>`}
          ${pr.featured ? '<span class="p-flag">★ Featured</span>' : ''}</div>
        <div class="p-body"><h3>${esc(pr.title)}</h3><p>${esc(pr.summary)}</p>
          <div class="chips">${(pr.tech || []).map((t) => `<span class="chip">${esc(t)}</span>`).join('')}</div>
          <span class="p-more">View details ${ICON.arrow}</span></div>
      </article>`).join('') || empty('Projects coming soon.');
    $$('.project').forEach((el) => {
      const open = () => openProject(projects[el.dataset.i]);
      el.addEventListener('click', open);
      el.addEventListener('keydown', (e) => e.key === 'Enter' && open());
    });
  }

  // Certificates
  if ($('#certificates')) {
    const certs = d.certificates || [];
    $('#certs-grid').innerHTML = certs.map((ce, i) => `
      <article class="card cert tilt" data-i="${i}" data-cursor="Open" tabindex="0">
        <div class="c-img">${okUrl(ce.image) ? `<img src="${attrUrl(ce.image)}" alt="" loading="lazy">` : ICON.award}</div>
        <h3>${esc(ce.title)}</h3><p>${esc(ce.issuer)}${ce.date ? ` · ${esc(ce.date)}` : ''}</p>
      </article>`).join('') || empty('Certificates will appear here soon.');
    $$('.cert').forEach((el) => {
      const open = () => openCert(certs[el.dataset.i]);
      el.addEventListener('click', open);
      el.addEventListener('keydown', (e) => e.key === 'Enter' && open());
    });
  }

  // Contact
  if ($('#contact')) {
    $('#contact-card').innerHTML = `
      <span class="sec-tag" data-n="${String($$('.sec-tag').length + 1).padStart(2, '0')}">Contact</span>
      <h2>Let's build something <span class="grad">great together</span>.</h2>
      <p class="sec-sub">I'm open to internships, collaborations and interesting projects. My inbox is always open.</p>
      ${c.email ? `<div class="mail-row"><a class="mail-big" href="mailto:${attrUrl(c.email)}">${esc(c.email)}</a><button class="copy-btn" id="copy-btn">Copy</button></div>` : ''}
      ${c.showPhone && c.phone ? `<p class="phone">${esc(c.phone)}</p>` : ''}
      <div class="socials">${socials(c)}</div>`;
    $('#copy-btn')?.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(c.email); toast('Email copied ✓'); } catch { toast(c.email); }
    });
  }

  $('#year').textContent = new Date().getFullYear();
  $('#foot-name').textContent = p.fullName || p.name || '';
}

function typing(el, words) {
  if (!words.length) return;
  let w = 0, c = 0, del = false;
  (function tick() {
    const word = words[w];
    c += del ? -1 : 1;
    el.innerHTML = `<b>${esc(word.slice(0, c))}</b><span class="caret"></span>`;
    let t = del ? 35 : 80;
    if (!del && c >= word.length) { del = true; t = 1700; }
    else if (del && c <= 0) { del = false; w = (w + 1) % words.length; t = 350; }
    setTimeout(tick, t);
  })();
}

function tagSphere(el, items) {
  el.innerHTML = items.map((s) => `<span class="${s.learning ? 'learn' : ''}">${esc(s.name)}</span>`).join('');
  const tags = [...el.children], n = tags.length;
  if (!n) return;
  const pts = tags.map((_, i) => {
    const phi = Math.acos(-1 + (2 * i + 1) / n), th = Math.sqrt(n * Math.PI) * phi;
    return [Math.cos(th) * Math.sin(phi), Math.sin(th) * Math.sin(phi), Math.cos(phi)];
  });
  let R = el.clientWidth * 0.38, visible = true;
  new ResizeObserver(() => (R = el.clientWidth * 0.38)).observe(el);
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(el);
  let vx = 0.003, vy = 0.004, tx = vx, ty = vy;
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    ty = ((e.clientX - r.left) / r.width - 0.5) * 0.035;
    tx = -((e.clientY - r.top) / r.height - 0.5) * 0.035;
  });
  el.addEventListener('pointerleave', () => { tx = 0.003; ty = 0.004; });
  (function step() {
    if (visible) {
      vx += (tx - vx) * 0.05; vy += (ty - vy) * 0.05;
      const cx = Math.cos(vx), sx = Math.sin(vx), cy = Math.cos(vy), sy = Math.sin(vy);
      pts.forEach((p, i) => {
        const [x, y, z] = p;
        const y1 = y * cx - z * sx, z1 = y * sx + z * cx;
        const x2 = x * cy + z1 * sy, z2 = -x * sy + z1 * cy;
        p[0] = x2; p[1] = y1; p[2] = z2;
        const s = (z2 + 2) / 3;
        const st = tags[i].style;
        st.transform = `translate(-50%,-50%) translate3d(${(x2 * R).toFixed(1)}px,${(y1 * R).toFixed(1)}px,0) scale(${s.toFixed(3)})`;
        st.opacity = (0.25 + 0.75 * (z2 + 1) / 2).toFixed(3);
        st.zIndex = Math.round(s * 100);
      });
    }
    requestAnimationFrame(step);
  })();
}

/* ================= Modal & toast ================= */
function openModal(html) {
  $('#modal-content').innerHTML = html;
  $('#modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  $('#modal').classList.remove('open');
  document.body.style.overflow = '';
}
function openProject(p) {
  const links = [
    okUrl(p.github) && `<a class="btn btn-primary" href="${attrUrl(p.github)}" target="_blank" rel="noopener">${ICON.github} Source code</a>`,
    okUrl(p.live) && `<a class="btn btn-ghost" href="${attrUrl(p.live)}" target="_blank" rel="noopener">${ICON.ext} Live demo</a>`,
  ].filter(Boolean).join('');
  openModal(`
    ${okUrl(p.image) ? `<img class="m-img" src="${attrUrl(p.image)}" alt="">` : ''}
    <div class="m-body"><span class="sec-tag">Project</span><h3>${esc(p.title)}</h3><p>${esc(p.description || p.summary)}</p>
      ${p.features?.length ? `<h4>Key features</h4><ul class="checks">${p.features.map((f) => `<li>${ICON.check}${esc(f)}</li>`).join('')}</ul>` : ''}
      ${p.tech?.length ? `<h4>Tech stack</h4><div class="chips">${p.tech.map((t) => `<span class="chip">${esc(t)}</span>`).join('')}</div>` : ''}
      ${links ? `<div class="m-actions">${links}</div>` : ''}</div>`);
}
function openCert(c) {
  openModal(`
    ${okUrl(c.image) ? `<img class="m-img" src="${attrUrl(c.image)}" alt="">` : ''}
    <div class="m-body"><span class="sec-tag">Certificate</span><h3>${esc(c.title)}</h3><p>${esc(c.issuer)}${c.date ? ` · ${esc(c.date)}` : ''}</p>
      ${okUrl(c.link) ? `<div class="m-actions"><a class="btn btn-primary" href="${attrUrl(c.link)}" target="_blank" rel="noopener">${ICON.ext} Verify / view</a></div>` : ''}</div>`);
}
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ================= Interactions ================= */
function setupInteractions(d) {
  const root = document.documentElement;
  const start = Number(d.theme?.hueStart ?? 185), range = Number(d.theme?.hueRange ?? 150);
  hue = start;
  root.style.setProperty('--h', hue);

  // Cursor + color that follows the pointer
  const dot = $('.cursor-dot'), ring = $('.cursor-ring'), spot = $('#spotlight');
  let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my, lastHue = -1;
  if (fine) document.body.classList.add('has-cursor');
  addEventListener('pointermove', (e) => {
    mx = e.clientX; my = e.clientY;
    spot.style.setProperty('--mx', mx + 'px');
    spot.style.setProperty('--my', my + 'px');
    scene?.setPointer((mx / innerWidth) * 2 - 1, -((my / innerHeight) * 2 - 1));
  }, { passive: true });
  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest?.('a, button, [data-cursor], .card, .sphere span, input, textarea');
    const label = t?.dataset.cursor || '';
    ring.classList.toggle('hover', !!t);
    ring.classList.toggle('label', !!label);
    ring.firstElementChild.textContent = label;
  });
  addEventListener('pointerdown', (e) => {
    ring.classList.add('down');
    if (reduced) return;
    const r = document.createElement('span');
    r.className = 'ripple';
    r.style.left = e.clientX + 'px';
    r.style.top = e.clientY + 'px';
    document.body.append(r);
    setTimeout(() => r.remove(), 700);
  });
  addEventListener('pointerup', () => ring.classList.remove('down'));

  (function frame(t) {
    rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
    if (fine) {
      dot.style.transform = `translate3d(${mx}px,${my}px,0) translate(-50%,-50%)`;
      ring.style.transform = `translate3d(${rx}px,${ry}px,0)`;
    }
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    // Hue stays within [start, start + range]: mostly cursor X, some cursor Y and scroll depth
    const clamp01 = (v) => Math.min(1, Math.max(0, v));
    const mix = 0.55 * clamp01(mx / innerWidth) + 0.25 * clamp01(my / innerHeight) + 0.2 * clamp01(scrollY / maxScroll);
    const target = start + mix * range + Math.sin((t || 0) / 2500) * 4;
    hue += (target - hue) * 0.06;
    if (Math.abs(hue - lastHue) > 0.4) {
      root.style.setProperty('--h', hue.toFixed(1));
      scene?.setHue(hue);
      lastHue = hue;
    }
    requestAnimationFrame(frame);
  })();

  // Card glare + 3D tilt
  let tilted = null;
  document.addEventListener('pointermove', (e) => {
    const card = e.target.closest?.('.card');
    if (tilted && tilted !== card) { tilted.style.transform = ''; tilted.classList.remove('tilting'); }
    tilted = card;
    if (!card) return;
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    card.style.setProperty('--gx', x * 100 + '%');
    card.style.setProperty('--gy', y * 100 + '%');
    if (fine && !reduced && card.classList.contains('tilt')) {
      card.classList.add('tilting');
      card.style.transform = `perspective(1000px) rotateX(${(0.5 - y) * 7}deg) rotateY(${(x - 0.5) * 9}deg) translateY(-4px)`;
    }
  }, { passive: true });

  // Magnetic buttons
  if (fine && !reduced) {
    $$('.magnetic').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.3}px, ${(e.clientY - r.top - r.height / 2) * 0.4}px)`;
      });
      el.addEventListener('pointerleave', () => (el.style.transform = ''));
    });
  }

  // Scroll reveal
  $$('.stagger').forEach((g) => [...g.children].forEach((c, i) => { c.classList.add('reveal'); c.style.setProperty('--d', i * 0.09 + 's'); }));
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (!en.isIntersecting) return;
    en.target.classList.add('in');
    en.target.querySelectorAll('.bar i').forEach((b) => (b.style.width = b.dataset.w + '%'));
    io.unobserve(en.target);
  }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach((el) => io.observe(el));

  // Nav: scrolled state, progress, active link, mobile menu
  const nav = $('#nav'), progress = $('#progress');
  const onScroll = () => {
    nav.classList.toggle('scrolled', scrollY > 30);
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.setProperty('--p', max > 0 ? scrollY / max : 0);
    scene?.setScroll(scrollY);
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  const secIO = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) $$('#nav-links a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  $$('main section, #home').forEach((s) => secIO.observe(s));
  $('#menu-btn').addEventListener('click', () => nav.classList.toggle('open'));
  $$('#nav-links a').forEach((a) => a.addEventListener('click', () => nav.classList.remove('open')));

  // Modal close
  $('#modal-close').addEventListener('click', closeModal);
  $('#modal').addEventListener('click', (e) => e.target.id === 'modal' && closeModal());
  addEventListener('keydown', (e) => e.key === 'Escape' && closeModal());
}

/* ================= Boot ================= */
try {
  const data = await loadData();
  render(data);
  initHud(data, { fine, reduced });
  setupInteractions(data);
} catch (err) {
  console.error(err);
  document.body.insertAdjacentHTML('beforeend', '<p style="position:fixed;inset:auto 0 40px;text-align:center">Could not load portfolio content.</p>');
}

import('./scene.js')
  .then((m) => {
    scene = m.initScene($('#scene'), { reduced });
    scene?.setHue(hue);
    scene?.setScroll(scrollY);
  })
  .catch((e) => console.warn('3D scene disabled:', e));

setTimeout(() => {
  $('#loader').classList.add('done');
  document.body.classList.add('loaded');
}, 700);
