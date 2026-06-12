// Three.js 3D 场景：海水、网箱、浮标、DO 层、剖切平面、点击拾取

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const RISK_COLORS = {
  high: 0xff4d6d,
  mid: 0xffb020,
  low: 0x29ff9f,
};
const STATUS_COLORS = {
  ok: 0x29ff9f,
  hold: 0xffb020,
  recollect: 0xff6b35,
};

export function createScene(container, store, callbacks) {
  const { onSelect } = callbacks;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a1628);
  scene.fog = new THREE.Fog(0x0a1628, 120, 320);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
  camera.position.set(120, 90, 140);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.localClippingEnabled = true;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.4;
  controls.maxPolarAngle = Math.PI / 2.05;
  controls.target.set(0, -5, 0);

  const clickPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  scene.clippingPlanes = [clickPlane];

  const ambient = new THREE.AmbientLight(0x88aaff, 0.5);
  scene.add(ambient);
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(80, 120, 60);
  scene.add(dir);
  const sub = new THREE.DirectionalLight(0x21d4fd, 0.4);
  sub.position.set(-60, 40, -80);
  scene.add(sub);

  const seabedGeo = new THREE.PlaneGeometry(400, 400);
  const seabedMat = new THREE.MeshStandardMaterial({
    color: 0x0c2a1a,
    roughness: 0.9,
    metalness: 0,
    transparent: true,
    opacity: 0.85,
  });
  const seabed = new THREE.Mesh(seabedGeo, seabedMat);
  seabed.rotation.x = -Math.PI / 2;
  seabed.position.y = -25;
  scene.add(seabed);

  const grid = new THREE.GridHelper(400, 40, 0x1e3a5f, 0x0f1f3a);
  grid.position.y = -24.9;
  scene.add(grid);

  const waterGeo = new THREE.BoxGeometry(400, 50, 400);
  const waterMat = new THREE.MeshPhysicalMaterial({
    color: 0x21d4fd,
    transparent: true,
    opacity: 0.08,
    roughness: 0.1,
    metalness: 0.1,
    transmission: 0.6,
    side: THREE.DoubleSide,
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.position.y = 0;
  scene.add(water);

  const waterSurfaceGeo = new THREE.PlaneGeometry(400, 400);
  const waterSurfaceMat = new THREE.MeshStandardMaterial({
    color: 0x21d4fd,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide,
  });
  const waterSurface = new THREE.Mesh(waterSurfaceGeo, waterSurfaceMat);
  waterSurface.rotation.x = -Math.PI / 2;
  waterSurface.position.y = 0.5;
  scene.add(waterSurface);

  const cageGroup = new THREE.Group();
  const buoyGroup = new THREE.Group();
  const layerGroup = new THREE.Group();
  const pickables = [];
  scene.add(cageGroup);
  scene.add(buoyGroup);
  scene.add(layerGroup);

  const edgeMat = new THREE.LineBasicMaterial({ color: 0x21d4fd, transparent: true, opacity: 0.5 });

  function buildCageMesh(cage) {
    const g = new THREE.Group();
    g.userData = { kind: 'cage', id: cage.id, name: cage.name };

    const { width, depth, height } = cage;
    const geo = new THREE.BoxGeometry(width, height, depth);
    const edges = new THREE.EdgesGeometry(geo);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x21d4fd, transparent: true, opacity: 0.6 }));
    line.position.y = -height / 2;
    g.add(line);

    const netMat = new THREE.MeshStandardMaterial({
      color: 0x21d4fd,
      transparent: true,
      opacity: 0.06,
      side: THREE.DoubleSide,
      wireframe: true,
    });
    const net = new THREE.Mesh(geo, netMat);
    net.position.y = -height / 2;
    g.add(net);

    const frameColor = getCageRiskColor(cage.id);
    const topBarGeo = new THREE.BoxGeometry(width + 4, 1.2, depth + 4);
    const topBarMat = new THREE.MeshStandardMaterial({
      color: frameColor,
      metalness: 0.5,
      roughness: 0.4,
      emissive: frameColor,
      emissiveIntensity: 0.25,
      transparent: true,
      opacity: 0.85,
    });
    const topBar = new THREE.Mesh(topBarGeo, topBarMat);
    topBar.position.y = 0;
    g.add(topBar);
    pickables.push(topBar);
    topBar.userData = { kind: 'cage', id: cage.id, name: cage.name, group: g };

    const cornerPts = [
      [-width / 2, -height, -depth / 2], [width / 2, -height, -depth / 2],
      [width / 2, -height, depth / 2], [-width / 2, -height, depth / 2],
    ];
    cornerPts.forEach(p => {
      const anchor = new THREE.Mesh(
        new THREE.SphereGeometry(0.6, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xffaa00, emissiveIntensity: 0.5 })
      );
      anchor.position.set(p[0], p[1], p[2]);
      g.add(anchor);
    });

    const layers = [
      { key: 'shallow', y: -3, label: '浅层' },
      { key: 'mid', y: -height * 0.5, label: '中层' },
      { key: 'deep', y: -height + 2, label: '深层' },
    ];
    layers.forEach(l => {
      const r = store.readings[`${cage.id}-${l.key}`];
      if (!r) return;
      const color = r.status === 'ok' ? RISK_COLORS[r.risk] : STATUS_COLORS[r.status];
      const lg = new THREE.CircleGeometry(Math.min(width, depth) * 0.38, 32);
      const lm = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
      });
      const disc = new THREE.Mesh(lg, lm);
      disc.rotation.x = -Math.PI / 2;
      disc.position.y = l.y;
      g.add(disc);

      if (r.status !== 'ok') {
        const ringGeo = new THREE.RingGeometry(Math.min(width, depth) * 0.38, Math.min(width, depth) * 0.44, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: STATUS_COLORS[r.status],
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.9,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = l.y + 0.02;
        g.add(ring);
      }
    });

    g.position.set(cage.x, 0, cage.z);
    return g;
  }

  function getCageRiskColor(cageId) {
    const alerts = store.alerts.filter(a => a.cageId === cageId);
    if (alerts.some(a => a.risk === 'high')) return RISK_COLORS.high;
    if (alerts.some(a => a.risk === 'mid')) return RISK_COLORS.mid;
    return RISK_COLORS.low;
  }

  function buildBuoyMesh(buoy) {
    const g = new THREE.Group();
    g.userData = { kind: 'buoy', id: buoy.id, name: buoy.name, cageId: buoy.cageId };

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.6, 2.4, 20),
      new THREE.MeshStandardMaterial({ color: 0xffcc33, metalness: 0.3, roughness: 0.5, emissive: 0xffaa00, emissiveIntensity: 0.2 })
    );
    body.position.y = 1.2;
    g.add(body);
    pickables.push(body);
    body.userData = { kind: 'buoy', id: buoy.id, name: buoy.name, cageId: buoy.cageId, group: g };

    const top = new THREE.Mesh(
      new THREE.SphereGeometry(0.7, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xff3355, emissive: 0xff3355, emissiveIntensity: 0.5 })
    );
    top.position.y = 2.8;
    g.add(top);

    const rod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 18, 8),
      new THREE.MeshStandardMaterial({ color: 0x888888 })
    );
    rod.position.y = -8;
    g.add(rod);

    g.position.set(buoy.x, 0, buoy.z);
    return g;
  }

  store.cages.forEach(c => cageGroup.add(buildCageMesh(c)));
  store.buoys.forEach(b => buoyGroup.add(buildBuoyMesh(b)));

  const clipIndicatorGeo = new THREE.PlaneGeometry(300, 300);
  const clipIndicatorMat = new THREE.MeshBasicMaterial({
    color: 0x21d4fd,
    transparent: true,
    opacity: 0.06,
    side: THREE.DoubleSide,
  });
  const clipIndicator = new THREE.Mesh(clipIndicatorGeo, clipIndicatorMat);
  clipIndicator.rotation.x = -Math.PI / 2;
  clipIndicator.position.y = 0.5;
  scene.add(clipIndicator);

  const clipBorderGeo = new THREE.RingGeometry(149, 150, 64);
  const clipBorderMat = new THREE.MeshBasicMaterial({
    color: 0x21d4fd,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
  });
  const clipBorder = new THREE.Mesh(clipBorderGeo, clipBorderMat);
  clipBorder.rotation.x = -Math.PI / 2;
  clipBorder.position.y = 0.51;
  scene.add(clipBorder);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hoveredObj = null;

  function setHighlight(obj, on) {
    if (!obj) return;
    const mat = obj.material;
    if (mat && 'emissiveIntensity' in mat) {
      mat.emissiveIntensity = on ? 0.8 : 0.25;
    }
  }

  function onPointerMove(ev) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(pickables, false);
    if (hits.length > 0) {
      const obj = hits[0].object;
      if (hoveredObj !== obj) {
        setHighlight(hoveredObj, false);
        hoveredObj = obj;
        setHighlight(hoveredObj, true);
        renderer.domElement.style.cursor = 'pointer';
      }
    } else {
      if (hoveredObj) {
        setHighlight(hoveredObj, false);
        hoveredObj = null;
      }
      renderer.domElement.style.cursor = 'grab';
    }
  }

  function onPointerDown(ev) {
    if (hoveredObj) {
      const u = hoveredObj.userData;
      onSelect(u);
    }
  }

  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerdown', onPointerDown);

  let animationId = null;
  function animate() {
    animationId = requestAnimationFrame(animate);
    controls.autoRotate = store.state.autoRotate;
    controls.update();

    const t = performance.now() * 0.0003;
    waterSurfaceMat.opacity = 0.12 + Math.sin(t * 4) * 0.04;

    buoyGroup.children.forEach((bg, i) => {
      const phase = i * 0.7;
      bg.position.y = Math.sin(t * 6 + phase) * 0.3;
    });

    renderer.render(scene, camera);
  }
  animate();

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  resize();
  window.addEventListener('resize', resize);
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  function setClipDepth(pct) {
    const maxDepth = 25;
    const y = -(pct / 100) * maxDepth;
    clickPlane.constant = -y;
    clipIndicator.position.y = y + 0.1;
    clipBorder.position.y = y + 0.12;
  }

  function highlightById(id) {
    pickables.forEach(p => {
      const u = p.userData;
      const on = u.id === id || u.cageId === id;
      setHighlight(p, on);
      if (on) hoveredObj = p;
    });
  }

  function resetView() {
    camera.position.set(120, 90, 140);
    controls.target.set(0, -5, 0);
    controls.update();
  }

  function dispose() {
    if (animationId) cancelAnimationFrame(animationId);
    window.removeEventListener('resize', resize);
    ro.disconnect();
    renderer.domElement.removeEventListener('pointermove', onPointerMove);
    renderer.domElement.removeEventListener('pointerdown', onPointerDown);
    renderer.dispose();
  }

  return {
    setClipDepth,
    highlightById,
    resetView,
    dispose,
    controls,
    scene,
    camera,
  };
}
