import * as THREE from 'three';
import { SectionPlane, Bounds3D } from './types';
import { CORAL_BOUNDS } from './gameLogic';

export class SceneManager {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private container: HTMLElement;
  private coralGroup: THREE.Group = new THREE.Group();
  private planeMeshes: Map<string, THREE.Mesh> = new Map();
  private measurementMarkers: Map<string, THREE.Mesh> = new Map();
  private highlightMesh: THREE.Mesh | null = null;
  private animationId: number = 0;
  private isDragging: boolean = false;
  private previousMouse: { x: number; y: number } = { x: 0, y: 0 };
  private cameraSpherical: { theta: number; phi: number; radius: number } = {
    theta: Math.PI / 4,
    phi: Math.PI / 3,
    radius: 150,
  };
  private targetSpherical: { theta: number; phi: number; radius: number } = {
    theta: Math.PI / 4,
    phi: Math.PI / 3,
    radius: 150,
  };
  private bleachingProgress: number = 0;
  private bounds: Bounds3D;
  private clippingPlanes: THREE.Plane[] = [];

  constructor(container: HTMLElement) {
    this.container = container;
    this.bounds = CORAL_BOUNDS;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x051020);
    this.scene.fog = new THREE.Fog(0x051020, 200, 400);

    this.camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      1000,
    );
    this.updateCameraPosition();

    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.setupLights();
    this.createCoralReef();
    this.createBoundsBox();
    this.createSeabed();
    this.bindEvents();
    this.animate();
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0x335577, 0.5);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfff5dd, 1.0);
    sun.position.set(50, 80, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 300;
    sun.shadow.camera.left = -80;
    sun.shadow.camera.right = 80;
    sun.shadow.camera.top = 80;
    sun.shadow.camera.bottom = -80;
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0x4488cc, 0.4);
    fill.position.set(-60, 30, -40);
    this.scene.add(fill);

    const point1 = new THREE.PointLight(0x00ddff, 0.6, 150);
    point1.position.set(0, 30, 0);
    this.scene.add(point1);
  }

  private createSeabed(): void {
    const geo = new THREE.PlaneGeometry(300, 300, 50, 50);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const h = Math.sin(x * 0.05) * Math.cos(y * 0.05) * 2 + Math.random() * 0.5;
      pos.setZ(i, h);
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: 0x1a3a2a,
      roughness: 0.9,
      metalness: 0.0,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = this.bounds.minY - 2;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
  }

  private createCoralReef(): void {
    const coralColors = [
      0xff6b6b, 0xff8c42, 0xffd93d, 0x6bcb77, 0x4d96ff,
      0xc084fc, 0xff6f91, 0x00d2d3, 0x54a0ff, 0x5f27cd,
    ];

    const coralShapes: Array<(color: number, scale: number) => THREE.Object3D> = [
      this.createBranchCoral.bind(this),
      this.createBrainCoral.bind(this),
      this.createPlateCoral.bind(this),
      this.createMushroomCoral.bind(this),
    ];

    const clusters = 7;
    for (let c = 0; c < clusters; c++) {
      const cx = (Math.random() - 0.5) * (this.bounds.maxX - this.bounds.minX) * 0.7;
      const cz = (Math.random() - 0.5) * (this.bounds.maxZ - this.bounds.minZ) * 0.7;

      const perCluster = 5 + Math.floor(Math.random() * 6);
      for (let i = 0; i < perCluster; i++) {
        const ox = (Math.random() - 0.5) * 16;
        const oz = (Math.random() - 0.5) * 16;
        const scale = 0.5 + Math.random() * 1.2;
        const colorIdx = Math.floor(Math.random() * coralColors.length);
        const shapeIdx = Math.floor(Math.random() * coralShapes.length);

        const coral = coralShapes[shapeIdx](coralColors[colorIdx], scale);
        coral.position.set(cx + ox, this.bounds.minY + Math.random() * 2, cz + oz);
        coral.rotation.y = Math.random() * Math.PI * 2;
        coral.castShadow = true;
        coral.receiveShadow = true;
        (coral as any).userData.baseColor = coralColors[colorIdx];
        this.coralGroup.add(coral);
      }
    }

    this.scene.add(this.coralGroup);
  }

  private createBranchCoral(color: number, scale: number): THREE.Group {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.7,
      metalness: 0.1,
    });

    const branchCount = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < branchCount; i++) {
      const height = (5 + Math.random() * 10) * scale;
      const radius = (0.6 + Math.random() * 0.6) * scale;
      const geo = new THREE.CylinderGeometry(radius * 0.6, radius, height, 6);
      const branch = new THREE.Mesh(geo, mat);
      branch.position.y = height / 2;
      branch.rotation.z = (Math.random() - 0.5) * 0.6;
      branch.rotation.x = (Math.random() - 0.5) * 0.6;
      branch.castShadow = true;
      group.add(branch);

      const subCount = Math.floor(Math.random() * 3);
      for (let j = 0; j < subCount; j++) {
        const subH = height * (0.3 + Math.random() * 0.3);
        const subGeo = new THREE.CylinderGeometry(radius * 0.3, radius * 0.5, subH, 5);
        const sub = new THREE.Mesh(subGeo, mat);
        sub.position.set(
          (Math.random() - 0.5) * 2,
          height * (0.5 + Math.random() * 0.4),
          (Math.random() - 0.5) * 2,
        );
        sub.rotation.set(
          (Math.random() - 0.5) * Math.PI / 2,
          Math.random() * Math.PI * 2,
          (Math.random() - 0.5) * Math.PI / 2,
        );
        sub.castShadow = true;
        group.add(sub);
      }
    }
    return group;
  }

  private createBrainCoral(color: number, scale: number): THREE.Mesh {
    const geo = new THREE.SphereGeometry(3 * scale, 12, 10);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const nx = pos.getX(i);
      const ny = pos.getY(i);
      const nz = pos.getZ(i);
      const noise = Math.sin(nx * 3) * Math.cos(ny * 3) * Math.sin(nz * 3) * 0.3;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      const newLen = len + noise * scale;
      pos.setXYZ(i, (nx / len) * newLen, (ny / len) * newLen, (nz / len) * newLen);
    }
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.8,
      metalness: 0.0,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.scale.y = 0.7 + Math.random() * 0.3;
    mesh.position.y = 2 * scale;
    return mesh;
  }

  private createPlateCoral(color: number, scale: number): THREE.Group {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.6,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5 * scale, 1 * scale, 2 * scale, 8), mat);
    base.position.y = scale;
    base.castShadow = true;
    group.add(base);

    const plateRadius = (4 + Math.random() * 4) * scale;
    const plateGeo = new THREE.CircleGeometry(plateRadius, 16);
    const pos = plateGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const dist = Math.sqrt(x * x + y * y);
      pos.setZ(i, Math.sin(dist * 1.5) * 0.5 * scale + (dist / plateRadius) * Math.random() * 0.5);
    }
    plateGeo.computeVertexNormals();
    const plate = new THREE.Mesh(plateGeo, mat);
    plate.rotation.x = -Math.PI / 2 + (Math.random() - 0.5) * 0.3;
    plate.position.y = 2 * scale + Math.random() * scale;
    plate.castShadow = true;
    plate.receiveShadow = true;
    group.add(plate);

    return group;
  }

  private createMushroomCoral(color: number, scale: number): THREE.Group {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.7,
      metalness: 0.1,
    });

    const stalk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4 * scale, 0.6 * scale, 3 * scale, 8),
      mat,
    );
    stalk.position.y = 1.5 * scale;
    stalk.castShadow = true;
    group.add(stalk);

    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(2.5 * scale, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      mat,
    );
    cap.position.y = 3 * scale;
    cap.scale.y = 0.5;
    cap.castShadow = true;
    group.add(cap);

    return group;
  }

  private createBoundsBox(): void {
    const w = this.bounds.maxX - this.bounds.minX;
    const h = this.bounds.maxY - this.bounds.minY;
    const d = this.bounds.maxZ - this.bounds.minZ;

    const geo = new THREE.BoxGeometry(w, h, d);
    const edges = new THREE.EdgesGeometry(geo);
    const line = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0x3a5080, transparent: true, opacity: 0.5 }),
    );
    line.position.set(
      (this.bounds.maxX + this.bounds.minX) / 2,
      (this.bounds.maxY + this.bounds.minY) / 2,
      (this.bounds.maxZ + this.bounds.minZ) / 2,
    );
    this.scene.add(line);

    const gridHelper = new THREE.GridHelper(100, 20, 0x1f2b45, 0x152038);
    gridHelper.position.y = this.bounds.minY;
    this.scene.add(gridHelper);
  }

  public setSectionPlanes(planes: SectionPlane[]): void {
    this.clippingPlanes = [];

    planes.forEach((plane) => {
      let existing = this.planeMeshes.get(plane.id);

      if (plane.enabled) {
        const normal = new THREE.Vector3(
          plane.axis === 'x' ? 1 : 0,
          plane.axis === 'y' ? 1 : 0,
          plane.axis === 'z' ? 1 : 0,
        );
        const clipPlane = new THREE.Plane(normal, -plane.position);
        this.clippingPlanes.push(clipPlane);

        if (!existing) {
          const size = 120;
          const geo = new THREE.PlaneGeometry(size, size);
          const mat = new THREE.MeshBasicMaterial({
            color: plane.color,
            transparent: true,
            opacity: 0.12,
            side: THREE.DoubleSide,
            depthWrite: false,
          });
          existing = new THREE.Mesh(geo, mat);

          const edgeGeo = new THREE.EdgesGeometry(geo);
          const edge = new THREE.LineSegments(
            edgeGeo,
            new THREE.LineBasicMaterial({ color: plane.color, transparent: true, opacity: 0.8 }),
          );
          existing.add(edge);
          existing.userData.edge = edge;

          this.scene.add(existing);
          this.planeMeshes.set(plane.id, existing);
        }

        existing.visible = true;
        if (plane.axis === 'x') {
          existing.rotation.y = Math.PI / 2;
          existing.position.set(plane.position, 20, 0);
        } else if (plane.axis === 'y') {
          existing.rotation.x = Math.PI / 2;
          existing.position.set(0, plane.position, 0);
        } else {
          existing.position.set(0, 20, plane.position);
        }
      } else if (existing) {
        existing.visible = false;
      }
    });

    this.renderer.localClippingEnabled = this.clippingPlanes.length > 0;

    this.coralGroup.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat.clippingPlanes !== this.clippingPlanes) {
          mat.clippingPlanes = this.clippingPlanes;
          mat.clipShadows = true;
          mat.needsUpdate = true;
        }
      }
    });

    [...this.planeMeshes.entries()].forEach(([id, mesh]) => {
      if (!planes.find((p) => p.id === id)) {
        this.scene.remove(mesh);
        this.planeMeshes.delete(id);
      }
    });
  }

  public setMeasurementMarkers(measurements: { id: string; position: { x: number; y: number; z: number }; value: number; unit: string }[]): void {
    measurements.forEach((m) => {
      let marker = this.measurementMarkers.get(m.id);
      if (!marker) {
        const geo = new THREE.SphereGeometry(1.2, 12, 12);
        const mat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
        marker = new THREE.Mesh(geo, mat);

        const ringGeo = new THREE.RingGeometry(1.5, 2, 16);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xfbbf24,
          transparent: true,
          opacity: 0.5,
          side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.lookAt(this.camera.position);
        marker.add(ring);

        this.scene.add(marker);
        this.measurementMarkers.set(m.id, marker);
      }
      marker.position.set(m.position.x, m.position.y, m.position.z);
      marker.visible = true;
    });

    [...this.measurementMarkers.entries()].forEach(([id, marker]) => {
      if (!measurements.find((m) => m.id === id)) {
        this.scene.remove(marker);
        this.measurementMarkers.delete(id);
      }
    });
  }

  public highlightPosition(position: { x: number; y: number; z: number } | null): void {
    if (this.highlightMesh) {
      this.scene.remove(this.highlightMesh);
      this.highlightMesh = null;
    }
    if (position) {
      const geo = new THREE.RingGeometry(3, 4, 32);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x7fa8ff,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
      });
      this.highlightMesh = new THREE.Mesh(geo, mat);
      this.highlightMesh.rotation.x = -Math.PI / 2;
      this.highlightMesh.position.set(position.x, position.y + 0.5, position.z);
      this.scene.add(this.highlightMesh);
    }
  }

  public setBleachingProgress(progress: number): void {
    this.bleachingProgress = Math.max(0, Math.min(1, progress));
    this.coralGroup.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mesh.userData.baseColor !== undefined) {
          const baseColor = new THREE.Color(mesh.userData.baseColor);
          const white = new THREE.Color(0xffffff);
          mat.color.copy(baseColor).lerp(white, this.bleachingProgress);
        }
      }
    });
  }

  private updateCameraPosition(): void {
    const target = new THREE.Vector3(0, 20, 0);
    this.camera.position.x = target.x + this.cameraSpherical.radius * Math.sin(this.cameraSpherical.phi) * Math.sin(this.cameraSpherical.theta);
    this.camera.position.y = target.y + this.cameraSpherical.radius * Math.cos(this.cameraSpherical.phi);
    this.camera.position.z = target.z + this.cameraSpherical.radius * Math.sin(this.cameraSpherical.phi) * Math.cos(this.cameraSpherical.theta);
    this.camera.lookAt(target);
  }

  public getCameraPosition(): { x: number; y: number; z: number } {
    return { x: this.camera.position.x, y: this.camera.position.y, z: this.camera.position.z };
  }

  public takeScreenshot(): string {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }

  private bindEvents(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.previousMouse = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.previousMouse.x;
      const dy = e.clientY - this.previousMouse.y;
      this.targetSpherical.theta -= dx * 0.005;
      this.targetSpherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.targetSpherical.phi - dy * 0.005));
      this.previousMouse = { x: e.clientX, y: e.clientY };
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.targetSpherical.radius = Math.max(60, Math.min(300, this.targetSpherical.radius + e.deltaY * 0.2));
    }, { passive: false });

    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private handleResize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    this.cameraSpherical.theta += (this.targetSpherical.theta - this.cameraSpherical.theta) * 0.1;
    this.cameraSpherical.phi += (this.targetSpherical.phi - this.cameraSpherical.phi) * 0.1;
    this.cameraSpherical.radius += (this.targetSpherical.radius - this.cameraSpherical.radius) * 0.1;
    this.updateCameraPosition();

    const t = performance.now() * 0.001;
    this.measurementMarkers.forEach((marker) => {
      const ring = marker.children[0] as THREE.Mesh;
      if (ring) {
        ring.lookAt(this.camera.position);
        ring.scale.setScalar(1 + Math.sin(t * 2) * 0.15);
      }
    });

    if (this.highlightMesh) {
      const s = 1 + Math.sin(t * 3) * 0.2;
      this.highlightMesh.scale.setScalar(s);
    }

    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.handleResize.bind(this));
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
