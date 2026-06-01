class RCFittingSystem {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.dataPoints = [];
        this.fitCurve = null;
        this.dataMeshes = [];
        this.fitCurveMesh = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.selectedPoint = null;
        this.chart = null;
        this.reportId = 'RC-' + Date.now();
        
        this.parameters = {
            R: 1000,
            C: 0.001,
            sampleInterval: 0.001,
            timeUnit: 'ms'
        };
        
        this.filters = {
            showNormal: true,
            showAnomaly: true,
            showFit: true,
            timeRangeStart: 0,
            timeRangeEnd: 100
        };
        
        this.anomalies = [];
        this.conflictLogs = [];
        
        this.init();
    }
    
    init() {
        this.initThreeJS();
        this.initChart();
        this.bindEvents();
        this.generateDemoData();
        this.animate();
    }
    
    initThreeJS() {
        const container = document.getElementById('three-container');
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0f172a);
        
        this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
        this.camera.position.set(15, 10, 15);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(this.renderer.domElement);
        
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        this.scene.add(directionalLight);
        
        this.createGrid();
        this.createAxes();
    }
    
    createGrid() {
        const gridHelper = new THREE.GridHelper(20, 20, 0x334155, 0x1e293b);
        this.scene.add(gridHelper);
    }
    
    createAxes() {
        const axesGroup = new THREE.Group();
        
        const xGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(12, 0, 0)
        ]);
        const xMaterial = new THREE.LineBasicMaterial({ color: 0xef4444 });
        const xAxis = new THREE.Line(xGeometry, xMaterial);
        
        const yGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 12, 0)
        ]);
        const yMaterial = new THREE.LineBasicMaterial({ color: 0x10b981 });
        const yAxis = new THREE.Line(yGeometry, yMaterial);
        
        const zGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, 12)
        ]);
        const zMaterial = new THREE.LineBasicMaterial({ color: 0x3b82f6 });
        const zAxis = new THREE.Line(zGeometry, zMaterial);
        
        axesGroup.add(xAxis, yAxis, zAxis);
        this.scene.add(axesGroup);
    }
    
    initChart() {
        const ctx = document.getElementById('chart-2d').getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: '实测数据',
                        data: [],
                        borderColor: '#60a5fa',
                        backgroundColor: 'rgba(96, 165, 250, 0.1)',
                        fill: true,
                        tension: 0.1,
                        pointRadius: 3
                    },
                    {
                        label: '拟合曲线',
                        data: [],
                        borderColor: '#f59e0b',
                        backgroundColor: 'transparent',
                        tension: 0.4,
                        pointRadius: 0,
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: { color: '#94a3b8' }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(100, 116, 139, 0.2)' },
                        ticks: { color: '#94a3b8' }
                    },
                    y: {
                        grid: { color: 'rgba(100, 116, 139, 0.2)' },
                        ticks: { color: '#94a3b8' }
                    }
                }
            }
        });
    }
    
    bindEvents() {
        window.addEventListener('resize', () => this.onWindowResize());
        
        this.renderer.domElement.addEventListener('click', (e) => this.onCanvasClick(e));
        this.renderer.domElement.addEventListener('mousemove', (e) => this.onCanvasMouseMove(e));
        
        document.getElementById('btn-import').addEventListener('click', () => {
            document.getElementById('file-input').click();
        });
        
        document.getElementById('file-input').addEventListener('change', (e) => this.importData(e));
        
        document.getElementById('btn-screenshot').addEventListener('click', () => this.takeScreenshot());
        
        document.getElementById('btn-export').addEventListener('click', () => this.exportReport());
        
        document.getElementById('time-unit-selector').addEventListener('change', (e) => {
            this.parameters.timeUnit = e.target.value;
            this.updateTimeConstants();
        });
        
        document.getElementById('input-r').addEventListener('input', (e) => {
            this.parameters.R = parseFloat(e.target.value) || 0;
            this.updateTimeConstants();
        });
        
        document.getElementById('input-c').addEventListener('input', (e) => {
            this.parameters.C = parseFloat(e.target.value) || 0;
            this.updateTimeConstants();
            this.checkCapacitorAnomaly();
        });
        
        document.getElementById('input-sample').addEventListener('input', (e) => {
            this.parameters.sampleInterval = parseFloat(e.target.value) || 0;
            this.updateTimeConstants();
        });
        
        document.getElementById('filter-show-normal').addEventListener('change', (e) => {
            this.filters.showNormal = e.target.checked;
            this.updateFilteredView();
        });
        
        document.getElementById('filter-show-anomaly').addEventListener('change', (e) => {
            this.filters.showAnomaly = e.target.checked;
            this.updateFilteredView();
        });
        
        document.getElementById('filter-show-fit').addEventListener('change', (e) => {
            this.filters.showFit = e.target.checked;
            if (this.fitCurveMesh) {
                this.fitCurveMesh.visible = e.target.checked;
            }
        });
        
        document.getElementById('time-range-start').addEventListener('input', () => this.updateTimeRange());
        document.getElementById('time-range-end').addEventListener('input', () => this.updateTimeRange());
        
        document.getElementById('view-reset').addEventListener('click', () => {
            this.camera.position.set(15, 10, 15);
            this.controls.reset();
        });
        
        document.getElementById('view-top').addEventListener('click', () => {
            this.camera.position.set(0, 20, 0.1);
            this.controls.target.set(0, 0, 0);
        });
        
        document.getElementById('view-front').addEventListener('click', () => {
            this.camera.position.set(0, 5, 20);
            this.controls.target.set(0, 5, 0);
        });
        
        document.getElementById('modal-close').addEventListener('click', () => {
            document.getElementById('detail-modal').classList.add('hidden');
        });
        
        document.getElementById('report-close').addEventListener('click', () => {
            document.getElementById('report-modal').classList.add('hidden');
        });
        
        document.getElementById('report-download').addEventListener('click', () => this.downloadReport());
        
        document.getElementById('report-copy').addEventListener('click', () => this.copyReportText());
        
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                }
            });
        });
    }
    
    generateDemoData() {
        const tau = this.parameters.R * this.parameters.C;
        const V0 = 5;
        const numPoints = 50;
        
        this.dataPoints = [];
        
        for (let i = 0; i < numPoints; i++) {
            const t = i * this.parameters.sampleInterval;
            const theoreticalV = V0 * (1 - Math.exp(-t / tau));
            const noise = (Math.random() - 0.5) * 0.1;
            const measuredV = theoreticalV + noise;
            
            const isAnomaly = Math.random() < 0.1;
            const finalV = isAnomaly ? measuredV * (1 + (Math.random() - 0.5) * 0.5) : measuredV;
            
            this.dataPoints.push({
                index: i,
                time: t,
                voltage: finalV,
                theoretical: theoreticalV,
                residual: Math.abs(finalV - theoreticalV),
                isAnomaly: isAnomaly,
                anomalyType: isAnomaly ? 'noise_spike' : null,
                rcSnapshot: `R=${this.parameters.R}Ω, C=${this.parameters.C}F`
            });
        }
        
        this.fitExponential();
        this.detectAnomalies();
        this.renderData();
        this.updateChart();
        this.updateTimeConstants();
    }
    
    fitExponential() {
        if (this.dataPoints.length < 3) return;
        
        const validPoints = this.dataPoints.filter(p => !p.isAnomaly);
        if (validPoints.length < 3) validPoints = this.dataPoints;
        
        const V0 = Math.max(...validPoints.map(p => p.voltage));
        const tData = validPoints.map(p => p.time);
        const vData = validPoints.map(p => Math.log(Math.max(0.01, V0 - p.voltage)));
        
        let sumT = 0, sumV = 0, sumTV = 0, sumT2 = 0;
        const n = tData.length;
        
        for (let i = 0; i < n; i++) {
            sumT += tData[i];
            sumV += vData[i];
            sumTV += tData[i] * vData[i];
            sumT2 += tData[i] * tData[i];
        }
        
        const slope = (n * sumTV - sumT * sumV) / (n * sumT2 - sumT * sumT);
        const intercept = (sumV - slope * sumT) / n;
        
        const fittedTau = -1 / slope;
        const fittedV0 = Math.exp(intercept);
        
        this.fitParams = {
            tau: fittedTau,
            V0: V0,
            slope: slope,
            intercept: intercept
        };
        
        let ssRes = 0, ssTot = 0;
        const meanV = validPoints.reduce((sum, p) => sum + p.voltage, 0) / n;
        
        for (const point of validPoints) {
            const fitted = V0 * (1 - Math.exp(-point.time / fittedTau));
            ssRes += Math.pow(point.voltage - fitted, 2);
            ssTot += Math.pow(point.voltage - meanV, 2);
        }
        
        this.fitParams.rSquared = 1 - (ssRes / ssTot);
        
        this.fitCurve = [];
        for (let i = 0; i < this.dataPoints.length; i++) {
            const t = this.dataPoints[i].time;
            this.fitCurve.push({
                time: t,
                voltage: V0 * (1 - Math.exp(-t / fittedTau))
            });
        }
        
        document.getElementById('fit-quality').textContent = 
            `拟合优度 R²: ${this.fitParams.rSquared.toFixed(4)}`;
        document.getElementById('time-constant').textContent = 
            `τ (实测): ${this.formatTime(fittedTau)}`;
    }
    
    detectAnomalies() {
        this.anomalies = [];
        this.conflictLogs = [];
        
        const theoreticalTau = this.parameters.R * this.parameters.C;
        const measuredTau = this.fitParams?.tau || theoreticalTau;
        
        const tauRatio = Math.abs(measuredTau - theoreticalTau) / theoreticalTau;
        if (tauRatio > 0.3) {
            this.addAnomaly('warning', '时间常数偏差过大', 
                `实测τ(${this.formatTime(measuredTau)})与理论τ(${this.formatTime(theoreticalTau)})偏差${(tauRatio*100).toFixed(1)}%`);
            this.addConflictLog('时间常数', 
                `电压序列推导τ ≠ R×C推导τ，偏差${(tauRatio*100).toFixed(1)}%，以电压序列为主但标记异常`);
        }
        
        if (!this.parameters.C || this.parameters.C < 1e-9) {
            this.addAnomaly('error', '电容值异常', '电容值可能漏填或单位错误');
            document.getElementById('c-warning').style.display = 'block';
        } else {
            document.getElementById('c-warning').style.display = 'none';
        }
        
        const lastPoints = this.dataPoints.slice(-10);
        const voltages = lastPoints.map(p => p.voltage);
        const maxV = Math.max(...voltages);
        const minV = Math.min(...voltages);
        const saturationLevel = (maxV - minV) / maxV;
        
        if (saturationLevel < 0.02 && maxV < this.fitParams.V0 * 0.95) {
            this.addAnomaly('warning', '曲线未完全饱和', 
                `数据末端电压变化仅${(saturationLevel*100).toFixed(2)}%，可能未达到稳态`);
        }
        
        for (const point of this.dataPoints) {
            if (point.isAnomaly && point.anomalyType === 'noise_spike') {
                continue;
            }
            
            const expectedV = this.fitParams.V0 * (1 - Math.exp(-point.time / measuredTau));
            const residual = Math.abs(point.voltage - expectedV);
            
            if (residual / expectedV > 0.15) {
                point.isAnomaly = true;
                point.anomalyType = 'outlier';
            }
        }
        
        const timeUnitSuspect = this.checkTimeUnitMismatch();
        if (timeUnitSuspect && (!this.parameters.C || this.parameters.C < 1e-9)) {
            this.addAnomaly('error', '复合异常: 时间单位+电容', 
                '时间单位可能错误且电容值异常，曲线饱和延迟明显');
            this.addConflictLog('复合异常', 
                '时序分析显示时间单位可疑 + 电容参数可疑，已优先保留电压序列原始数据进行拟合');
        }
        
        this.updateAnomalyList();
    }
    
    checkTimeUnitMismatch() {
        if (!this.fitParams) return false;
        
        const riseTime = this.estimateRiseTime();
        const expectedRiseTime = 3 * this.parameters.R * this.parameters.C;
        
        return riseTime > expectedRiseTime * 5;
    }
    
    estimateRiseTime() {
        const V0 = this.fitParams.V0;
        const startV = V0 * 0.1;
        const endV = V0 * 0.9;
        
        let startTime = null, endTime = null;
        
        for (const point of this.dataPoints) {
            if (startTime === null && point.voltage >= startV) {
                startTime = point.time;
            }
            if (point.voltage >= endV) {
                endTime = point.time;
                break;
            }
        }
        
        return endTime && startTime ? endTime - startTime : 0;
    }
    
    addAnomaly(level, title, description) {
        this.anomalies.push({ level, title, description, time: new Date() });
    }
    
    addConflictLog(type, message) {
        this.conflictLogs.push({
            type,
            message,
            timestamp: new Date().toLocaleTimeString(),
            reportId: this.reportId
        });
        this.updateConflictLog();
    }
    
    updateAnomalyList() {
        const container = document.getElementById('anomaly-list');
        
        if (this.anomalies.length === 0) {
            container.innerHTML = `
                <div class="anomaly-item normal">
                    <span class="status-badge">✓</span>
                    <span class="anomaly-text">暂无异常</span>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.anomalies.map(a => `
            <div class="anomaly-item ${a.level}">
                <span class="status-badge">${a.level === 'error' ? '✗' : '⚠'}</span>
                <span class="anomaly-text">
                    <strong>${a.title}</strong><br>
                    <small>${a.description}</small>
                </span>
            </div>
        `).join('');
    }
    
    updateConflictLog() {
        const container = document.getElementById('conflict-log-content');
        
        if (this.conflictLogs.length === 0) {
            container.innerHTML = '<p class="empty-log">暂无冲突记录</p>';
            return;
        }
        
        container.innerHTML = this.conflictLogs.map(log => `
            <div class="conflict-entry">
                [${log.timestamp}] <strong>${log.type}:</strong> ${log.message}
            </div>
        `).join('');
    }
    
    renderData() {
        this.dataMeshes.forEach(mesh => this.scene.remove(mesh));
        this.dataMeshes = [];
        
        if (this.fitCurveMesh) {
            this.scene.remove(this.fitCurveMesh);
        }
        
        const maxTime = Math.max(...this.dataPoints.map(p => p.time));
        const maxVoltage = Math.max(...this.dataPoints.map(p => p.voltage));
        const scaleX = 10 / maxTime;
        const scaleY = 10 / maxVoltage;
        
        for (let i = 0; i < this.dataPoints.length; i++) {
            const point = this.dataPoints[i];
            const geometry = new THREE.SphereGeometry(0.15, 16, 16);
            const color = point.isAnomaly ? 0xef4444 : 0x60a5fa;
            const material = new THREE.MeshPhongMaterial({ color });
            const sphere = new THREE.Mesh(geometry, material);
            
            sphere.position.set(
                point.time * scaleX,
                point.voltage * scaleY,
                Math.sin(i * 0.3) * 0.5
            );
            
            sphere.userData = { pointIndex: i, pointData: point };
            
            this.scene.add(sphere);
            this.dataMeshes.push(sphere);
        }
        
        if (this.fitCurve && this.fitCurve.length > 0) {
            const curvePoints = this.fitCurve.map((p, i) => 
                new THREE.Vector3(
                    p.time * scaleX,
                    p.voltage * scaleY,
                    0
                )
            );
            
            const curveGeometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
            const curveMaterial = new THREE.LineBasicMaterial({ color: 0xf59e0b, linewidth: 2 });
            this.fitCurveMesh = new THREE.Line(curveGeometry, curveMaterial);
            this.scene.add(this.fitCurveMesh);
        }
        
        this.updateFilteredView();
    }
    
    updateFilteredView() {
        const startIdx = Math.floor(this.filters.timeRangeStart / 100 * this.dataPoints.length);
        const endIdx = Math.ceil(this.filters.timeRangeEnd / 100 * this.dataPoints.length);
        
        this.dataMeshes.forEach((mesh, i) => {
            const point = this.dataPoints[i];
            const inTimeRange = i >= startIdx && i <= endIdx;
            const showByType = point.isAnomaly ? this.filters.showAnomaly : this.filters.showNormal;
            mesh.visible = inTimeRange && showByType;
        });
        
        this.updateChart();
    }
    
    updateTimeRange() {
        let start = parseInt(document.getElementById('time-range-start').value);
        let end = parseInt(document.getElementById('time-range-end').value);
        
        if (start > end) [start, end] = [end, start];
        
        this.filters.timeRangeStart = start;
        this.filters.timeRangeEnd = end;
        
        document.getElementById('time-range-display').textContent = `${start}% - ${end}%`;
        this.updateFilteredView();
    }
    
    updateChart() {
        if (!this.chart || !this.dataPoints.length) return;
        
        const startIdx = Math.floor(this.filters.timeRangeStart / 100 * this.dataPoints.length);
        const endIdx = Math.ceil(this.filters.timeRangeEnd / 100 * this.dataPoints.length);
        
        const filteredPoints = this.dataPoints.slice(startIdx, endIdx + 1);
        
        this.chart.data.labels = filteredPoints.map(p => this.formatTime(p.time));
        this.chart.data.datasets[0].data = filteredPoints.map(p => p.voltage);
        this.chart.data.datasets[0].pointBackgroundColor = filteredPoints.map(p => 
            p.isAnomaly ? '#ef4444' : '#60a5fa'
        );
        
        if (this.fitCurve) {
            const filteredFit = this.fitCurve.slice(startIdx, endIdx + 1);
            this.chart.data.datasets[1].data = filteredFit.map(p => p.voltage);
        }
        
        this.chart.update('none');
    }
    
    updateTimeConstants() {
        const theoreticalTau = this.parameters.R * this.parameters.C;
        const measuredTau = this.fitParams?.tau || theoreticalTau;
        const deviation = Math.abs(measuredTau - theoreticalTau) / theoreticalTau * 100;
        
        document.getElementById('theoretical-tau').textContent = this.formatTime(theoreticalTau);
        document.getElementById('measured-tau').textContent = this.formatTime(measuredTau);
        document.getElementById('tau-deviation').textContent = `${deviation.toFixed(2)}%`;
        
        const deviationEl = document.getElementById('tau-deviation');
        if (deviation > 20) {
            deviationEl.style.color = '#ef4444';
        } else if (deviation > 10) {
            deviationEl.style.color = '#f59e0b';
        } else {
            deviationEl.style.color = '#60a5fa';
        }
    }
    
    checkCapacitorAnomaly() {
        this.detectAnomalies();
    }
    
    formatTime(seconds) {
        const unit = this.parameters.timeUnit;
        switch (unit) {
            case 'us': return `${(seconds * 1e6).toFixed(2)} μs`;
            case 'ms': return `${(seconds * 1000).toFixed(2)} ms`;
            case 's': return `${seconds.toFixed(4)} s`;
            default: return `${seconds.toFixed(4)} s`;
        }
    }
    
    onWindowResize() {
        const container = document.getElementById('three-container');
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
    
    onCanvasClick(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.dataMeshes);
        
        if (intersects.length > 0) {
            const mesh = intersects[0].object;
            this.showPointDetail(mesh.userData.pointData);
            
            if (this.selectedPoint) {
                this.selectedPoint.material.emissive.setHex(0x000000);
            }
            mesh.material.emissive.setHex(0xffff00);
            this.selectedPoint = mesh;
        }
    }
    
    onCanvasMouseMove(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.dataMeshes);
        
        this.renderer.domElement.style.cursor = intersects.length > 0 ? 'pointer' : 'grab';
    }
    
    showPointDetail(point) {
        document.getElementById('detail-time').textContent = this.formatTime(point.time);
        document.getElementById('detail-voltage').textContent = `${point.voltage.toFixed(4)} V`;
        document.getElementById('detail-type').textContent = point.isAnomaly ? '异常点' : '正常点';
        document.getElementById('detail-theoretical').textContent = `${point.theoretical.toFixed(4)} V`;
        document.getElementById('detail-residual').textContent = `${point.residual.toFixed(4)} V`;
        document.getElementById('detail-status').textContent = point.isAnomaly ? '偏离拟合' : '拟合良好';
        document.getElementById('detail-sequence-index').textContent = `#${point.index} (共${this.dataPoints.length}个点)`;
        document.getElementById('detail-report-id').textContent = this.reportId;
        document.getElementById('detail-rc-snapshot').textContent = point.rcSnapshot;
        
        document.getElementById('detail-modal').classList.remove('hidden');
    }
    
    takeScreenshot() {
        this.renderer.render(this.scene, this.camera);
        const dataURL = this.renderer.domElement.toDataURL('image/png');
        
        const link = document.createElement('a');
        link.download = `rc-fitting-${Date.now()}.png`;
        link.href = dataURL;
        link.click();
    }
    
    importData(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target.result;
                
                if (file.name.endsWith('.json')) {
                    const data = JSON.parse(content);
                    this.processImportedData(data);
                } else {
                    const lines = content.split('\n').filter(l => l.trim());
                    const data = lines.slice(1).map(line => {
                        const parts = line.split(',');
                        return {
                            time: parseFloat(parts[0]),
                            voltage: parseFloat(parts[1])
                        };
                    }).filter(p => !isNaN(p.time) && !isNaN(p.voltage));
                    
                    this.processImportedData(data);
                }
            } catch (err) {
                alert('数据导入失败: ' + err.message);
            }
        };
        reader.readAsText(file);
    }
    
    processImportedData(data) {
        this.dataPoints = data.map((p, i) => ({
            index: i,
            time: p.time,
            voltage: p.voltage,
            theoretical: p.voltage,
            residual: 0,
            isAnomaly: false,
            anomalyType: null,
            rcSnapshot: `R=${this.parameters.R}Ω, C=${this.parameters.C}F`
        }));
        
        this.fitExponential();
        this.detectAnomalies();
        this.renderData();
        this.updateChart();
        this.updateTimeConstants();
    }
    
    exportReport() {
        const reportContent = this.generateReport();
        document.getElementById('report-content').innerHTML = reportContent;
        document.getElementById('report-modal').classList.remove('hidden');
    }
    
    generateReport() {
        const theoreticalTau = this.parameters.R * this.parameters.C;
        const measuredTau = this.fitParams?.tau || theoreticalTau;
        const rSquared = this.fitParams?.rSquared || 0;
        
        const hasTimeUnitError = this.anomalies.some(a => 
            a.title.includes('时间单位') || a.title.includes('复合异常')
        );
        
        let humanReadableIssues = '';
        if (hasTimeUnitError) {
            humanReadableIssues = `
                <div class="anomaly-explanation">
                    <h5>🤔 为什么这个数据"没通过"？</h5>
                    <p>举个简单的例子：你原本以为泡一碗面需要5分钟（理论时间常数），结果实际泡了50分钟才泡开（实测时间常数）。</p>
                    <p><strong>问题可能出在哪：</strong></p>
                    <p>1️⃣ <strong>时间单位填错了</strong> - 比如把"毫秒"写成"秒"，数据就会慢1000倍</p>
                    <p>2️⃣ <strong>电容值没填对</strong> - 电容就像"水池的大小"，填错了整个充放电节奏就不对了</p>
                    <p>3️⃣ <strong>曲线还没到"饱"</strong> - 就像水还没烧开你就关火了，数据不完整</p>
                    <p><strong>建议：</strong>先检查时间单位是不是选对了，再看看电容值有没有漏填或写错。</p>
                </div>
            `;
        }
        
        const anomalySummary = this.anomalies.length > 0 
            ? this.anomalies.map(a => `
                <tr>
                    <td>${a.level === 'error' ? '🔴 严重' : '🟡 警告'}</td>
                    <td>${a.title}</td>
                    <td>${a.description}</td>
                </tr>
            `).join('')
            : '<tr><td colspan="3" style="text-align:center;color:#10b981;">✓ 无异常检测到</td></tr>';

        return `
            <div class="report-section">
                <h4>📋 实验分析摘要</h4>
                <div class="report-summary">
                    <p><strong>报告编号：</strong>${this.reportId}</p>
                    <p><strong>分析时间：</strong>${new Date().toLocaleString()}</p>
                    <p><strong>数据点数：</strong>${this.dataPoints.length} 个</p>
                    <p><strong>拟合优度 R²：</strong>${(rSquared * 100).toFixed(2)}%</p>
                    <p><strong>结论：</strong>${rSquared > 0.95 ? '✅ 拟合效果良好' : '⚠️ 拟合存在偏差，建议检查'}</p>
                </div>
            </div>
            
            ${humanReadableIssues}
            
            <div class="report-section">
                <h4>📊 关键参数对比</h4>
                <div class="table-wrapper">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>参数</th>
                                <th>理论值 (R×C)</th>
                                <th>实测值 (电压拟合)</th>
                                <th>偏差</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>时间常数 τ</td>
                                <td>${this.formatTime(theoreticalTau)}</td>
                                <td>${this.formatTime(measuredTau)}</td>
                                <td style="color: ${Math.abs(measuredTau-theoreticalTau)/theoreticalTau > 0.2 ? '#ef4444' : '#10b981'}">
                                    ${(Math.abs(measuredTau-theoreticalTau)/theoreticalTau*100).toFixed(1)}%
                                </td>
                            </tr>
                            <tr>
                                <td>电阻 R</td>
                                <td>${this.parameters.R} Ω</td>
                                <td>-</td>
                                <td>-</td>
                            </tr>
                            <tr>
                                <td>电容 C</td>
                                <td>${this.parameters.C} F</td>
                                <td>-</td>
                                <td>-</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="report-section">
                <h4>🚨 异常检测结果</h4>
                <div class="table-wrapper">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>级别</th>
                                <th>异常类型</th>
                                <th>详细说明</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${anomalySummary}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="report-section">
                <h4>📝 冲突留痕记录</h4>
                <div class="table-wrapper">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>时间</th>
                                <th>类型</th>
                                <th>处理说明</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.conflictLogs.length > 0 
                                ? this.conflictLogs.map(log => `
                                    <tr>
                                        <td>${log.timestamp}</td>
                                        <td>${log.type}</td>
                                        <td>${log.message}</td>
                                    </tr>
                                `).join('')
                                : '<tr><td colspan="3" style="text-align:center;color:#64748b;">暂无冲突</td></tr>'
                            }
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="report-section">
                <h4>🔗 数据溯源说明</h4>
                <div class="report-summary">
                    <p><strong>电压序列 → 时间常数：</strong>通过指数拟合直接从电压数据推导</p>
                    <p><strong>R/C参数 → 时间常数：</strong>通过 τ = R × C 公式计算</p>
                    <p><strong>冲突处理原则：</strong>三者不一致时，优先保留电压序列数据，同时记录R/C参数作为补充证据</p>
                    <p><strong>复核方式：</strong>点击任意3D数据点，可查看该点对应的电压序列索引、关联报告编号、以及当时的RC参数快照</p>
                </div>
            </div>
        `;
    }
    
    downloadReport() {
        const reportText = this.generatePlainTextReport();
        const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.download = `RC分析报告-${this.reportId}.txt`;
        link.href = url;
        link.click();
        
        URL.revokeObjectURL(url);
    }
    
    copyReportText() {
        const reportText = this.generatePlainTextReport();
        navigator.clipboard.writeText(reportText).then(() => {
            alert('报告文本已复制到剪贴板！');
        });
    }
    
    generatePlainTextReport() {
        const theoreticalTau = this.parameters.R * this.parameters.C;
        const measuredTau = this.fitParams?.tau || theoreticalTau;
        const rSquared = this.fitParams?.rSquared || 0;
        
        let text = `
════════════════════════════════════════════
         电路RC充放电拟合分析报告
════════════════════════════════════════════

📋 基本信息
────────────────────────────────────────────
报告编号: ${this.reportId}
分析时间: ${new Date().toLocaleString()}
数据点数: ${this.dataPoints.length} 个
拟合优度 R²: ${(rSquared * 100).toFixed(2)}%

📊 参数对比
────────────────────────────────────────────
理论 τ (R×C): ${this.formatTime(theoreticalTau)}
实测 τ (拟合): ${this.formatTime(measuredTau)}
偏差: ${(Math.abs(measuredTau-theoreticalTau)/theoreticalTau*100).toFixed(1)}%

电阻 R: ${this.parameters.R} Ω
电容 C: ${this.parameters.C} F

🚨 异常检测
────────────────────────────────────────────
`;
        
        if (this.anomalies.length === 0) {
            text += '✓ 无异常检测到\n';
        } else {
            this.anomalies.forEach(a => {
                text += `[${a.level.toUpperCase()}] ${a.title}: ${a.description}\n`;
            });
        }
        
        const hasTimeUnitError = this.anomalies.some(a => 
            a.title.includes('时间单位') || a.title.includes('复合异常')
        );
        
        if (hasTimeUnitError) {
            text += `
💡 给非技术同事的解释
────────────────────────────────────────────
为什么这个数据"没通过"？

想象一下：你原本以为泡一碗面需要5分钟，
结果实际泡了50分钟才泡开...

可能的原因：
1. 时间单位填错了 - 比如把"毫秒"写成"秒"
2. 电容值没填对 - 就像"水池大小"写错了
3. 曲线还没到"饱" - 水没烧开就关火了

建议：先检查时间单位，再看电容值。
`;
        }
        
        text += `
📝 冲突留痕
────────────────────────────────────────────
`;
        
        if (this.conflictLogs.length === 0) {
            text += '暂无冲突记录\n';
        } else {
            this.conflictLogs.forEach(log => {
                text += `[${log.timestamp}] ${log.type}: ${log.message}\n`;
            });
        }
        
        text += `
🔗 数据溯源说明
────────────────────────────────────────────
• 电压序列 → 时间常数：通过指数拟合推导
• R/C参数 → 时间常数：通过 τ = R × C 计算
• 冲突处理：优先保留电压序列数据，R/C作为补充证据
• 复核方式：点击3D数据点查看完整溯源信息

════════════════════════════════════════════
`;
        
        return text;
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new RCFittingSystem();
});
