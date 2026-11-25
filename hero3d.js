// OPD Triage Lens — first-load 3D signature (J8).
// A real Three.js triage dial in the hero: one disc, four coloured
// quadrants (RED / AMBER / GREEN / BLUE), with a needle that follows the
// latest verdict on the page. Auto-initialises on load, no click needed.
// Drag to spin the dial. Reduced-motion and no-WebGL fall back gracefully.
import * as THREE from 'three';

const COLOURS = {
  RED: 0xc81e1e,
  AMBER: 0xd97706,
  GREEN: 0x15803d,
  BLUE: 0x1d4ed8,
};
const ORDER = ['RED', 'AMBER', 'GREEN', 'BLUE'];

const canvas = document.getElementById('hero3d-canvas');
const fallback = document.getElementById('hero3d-fallback');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function showFallback() {
  if (canvas) canvas.hidden = true;
  if (fallback) fallback.hidden = false;
}

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
} catch (err) {
  showFallback();
  throw err;
}
if (!renderer) { showFallback(); }
else {
  const wrap = document.getElementById('hero3d');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x14213d);

  const camera = new THREE.PerspectiveCamera(38, 2, 0.1, 100);
  camera.position.set(0, 3.6, 3.4);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.75));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(2, 5, 3);
  scene.add(key);

  const dial = new THREE.Group();
  scene.add(dial);

  // Base disc.
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.55, 1.62, 0.16, 64),
    new THREE.MeshStandardMaterial({ color: 0x0e1830, roughness: 0.5, metalness: 0.35 })
  );
  base.position.y = -0.08;
  dial.add(base);

  // Four quadrant wedges on the face. Wedge i spans [i*90deg, (i+1)*90deg);
  // its centre angle is i*90deg + 45deg, which is also the needle angle.
  ORDER.forEach((name, i) => {
    const geo = new THREE.CircleGeometry(1.45, 48, i * Math.PI / 2, Math.PI / 2);
    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({ color: COLOURS[name], roughness: 0.45, metalness: 0.1 })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.005;
    dial.add(mesh);
  });

  // Rim ring around the edge.
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(1.55, 0.035, 12, 96),
    new THREE.MeshStandardMaterial({ color: 0xfafaf6, roughness: 0.4, metalness: 0.4 })
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.01;
  dial.add(rim);

  // Needle: points along +X when rotation.y is 0; target rotation.y is the
  // wedge centre angle, so it always lands in the middle of its quadrant.
  const needle = new THREE.Group();
  const needleArm = new THREE.Mesh(
    new THREE.BoxGeometry(1.25, 0.05, 0.09),
    new THREE.MeshStandardMaterial({ color: 0xfafaf6, roughness: 0.3, metalness: 0.2 })
  );
  needleArm.position.x = 0.62;
  needle.add(needleArm);
  const needleTip = new THREE.Mesh(
    new THREE.ConeGeometry(0.09, 0.28, 16),
    new THREE.MeshStandardMaterial({ color: 0xfafaf6, roughness: 0.3, metalness: 0.2 })
  );
  needleTip.rotation.z = -Math.PI / 2;
  needleTip.position.x = 1.32;
  needle.add(needleTip);
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 0.12, 32),
    new THREE.MeshStandardMaterial({ color: 0xfafaf6, roughness: 0.3, metalness: 0.5 })
  );
  needle.add(hub);
  needle.position.y = 0.06;
  needle.visible = false; // "The needle only moves when a real verdict exists."
  dial.add(needle);

  let needleTarget = null; // radians, in dial space
  let needleAngle = Math.PI / 4;

  function readVerdict() {
    const el = document.getElementById('verdictColour');
    if (!el) return;
    const colour = (el.textContent || '').trim().toUpperCase();
    const idx = ORDER.indexOf(colour);
    if (idx >= 0) {
      needleTarget = idx * Math.PI / 2 + Math.PI / 4;
      needle.visible = true;
    }
  }
  const verdictEl = document.getElementById('verdictColour');
  if (verdictEl && 'MutationObserver' in window) {
    new MutationObserver(readVerdict).observe(verdictEl, { childList: true, characterData: true, subtree: true });
  }
  readVerdict();

  // Drag to spin; slow auto-spin otherwise (off for reduced motion).
  let dragging = false, lastX = 0, spin = 0.35, autoSpin = !reduced;
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true; lastX = e.clientX; autoSpin = false;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    spin += (e.clientX - lastX) * 0.008;
    lastX = e.clientX;
  });
  const endDrag = () => { dragging = false; };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { spin -= 0.15; autoSpin = false; }
    if (e.key === 'ArrowRight') { spin += 0.15; autoSpin = false; }
  });
  canvas.tabIndex = 0;

  function resize() {
    const w = wrap.clientWidth || 640;
    const h = 300;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  const clock = new THREE.Clock();
  function tick() {
    requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (autoSpin && !dragging) spin += dt * 0.12;
    dial.rotation.y = spin;
    if (needleTarget !== null) {
      // Shortest-path ease towards the target angle.
      let diff = needleTarget - needleAngle;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      needleAngle += reduced ? diff : diff * Math.min(1, dt * 6);
      needle.rotation.y = needleAngle;
    }
    renderer.render(scene, camera);
  }
  tick();
}
