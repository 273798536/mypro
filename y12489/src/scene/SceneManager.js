import * as THREE from 'three';

export class SceneManager {
  constructor(container) {
    this.container = container;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.clickableObjects = [];
    this.onObjectClick = null;
    this.animationId = null;
    this.isRotating = false;
    this.rotationSpeed = 0.002;
    
    this.init();
  }

  init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0d1320);
    this.scene.fog = new THREE.Fog(0x0d1320, 20, 60);

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(8, 4, 12);
    this.camera.lookAt(0, 0.5, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.container.appendChild(this.renderer.domElement);

    this.setupLighting();
    this.setupGround();
    this.setupEventListeners();
    this.animate();
  }

  setupLighting() {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(10, 15, 10);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 50;
    mainLight.shadow.camera.left = -15;
    mainLight.shadow.camera.right = 15;
    mainLight.shadow.camera.top = 15;
    mainLight.shadow.camera.bottom = -15;
    mainLight.shadow.bias = -0.0001;
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x6080ff, 0.4);
    fillLight.position.set(-8, 5, -5);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xff8060, 0.3);
    rimLight.position.set(0, 8, -10);
    this.scene.add(rimLight);
  }

  setupGround() {
    const groundGeometry = new THREE.PlaneGeometry(40, 40);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1f2e,
      roughness: 0.9,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const gridHelper = new THREE.GridHelper(40, 40, 0x30363d, 0x21262d);
    gridHelper.position.y = 0.01;
    this.scene.add(gridHelper);
  }

  setupEventListeners() {
    window.addEventListener('resize', () => this.onResize());
    
    this.renderer.domElement.addEventListener('click', (e) => this.onClick(e));
    this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
    
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let cameraAngle = { theta: Math.PI / 4, phi: Math.PI / 6 };
    const cameraDistance = 15;

    this.renderer.domElement.addEventListener('mousedown', (e) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
      this.isRotating = false;
    });

    this.renderer.domElement.addEventListener('mousemove', (e) => {
      if (isDragging) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;
        
        cameraAngle.theta -= deltaX * 0.01;
        cameraAngle.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, cameraAngle.phi + deltaY * 0.01));
        
        const x = cameraDistance * Math.sin(cameraAngle.phi) * Math.cos(cameraAngle.theta);
        const y = cameraDistance * Math.cos(cameraAngle.phi) + 2;
        const z = cameraDistance * Math.sin(cameraAngle.phi) * Math.sin(cameraAngle.theta);
        
        this.camera.position.set(x, y, z);
        this.camera.lookAt(0, 0.5, 0);
        
        previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    });

    this.renderer.domElement.addEventListener('mouseup', () => {
      isDragging = false;
    });

    this.renderer.domElement.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomSpeed = 0.001;
      this.camera.fov = Math.max(20, Math.min(80, this.camera.fov + e.deltaY * zoomSpeed));
      this.camera.updateProjectionMatrix();
    });
  }

  onResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  onClick(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.clickableObjects, true);

    if (intersects.length > 0) {
      let target = intersects[0].object;
      while (target.parent && !target.userData.clickable) {
        target = target.parent;
      }
      if (target.userData.clickable && this.onObjectClick) {
        this.onObjectClick(target, intersects[0]);
      }
    }
  }

  onMouseMove(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.clickableObjects, true);

    this.renderer.domElement.style.cursor = intersects.length > 0 ? 'pointer' : 'grab';
  }

  addClickableObject(object) {
    object.userData.clickable = true;
    this.clickableObjects.push(object);
  }

  removeClickableObject(object) {
    const index = this.clickableObjects.indexOf(object);
    if (index > -1) {
      this.clickableObjects.splice(index, 1);
    }
  }

  highlightObject(object, highlight = true) {
    object.traverse((child) => {
      if (child.isMesh && child.material) {
        if (highlight) {
          child.userData.originalEmissive = child.material.emissive?.getHex() || 0x000000;
          if (child.material.emissive) {
            child.material.emissive.setHex(0x58a6ff);
          }
        } else if (child.userData.originalEmissive !== undefined) {
          child.material.emissive?.setHex(child.userData.originalEmissive);
        }
      }
    });
  }

  getScreenshotDataUrl() {
    return this.renderer.domElement.toDataURL('image/png');
  }

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());

    if (this.isRotating) {
      this.scene.rotation.y += this.rotationSpeed;
    }

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}
