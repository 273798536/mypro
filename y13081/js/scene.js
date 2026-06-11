const Scene3D = (function() {
    let scene, camera, renderer, raycaster, mouse;
    let warehouseGroup, racksGroup, containersGroup, cadLayerGroup;
    let containerMeshes = [];
    let selectedContainer = null;
    let highlightEnabled = false;
    let cadLayerVisible = false;
    let containerMap = {};
    let currentFrameData = null;
    let onContainerClickCallback = null;
    let animationId = null;

    function init(canvasId) {
        const canvas = document.getElementById(canvasId);
        const container = canvas.parentElement;

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x061020);
        scene.fog = new THREE.Fog(0x061020, 30, 80);

        camera = new THREE.PerspectiveCamera(
            45,
            container.clientWidth / container.clientHeight,
            0.1,
            1000
        );
        camera.position.set(15, 12, 18);
        camera.lookAt(0, 2, 0);

        renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: true
        });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        raycaster = new THREE.Raycaster();
        mouse = new THREE.Vector2();

        setupLighting();
        createWarehouse();
        createCADLayer();

        setupControls(container);
        animate();

        window.addEventListener('resize', onWindowResize);
        canvas.addEventListener('click', onCanvasClick);

        return {
            addContainers: addContainers,
            updateFrame: updateFrame,
            selectContainer: selectContainer,
            toggleHighlight: toggleHighlight,
            toggleCADLayer: toggleCADLayer,
            resetView: resetView,
            zoomIn: zoomIn,
            zoomOut: zoomOut,
            onContainerClick: function(callback) {
                onContainerClickCallback = callback;
            },
            getScreenshot: getScreenshot
        };
    }

    function setupLighting() {
        const ambientLight = new THREE.AmbientLight(0x4a5568, 0.5);
        scene.add(ambientLight);

        const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
        mainLight.position.set(10, 20, 10);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        mainLight.shadow.camera.near = 0.5;
        mainLight.shadow.camera.far = 50;
        mainLight.shadow.camera.left = -20;
        mainLight.shadow.camera.right = 20;
        mainLight.shadow.camera.top = 20;
        mainLight.shadow.camera.bottom = -20;
        scene.add(mainLight);

        const fillLight = new THREE.DirectionalLight(0x63b3ed, 0.3);
        fillLight.position.set(-10, 10, -5);
        scene.add(fillLight);

        const pointLight1 = new THREE.PointLight(0x63b3ed, 0.4, 30);
        pointLight1.position.set(0, 8, 0);
        scene.add(pointLight1);
    }

    function createWarehouse() {
        warehouseGroup = new THREE.Group();
        racksGroup = new THREE.Group();
        containersGroup = new THREE.Group();

        const floorGeometry = new THREE.PlaneGeometry(40, 20);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x2d3748,
            roughness: 0.8,
            metalness: 0.2
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        warehouseGroup.add(floor);

        const gridHelper = new THREE.GridHelper(40, 40, 0x4a5568, 0x2d3748);
        gridHelper.position.y = 0.01;
        warehouseGroup.add(gridHelper);

        createRacks();

        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a2d47,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });

        const backWall = new THREE.Mesh(
            new THREE.PlaneGeometry(40, 10),
            wallMaterial
        );
        backWall.position.set(0, 5, -10);
        warehouseGroup.add(backWall);

        const leftWall = new THREE.Mesh(
            new THREE.PlaneGeometry(20, 10),
            wallMaterial
        );
        leftWall.position.set(-20, 5, 0);
        leftWall.rotation.y = Math.PI / 2;
        warehouseGroup.add(leftWall);

        scene.add(warehouseGroup);
        scene.add(racksGroup);
        scene.add(containersGroup);
    }

    function createRacks() {
        const areas = ['A', 'B', 'C'];
        const areaColors = [0x3182ce, 0x38a169, 0xd69e2e];

        areas.forEach((area, areaIdx) => {
            const areaGroup = new THREE.Group();
            areaGroup.position.x = areaIdx * 12 - 12;

            const areaLabel = createTextSprite(area + '区', areaColors[areaIdx]);
            areaLabel.position.set(0, 7.5, 0);
            areaGroup.add(areaLabel);

            for (let row = 0; row < 3; row++) {
                for (let col = 0; col < 4; col++) {
                    const rack = createSingleRack(areaColors[areaIdx]);
                    rack.position.set(
                        col * 2.5 - 3.75,
                        0,
                        row * 3 - 3
                    );
                    areaGroup.add(rack);
                }
            }

            racksGroup.add(areaGroup);
        });
    }

    function createSingleRack(color) {
        const rackGroup = new THREE.Group();

        const metalMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a5568,
            roughness: 0.6,
            metalness: 0.4
        });

        const legGeometry = new THREE.BoxGeometry(0.1, 6, 0.1);
        const positions = [
            [-1.1, 3, -0.9],
            [1.1, 3, -0.9],
            [-1.1, 3, 0.9],
            [1.1, 3, 0.9]
        ];

        positions.forEach(pos => {
            const leg = new THREE.Mesh(legGeometry, metalMaterial);
            leg.position.set(pos[0], pos[1], pos[2]);
            leg.castShadow = true;
            rackGroup.add(leg);
        });

        const shelfGeometry = new THREE.BoxGeometry(2.2, 0.1, 1.8);
        const shelfMaterial = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.5,
            metalness: 0.3,
            transparent: true,
            opacity: 0.6
        });

        for (let i = 0; i < 4; i++) {
            const shelf = new THREE.Mesh(shelfGeometry, shelfMaterial);
            shelf.position.y = i * 2;
            shelf.receiveShadow = true;
            rackGroup.add(shelf);
        }

        return rackGroup;
    }

    function createCADLayer() {
        cadLayerGroup = new THREE.Group();
        cadLayerGroup.visible = false;

        const cadMaterial = new THREE.LineBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.6
        });

        const floorOutline = new THREE.EdgesGeometry(new THREE.BoxGeometry(40, 0.1, 20));
        const floorLine = new THREE.LineSegments(floorOutline, cadMaterial);
        floorLine.position.y = 0.05;
        cadLayerGroup.add(floorLine);

        const areas = ['A', 'B', 'C'];
        areas.forEach((area, areaIdx) => {
            const areaX = areaIdx * 12 - 12;
            const areaBox = new THREE.EdgesGeometry(new THREE.BoxGeometry(10, 0.1, 8));
            const areaLine = new THREE.LineSegments(areaBox, cadMaterial);
            areaLine.position.set(areaX, 0.05, 0);
            cadLayerGroup.add(areaLine);

            for (let row = 0; row < 3; row++) {
                for (let col = 0; col < 4; col++) {
                    const rackBox = new THREE.EdgesGeometry(new THREE.BoxGeometry(2.2, 6, 1.8));
                    const rackLine = new THREE.LineSegments(rackBox, cadMaterial);
                    rackLine.position.set(
                        areaX + col * 2.5 - 3.75,
                        3,
                        row * 3 - 3
                    );
                    cadLayerGroup.add(rackLine);
                }
            }
        });

        scene.add(cadLayerGroup);
    }

    function createTextSprite(text, color) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 128;
        canvas.height = 64;

        context.fillStyle = '#' + color.toString(16).padStart(6, '0');
        context.font = 'bold 24px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, 64, 32);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true
        });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(3, 1.5, 1);

        return sprite;
    }

    function addContainers(containers) {
        containers.forEach(container => {
            const mesh = createContainerMesh(container);
            mesh.position.set(
                container.position.x,
                container.position.y,
                container.position.z
            );
            mesh.userData.container = container;
            containersGroup.add(mesh);
            containerMeshes.push(mesh);
            containerMap[container.id] = mesh;
        });
    }

    function createContainerMesh(containerData) {
        const group = new THREE.Group();

        const levelColor = WarehouseData.hazardLevels[containerData.hazardLevel].color;

        const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.55, 1.2, 16);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: levelColor,
            roughness: 0.4,
            metalness: 0.3,
            emissive: levelColor,
            emissiveIntensity: 0.1
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.6;
        body.castShadow = true;
        group.add(body);

        const topGeometry = new THREE.CylinderGeometry(0.3, 0.5, 0.2, 16);
        const topMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a5568,
            roughness: 0.5,
            metalness: 0.6
        });
        const top = new THREE.Mesh(topGeometry, topMaterial);
        top.position.y = 1.3;
        top.castShadow = true;
        group.add(top);

        const ringGeometry = new THREE.TorusGeometry(0.5, 0.03, 8, 32);
        const ringMaterial = new THREE.MeshStandardMaterial({
            color: 0xffff00,
            emissive: 0xffff00,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.y = 0.6;
        ring.rotation.x = Math.PI / 2;
        ring.visible = false;
        group.add(ring);
        group.userData.highlightRing = ring;

        const label = createContainerLabel(containerData.id, levelColor);
        label.position.y = 1.6;
        group.add(label);

        return group;
    }

    function createContainerLabel(id, color) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;

        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(0, 0, 256, 64);

        context.strokeStyle = '#' + color.toString(16).padStart(6, '0');
        context.lineWidth = 2;
        context.strokeRect(1, 1, 254, 62);

        context.fillStyle = '#ffffff';
        context.font = 'bold 20px monospace';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(id, 128, 32);

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false
        });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(1.2, 0.3, 1);

        return sprite;
    }

    function updateFrame(frameData) {
        currentFrameData = frameData;

        frameData.records.forEach(record => {
            const mesh = containerMap[record.containerId];
            if (mesh) {
                updateContainerAppearance(mesh, record);
            }
        });
    }

    function updateContainerAppearance(mesh, record) {
        const body = mesh.children[0];
        const ring = mesh.userData && mesh.userData.highlightRing;

        if (!ring || !body || !body.material) return;

        if (record.status === 'error') {
            ring.visible = true;
            ring.material.opacity = 0.8 + Math.sin(Date.now() * 0.005) * 0.2;
            ring.material.color.setHex(0xff0000);
            ring.material.emissive.setHex(0xff0000);
            ring.scale.setScalar(1.2 + Math.sin(Date.now() * 0.005) * 0.1);
        } else if (record.status === 'warning') {
            ring.visible = true;
            ring.material.opacity = 0.6;
            ring.material.color.setHex(0xecc94b);
            ring.material.emissive.setHex(0xecc94b);
            ring.scale.setScalar(1.1);
        } else {
            ring.visible = false;
        }

        if (highlightEnabled && record.status !== 'normal') {
            body.material.emissiveIntensity = 0.3;
        } else {
            body.material.emissiveIntensity = 0.1;
        }
    }

    function selectContainer(containerId) {
        if (selectedContainer) {
            selectedContainer.traverse(child => {
                if (child.isMesh && child.material) {
                    child.material.emissiveIntensity = child.userData.baseEmissive || 0.1;
                }
            });
        }

        const mesh = containerMap[containerId];
        if (mesh) {
            selectedContainer = mesh;
            mesh.traverse(child => {
                if (child.isMesh && child.material) {
                    child.userData.baseEmissive = child.material.emissiveIntensity;
                    child.material.emissive = new THREE.Color(0x63b3ed);
                    child.material.emissiveIntensity = 0.5;
                }
            });

            const targetPos = mesh.position.clone();
            targetPos.y += 2;
            smoothMoveCamera(targetPos);
        } else {
            selectedContainer = null;
        }
    }

    function toggleHighlight(enabled) {
        highlightEnabled = enabled;
        if (currentFrameData) {
            currentFrameData.records.forEach(record => {
                const mesh = containerMap[record.containerId];
                if (mesh) {
                    updateContainerAppearance(mesh, record);
                }
            });
        }
    }

    function toggleCADLayer(visible) {
        cadLayerVisible = visible;
        cadLayerGroup.visible = visible;
    }

    function setupControls(container) {
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };
        let cameraAngle = { theta: Math.PI / 4, phi: Math.PI / 4 };
        let cameraDistance = 25;
        let cameraTarget = new THREE.Vector3(0, 2, 0);

        container.addEventListener('mousedown', (e) => {
            isDragging = true;
            previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        container.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const deltaX = e.clientX - previousMousePosition.x;
            const deltaY = e.clientY - previousMousePosition.y;

            cameraAngle.theta -= deltaX * 0.01;
            cameraAngle.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, cameraAngle.phi + deltaY * 0.01));

            updateCameraPosition();

            previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        container.addEventListener('mouseup', () => {
            isDragging = false;
        });

        container.addEventListener('mouseleave', () => {
            isDragging = false;
        });

        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            cameraDistance = Math.max(10, Math.min(50, cameraDistance + e.deltaY * 0.05));
            updateCameraPosition();
        }, { passive: false });

        function updateCameraPosition() {
            camera.position.x = cameraTarget.x + cameraDistance * Math.sin(cameraAngle.phi) * Math.cos(cameraAngle.theta);
            camera.position.y = cameraTarget.y + cameraDistance * Math.cos(cameraAngle.phi);
            camera.position.z = cameraTarget.z + cameraDistance * Math.sin(cameraAngle.phi) * Math.sin(cameraAngle.theta);
            camera.lookAt(cameraTarget);
        }

        Scene3D._controls = {
            cameraAngle,
            cameraDistance,
            cameraTarget,
            updateCameraPosition,
            setZoom: function(delta) {
                cameraDistance = Math.max(10, Math.min(50, cameraDistance + delta));
                updateCameraPosition();
            },
            reset: function() {
                cameraAngle = { theta: Math.PI / 4, phi: Math.PI / 4 };
                cameraDistance = 25;
                cameraTarget = new THREE.Vector3(0, 2, 0);
                updateCameraPosition();
            }
        };
    }

    function smoothMoveCamera(target) {
    }

    function resetView() {
        if (Scene3D._controls) {
            Scene3D._controls.reset();
        }
    }

    function zoomIn() {
        if (Scene3D._controls) {
            Scene3D._controls.setZoom(-3);
        }
    }

    function zoomOut() {
        if (Scene3D._controls) {
            Scene3D._controls.setZoom(3);
        }
    }

    function onCanvasClick(event) {
        const canvas = renderer.domElement;
        const rect = canvas.getBoundingClientRect();

        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        const allMeshes = [];
        containerMeshes.forEach(group => {
            group.traverse(child => {
                if (child.isMesh) {
                    allMeshes.push(child);
                }
            });
        });

        const intersects = raycaster.intersectObjects(allMeshes);

        if (intersects.length > 0) {
            let targetGroup = null;
            let obj = intersects[0].object;
            while (obj) {
                if (obj.userData && obj.userData.container) {
                    targetGroup = obj;
                    break;
                }
                obj = obj.parent;
            }

            if (targetGroup && onContainerClickCallback) {
                onContainerClickCallback(targetGroup.userData.container);
            }
        }
    }

    function onWindowResize() {
        const container = renderer.domElement.parentElement;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }

    function animate() {
        animationId = requestAnimationFrame(animate);

        if (currentFrameData) {
            currentFrameData.records.forEach(record => {
                const mesh = containerMap[record.containerId];
                if (mesh && mesh.userData && mesh.userData.highlightRing && mesh.userData.highlightRing.visible) {
                    updateContainerAppearance(mesh, record);
                }
            });
        }

        renderer.render(scene, camera);
    }

    function getScreenshot() {
        renderer.render(scene, camera);
        return renderer.domElement.toDataURL('image/png');
    }

    return {
        init: init
    };
})();
