import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const state = {
  scheme: 'orthogonal',
  vectorV: new THREE.Vector3(3, 4, 2),
  baseE1: new THREE.Vector3(1, 0, 0),
  baseE2: new THREE.Vector3(0, 1, 0),
  showCoords: true,
  showLengths: true,
  showAngles: false
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d1117);

const container = document.getElementById('canvas-container');
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
camera.position.set(8, 6, 8);

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

const gridHelper = new THREE.GridHelper(10, 10, 0x333333, 0x222222);
scene.add(gridHelper);

const axesHelper = new THREE.AxesHelper(6);
scene.add(axesHelper);

const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);
scene.add(new THREE.AmbientLight(0xffffff, 0.4));

const arrowGroup = new THREE.Group();
scene.add(arrowGroup);

function createArrow(dir, origin, color, headLength = 0.4, headWidth = 0.15) {
  const len = dir.length();
  if (len < 0.001) return null;
  const normDir = dir.clone().normalize();
  return new THREE.ArrowHelper(normDir, origin, len, color, headLength, headWidth);
}

function createLine(p1, p2, color, dashed = false) {
  const points = [p1, p2];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = dashed 
    ? new THREE.LineDashedMaterial({ color, dashSize: 0.15, gapSize: 0.1 })
    : new THREE.LineBasicMaterial({ color });
  const line = new THREE.Line(geometry, material);
  if (dashed) line.computeLineDistances();
  return line;
}

function createPlane(v1, v2, origin, color, opacity = 0.15) {
  const normal = new THREE.Vector3().crossVectors(v1, v2).normalize();
  if (normal.length() < 0.001) return null;
  const size = 8;
  const geometry = new THREE.PlaneGeometry(size, size);
  const material = new THREE.MeshBasicMaterial({ 
    color, transparent: true, opacity, side: THREE.DoubleSide 
  });
  const plane = new THREE.Mesh(geometry, material);
  plane.position.copy(origin);
  plane.lookAt(origin.clone().add(normal));
  return plane;
}

function dot(a, b) { return a.dot(b); }
function norm(v) { return v.length(); }
function angleBetween(a, b) {
  const cos = a.dot(b) / (a.length() * b.length());
  return Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI;
}

function projectOntoSubspace(v, e1, e2, scheme) {
  if (scheme === 'orthogonal') {
    const c1 = dot(v, e1) / dot(e1, e1);
    const c2 = dot(v, e2) / dot(e2, e2);
    const p = e1.clone().multiplyScalar(c1).add(e2.clone().multiplyScalar(c2));
    return { p, c1, c2 };
  } else if (scheme === 'oblique') {
    const u1 = e1.clone();
    const u2 = e2.clone();
    const a = dot(u1, u1), b = dot(u1, u2), c = dot(u2, u2);
    const d = dot(v, u1), e = dot(v, u2);
    const det = a * c - b * b;
    if (Math.abs(det) < 1e-10) return { p: new THREE.Vector3(), c1: 0, c2: 0 };
    const c1 = (d * c - b * e) / det;
    const c2 = (a * e - b * d) / det;
    const p = u1.multiplyScalar(c1).add(u2.multiplyScalar(c2));
    return { p, c1, c2 };
  } else {
    const c1 = v.x, c2 = v.y;
    const p = new THREE.Vector3(c1, c2, 0);
    return { p, c1, c2 };
  }
}

function diagnose(v, e1, e2, scheme) {
  const issues = [];
  
  const ang = angleBetween(e1, e2);
  if (Math.abs(ang - 90) > 1) {
    issues.push({
      type: 'warning',
      title: '⚠️ 基底不正交',
      desc: `e₁ 与 e₂ 夹角为 ${ang.toFixed(1)}°（非 90°），这是${scheme === 'oblique' ? '斜投影预期行为' : '异常情况'}。投影结果可能与直觉不符。`
    });
  } else {
    issues.push({ type: 'success', title: '✓ 基底正交', desc: 'e₁ 与 e₂ 夹角约 90°，满足正交条件。' });
  }
  
  const coords = [v.x, v.y, v.z, e1.x, e1.y, e1.z, e2.x, e2.y, e2.z];
  const maxCoord = Math.max(...coords.map(Math.abs));
  if (maxCoord > 5) {
    issues.push({
      type: 'warning',
      title: '⚠️ 坐标越界',
      desc: `最大坐标绝对值 ${maxCoord.toFixed(1)} 超过建议范围 [-5, 5]。箭头可能超出视口，建议缩小数值。`
    });
  }
  
  const cDot = dot(e1, e2);
  if (cDot < -0.01) {
    issues.push({
      type: 'error',
      title: '❌ 分量反号风险',
      desc: `基底点积为负 (${cDot.toFixed(3)})，两向量方向接近相反。投影系数可能出现意外符号，建议调整基底方向。`
    });
  }
  
  const e1Norm = norm(e1), e2Norm = norm(e2);
  if (e1Norm < 0.5 || e2Norm < 0.5) {
    issues.push({
      type: 'info',
      title: 'ℹ️ 基底长度较小',
      desc: `e₁ 长度 ${e1Norm.toFixed(2)}，e₂ 长度 ${e2Norm.toFixed(2)}。单位化基底便于解读投影系数。`
    });
  }
  
  return issues;
}

function renderDiagnosis(issues) {
  const container = document.getElementById('diagnosis-container');
  container.innerHTML = issues.map(issue => `
    <div class="diagnosis-item ${issue.type}">
      <strong>${issue.title}</strong><br>
      <span style="opacity:0.8">${issue.desc}</span>
    </div>
  `).join('');
}

function updateLabels(labelsData) {
  const overlay = document.getElementById('labels-overlay');
  overlay.innerHTML = '';
  const rect = renderer.domElement.getBoundingClientRect();
  
  labelsData.forEach(item => {
    const pos = item.pos.clone();
    pos.project(camera);
    const x = (pos.x + 1) / 2 * rect.width;
    const y = (-pos.y + 1) / 2 * rect.height;
    
    if (pos.z < 1 && x > 0 && x < rect.width && y > 0 && y < rect.height) {
      const tag = document.createElement('div');
      tag.className = `label-tag ${item.class}`;
      tag.style.left = x + 'px';
      tag.style.top = y + 'px';
      tag.textContent = item.text;
      overlay.appendChild(tag);
    }
  });
}

function updateScene() {
  while (arrowGroup.children.length) arrowGroup.remove(arrowGroup.children[0]);
  
  const { scheme, vectorV, baseE1, baseE2 } = state;
  const origin = new THREE.Vector3(0, 0, 0);
  
  let e1, e2;
  if (scheme === 'axis') {
    e1 = new THREE.Vector3(1, 0, 0);
    e2 = new THREE.Vector3(0, 1, 0);
  } else {
    e1 = baseE1.clone();
    e2 = baseE2.clone();
  }
  
  const { p, c1, c2 } = projectOntoSubspace(vectorV, e1, e2, scheme);
  const vArrow = createArrow(vectorV, origin, 0x4fc3f7);
  if (vArrow) arrowGroup.add(vArrow);
  
  const pArrow = createArrow(p, origin, 0x81c784, 0.35, 0.12);
  if (pArrow) arrowGroup.add(pArrow);
  
  const connLine = createLine(vectorV, p, 0xffb74d, true);
  arrowGroup.add(connLine);
  
  const plane = createPlane(e1, e2, origin, 0x81c784, 0.1);
  if (plane) arrowGroup.add(plane);
  
  const e1Arrow = createArrow(e1.clone().multiplyScalar(Math.max(1, norm(e1))), origin, 0xffb74d, 0.25, 0.1);
  const e2Arrow = createArrow(e2.clone().multiplyScalar(Math.max(1, norm(e2))), origin, 0xff7043, 0.25, 0.1);
  if (e1Arrow) arrowGroup.add(e1Arrow);
  if (e2Arrow) arrowGroup.add(e2Arrow);
  
  document.getElementById('res-v-coord').textContent = 
    `(${vectorV.x.toFixed(2)}, ${vectorV.y.toFixed(2)}, ${vectorV.z.toFixed(2)})`;
  document.getElementById('res-v-len').textContent = norm(vectorV).toFixed(3);
  document.getElementById('res-p-coord').textContent = 
    `(${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)})`;
  document.getElementById('res-p-len').textContent = norm(p).toFixed(3);
  document.getElementById('res-c1').textContent = c1.toFixed(4);
  document.getElementById('res-c2').textContent = c2.toFixed(4);
  
  const schemeNames = { orthogonal: '正交投影', oblique: '斜投影', axis: '坐标轴投影' };
  document.getElementById('scheme-name').textContent = schemeNames[scheme];
  
  renderDiagnosis(diagnose(vectorV, e1, e2, scheme));
  
  const labels = [];
  const midV = vectorV.clone().multiplyScalar(0.5);
  const midP = p.clone().multiplyScalar(0.5);
  
  if (state.showCoords) {
    labels.push({ pos: vectorV.clone().add(new THREE.Vector3(0.3, 0.3, 0)), text: `V=(${vectorV.x.toFixed(1)},${vectorV.y.toFixed(1)},${vectorV.z.toFixed(1)})`, class: 'vector' });
    labels.push({ pos: p.clone().add(new THREE.Vector3(0.3, -0.2, 0)), text: `p=(${p.x.toFixed(1)},${p.y.toFixed(1)},${p.z.toFixed(1)})`, class: 'projection' });
  }
  if (state.showLengths) {
    labels.push({ pos: midV, text: `|V|=${norm(vectorV).toFixed(2)}`, class: 'vector' });
    labels.push({ pos: midP, text: `|p|=${norm(p).toFixed(2)}`, class: 'projection' });
  }
  if (state.showAngles) {
    labels.push({ pos: new THREE.Vector3(1.5, 0.8, 0), text: `∠=${angleBetween(vectorV, p).toFixed(1)}°`, class: 'vector' });
  }
  
  const e1Tip = e1.clone().multiplyScalar(Math.max(1, norm(e1)));
  const e2Tip = e2.clone().multiplyScalar(Math.max(1, norm(e2)));
  labels.push({ pos: e1Tip.add(new THREE.Vector3(0, 0.2, 0)), text: `e₁`, class: 'base' });
  labels.push({ pos: e2Tip.add(new THREE.Vector3(0.2, 0, 0)), text: `e₂`, class: 'base' });
  
  setTimeout(() => updateLabels(labels), 50);
}

function resize() {
  const rect = container.getBoundingClientRect();
  camera.aspect = rect.width / rect.height;
  camera.updateProjectionMatrix();
  renderer.setSize(rect.width, rect.height, false);
}
window.addEventListener('resize', resize);
resize();

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

function bindInputs() {
  const inputs = {
    vecVx: 'vec-vx', vecVy: 'vec-vy', vecVz: 'vec-vz',
    e1x: 'base-e1x', e1y: 'base-e1y', e1z: 'base-e1z',
    e2x: 'base-e2x', e2y: 'base-e2y', e2z: 'base-e2z'
  };
  
  const read = () => {
    const get = id => parseFloat(document.getElementById(id).value) || 0;
    state.vectorV.set(get('vec-vx'), get('vec-vy'), get('vec-vz'));
    state.baseE1.set(get('base-e1x'), get('base-e1y'), get('base-e1z'));
    state.baseE2.set(get('base-e2x'), get('base-e2y'), get('base-e2z'));
    updateScene();
  };
  
  Object.values(inputs).forEach(id => 
    document.getElementById(id).addEventListener('input', read));
  
  document.getElementById('projection-scheme').addEventListener('change', (e) => {
    state.scheme = e.target.value;
    document.getElementById('base-vectors-section').style.display = 
      e.target.value === 'axis' ? 'none' : 'block';
    updateScene();
  });
  
  const tog = (id, key) => {
    const btn = document.getElementById(id);
    btn.addEventListener('click', () => {
      state[key] = !state[key];
      btn.classList.toggle('active', state[key]);
      updateScene();
    });
  };
  tog('toggle-coords', 'showCoords');
  tog('toggle-lengths', 'showLengths');
  tog('toggle-angles', 'showAngles');
  
  document.getElementById('btn-screenshot').addEventListener('click', () => {
    renderer.render(scene, camera);
    const link = document.createElement('a');
    link.download = `vector-projection-${state.scheme}-${Date.now()}.png`;
    link.href = renderer.domElement.toDataURL('image/png');
    link.click();
  });
  
  document.getElementById('btn-reset').addEventListener('click', () => {
    camera.position.set(8, 6, 8);
    controls.target.set(0, 0, 0);
    controls.update();
  });
}

bindInputs();
updateScene();
