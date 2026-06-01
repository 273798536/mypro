class MicrowaveVisualizer {
    constructor() {
        this.currentSample = 'position_error';
        this.currentTime = 0;
        this.isPlaying = false;
        this.playInterval = null;
        this.currentFilter = 'all';
        this.tempChart = null;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.turntable = null;
        this.heatPoints = [];
        this.heatPlane = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        this.init();
    }
    
    init() {
        this.initThreeJS();
        this.initEventListeners();
        this.loadSample(this.currentSample);
        this.animate();
    }
    
    initThreeJS() {
        const container = document.getElementById('canvas-container');
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf3f4f6);
        
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        this.camera.position.set(0, 80, 100);
        this.camera.lookAt(0, 0, 0);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.shadowMap.enabled = true;
        container.appendChild(this.renderer.domElement);
        
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
        
        this.createMicrowave();
        this.addOrbitControls();
    }
    
    createMicrowave() {
        const cavityGroup = new THREE.Group();
        
        const wallMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xcccccc, 
            shininess: 100,
            side: THREE.DoubleSide
        });
        
        const backWall = new THREE.Mesh(
            new THREE.BoxGeometry(60, 40, 1),
            wallMaterial
        );
        backWall.position.set(0, 20, -25);
        backWall.receiveShadow = true;
        cavityGroup.add(backWall);
        
        const leftWall = new THREE.Mesh(
            new THREE.BoxGeometry(1, 40, 50),
            wallMaterial
        );
        leftWall.position.set(-30, 20, 0);
        cavityGroup.add(leftWall);
        
        const rightWall = new THREE.Mesh(
            new THREE.BoxGeometry(1, 40, 50),
            wallMaterial
        );
        rightWall.position.set(30, 20, 0);
        cavityGroup.add(rightWall);
        
        const topWall = new THREE.Mesh(
            new THREE.BoxGeometry(60, 1, 50),
            wallMaterial
        );
        topWall.position.set(0, 40, 0);
        cavityGroup.add(topWall);
        
        const frameMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
        const frontFrame = new THREE.Mesh(
            new THREE.BoxGeometry(62, 42, 2),
            frameMaterial
        );
        frontFrame.position.set(0, 20, 25);
        cavityGroup.add(frontFrame);
        
        const doorMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x1a1a1a,
            transparent: true,
            opacity: 0.3
        });
        const door = new THREE.Mesh(
            new THREE.BoxGeometry(56, 36, 1),
            doorMaterial
        );
        door.position.set(0, 20, 25.5);
        cavityGroup.add(door);
        
        this.turntable = new THREE.Group();
        this.turntable.position.set(0, 2, 0);
        
        const turntableBase = new THREE.Mesh(
            new THREE.CylinderGeometry(22, 22, 1, 32),
            new THREE.MeshPhongMaterial({ color: 0x8b4513 })
        );
        turntableBase.receiveShadow = true;
        this.turntable.add(turntableBase);
        
        const ringGeometry = new THREE.RingGeometry(20, 22, 64);
        const ringMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x666666, 
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.5
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.6;
        this.turntable.add(ring);
        
        for (let i = 1; i <= 3; i++) {
            const circleGeometry = new THREE.RingGeometry(i * 6 - 1, i * 6, 64);
            const circle = new THREE.Mesh(circleGeometry, ringMaterial.clone());
            circle.rotation.x = -Math.PI / 2;
            circle.position.y = 0.6;
            this.turntable.add(circle);
        }
        
        cavityGroup.add(this.turntable);
        
        const heatGeometry = new THREE.PlaneGeometry(44, 44, 50, 50);
        const heatMaterial = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
            vertexColors: true
        });
        this.heatPlane = new THREE.Mesh(heatGeometry, heatMaterial);
        this.heatPlane.rotation.x = -Math.PI / 2;
        this.heatPlane.position.y = 2.6;
        this.turntable.add(this.heatPlane);
        
        this.scene.add(cavityGroup);
        this.cavityGroup = cavityGroup;
    }
    
    addOrbitControls() {
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };
        let spherical = { theta: 0, phi: Math.PI / 4, radius: 130 };
        const target = new THREE.Vector3(0, 20, 0);
        
        const onMouseDown = (e) => {
            isDragging = true;
            previousMousePosition = { x: e.clientX, y: e.clientY };
        };
        
        const onMouseMove = (e) => {
            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
            
            if (isDragging) {
                const deltaX = e.clientX - previousMousePosition.x;
                const deltaY = e.clientY - previousMousePosition.y;
                
                spherical.theta -= deltaX * 0.01;
                spherical.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, spherical.phi + deltaY * 0.01));
                
                this.updateCameraPosition(spherical, target);
                previousMousePosition = { x: e.clientX, y: e.clientY };
            }
            
            this.checkHover(e);
        };
        
        const onMouseUp = () => {
            isDragging = false;
        };
        
        const onWheel = (e) => {
            e.preventDefault();
            spherical.radius = Math.max(80, Math.min(200, spherical.radius + e.deltaY * 0.1));
            this.updateCameraPosition(spherical, target);
        };
        
        this.renderer.domElement.addEventListener('mousedown', onMouseDown);
        this.renderer.domElement.addEventListener('mousemove', onMouseMove);
        this.renderer.domElement.addEventListener('mouseup', onMouseUp);
        this.renderer.domElement.addEventListener('mouseleave', onMouseUp);
        this.renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
        
        this.updateCameraPosition(spherical, target);
    }
    
    updateCameraPosition(spherical, target) {
        this.camera.position.x = target.x + spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
        this.camera.position.y = target.y + spherical.radius * Math.cos(spherical.phi);
        this.camera.position.z = target.z + spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
        this.camera.lookAt(target);
    }
    
    checkHover(e) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.heatPoints);
        
        const tooltip = document.getElementById('point-tooltip');
        const tooltipContent = document.getElementById('tooltip-content');
        
        if (intersects.length > 0) {
            const point = intersects[0].object;
            if (point.userData && point.userData.info) {
                const info = point.userData.info;
                tooltipContent.innerHTML = `
                    <strong>${info.id}</strong><br>
                    温度: ${info.temp.toFixed(1)}°C<br>
                    位置: (${info.x}, ${info.y})<br>
                    来源: ${info.source}
                    ${info.flagged ? '<br><span style="color:#ff6b6b">⚠️ ' + info.flagReason + '</span>' : ''}
                `;
                tooltip.style.left = (e.clientX + 10) + 'px';
                tooltip.style.top = (e.clientY + 10) + 'px';
                tooltip.classList.remove('hidden');
            }
        } else {
            tooltip.classList.add('hidden');
        }
    }
    
    loadSample(sampleName) {
        this.currentSample = sampleName;
        const data = sampleData[sampleName];
        if (!data) return;
        
        document.getElementById('freq-slider').value = data.parameters.frequency;
        document.getElementById('freq-value').textContent = data.parameters.frequency;
        document.getElementById('speed-slider').value = data.parameters.speed;
        document.getElementById('speed-value').textContent = data.parameters.speed;
        document.getElementById('power-slider').value = data.parameters.power;
        document.getElementById('power-value').textContent = data.parameters.power;
        
        this.updateErrorPanel(data.errors);
        this.updateTempPointsList(data.temperaturePoints);
        this.updateTurntablePositionsList(data.turntablePositions);
        this.updateWaveExplanation(sampleName);
        this.updateTraceability(data);
        
        this.currentTime = 0;
        document.getElementById('timeline').value = 0;
        this.updateTimeDisplay();
        this.updateHeatVisualization();
        this.updateTemperatureChart();
    }
    
    updateErrorPanel(errors) {
        const panel = document.getElementById('error-panel');
        const description = document.getElementById('error-description');
        const suggestion = document.getElementById('error-suggestion').querySelector('p:last-child');
        
        if (errors && errors.length > 0) {
            panel.classList.remove('hidden');
            description.textContent = errors[0].description;
            suggestion.textContent = errors[0].suggestion;
        } else {
            panel.classList.add('hidden');
        }
    }
    
    updateTempPointsList(points) {
        const container = document.getElementById('temp-points');
        const currentPoints = points.filter(p => p.time === this.getCurrentTimePoint());
        
        container.innerHTML = currentPoints.map(p => `
            <div class="flex items-center justify-between p-2 rounded ${p.flagged ? 'bg-red-50 border border-red-200' : 'bg-gray-50'} text-xs">
                <div>
                    <span class="font-medium">${p.id}</span>
                    ${p.flagged ? '<span class="ml-1 text-red-500">⚠️</span>' : ''}
                </div>
                <div class="text-right">
                    <span class="font-bold">${p.temp.toFixed(1)}°C</span>
                    <span class="text-gray-500 ml-2">(${p.x}, ${p.y})</span>
                </div>
            </div>
        `).join('');
    }
    
    updateTurntablePositionsList(positions) {
        const container = document.getElementById('turntable-positions');
        container.innerHTML = positions.slice(0, 6).map(p => `
            <div class="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                <span>${p.time}s</span>
                <span class="text-blue-600">${p.angle}°</span>
            </div>
        `).join('');
    }
    
    updateWaveExplanation(sampleName) {
        const container = document.getElementById('wave-explanation');
        container.innerHTML = waveExplanations[sampleName] || waveExplanations.normal;
    }
    
    updateTraceability(data) {
        const container = document.getElementById('data-traceability');
        container.innerHTML = `
            <div>• 实验编号: ${data.metadata.sampleId}</div>
            <div>• 温度点数: ${data.temperaturePoints.length} 个</div>
            <div>• 转盘记录: ${data.turntablePositions.length} 条</div>
            <div>• 操作人员: ${data.metadata.operator}</div>
            <div>• 时间跨度: 0-${data.parameters.duration}秒</div>
        `;
    }
    
    getCurrentTimePoint() {
        const timePoints = [0, 30, 60, 90, 120];
        return timePoints.reduce((prev, curr) => 
            Math.abs(curr - this.currentTime) < Math.abs(prev - this.currentTime) ? curr : prev
        );
    }
    
    interpolateTemperature(points, time) {
        const timePoints = [...new Set(points.map(p => p.time))].sort((a, b) => a - b);
        
        if (time <= timePoints[0]) {
            return points.filter(p => p.time === timePoints[0]);
        }
        if (time >= timePoints[timePoints.length - 1]) {
            return points.filter(p => p.time === timePoints[timePoints.length - 1]);
        }
        
        let t1 = timePoints[0], t2 = timePoints[timePoints.length - 1];
        for (let i = 0; i < timePoints.length - 1; i++) {
            if (time >= timePoints[i] && time <= timePoints[i + 1]) {
                t1 = timePoints[i];
                t2 = timePoints[i + 1];
                break;
            }
        }
        
        const ratio = (time - t1) / (t2 - t1);
        const points1 = points.filter(p => p.time === t1);
        const points2 = points.filter(p => p.time === t2);
        
        return points1.map((p1, i) => {
            const p2 = points2[i] || p1;
            return {
                ...p1,
                temp: p1.temp + (p2.temp - p1.temp) * ratio,
                time: time
            };
        });
    }
    
    updateHeatVisualization() {
        const data = sampleData[this.currentSample];
        if (!data) return;
        
        const currentPoints = this.interpolateTemperature(data.temperaturePoints, this.currentTime);
        
        this.heatPoints.forEach(p => this.turntable.remove(p));
        this.heatPoints = [];
        
        const filteredPoints = currentPoints.filter(p => {
            if (this.currentFilter === 'hot') return p.temp >= 70;
            if (this.currentFilter === 'cold') return p.temp < 50;
            return true;
        });
        
        filteredPoints.forEach(p => {
            const geometry = new THREE.SphereGeometry(p.flagged ? 2 : 1.5, 16, 16);
            const color = this.tempToColor(p.temp);
            const material = new THREE.MeshBasicMaterial({ 
                color: color,
                transparent: true,
                opacity: p.flagged ? 0.5 : 0.9
            });
            
            const sphere = new THREE.Mesh(geometry, material);
            sphere.position.set(p.x * 0.7, 3, p.y * 0.7);
            sphere.userData.info = p;
            this.turntable.add(sphere);
            this.heatPoints.push(sphere);
            
            if (p.flagged) {
                const ringGeometry = new THREE.RingGeometry(2, 3, 32);
                const ringMaterial = new THREE.MeshBasicMaterial({ 
                    color: 0xff0000, 
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 0.8
                });
                const ring = new THREE.Mesh(ringGeometry, ringMaterial);
                ring.rotation.x = -Math.PI / 2;
                ring.position.set(p.x * 0.7, 3.1, p.y * 0.7);
                this.turntable.add(ring);
                this.heatPoints.push(ring);
            }
        });
        
        this.updateHeatPlane(currentPoints);
        this.updateStandingWaveInfo(currentPoints);
        
        const avgTemp = currentPoints.reduce((sum, p) => sum + p.temp, 0) / currentPoints.length;
        document.getElementById('current-temp').textContent = `平均温度: ${avgTemp.toFixed(1)}°C`;
    }
    
    updateHeatPlane(points) {
        const geometry = this.heatPlane.geometry;
        const colors = [];
        
        for (let i = 0; i < geometry.attributes.position.count; i++) {
            const x = geometry.attributes.position.getX(i);
            const y = geometry.attributes.position.getY(i);
            
            const temp = this.interpolatePointTemp(points, x / 0.7, y / 0.7);
            const color = this.tempToColor(temp);
            const threeColor = new THREE.Color(color);
            
            colors.push(threeColor.r, threeColor.g, threeColor.b);
        }
        
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.colorsNeedUpdate = true;
    }
    
    interpolatePointTemp(points, x, y) {
        let totalWeight = 0;
        let weightedTemp = 0;
        
        points.forEach(p => {
            const dist = Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2);
            const weight = 1 / (dist + 1);
            totalWeight += weight;
            weightedTemp += p.temp * weight;
        });
        
        return weightedTemp / totalWeight;
    }
    
    tempToColor(temp) {
        const t = Math.max(0, Math.min(1, (temp - 20) / 80));
        
        if (t < 0.25) {
            const ratio = t / 0.25;
            return this.lerpColor(0x0000ff, 0x00ffff, ratio);
        } else if (t < 0.5) {
            const ratio = (t - 0.25) / 0.25;
            return this.lerpColor(0x00ffff, 0x00ff00, ratio);
        } else if (t < 0.75) {
            const ratio = (t - 0.5) / 0.25;
            return this.lerpColor(0x00ff00, 0xffff00, ratio);
        } else {
            const ratio = (t - 0.75) / 0.25;
            return this.lerpColor(0xffff00, 0xff0000, ratio);
        }
    }
    
    lerpColor(color1, color2, t) {
        const r1 = (color1 >> 16) & 255;
        const g1 = (color1 >> 8) & 255;
        const b1 = color1 & 255;
        const r2 = (color2 >> 16) & 255;
        const g2 = (color2 >> 8) & 255;
        const b2 = color2 & 255;
        
        const r = Math.round(r1 + (r2 - r1) * t);
        const g = Math.round(g1 + (g2 - g1) * t);
        const b = Math.round(b1 + (b2 - b1) * t);
        
        return (r << 16) | (g << 8) | b;
    }
    
    updateStandingWaveInfo(points) {
        const frequency = parseFloat(document.getElementById('freq-slider').value);
        const wavelength = 300 / frequency;
        
        const centerPoints = points.filter(p => Math.abs(p.x) < 5 && Math.abs(p.y) < 5);
        const edgePoints = points.filter(p => Math.abs(p.x) > 10 || Math.abs(p.y) > 10);
        
        const centerTemp = centerPoints.reduce((sum, p) => sum + p.temp, 0) / centerPoints.length;
        const edgeTemp = edgePoints.reduce((sum, p) => sum + p.temp, 0) / edgePoints.length;
        
        document.getElementById('wavelength-value').textContent = `${wavelength.toFixed(1)} cm`;
        document.getElementById('node-count').textContent = '约 4-6 个';
        document.getElementById('antinode-count').textContent = '约 5-7 个';
    }
    
    updateTemperatureChart() {
        const data = sampleData[this.currentSample];
        if (!data) return;
        
        const ctx = document.getElementById('temp-chart').getContext('2d');
        
        if (this.tempChart) {
            this.tempChart.destroy();
        }
        
        const timePoints = [0, 30, 60, 90, 120];
        const tempByTime = timePoints.map(t => {
            const points = data.temperaturePoints.filter(p => p.time === t);
            return points.reduce((sum, p) => sum + p.temp, 0) / points.length;
        });
        
        this.tempChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: timePoints.map(t => `${t}s`),
                datasets: [{
                    label: '平均温度 (°C)',
                    data: tempByTime,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        min: 20,
                        max: 100
                    }
                }
            }
        });
    }
    
    updateTimeDisplay() {
        const minutes = Math.floor(this.currentTime / 60);
        const seconds = Math.floor(this.currentTime % 60);
        document.getElementById('current-time').textContent = 
            `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        const data = sampleData[this.currentSample];
        if (data) {
            this.updateTempPointsList(data.temperaturePoints);
        }
    }
    
    togglePlay() {
        this.isPlaying = !this.isPlaying;
        document.getElementById('play-icon').textContent = this.isPlaying ? '⏸' : '▶';
        
        if (this.isPlaying) {
            this.playInterval = setInterval(() => {
                this.currentTime += 1;
                if (this.currentTime >= 120) {
                    this.currentTime = 0;
                }
                document.getElementById('timeline').value = this.currentTime;
                this.updateTimeDisplay();
                this.updateHeatVisualization();
                
                const speed = parseFloat(document.getElementById('speed-slider').value);
                this.turntable.rotation.y = (this.currentTime * speed * 6 / 60) * Math.PI / 180;
            }, 100);
        } else {
            clearInterval(this.playInterval);
        }
    }
    
    generateReport() {
        const data = sampleData[this.currentSample];
        const report = `
========================================
    微波炉驻波热区图实验报告
========================================

实验编号: ${data.metadata.sampleId}
实验日期: ${data.metadata.date}
操作人员: ${data.metadata.operator}
样品类型: ${data.metadata.sampleType}

----------------------------------------
实验参数
----------------------------------------
微波频率: ${data.parameters.frequency} GHz
转盘转速: ${data.parameters.speed} rpm
输出功率: ${data.parameters.power} W
实验时长: ${data.parameters.duration} 秒

----------------------------------------
数据摘要
----------------------------------------
温度测量点总数: ${data.temperaturePoints.length} 个
转盘位置记录: ${data.turntablePositions.length} 条
初始温度: ${data.metadata.initialTemp} °C

----------------------------------------
数据质量检测
----------------------------------------
${data.errors.length > 0 ? 
    `检测到 ${data.errors.length} 个数据问题:
${data.errors.map(e => `  • [${e.severity.toUpperCase()}] ${e.type}: ${e.description}`).join('\n')}

处理建议:
${data.errors.map(e => `  ${e.suggestion}`).join('\n')}` : 
    '未检测到明显数据问题 ✓'
}

----------------------------------------
温度点与转盘位置对应关系
----------------------------------------
${data.temperaturePoints.slice(0, 10).map(p => {
    const pos = data.turntablePositions.find(t => Math.abs(t.time - p.time) < 5);
    return `  ${p.id}: 温度=${p.temp.toFixed(1)}°C, 位置=(${p.x},${p.y}), 转盘角度=${pos ? pos.angle + '°' : 'N/A'}`;
}).join('\n')}
  ... (共 ${data.temperaturePoints.length} 条记录)

----------------------------------------
备注
----------------------------------------
${data.notes}

========================================
        报告生成时间: ${new Date().toLocaleString()}
========================================
        `;
        
        document.getElementById('report-preview').innerHTML = `
            <pre class="whitespace-pre-wrap font-mono">${report}</pre>
        `;
        
        const blob = new Blob([report], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `实验报告_${data.metadata.sampleId}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    exportPNG() {
        this.renderer.render(this.scene, this.camera);
        const link = document.createElement('a');
        link.download = `热区图_${this.currentSample}_${Math.floor(this.currentTime)}s.png`;
        link.href = this.renderer.domElement.toDataURL('image/png');
        link.click();
    }
    
    exportCSV() {
        const data = sampleData[this.currentSample];
        let csv = 'ID,时间(秒),X坐标,Y坐标,温度(°C),来源,标记\n';
        
        data.temperaturePoints.forEach(p => {
            csv += `${p.id},${p.time},${p.x},${p.y},${p.temp},${p.source},${p.flagged ? p.flagReason : ''}\n`;
        });
        
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `温度数据_${data.metadata.sampleId}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    initEventListeners() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('tab-active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
                btn.classList.add('tab-active');
                document.getElementById(`tab-${btn.dataset.tab}`).classList.remove('hidden');
            });
        });
        
        document.getElementById('sample-select').addEventListener('change', (e) => {
            this.loadSample(e.target.value);
        });
        
        document.getElementById('freq-slider').addEventListener('input', (e) => {
            document.getElementById('freq-value').textContent = e.target.value;
            this.updateHeatVisualization();
        });
        
        document.getElementById('speed-slider').addEventListener('input', (e) => {
            document.getElementById('speed-value').textContent = e.target.value;
        });
        
        document.getElementById('power-slider').addEventListener('input', (e) => {
            document.getElementById('power-value').textContent = e.target.value;
            this.updateHeatVisualization();
        });
        
        document.getElementById('play-btn').addEventListener('click', () => {
            this.togglePlay();
        });
        
        document.getElementById('timeline').addEventListener('input', (e) => {
            this.currentTime = parseInt(e.target.value);
            this.updateTimeDisplay();
            this.updateHeatVisualization();
        });
        
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => {
                    b.classList.remove('bg-blue-600', 'text-white');
                    b.classList.add('bg-gray-200');
                });
                btn.classList.remove('bg-gray-200');
                btn.classList.add('bg-blue-600', 'text-white');
                this.currentFilter = btn.dataset.filter;
                this.updateHeatVisualization();
            });
        });
        
        document.getElementById('generate-report').addEventListener('click', () => {
            this.generateReport();
        });
        
        document.getElementById('export-png').addEventListener('click', () => {
            this.exportPNG();
        });
        
        document.getElementById('export-csv').addEventListener('click', () => {
            this.exportCSV();
        });
        
        window.addEventListener('resize', () => {
            const container = document.getElementById('canvas-container');
            const width = container.clientWidth;
            const height = container.clientHeight;
            
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height);
        });
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (!this.isPlaying) {
            const speed = parseFloat(document.getElementById('speed-slider').value);
            this.turntable.rotation.y = (this.currentTime * speed * 6 / 60) * Math.PI / 180;
        }
        
        this.renderer.render(this.scene, this.camera);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MicrowaveVisualizer();
});
