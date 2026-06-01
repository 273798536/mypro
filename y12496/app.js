class MRIParameterLab {
    constructor() {
        this.params = {
            snr: 45,
            scanTime: 330,
            tr: 2000,
            te: 100,
            sliceThickness: 5,
            fieldStrength: 1.5,
            sequence: 'T2',
            region: 'brain',
            sliceView: 'axial'
        };
        
        this.history = [];
        this.artifacts = [];
        this.version = '2026.06.02.001';
        this.autoRotate = false;
        this.wireframe = false;
        this.objects = [];
        this.selectedObject = null;
        
        this.init();
    }

    init() {
        this.initThreeJS();
        this.initPreviewCanvas();
        this.bindEvents();
        this.updateAllDisplays();
        this.addHistoryRecord('初始化');
        this.detectArtifacts();
        document.getElementById('gen-time').textContent = new Date().toLocaleString('zh-CN');
    }

    initThreeJS() {
        const container = document.getElementById('canvas-container');
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0f172a);
        
        this.camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
        this.camera.position.set(8, 6, 12);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        container.appendChild(this.renderer.domElement);

        const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
        this.scene.add(ambientLight);

        const mainLight = new THREE.DirectionalLight(0xffffff, 1);
        mainLight.position.set(10, 15, 10);
        mainLight.castShadow = true;
        this.scene.add(mainLight);

        const blueLight = new THREE.PointLight(0x3b82f6, 0.8, 20);
        blueLight.position.set(-5, 3, 5);
        this.scene.add(blueLight);

        const cyanLight = new THREE.PointLight(0x06b6d4, 0.6, 15);
        cyanLight.position.set(5, -2, -5);
        this.scene.add(cyanLight);

        this.createMRIMachine();
        this.createPatientTable();
        this.createScanPlane();
        this.createGrid();

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        let isDragging = false;
        let previousMouse = { x: 0, y: 0 };
        this.cameraAngle = { theta: Math.PI / 4, phi: Math.PI / 6 };
        this.cameraRadius = 15;

        container.addEventListener('mousedown', (e) => {
            isDragging = true;
            previousMouse = { x: e.clientX, y: e.clientY };
        });

        container.addEventListener('mousemove', (e) => {
            if (isDragging && !this.autoRotate) {
                const deltaX = e.clientX - previousMouse.x;
                const deltaY = e.clientY - previousMouse.y;
                this.cameraAngle.theta -= deltaX * 0.01;
                this.cameraAngle.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.cameraAngle.phi + deltaY * 0.01));
                this.updateCameraPosition();
                previousMouse = { x: e.clientX, y: e.clientY };
            }
            
            this.mouse.x = ((e.clientX - container.getBoundingClientRect().left) / container.clientWidth) * 2 - 1;
            this.mouse.y = -((e.clientY - container.getBoundingClientRect().top) / container.clientHeight) * 2 + 1;
        });

        container.addEventListener('mouseup', () => { isDragging = false; });
        container.addEventListener('mouseleave', () => { isDragging = false; });
        
        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.cameraRadius = Math.max(5, Math.min(30, this.cameraRadius + e.deltaY * 0.02));
            this.updateCameraPosition();
        });

        container.addEventListener('click', (e) => {
            if (!isDragging) this.handleClick(e);
        });

        window.addEventListener('resize', () => this.onResize());
        this.animate();
    }

    updateCameraPosition() {
        this.camera.position.x = this.cameraRadius * Math.sin(this.cameraAngle.phi) * Math.cos(this.cameraAngle.theta);
        this.camera.position.y = this.cameraRadius * Math.cos(this.cameraAngle.phi);
        this.camera.position.z = this.cameraRadius * Math.sin(this.cameraAngle.phi) * Math.sin(this.cameraAngle.theta);
        this.camera.lookAt(0, 0, 0);
    }

    createMRIMachine() {
        const machineGroup = new THREE.Group();
        machineGroup.name = 'MRI Machine';
        machineGroup.userData = { type: 'machine', info: this.getMachineInfo() };

        const outerGeom = new THREE.CylinderGeometry(3.5, 3.5, 5, 32, 1, true);
        const outerMat = new THREE.MeshStandardMaterial({
            color: 0xe2e8f0,
            metalness: 0.8,
            roughness: 0.3,
            side: THREE.DoubleSide
        });
        const outerCyl = new THREE.Mesh(outerGeom, outerMat);
        outerCyl.rotation.x = Math.PI / 2;
        outerCyl.castShadow = true;
        outerCyl.receiveShadow = true;
        machineGroup.add(outerCyl);

        const innerGeom = new THREE.CylinderGeometry(2.8, 2.8, 5.2, 32);
        const innerMat = new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            metalness: 0.5,
            roughness: 0.5
        });
        const innerCyl = new THREE.Mesh(innerGeom, innerMat);
        innerCyl.rotation.x = Math.PI / 2;
        machineGroup.add(innerCyl);

        for (let i = 0; i < 3; i++) {
            const ringGeom = new THREE.TorusGeometry(3.1, 0.15, 16, 32);
            const ringMat = new THREE.MeshStandardMaterial({
                color: 0x3b82f6,
                emissive: 0x1e40af,
                emissiveIntensity: 0.3,
                metalness: 0.9,
                roughness: 0.2
            });
            const ring = new THREE.Mesh(ringGeom, ringMat);
            ring.rotation.x = Math.PI / 2;
            ring.position.z = -2 + i * 2;
            machineGroup.add(ring);
        }

        const boreGeom = new THREE.CylinderGeometry(2.5, 2.5, 5.5, 32);
        const boreMat = new THREE.MeshStandardMaterial({
            color: 0x0f172a,
            metalness: 0.3,
            roughness: 0.7
        });
        const bore = new THREE.Mesh(boreGeom, boreMat);
        bore.rotation.x = Math.PI / 2;
        machineGroup.add(bore);

        const baseGeom = new THREE.BoxGeometry(4, 1.5, 6);
        const baseMat = new THREE.MeshStandardMaterial({
            color: 0x475569,
            metalness: 0.7,
            roughness: 0.4
        });
        const base = new THREE.Mesh(baseGeom, baseMat);
        base.position.y = -3.5;
        base.castShadow = true;
        base.receiveShadow = true;
        machineGroup.add(base);

        this.objects.push(machineGroup);
        this.scene.add(machineGroup);
        this.machineGroup = machineGroup;
    }

    createPatientTable() {
        const tableGroup = new THREE.Group();
        tableGroup.name = '检查床';
        tableGroup.userData = { type: 'table', info: this.getTableInfo() };

        const tableGeom = new THREE.BoxGeometry(1.5, 0.3, 7);
        const tableMat = new THREE.MeshStandardMaterial({
            color: 0xf1f5f9,
            metalness: 0.3,
            roughness: 0.6
        });
        const table = new THREE.Mesh(tableGeom, tableMat);
        table.position.y = -1.5;
        table.position.z = 1;
        table.castShadow = true;
        table.receiveShadow = true;
        tableGroup.add(table);

        const supportGeom = new THREE.BoxGeometry(3, 0.8, 2);
        const supportMat = new THREE.MeshStandardMaterial({
            color: 0x64748b,
            metalness: 0.6,
            roughness: 0.4
        });
        const support = new THREE.Mesh(supportGeom, supportMat);
        support.position.y = -2.5;
        support.position.z = 4;
        support.castShadow = true;
        tableGroup.add(support);

        const phantomGeom = new THREE.CylinderGeometry(0.4, 0.4, 1.8, 16);
        const phantomMat = new THREE.MeshStandardMaterial({
            color: 0xf87171,
            transparent: true,
            opacity: 0.6,
            metalness: 0.2,
            roughness: 0.8
        });
        const phantom = new THREE.Mesh(phantomGeom, phantomMat);
        phantom.position.y = -0.8;
        phantom.rotation.z = Math.PI / 2;
        tableGroup.add(phantom);

        this.objects.push(tableGroup);
        this.scene.add(tableGroup);
        this.tableGroup = tableGroup;
    }

    createScanPlane() {
        const planeGeom = new THREE.PlaneGeometry(4, 4);
        const planeMat = new THREE.MeshBasicMaterial({
            color: 0x06b6d4,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        this.scanPlane = new THREE.Mesh(planeGeom, planeMat);
        this.scanPlane.position.z = 0;
        this.scene.add(this.scanPlane);

        const edges = new THREE.EdgesGeometry(planeGeom);
        const lineMat = new THREE.LineBasicMaterial({ color: 0x06b6d4, linewidth: 2 });
        const wireframe = new THREE.LineSegments(edges, lineMat);
        this.scanPlane.add(wireframe);
    }

    createGrid() {
        const gridHelper = new THREE.GridHelper(20, 20, 0x334155, 0x1e293b);
        gridHelper.position.y = -4;
        this.scene.add(gridHelper);
    }

    getMachineInfo() {
        return {
            '设备型号': 'Siemens Prisma 3T',
            '磁场强度': '3.0 Tesla',
            '梯度场强': '80 mT/m',
            '切换率': '200 T/m/s',
            ' bore 直径': '70 cm',
            '生产厂家': 'Siemens Healthineers'
        };
    }

    getTableInfo() {
        return {
            '类型': '电动检查床',
            '承重': '250 kg',
            '移动范围': '± 100 cm',
            '定位精度': '± 0.5 mm',
            '材质': '碳纤维复合材料'
        };
    }

    handleClick(e) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        
        if (intersects.length > 0) {
            let obj = intersects[0].object;
            while (obj.parent && !obj.userData.info) {
                obj = obj.parent;
            }
            
            if (obj.userData && obj.userData.info) {
                this.selectObject(obj);
            } else {
                this.closeObjectInfo();
            }
        } else {
            this.closeObjectInfo();
        }
    }

    selectObject(obj) {
        this.selectedObject = obj;
        const panel = document.getElementById('object-info');
        document.getElementById('obj-title').textContent = obj.name || '设备组件';
        
        const details = document.getElementById('obj-details');
        details.innerHTML = '';
        
        if (obj.userData.info) {
            for (const [key, value] of Object.entries(obj.userData.info)) {
                const row = document.createElement('div');
                row.className = 'flex justify-between';
                row.innerHTML = `<span class="text-slate-400">${key}</span><span class="text-white">${value}</span>`;
                details.appendChild(row);
            }
        }
        
        panel.classList.remove('hidden');
    }

    closeObjectInfo() {
        document.getElementById('object-info').classList.add('hidden');
        this.selectedObject = null;
    }

    initPreviewCanvas() {
        this.previewCanvas = document.getElementById('preview-canvas');
        this.previewCtx = this.previewCanvas.getContext('2d');
        this.previewCanvas.width = 256;
        this.previewCanvas.height = 256;
        this.updatePreviewImage();
    }

    updatePreviewImage() {
        const ctx = this.previewCtx;
        const w = this.previewCanvas.width;
        const h = this.previewCanvas.height;
        
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);
        
        const imageData = ctx.createImageData(w, h);
        const centerX = w / 2;
        const centerY = h / 2;
        const snrFactor = this.params.snr / 45;
        const teFactor = this.params.te / 100;
        const trFactor = this.params.tr / 2000;
        
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const idx = (y * w + x) * 4;
                const dx = (x - centerX) / (w / 2);
                const dy = (y - centerY) / (h / 2);
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                let value = 0;
                
                if (dist < 0.9) {
                    value = this.generateBrainTexture(dx, dy, dist, snrFactor, teFactor, trFactor);
                }
                
                const noise = (Math.random() - 0.5) * (50 / snrFactor);
                value = Math.max(0, Math.min(255, value + noise));
                
                if (this.params.sliceView === 'axial') {
                    if (Math.abs(y - h * 0.3) < 2 && dist < 0.8) {
                        value = Math.min(255, value + 80);
                    }
                }
                
                imageData.data[idx] = value;
                imageData.data[idx + 1] = value;
                imageData.data[idx + 2] = value;
                imageData.data[idx + 3] = 255;
            }
        }
        
        this.applyArtifacts(imageData, w, h);
        ctx.putImageData(imageData, 0, 0);
        
        const infoText = `${this.params.sliceView.toUpperCase().slice(0,3)} ${this.params.sequence}`;
        document.getElementById('preview-info').textContent = infoText;
    }

    generateBrainTexture(dx, dy, dist, snr, te, tr) {
        let base = 50;
        
        if (dist < 0.3) {
            base = 80 + te * 30;
        } else if (dist < 0.5) {
            base = 120 + tr * 20 - te * 10;
        } else if (dist < 0.7) {
            base = 60 + te * 40;
        } else if (dist < 0.85) {
            base = 30 + tr * 15;
        }
        
        const ring = Math.sin(dist * 20) * 5;
        base += ring;
        
        return base;
    }

    applyArtifacts(imageData, w, h) {
        this.artifacts.forEach(artifact => {
            if (artifact.type === 'motion') {
                for (let y = 0; y < h; y += 4) {
                    const offset = Math.sin(y * 0.5) * 3;
                    for (let x = 0; x < w; x++) {
                        const srcX = Math.floor(x + offset) % w;
                        const srcIdx = (y * w + Math.abs(srcX)) * 4;
                        const dstIdx = (y * w + x) * 4;
                        for (let c = 0; c < 3; c++) {
                            imageData.data[dstIdx + c] = imageData.data[srcIdx + c];
                        }
                    }
                }
            } else if (artifact.type === 'susceptibility') {
                const cx = w * 0.25;
                const cy = h * 0.5;
                for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w; x++) {
                        const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
                        if (d < 40) {
                            const idx = (y * w + x) * 4;
                            const factor = 1 - d / 40;
                            if (x < cx) {
                                for (let c = 0; c < 3; c++) {
                                    imageData.data[idx + c] = Math.min(255, imageData.data[idx + c] + factor * 80);
                                }
                            } else {
                                for (let c = 0; c < 3; c++) {
                                    imageData.data[idx + c] = Math.max(0, imageData.data[idx + c] - factor * 80);
                                }
                            }
                        }
                    }
                }
            } else if (artifact.type === 'chemical_shift') {
                for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w - 5; x++) {
                        const idx = (y * w + x) * 4;
                        const shiftIdx = (y * w + x + 5) * 4;
                        imageData.data[shiftIdx] = Math.min(255, (imageData.data[idx] + imageData.data[shiftIdx]) / 2 + 20);
                    }
                }
            } else if (artifact.type === 'zipper') {
                const lineX = Math.floor(w * 0.6);
                for (let y = 0; y < h; y += 3) {
                    const idx = (y * w + lineX) * 4;
                    for (let c = 0; c < 3; c++) {
                        imageData.data[idx + c] = 255;
                    }
                }
            }
        });
    }

    bindEvents() {
        document.querySelectorAll('.field-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const field = parseFloat(btn.dataset.field);
                this.setFieldStrength(field);
            });
        });
        
        document.querySelectorAll('.slice-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setSliceView(btn.dataset.view);
            });
        });

        this.setFieldStrength(1.5);
        this.setSliceView('axial');
    }

    updateParam(param, value) {
        const numValue = parseFloat(value);
        const oldValue = this.params[param];
        
        if (oldValue === numValue) return;
        
        this.params[param] = numValue;
        this.updateLinkedParams(param, numValue);
        this.updateAllDisplays();
        this.detectArtifacts();
        this.updatePreviewImage();
        this.updateScanPlane();
        
        this.addHistoryRecord(`调整${this.getParamName(param)}: ${oldValue} → ${numValue}`);
    }

    updateLinkedParams(changedParam, newValue) {
        if (changedParam === 'tr') {
            const snrChange = (newValue - 2000) / 4000 * 15;
            this.params.snr = Math.min(80, Math.max(10, 45 + snrChange));
            document.getElementById('snr-slider').value = this.params.snr;
        } else if (changedParam === 'te') {
            const snrChange = (newValue - 100) / 400 * -10;
            this.params.snr = Math.min(80, Math.max(10, 45 + snrChange));
            document.getElementById('snr-slider').value = this.params.snr;
        } else if (changedParam === 'sliceThickness') {
            const snrChange = (newValue - 5) / 15 * 20;
            this.params.snr = Math.min(80, Math.max(10, 45 + snrChange));
            document.getElementById('snr-slider').value = this.params.snr;
        } else if (changedParam === 'snr') {
            const timeChange = (newValue - 45) / 35 * 200;
            this.params.scanTime = Math.min(600, Math.max(60, 330 + timeChange));
            document.getElementById('time-slider').value = this.params.scanTime;
        } else if (changedParam === 'scanTime') {
            const snrChange = (newValue - 330) / 270 * 15;
            this.params.snr = Math.min(80, Math.max(10, 45 + snrChange));
            document.getElementById('snr-slider').value = this.params.snr;
        }
    }

    getParamName(param) {
        const names = {
            snr: '信噪比',
            scanTime: '扫描时间',
            tr: '重复时间',
            te: '回波时间',
            sliceThickness: '层厚',
            fieldStrength: '磁场强度'
        };
        return names[param] || param;
    }

    updateAllDisplays() {
        document.getElementById('snr-value').textContent = this.params.snr.toFixed(1) + ' dB';
        const mins = Math.floor(this.params.scanTime / 60);
        const secs = Math.floor(this.params.scanTime % 60);
        document.getElementById('time-value').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
        document.getElementById('tr-value').textContent = this.params.tr + ' ms';
        document.getElementById('te-value').textContent = this.params.te + ' ms';
        document.getElementById('slice-value').textContent = this.params.sliceThickness + ' mm';
    }

    setFieldStrength(strength) {
        this.params.fieldStrength = strength;
        document.getElementById('field-value').textContent = strength + ' T';
        
        document.querySelectorAll('.field-btn').forEach(btn => {
            btn.dataset.active = parseFloat(btn.dataset.field) === strength;
        });
        
        const snrBoost = (strength - 1.5) * 8;
        this.params.snr = Math.min(80, 45 + snrBoost);
        document.getElementById('snr-slider').value = this.params.snr;
        this.updateAllDisplays();
        this.updatePreviewImage();
        this.addHistoryRecord(`切换磁场强度: ${strength}T`);
        this.detectArtifacts();
    }

    setSliceView(view) {
        this.params.sliceView = view;
        
        document.querySelectorAll('.slice-btn').forEach(btn => {
            btn.dataset.active = btn.dataset.view === view;
        });
        
        if (this.scanPlane) {
            if (view === 'axial') {
                this.scanPlane.rotation.set(0, 0, 0);
                this.scanPlane.position.set(0, -0.8, 0);
            } else if (view === 'sagittal') {
                this.scanPlane.rotation.set(0, Math.PI / 2, 0);
                this.scanPlane.position.set(0, -0.8, 0);
            } else if (view === 'coronal') {
                this.scanPlane.rotation.set(Math.PI / 2, 0, 0);
                this.scanPlane.position.set(0, -0.8, 0);
            }
        }
        
        this.updatePreviewImage();
    }

    updateScanPlane() {
        if (this.scanPlane) {
            const opacity = 0.2 + (this.params.snr / 80) * 0.3;
            this.scanPlane.material.opacity = opacity;
        }
    }

    detectArtifacts() {
        this.artifacts = [];
        
        if (this.params.snr < 25) {
            this.artifacts.push({
                type: 'noise',
                name: '噪声伪影',
                severity: 'high',
                reason: '信噪比过低 (SNR < 25dB)'
            });
        }
        
        if (this.params.scanTime < 120 && this.params.snr > 50) {
            this.artifacts.push({
                type: 'motion',
                name: '运动伪影',
                severity: 'medium',
                reason: '扫描时间过短，可能产生运动伪影'
            });
        }
        
        if (this.params.te > 200 && this.params.tr < 1000) {
            this.artifacts.push({
                type: 'chemical_shift',
                name: '化学位移伪影',
                severity: 'medium',
                reason: 'TE/TR 比值不当'
            });
        }
        
        if (this.params.fieldStrength >= 3.0 && this.params.sliceThickness < 2) {
            this.artifacts.push({
                type: 'susceptibility',
                name: '磁敏感伪影',
                severity: 'low',
                reason: '高场强薄层可能产生磁敏感差异'
            });
        }
        
        if (this.params.te > 300) {
            this.artifacts.push({
                type: 'zipper',
                name: '拉链伪影',
                severity: 'low',
                reason: '长TE可能出现射频干扰条纹'
            });
        }
        
        this.updateArtifactDisplay();
    }

    updateArtifactDisplay() {
        const list = document.getElementById('artifact-list');
        const count = document.getElementById('artifact-count');
        
        count.textContent = this.artifacts.length;
        
        if (this.artifacts.length === 0) {
            list.innerHTML = '<div class="text-slate-500 text-center py-4">暂无伪影检测</div>';
            return;
        }
        
        const severityColors = {
            high: 'bg-red-500/20 text-red-400 border-red-500/30',
            medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
            low: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
        };
        
        const severityLabels = { high: '高', medium: '中', low: '低' };
        
        list.innerHTML = this.artifacts.map(a => `
            <div class="p-2 rounded border ${severityColors[a.severity]}">
                <div class="flex justify-between items-center">
                    <span class="font-medium">${a.name}</span>
                    <span class="text-xs px-1.5 py-0.5 rounded bg-black/20">${severityLabels[a.severity]}</span>
                </div>
                <div class="text-xs opacity-70 mt-1">${a.reason}</div>
            </div>
        `).join('');
    }

    applyFilters() {
        const sequence = document.getElementById('filter-sequence').value;
        const region = document.getElementById('filter-region').value;
        
        if (sequence) {
            this.params.sequence = sequence;
            if (sequence === 'T1') {
                this.params.tr = 500;
                this.params.te = 15;
            } else if (sequence === 'T2') {
                this.params.tr = 3000;
                this.params.te = 100;
            } else if (sequence === 'PD') {
                this.params.tr = 2500;
                this.params.te = 20;
            } else if (sequence === 'DWI') {
                this.params.tr = 4000;
                this.params.te = 80;
            }
            document.getElementById('tr-slider').value = this.params.tr;
            document.getElementById('te-slider').value = this.params.te;
            this.updateLinkedParams('tr', this.params.tr);
        }
        
        if (region) {
            this.params.region = region;
            if (region === 'brain') {
                this.params.sliceThickness = 5;
            } else if (region === 'spine') {
                this.params.sliceThickness = 4;
            } else if (region === 'abdomen') {
                this.params.sliceThickness = 8;
            } else if (region === 'knee') {
                this.params.sliceThickness = 3;
            }
            document.getElementById('slice-slider').value = this.params.sliceThickness;
        }
        
        this.updateAllDisplays();
        this.updatePreviewImage();
        this.detectArtifacts();
        this.addHistoryRecord(`筛选: ${sequence || '全部序列'} / ${region || '全部部位'}`);
    }

    addHistoryRecord(action) {
        const record = {
            time: new Date().toLocaleTimeString('zh-CN'),
            action: action,
            params: { ...this.params },
            artifacts: [...this.artifacts.map(a => a.name)]
        };
        
        this.history.unshift(record);
        if (this.history.length > 20) this.history.pop();
        
        this.updateHistoryDisplay();
    }

    updateHistoryDisplay() {
        const list = document.getElementById('history-list');
        
        if (this.history.length === 0) {
            list.innerHTML = '<div class="text-slate-500 text-center py-2">暂无历史记录</div>';
            return;
        }
        
        list.innerHTML = this.history.map((h, i) => `
            <div class="p-2 bg-slate-800/50 rounded text-xs cursor-pointer hover:bg-slate-700/50" onclick="app.restoreHistory(${i})">
                <div class="flex justify-between">
                    <span class="text-slate-300">${h.action}</span>
                    <span class="text-slate-500">${h.time}</span>
                </div>
                <div class="text-slate-500 mt-1">
                    SNR: ${h.params.snr.toFixed(0)}dB | TR: ${h.params.tr}ms | 伪影: ${h.artifacts.length || 0}
                </div>
            </div>
        `).join('');
    }

    restoreHistory(index) {
        const record = this.history[index];
        this.params = { ...record.params };
        
        document.getElementById('snr-slider').value = this.params.snr;
        document.getElementById('time-slider').value = this.params.scanTime;
        document.getElementById('tr-slider').value = this.params.tr;
        document.getElementById('te-slider').value = this.params.te;
        document.getElementById('slice-slider').value = this.params.sliceThickness;
        
        this.setFieldStrength(this.params.fieldStrength);
        this.updateAllDisplays();
        this.detectArtifacts();
        this.updatePreviewImage();
        
        this.addHistoryRecord('恢复历史记录');
    }

    clearHistory() {
        this.history = [];
        this.updateHistoryDisplay();
    }

    resetCamera() {
        this.cameraAngle = { theta: Math.PI / 4, phi: Math.PI / 6 };
        this.cameraRadius = 15;
        this.updateCameraPosition();
    }

    toggleAutoRotate() {
        this.autoRotate = !this.autoRotate;
        const btn = document.getElementById('rotate-btn');
        btn.classList.toggle('bg-blue-600', this.autoRotate);
    }

    toggleWireframe() {
        this.wireframe = !this.wireframe;
        this.scene.traverse((obj) => {
            if (obj.isMesh && obj.material) {
                obj.material.wireframe = this.wireframe;
            }
        });
    }

    setView(view) {
        if (view === 'front') {
            this.cameraAngle = { theta: 0, phi: Math.PI / 2 };
        } else if (view === 'side') {
            this.cameraAngle = { theta: Math.PI / 2, phi: Math.PI / 2 };
        } else if (view === 'top') {
            this.cameraAngle = { theta: 0, phi: 0.1 };
        }
        this.cameraRadius = 15;
        this.updateCameraPosition();
    }

    takeScreenshot() {
        this.renderer.render(this.scene, this.camera);
        const dataURL = this.renderer.domElement.toDataURL('image/png');
        
        const link = document.createElement('a');
        link.download = `mri-lab-${Date.now()}.png`;
        link.href = dataURL;
        link.click();
        
        this.addHistoryRecord('截图保存');
    }

    generateReport() {
        const modal = document.getElementById('report-modal');
        const content = document.getElementById('report-content');
        
        const previewDataURL = this.previewCanvas.toDataURL('image/png');
        this.renderer.render(this.scene, this.camera);
        const view3DDataURL = this.renderer.domElement.toDataURL('image/png');
        
        const artifactSummary = this.artifacts.length > 0 
            ? this.artifacts.map(a => `${a.name} (${a.severity})`).join(', ')
            : '无';
        
        content.innerHTML = `
            <div class="max-w-3xl mx-auto space-y-8">
                <div class="text-center border-b border-slate-700 pb-6">
                    <h1 class="text-3xl font-bold text-blue-400 mb-2">核磁扫描参数分析报告</h1>
                    <p class="text-slate-400">MRI Parameter Analysis Report</p>
                    <p class="text-sm text-slate-500 mt-2">生成时间: ${new Date().toLocaleString('zh-CN')} | 版本: ${this.version}</p>
                </div>

                <div class="grid grid-cols-2 gap-6">
                    <div>
                        <h3 class="font-semibold text-lg mb-3 text-slate-300">3D设备舱视图</h3>
                        <img src="${view3DDataURL}" class="w-full rounded-lg border border-slate-700">
                        <p class="text-xs text-slate-500 mt-2 text-center">设备模型: Siemens Prisma 3T</p>
                    </div>
                    <div>
                        <h3 class="font-semibold text-lg mb-3 text-slate-300">组织切片预览</h3>
                        <img src="${previewDataURL}" class="w-full rounded-lg border border-slate-700 bg-black">
                        <p class="text-xs text-slate-500 mt-2 text-center">${this.params.sliceView.toUpperCase()} ${this.params.sequence} | 层厚: ${this.params.sliceThickness}mm</p>
                    </div>
                </div>

                <div>
                    <h3 class="font-semibold text-lg mb-4 text-slate-300">扫描参数配置</h3>
                    <div class="grid grid-cols-3 gap-4">
                        <div class="bg-slate-800 p-4 rounded-lg">
                            <div class="text-2xl font-bold text-blue-400">${this.params.snr.toFixed(1)} dB</div>
                            <div class="text-sm text-slate-400">信噪比 (SNR)</div>
                        </div>
                        <div class="bg-slate-800 p-4 rounded-lg">
                            <div class="text-2xl font-bold text-emerald-400">${Math.floor(this.params.scanTime/60)}:${Math.floor(this.params.scanTime%60).toString().padStart(2,'0')}</div>
                            <div class="text-sm text-slate-400">扫描时间</div>
                        </div>
                        <div class="bg-slate-800 p-4 rounded-lg">
                            <div class="text-2xl font-bold text-rose-400">${this.params.fieldStrength} T</div>
                            <div class="text-sm text-slate-400">磁场强度</div>
                        </div>
                        <div class="bg-slate-800 p-4 rounded-lg">
                            <div class="text-2xl font-bold text-amber-400">${this.params.tr} ms</div>
                            <div class="text-sm text-slate-400">重复时间 (TR)</div>
                        </div>
                        <div class="bg-slate-800 p-4 rounded-lg">
                            <div class="text-2xl font-bold text-purple-400">${this.params.te} ms</div>
                            <div class="text-sm text-slate-400">回波时间 (TE)</div>
                        </div>
                        <div class="bg-slate-800 p-4 rounded-lg">
                            <div class="text-2xl font-bold text-cyan-400">${this.params.sliceThickness} mm</div>
                            <div class="text-sm text-slate-400">层厚</div>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 class="font-semibold text-lg mb-4 text-slate-300">参数联动关系分析</h3>
                    <div class="bg-slate-800/50 rounded-lg p-4 space-y-3">
                        <div class="flex items-start gap-3">
                            <span class="text-amber-400 text-xl">→</span>
                            <div>
                                <span class="font-medium">TR-TE-SNR 三角关系:</span>
                                <span class="text-slate-400">当前 TR=${this.params.tr}ms, TE=${this.params.te}ms, SNR=${this.params.snr.toFixed(1)}dB。</span>
                                <span class="text-slate-300">延长TR提高SNR但增加扫描时间，延长TE增强T2对比但降低SNR。</span>
                            </div>
                        </div>
                        <div class="flex items-start gap-3">
                            <span class="text-emerald-400 text-xl">→</span>
                            <div>
                                <span class="font-medium">层厚-分辨率权衡:</span>
                                <span class="text-slate-400">当前层厚 ${this.params.sliceThickness}mm。</span>
                                <span class="text-slate-300">薄层提高空间分辨率但降低SNR，需要权衡扫描时间。</span>
                            </div>
                        </div>
                        <div class="flex items-start gap-3">
                            <span class="text-rose-400 text-xl">→</span>
                            <div>
                                <span class="font-medium">磁场强度影响:</span>
                                <span class="text-slate-400">当前 ${this.params.fieldStrength}T。</span>
                                <span class="text-slate-300">高场强提供更高SNR但增加磁敏感伪影风险。</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 class="font-semibold text-lg mb-4 text-slate-300">伪影检测结果 (${this.artifacts.length})</h3>
                    ${this.artifacts.length > 0 ? `
                        <div class="space-y-2">
                            ${this.artifacts.map(a => `
                                <div class="flex items-center gap-3 p-3 bg-slate-800 rounded-lg">
                                    <span class="w-3 h-3 rounded-full ${a.severity === 'high' ? 'bg-red-500' : a.severity === 'medium' ? 'bg-amber-500' : 'bg-yellow-500'}"></span>
                                    <div>
                                        <div class="font-medium">${a.name}</div>
                                        <div class="text-sm text-slate-400">${a.reason}</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div class="p-4 bg-emerald-900/30 rounded-lg text-emerald-400 text-center">
                            ✓ 当前参数配置下未检测到明显伪影风险
                        </div>
                    `}
                </div>

                <div>
                    <h3 class="font-semibold text-lg mb-4 text-slate-300">操作历史记录</h3>
                    <div class="bg-slate-800/50 rounded-lg overflow-hidden">
                        <table class="w-full text-sm">
                            <thead class="bg-slate-700/50">
                                <tr>
                                    <th class="text-left p-3 text-slate-400">时间</th>
                                    <th class="text-left p-3 text-slate-400">操作</th>
                                    <th class="text-left p-3 text-slate-400">SNR</th>
                                    <th class="text-left p-3 text-slate-400">伪影数</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.history.slice(0, 8).map(h => `
                                    <tr class="border-t border-slate-700/50">
                                        <td class="p-3 text-slate-400">${h.time}</td>
                                        <td class="p-3">${h.action}</td>
                                        <td class="p-3 text-blue-400">${h.params.snr.toFixed(0)}dB</td>
                                        <td class="p-3 ${h.artifacts.length > 0 ? 'text-red-400' : 'text-emerald-400'}">${h.artifacts.length}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="border-t border-slate-700 pt-6 text-xs text-slate-500">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <p><strong>模型来源:</strong> Siemens Prisma 3T</p>
                            <p><strong>数据版本:</strong> ${this.version}</p>
                        </div>
                        <div>
                            <p><strong>生成工具:</strong> 核磁扫描参数舱 v1.2.0</p>
                            <p><strong>使用场景:</strong> 医学物理教学演示</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        modal.classList.remove('hidden');
        this.addHistoryRecord('生成课堂报告');
    }

    closeReport() {
        document.getElementById('report-modal').classList.add('hidden');
    }

    downloadReport() {
        const content = document.getElementById('report-content').innerHTML;
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>核磁扫描参数分析报告</title>
                <script src="https://cdn.tailwindcss.com"><\/script>
                <style>body { background: #0f172a; color: #fff; padding: 40px; }</style>
            </head>
            <body>${content}</body>
            </html>
        `;
        
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `mri-report-${Date.now()}.html`;
        link.click();
        URL.revokeObjectURL(url);
    }

    onResize() {
        const container = document.getElementById('canvas-container');
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.autoRotate) {
            this.cameraAngle.theta += 0.003;
            this.updateCameraPosition();
        }
        
        const time = Date.now() * 0.001;
        if (this.machineGroup) {
            this.machineGroup.children.forEach((child, i) => {
                if (child.geometry && child.geometry.type === 'TorusGeometry') {
                    child.material.emissiveIntensity = 0.2 + Math.sin(time * 2 + i) * 0.1;
                }
            });
        }
        
        this.renderer.render(this.scene, this.camera);
    }
}

const app = new MRIParameterLab();
