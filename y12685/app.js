class EmbryoDevelopmentApp {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.objects = [];
        this.edgeHelpers = new Map();
        this.currentStage = 0;
        this.isPlaying = false;
        this.playbackTime = 0;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.selectedObject = null;
        this.clipPlanes = [];
        this.clipEdgeHighlightEnabled = true;

        this.stages = [
            { name: '第1阶段：受精卵', progress: 0 },
            { name: '第2阶段：卵裂', progress: 20 },
            { name: '第3阶段：桑椹胚', progress: 40 },
            { name: '第4阶段：囊胚', progress: 60 },
            { name: '第5阶段：原肠胚', progress: 80 },
            { name: '第6阶段：器官发生', progress: 100 }
        ];

        this.riskNotes = [
            { id: 1, level: 'high', content: '透明遮挡区域坐标缺失', conclusionId: 1, relatedStage: 4, source: 'Camera D - 透明遮挡区' },
            { id: 2, level: 'medium', content: '第3阶段设备坐标需要复核', conclusionId: 2, relatedStage: 2, source: 'Camera C - 顶部视图' },
            { id: 3, level: 'low', content: '细胞分裂速度略高于预期', conclusionId: 1, relatedStage: 1, source: 'Camera A - 正面视图' }
        ];

        this.conclusions = [
            { id: 1, content: '整体发育正常，但部分区域数据需补充', riskIds: [1, 3], status: 'review' },
            { id: 2, content: '第3阶段坐标精度可接受，建议后续验证', riskIds: [2], status: 'ready' }
        ];

        this.deviceCoordinates = [
            { id: 1, name: 'Camera A - 正面视图', complete: true, stage: '第1-6阶段' },
            { id: 2, name: 'Camera B - 侧面视图', complete: true, stage: '第1-6阶段' },
            { id: 3, name: 'Camera C - 顶部视图', complete: false, stage: '第3阶段桑椹胚' },
            { id: 4, name: 'Camera D - 透明遮挡区', complete: false, stage: '第4阶段囊胚' }
        ];

        this.init();
    }

    init() {
        this.setupScene();
        this.setupLighting();
        this.createEmbryoModels();
        this.setupControls();
        this.setupUI();
        this.animate();
    }

    setupScene() {
        const container = document.getElementById('canvas-container');

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e);

        this.camera = new THREE.PerspectiveCamera(
            60,
            container.clientWidth / container.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 2, 5);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.localClippingEnabled = true;
        container.appendChild(this.renderer.domElement);

        window.addEventListener('resize', () => this.onWindowResize());
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 7);
        this.scene.add(directionalLight);

        const pointLight = new THREE.PointLight(0xe94560, 0.5, 10);
        pointLight.position.set(0, 2, 0);
        this.scene.add(pointLight);
    }

    createEmbryoModels() {
        this.createCellCluster();
        this.createOrgans();
        this.createStageIndicators();
        this.applyStatusMarkers();
    }

    createCellCluster() {
        const cellGroup = new THREE.Group();
        cellGroup.name = '细胞簇';
        cellGroup.userData = {
            type: 'cell',
            stage: 1,
            details: {
                name: '受精卵细胞',
                description: '初始单细胞阶段',
                size: '约0.1mm',
                status: 'ready'
            }
        };

        for (let i = 0; i < 20; i++) {
            const geometry = new THREE.SphereGeometry(0.1 + Math.random() * 0.1, 16, 16);
            const isReview = i >= 15;
            const material = new THREE.MeshPhongMaterial({
                color: isReview ? 0xe67e22 : 0x3498db,
                transparent: true,
                opacity: 0.8,
                shininess: 100,
                side: THREE.DoubleSide
            });
            const cell = new THREE.Mesh(geometry, material);
            cell.position.set(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 1.5,
                (Math.random() - 0.5) * 2
            );
            cell.name = `细胞${i + 1}`;
            cell.userData = {
                type: 'cell',
                stage: 1,
                details: {
                    name: `细胞${i + 1}`,
                    description: '胚胎干细胞',
                    size: '约0.1mm',
                    status: isReview ? 'review' : 'ready'
                }
            };
            cellGroup.add(cell);
            this.objects.push(cell);
            this.createEdgeHelper(cell);
        }

        this.scene.add(cellGroup);
    }

    createOrgans() {
        const heartGeometry = new THREE.SphereGeometry(0.3, 32, 32);
        const heartMaterial = new THREE.MeshPhongMaterial({
            color: 0xe74c3c,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });
        const heart = new THREE.Mesh(heartGeometry, heartMaterial);
        heart.position.set(-0.5, 0.3, 0);
        heart.scale.set(1, 1.2, 0.8);
        heart.name = '心脏';
        heart.userData = {
            type: 'organ',
            stage: 5,
            details: {
                name: '心脏',
                description: '已形成基本结构，开始跳动',
                size: '约2mm',
                status: 'ready'
            }
        };
        this.scene.add(heart);
        this.objects.push(heart);
        this.createEdgeHelper(heart);

        const brainGeometry = new THREE.SphereGeometry(0.4, 32, 32);
        const brainMaterial = new THREE.MeshPhongMaterial({
            color: 0x9b59b6,
            transparent: true,
            opacity: 0.85,
            side: THREE.DoubleSide
        });
        const brain = new THREE.Mesh(brainGeometry, brainMaterial);
        brain.position.set(0, 1, 0);
        brain.scale.set(1.2, 0.8, 1);
        brain.name = '脑部';
        brain.userData = {
            type: 'organ',
            stage: 6,
            details: {
                name: '脑部',
                description: '神经管已闭合，脑泡形成',
                size: '约3mm',
                status: 'review'
            }
        };
        this.scene.add(brain);
        this.objects.push(brain);
        this.createEdgeHelper(brain);

        const tissueGeometry = new THREE.TorusGeometry(0.5, 0.1, 16, 32);
        const tissueMaterial = new THREE.MeshPhongMaterial({
            color: 0x2ecc71,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        const tissue = new THREE.Mesh(tissueGeometry, tissueMaterial);
        tissue.rotation.x = Math.PI / 2;
        tissue.name = '结缔组织';
        tissue.userData = {
            type: 'tissue',
            stage: 4,
            details: {
                name: '结缔组织',
                description: '支持结构正在形成',
                size: '约1mm',
                status: 'ready'
            }
        };
        this.scene.add(tissue);
        this.objects.push(tissue);
        this.createEdgeHelper(tissue);
    }

    createEdgeHelper(mesh) {
        const edges = new THREE.EdgesGeometry(mesh.geometry);
        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.0
        });
        const wireframe = new THREE.LineSegments(edges, lineMaterial);
        mesh.add(wireframe);
        this.edgeHelpers.set(mesh, wireframe);
    }

    createStageIndicators() {
        const gridHelper = new THREE.GridHelper(10, 20, 0x444444, 0x222222);
        this.scene.add(gridHelper);
    }

    applyStatusMarkers() {
        this.objects.forEach(obj => {
            if (obj.userData.details && obj.userData.details.status === 'review') {
                this.addReviewBorder(obj);
            }
        });
    }

    addReviewBorder(mesh) {
        const box = new THREE.Box3().setFromObject(mesh);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);

        const borderGeo = new THREE.BoxGeometry(size.x * 1.1, size.y * 1.1, size.z * 1.1);
        const borderEdges = new THREE.EdgesGeometry(borderGeo);
        const borderMat = new THREE.LineBasicMaterial({
            color: 0xf39c12,
            transparent: true,
            opacity: 0.8
        });
        const borderLine = new THREE.LineSegments(borderEdges, borderMat);
        borderLine.position.copy(center);
        borderLine.userData.isReviewBorder = true;
        borderLine.userData.targetMesh = mesh;
        mesh.userData.reviewBorder = borderLine;
        this.scene.add(borderLine);
    }

    setupControls() {
        const container = document.getElementById('canvas-container');
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };
        let downPos = null;

        container.addEventListener('mousedown', (e) => {
            isDragging = false;
            downPos = { x: e.clientX, y: e.clientY };
            previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        container.addEventListener('mousemove', (e) => {
            this.onMouseMove(e);

            if (downPos) {
                const dx = e.clientX - downPos.x;
                const dy = e.clientY - downPos.y;
                if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                    isDragging = true;
                }
            }

            if (isDragging) {
                const deltaX = e.clientX - previousMousePosition.x;
                const deltaY = e.clientY - previousMousePosition.y;

                const pivot = new THREE.Vector3(0, 0.5, 0);
                this.objects.forEach(obj => {
                    obj.position.sub(pivot);
                    obj.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), deltaX * 0.01);
                    obj.position.applyAxisAngle(new THREE.Vector3(1, 0, 0), deltaY * 0.01);
                    obj.position.add(pivot);

                    obj.rotation.y += deltaX * 0.01;
                    obj.rotation.x += deltaY * 0.01;

                    if (obj.userData.reviewBorder) {
                        const border = obj.userData.reviewBorder;
                        const box = new THREE.Box3().setFromObject(obj);
                        const center = new THREE.Vector3();
                        box.getCenter(center);
                        border.position.copy(center);
                    }
                });

                previousMousePosition = { x: e.clientX, y: e.clientY };
            }
        });

        container.addEventListener('mouseup', (e) => {
            if (!isDragging && downPos) {
                this.onMouseClick(e);
            }
            isDragging = false;
            downPos = null;
        });

        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY * 0.01;
            this.camera.position.z += delta;
            this.camera.position.z = Math.max(2, Math.min(15, this.camera.position.z));
        });
    }

    onMouseMove(event) {
        const container = document.getElementById('canvas-container');
        const rect = container.getBoundingClientRect();

        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    onMouseClick(event) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.objects);

        if (intersects.length > 0) {
            this.selectObject(intersects[0].object);
        } else {
            this.deselectObject();
        }
    }

    selectObject(obj) {
        if (this.selectedObject) {
            this.selectedObject.material.emissive.setHex(0x000000);
        }

        this.selectedObject = obj;
        obj.material.emissive.setHex(0xe94560);

        this.showObjectDetails(obj.userData.details);
        const collisions = this.checkCollision(obj);
        this.showCollisionResults(collisions, obj);
    }

    deselectObject() {
        if (this.selectedObject) {
            this.selectedObject.material.emissive.setHex(0x000000);
            this.selectedObject = null;
        }
        document.getElementById('objectDetails').classList.remove('show');
    }

    showObjectDetails(details) {
        const detailsPanel = document.getElementById('objectDetails');
        const detailsContent = document.getElementById('detailsContent');
        const collisionSection = document.getElementById('collisionSection');

        const statusLabel = details.status === 'ready' ? '可直接使用' : '需展馆讲解员复核';
        const statusClass = details.status;

        detailsContent.innerHTML = `
            <div class="detail-item">
                <label>名称</label>
                <div class="value">${details.name}
                    <span class="status-indicator ${statusClass} ${details.status === 'review' ? 'status-pulse' : ''}">
                        ${statusLabel}
                    </span>
                </div>
            </div>
            <div class="detail-item">
                <label>描述</label>
                <div class="value">${details.description}</div>
            </div>
            <div class="detail-item">
                <label>尺寸</label>
                <div class="value">${details.size}</div>
            </div>
        `;

        collisionSection.style.display = 'block';
        detailsPanel.classList.add('show');
    }

    checkCollision(obj) {
        const box1 = new THREE.Box3().setFromObject(obj);
        const collisions = [];

        this.objects.forEach(other => {
            if (other !== obj && other.visible) {
                const box2 = new THREE.Box3().setFromObject(other);
                if (box1.intersectsBox(box2)) {
                    const collisionInfo = {
                        object: other,
                        name: other.name || other.userData.details?.name || '未知对象',
                        status: other.userData.details?.status || 'unknown'
                    };
                    collisions.push(collisionInfo);
                    console.log(`碰撞检测：${obj.name} 与 ${collisionInfo.name} 相交`);

                    const edgeHelper = this.edgeHelpers.get(other);
                    if (edgeHelper) {
                        edgeHelper.material.color.setHex(0xff0000);
                        edgeHelper.material.opacity = 0.8;
                        setTimeout(() => {
                            if (this.clipEdgeHighlightEnabled && this.clipPlanes.length > 0) {
                                edgeHelper.material.opacity = 0.6;
                                edgeHelper.material.color.setHex(0xffffff);
                            } else {
                                edgeHelper.material.opacity = 0.0;
                            }
                        }, 2000);
                    }
                }
            }
        });

        return collisions;
    }

    showCollisionResults(collisions, selectedObj) {
        const countEl = document.getElementById('collisionCount');
        const listEl = document.getElementById('collisionList');

        countEl.textContent = collisions.length;

        if (collisions.length === 0) {
            listEl.innerHTML = '<div style="color:#888; font-size:0.8rem; padding:8px 0;">无碰撞，空间布局正常</div>';
            return;
        }

        listEl.innerHTML = collisions.map(c => `
            <div class="collision-item" data-obj-name="${c.name}">
                <div>与 <strong>${c.name}</strong> 相交</div>
                <div style="font-size:0.75rem; color:#aaa; margin-top:3px;">
                    状态：${c.status === 'ready' ? '可直接使用' : '需复核'}
                </div>
            </div>
        `).join('');

        listEl.querySelectorAll('.collision-item').forEach(item => {
            item.addEventListener('click', () => {
                const objName = item.dataset.objName;
                const target = this.objects.find(o => (o.name || o.userData.details?.name) === objName);
                if (target) {
                    this.selectObject(target);
                }
            });
        });
    }

    setupUI() {
        this.setupStageList();
        this.setupClipControls();
        this.setupTimeline();
        this.setupFilters();
        this.setupRiskList();
        this.setupConclusionList();
        this.setupCoordinateList();
        this.setupTestButton();
        this.setupErrorHandler();
    }

    setupStageList() {
        const stageList = document.getElementById('stageList');
        this.stages.forEach((stage, index) => {
            const item = document.createElement('div');
            item.className = 'stage-item' + (index === 0 ? ' active' : '');
            item.textContent = stage.name;
            item.addEventListener('click', () => this.selectStage(index));
            stageList.appendChild(item);
        });
    }

    selectStage(index) {
        this.currentStage = index;
        this.playbackTime = this.stages[index].progress;
        document.getElementById('timeline').value = this.playbackTime;
        document.getElementById('currentStage').textContent = this.stages[index].name;

        document.querySelectorAll('.stage-item').forEach((item, i) => {
            item.classList.toggle('active', i === index);
        });

        this.updateStageVisibility();
    }

    updateStageVisibility() {
        this.objects.forEach(obj => {
            const objStage = obj.userData.stage || 1;
            const shouldShow = objStage <= this.currentStage + 1;
            obj.visible = shouldShow;

            if (obj.userData.reviewBorder) {
                obj.userData.reviewBorder.visible = shouldShow;
            }
        });
        this.applyFilters();
    }

    setupClipControls() {
        const axes = ['X', 'Y', 'Z'];
        axes.forEach(axis => {
            const enabledCb = document.getElementById(`clip${axis}Enabled`);
            const slider = document.getElementById(`clip${axis}`);
            const valueEl = document.getElementById(`clip${axis}Value`);

            enabledCb.addEventListener('change', () => {
                slider.disabled = !enabledCb.checked;
                this.updateClipPlanes();
            });

            slider.addEventListener('input', () => {
                const value = parseFloat(slider.value);
                valueEl.textContent = value.toFixed(2);
                this.updateClipPlanes();
            });
        });

        document.getElementById('clipEdgeHighlight').addEventListener('change', (e) => {
            this.clipEdgeHighlightEnabled = e.target.checked;
            this.updateEdgeHighlightVisibility();
        });
    }

    updateClipPlanes() {
        this.clipPlanes = [];

        const axes = [
            { id: 'X', normal: new THREE.Vector3(1, 0, 0) },
            { id: 'Y', normal: new THREE.Vector3(0, 1, 0) },
            { id: 'Z', normal: new THREE.Vector3(0, 0, 1) }
        ];

        axes.forEach(({ id, normal }) => {
            const enabled = document.getElementById(`clip${id}Enabled`).checked;
            if (enabled) {
                const position = parseFloat(document.getElementById(`clip${id}`).value);
                const plane = new THREE.Plane(normal, position);
                this.clipPlanes.push(plane);
            }
        });

        this.objects.forEach(obj => {
            obj.material.clippingPlanes = this.clipPlanes;
            obj.material.clipShadows = true;
        });

        this.updateEdgeHighlightVisibility();
        this.updateStatus(`剖切：${this.clipPlanes.length} 个平面激活`, this.clipPlanes.length > 0 ? 'warning' : 'normal');
    }

    updateEdgeHighlightVisibility() {
        this.objects.forEach(obj => {
            const edgeHelper = this.edgeHelpers.get(obj);
            if (edgeHelper) {
                if (this.clipEdgeHighlightEnabled && this.clipPlanes.length > 0) {
                    edgeHelper.material.opacity = 0.6;
                    edgeHelper.material.color.setHex(0xffffff);
                } else {
                    edgeHelper.material.opacity = 0.0;
                }
            }
        });
    }

    setupTimeline() {
        const timeline = document.getElementById('timeline');
        const playBtn = document.getElementById('playBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        const resetBtn = document.getElementById('resetBtn');

        timeline.addEventListener('input', (e) => {
            this.playbackTime = parseInt(e.target.value);
            this.updateTimelineDisplay();
        });

        playBtn.addEventListener('click', () => {
            this.isPlaying = true;
            this.updateStatus('回放中', 'warning');
        });

        pauseBtn.addEventListener('click', () => {
            this.isPlaying = false;
            this.updateStatus('已暂停', 'normal');
        });

        resetBtn.addEventListener('click', () => {
            this.isPlaying = false;
            this.playbackTime = 0;
            timeline.value = 0;
            this.selectStage(0);
            this.updateStatus('正常运行', 'normal');
        });
    }

    updateTimelineDisplay() {
        const stageIndex = this.stages.findIndex((stage, i) => {
            const nextStage = this.stages[i + 1];
            return !nextStage || this.playbackTime < nextStage.progress;
        });

        if (stageIndex !== this.currentStage && stageIndex >= 0) {
            this.selectStage(stageIndex);
        }

        document.getElementById('timeline').value = this.playbackTime;
    }

    jumpToStageByRisk(risk) {
        const stageIndex = risk.relatedStage != null ? risk.relatedStage : 0;
        this.selectStage(stageIndex);
        this.isPlaying = false;
        this.updateStatus(`已定位：${this.stages[stageIndex].name}`, 'warning');

        const timeline = document.getElementById('timeline');
        timeline.parentElement.classList.add('highlight-flash');
        setTimeout(() => {
            timeline.parentElement.classList.remove('highlight-flash');
        }, 1500);
    }

    setupFilters() {
        const checkboxes = document.querySelectorAll('.filter-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.applyFilters();
            });
        });
    }

    applyFilters() {
        const activeFilters = Array.from(document.querySelectorAll('.filter-checkbox:checked'))
            .map(cb => cb.value);

        this.objects.forEach(obj => {
            const objType = obj.userData.type;
            const objStage = obj.userData.stage || 1;
            const matchesStage = objStage <= this.currentStage + 1;
            const matchesFilter = activeFilters.includes(objType);
            obj.visible = matchesStage && matchesFilter;

            if (obj.userData.reviewBorder) {
                obj.userData.reviewBorder.visible = obj.visible;
            }
        });
    }

    setupRiskList() {
        const riskList = document.getElementById('riskList');
        this.riskNotes.forEach(risk => {
            const item = document.createElement('div');
            item.className = `risk-item ${risk.level}`;
            item.dataset.riskId = risk.id;
            const levelLabel = risk.level === 'high' ? '高' : risk.level === 'medium' ? '中' : '低';
            item.innerHTML = `
                <div>【${levelLabel}风险】${this.stages[risk.relatedStage]?.name || ''}</div>
                <div style="margin-top:4px;">${risk.content}</div>
                <div style="font-size:0.75rem; color:#aaa; margin-top:4px;">来源：${risk.source}</div>
                <div class="link-to-conclusion" data-conclusion-id="${risk.conclusionId}">
                    查看关联结论 →
                </div>
                <div class="link-to-conclusion" data-jump-stage="true" style="color:#3498db;">
                    ⏱ 跳转至对应发育阶段
                </div>
            `;
            riskList.appendChild(item);
        });

        document.querySelectorAll('.risk-item .link-to-conclusion').forEach(link => {
            link.addEventListener('click', (e) => {
                e.stopPropagation();
                if (link.dataset.jumpStage) {
                    const riskId = parseInt(link.closest('.risk-item').dataset.riskId);
                    const risk = this.riskNotes.find(r => r.id === riskId);
                    if (risk) this.jumpToStageByRisk(risk);
                } else {
                    const conclusionId = parseInt(link.dataset.conclusionId);
                    this.showConclusion(conclusionId);
                }
            });
        });
    }

    setupConclusionList() {
        const conclusionList = document.getElementById('conclusionList');
        this.conclusions.forEach(conclusion => {
            const item = document.createElement('div');
            item.className = `conclusion-list-item ${conclusion.status}`;
            item.dataset.conclusionId = conclusion.id;
            const statusLabel = conclusion.status === 'ready' ? '可直接使用' : '需复核';
            item.innerHTML = `
                <div>${conclusion.content}</div>
                <div class="conclusion-status">${statusLabel}</div>
                <div style="font-size:0.75rem; color:#888; margin-top:5px;">
                    关联风险：${conclusion.riskIds.length} 项
                </div>
            `;
            item.addEventListener('click', () => {
                this.showConclusion(conclusion.id);
            });
            conclusionList.appendChild(item);
        });
    }

    setupCoordinateList() {
        const coordinateList = document.getElementById('coordinateList');
        this.deviceCoordinates.forEach(coord => {
            const item = document.createElement('div');
            item.className = `coordinate-item ${coord.complete ? 'complete' : 'missing'}`;
            item.innerHTML = `
                <div><strong>${coord.name}</strong></div>
                <div style="font-size:0.8rem; color:#aaa; margin:3px 0;">对应阶段：${coord.stage}</div>
                <div>${coord.complete ? '✓ 数据完整' : '✗ 数据缺失 — 请联系展馆讲解员补充'}</div>
            `;
            coordinateList.appendChild(item);
        });

        document.getElementById('validateCoordinates').addEventListener('click', () => {
            this.validateCoordinates();
        });
    }

    validateCoordinates() {
        const missing = this.deviceCoordinates.filter(c => !c.complete);

        if (missing.length === 0) {
            this.updateStatus('所有设备坐标完整', 'normal');
            return;
        }

        const missingNames = missing.map(m => `• ${m.name}（${m.stage}）`).join('\n');
        const message = `检测到 ${missing.length} 份设备坐标缺失：\n${missingNames}\n\n请联系展馆讲解员补充上述坐标文件后再导出。`;

        this.showError(
            `缺少 ${missing.length} 份设备坐标：${missing.map(m => m.name.split(' - ')[0]).join('、')}`,
            missing.map(m => m.name)
        );

        missing.forEach(coord => {
            const risk = this.riskNotes.find(r => r.source === coord.name);
            if (risk) {
                this.highlightRisk(risk.id);
            }
        });
    }

    highlightRisk(riskId) {
        const riskItems = document.querySelectorAll('.risk-item');
        const index = this.riskNotes.findIndex(r => r.id === riskId);
        if (index >= 0 && riskItems[index]) {
            riskItems[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
            riskItems[index].classList.add('highlight-flash');
            setTimeout(() => {
                riskItems[index].classList.remove('highlight-flash');
            }, 1500);
        }
    }

    showConclusion(conclusionId) {
        const conclusion = this.conclusions.find(c => c.id === conclusionId);
        if (!conclusion) return;

        this.highlightConclusionInList(conclusionId);

        const panel = document.getElementById('conclusionPanel');
        const content = document.getElementById('conclusionContent');

        const statusLabel = conclusion.status === 'ready' ? '可直接使用' : '需展馆讲解员复核';

        content.innerHTML = `
            <div class="conclusion-item">
                <div class="detail-item">
                    <label>结论编号</label>
                    <div class="value">#${conclusion.id}</div>
                </div>
                <div class="detail-item">
                    <label>结论内容</label>
                    <div class="value">${conclusion.content}
                        <span class="status-indicator ${conclusion.status} ${conclusion.status === 'review' ? 'status-pulse' : ''}">
                            ${statusLabel}
                        </span>
                    </div>
                </div>
                <div class="detail-item">
                    <label>关联风险备注（点击跳转）</label>
                    ${conclusion.riskIds.map(id => {
                        const risk = this.riskNotes.find(r => r.id === id);
                        const stageName = this.stages[risk.relatedStage]?.name || '';
                        return `
                            <div class="link-to-risk" data-risk-id="${id}">
                                ← [${risk.level === 'high' ? '高' : risk.level === 'medium' ? '中' : '低'}风险] ${risk.content}
                                <span style="font-size:0.75rem; color:#888; display:block; margin-left:12px;">${stageName} · ${risk.source}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;

        panel.classList.add('show');

        content.querySelectorAll('.link-to-risk').forEach(link => {
            link.addEventListener('click', () => {
                const riskId = parseInt(link.dataset.riskId);
                const risk = this.riskNotes.find(r => r.id === riskId);
                if (risk) {
                    this.scrollToRisk(riskId);
                    this.jumpToStageByRisk(risk);
                }
            });
        });
    }

    highlightConclusionInList(conclusionId) {
        const items = document.querySelectorAll('.conclusion-list-item');
        items.forEach(item => {
            item.classList.remove('highlight-flash');
            if (parseInt(item.dataset.conclusionId) === conclusionId) {
                item.classList.add('highlight-flash');
                setTimeout(() => item.classList.remove('highlight-flash'), 1500);
            }
        });
    }

    scrollToRisk(riskId) {
        this.highlightRisk(riskId);
    }

    setupTestButton() {
        document.getElementById('testDuplicateImport').addEventListener('click', () => {
            this.testDuplicateImport();
        });
    }

    testDuplicateImport() {
        try {
            this.updateStatus('正在执行重复导入测试...', 'warning');

            const testGroup = new THREE.Group();
            testGroup.name = '__test_duplicate_group';
            const duplicates = [];

            for (let i = 0; i < 3; i++) {
                const testGeo = new THREE.SphereGeometry(0.15, 16, 16);
                const testMat = new THREE.MeshPhongMaterial({
                    color: 0xf39c12,
                    transparent: true,
                    opacity: 0.7
                });
                const testObj = new THREE.Mesh(testGeo, testMat);
                testObj.name = '心脏';
                testObj.position.set(2 + i * 0.3, 0.5, 0);
                testObj.userData = {
                    type: 'test',
                    stage: 5,
                    isTestImport: true,
                    details: {
                        name: `重复导入测试对象_${i + 1}`,
                        description: '模拟重复导入场景',
                        size: '测试',
                        status: 'review'
                    }
                };

                const existing = this.objects.find(o =>
                    (o.name === testObj.name) &&
                    Math.abs(o.position.x - testObj.position.x) < 0.5 &&
                    !o.userData.isTestImport
                );

                if (existing) {
                    duplicates.push({
                        name: testObj.name,
                        position: `(${testObj.position.x.toFixed(2)}, ${testObj.position.y.toFixed(2)}, ${testObj.position.z.toFixed(2)})`,
                        conflictWith: existing.name
                    });
                }

                testGroup.add(testObj);
            }

            this.scene.add(testGroup);

            setTimeout(() => {
                this.scene.remove(testGroup);
            }, 4000);

            if (duplicates.length > 0) {
                const msg = `检测到 ${duplicates.length} 个重复导入冲突：\n` +
                    duplicates.map(d => `• "${d.name}" 与已有对象 "${d.conflictWith}" 位置重叠`).join('\n') +
                    `\n\n系统已阻止这些对象的永久导入。`;

                this.showError(
                    `检测到 ${duplicates.length} 个重复导入冲突，已阻止加载`,
                    duplicates.map(d => d.name)
                );
                console.warn('重复导入测试结果（冲突详情）:', duplicates);
            } else {
                this.updateStatus('重复导入测试完成，无冲突', 'normal');
            }
        } catch (error) {
            this.handleError(error, '重复导入测试失败');
        }
    }

    setupErrorHandler() {
        document.getElementById('closeDetails').addEventListener('click', () => {
            document.getElementById('objectDetails').classList.remove('show');
            this.deselectObject();
        });

        document.getElementById('closeConclusion').addEventListener('click', () => {
            document.getElementById('conclusionPanel').classList.remove('show');
        });

        document.getElementById('errorClose').addEventListener('click', () => {
            document.getElementById('errorNotification').classList.remove('show');
        });

        window.addEventListener('error', (event) => {
            this.handleError(
                new Error(event.message || '未知运行时错误'),
                '页面运行异常'
            );
        });
    }

    showError(message, missingItems = []) {
        const notification = document.getElementById('errorNotification');
        const messageEl = document.getElementById('errorMessage');

        let displayMsg = message;
        if (missingItems && missingItems.length > 0) {
            displayMsg += `\n\n涉及：${missingItems.join('、')}`;
        }

        messageEl.textContent = displayMsg;
        messageEl.style.whiteSpace = 'pre-line';
        notification.classList.add('show');
        this.updateStatus('出错', 'error');

        setTimeout(() => {
            notification.classList.remove('show');
        }, 8000);
    }

    handleError(error, context) {
        let userMessage = context;
        let suggestions = [];

        const errMsg = (error.message || '').toLowerCase();

        if (errMsg.includes('coordinate') || errMsg.includes('坐标')) {
            const missingCoords = this.deviceCoordinates.filter(c => !c.complete);
            userMessage = `缺少设备坐标数据：${missingCoords.map(c => c.name).join('、')}`;
            suggestions = missingCoords.map(c => `请联系展馆讲解员补充 ${c.name}（${c.stage}）`);
        } else if (errMsg.includes('clip') || errMsg.includes('剖切')) {
            userMessage = '剖切平面配置错误';
            suggestions = ['请检查剖切位置是否在有效范围 (-2 至 2) 内', '尝试减少同时激活的剖切平面数量'];
        } else if (errMsg.includes('webgl') || errMsg.includes('render')) {
            userMessage = '渲染引擎初始化失败';
            suggestions = ['请检查浏览器是否支持 WebGL', '尝试刷新页面重新加载'];
        } else {
            userMessage = `${context}：${error.message || '请联系技术支持'}`;
        }

        const fullMessage = suggestions.length > 0
            ? `${userMessage}\n\n建议操作：\n${suggestions.map(s => '• ' + s).join('\n')}`
            : userMessage;

        this.showError(fullMessage);
        console.error(`[${context}]`, error);
    }

    updateStatus(text, type = 'normal') {
        const badge = document.getElementById('statusBadge');
        badge.textContent = text;
        badge.className = 'status-badge ' + type;
    }

    onWindowResize() {
        const container = document.getElementById('canvas-container');
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.isPlaying) {
            this.playbackTime += 0.2;
            if (this.playbackTime > 100) {
                this.playbackTime = 0;
            }
            this.updateTimelineDisplay();
        }

        this.objects.forEach((obj, index) => {
            if (obj.userData.type === 'cell') {
                obj.position.y += Math.sin(Date.now() * 0.001 + index) * 0.001;

                if (obj.userData.reviewBorder) {
                    const border = obj.userData.reviewBorder;
                    const box = new THREE.Box3().setFromObject(obj);
                    const center = new THREE.Vector3();
                    box.getCenter(center);
                    border.position.copy(center);
                }
            }
        });

        this.objects.forEach(obj => {
            if (obj.userData.reviewBorder) {
                const border = obj.userData.reviewBorder;
                if (border.material) {
                    const pulse = 0.5 + 0.3 * Math.sin(Date.now() * 0.003);
                    border.material.opacity = pulse;
                }
            }
        });

        this.renderer.render(this.scene, this.camera);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        new EmbryoDevelopmentApp();
    } catch (e) {
        console.error('应用初始化失败:', e);
        setTimeout(() => {
            const notification = document.getElementById('errorNotification');
            const messageEl = document.getElementById('errorMessage');
            if (notification && messageEl) {
                messageEl.textContent = `应用初始化失败：${e.message}\n\n建议操作：\n• 请确认 Three.js 库已正确加载\n• 检查浏览器是否支持 WebGL\n• 刷新页面重试`;
                messageEl.style.whiteSpace = 'pre-line';
                notification.classList.add('show');
            }
        }, 100);
    }
});
