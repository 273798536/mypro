import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SECTORS, RISK_LEVELS, DATA_SOURCE, isRetroactive } from './data.js';

const SECTOR_COLORS = {
  [SECTORS.COAL]: 0x3b82f6,
  [SECTORS.MANUFACTURING]: 0x8b5cf6,
  [SECTORS.TECH]: 0x06b6d4,
  [SECTORS.FINANCE]: 0x10b981,
  [SECTORS.STEEL]: 0xf59e0b,
  [SECTORS.BUILDING]: 0xef4444,
};

const RISK_GLOW = {
  [RISK_LEVELS.HIGH]: 0xff4444,
  [RISK_LEVELS.MEDIUM]: 0xffaa00,
  [RISK_LEVELS.LOW]: 0x44ff44,
};

const DEFAULT_COLOR = 0xff2222;

export class Network3D {
  constructor(container, onNodeSelect) {
    this.container = container;
    this.onNodeSelect = onNodeSelect;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.nodeMeshes = {};
    this.edgeLines = {};
    this.pathGroup = null;
    this.riskHalos = {};
    this.labelSprites = {};
    this.selectedNode = null;
    this.hoveredNode = null;
    this.dragNode = null;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.dragPlane = new THREE.Plane();
    this.dragOffset = new THREE.Vector3();
    this.intersection = new THREE.Vector3();
    this.forceNodes = [];
    this.forceEdges = [];
    this.simulationRunning = true;
    this.animationTime = 0;
    this.particles = [];
  }

  init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0e1a);
    this.scene.fog = new THREE.FogExp2(0x0a0e1a, 0.004);

    this.camera = new THREE.PerspectiveCamera(55, 1.5, 0.1, 1000);
    this.camera.position.set(0, 50, 90);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);
    this._resizeRenderer();

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 15;
    this.controls.maxDistance = 250;

    const ambient = new THREE.AmbientLight(0x667799, 2.0);
    this.scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(50, 80, 50);
    this.scene.add(dirLight);
    const pointLight = new THREE.PointLight(0x4488ff, 0.8, 200);
    pointLight.position.set(-30, 40, -30);
    this.scene.add(pointLight);

    const gridHelper = new THREE.GridHelper(200, 40, 0x1a2040, 0x111830);
    gridHelper.position.y = -15;
    this.scene.add(gridHelper);

    this.pathGroup = new THREE.Group();
    this.scene.add(this.pathGroup);

    this._bindEvents();
    this._animate();
  }

  _bindEvents() {
    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', e => this._onPointerDown(e));
    canvas.addEventListener('pointermove', e => this._onPointerMove(e));
    canvas.addEventListener('pointerup', e => this._onPointerUp(e));
    window.addEventListener('resize', () => this._onResize());
  }

  _resizeRenderer() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  _onResize() {
    this._resizeRenderer();
  }

  _setPointer(e) {
    const rect = this.container.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  _raycastNodes() {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const meshes = Object.values(this.nodeMeshes);
    const hits = this.raycaster.intersectObjects(meshes, false);
    return hits.length > 0 ? hits[0] : null;
  }

  _getIssuerIdFromMesh(mesh) {
    for (const [id, m] of Object.entries(this.nodeMeshes)) {
      if (m === mesh) return id;
    }
    return null;
  }

  _onPointerDown(e) {
    this._setPointer(e);
    const hit = this._raycastNodes();
    if (hit) {
      const id = this._getIssuerIdFromMesh(hit.object);
      if (id) {
        this.dragNode = id;
        this.dragPlane.setFromNormalAndCoplanarPoint(
          new THREE.Vector3(0, 1, 0),
          this.nodeMeshes[id].position
        );
        if (this.raycaster.ray.intersectPlane(this.dragPlane, this.intersection)) {
          this.dragOffset.copy(this.intersection).sub(this.nodeMeshes[id].position);
        }
        this.controls.enabled = false;
      }
    }
  }

  _onPointerMove(e) {
    this._setPointer(e);
    if (this.dragNode) {
      this.raycaster.setFromCamera(this.pointer, this.camera);
      if (this.raycaster.ray.intersectPlane(this.dragPlane, this.intersection)) {
        const newPos = this.intersection.sub(this.dragOffset);
        this.nodeMeshes[this.dragNode].position.copy(newPos);
        const fn = this.forceNodes.find(n => n.id === this.dragNode);
        if (fn) { fn.x = newPos.x; fn.y = newPos.y; fn.z = newPos.z; fn.fx = newPos.x; fn.fy = newPos.y; fn.fz = newPos.z; }
        this._updateEdgePositions();
        this._updatePathPositions();
        this._updateLabelPositions();
      }
      return;
    }
    const hit = this._raycastNodes();
    if (hit) {
      const id = this._getIssuerIdFromMesh(hit.object);
      if (id && id !== this.hoveredNode) {
        this.hoveredNode = id;
        this.renderer.domElement.style.cursor = 'pointer';
      }
    } else {
      if (this.hoveredNode) {
        this.hoveredNode = null;
        this.renderer.domElement.style.cursor = 'default';
      }
    }
  }

  _onPointerUp(e) {
    if (this.dragNode) {
      const clickedId = this.dragNode;
      this.dragNode = null;
      this.controls.enabled = true;
      this._setPointer(e);
      const hit = this._raycastNodes();
      if (hit) {
        const id = this._getIssuerIdFromMesh(hit.object);
        if (id === clickedId) {
          this.selectNode(id);
          if (this.onNodeSelect) this.onNodeSelect(id);
        }
      }
    }
  }

  selectNode(issuerId) {
    if (this.selectedNode) {
      const oldMesh = this.nodeMeshes[this.selectedNode];
      if (oldMesh) oldMesh.material.emissiveIntensity = 0.1;
      const oldHalo = this.riskHalos[this.selectedNode];
      if (oldHalo) oldHalo.visible = true;
    }
    this.selectedNode = issuerId;
    const mesh = this.nodeMeshes[issuerId];
    if (mesh) {
      mesh.material.emissiveIntensity = 0.8;
    }
    this._highlightConnectedEdges(issuerId);
    this._highlightContagionPaths(issuerId);
  }

  _highlightConnectedEdges(issuerId) {
    Object.entries(this.edgeLines).forEach(([key, line]) => {
      const [from, to] = key.split('->');
      const connected = from === issuerId || to === issuerId;
      line.material.opacity = connected ? 1.0 : 0.15;
    });
  }

  _highlightContagionPaths(issuerId) {
    if (!this.pathGroup) return;
    this.pathGroup.children.forEach(child => {
      if (child.userData && child.userData.pathIds) {
        const involved = child.userData.pathIds.includes(issuerId);
        child.visible = involved;
      }
    });
  }

  buildNetwork(currentIssuers, currentGuarantees, currentPaths, riskMap) {
    this._clearScene();
    this._initForceNodes(currentIssuers);
    this._initForceEdges(currentGuarantees, currentIssuers);
    this._runForceSimulation(300);
    this._createNodeMeshes(currentIssuers, riskMap);
    this._createEdgeLines(currentGuarantees, currentIssuers);
    this._createContagionPaths(currentPaths, currentIssuers);
    this._createRiskHalos(riskMap);
    this._createLabels(currentIssuers);
    this._updateEdgePositions();
    this._updatePathPositions();
    this._updateLabelPositions();
  }

  _clearScene() {
    Object.values(this.nodeMeshes).forEach(m => { this.scene.remove(m); m.geometry.dispose(); m.material.dispose(); });
    Object.values(this.edgeLines).forEach(l => { this.scene.remove(l); l.geometry.dispose(); l.material.dispose(); });
    Object.values(this.riskHalos).forEach(h => { this.scene.remove(h); h.geometry.dispose(); h.material.dispose(); });
    Object.values(this.labelSprites).forEach(s => { this.scene.remove(s); s.material.map?.dispose(); s.material.dispose(); });
    if (this.pathGroup) {
      while (this.pathGroup.children.length > 0) {
        const c = this.pathGroup.children[0];
        this.pathGroup.remove(c);
        if (c.geometry) c.geometry.dispose();
        if (c.material) c.material.dispose();
      }
    }
    this.particles = [];
    this.nodeMeshes = {};
    this.edgeLines = {};
    this.riskHalos = {};
    this.labelSprites = {};
  }

  _initForceNodes(currentIssuers) {
    const angle = (2 * Math.PI) / currentIssuers.length;
    this.forceNodes = currentIssuers.map((issuer, i) => {
      const r = 30 + Math.random() * 10;
      return {
        id: issuer.id,
        x: r * Math.cos(angle * i),
        y: (Math.random() - 0.5) * 10,
        z: r * Math.sin(angle * i),
        vx: 0, vy: 0, vz: 0,
        fx: null, fy: null, fz: null,
        sector: issuer.sector,
        mass: Math.max(1, Math.log(issuer.holdingScale / 10000)),
      };
    });
  }

  _initForceEdges(currentGuarantees, currentIssuers) {
    const issuerIds = new Set(currentIssuers.map(i => i.id));
    this.forceEdges = currentGuarantees
      .filter(g => issuerIds.has(g.guarantorId) && issuerIds.has(g.guaranteedId))
      .map(g => ({ source: g.guarantorId, target: g.guaranteedId }));
  }

  _runForceSimulation(iterations) {
    const alpha = 0.3;
    const repulsion = 800;
    const attraction = 0.005;
    const centerGravity = 0.01;
    const damping = 0.85;

    for (let iter = 0; iter < iterations; iter++) {
      const progress = iter / iterations;
      const currentAlpha = alpha * (1 - progress * 0.9);

      this.forceNodes.forEach(n => {
        if (n.fx !== null) return;
        n.vx = 0; n.vy = 0; n.vz = 0;
      });

      for (let i = 0; i < this.forceNodes.length; i++) {
        for (let j = i + 1; j < this.forceNodes.length; j++) {
          const a = this.forceNodes[i];
          const b = this.forceNodes[j];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let dz = b.z - a.z;
          let dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist < 0.1) dist = 0.1;
          const force = repulsion / (dist * dist);
          const fx = (dx / dist) * force * currentAlpha;
          const fy = (dy / dist) * force * currentAlpha;
          const fz = (dz / dist) * force * currentAlpha;
          if (a.fx === null) { a.vx -= fx; a.vy -= fy; a.vz -= fz; }
          if (b.fx === null) { b.vx += fx; b.vy += fy; b.vz += fz; }
        }
      }

      this.forceEdges.forEach(e => {
        const a = this.forceNodes.find(n => n.id === e.source);
        const b = this.forceNodes.find(n => n.id === e.target);
        if (!a || !b) return;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dz = b.z - a.z;
        let dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const targetDist = 25;
        const force = (dist - targetDist) * attraction * currentAlpha;
        const fx = (dx / Math.max(dist, 0.1)) * force;
        const fy = (dy / Math.max(dist, 0.1)) * force;
        const fz = (dz / Math.max(dist, 0.1)) * force;
        if (a.fx === null) { a.vx += fx; a.vy += fy; a.vz += fz; }
        if (b.fx === null) { b.vx -= fx; b.vy -= fy; b.vz -= fz; }
      });

      this.forceNodes.forEach(n => {
        if (n.fx !== null) { n.x = n.fx; n.y = n.fy; n.z = n.fz; return; }
        n.vx -= n.x * centerGravity * currentAlpha;
        n.vy -= n.y * centerGravity * currentAlpha * 0.3;
        n.vz -= n.z * centerGravity * currentAlpha;
        n.vx *= damping;
        n.vy *= damping;
        n.vz *= damping;
        n.x += n.vx;
        n.y += n.vy;
        n.z += n.vz;
      });
    }
  }

  _getNodePosition(issuerId) {
    const fn = this.forceNodes.find(n => n.id === issuerId);
    return fn ? new THREE.Vector3(fn.x, fn.y, fn.z) : new THREE.Vector3(0, 0, 0);
  }

  _createNodeMeshes(currentIssuers, riskMap) {
    currentIssuers.forEach(issuer => {
      const pos = this._getNodePosition(issuer.id);
      const scale = Math.max(1.5, Math.log(issuer.holdingScale / 300000)) * 1.0 + 1.0;
      const geom = new THREE.SphereGeometry(scale, 32, 32);

      let color = SECTOR_COLORS[issuer.sector] || 0x888888;
      if (issuer.defaultStatus) {
        color = DEFAULT_COLOR;
      } else if (riskMap[issuer.id] === RISK_LEVELS.HIGH) {
        color = 0xff6644;
      } else if (riskMap[issuer.id] === RISK_LEVELS.MEDIUM) {
        color = 0xffaa44;
      }

      const mat = new THREE.MeshPhongMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.1,
        transparent: true,
        opacity: 0.95,
        shininess: 80,
      });

      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.copy(pos);
      mesh.userData = { issuerId: issuer.id, type: 'node' };
      this.scene.add(mesh);
      this.nodeMeshes[issuer.id] = mesh;
    });
  }

  _createEdgeLines(currentGuarantees, currentIssuers) {
    const issuerIds = new Set(currentIssuers.map(i => i.id));
    currentGuarantees.forEach(g => {
      if (!issuerIds.has(g.guarantorId) || !issuerIds.has(g.guaranteedId)) return;
      const fromPos = this._getNodePosition(g.guarantorId);
      const toPos = this._getNodePosition(g.guaranteedId);
      const points = [fromPos, toPos];
      const geom = new THREE.BufferGeometry().setFromPoints(points);

      let color = 0x4466aa;
      let opacity = 0.5;
      if (g.isDuplicate) {
        color = 0xff4444;
        opacity = 0.8;
      }

      const mat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity,
        linewidth: 1,
      });

      const line = new THREE.Line(geom, mat);
      line.userData = { guaranteeId: g.id, isDuplicate: g.isDuplicate };
      this.scene.add(line);
      const key = `${g.guarantorId}->${g.guaranteedId}`;
      if (!this.edgeLines[key]) this.edgeLines[key] = line;
    });
  }

  _createContagionPaths(currentPaths, currentIssuers) {
    const issuerIds = new Set(currentIssuers.map(i => i.id));
    currentPaths.forEach(path => {
      const validNodes = path.path.filter(id => issuerIds.has(id));
      if (validNodes.length < 2) return;

      const points = validNodes.map(id => this._getNodePosition(id));
      const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);

      const tubeGeom = new THREE.TubeGeometry(curve, Math.max(8, points.length * 12), 0.15, 6, false);
      const tubeMat = new THREE.MeshBasicMaterial({
        color: RISK_GLOW[path.riskLevel] || 0xff8800,
        transparent: true,
        opacity: 0.4,
      });
      const tube = new THREE.Mesh(tubeGeom, tubeMat);
      tube.userData = { pathIds: validNodes, pathId: path.id };
      this.pathGroup.add(tube);

      for (let i = 0; i < 3; i++) {
        this.particles.push({
          curve,
          offset: i / 3,
          speed: 0.002 + Math.random() * 0.001,
          t: i / 3,
          pathId: path.id,
          pathIds: validNodes,
          mesh: null,
        });
      }
    });

    this.particles.forEach(p => {
      const geom = new THREE.SphereGeometry(0.25, 8, 8);
      const mat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.9 });
      const mesh = new THREE.Mesh(geom, mat);
      p.mesh = mesh;
      this.pathGroup.add(mesh);
    });
  }

  _createRiskHalos(riskMap) {
    Object.entries(riskMap).forEach(([issuerId, level]) => {
      if (level === RISK_LEVELS.LOW) return;
      const nodeMesh = this.nodeMeshes[issuerId];
      if (!nodeMesh) return;

      const ringGeom = new THREE.RingGeometry(
        Math.max(0.1, nodeMesh.geometry.parameters.radius * 1.5),
        Math.max(0.2, nodeMesh.geometry.parameters.radius * 2.0),
        32
      );
      const ringMat = new THREE.MeshBasicMaterial({
        color: RISK_GLOW[level],
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.position.copy(nodeMesh.position);
      ring.lookAt(this.camera.position);
      this.scene.add(ring);
      this.riskHalos[issuerId] = ring;
    });
  }

  _createLabels(currentIssuers) {
    currentIssuers.forEach(issuer => {
      const pos = this._getNodePosition(issuer.id);
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgba(10,14,26,0.7)';
      ctx.fillRect(0, 0, 256, 64);
      ctx.font = 'bold 22px sans-serif';
      ctx.fillStyle = '#e0e4f0';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const displayName = issuer.name.length > 8 ? issuer.name.substring(0, 7) + '…' : issuer.name;
      ctx.fillText(displayName, 128, 32);

      const texture = new THREE.CanvasTexture(canvas);
      const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
      const sprite = new THREE.Sprite(mat);
      sprite.position.copy(pos);
      sprite.position.y += 3;
      sprite.scale.set(8, 2, 1);
      this.scene.add(sprite);
      this.labelSprites[issuer.id] = sprite;
    });
  }

  _updateEdgePositions() {
    Object.entries(this.edgeLines).forEach(([key, line]) => {
      const [fromId, toId] = key.split('->');
      const fromPos = this._getNodePosition(fromId);
      const toPos = this._getNodePosition(toId);
      const positions = new Float32Array([fromPos.x, fromPos.y, fromPos.z, toPos.x, toPos.y, toPos.z]);
      line.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      line.geometry.computeBoundingSphere();
    });
  }

  _updatePathPositions() {
    if (!this.pathGroup) return;
    this.pathGroup.children.forEach(child => {
      if (child.userData?.pathId && child.type === 'Mesh' && !child.userData?.isParticle) {
        // Paths are rebuilt on update
      }
    });
  }

  _updateLabelPositions() {
    Object.entries(this.labelSprites).forEach(([id, sprite]) => {
      const pos = this._getNodePosition(id);
      sprite.position.copy(pos);
      sprite.position.y += 3;
    });
  }

  updateFromTimeline(currentIssuers, currentGuarantees, currentPaths, riskMap) {
    this.buildNetwork(currentIssuers, currentGuarantees, currentPaths, riskMap);
  }

  highlightRisk(riskMap) {
    Object.entries(this.nodeMeshes).forEach(([id, mesh]) => {
      const level = riskMap[id];
      if (level === RISK_LEVELS.HIGH) {
        mesh.material.emissiveIntensity = 0.5;
      } else if (level === RISK_LEVELS.MEDIUM) {
        mesh.material.emissiveIntensity = 0.3;
      } else {
        mesh.material.emissiveIntensity = 0.1;
      }
    });
  }

  exportImage() {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }

  _animate() {
    requestAnimationFrame(() => this._animate());
    this.animationTime += 0.016;
    this.controls.update();

    this.particles.forEach(p => {
      p.t += p.speed;
      if (p.t > 1) p.t -= 1;
      if (p.mesh && p.curve) {
        const pos = p.curve.getPointAt(p.t);
        p.mesh.position.copy(pos);
      }
    });

    Object.entries(this.riskHalos).forEach(([id, ring]) => {
      const nodeMesh = this.nodeMeshes[id];
      if (nodeMesh) {
        ring.position.copy(nodeMesh.position);
        ring.lookAt(this.camera.position);
        ring.material.opacity = 0.2 + Math.sin(this.animationTime * 2) * 0.1;
      }
    });

    Object.entries(this.nodeMeshes).forEach(([id, mesh]) => {
      if (mesh.userData.issuerId) {
        const issuer = mesh.userData;
        if (this.selectedNode === id) {
          mesh.scale.setScalar(1.0 + Math.sin(this.animationTime * 3) * 0.08);
        } else {
          mesh.scale.setScalar(1.0);
        }
      }
    });

    this.renderer.render(this.scene, this.camera);
  }
}
