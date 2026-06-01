import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

class Warehouse3DViewer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    this.warehouseGroup = new THREE.Group();
    this.shelvesGroup = new THREE.Group();
    this.forbiddenZonesGroup = new THREE.Group();
    this.blindZonesGroup = new THREE.Group();
    this.routeGroup = new THREE.Group();
    this.violationsGroup = new THREE.Group();
    this.boundaryWarningsGroup = new THREE.Group();
    
    this.showShelves = true;
    this.showZones = true;
    this.showRoute = true;
    
    this.hoveredObject = null;
    this.hoverInfo = document.getElementById('hover-info');
    
    this.init();
    this.bindEvents();
    this.animate();
  }

  init() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f0f1a);
    this.scene.fog = new THREE.Fog(0x0f0f1a, 50, 200);

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    this.camera.position.set(60, 50, 60);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = true;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 150;

    this.setupLighting();
    this.setupGroups();
    this.addGrid();
  }

  setupLighting() {
    const ambientLight = new THREE.AmbientLight(0x404050, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 80, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 200;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    this.scene.add(directionalLight);

    const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x362d1f, 0.3);
    this.scene.add(hemisphereLight);
  }

  setupGroups() {
    this.scene.add(this.warehouseGroup);
    this.scene.add(this.shelvesGroup);
    this.scene.add(this.forbiddenZonesGroup);
    this.scene.add(this.blindZonesGroup);
    this.scene.add(this.routeGroup);
    this.scene.add(this.violationsGroup);
    this.scene.add(this.boundaryWarningsGroup);
  }

  addGrid() {
    const gridHelper = new THREE.GridHelper(100, 50, 0x333355, 0x222244);
    gridHelper.position.y = 0.01;
    this.scene.add(gridHelper);
  }

  clearAll() {
    this.clearGroup(this.warehouseGroup);
    this.clearGroup(this.shelvesGroup);
    this.clearGroup(this.forbiddenZonesGroup);
    this.clearGroup(this.blindZonesGroup);
    this.clearGroup(this.routeGroup);
    this.clearGroup(this.violationsGroup);
    this.clearGroup(this.boundaryWarningsGroup);
  }

  clearGroup(group) {
    while (group.children.length > 0) {
      const child = group.children[0];
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
      group.remove(child);
    }
  }

  loadWarehouse(warehouse) {
    this.clearAll();

    const { width, depth, height } = warehouse;
    
    const floorGeo = new THREE.PlaneGeometry(width, depth);
    const floorMat = new THREE.MeshStandardMaterial({ 
      color: 0x1a1a2e,
      roughness: 0.8,
      metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(width / 2, 0, depth / 2);
    floor.receiveShadow = true;
    this.warehouseGroup.add(floor);

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x2d3748,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });

    const backWallGeo = new THREE.PlaneGeometry(width, height);
    const backWall = new THREE.Mesh(backWallGeo, wallMat);
    backWall.position.set(width / 2, height / 2, 0);
    this.warehouseGroup.add(backWall);

    const leftWallGeo = new THREE.PlaneGeometry(depth, height);
    const leftWall = new THREE.Mesh(leftWallGeo, wallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(0, height / 2, depth / 2);
    this.warehouseGroup.add(leftWall);

    const frameMat = new THREE.LineBasicMaterial({ color: 0x4a5568, linewidth: 2 });
    const corners = [
      [0, 0, 0], [width, 0, 0], [width, 0, depth], [0, 0, depth],
      [0, height, 0], [width, height, 0], [width, height, depth], [0, height, depth]
    ].map(c => new THREE.Vector3(...c));

    const edges = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7]
    ];

    edges.forEach(([i, j]) => {
      const geo = new THREE.BufferGeometry().setFromPoints([corners[i], corners[j]]);
      const line = new THREE.Line(geo, frameMat);
      this.warehouseGroup.add(line);
    });

    this.fitCameraToScene(width, depth, height);
  }

  loadShelves(shelves) {
    shelves.forEach(shelf => {
      const shelfGroup = new THREE.Group();
      
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x4a5568,
        roughness: 0.7,
        metalness: 0.3
      });

      const shelfGeo = new THREE.BoxGeometry(shelf.width, 0.1, shelf.depth);
      const levelHeight = shelf.height / shelf.level_count;
      
      for (let i = 0; i <= shelf.level_count; i++) {
        const shelfMesh = new THREE.Mesh(shelfGeo, bodyMat);
        shelfMesh.position.set(
          shelf.x + shelf.width / 2,
          i * levelHeight,
          shelf.y + shelf.depth / 2
        );
        shelfMesh.castShadow = true;
        shelfMesh.receiveShadow = true;
        shelfGroup.add(shelfMesh);
      }

      const postGeo = new THREE.BoxGeometry(0.1, shelf.height, 0.1);
      const postPositions = [
        [shelf.x, shelf.y],
        [shelf.x + shelf.width, shelf.y],
        [shelf.x, shelf.y + shelf.depth],
        [shelf.x + shelf.width, shelf.y + shelf.depth]
      ];

      postPositions.forEach(([px, py]) => {
        const post = new THREE.Mesh(postGeo, bodyMat);
        post.position.set(px, shelf.height / 2, py);
        post.castShadow = true;
        shelfGroup.add(post);
      });

      const codeMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide
      });
      const codeGeo = new THREE.PlaneGeometry(shelf.width * 0.8, 0.3);
      const codeCanvas = this.createTextCanvas(shelf.code);
      const codeTexture = new THREE.CanvasTexture(codeCanvas);
      codeMat.map = codeTexture;
      
      const codeMesh = new THREE.Mesh(codeGeo, codeMat);
      codeMesh.position.set(
        shelf.x + shelf.width / 2,
        shelf.height + 0.5,
        shelf.y + shelf.depth / 2
      );
      codeMesh.lookAt(shelf.x + shelf.width / 2, shelf.height + 0.5, shelf.y + shelf.depth - 5);
      shelfGroup.add(codeMesh);

      shelfGroup.userData = { type: 'shelf', data: shelf };
      this.shelvesGroup.add(shelfGroup);
    });
  }

  createTextCanvas(text) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    
    return canvas;
  }

  loadForbiddenZones(zones) {
    zones.forEach(zone => {
      const geo = new THREE.BoxGeometry(zone.width, zone.height, zone.depth);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xdc2626,
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide
      });
      
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        zone.x + zone.width / 2,
        zone.z + zone.height / 2,
        zone.y + zone.depth / 2
      );
      
      const edges = new THREE.EdgesGeometry(geo);
      const lineMat = new THREE.LineBasicMaterial({ color: 0xdc2626 });
      const wireframe = new THREE.LineSegments(edges, lineMat);
      mesh.add(wireframe);

      mesh.userData = { type: 'forbiddenZone', data: zone };
      this.forbiddenZonesGroup.add(mesh);
    });
  }

  loadBlindZones(zones) {
    zones.forEach(zone => {
      const geo = new THREE.BoxGeometry(zone.width, zone.height, zone.depth);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide
      });
      
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        zone.x + zone.width / 2,
        zone.z + zone.height / 2,
        zone.y + zone.depth / 2
      );
      
      const edges = new THREE.EdgesGeometry(geo);
      const lineMat = new THREE.LineDashedMaterial({ 
        color: 0xf59e0b,
        dashSize: 0.5,
        gapSize: 0.3
      });
      const wireframe = new THREE.LineSegments(edges, lineMat);
      wireframe.computeLineDistances();
      mesh.add(wireframe);

      mesh.userData = { type: 'blindZone', data: zone };
      this.blindZonesGroup.add(mesh);
    });
  }

  loadRoute(waypoints, config) {
    if (!waypoints || waypoints.length === 0) return;

    const points = waypoints.map(wp => new THREE.Vector3(wp.x, wp.z, wp.y));
    
    const lineMat = new THREE.LineBasicMaterial({ 
      color: 0x3b82f6,
      linewidth: 3
    });
    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(lineGeo, lineMat);
    this.routeGroup.add(line);

    waypoints.forEach((wp, idx) => {
      const isBoundary = wp.z === config.droneMaxAltitude || wp.z === config.droneMinAltitude;
      
      const wpGeo = new THREE.SphereGeometry(isBoundary ? 0.6 : 0.4, 16, 16);
      const wpMat = new THREE.MeshBasicMaterial({
        color: isBoundary ? 0xfbbf24 : 0x3b82f6
      });
      const wpMesh = new THREE.Mesh(wpGeo, wpMat);
      wpMesh.position.set(wp.x, wp.z, wp.y);
      wpMesh.userData = { type: 'waypoint', data: wp, index: idx + 1, isBoundary };
      this.routeGroup.add(wpMesh);

      if (isBoundary) {
        this.addBoundaryWarning(wp, idx + 1);
      }

      const dirGeo = new THREE.ConeGeometry(0.2, 0.5, 8);
      const dirMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
      const dirMesh = new THREE.Mesh(dirGeo, dirMat);
      dirMesh.position.set(wp.x, wp.z + 0.8, wp.y);
      dirMesh.rotation.x = Math.PI / 2;
      this.routeGroup.add(dirMesh);
    });

    const tubePath = new THREE.CatmullRomCurve3(points);
    const tubeGeo = new THREE.TubeGeometry(tubePath, 64, 0.15, 8, false);
    const tubeMat = new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.3
    });
    const tube = new THREE.Mesh(tubeGeo, tubeMat);
    this.routeGroup.add(tube);
  }

  addBoundaryWarning(wp, sequence) {
    const warningGeo = new THREE.RingGeometry(0.8, 1.2, 6);
    const warningMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });
    const warning = new THREE.Mesh(warningGeo, warningMat);
    warning.position.set(wp.x, wp.z + 2, wp.y);
    warning.rotation.x = -Math.PI / 2;
    warning.userData = { type: 'boundaryWarning', wp, sequence };
    this.boundaryWarningsGroup.add(warning);
  }

  loadViolations(violations) {
    violations.forEach((v, idx) => {
      if (v.location_x === null) return;

      const color = v.severity === 'CRITICAL' ? 0xdc2626 : 
                    v.severity === 'WARNING' ? 0xf59e0b : 0x3b82f6;
      
      const size = v.severity === 'CRITICAL' ? 1.2 : 
                   v.severity === 'WARNING' ? 1.0 : 0.8;

      const markerGroup = new THREE.Group();
      
      const baseGeo = new THREE.CylinderGeometry(size * 0.5, size * 0.8, 0.2, 16);
      const baseMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.8
      });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.set(v.location_x, v.location_z + 0.1, v.location_y);
      markerGroup.add(base);

      const beamGeo = new THREE.CylinderGeometry(0.1, 0.1, 20, 8);
      const beamMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.3
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.set(v.location_x, v.location_z + 10, v.location_y);
      markerGroup.add(beam);

      const pulseGeo = new THREE.RingGeometry(size * 0.3, size, 32);
      const pulseMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
      });
      const pulse = new THREE.Mesh(pulseGeo, pulseMat);
      pulse.position.set(v.location_x, v.location_z + 0.15, v.location_y);
      pulse.rotation.x = -Math.PI / 2;
      pulse.userData = { isPulse: true };
      markerGroup.add(pulse);

      markerGroup.userData = { 
        type: 'violation', 
        data: v, 
        index: idx,
        color
      };
      this.violationsGroup.add(markerGroup);
    });
  }

  highlightViolation(violationIndex) {
    const violation = this.violationsGroup.children[violationIndex];
    if (!violation) return;

    this.controls.target.set(
      violation.position.x,
      violation.position.y + 2,
      violation.position.z
    );
    
    const direction = new THREE.Vector3();
    direction.subVectors(this.camera.position, this.controls.target);
    direction.normalize().multiplyScalar(20);
    this.camera.position.copy(this.controls.target).add(direction);
  }

  fitCameraToScene(width, depth, height) {
    const center = new THREE.Vector3(width / 2, height / 2, depth / 2);
    this.controls.target.copy(center);
    
    const maxDim = Math.max(width, depth, height);
    const distance = maxDim * 1.5;
    this.camera.position.set(
      center.x + distance,
      center.y + distance * 0.8,
      center.z + distance
    );
    
    this.controls.minDistance = maxDim * 0.3;
    this.controls.maxDistance = maxDim * 3;
    this.controls.update();
  }

  toggleShelves() {
    this.showShelves = !this.showShelves;
    this.shelvesGroup.visible = this.showShelves;
  }

  toggleZones() {
    this.showZones = !this.showZones;
    this.forbiddenZonesGroup.visible = this.showZones;
    this.blindZonesGroup.visible = this.showZones;
  }

  toggleRoute() {
    this.showRoute = !this.showRoute;
    this.routeGroup.visible = this.showRoute;
    this.violationsGroup.visible = this.showRoute;
    this.boundaryWarningsGroup.visible = this.showRoute;
  }

  resetView() {
    const warehouse = this.warehouseGroup.userData;
    if (warehouse && warehouse.width) {
      this.fitCameraToScene(warehouse.width, warehouse.depth, warehouse.height);
    } else {
      this.camera.position.set(60, 50, 60);
      this.controls.target.set(25, 0, 20);
    }
    this.controls.update();
  }

  setTopView() {
    const target = this.controls.target.clone();
    this.camera.position.set(target.x, 80, target.z);
    this.camera.lookAt(target);
    this.controls.update();
  }

  setFrontView() {
    const target = this.controls.target.clone();
    this.camera.position.set(target.x, target.y + 10, target.z - 60);
    this.camera.lookAt(target);
    this.controls.update();
  }

  bindEvents() {
    window.addEventListener('resize', () => this.onResize());
    this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.renderer.domElement.addEventListener('click', (e) => this.onClick(e));
  }

  onResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  onMouseMove(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const allObjects = [
      ...this.shelvesGroup.children,
      ...this.forbiddenZonesGroup.children,
      ...this.blindZonesGroup.children,
      ...this.routeGroup.children.filter(c => c.userData.type === 'waypoint'),
      ...this.violationsGroup.children
    ];

    const intersects = this.raycaster.intersectObjects(allObjects, true);

    if (intersects.length > 0) {
      let obj = intersects[0].object;
      while (obj.parent && !obj.userData.type) {
        obj = obj.parent;
      }
      
      if (obj.userData.type) {
        this.hoveredObject = obj;
        this.showHoverInfo(obj, event);
        this.renderer.domElement.style.cursor = 'pointer';
      } else {
        this.hideHoverInfo();
        this.renderer.domElement.style.cursor = 'grab';
      }
    } else {
      this.hideHoverInfo();
      this.renderer.domElement.style.cursor = 'grab';
    }
  }

  onClick(event) {
    if (this.hoveredObject && this.hoveredObject.userData.type === 'violation') {
      const data = this.hoveredObject.userData.data;
      console.log('Violation clicked:', data);
    }
  }

  showHoverInfo(obj, event) {
    const { type, data, index } = obj.userData;
    let content = '';

    switch (type) {
      case 'shelf':
        content = `
          <strong>📦 货架 ${data.code}</strong><br>
          尺寸: ${data.width}m × ${data.depth}m × ${data.height}m<br>
          层数: ${data.level_count}<br>
          位置: (${data.x}, ${data.y}, ${data.z})
        `;
        break;
      case 'forbiddenZone':
        content = `
          <strong>🚫 禁飞区 ${data.name}</strong><br>
          类型: ${data.type}<br>
          尺寸: ${data.width}m × ${data.depth}m × ${data.height}m
        `;
        break;
      case 'blindZone':
        content = `
          <strong>👁️ 盲区 ${data.name}</strong><br>
          尺寸: ${data.width}m × ${data.depth}m × ${data.height}m
        `;
        break;
      case 'waypoint':
        content = `
          <strong>✈️ 航点 #${index}</strong><br>
          坐标: (${data.x.toFixed(2)}, ${data.y.toFixed(2)}, ${data.z.toFixed(2)})<br>
          ${data.isBoundary ? '<span style="color:#fbbf24">⚠️ 边界值警告</span>' : ''}
          ${data.action ? `动作: ${data.action}` : ''}
        `;
        break;
      case 'violation':
        content = `
          <strong style="color:${data.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b'}">
            ${data.severity === 'CRITICAL' ? '🔴' : data.severity === 'WARNING' ? '🟡' : '🔵'}
            ${data.code}
          </strong><br>
          ${data.name}<br>
          位置: (${data.location_x.toFixed(2)}, ${data.location_y.toFixed(2)}, ${data.location_z.toFixed(2)})
        `;
        break;
    }

    this.hoverInfo.innerHTML = content;
    this.hoverInfo.classList.add('visible');
  }

  hideHoverInfo() {
    this.hoveredObject = null;
    this.hoverInfo.classList.remove('visible');
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    
    const time = Date.now() * 0.001;
    
    this.violationsGroup.children.forEach(group => {
      group.children.forEach(child => {
        if (child.userData && child.userData.isPulse) {
          const scale = 1 + Math.sin(time * 3) * 0.2;
          child.scale.set(scale, scale, scale);
        }
      });
    });

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.clearAll();
    this.renderer.dispose();
  }
}

export default Warehouse3DViewer;
