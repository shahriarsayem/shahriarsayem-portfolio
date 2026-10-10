import * as THREE from 'three';

// Programming glyphs that drift through 3D space behind the page
const TOKENS = [
  '{ }', '</>', '[ ]', '=>', '#include', 'def', 'class', '<div>', 'int[]', 'O(n)', 'O(log n)', 'cout <<',
  'print()', 'SELECT *', 'return', 'for', 'while', 'null', 'true', '&&', '::', 'λ', 'AI', '0101', 'git push',
  'new Node()', 'stack.pop()', 'arr[i]', 'import torch', 'agent.run()', '<h1>', 'public static', '#', '!=', '++',
];

function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.3, 'rgba(255,255,255,.6)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function textTexture(text) {
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  const font = '600 56px "JetBrains Mono", Consolas, monospace';
  g.font = font;
  c.width = Math.ceil(g.measureText(text).width) + 40;
  c.height = 90;
  g.font = font;
  g.textBaseline = 'middle';
  g.shadowColor = 'rgba(255,255,255,.9)';
  g.shadowBlur = 14;
  g.fillStyle = '#fff';
  g.fillText(text, 20, 46);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { tex, aspect: c.width / c.height };
}

export function initScene(canvas, { reduced = false } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    canvas.remove();
    return null;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05070f, 0.055);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  camera.position.set(0, 0, 7);

  // Particle field
  const N = reduced ? 900 : 2200;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 34;
    pos[i * 3 + 1] = 10 - Math.random() * 55;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 20 - 4;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pMat = new THREE.PointsMaterial({ size: 0.07, map: dotTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const particles = new THREE.Points(pGeo, pMat);
  scene.add(particles);

  // Floating code glyphs
  const glyphs = [];
  const count = reduced ? 24 : 46;
  const make = () => document.fonts?.ready ?? Promise.resolve();
  make().then(() => {
    for (let i = 0; i < count; i++) {
      const { tex, aspect } = textTexture(TOKENS[i % TOKENS.length]);
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.32 + Math.random() * 0.3, blending: THREE.AdditiveBlending });
      const sp = new THREE.Sprite(mat);
      const h = 0.32 + Math.random() * 0.35;
      sp.scale.set(h * aspect, h, 1);
      const side = Math.random() < 0.5 ? -1 : 1;
      sp.position.set(side * (2 + Math.random() * 9), 6 - Math.random() * 50, -1 - Math.random() * 11);
      sp.userData = { baseY: sp.position.y, phase: Math.random() * 6, drift: 0.2 + Math.random() * 0.4, hueOff: i % 3 === 0 ? 70 : 0 };
      scene.add(sp);
      glyphs.push(sp);
    }
    if (lastHue != null) api.setHue(lastHue);
  });

  let px = 0, py = 0, sx = 0, sy = 0, scrollY = 0, vh = innerHeight, lastHue = null;
  function layout() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    vh = innerHeight;
  }
  addEventListener('resize', layout);
  layout();

  const clock = new THREE.Clock();
  (function frame() {
    const t = clock.getElapsedTime() * (reduced ? 0.25 : 1);
    sx += (px - sx) * 0.05;
    sy += (py - sy) * 0.05;
    const camY = (-scrollY / vh) * 3;
    camera.position.x = sx * 0.8;
    camera.position.y = camY + sy * 0.5;
    camera.lookAt(sx * 0.2, camY, 0);
    particles.rotation.y = t * 0.012 + sx * 0.08;
    particles.rotation.x = sy * 0.05;
    glyphs.forEach((g) => {
      const u = g.userData;
      g.position.y = u.baseY + Math.sin(t * u.drift + u.phase) * 0.4;
      g.material.rotation = Math.sin(t * 0.3 + u.phase) * 0.08;
    });
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  })();

  const api = {
    setHue(h) {
      lastHue = h;
      pMat.color.setHSL((h % 360) / 360, 1, 0.6);
      glyphs.forEach((g) => g.material.color.setHSL(((h + g.userData.hueOff) % 360) / 360, 0.95, 0.62));
    },
    setPointer(x, y) { px = x; py = y; },
    setScroll(y) { scrollY = y; },
  };
  return api;
}
