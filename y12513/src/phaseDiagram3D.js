import * as THREE from 'three';
import { materials, calculateProperties } from './data.js';

export class PhaseDiagram3D {
  constructor(container) {
    this.container = container;
    this.currentMaterial = 'H2O';
    this.currentT = 300;
    this.currentP = 101325;
    this.isPlaying = false;
    this.pathPoints = [];
    this.currentPathIndex = 0;
    this.playbackSpeed = 1;
    
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.phaseSurfaces = [];
    this.saturationCurve = null;
    this.currentPoint = null;
    this.pathLine = null;
    this.criticalPoint = null;
    this.triplePoint = null;
    this.axesHelper = null;
    
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.hoveredObject = null;
    
    this.onObjectClick = null;
    this.onObjectHover = null;
    
    this.init();
  }
  
  init() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0f);
    this.scene.fog = new THREE.Fog(0x0a0a0f, 50, 150);
    
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    this.camera.position.set(40, 30, 40);
    this.camera.lookAt(15, 15, 15);
    
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    this.container.appendChild(this.renderer.domElement);
    
    this.setupLighting();
    this.setupControls();
    this.createAxes();
    this.createPhaseDiagram();
    this.createCurrentPoint();
    this.createPathLine();
    
    this.setupEventListeners();
    this.animate();
  }
  
  setupLighting() {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    this.scene.add(ambientLight);
    
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(50, 80, 50);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 500;
    mainLight.shadow.camera.left = -50;
    mainLight.shadow.camera.right = 50;
    mainLight.shadow.camera.top = 50;
    mainLight.shadow.camera.bottom = -50;
    this.scene.add(mainLight);
    
    const fillLight = new THREE.DirectionalLight(0x667eea, 0.4);
    fillLight.position.set(-30, 20, -30);
    this.scene.add(fillLight);
    
    const rimLight = new THREE.DirectionalLight(0xba68c8, 0.3);
    rimLight.position.set(0, 50, -50);
    this.scene.add(rimLight);
  }
  
  setupControls() {
    this.isDragging = false;
    this.previousMousePosition = { x: 0, y: 0 };
    this.spherical = { theta: Math.PI / 4, phi: Math.PI / 4, radius: 60 };
    this.target = new THREE.Vector3(15, 15, 15);
    this.panOffset = new THREE.Vector2(0, 0);
  }
  
  createAxes() {
    const axesGroup = new THREE.Group();
    
    const axisLength = 35;
    const axisMaterial = new THREE.LineBasicMaterial({ color: 0x4a4a6a });
    const axisMaterialBold = new THREE.LineBasicMaterial({ color: 0x667eea, linewidth: 2 });
    
    const tAxisGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(axisLength, 0, 0)
    ]);
    const tAxis = new THREE.Line(tAxisGeom, axisMaterialBold);
    axesGroup.add(tAxis);
    
    const pAxisGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, axisLength, 0)
    ]);
    const pAxis = new THREE.Line(pAxisGeom, axisMaterialBold);
    axesGroup.add(pAxis);
    
    const vAxisGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, axisLength)
    ]);
    const vAxis = new THREE.Line(vAxisGeom, axisMaterialBold);
    axesGroup.add(vAxis);
    
    for (let i = 5; i <= axisLength; i += 5) {
      const tickGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(i, -0.5, 0),
        new THREE.Vector3(i, 0.5, 0)
      ]);
      const tick = new THREE.Line(tickGeom, axisMaterial);
      axesGroup.add(tick);
      
      const tickGeomP = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-0.5, i, 0),
        new THREE.Vector3(0.5, i, 0)
      ]);
      const tickP = new THREE.Line(tickGeomP, axisMaterial);
      axesGroup.add(tickP);
      
      const tickGeomV = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, -0.5, i),
        new THREE.Vector3(0, 0.5, i)
      ]);
      const tickV = new THREE.Line(tickGeomV, axisMaterial);
      axesGroup.add(tickV);
    }
    
    this.scene.add(axesGroup);
    this.axesHelper = axesGroup;
    
    const gridHelper = new THREE.GridHelper(50, 50, 0x2a2a4a, 0x1a1a2e);
    gridHelper.position.y = 0.01;
    this.scene.add(gridHelper);
  }
  
  createPhaseDiagram() {
    this.clearPhaseSurfaces();
    
    const mat = materials[this.currentMaterial];
    if (!mat) return;
    
    const Tc = this.scaleTemperature(mat.critical.temperature);
    const Pc = this.scalePressure(mat.critical.pressure);
    const Tt = this.scaleTemperature(mat.triple.temperature);
    const Pt = this.scalePressure(mat.triple.pressure);
    
    mat.phases.forEach(phase => {
      phase.regions.forEach(region => {
        const surface = this.createPhaseSurface(phase, region, mat);
        if (surface) {
          this.phaseSurfaces.push(surface);
          this.scene.add(surface);
        }
      });
    });
    
    this.createSaturationCurve(mat);
    this.createCriticalPoint(mat);
    this.createTriplePoint(mat);
    this.createPhaseLabels(mat);
  }
  
  createPhaseSurface(phase, region, mat) {
    const Tmin = this.scaleTemperature(Math.max(region.Tmin, 100));
    const Tmax = this.scaleTemperature(Math.min(region.Tmax, 1000));
    const Pmin = this.scalePressure(Math.max(region.Pmin, 100));
    const Pmax = this.scalePressure(Math.min(region.Pmax, 1e7));
    
    if (Tmax <= Tmin || Pmax <= Pmin) return null;
    
    const geometry = new THREE.PlaneGeometry(Tmax - Tmin, Pmax - Pmin, 30, 30);
    const positions = geometry.attributes.position;
    
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      
      const T = this.unscaleTemperature(x + Tmin);
      const P = this.unscalePressure(y + Pmin);
      
      const props = calculateProperties(this.currentMaterial, T, P);
      let v = this.scaleVolume(props ? props.specificVolume : 1e-3);
      
      if (!isFinite(v)) v = 5;
      
      positions.setZ(i, v);
    }
    
    geometry.computeVertexNormals();
    
    const material = new THREE.MeshPhongMaterial({
      color: phase.color,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      shininess: 30,
      wireframe: false
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(Tmin + (Tmax - Tmin) / 2, Pmin + (Pmax - Pmin) / 2, 0);
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    
    mesh.userData = {
      type: 'phaseSurface',
      phaseName: phase.name,
      phaseColor: phase.color,
      material: this.currentMaterial
    };
    
    const wireframeGeometry = new THREE.WireframeGeometry(geometry);
    const wireframeMaterial = new THREE.LineBasicMaterial({
      color: phase.color,
      opacity: 0.3,
      transparent: true
    });
    const wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
    mesh.add(wireframe);
    
    return mesh;
  }
  
  createSaturationCurve(mat) {
    if (this.saturationCurve) {
      this.scene.remove(this.saturationCurve);
    }
    
    const points = [];
    if (mat.saturationData && mat.saturationData.length >= 2) {
      mat.saturationData.forEach(point => {
        const x = this.scaleTemperature(point.T);
        const y = this.scalePressure(point.P);
        const props = calculateProperties(this.currentMaterial, point.T, point.P);
        const z = this.scaleVolume(props ? props.specificVolume : 1e-3);
        
        if (isFinite(x) && isFinite(y) && isFinite(z)) {
          points.push(new THREE.Vector3(x, y, z));
        }
      });
    }
    
    if (points.length < 2) {
      const Tt = this.scaleTemperature(mat.triple.temperature);
      const Pt = this.scalePressure(mat.triple.pressure);
      const Tc = this.scaleTemperature(mat.critical.temperature);
      const Pc = this.scalePressure(mat.critical.pressure);
      const vt = this.scaleVolume(mat.triple.volume);
      const vc = this.scaleVolume(mat.critical.volume);
      
      if (isFinite(Tt) && isFinite(Pt) && isFinite(vt) && isFinite(Tc) && isFinite(Pc) && isFinite(vc)) {
        points.push(new THREE.Vector3(Tt, Pt, vt));
        points.push(new THREE.Vector3(Tc, Pc, vc));
      }
    }
    
    if (points.length < 2) return;
    
    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeometry = new THREE.TubeGeometry(curve, 100, 0.15, 8, false);
    const tubeMaterial = new THREE.MeshPhongMaterial({
      color: 0xffd54f,
      emissive: 0xffd54f,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.9
    });
    
    this.saturationCurve = new THREE.Mesh(tubeGeometry, tubeMaterial);
    this.saturationCurve.castShadow = true;
    this.saturationCurve.userData = {
      type: 'saturationCurve',
      name: '饱和曲线',
      description: '液气两相平衡分界线，终止于临界点'
    };
    
    this.scene.add(this.saturationCurve);
  }
  
  createCriticalPoint(mat) {
    if (this.criticalPoint) {
      this.scene.remove(this.criticalPoint);
    }
    
    const x = this.scaleTemperature(mat.critical.temperature);
    const y = this.scalePressure(mat.critical.pressure);
    const z = this.scaleVolume(mat.critical.volume);
    
    const geometry = new THREE.SphereGeometry(0.8, 32, 32);
    const material = new THREE.MeshPhongMaterial({
      color: 0xff6b6b,
      emissive: 0xff6b6b,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.9
    });
    
    this.criticalPoint = new THREE.Mesh(geometry, material);
    this.criticalPoint.position.set(x, y, z);
    this.criticalPoint.castShadow = true;
    this.criticalPoint.userData = {
      type: 'criticalPoint',
      name: '临界点',
      T: mat.critical.temperature,
      P: mat.critical.pressure,
      v: mat.critical.volume,
      description: `T=${mat.critical.temperature.toFixed(1)} K, P=${mat.critical.pressure.toExponential(2)} Pa\n在此点以上液气两相的区别消失`
    };
    
    this.scene.add(this.criticalPoint);
    
    const ringGeometry = new THREE.RingGeometry(1.2, 1.5, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6b6b,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.lookAt(this.camera.position);
    this.criticalPoint.add(ring);
  }
  
  createTriplePoint(mat) {
    if (this.triplePoint) {
      this.scene.remove(this.triplePoint);
    }
    
    const x = this.scaleTemperature(mat.triple.temperature);
    const y = this.scalePressure(mat.triple.pressure);
    const z = this.scaleVolume(mat.triple.volume);
    
    const geometry = new THREE.OctahedronGeometry(0.6, 0);
    const material = new THREE.MeshPhongMaterial({
      color: 0x51cf66,
      emissive: 0x51cf66,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.9
    });
    
    this.triplePoint = new THREE.Mesh(geometry, material);
    this.triplePoint.position.set(x, y, z);
    this.triplePoint.castShadow = true;
    this.triplePoint.userData = {
      type: 'triplePoint',
      name: '三相点',
      T: mat.triple.temperature,
      P: mat.triple.pressure,
      v: mat.triple.volume,
      description: `T=${mat.triple.temperature.toFixed(2)} K, P=${mat.triple.pressure.toFixed(1)} Pa\n固、液、气三相共存的唯一状态点`
    };
    
    this.scene.add(this.triplePoint);
  }
  
  createPhaseLabels(mat) {
    const labelPositions = [
      { name: '固态', pos: new THREE.Vector3(this.scaleTemperature(150), this.scalePressure(1e6), this.scaleVolume(1e-3)) },
      { name: '液态', pos: new THREE.Vector3(this.scaleTemperature(350), this.scalePressure(1e6), this.scaleVolume(1e-3)) },
      { name: '气态', pos: new THREE.Vector3(this.scaleTemperature(400), this.scalePressure(1e4), this.scaleVolume(0.01)) },
      { name: '超临界', pos: new THREE.Vector3(this.scaleTemperature(800), this.scalePressure(5e6), this.scaleVolume(0.005)) }
    ];
    
    labelPositions.forEach(labelInfo => {
      const phase = mat.phases.find(p => p.name === labelInfo.name);
      if (phase) {
        const label = this.createTextLabel(labelInfo.name, phase.color);
        label.position.copy(labelInfo.pos);
        this.scene.add(label);
        this.phaseSurfaces.push(label);
      }
    });
  }
  
  createTextLabel(text, color) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;
    
    context.fillStyle = 'rgba(26, 26, 46, 0.8)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.font = 'bold 24px sans-serif';
    context.fillStyle = '#' + color.toString(16).padStart(6, '0');
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true
    });
    
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(8, 2, 1);
    sprite.userData = {
      type: 'label',
      name: text
    };
    
    return sprite;
  }
  
  createCurrentPoint() {
    const geometry = new THREE.SphereGeometry(0.5, 24, 24);
    const material = new THREE.MeshPhongMaterial({
      color: 0x667eea,
      emissive: 0x667eea,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 1
    });
    
    this.currentPoint = new THREE.Mesh(geometry, material);
    this.currentPoint.castShadow = true;
    this.currentPoint.userData = {
      type: 'currentPoint',
      name: '当前状态点'
    };
    
    this.updateCurrentPointPosition();
    this.scene.add(this.currentPoint);
    
    const glowGeometry = new THREE.SphereGeometry(0.8, 24, 24);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x667eea,
      transparent: true,
      opacity: 0.2
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.currentPoint.add(glow);
  }
  
  createPathLine() {
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.LineBasicMaterial({
      color: 0x667eea,
      linewidth: 2,
      transparent: true,
      opacity: 0.8
    });
    
    this.pathLine = new THREE.Line(geometry, material);
    this.pathLine.userData = {
      type: 'pathLine',
      name: '状态路径'
    };
    
    this.scene.add(this.pathLine);
  }
  
  updateCurrentPointPosition() {
    if (!this.currentPoint) return;
    
    const props = calculateProperties(this.currentMaterial, this.currentT, this.currentP);
    const x = this.scaleTemperature(this.currentT);
    const y = this.scalePressure(this.currentP);
    const z = this.scaleVolume(props ? props.specificVolume : 1e-3);
    
    this.currentPoint.position.set(x, y, z);
    
    if (props) {
      this.currentPoint.material.color.setHex(props.phaseColor);
      this.currentPoint.material.emissive.setHex(props.phaseColor);
    }
  }
  
  setMaterial(materialKey) {
    this.currentMaterial = materialKey;
    this.createPhaseDiagram();
    this.updateCurrentPointPosition();
    this.clearPath();
  }
  
  setParameters(T, P) {
    this.currentT = T;
    this.currentP = P;
    this.updateCurrentPointPosition();
    
    if (this.isPlaying) {
      this.addPathPoint(T, P);
    }
  }
  
  addPathPoint(T, P) {
    const props = calculateProperties(this.currentMaterial, T, P);
    const x = this.scaleTemperature(T);
    const y = this.scalePressure(P);
    const z = this.scaleVolume(props ? props.specificVolume : 1e-3);
    
    this.pathPoints.push(new THREE.Vector3(x, y, z));
    this.updatePathLine();
  }
  
  updatePathLine() {
    if (this.pathPoints.length < 2) return;
    
    const positions = new Float32Array(this.pathPoints.length * 3);
    this.pathPoints.forEach((point, i) => {
      positions[i * 3] = point.x;
      positions[i * 3 + 1] = point.y;
      positions[i * 3 + 2] = point.z;
    });
    
    this.pathLine.geometry.dispose();
    this.pathLine.geometry = new THREE.BufferGeometry();
    this.pathLine.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  }
  
  clearPath() {
    this.pathPoints = [];
    this.currentPathIndex = 0;
    if (this.pathLine) {
      this.pathLine.geometry.dispose();
      this.pathLine.geometry = new THREE.BufferGeometry();
    }
  }
  
  startPlayback(pathPoints) {
    this.isPlaying = true;
    this.clearPath();
    this.playbackPath = pathPoints;
    this.currentPathIndex = 0;
  }
  
  pausePlayback() {
    this.isPlaying = false;
  }
  
  resumePlayback() {
    this.isPlaying = true;
  }
  
  resetPlayback() {
    this.isPlaying = false;
    this.currentPathIndex = 0;
    this.clearPath();
  }
  
  setPlaybackSpeed(speed) {
    this.playbackSpeed = speed;
  }
  
  clearPhaseSurfaces() {
    this.phaseSurfaces.forEach(surface => {
      if (surface.geometry) surface.geometry.dispose();
      if (surface.material) {
        if (Array.isArray(surface.material)) {
          surface.material.forEach(m => m.dispose());
        } else {
          surface.material.dispose();
        }
      }
      this.scene.remove(surface);
    });
    this.phaseSurfaces = [];
    
    if (this.saturationCurve) {
      this.scene.remove(this.saturationCurve);
      this.saturationCurve = null;
    }
    if (this.criticalPoint) {
      this.scene.remove(this.criticalPoint);
      this.criticalPoint = null;
    }
    if (this.triplePoint) {
      this.scene.remove(this.triplePoint);
      this.triplePoint = null;
    }
  }
  
  scaleTemperature(T) {
    return (T - 100) / 900 * 30 + 2;
  }
  
  unscaleTemperature(scaled) {
    return (scaled - 2) / 30 * 900 + 100;
  }
  
  scalePressure(P) {
    return Math.log10(P / 100) / 8 * 30 + 2;
  }
  
  unscalePressure(scaled) {
    return Math.pow(10, (scaled - 2) / 30 * 8) * 100;
  }
  
  scaleVolume(v) {
    return Math.log10(v * 1000 + 0.1) / 4 * 20 + 2;
  }
  
  unscaleVolume(scaled) {
    return (Math.pow(10, (scaled - 2) / 20 * 4) - 0.1) / 1000;
  }
  
  setupEventListeners() {
    const canvas = this.renderer.domElement;
    
    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    canvas.addEventListener('wheel', (e) => this.onWheel(e));
    canvas.addEventListener('click', (e) => this.onClick(e));
    
    window.addEventListener('resize', () => this.onResize());
  }
  
  onMouseDown(e) {
    this.isDragging = true;
    this.previousMousePosition = { x: e.clientX, y: e.clientY };
    
    if (e.button === 2) {
      this.isPanning = true;
    } else {
      this.isPanning = false;
    }
  }
  
  onMouseMove(e) {
    const deltaX = e.clientX - this.previousMousePosition.x;
    const deltaY = e.clientY - this.previousMousePosition.y;
    
    if (this.isDragging && this.isPanning) {
      this.panOffset.x += deltaX * 0.1;
      this.panOffset.y -= deltaY * 0.1;
    } else if (this.isDragging) {
      this.spherical.theta -= deltaX * 0.01;
      this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi - deltaY * 0.01));
    }
    
    this.previousMousePosition = { x: e.clientX, y: e.clientY };
    this.updateCameraPosition();
    
    this.updateMouse(e);
    this.checkHover();
  }
  
  onMouseUp(e) {
    this.isDragging = false;
    this.isPanning = false;
  }
  
  onWheel(e) {
    e.preventDefault();
    this.spherical.radius = Math.max(10, Math.min(150, this.spherical.radius + e.deltaY * 0.05));
    this.updateCameraPosition();
  }
  
  onClick(e) {
    this.updateMouse(e);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const allObjects = [
      ...this.phaseSurfaces,
      this.saturationCurve,
      this.criticalPoint,
      this.triplePoint,
      this.currentPoint,
      this.pathLine
    ].filter(Boolean);
    
    const intersects = this.raycaster.intersectObjects(allObjects, true);
    
    if (intersects.length > 0) {
      let object = intersects[0].object;
      while (object.parent && !object.userData.type) {
        object = object.parent;
      }
      
      if (object.userData.type && this.onObjectClick) {
        this.onObjectClick(object.userData, intersects[0].point);
      }
    }
  }
  
  updateMouse(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }
  
  checkHover() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const allObjects = [
      ...this.phaseSurfaces,
      this.saturationCurve,
      this.criticalPoint,
      this.triplePoint,
      this.currentPoint
    ].filter(Boolean);
    
    const intersects = this.raycaster.intersectObjects(allObjects, true);
    
    if (intersects.length > 0) {
      let object = intersects[0].object;
      while (object.parent && !object.userData.type) {
        object = object.parent;
      }
      
      if (object !== this.hoveredObject) {
        this.hoveredObject = object;
        if (this.onObjectHover) {
          this.onObjectHover(object.userData, intersects[0].point, true);
        }
      }
    } else if (this.hoveredObject) {
      if (this.onObjectHover) {
        this.onObjectHover(null, null, false);
      }
      this.hoveredObject = null;
    }
  }
  
  updateCameraPosition() {
    const x = this.spherical.radius * Math.sin(this.spherical.phi) * Math.cos(this.spherical.theta);
    const y = this.spherical.radius * Math.cos(this.spherical.phi);
    const z = this.spherical.radius * Math.sin(this.spherical.phi) * Math.sin(this.spherical.theta);
    
    this.camera.position.set(
      x + this.target.x + this.panOffset.x,
      y + this.target.y + this.panOffset.y,
      z + this.target.z
    );
    
    this.camera.lookAt(
      this.target.x + this.panOffset.x,
      this.target.y + this.panOffset.y,
      this.target.z
    );
  }
  
  onResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
  }
  
  animate() {
    requestAnimationFrame(() => this.animate());
    
    if (this.isPlaying && this.playbackPath && this.playbackPath.length > 0) {
      const index = Math.floor(this.currentPathIndex);
      if (index >= 0 && index < this.playbackPath.length) {
        const point = this.playbackPath[index];
        if (point && point.T !== undefined && point.P !== undefined) {
          this.setParameters(point.T, point.P);
        }
      }
      
      this.currentPathIndex += this.playbackSpeed * 0.5;
      
      if (this.currentPathIndex >= this.playbackPath.length - 1) {
        this.isPlaying = false;
      }
    }
    
    if (this.criticalPoint) {
      this.criticalPoint.children[0].rotation.z += 0.01;
    }
    
    this.renderer.render(this.scene, this.camera);
  }
  
  dispose() {
    this.clearPhaseSurfaces();
    
    if (this.currentPoint) {
      this.currentPoint.geometry.dispose();
      this.currentPoint.material.dispose();
      this.scene.remove(this.currentPoint);
    }
    
    if (this.pathLine) {
      this.pathLine.geometry.dispose();
      this.pathLine.material.dispose();
      this.scene.remove(this.pathLine);
    }
    
    if (this.axesHelper) {
      this.scene.remove(this.axesHelper);
    }
    
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}
