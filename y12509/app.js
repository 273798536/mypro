import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

class GeometryApp {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        this.geometries = [];
        this.cutPlanes = [];
        this.versions = [];
        this.selectedObject = null;
        this.currentVersionId = null;
        
        this.geometryIdCounter = 0;
        this.planeIdCounter = 0;
        this.versionIdCounter = 0;
        
        this.colors = [
            '#e94560', '#0f3460', '#16213e', '#533483',
            '#28a745', '#17a2b8', '#ffc107', '#6f42c1',
            '#fd7e14', '#20c997', '#6610f2', '#dc3545'
        ];
        
        this.init();
        this.setupEventListeners();
        this.loadSampleData();
        this.animate();
    }
    
    init() {
        const canvas = document.getElementById('threeCanvas');
        const viewport = canvas.parentElement;
        
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a1a);
        
        this.camera = new THREE.PerspectiveCamera(
            60,
            viewport.clientWidth / viewport.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(8, 6, 8);
        
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: canvas,
            antialias: true 
        });
        this.renderer.setSize(viewport.clientWidth, viewport.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        
        this.setupLighting();
        this.setupGrid();
        this.setupAxes();
    }
    
    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 15, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
        
        const pointLight = new THREE.PointLight(0xffffff, 0.3);
        pointLight.position.set(-10, 5, -10);
        this.scene.add(pointLight);
    }
    
    setupGrid() {
        const gridHelper = new THREE.GridHelper(20, 20, 0x1a4a8a, 0x0f3460);
        gridHelper.position.y = -0.01;
        this.scene.add(gridHelper);
    }
    
    setupAxes() {
        const axesHelper = new THREE.AxesHelper(5);
        this.scene.add(axesHelper);
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());
        
        const canvas = document.getElementById('threeCanvas');
        canvas.addEventListener('click', (e) => this.onCanvasClick(e));
        canvas.addEventListener('dblclick', (e) => this.onCanvasDoubleClick(e));
        
        document.getElementById('addGeometryBtn').addEventListener('click', () => this.showAddGeometryModal());
        document.getElementById('addCutPlaneBtn').addEventListener('click', () => this.showAddCutPlaneModal());
        document.getElementById('saveVersionBtn').addEventListener('click', () => this.showSaveVersionModal());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportView());
        document.getElementById('validateBtn').addEventListener('click', () => this.validateModel());
        
        document.getElementById('closeCardBtn').addEventListener('click', () => this.hideInfoCard());
        document.getElementById('cardNotes').addEventListener('input', (e) => this.onNotesChange(e));
        
        document.getElementById('closeModalBtn').addEventListener('click', () => this.hideModal());
        document.getElementById('modalCancelBtn').addEventListener('click', () => this.hideModal());
        document.getElementById('modalConfirmBtn').addEventListener('click', () => this.onModalConfirm());
    }
    
    onWindowResize() {
        const viewport = document.getElementById('threeCanvas').parentElement;
        this.camera.aspect = viewport.clientWidth / viewport.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(viewport.clientWidth, viewport.clientHeight);
    }
    
    onCanvasClick(event) {
        const canvas = document.getElementById('threeCanvas');
        const rect = canvas.getBoundingClientRect();
        
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        const allObjects = [...this.geometries.map(g => g.mesh), ...this.cutPlanes.map(p => p.mesh)];
        const intersects = this.raycaster.intersectObjects(allObjects);
        
        if (intersects.length > 0) {
            const clickedObject = intersects[0].object;
            this.selectObject(clickedObject.userData.id, clickedObject.userData.type);
        } else {
            this.deselectObject();
        }
    }
    
    onCanvasDoubleClick(event) {
        const canvas = document.getElementById('threeCanvas');
        const rect = canvas.getBoundingClientRect();
        
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        const allObjects = [...this.geometries.map(g => g.mesh), ...this.cutPlanes.map(p => p.mesh)];
        const intersects = this.raycaster.intersectObjects(allObjects);
        
        if (intersects.length > 0) {
            const clickedObject = intersects[0].object;
            this.showInfoCard(clickedObject.userData.id, clickedObject.userData.type);
        }
    }
    
    selectObject(id, type) {
        this.deselectObject();
        
        let obj = null;
        if (type === 'geometry') {
            obj = this.geometries.find(g => g.id === id);
        } else if (type === 'cutPlane') {
            obj = this.cutPlanes.find(p => p.id === id);
        }
        
        if (obj) {
            this.selectedObject = obj;
            obj.mesh.material.emissive = new THREE.Color(0x333333);
            
            document.querySelectorAll('.list-item').forEach(item => {
                if (item.dataset.id === String(id) && item.dataset.type === type) {
                    item.classList.add('selected');
                }
            });
            
            this.showPropertyPanel(obj);
        }
    }
    
    deselectObject() {
        if (this.selectedObject) {
            this.selectedObject.mesh.material.emissive = new THREE.Color(0x000000);
            this.selectedObject = null;
        }
        
        document.querySelectorAll('.list-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        this.hidePropertyPanel();
    }
    
    showPropertyPanel(obj) {
        const panel = document.getElementById('propertyPanel');
        const type = obj.mesh.userData.type;
        
        let html = '';
        
        if (type === 'geometry') {
            html = `
                <div class="property-group">
                    <label>名称</label>
                    <input type="text" id="propName" value="${obj.name}">
                </div>
                <div class="property-group">
                    <label>颜色</label>
                    <div class="color-picker">
                        ${this.colors.map(c => `
                            <div class="color-option ${obj.color === c ? 'selected' : ''}" 
                                 style="background: ${c}" 
                                 data-color="${c}"
                                 onclick="app.setGeometryColor('${obj.id}', '${c}')"></div>
                        `).join('')}
                    </div>
                </div>
                <div class="property-row">
                    <div class="property-group">
                        <label>位置 X</label>
                        <input type="number" id="posX" value="${obj.position.x.toFixed(2)}" step="0.1">
                    </div>
                    <div class="property-group">
                        <label>位置 Y</label>
                        <input type="number" id="posY" value="${obj.position.y.toFixed(2)}" step="0.1">
                    </div>
                    <div class="property-group">
                        <label>位置 Z</label>
                        <input type="number" id="posZ" value="${obj.position.z.toFixed(2)}" step="0.1">
                    </div>
                </div>
                <div class="property-row">
                    <div class="property-group">
                        <label>缩放 X</label>
                        <input type="number" id="scaleX" value="${obj.scale.x.toFixed(2)}" step="0.1" min="0.1">
                    </div>
                    <div class="property-group">
                        <label>缩放 Y</label>
                        <input type="number" id="scaleY" value="${obj.scale.y.toFixed(2)}" step="0.1" min="0.1">
                    </div>
                    <div class="property-group">
                        <label>缩放 Z</label>
                        <input type="number" id="scaleZ" value="${obj.scale.z.toFixed(2)}" step="0.1" min="0.1">
                    </div>
                </div>
                <div class="property-group">
                    <label>透明度</label>
                    <input type="range" id="opacity" value="${obj.opacity}" min="0.1" max="1" step="0.1">
                </div>
                <button class="btn btn-danger" style="width: 100%; margin-top: 12px;" 
                        onclick="app.deleteGeometry('${obj.id}')">删除几何体</button>
            `;
        } else if (type === 'cutPlane') {
            html = `
                <div class="property-group">
                    <label>名称</label>
                    <input type="text" id="propName" value="${obj.name}">
                </div>
                <div class="property-row">
                    <div class="property-group">
                        <label>位置 X</label>
                        <input type="number" id="posX" value="${obj.position.x.toFixed(2)}" step="0.1">
                    </div>
                    <div class="property-group">
                        <label>位置 Y</label>
                        <input type="number" id="posY" value="${obj.position.y.toFixed(2)}" step="0.1">
                    </div>
                    <div class="property-group">
                        <label>位置 Z</label>
                        <input type="number" id="posZ" value="${obj.position.z.toFixed(2)}" step="0.1">
                    </div>
                </div>
                <div class="property-row">
                    <div class="property-group">
                        <label>旋转 X</label>
                        <input type="number" id="rotX" value="${THREE.MathUtils.radToDeg(obj.rotation.x).toFixed(1)}" step="5">
                    </div>
                    <div class="property-group">
                        <label>旋转 Y</label>
                        <input type="number" id="rotY" value="${THREE.MathUtils.radToDeg(obj.rotation.y).toFixed(1)}" step="5">
                    </div>
                    <div class="property-group">
                        <label>旋转 Z</label>
                        <input type="number" id="rotZ" value="${THREE.MathUtils.radToDeg(obj.rotation.z).toFixed(1)}" step="5">
                    </div>
                </div>
                <button class="btn btn-danger" style="width: 100%; margin-top: 12px;" 
                        onclick="app.deleteCutPlane('${obj.id}')">删除剖分面</button>
            `;
        }
        
        panel.innerHTML = html;
        
        const nameInput = document.getElementById('propName');
        if (nameInput) {
            nameInput.addEventListener('change', (e) => {
                obj.name = e.target.value;
                this.updateLists();
            });
        }
        
        ['posX', 'posY', 'posZ'].forEach((axis, idx) => {
            const input = document.getElementById(axis);
            if (input) {
                input.addEventListener('change', (e) => {
                    const axes = ['x', 'y', 'z'];
                    obj.position[axes[idx]] = parseFloat(e.target.value);
                    obj.mesh.position.copy(obj.position);
                });
            }
        });
        
        if (type === 'geometry') {
            ['scaleX', 'scaleY', 'scaleZ'].forEach((axis, idx) => {
                const input = document.getElementById(axis);
                if (input) {
                    input.addEventListener('change', (e) => {
                        const axes = ['x', 'y', 'z'];
                        obj.scale[axes[idx]] = parseFloat(e.target.value);
                        obj.mesh.scale.copy(obj.scale);
                        this.updateVolume();
                    });
                }
            });
            
            const opacityInput = document.getElementById('opacity');
            if (opacityInput) {
                opacityInput.addEventListener('input', (e) => {
                    obj.opacity = parseFloat(e.target.value);
                    obj.mesh.material.opacity = obj.opacity;
                    obj.mesh.material.transparent = obj.opacity < 1;
                });
            }
        }
        
        if (type === 'cutPlane') {
            ['rotX', 'rotY', 'rotZ'].forEach((axis, idx) => {
                const input = document.getElementById(axis);
                if (input) {
                    input.addEventListener('change', (e) => {
                        const axes = ['x', 'y', 'z'];
                        obj.rotation[axes[idx]] = THREE.MathUtils.degToRad(parseFloat(e.target.value));
                        obj.mesh.rotation.copy(obj.rotation);
                    });
                }
            });
        }
    }
    
    hidePropertyPanel() {
        const panel = document.getElementById('propertyPanel');
        panel.innerHTML = '<p class="hint">选择对象以编辑属性</p>';
    }
    
    setGeometryColor(id, color) {
        const geo = this.geometries.find(g => g.id === id);
        if (geo) {
            geo.color = color;
            geo.mesh.material.color = new THREE.Color(color);
            this.showPropertyPanel(geo);
        }
    }
    
    showInfoCard(id, type) {
        const card = document.getElementById('infoCard');
        const title = document.getElementById('cardTitle');
        const content = document.getElementById('cardContent');
        const notes = document.getElementById('cardNotes');
        
        let obj = null;
        if (type === 'geometry') {
            obj = this.geometries.find(g => g.id === id);
        } else if (type === 'cutPlane') {
            obj = this.cutPlanes.find(p => p.id === id);
        }
        
        if (obj) {
            card.classList.remove('hidden');
            title.textContent = obj.name;
            
            if (type === 'geometry') {
                const volume = this.calculateVolume(obj);
                content.innerHTML = `
                    <div class="info-row">
                        <span class="info-label">类型</span>
                        <span class="info-value">${obj.geometryType}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">体积</span>
                        <span class="info-value ${volume < 0 ? 'negative' : ''}">${volume.toFixed(4)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">顶点数</span>
                        <span class="info-value">${obj.mesh.geometry.attributes.position.count}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">位置</span>
                        <span class="info-value">(${obj.position.x.toFixed(2)}, ${obj.position.y.toFixed(2)}, ${obj.position.z.toFixed(2)})</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">缩放</span>
                        <span class="info-value">(${obj.scale.x.toFixed(2)}, ${obj.scale.y.toFixed(2)}, ${obj.scale.z.toFixed(2)})</span>
                    </div>
                `;
            } else if (type === 'cutPlane') {
                content.innerHTML = `
                    <div class="info-row">
                        <span class="info-label">类型</span>
                        <span class="info-value">剖分面</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">位置</span>
                        <span class="info-value">(${obj.position.x.toFixed(2)}, ${obj.position.y.toFixed(2)}, ${obj.position.z.toFixed(2)})</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">法向量</span>
                        <span class="info-value">(${obj.normal.x.toFixed(2)}, ${obj.normal.y.toFixed(2)}, ${obj.normal.z.toFixed(2)})</span>
                    </div>
                `;
            }
            
            notes.value = obj.notes || '';
            notes.dataset.id = id;
            notes.dataset.type = type;
        }
    }
    
    hideInfoCard() {
        document.getElementById('infoCard').classList.add('hidden');
    }
    
    onNotesChange(e) {
        const id = parseInt(e.target.dataset.id);
        const type = e.target.dataset.type;
        const notes = e.target.value;
        
        let obj = null;
        if (type === 'geometry') {
            obj = this.geometries.find(g => g.id === id);
        } else if (type === 'cutPlane') {
            obj = this.cutPlanes.find(p => p.id === id);
        }
        
        if (obj) {
            obj.notes = notes;
        }
    }
    
    addGeometry(type, params = {}) {
        const id = ++this.geometryIdCounter;
        const name = params.name || `${type}_${id}`;
        const color = params.color || this.colors[id % this.colors.length];
        const position = params.position || new THREE.Vector3(0, 0, 0);
        const scale = params.scale || new THREE.Vector3(1, 1, 1);
        const opacity = params.opacity !== undefined ? params.opacity : 0.8;
        const notes = params.notes || '';
        
        let geometry;
        switch (type) {
            case 'box':
                geometry = new THREE.BoxGeometry(2, 2, 2);
                break;
            case 'sphere':
                geometry = new THREE.SphereGeometry(1, 32, 32);
                break;
            case 'cone':
                geometry = new THREE.ConeGeometry(1, 2, 32);
                break;
            case 'cylinder':
                geometry = new THREE.CylinderGeometry(1, 1, 2, 32);
                break;
            case 'torus':
                geometry = new THREE.TorusGeometry(1, 0.4, 16, 100);
                break;
            case 'tetrahedron':
                geometry = new THREE.TetrahedronGeometry(1.5);
                break;
            case 'octahedron':
                geometry = new THREE.OctahedronGeometry(1.5);
                break;
            case 'icosahedron':
                geometry = new THREE.IcosahedronGeometry(1.5);
                break;
            default:
                geometry = new THREE.BoxGeometry(2, 2, 2);
        }
        
        const material = new THREE.MeshStandardMaterial({
            color: color,
            transparent: opacity < 1,
            opacity: opacity,
            side: THREE.DoubleSide,
            metalness: 0.1,
            roughness: 0.5
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.scale.copy(scale);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { id, type: 'geometry' };
        
        this.scene.add(mesh);
        
        const geoObj = {
            id,
            name,
            geometryType: type,
            color,
            position,
            scale,
            opacity,
            notes,
            mesh,
            geometry
        };
        
        this.geometries.push(geoObj);
        this.updateLists();
        this.updateVolume();
        
        return geoObj;
    }
    
    deleteGeometry(id) {
        const idx = this.geometries.findIndex(g => g.id === id);
        if (idx !== -1) {
            const geo = this.geometries[idx];
            this.scene.remove(geo.mesh);
            geo.geometry.dispose();
            geo.mesh.material.dispose();
            this.geometries.splice(idx, 1);
            
            if (this.selectedObject && this.selectedObject.id === id) {
                this.deselectObject();
            }
            
            this.updateLists();
            this.updateVolume();
            this.hideInfoCard();
        }
    }
    
    addCutPlane(params = {}) {
        const id = ++this.planeIdCounter;
        const name = params.name || `剖分面_${id}`;
        const position = params.position || new THREE.Vector3(0, 0, 0);
        const rotation = params.rotation || new THREE.Euler(0, 0, 0);
        const normal = params.normal || new THREE.Vector3(0, 1, 0);
        const color = params.color || '#ffc107';
        const notes = params.notes || '';
        
        const geometry = new THREE.PlaneGeometry(6, 6);
        const material = new THREE.MeshStandardMaterial({
            color: color,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.rotation.copy(rotation);
        mesh.userData = { id, type: 'cutPlane' };
        
        const edges = new THREE.EdgesGeometry(geometry);
        const edgeMaterial = new THREE.LineBasicMaterial({ color: color, linewidth: 2 });
        const edgeLines = new THREE.LineSegments(edges, edgeMaterial);
        mesh.add(edgeLines);
        
        this.scene.add(mesh);
        
        const planeObj = {
            id,
            name,
            position,
            rotation,
            normal,
            color,
            notes,
            mesh
        };
        
        this.cutPlanes.push(planeObj);
        this.updateLists();
        
        return planeObj;
    }
    
    deleteCutPlane(id) {
        const idx = this.cutPlanes.findIndex(p => p.id === id);
        if (idx !== -1) {
            const plane = this.cutPlanes[idx];
            this.scene.remove(plane.mesh);
            plane.mesh.geometry.dispose();
            plane.mesh.material.dispose();
            this.cutPlanes.splice(idx, 1);
            
            if (this.selectedObject && this.selectedObject.id === id) {
                this.deselectObject();
            }
            
            this.updateLists();
            this.hideInfoCard();
        }
    }
    
    calculateVolume(geoObj) {
        const geometry = geoObj.mesh.geometry;
        const position = geometry.attributes.position;
        const index = geometry.index;
        
        let volume = 0;
        
        if (index) {
            for (let i = 0; i < index.count; i += 3) {
                const i1 = index.getX(i);
                const i2 = index.getX(i + 1);
                const i3 = index.getX(i + 2);
                
                const v1 = new THREE.Vector3(
                    position.getX(i1) * geoObj.scale.x,
                    position.getY(i1) * geoObj.scale.y,
                    position.getZ(i1) * geoObj.scale.z
                );
                const v2 = new THREE.Vector3(
                    position.getX(i2) * geoObj.scale.x,
                    position.getY(i2) * geoObj.scale.y,
                    position.getZ(i2) * geoObj.scale.z
                );
                const v3 = new THREE.Vector3(
                    position.getX(i3) * geoObj.scale.x,
                    position.getY(i3) * geoObj.scale.y,
                    position.getZ(i3) * geoObj.scale.z
                );
                
                volume += this.signedVolumeOfTriangle(v1, v2, v3);
            }
        } else {
            for (let i = 0; i < position.count; i += 3) {
                const v1 = new THREE.Vector3(
                    position.getX(i) * geoObj.scale.x,
                    position.getY(i) * geoObj.scale.y,
                    position.getZ(i) * geoObj.scale.z
                );
                const v2 = new THREE.Vector3(
                    position.getX(i + 1) * geoObj.scale.x,
                    position.getY(i + 1) * geoObj.scale.y,
                    position.getZ(i + 1) * geoObj.scale.z
                );
                const v3 = new THREE.Vector3(
                    position.getX(i + 2) * geoObj.scale.x,
                    position.getY(i + 2) * geoObj.scale.y,
                    position.getZ(i + 2) * geoObj.scale.z
                );
                
                volume += this.signedVolumeOfTriangle(v1, v2, v3);
            }
        }
        
        return Math.abs(volume);
    }
    
    signedVolumeOfTriangle(p1, p2, p3) {
        const v321 = p3.x * p2.y * p1.z;
        const v231 = p2.x * p3.y * p1.z;
        const v312 = p3.x * p1.y * p2.z;
        const v132 = p1.x * p3.y * p2.z;
        const v213 = p2.x * p1.y * p3.z;
        const v123 = p1.x * p2.y * p3.z;
        
        return (1.0 / 6.0) * (-v321 + v231 + v312 - v132 - v213 + v123);
    }
    
    updateVolume() {
        const panel = document.getElementById('volumeReadings');
        let html = '';
        let totalVolume = 0;
        
        this.geometries.forEach(geo => {
            const volume = this.calculateVolume(geo);
            totalVolume += volume;
            
            html += `
                <div class="volume-item ${volume < 0 ? 'negative' : ''}">
                    <span>${geo.name}</span>
                    <span class="volume-value">${volume.toFixed(4)}</span>
                </div>
            `;
        });
        
        if (this.geometries.length > 0) {
            html += `
                <div class="volume-item" style="background: #0f3460; margin-top: 8px;">
                    <span style="font-weight: 600;">总体积</span>
                    <span class="volume-value" style="color: #e94560;">${totalVolume.toFixed(4)}</span>
                </div>
            `;
        }
        
        panel.innerHTML = html || '<p class="hint">暂无几何体</p>';
    }
    
    updateLists() {
        const geoList = document.getElementById('geometryList');
        const planeList = document.getElementById('cutPlaneList');
        
        geoList.innerHTML = this.geometries.map(geo => `
            <div class="list-item" data-id="${geo.id}" data-type="geometry"
                 onclick="app.selectObject(${geo.id}, 'geometry')"
                 ondblclick="app.showInfoCard(${geo.id}, 'geometry')">
                <span class="item-name">
                    <span style="display: inline-block; width: 12px; height: 12px; background: ${geo.color}; border-radius: 2px; margin-right: 8px;"></span>
                    ${geo.name}
                </span>
                <div class="item-actions">
                    <button onclick="event.stopPropagation(); app.showInfoCard(${geo.id}, 'geometry')" title="详情">ℹ</button>
                    <button onclick="event.stopPropagation(); app.deleteGeometry(${geo.id})" title="删除">✕</button>
                </div>
            </div>
        `).join('');
        
        planeList.innerHTML = this.cutPlanes.map(plane => `
            <div class="list-item" data-id="${plane.id}" data-type="cutPlane"
                 onclick="app.selectObject(${plane.id}, 'cutPlane')"
                 ondblclick="app.showInfoCard(${plane.id}, 'cutPlane')">
                <span class="item-name">
                    <span style="display: inline-block; width: 12px; height: 12px; background: ${plane.color}; border-radius: 2px; margin-right: 8px;"></span>
                    ${plane.name}
                </span>
                <div class="item-actions">
                    <button onclick="event.stopPropagation(); app.showInfoCard(${plane.id}, 'cutPlane')" title="详情">ℹ</button>
                    <button onclick="event.stopPropagation(); app.deleteCutPlane(${plane.id})" title="删除">✕</button>
                </div>
            </div>
        `).join('');
    }
    
    validateModel() {
        const results = [];
        
        this.geometries.forEach(geo => {
            const volume = this.calculateVolume(geo);
            
            if (volume < 0.001) {
                results.push({
                    type: 'error',
                    icon: '❌',
                    message: `[${geo.name}] 体积极小或为负 (${volume.toFixed(6)})，可能存在面方向反转`
                });
            }
            
            const bbox1 = new THREE.Box3().setFromObject(geo.mesh);
            
            this.geometries.forEach(otherGeo => {
                if (geo.id >= otherGeo.id) return;
                
                const bbox2 = new THREE.Box3().setFromObject(otherGeo.mesh);
                
                if (bbox1.intersectsBox(bbox2)) {
                    results.push({
                        type: 'warning',
                        icon: '⚠️',
                        message: `[${geo.name}] 与 [${otherGeo.name}] 边界框重叠，可能存在面重叠`
                    });
                }
            });
        });
        
        const colorCounts = {};
        this.geometries.forEach(geo => {
            colorCounts[geo.color] = (colorCounts[geo.color] || 0) + 1;
        });
        
        Object.entries(colorCounts).forEach(([color, count]) => {
            if (count > 1) {
                const geosWithColor = this.geometries.filter(g => g.color === color).map(g => g.name);
                results.push({
                    type: 'warning',
                    icon: '🎨',
                    message: `颜色错配: ${geosWithColor.join(', ')} 使用了相同颜色`
                });
            }
        });
        
        if (this.geometries.length === 0) {
            results.push({
                type: 'warning',
                icon: '📦',
                message: '场景中暂无几何体'
            });
        } else if (results.length === 0) {
            results.push({
                type: 'success',
                icon: '✅',
                message: `验证通过: ${this.geometries.length} 个几何体，无明显问题`
            });
        }
        
        const panel = document.getElementById('validationResults');
        panel.innerHTML = results.map(r => `
            <div class="validation-item ${r.type}">
                <span class="validation-icon">${r.icon}</span>
                <span>${r.message}</span>
            </div>
        `).join('');
    }
    
    saveVersion(name, description) {
        const id = ++this.versionIdCounter;
        const timestamp = new Date().toISOString();
        
        const versionData = {
            id,
            name: name || `版本 ${id}`,
            description: description || '',
            timestamp,
            cameraPosition: this.camera.position.clone(),
            cameraRotation: this.camera.rotation.clone(),
            geometries: this.geometries.map(g => ({
                id: g.id,
                name: g.name,
                geometryType: g.geometryType,
                color: g.color,
                position: g.position.clone(),
                scale: g.scale.clone(),
                opacity: g.opacity,
                notes: g.notes
            })),
            cutPlanes: this.cutPlanes.map(p => ({
                id: p.id,
                name: p.name,
                position: p.position.clone(),
                rotation: p.rotation.clone(),
                normal: p.normal.clone(),
                color: p.color,
                notes: p.notes
            }))
        };
        
        this.versions.push(versionData);
        this.currentVersionId = id;
        this.updateVersionList();
        
        return versionData;
    }
    
    restoreVersion(versionId) {
        const version = this.versions.find(v => v.id === versionId);
        if (!version) return;
        
        this.geometries.forEach(g => {
            this.scene.remove(g.mesh);
            g.geometry.dispose();
            g.mesh.material.dispose();
        });
        this.geometries = [];
        
        this.cutPlanes.forEach(p => {
            this.scene.remove(p.mesh);
            p.mesh.geometry.dispose();
            p.mesh.material.dispose();
        });
        this.cutPlanes = [];
        
        version.geometries.forEach(g => {
            this.addGeometry(g.geometryType, {
                name: g.name,
                color: g.color,
                position: g.position,
                scale: g.scale,
                opacity: g.opacity,
                notes: g.notes
            });
        });
        
        version.cutPlanes.forEach(p => {
            this.addCutPlane({
                name: p.name,
                position: p.position,
                rotation: p.rotation,
                normal: p.normal,
                color: p.color,
                notes: p.notes
            });
        });
        
        this.camera.position.copy(version.cameraPosition);
        this.camera.rotation.copy(version.cameraRotation);
        
        this.currentVersionId = versionId;
        this.updateVersionList();
        this.deselectObject();
        this.hideInfoCard();
    }
    
    updateVersionList() {
        const list = document.getElementById('versionHistory');
        list.innerHTML = this.versions.slice().reverse().map(v => `
            <div class="version-item ${v.id === this.currentVersionId ? 'current' : ''}"
                 onclick="app.restoreVersion(${v.id})">
                <div class="version-name">${v.name}</div>
                <div class="version-time">${new Date(v.timestamp).toLocaleString('zh-CN')}</div>
                ${v.description ? `<div class="version-desc">${v.description}</div>` : ''}
            </div>
        `).join('');
    }
    
    exportView() {
        const viewData = {
            exportTime: new Date().toISOString(),
            camera: {
                position: {
                    x: this.camera.position.x,
                    y: this.camera.position.y,
                    z: this.camera.position.z
                },
                rotation: {
                    x: this.camera.rotation.x,
                    y: this.camera.rotation.y,
                    z: this.camera.rotation.z
                }
            },
            geometries: this.geometries.map(g => ({
                name: g.name,
                type: g.geometryType,
                volume: this.calculateVolume(g),
                color: g.color,
                position: { x: g.position.x, y: g.position.y, z: g.position.z },
                scale: { x: g.scale.x, y: g.scale.y, z: g.scale.z },
                notes: g.notes
            })),
            cutPlanes: this.cutPlanes.map(p => ({
                name: p.name,
                position: { x: p.position.x, y: p.position.y, z: p.position.z },
                normal: { x: p.normal.x, y: p.normal.y, z: p.normal.z },
                notes: p.notes
            }))
        };
        
        const blob = new Blob([JSON.stringify(viewData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `geometry_view_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    showAddGeometryModal() {
        this.currentModalAction = 'addGeometry';
        document.getElementById('modalTitle').textContent = '添加几何体';
        document.getElementById('modalBody').innerHTML = `
            <div class="form-group">
                <label>几何体类型</label>
                <select id="geoType">
                    <option value="box">立方体</option>
                    <option value="sphere">球体</option>
                    <option value="cone">圆锥体</option>
                    <option value="cylinder">圆柱体</option>
                    <option value="torus">圆环体</option>
                    <option value="tetrahedron">四面体</option>
                    <option value="octahedron">八面体</option>
                    <option value="icosahedron">二十面体</option>
                </select>
            </div>
            <div class="form-group">
                <label>名称</label>
                <input type="text" id="geoName" placeholder="留空自动命名">
            </div>
            <div class="form-group">
                <label>颜色</label>
                <div class="color-picker" id="geoColorPicker">
                    ${this.colors.map((c, i) => `
                        <div class="color-option ${i === 0 ? 'selected' : ''}" 
                             style="background: ${c}" 
                             data-color="${c}"></div>
                    `).join('')}
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>位置 X</label>
                    <input type="number" id="geoPosX" value="0" step="0.5">
                </div>
                <div class="form-group">
                    <label>位置 Y</label>
                    <input type="number" id="geoPosY" value="0" step="0.5">
                </div>
                <div class="form-group">
                    <label>位置 Z</label>
                    <input type="number" id="geoPosZ" value="0" step="0.5">
                </div>
            </div>
        `;
        
        document.querySelectorAll('#geoColorPicker .color-option').forEach(opt => {
            opt.addEventListener('click', () => {
                document.querySelectorAll('#geoColorPicker .color-option').forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
            });
        });
        
        document.getElementById('modal').classList.remove('hidden');
    }
    
    showAddCutPlaneModal() {
        this.currentModalAction = 'addCutPlane';
        document.getElementById('modalTitle').textContent = '添加剖分面';
        document.getElementById('modalBody').innerHTML = `
            <div class="form-group">
                <label>名称</label>
                <input type="text" id="planeName" placeholder="留空自动命名">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>位置 X</label>
                    <input type="number" id="planePosX" value="0" step="0.5">
                </div>
                <div class="form-group">
                    <label>位置 Y</label>
                    <input type="number" id="planePosY" value="0" step="0.5">
                </div>
                <div class="form-group">
                    <label>位置 Z</label>
                    <input type="number" id="planePosZ" value="0" step="0.5">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>旋转 X</label>
                    <input type="number" id="planeRotX" value="0" step="15">
                </div>
                <div class="form-group">
                    <label>旋转 Y</label>
                    <input type="number" id="planeRotY" value="0" step="15">
                </div>
                <div class="form-group">
                    <label>旋转 Z</label>
                    <input type="number" id="planeRotZ" value="0" step="15">
                </div>
            </div>
        `;
        document.getElementById('modal').classList.remove('hidden');
    }
    
    showSaveVersionModal() {
        this.currentModalAction = 'saveVersion';
        document.getElementById('modalTitle').textContent = '保存版本';
        document.getElementById('modalBody').innerHTML = `
            <div class="form-group">
                <label>版本名称</label>
                <input type="text" id="versionName" placeholder="例如：初始方案">
            </div>
            <div class="form-group">
                <label>描述</label>
                <textarea id="versionDesc" placeholder="描述此版本的变更内容..." rows="3"></textarea>
            </div>
        `;
        document.getElementById('modal').classList.remove('hidden');
    }
    
    hideModal() {
        document.getElementById('modal').classList.add('hidden');
        this.currentModalAction = null;
    }
    
    onModalConfirm() {
        switch (this.currentModalAction) {
            case 'addGeometry':
                const geoType = document.getElementById('geoType').value;
                const geoName = document.getElementById('geoName').value;
                const selectedColor = document.querySelector('#geoColorPicker .color-option.selected');
                const color = selectedColor ? selectedColor.dataset.color : this.colors[0];
                const geoPos = new THREE.Vector3(
                    parseFloat(document.getElementById('geoPosX').value),
                    parseFloat(document.getElementById('geoPosY').value),
                    parseFloat(document.getElementById('geoPosZ').value)
                );
                this.addGeometry(geoType, { name: geoName, color, position: geoPos });
                break;
                
            case 'addCutPlane':
                const planeName = document.getElementById('planeName').value;
                const planePos = new THREE.Vector3(
                    parseFloat(document.getElementById('planePosX').value),
                    parseFloat(document.getElementById('planePosY').value),
                    parseFloat(document.getElementById('planePosZ').value)
                );
                const planeRot = new THREE.Euler(
                    THREE.MathUtils.degToRad(parseFloat(document.getElementById('planeRotX').value)),
                    THREE.MathUtils.degToRad(parseFloat(document.getElementById('planeRotY').value)),
                    THREE.MathUtils.degToRad(parseFloat(document.getElementById('planeRotZ').value))
                );
                this.addCutPlane({ name: planeName, position: planePos, rotation: planeRot });
                break;
                
            case 'saveVersion':
                const versionName = document.getElementById('versionName').value;
                const versionDesc = document.getElementById('versionDesc').value;
                this.saveVersion(versionName, versionDesc);
                break;
        }
        
        this.hideModal();
    }
    
    loadSampleData() {
        this.addGeometry('box', {
            name: '正方体_正常',
            color: '#e94560',
            position: new THREE.Vector3(-3, 1, 0),
            scale: new THREE.Vector3(1, 1, 1),
            notes: '标准正方体，体积计算正常，用于对比参考'
        });
        
        this.addGeometry('sphere', {
            name: '球体_颜色错配',
            color: '#e94560',
            position: new THREE.Vector3(0, 1, 0),
            scale: new THREE.Vector3(1, 1, 1),
            notes: '与正方体使用了相同颜色，用于测试颜色错配检测'
        });
        
        this.addGeometry('box', {
            name: '长方体_重叠测试',
            color: '#0f3460',
            position: new THREE.Vector3(3, 0.8, 0),
            scale: new THREE.Vector3(1.5, 0.6, 1.5),
            notes: '薄长方体，位置靠近其他物体，用于测试面重叠检测'
        });
        
        this.addGeometry('box', {
            name: '长柱体_重叠',
            color: '#28a745',
            position: new THREE.Vector3(3, 1.5, 0),
            scale: new THREE.Vector3(1, 1, 1),
            notes: '与薄长方体重叠，验证重叠检测功能'
        });
        
        this.addCutPlane({
            name: '水平剖分面',
            position: new THREE.Vector3(0, 2, 0),
            rotation: new THREE.Euler(0, 0, 0),
            color: '#ffc107',
            notes: 'XY平面方向的剖分面，用于展示水平切割效果'
        });
        
        this.addCutPlane({
            name: '垂直剖分面',
            position: new THREE.Vector3(0, 1, 0),
            rotation: new THREE.Euler(0, 0, Math.PI / 2),
            color: '#17a2b8',
            notes: 'XZ平面方向的剖分面，用于展示垂直切割效果'
        });
        
        this.validateModel();
        this.saveVersion('初始样例', '包含测试用几何体和剖分面，用于验证各项功能');
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

const app = new GeometryApp();
window.app = app;
