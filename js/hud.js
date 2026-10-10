// JARVIS-style HUD: rotating ring text, live readouts, and holographic
// programming-concept panels orbiting the profile photo in 3D.

const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function panel(title, meta, body) {
  const el = document.createElement('div');
  el.className = 'node';
  el.innerHTML = `<div class="n-title"><span>${title}</span><em>${meta}</em></div>${body}`;
  return el;
}

/* ---------- Widgets (each returns { el, tick, core }) ---------- */
function arrayWidget() {
  const el = panel('Array', 'len <b class="len">5</b>', '<div class="arr"></div><div class="n-op">int arr[] = {...}</div>');
  const box = el.querySelector('.arr'), op = el.querySelector('.n-op'), len = el.querySelector('.len');
  const a = [3, 7, 1, 9, 4];
  const render = (idx = -1, cls = '') => {
    box.innerHTML = a.map((v, i) => `<span class="${i === idx ? cls : ''}">${v}<i>${i}</i></span>`).join('');
    len.textContent = a.length;
  };
  render();
  return {
    el, core: true,
    tick() {
      const r = Math.random();
      if (a.length <= 3 || (a.length < 7 && r < 0.4)) {
        const v = rnd(1, 9); a.push(v); render(a.length - 1, 'new'); op.textContent = `arr.push(${v})`;
      } else if (a.length >= 7 || r < 0.65) {
        const v = a.pop(); render(); op.textContent = `arr.pop() → ${v}`;
      } else if (r < 0.85) {
        const i = rnd(0, a.length - 1), v = rnd(1, 9); a[i] = v; render(i, 'hit'); op.textContent = `arr[${i}] = ${v}`;
      } else {
        const v = pick(a), i = a.indexOf(v); render(i, 'hit'); op.textContent = `find(${v}) → idx ${i}`;
      }
    },
  };
}

function stackWidget() {
  const el = panel('Stack', 'LIFO', '<div class="stk"></div><div class="n-op">stack&lt;int&gt; s;</div>');
  const box = el.querySelector('.stk'), op = el.querySelector('.n-op');
  const s = [12, 5, 8];
  const render = (pushed) => {
    box.innerHTML = s.map((v, i) => `<span class="${pushed && i === s.length - 1 ? 'new' : ''}">${v}</span>`).join('');
  };
  render();
  return {
    el, core: true,
    tick() {
      if (s.length <= 1 || (s.length < 5 && Math.random() < 0.55)) {
        const v = rnd(1, 30); s.push(v); render(true); op.textContent = `s.push(${v})`;
      } else {
        const v = s.pop(); render(); op.textContent = `s.pop() → ${v}`;
      }
    },
  };
}

function linkedListWidget() {
  const el = panel('Linked List', 'singly', '<div class="ll"></div><div class="n-op">Node* head;</div>');
  const box = el.querySelector('.ll'), op = el.querySelector('.n-op');
  const l = [3, 8, 5];
  const render = (idx = -1) => {
    box.innerHTML = l.map((v, i) => `<span class="${i === idx ? 'new' : ''}">${v}</span>`).join('<b>→</b>') + '<b>→ ∅</b>';
  };
  render();
  return {
    el,
    tick() {
      if (l.length <= 2 || (l.length < 5 && Math.random() < 0.55)) {
        const i = rnd(0, l.length), v = rnd(1, 9); l.splice(i, 0, v); render(i); op.textContent = `insert(${v}, pos ${i})`;
      } else {
        const i = rnd(0, l.length - 1), [v] = l.splice(i, 1); render(); op.textContent = `remove(${v})`;
      }
    },
  };
}

function treeWidget() {
  const vals = [8, 4, 12, 2, 6, 10, 14];
  const pos = [[65, 10], [33, 38], [97, 38], [17, 64], [49, 64], [81, 64], [113, 64]];
  const edges = [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6]];
  const svg = `<svg class="tree" width="130" height="76" viewBox="0 0 130 76">
    ${edges.map(([a, b]) => `<line x1="${pos[a][0]}" y1="${pos[a][1]}" x2="${pos[b][0]}" y2="${pos[b][1]}"/>`).join('')}
    ${pos.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="8"/><text x="${x}" y="${y}">${vals[i]}</text>`).join('')}</svg>`;
  const el = panel('BST', 'O(log n)', `${svg}<div class="n-op">search(…)</div>`);
  const circles = [...el.querySelectorAll('circle')], op = el.querySelector('.n-op');
  return {
    el,
    tick() {
      const target = pick(vals);
      const path = [];
      for (let i = 0; i < 7;) { path.push(i); if (vals[i] === target) break; i = target < vals[i] ? 2 * i + 1 : 2 * i + 2; }
      circles.forEach((c) => c.classList.remove('on'));
      path.forEach((n, k) => setTimeout(() => circles[n].classList.add('on'), k * 260));
      op.textContent = `search(${target}) ✓ ${path.length} steps`;
    },
  };
}

function cppWidget() {
  const code = [
    '<span class="k">#include</span> <span class="s">&lt;iostream&gt;</span>',
    '<span class="k">for</span> (<span class="k">int</span> i = 0; i &lt; n; i++)',
    '  sum += arr[<span class="live i">0</span>];',
    '<span class="c">// sum = <span class="sum">0</span></span>',
  ].join('\n');
  const el = panel('C++', 'loop.cpp', `<pre>${code}</pre>`);
  const iEl = el.querySelector('.i'), sumEl = el.querySelector('.sum');
  const arr = [3, 7, 1, 9, 4];
  let i = 0, sum = 0;
  return {
    el, core: true,
    tick() {
      sum += arr[i]; iEl.textContent = i; sumEl.textContent = sum;
      i = (i + 1) % arr.length;
      if (i === 0) sum = 0;
    },
  };
}

function pythonWidget() {
  const code = [
    '<span class="k">def</span> <span class="f">agent</span>(task):',
    '    plan = llm.<span class="f">think</span>(task)',
    '    <span class="k">return</span> plan.<span class="f">run</span>()',
  ].join('\n');
  const el = panel('Python', 'agent.py', `<pre>${code}</pre><div class="n-op">▸ idle</div>`);
  const op = el.querySelector('.n-op');
  const states = ['▸ thinking…', '▸ planning steps…', '▸ calling tools…', '▸ done ✓'];
  let k = 0;
  return { el, core: true, tick() { op.textContent = states[k++ % states.length]; } };
}

function htmlWidget() {
  const el = panel('HTML', 'index.html', '<pre></pre>');
  const pre = el.querySelector('pre');
  const variants = [['h1', 'Sayem'], ['p', 'Hello, world'], ['button', 'Hire me'], ['code', 'AI.dev']];
  let k = 0;
  const render = () => {
    const [tag, text] = variants[k++ % variants.length];
    pre.innerHTML = [
      '<span class="t">&lt;section</span> <span class="f">class</span>=<span class="s">"hero"</span><span class="t">&gt;</span>',
      `  <span class="t">&lt;${tag}&gt;</span><span class="live">${text}</span><span class="t">&lt;/${tag}&gt;</span>`,
      '<span class="t">&lt;/section&gt;</span>',
    ].join('\n');
  };
  render();
  return { el, core: true, tick: render };
}

function javaWidget() {
  const code = [
    '<span class="k">class</span> <span class="f">Restaurant</span> {',
    '  <span class="k">void</span> <span class="f">order</span>(Item i) {',
    '    bill += i.price;',
    '  }',
    '}',
  ].join('\n');
  const el = panel('Java', 'RMS.java', `<pre>${code}</pre><div class="n-op">bill = ৳0</div>`);
  const op = el.querySelector('.n-op');
  let bill = 0;
  return {
    el,
    tick() {
      bill = bill > 2000 ? 0 : bill + pick([120, 250, 90, 180, 60]);
      op.textContent = `bill = ৳${bill}`;
    },
  };
}

/* ---------- HUD ---------- */
export function initHud(data, { fine = true, reduced = false } = {}) {
  const hud = document.getElementById('hud');
  if (!hud) return;
  const tilt = document.getElementById('hud-tilt'), orbit = document.getElementById('orbit');

  // Text that runs around the ring
  const p = data.profile || {};
  const parts = [p.fullName || p.name, 'CSE @ AIUB', ...(data.skills || []).map((s) => s.name)]
    .filter(Boolean).map((s) => String(s).toUpperCase());
  let ring = '';
  for (const part of [...parts, ...parts]) {
    if (ring.length + part.length + 3 > 168) break;
    ring += `${part} • `;
  }
  document.getElementById('ring-text').textContent = ring;

  // Orbiting panels (fewer on small screens)
  const all = [arrayWidget(), cppWidget(), stackWidget(), pythonWidget(), treeWidget(), htmlWidget(), linkedListWidget(), javaWidget()];
  const widgets = innerWidth < 700 ? all.filter((w) => w.core) : all;
  widgets.forEach((w) => orbit.append(w.el));

  // On narrow screens keep the orbit tighter so panels stay on-screen
  const radius = () => hud.clientWidth * (innerWidth < 700 ? 0.33 : 0.46);
  let R = radius(), angle = 0, speed = 0.003, target = 0.003, visible = true;
  new ResizeObserver(() => (R = radius())).observe(hud);
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(hud);
  hud.addEventListener('pointerenter', () => (target = 0.001));
  hud.addEventListener('pointerleave', () => (target = 0.003));

  const N = widgets.length;
  (function frame() {
    if (visible) {
      speed += (target - speed) * 0.05;
      angle += reduced ? speed * 0.3 : speed;
      widgets.forEach((w, i) => {
        const a = angle + (i / N) * Math.PI * 2, s = Math.sin(a);
        const x = Math.cos(a) * R, y = s * R * 0.36, z = s * R * 0.92;
        w.el.style.transform = `translate(-50%,-50%) translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,${z.toFixed(1)}px)`;
        w.el.style.opacity = (0.28 + 0.72 * (s + 1) / 2).toFixed(3);
      });
    }
    requestAnimationFrame(frame);
  })();

  // Live data: each widget mutates on its own beat
  widgets.forEach((w, i) => setTimeout(() => { w.tick(); setInterval(() => visible && w.tick(), 1500 + i * 130); }, i * 180));
  const cpu = document.getElementById('hud-cpu'), mem = document.getElementById('hud-mem');
  setInterval(() => {
    if (!visible) return;
    cpu.textContent = rnd(18, 78);
    mem.textContent = (2.4 + Math.random() * 1.6).toFixed(1);
  }, 1000);

  // Whole HUD tilts in 3D toward the cursor
  if (fine && !reduced) {
    const clamp = (v) => Math.max(-1, Math.min(1, v));
    const hero = document.getElementById('home');
    hero.addEventListener('pointermove', (e) => {
      const r = hud.getBoundingClientRect();
      const dx = clamp((e.clientX - (r.left + r.width / 2)) / r.width);
      const dy = clamp((e.clientY - (r.top + r.height / 2)) / r.height);
      tilt.style.transform = `rotateY(${dx * 18}deg) rotateX(${-dy * 14}deg)`;
    });
    hero.addEventListener('pointerleave', () => (tilt.style.transform = ''));
  }
}
