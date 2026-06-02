import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const _SceneManager = (() => {
    const SCALE_FACTOR = 1e-11;
    const VISUAL_SCALE = 5e-6;

    class Scene3D {
        constructor(canvasId) {
            this.canvas = document.getElementById(canvasId);
            if (!this.canvas) {
                throw new Error(`Canvas ${canvasId} not found`);
            }

            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x000008);

            this.camera = new THREE.PerspectiveCamera(
                60,
                this.canvas.clientWidth / this.canvas.clientHeight,
                0.1,
                10000
            );
            this.camera.position.set(150, 100, 150);

            this.renderer = new THREE.WebGLRenderer({
                canvas: this.canvas,
                antialias: true,
                alpha: true
            });
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

            this.controls = new OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.minDistance = 1;
            this.controls.maxDistance = 2000;

            this.bodyMeshes = new Map();
            this.orbitLines = new Map();
            this.trailLines = new Map();
            this.labels = new Map();

            this.showOrbits = true;
            this.showTrails = false;
            this.visibleTypes = new Set(['star', 'planet', 'moon', 'asteroid', 'comet', 'blackhole']);

            this.raycaster = new THREE.Raycaster();
            this.mouse = new THREE.Vector2();
            this.selectedBody = null;
            this.hoveredBody = null;

            this.onBodyClick = null;
            this.onBodyHover = null;

            this.clock = new THREE.Clock();
            this.animationId = null;

            this.initLights();
            this.initGrid();
            this.initStars();
            this.initEventListeners();
        }

        initLights() {
            const ambientLight = new THREE.AmbientLight(0x404050, 0.4);
            this.scene.add(ambientLight);

            const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
            dirLight.position.set(100, 100, 50);
            dirLight.castShadow = true;
            dirLight.shadow.mapSize.width = 2048;
            dirLight.shadow.mapSize.height = 2048;
            dirLight.shadow.camera.near = 0.5;
            dirLight.shadow.camera.far = 500;
            dirLight.shadow.camera.left = -200;
            dirLight.shadow.camera.right = 200;
            dirLight.shadow.camera.top = 200;
            dirLight.shadow.camera.bottom = -200;
            this.scene.add(dirLight);

            const pointLight = new THREE.PointLight(0xffd700, 2, 500);
            pointLight.position.set(0, 0, 0);
            this.scene.add(pointLight);
        }

        initGrid() {
            const gridHelper = new THREE.GridHelper(500, 100, 0x1a1a3a, 0x0f0f2a);
            gridHelper.position.y = -50;
            this.scene.add(gridHelper);

            const axesHelper = new THREE.AxesHelper(50);
            axesHelper.position.y = -49;
            this.scene.add(axesHelper);
        }

        initStars() {
            const starGeometry = new THREE.BufferGeometry();
            const starCount = 5000;
            const positions = new Float32Array(starCount * 3);
            const colors = new Float32Array(starCount * 3);

            for (let i = 0; i < starCount; i++) {
                const radius = 500 + Math.random() * 1500;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);

                positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
                positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
                positions[i * 3 + 2] = radius * Math.cos(phi);

                const brightness = 0.5 + Math.random() * 0.5;
                const colorChoice = Math.random();
                if (colorChoice < 0.6) {
                    colors[i * 3] = brightness;
                    colors[i * 3 + 1] = brightness;
                    colors[i * 3 + 2] = brightness;
                } else if (colorChoice < 0.8) {
                    colors[i * 3] = brightness;
                    colors[i * 3 + 1] = brightness * 0.9;
                    colors[i * 3 + 2] = brightness * 0.7;
                } else {
                    colors[i * 3] = brightness * 0.7;
                    colors[i * 3 + 1] = brightness * 0.8;
                    colors[i * 3 + 2] = brightness;
                }
            }

            starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

            const starMaterial = new THREE.PointsMaterial({
                size: 0.5,
                vertexColors: true,
                transparent: true,
                opacity: 0.8
            });

            this.starField = new THREE.Points(starGeometry, starMaterial);
            this.scene.add(this.starField);
        }

        initEventListeners() {
            window.addEventListener('resize', () => this.onResize());
            
            this.canvas.addEventListener('click', (e) => this.onCanvasClick(e));
            this.canvas.addEventListener('mousemove', (e) => this.onCanvasMouseMove(e));
            this.canvas.addEventListener('mouseleave', () => this.onCanvasMouseLeave());
        }

        createBodyMesh(body) {
            const visualRadius = Math.max(0.5, Math.log10(body.radius + 1) * VISUAL_SCALE * 10);
            
            const geometry = new THREE.SphereGeometry(visualRadius, 32, 32);
            
            let material;
            if (body.type === 'star') {
                material = new THREE.MeshBasicMaterial({
                    color: body.color,
                    transparent: true,
                    opacity: 0.95
                });
                
                const glowGeometry = new THREE.SphereGeometry(visualRadius * 1.5, 32, 32);
                const glowMaterial = new THREE.MeshBasicMaterial({
                    color: body.color,
                    transparent: true,
                    opacity: 0.3,
                    side: THREE.BackSide
                });
                const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
                
                const group = new THREE.Group();
                const coreMesh = new THREE.Mesh(geometry, material);
                coreMesh.castShadow = true;
                coreMesh.receiveShadow = true;
                group.add(coreMesh);
                group.add(glowMesh);
                group.userData.bodyId = body.id;
                group.userData.bodyType = body.type;
                
                return { mesh: group, coreMesh };
            } else if (body.type === 'blackhole') {
                material = new THREE.MeshBasicMaterial({
                    color: 0x000000
                });
                
                const accretionGeometry = new THREE.RingGeometry(visualRadius * 1.5, visualRadius * 3, 64);
                const accretionMaterial = new THREE.MeshBasicMaterial({
                    color: 0xff6600,
                    transparent: true,
                    opacity: 0.6,
                    side: THREE.DoubleSide
                });
                const accretionDisk = new THREE.Mesh(accretionGeometry, accretionMaterial);
                accretionDisk.rotation.x = Math.PI / 2;
                
                const group = new THREE.Group();
                const coreMesh = new THREE.Mesh(geometry, material);
                group.add(coreMesh);
                group.add(accretionDisk);
                group.userData.bodyId = body.id;
                group.userData.bodyType = body.type;
                
                return { mesh: group, coreMesh };
            } else {
                material = new THREE.MeshStandardMaterial({
                    color: body.color,
                    roughness: body.type === 'moon' ? 0.9 : 0.7,
                    metalness: body.type === 'planet' ? 0.1 : 0.0
                });
            }

            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.userData.bodyId = body.id;
            mesh.userData.bodyType = body.type;

            return { mesh, coreMesh: mesh };
        }

        createOrbitLine(body) {
            const geometry = new THREE.BufferGeometry();
            const positions = new Float32Array(1000 * 3);
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            
            const material = new THREE.LineBasicMaterial({
                color: body.color,
                transparent: true,
                opacity: 0.3
            });

            const line = new THREE.Line(geometry, material);
            return line;
        }

        createTrailLine(body) {
            const geometry = new THREE.BufferGeometry();
            const positions = new Float32Array(body.maxTrailLength * 3);
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geometry.setDrawRange(0, 0);
            
            const material = new THREE.LineBasicMaterial({
                color: body.color,
                transparent: true,
                opacity: 0.6
            });

            const line = new THREE.Line(geometry, material);
            return line;
        }

        addBody(body) {
            const { mesh, coreMesh } = this.createBodyMesh(body);
            
            const scaledPos = this.toVisualPosition(body.position);
            mesh.position.copy(scaledPos);

            this.bodyMeshes.set(body.id, { mesh, coreMesh, body });
            this.scene.add(mesh);

            const orbitLine = this.createOrbitLine(body);
            this.orbitLines.set(body.id, orbitLine);
            this.scene.add(orbitLine);

            const trailLine = this.createTrailLine(body);
            this.trailLines.set(body.id, trailLine);
            this.scene.add(trailLine);

            this.updateVisibility();
        }

        removeBody(bodyId) {
            const meshData = this.bodyMeshes.get(bodyId);
            if (meshData) {
                this.scene.remove(meshData.mesh);
                meshData.mesh.traverse((child) => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                });
                this.bodyMeshes.delete(bodyId);
            }

            const orbitLine = this.orbitLines.get(bodyId);
            if (orbitLine) {
                this.scene.remove(orbitLine);
                orbitLine.geometry.dispose();
                orbitLine.material.dispose();
                this.orbitLines.delete(bodyId);
            }

            const trailLine = this.trailLines.get(bodyId);
            if (trailLine) {
                this.scene.remove(trailLine);
                trailLine.geometry.dispose();
                trailLine.material.dispose();
                this.trailLines.delete(bodyId);
            }
        }

        updateBodyPosition(body) {
            const meshData = this.bodyMeshes.get(body.id);
            if (!meshData) return;

            const scaledPos = this.toVisualPosition(body.position);
            meshData.mesh.position.copy(scaledPos);

            if (body.type === 'star') {
                const time = Date.now() * 0.001;
                meshData.mesh.rotation.y = time * 0.1;
            } else if (body.type === 'blackhole') {
                const time = Date.now() * 0.002;
                meshData.mesh.children[1].rotation.z = time;
            }

            if (body.collided) {
                meshData.coreMesh.material.wireframe = true;
                meshData.mesh.traverse((child) => {
                    if (child.material && child !== meshData.coreMesh) {
                        child.material.opacity = 0.2;
                    }
                });
            }

            if (body.escapeDetected || body.divergenceDetected) {
                meshData.coreMesh.material.emissive = new THREE.Color(0xff0000);
                meshData.coreMesh.material.emissiveIntensity = 0.5;
            }
        }

        updateOrbitLine(body) {
            const orbitLine = this.orbitLines.get(body.id);
            if (!orbitLine || !this.showOrbits) return;

            const positions = orbitLine.geometry.attributes.position.array;
            const pointCount = Math.min(body.trail.length, 1000);
            
            for (let i = 0; i < pointCount; i++) {
                const pos = this.toVisualPosition(body.trail[i]);
                positions[i * 3] = pos.x;
                positions[i * 3 + 1] = pos.y;
                positions[i * 3 + 2] = pos.z;
            }

            orbitLine.geometry.setDrawRange(0, pointCount);
            orbitLine.geometry.attributes.position.needsUpdate = true;
            orbitLine.visible = this.visibleTypes.has(body.type);
        }

        updateTrailLine(body) {
            const trailLine = this.trailLines.get(body.id);
            if (!trailLine || !this.showTrails) return;

            const positions = trailLine.geometry.attributes.position.array;
            const pointCount = body.trail.length;
            
            for (let i = 0; i < pointCount; i++) {
                const pos = this.toVisualPosition(body.trail[i]);
                positions[i * 3] = pos.x;
                positions[i * 3 + 1] = pos.y;
                positions[i * 3 + 2] = pos.z;
            }

            trailLine.geometry.setDrawRange(0, pointCount);
            trailLine.geometry.attributes.position.needsUpdate = true;
            trailLine.visible = this.visibleTypes.has(body.type);
        }

        updateAllBodies(bodies) {
            for (const body of bodies) {
                this.updateBodyPosition(body);
                this.updateOrbitLine(body);
                this.updateTrailLine(body);
            }
        }

        selectBody(bodyId) {
            if (this.selectedBody) {
                const prevMesh = this.bodyMeshes.get(this.selectedBody);
                if (prevMesh) {
                    prevMesh.coreMesh.material.emissive = new THREE.Color(0x000000);
                    prevMesh.coreMesh.material.emissiveIntensity = 0;
                }
            }

            this.selectedBody = bodyId;

            if (bodyId) {
                const meshData = this.bodyMeshes.get(bodyId);
                if (meshData) {
                    meshData.coreMesh.material.emissive = new THREE.Color(0x3b82f6);
                    meshData.coreMesh.material.emissiveIntensity = 0.3;
                }
            }
        }

        highlightBody(bodyId) {
            if (this.hoveredBody && this.hoveredBody !== this.selectedBody) {
                const prevMesh = this.bodyMeshes.get(this.hoveredBody);
                if (prevMesh) {
                    prevMesh.coreMesh.material.emissive = new THREE.Color(0x000000);
                    prevMesh.coreMesh.material.emissiveIntensity = 0;
                }
            }

            this.hoveredBody = bodyId;

            if (bodyId && bodyId !== this.selectedBody) {
                const meshData = this.bodyMeshes.get(bodyId);
                if (meshData) {
                    meshData.coreMesh.material.emissive = new THREE.Color(0xffffff);
                    meshData.coreMesh.material.emissiveIntensity = 0.2;
                }
            }
        }

        updateVisibility() {
            for (const [bodyId, meshData] of this.bodyMeshes) {
                const visible = this.visibleTypes.has(meshData.body.type);
                meshData.mesh.visible = visible;
            }

            for (const [bodyId, orbitLine] of this.orbitLines) {
                const meshData = this.bodyMeshes.get(bodyId);
                if (meshData) {
                    orbitLine.visible = this.showOrbits && this.visibleTypes.has(meshData.body.type);
                }
            }

            for (const [bodyId, trailLine] of this.trailLines) {
                const meshData = this.bodyMeshes.get(bodyId);
                if (meshData) {
                    trailLine.visible = this.showTrails && this.visibleTypes.has(meshData.body.type);
                }
            }
        }

        setVisibleTypes(types) {
            this.visibleTypes = new Set(types);
            this.updateVisibility();
        }

        setShowOrbits(show) {
            this.showOrbits = show;
            this.updateVisibility();
        }

        setShowTrails(show) {
            this.showTrails = show;
            this.updateVisibility();
        }

        onCanvasClick(event) {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.camera);
            
            const meshes = [];
            for (const [id, data] of this.bodyMeshes) {
                if (this.visibleTypes.has(data.body.type)) {
                    meshes.push(data.mesh);
                }
            }
            
            const intersects = this.raycaster.intersectObjects(meshes, true);

            if (intersects.length > 0) {
                let bodyId = null;
                let obj = intersects[0].object;
                while (obj && !bodyId) {
                    if (obj.userData && obj.userData.bodyId) {
                        bodyId = obj.userData.bodyId;
                    }
                    obj = obj.parent;
                }

                if (bodyId) {
                    this.selectBody(bodyId);
                    if (this.onBodyClick) {
                        const meshData = this.bodyMeshes.get(bodyId);
                        this.onBodyClick(meshData.body);
                    }
                }
            }
        }

        onCanvasMouseMove(event) {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.camera);
            
            const meshes = [];
            for (const [id, data] of this.bodyMeshes) {
                if (this.visibleTypes.has(data.body.type)) {
                    meshes.push(data.mesh);
                }
            }
            
            const intersects = this.raycaster.intersectObjects(meshes, true);

            if (intersects.length > 0) {
                let bodyId = null;
                let obj = intersects[0].object;
                while (obj && !bodyId) {
                    if (obj.userData && obj.userData.bodyId) {
                        bodyId = obj.userData.bodyId;
                    }
                    obj = obj.parent;
                }

                if (bodyId) {
                    this.highlightBody(bodyId);
                    this.canvas.style.cursor = 'pointer';
                    
                    if (this.onBodyHover) {
                        const meshData = this.bodyMeshes.get(bodyId);
                        this.onBodyHover(meshData.body, event.clientX, event.clientY);
                    }
                }
            } else {
                this.highlightBody(null);
                this.canvas.style.cursor = 'default';
                if (this.onBodyHover) {
                    this.onBodyHover(null);
                }
            }
        }

        onCanvasMouseLeave() {
            this.highlightBody(null);
            this.canvas.style.cursor = 'default';
            if (this.onBodyHover) {
                this.onBodyHover(null);
            }
        }

        toVisualPosition(physicalPos) {
            return new THREE.Vector3(
                physicalPos.x * SCALE_FACTOR,
                physicalPos.y * SCALE_FACTOR,
                physicalPos.z * SCALE_FACTOR
            );
        }

        toPhysicalPosition(visualPos) {
            return new THREE.Vector3(
                visualPos.x / SCALE_FACTOR,
                visualPos.y / SCALE_FACTOR,
                visualPos.z / SCALE_FACTOR
            );
        }

        focusOnBody(bodyId) {
            const meshData = this.bodyMeshes.get(bodyId);
            if (!meshData) return;

            const targetPos = meshData.mesh.position.clone();
            const offset = new THREE.Vector3(20, 15, 20);
            this.camera.position.copy(targetPos.clone().add(offset));
            this.controls.target.copy(targetPos);
            this.controls.update();
        }

        clearAll() {
            for (const bodyId of [...this.bodyMeshes.keys()]) {
                this.removeBody(bodyId);
            }
            this.selectedBody = null;
            this.hoveredBody = null;
        }

        onResize() {
            this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
        }

        render() {
            const delta = this.clock.getDelta();
            this.controls.update();

            if (this.starField) {
                this.starField.rotation.y += delta * 0.002;
            }

            this.renderer.render(this.scene, this.camera);
        }

        startAnimation(callback) {
            const animate = () => {
                this.animationId = requestAnimationFrame(animate);
                this.render();
                if (callback) callback();
            };
            animate();
        }

        stopAnimation() {
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
            }
        }

        getScreenshotDataURL() {
            this.renderer.render(this.scene, this.camera);
            return this.canvas.toDataURL('image/png');
        }

        dispose() {
            this.stopAnimation();
            this.clearAll();
            
            this.renderer.dispose();
            
            if (this.starField) {
                this.starField.geometry.dispose();
                this.starField.material.dispose();
            }
        }
    }

    return {
        Scene3D,
        Constants: {
            SCALE_FACTOR,
            VISUAL_SCALE
        }
    };
})();

export const SceneManager = window.SceneManager || _SceneManager;
window.SceneManager = SceneManager;
