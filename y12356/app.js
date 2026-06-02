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
        this.dataSet = null;
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
        var container = document.getElementById('three-container');
        var width = container.clientWidth;
        var height = container.clientHeight;
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
        var ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        var directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        this.scene.add(directionalLight);
        this.createGrid();
        this.createAxes();
    }

    createGrid() {
        var gridHelper = new THREE.GridHelper(20, 20, 0x334155, 0x1e293b);
        this.scene.add(gridHelper);
    }

    createAxes() {
        var axesGroup = new THREE.Group();
        var xGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(12,0,0)]);
        var yGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,12,0)]);
        var zGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,12)]);
        axesGroup.add(new THREE.Line(xGeom, new THREE.LineBasicMaterial({color:0xef4444})));
        axesGroup.add(new THREE.Line(yGeom, new THREE.LineBasicMaterial({color:0x10b981})));
        axesGroup.add(new THREE.Line(zGeom, new THREE.LineBasicMaterial({color:0x3b82f6})));
        this.scene.add(axesGroup);
    }

    initChart() {
        var ctx = document.getElementById('chart-2d').getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    { label: '实测数据', data: [], borderColor: '#60a5fa', backgroundColor: 'rgba(96,165,250,0.1)', fill: true, tension: 0.1, pointRadius: 3 },
                    { label: '拟合曲线', data: [], borderColor: '#f59e0b', backgroundColor: 'transparent', tension: 0.4, pointRadius: 0, borderWidth: 2 }
                ]
            },
            options: {
                responsive: true,
                plugins: { legend: { labels: { color: '#94a3b8' } } },
                scales: {
                    x: { grid: { color: 'rgba(100,116,139,0.2)' }, ticks: { color: '#94a3b8' } },
                    y: { grid: { color: 'rgba(100,116,139,0.2)' }, ticks: { color: '#94a3b8' } }
                }
            }
        });
    }

    bindEvents() {
        var self = this;
        window.addEventListener('resize', function() { self.onWindowResize(); });
        this.renderer.domElement.addEventListener('click', function(e) { self.onCanvasClick(e); });
        this.renderer.domElement.addEventListener('mousemove', function(e) { self.onCanvasMouseMove(e); });
        document.getElementById('btn-import').addEventListener('click', function() { document.getElementById('file-input').click(); });
        document.getElementById('file-input').addEventListener('change', function(e) { self.importData(e); });
        document.getElementById('btn-screenshot').addEventListener('click', function() { self.takeScreenshot(); });
        document.getElementById('btn-export').addEventListener('click', function() { self.exportReport(); });
        document.getElementById('time-unit-selector').addEventListener('change', function(e) {
            self.parameters.timeUnit = e.target.value;
            self.updateTimeConstants();
        });
        document.getElementById('input-r').addEventListener('input', function(e) {
            self.parameters.R = parseFloat(e.target.value) || 0;
            self.updateTimeConstants();
        });
        document.getElementById('input-c').addEventListener('input', function(e) {
            self.parameters.C = parseFloat(e.target.value) || 0;
            self.updateTimeConstants();
            self.checkCapacitorAnomaly();
        });
        document.getElementById('input-sample').addEventListener('input', function(e) {
            self.parameters.sampleInterval = parseFloat(e.target.value) || 0;
            self.updateTimeConstants();
        });
        document.getElementById('filter-show-normal').addEventListener('change', function(e) {
            self.filters.showNormal = e.target.checked;
            self.updateFilteredView();
        });
        document.getElementById('filter-show-anomaly').addEventListener('change', function(e) {
            self.filters.showAnomaly = e.target.checked;
            self.updateFilteredView();
        });
        document.getElementById('filter-show-fit').addEventListener('change', function(e) {
            self.filters.showFit = e.target.checked;
            if (self.fitCurveMesh) self.fitCurveMesh.visible = e.target.checked;
        });
        document.getElementById('time-range-start').addEventListener('input', function() { self.updateTimeRange(); });
        document.getElementById('time-range-end').addEventListener('input', function() { self.updateTimeRange(); });
        document.getElementById('view-reset').addEventListener('click', function() {
            self.camera.position.set(15, 10, 15);
            self.controls.reset();
        });
        document.getElementById('view-top').addEventListener('click', function() {
            self.camera.position.set(0, 20, 0.1);
            self.controls.target.set(0, 0, 0);
        });
        document.getElementById('view-front').addEventListener('click', function() {
            self.camera.position.set(0, 5, 20);
            self.controls.target.set(0, 5, 0);
        });
        document.getElementById('modal-close').addEventListener('click', function() {
            document.getElementById('detail-modal').classList.add('hidden');
        });
        document.getElementById('report-close').addEventListener('click', function() {
            document.getElementById('report-modal').classList.add('hidden');
        });
        document.getElementById('report-download').addEventListener('click', function() { self.downloadReport(); });
        document.getElementById('report-copy').addEventListener('click', function() { self.copyReportText(); });
        document.querySelectorAll('.modal').forEach(function(modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === modal) modal.classList.add('hidden');
            });
        });
    }

    generateDemoData() {
        var realR = 1000;
        var realC = 0.001;
        var realTau = realR * realC;
        var V0 = 5;
        var realSampleS = 0.001;
        var numPoints = 30;

        var declaredTimeUnit = 'ms';
        var declaredC = null;

        var rawPoints = [];
        for (var i = 0; i < numPoints; i++) {
            var t = i * realSampleS;
            var v = V0 * (1 - Math.exp(-t / realTau));
            rawPoints.push({ t: t, v: v });
        }

        var timeColumnValues = rawPoints.map(function(p) { return p.t * 1000; });

        this.dataSet = {
            source: 'demo-scenario',
            createdAt: new Date().toISOString(),
            reportId: this.reportId,
            voltageSequence: rawPoints.map(function(p) { return p.v; }),
            boundR: realR,
            boundC: declaredC,
            boundSampleInterval: 1,
            declaredTimeUnit: declaredTimeUnit,
            actualTimeUnit: 's',
            rcSnapshot: 'R=' + realR + '\u03A9, C=' + (declaredC !== null ? declaredC + 'F' : '\u672A\u586B') + ', \u91C7\u6837=1ms'
        };

        this.parameters.R = realR;
        this.parameters.C = declaredC !== null ? declaredC : 0;
        this.parameters.sampleInterval = 1;
        this.parameters.timeUnit = declaredTimeUnit;

        document.getElementById('input-r').value = realR;
        document.getElementById('input-c').value = declaredC !== null ? declaredC : '';
        document.getElementById('input-sample').value = 1;
        document.getElementById('time-unit-selector').value = declaredTimeUnit;

        this.dataPoints = [];
        for (var i = 0; i < numPoints; i++) {
            this.dataPoints.push({
                index: i,
                time: timeColumnValues[i],
                voltage: rawPoints[i].v,
                theoretical: rawPoints[i].v,
                residual: 0,
                isAnomaly: false,
                anomalyType: null,
                rcSnapshot: this.dataSet.rcSnapshot,
                dataSetRef: this.dataSet
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

        var validPoints = this.dataPoints.filter(function(p) { return !p.isAnomaly; });
        if (validPoints.length < 3) validPoints = this.dataPoints.slice();

        var V0 = Math.max.apply(null, validPoints.map(function(p) { return p.voltage; }));
        var tData = validPoints.map(function(p) { return p.time; });
        var vData = validPoints.map(function(p) { return Math.log(Math.max(0.01, V0 - p.voltage)); });

        var sumT = 0, sumV = 0, sumTV = 0, sumT2 = 0;
        var n = tData.length;
        for (var i = 0; i < n; i++) {
            sumT += tData[i];
            sumV += vData[i];
            sumTV += tData[i] * vData[i];
            sumT2 += tData[i] * tData[i];
        }

        var denom = n * sumT2 - sumT * sumT;
        if (Math.abs(denom) < 1e-15) {
            this.fitParams = { tau: 0, V0: V0, rSquared: 0 };
            this.fitCurve = this.dataPoints.map(function(p) { return { time: p.time, voltage: V0 }; });
            document.getElementById('fit-quality').textContent = '\u62DF\u5408\u4F18\u5EA6 R\u00B2: N/A';
            document.getElementById('time-constant').textContent = '\u03C4 (\u5B9E\u6D4B): N/A';
            return;
        }

        var slope = (n * sumTV - sumT * sumV) / denom;
        var intercept = (sumV - slope * sumT) / n;
        var fittedTau = -1 / slope;

        this.fitParams = { tau: fittedTau, V0: V0, slope: slope, intercept: intercept };

        var ssRes = 0, ssTot = 0;
        var meanV = validPoints.reduce(function(s, p) { return s + p.voltage; }, 0) / n;
        for (var i = 0; i < validPoints.length; i++) {
            var fitted = V0 * (1 - Math.exp(-validPoints[i].time / fittedTau));
            ssRes += Math.pow(validPoints[i].voltage - fitted, 2);
            ssTot += Math.pow(validPoints[i].voltage - meanV, 2);
        }
        this.fitParams.rSquared = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;

        this.fitCurve = [];
        for (var i = 0; i < this.dataPoints.length; i++) {
            var t = this.dataPoints[i].time;
            var fv = V0 * (1 - Math.exp(-t / fittedTau));
            this.fitCurve.push({ time: t, voltage: fv });
            this.dataPoints[i].theoretical = fv;
            this.dataPoints[i].residual = Math.abs(this.dataPoints[i].voltage - fv);
        }

        document.getElementById('fit-quality').textContent = '\u62DF\u5408\u4F18\u5EA6 R\u00B2: ' + this.fitParams.rSquared.toFixed(4);
        document.getElementById('time-constant').textContent = '\u03C4 (\u5B9E\u6D4B): ' + this.formatTime(fittedTau);
    }

    detectAnomalies() {
        this.anomalies = [];
        this.conflictLogs = [];
        var seq = 0;
        var theoreticalTau = this.parameters.R * (this.parameters.C || 0);
        var measuredTau = this.fitParams ? this.fitParams.tau : theoreticalTau;

        var cMissing = !this.parameters.C || this.parameters.C < 1e-9;

        if (cMissing) {
            seq++;
            this.addAnomaly(seq, 'error', '\u7535\u5BB9\u503C\u6F0F\u586B\u6216\u5F02\u5E38',
                '\u7535\u5BB9 C \u672A\u586B\u5199\u6216\u503C\u5F02\u5E38\uFF0C\u65E0\u6CD5\u901A\u8FC7 R\u00D7C \u8BA1\u7B97\u7406\u8BBA\u03C4\uFF0C\u53EA\u80FD\u4F9D\u8D56\u7535\u538B\u5E8F\u5217\u62DF\u5408');
            this.addConflictLog('\u7535\u5BB9\u7F3A\u5931',
                'C \u672A\u586B\uFF0C\u7406\u8BBA\u03C4 \u65E0\u6CD5\u8BA1\u7B97\uFF0C\u5DF2\u7559\u75D5\u5E76\u4EE5\u7535\u538B\u62DF\u5408\u03C4 \u4E3A\u51C6');
            document.getElementById('c-warning').style.display = 'block';
        } else {
            document.getElementById('c-warning').style.display = 'none';
        }

        var tauRatio = theoreticalTau > 0 ? Math.abs(measuredTau - theoreticalTau) / theoreticalTau : 0;
        if (!cMissing && tauRatio > 0.3) {
            seq++;
            this.addAnomaly(seq, 'warning', '\u65F6\u95F4\u5E38\u6570\u504F\u5DEE\u8FC7\u5927',
                '\u5B9E\u6D4B\u03C4(' + this.formatTime(measuredTau) + ')\u4E0E\u7406\u8BBA\u03C4(' + this.formatTime(theoreticalTau) + ')\u504F\u5DEE' + (tauRatio * 100).toFixed(1) + '%');
            this.addConflictLog('\u65F6\u95F4\u5E38\u6570',
                '\u7535\u538B\u5E8F\u5217\u63A8\u5BFC\u03C4 \u2260 R\u00D7C\u63A8\u5BFC\u03C4\uFF0C\u504F\u5DEE' + (tauRatio * 100).toFixed(1) + '%\uFF0C\u4EE5\u7535\u538B\u5E8F\u5217\u4E3A\u4E3B\u4F46\u6807\u8BB0\u5F02\u5E38');
        }

        var timeUnitSuspect = this.checkTimeUnitMismatch();
        if (timeUnitSuspect) {
            seq++;
            this.addAnomaly(seq, 'warning', '\u65F6\u95F4\u5355\u4F4D\u53EF\u80FD\u9519\u8BEF',
                '\u5B9E\u6D4B\u4E0A\u5347\u65F6\u95F4\u8FDC\u5927\u4E8E\u7406\u8BBA\u9884\u671F\uFF0C\u65F6\u95F4\u8F74\u53EF\u80FD\u5355\u4F4D\u6807\u9519\uFF08\u5982 ms \u5199\u6210 s\uFF09');
            this.addConflictLog('\u65F6\u95F4\u5355\u4F4D',
                '\u65F6\u95F4\u5355\u4F4D\u53EF\u7591\uFF0C\u5DF2\u7559\u75D5\uFF0C\u4FDD\u7559\u539F\u59CB\u6570\u636E\u4E0D\u505A\u8F6C\u6362');
        }

        if (this.fitParams) {
            var lastPoints = this.dataPoints.slice(-10);
            var voltages = lastPoints.map(function(p) { return p.voltage; });
            var maxV = Math.max.apply(null, voltages);
            var minV = Math.min.apply(null, voltages);
            var saturationLevel = maxV > 0 ? (maxV - minV) / maxV : 0;
            if (saturationLevel < 0.02 && maxV < this.fitParams.V0 * 0.95) {
                seq++;
                this.addAnomaly(seq, 'warning', '\u66F2\u7EBF\u672A\u5B8C\u5168\u9971\u548C',
                    '\u6570\u636E\u672B\u7AEF\u7535\u538B\u53D8\u5316\u4EC5' + (saturationLevel * 100).toFixed(2) + '%\uFF0C\u672A\u8FBE\u7A33\u6001\uFF0C\u53EF\u80FD\u91C7\u6837\u65F6\u95F4\u4E0D\u591F');
                this.addConflictLog('\u9971\u548C\u4E0D\u8DB3',
                    '\u66F2\u7EBF\u672A\u9971\u548C\uFF0C\u5B9E\u6D4B\u03C4 \u53EF\u80FD\u4E0D\u51C6\uFF0C\u5DF2\u7559\u75D5');
            }
        }

        if (timeUnitSuspect && cMissing) {
            seq++;
            this.addAnomaly(seq, 'error', '\u590D\u5408\u5F02\u5E38: \u65F6\u95F4\u5355\u4F4D\u9519+\u7535\u5BB9\u6F0F\u586B',
                '\u65F6\u95F4\u5355\u4F4D\u53EF\u80FD\u9519\u8BEF\u4E14\u7535\u5BB9\u503C\u6F0F\u586B\uFF0C\u66F2\u7EBF\u9971\u548C\u5EF6\u8FDF\u660E\u663E\uFF0C\u65E0\u6CD5\u4EA4\u53C9\u9A8C\u8BC1');
            this.addConflictLog('\u590D\u5408\u5F02\u5E38',
                '\u65F6\u95F4\u5355\u4F4D\u53EF\u7591 + \u7535\u5BB9\u7F3A\u5931\uFF0C\u65E0\u6CD5\u4EA4\u53C9\u6821\u9A8C\uFF0C\u5DF2\u4F18\u5148\u4FDD\u7559\u7535\u538B\u5E8F\u5217\u539F\u59CB\u6570\u636E\u8FDB\u884C\u62DF\u5408');
        }

        for (var i = 0; i < this.dataPoints.length; i++) {
            var point = this.dataPoints[i];
            if (point.isAnomaly && point.anomalyType === 'noise_spike') continue;
            if (!this.fitParams || this.fitParams.tau === 0) continue;
            var expectedV = this.fitParams.V0 * (1 - Math.exp(-point.time / this.fitParams.tau));
            var residual = Math.abs(point.voltage - expectedV);
            if (expectedV > 0 && residual / expectedV > 0.15) {
                point.isAnomaly = true;
                point.anomalyType = 'outlier';
            }
        }

        this.updateAnomalyList();
    }

    checkTimeUnitMismatch() {
        if (!this.fitParams || !this.parameters.R) return false;
        var riseTime = this.estimateRiseTime();
        if (riseTime <= 0) return false;
        var cVal = this.parameters.C || 0;
        var expectedRiseTime = 2.2 * this.parameters.R * cVal;
        if (expectedRiseTime <= 0) return true;
        return riseTime > expectedRiseTime * 5;
    }

    estimateRiseTime() {
        if (!this.fitParams) return 0;
        var V0 = this.fitParams.V0;
        var startV = V0 * 0.1;
        var endV = V0 * 0.9;
        var startTime = null, endTime = null;
        for (var i = 0; i < this.dataPoints.length; i++) {
            if (startTime === null && this.dataPoints[i].voltage >= startV) startTime = this.dataPoints[i].time;
            if (this.dataPoints[i].voltage >= endV) { endTime = this.dataPoints[i].time; break; }
        }
        return endTime !== null && startTime !== null ? endTime - startTime : 0;
    }

    addAnomaly(seq, level, title, description) {
        this.anomalies.push({ seq: seq, level: level, title: title, description: description, time: new Date() });
    }

    addConflictLog(type, message) {
        this.conflictLogs.push({
            seq: this.conflictLogs.length + 1,
            type: type,
            message: message,
            timestamp: new Date().toLocaleTimeString(),
            reportId: this.reportId
        });
        this.updateConflictLog();
    }

    updateAnomalyList() {
        var container = document.getElementById('anomaly-list');
        if (this.anomalies.length === 0) {
            container.innerHTML = '<div class="anomaly-item normal"><span class="status-badge">\u2713</span><span class="anomaly-text">\u6682\u65E0\u5F02\u5E38</span></div>';
            return;
        }
        container.innerHTML = this.anomalies.map(function(a) {
            var badge = a.level === 'error' ? '\u2717' : '\u26A0';
            return '<div class="anomaly-item ' + a.level + '">' +
                '<span class="status-badge">#' + a.seq + ' ' + badge + '</span>' +
                '<span class="anomaly-text"><strong>' + a.title + '</strong><br><small>' + a.description + '</small></span></div>';
        }).join('');
    }

    updateConflictLog() {
        var container = document.getElementById('conflict-log-content');
        if (this.conflictLogs.length === 0) {
            container.innerHTML = '<p class="empty-log">\u6682\u65E0\u51B2\u7A81\u8BB0\u5F55</p>';
            return;
        }
        container.innerHTML = this.conflictLogs.map(function(log) {
            return '<div class="conflict-entry">[#' + log.seq + ' ' + log.timestamp + '] <strong>' + log.type + ':</strong> ' + log.message + '</div>';
        }).join('');
    }

    renderData() {
        var self = this;
        this.dataMeshes.forEach(function(m) { self.scene.remove(m); });
        this.dataMeshes = [];
        if (this.fitCurveMesh) this.scene.remove(this.fitCurveMesh);
        if (this.dataPoints.length === 0) return;

        var maxTime = Math.max.apply(null, this.dataPoints.map(function(p) { return p.time; }));
        var maxVoltage = Math.max.apply(null, this.dataPoints.map(function(p) { return p.voltage; }));
        var scaleX = 10 / (maxTime || 1);
        var scaleY = 10 / (maxVoltage || 1);

        for (var i = 0; i < this.dataPoints.length; i++) {
            var point = this.dataPoints[i];
            var geometry = new THREE.SphereGeometry(0.15, 16, 16);
            var color = point.isAnomaly ? 0xef4444 : 0x60a5fa;
            var material = new THREE.MeshPhongMaterial({ color: color });
            var sphere = new THREE.Mesh(geometry, material);
            sphere.position.set(point.time * scaleX, point.voltage * scaleY, Math.sin(i * 0.3) * 0.5);
            sphere.userData = { pointIndex: i, pointData: point };
            this.scene.add(sphere);
            this.dataMeshes.push(sphere);
        }

        if (this.fitCurve && this.fitCurve.length > 0) {
            var curvePoints = this.fitCurve.map(function(p) { return new THREE.Vector3(p.time * scaleX, p.voltage * scaleY, 0); });
            var curveGeom = new THREE.BufferGeometry().setFromPoints(curvePoints);
            this.fitCurveMesh = new THREE.Line(curveGeom, new THREE.LineBasicMaterial({ color: 0xf59e0b, linewidth: 2 }));
            this.scene.add(this.fitCurveMesh);
        }
        this.updateFilteredView();
    }

    updateFilteredView() {
        var startIdx = Math.floor(this.filters.timeRangeStart / 100 * this.dataPoints.length);
        var endIdx = Math.ceil(this.filters.timeRangeEnd / 100 * this.dataPoints.length);
        for (var i = 0; i < this.dataMeshes.length; i++) {
            var point = this.dataPoints[i];
            var inRange = i >= startIdx && i <= endIdx;
            var showType = point.isAnomaly ? this.filters.showAnomaly : this.filters.showNormal;
            this.dataMeshes[i].visible = inRange && showType;
        }
        this.updateChart();
    }

    updateTimeRange() {
        var start = parseInt(document.getElementById('time-range-start').value);
        var end = parseInt(document.getElementById('time-range-end').value);
        if (start > end) { var tmp = start; start = end; end = tmp; }
        this.filters.timeRangeStart = start;
        this.filters.timeRangeEnd = end;
        document.getElementById('time-range-display').textContent = start + '% - ' + end + '%';
        this.updateFilteredView();
    }

    updateChart() {
        if (!this.chart || !this.dataPoints.length) return;
        var startIdx = Math.floor(this.filters.timeRangeStart / 100 * this.dataPoints.length);
        var endIdx = Math.ceil(this.filters.timeRangeEnd / 100 * this.dataPoints.length);
        var filtered = this.dataPoints.slice(startIdx, endIdx + 1);
        this.chart.data.labels = filtered.map(function(p) { return p.time.toFixed(3); });
        this.chart.data.datasets[0].data = filtered.map(function(p) { return p.voltage; });
        this.chart.data.datasets[0].pointBackgroundColor = filtered.map(function(p) { return p.isAnomaly ? '#ef4444' : '#60a5fa'; });
        if (this.fitCurve) {
            var fFit = this.fitCurve.slice(startIdx, endIdx + 1);
            this.chart.data.datasets[1].data = fFit.map(function(p) { return p.voltage; });
        }
        this.chart.update('none');
    }

    updateTimeConstants() {
        var theoreticalTau = this.parameters.R * (this.parameters.C || 0);
        var measuredTau = this.fitParams ? this.fitParams.tau : theoreticalTau;
        var deviation = theoreticalTau > 0 ? Math.abs(measuredTau - theoreticalTau) / theoreticalTau * 100 : 0;
        document.getElementById('theoretical-tau').textContent =
            theoreticalTau > 0 ? this.formatTime(theoreticalTau) : '\u65E0\u6CD5\u8BA1\u7B97 (C\u672A\u586B)';
        document.getElementById('measured-tau').textContent = this.formatTime(measuredTau);
        document.getElementById('tau-deviation').textContent = theoreticalTau > 0 ? deviation.toFixed(2) + '%' : '-';
        var el = document.getElementById('tau-deviation');
        if (theoreticalTau > 0) {
            el.style.color = deviation > 20 ? '#ef4444' : deviation > 10 ? '#f59e0b' : '#60a5fa';
        } else {
            el.style.color = '#64748b';
        }
    }

    checkCapacitorAnomaly() { this.detectAnomalies(); }

    formatTime(seconds) {
        switch (this.parameters.timeUnit) {
            case 'us': return (seconds * 1e6).toFixed(2) + ' \u03BCs';
            case 'ms': return (seconds * 1000).toFixed(2) + ' ms';
            case 's': return seconds.toFixed(4) + ' s';
            default: return seconds.toFixed(4) + ' s';
        }
    }

    onWindowResize() {
        var container = document.getElementById('three-container');
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
    }

    onCanvasClick(event) {
        var rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        var intersects = this.raycaster.intersectObjects(this.dataMeshes);
        if (intersects.length > 0) {
            var mesh = intersects[0].object;
            this.showPointDetail(mesh.userData.pointData);
            if (this.selectedPoint) this.selectedPoint.material.emissive.setHex(0x000000);
            mesh.material.emissive.setHex(0xffff00);
            this.selectedPoint = mesh;
        }
    }

    onCanvasMouseMove(event) {
        var rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        var intersects = this.raycaster.intersectObjects(this.dataMeshes);
        this.renderer.domElement.style.cursor = intersects.length > 0 ? 'pointer' : 'grab';
    }

    showPointDetail(point) {
        document.getElementById('detail-time').textContent = this.formatTime(point.time);
        document.getElementById('detail-voltage').textContent = point.voltage.toFixed(4) + ' V';
        document.getElementById('detail-type').textContent = point.isAnomaly ? '\u5F02\u5E38\u70B9' : '\u6B63\u5E38\u70B9';
        document.getElementById('detail-theoretical').textContent = point.theoretical.toFixed(4) + ' V';
        document.getElementById('detail-residual').textContent = point.residual.toFixed(4) + ' V';
        document.getElementById('detail-status').textContent = point.isAnomaly ? '\u504F\u79BB\u62DF\u5408' : '\u62DF\u5408\u826F\u597D';
        document.getElementById('detail-sequence-index').textContent =
            '#' + point.index + ' (\u5171' + this.dataPoints.length + '\u4E2A\u70B9)';
        document.getElementById('detail-report-id').textContent = this.reportId;
        document.getElementById('detail-rc-snapshot').textContent = point.rcSnapshot;
        document.getElementById('detail-modal').classList.remove('hidden');
    }

    takeScreenshot() {
        this.renderer.render(this.scene, this.camera);
        var dataURL = this.renderer.domElement.toDataURL('image/png');
        var link = document.createElement('a');
        link.download = 'rc-fitting-' + Date.now() + '.png';
        link.href = dataURL;
        link.click();
    }

    importData(event) {
        var self = this;
        var file = event.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function(e) {
            try {
                var content = e.target.result;
                if (file.name.endsWith('.json')) {
                    self.processImportedData(JSON.parse(content));
                } else {
                    var lines = content.split('\n').filter(function(l) { return l.trim(); });
                    var header = lines[0].split(',').map(function(h) { return h.trim().toLowerCase(); });
                    var timeIdx = Math.max(header.indexOf('time'), 0);
                    var voltageIdx = header.indexOf('voltage') !== -1 ? header.indexOf('voltage') : 1;
                    var rIdx = header.indexOf('r');
                    var cIdx = header.indexOf('c');
                    var sampleIdx = header.indexOf('sampleinterval') !== -1 ? header.indexOf('sampleinterval') : header.indexOf('sample');
                    var rows = lines.slice(1).map(function(line) {
                        var parts = line.split(',');
                        var row = { time: parseFloat(parts[timeIdx]), voltage: parseFloat(parts[voltageIdx]) };
                        if (rIdx !== -1 && parts[rIdx]) row.R = parseFloat(parts[rIdx]);
                        if (cIdx !== -1 && parts[cIdx]) row.C = parseFloat(parts[cIdx]);
                        if (sampleIdx !== -1 && parts[sampleIdx]) row.sampleInterval = parseFloat(parts[sampleIdx]);
                        return row;
                    }).filter(function(p) { return !isNaN(p.time) && !isNaN(p.voltage); });
                    var data = { points: rows };
                    var first = rows[0] || {};
                    if (!isNaN(first.R)) data.R = first.R;
                    if (!isNaN(first.C)) data.C = first.C;
                    if (!isNaN(first.sampleInterval)) data.sampleInterval = first.sampleInterval;
                    self.processImportedData(data);
                }
            } catch (err) {
                alert('\u6570\u636E\u5BFC\u5165\u5931\u8D25: ' + err.message);
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    processImportedData(data) {
        var boundR = data.R !== undefined ? data.R : this.parameters.R;
        var boundC = data.C !== undefined ? data.C : (this.parameters.C || null);
        var boundSample = data.sampleInterval !== undefined ? data.sampleInterval : this.parameters.sampleInterval;
        var boundTimeUnit = data.timeUnit || this.parameters.timeUnit;

        var points = data.points || data;
        if (!Array.isArray(points)) {
            alert('\u6570\u636E\u683C\u5F0F\u9519\u8BEF\uFF1A\u9700\u8981 points \u6570\u7EC4\u6216\u76F4\u63A5\u6570\u7EC4');
            return;
        }

        var rcSnapshot = 'R=' + boundR + '\u03A9, C=' + (boundC !== null && boundC !== undefined ? boundC + 'F' : '\u672A\u586B') +
            ', \u91C7\u6837=' + boundSample + (boundTimeUnit === 'ms' ? 'ms' : boundTimeUnit === 'us' ? '\u03BCs' : 's');

        this.dataSet = {
            source: 'import',
            createdAt: new Date().toISOString(),
            reportId: this.reportId,
            voltageSequence: points.map(function(p) { return p.voltage; }),
            boundR: boundR,
            boundC: boundC,
            boundSampleInterval: boundSample,
            declaredTimeUnit: boundTimeUnit,
            rcSnapshot: rcSnapshot
        };

        this.parameters.R = boundR;
        this.parameters.C = boundC !== null ? boundC : 0;
        this.parameters.sampleInterval = boundSample;
        this.parameters.timeUnit = boundTimeUnit;

        document.getElementById('input-r').value = boundR;
        document.getElementById('input-c').value = boundC !== null ? boundC : '';
        document.getElementById('input-sample').value = boundSample;
        document.getElementById('time-unit-selector').value = boundTimeUnit;

        var self = this;
        this.dataPoints = points.map(function(p, i) {
            return {
                index: i,
                time: p.time,
                voltage: p.voltage,
                theoretical: p.voltage,
                residual: 0,
                isAnomaly: false,
                anomalyType: null,
                rcSnapshot: rcSnapshot,
                dataSetRef: self.dataSet
            };
        });

        this.fitExponential();
        this.detectAnomalies();
        this.renderData();
        this.updateChart();
        this.updateTimeConstants();
    }

    exportReport() {
        document.getElementById('report-content').innerHTML = this.generateReport();
        document.getElementById('report-modal').classList.remove('hidden');
    }

    generateReport() {
        var theoreticalTau = this.parameters.R * (this.parameters.C || 0);
        var measuredTau = this.fitParams ? this.fitParams.tau : theoreticalTau;
        var rSquared = this.fitParams ? this.fitParams.rSquared : 0;
        var ds = this.dataSet;

        var hasTimeUnitError = this.anomalies.some(function(a) {
            return a.title.indexOf('\u65F6\u95F4\u5355\u4F4D') !== -1 || a.title.indexOf('\u590D\u5408\u5F02\u5E38') !== -1;
        });

        var humanReadableIssues = '';
        if (hasTimeUnitError) {
            humanReadableIssues = '<div class="anomaly-explanation">' +
                '<h5>\uD83E\uDD14 \u4E3A\u4EC0\u4E48\u8FD9\u4E2A\u6570\u636E\u201C\u6CA1\u901A\u8FC7\u201D\uFF1F</h5>' +
                '<p>\u4E3E\u4E2A\u7B80\u5355\u7684\u4F8B\u5B50\uFF1A\u4F60\u539F\u672C\u4EE5\u4E3A\u6CE1\u4E00\u7897\u9762\u9700\u89815\u5206\u949F\uFF08\u7406\u8BBA\u65F6\u95F4\u5E38\u6570\uFF09\uFF0C\u7ED3\u679C\u5B9E\u9645\u6CE1\u4E8650\u5206\u949F\u624D\u6CE1\u5F00\uFF08\u5B9E\u6D4B\u65F6\u95F4\u5E38\u6570\uFF09\u3002</p>' +
                '<p><strong>\u95EE\u9898\u53EF\u80FD\u51FA\u5728\u54EA\uFF1A</strong></p>' +
                '<p>1\uFE0F\u20E3 <strong>\u65F6\u95F4\u5355\u4F4D\u586B\u9519\u4E86</strong> - \u6BD4\u5982\u628A\u201C\u6BEB\u79D2\u201D\u5199\u6210\u201C\u79D2\u201D\uFF0C\u6570\u636E\u5C31\u4F1A\u61621000\u500D</p>' +
                '<p>2\uFE0F\u20E3 <strong>\u7535\u5BB9\u503C\u6CA1\u586B\u5BF9</strong> - \u7535\u5BB9\u5C31\u50CF\u201C\u6C34\u6C60\u7684\u5927\u5C0F\u201D\uFF0C\u586B\u9519\u4E86\u6574\u4E2A\u5145\u653E\u7535\u8282\u594F\u5C31\u4E0D\u5BF9\u4E86</p>' +
                '<p>3\uFE0F\u20E3 <strong>\u66F2\u7EBF\u8FD8\u6CA1\u5230\u201C\u9971\u201D</strong> - \u5C31\u50CF\u6C34\u8FD8\u6CA1\u70E7\u5F00\u4F60\u5C31\u5173\u706B\u4E86\uFF0C\u6570\u636E\u4E0D\u5B8C\u6574</p>' +
                '<p><strong>\u5EFA\u8BAE\uFF1A</strong>\u5148\u68C0\u67E5\u65F6\u95F4\u5355\u4F4D\u662F\u4E0D\u662F\u9009\u5BF9\u4E86\uFF0C\u518D\u770B\u770B\u7535\u5BB9\u503C\u6709\u6CA1\u6709\u6F0F\u586B\u6216\u5199\u9519\u3002</p></div>';
        }

        var anomalyRows = this.anomalies.length > 0
            ? this.anomalies.map(function(a) {
                return '<tr><td>#' + a.seq + '</td><td>' + (a.level === 'error' ? '\uD83D\uDD34 \u4E25\u91CD' : '\uD83D\uDFE1 \u8B66\u544A') + '</td><td>' + a.title + '</td><td>' + a.description + '</td></tr>';
            }).join('')
            : '<tr><td colspan="4" style="text-align:center;color:#10b981;">\u2713 \u65E0\u5F02\u5E38</td></tr>';

        var conflictRows = this.conflictLogs.length > 0
            ? this.conflictLogs.map(function(log) {
                return '<tr><td>#' + log.seq + '</td><td>' + log.timestamp + '</td><td>' + log.type + '</td><td>' + log.message + '</td></tr>';
            }).join('')
            : '<tr><td colspan="4" style="text-align:center;color:#64748b;">\u6682\u65E0\u51B2\u7A81</td></tr>';

        var dsInfo = '';
        if (ds) {
            dsInfo = '<div class="report-section"><h4>\uD83D\uDCE6 \u6570\u636E\u96C6\u7ED1\u5B9A\u4FE1\u606F</h4><div class="report-summary">' +
                '<p><strong>\u6570\u636E\u6765\u6E90\uFF1A</strong>' + ds.source + '</p>' +
                '<p><strong>\u5BFC\u5165\u65F6\u95F4\uFF1A</strong>' + ds.createdAt + '</p>' +
                '<p><strong>\u7ED1\u5B9A\u7535\u963B R\uFF1A</strong>' + ds.boundR + ' \u03A9</p>' +
                '<p><strong>\u7ED1\u5B9A\u7535\u5BB9 C\uFF1A</strong>' + (ds.boundC !== null && ds.boundC !== undefined ? ds.boundC + ' F' : '\u672A\u586B') + '</p>' +
                '<p><strong>\u7ED1\u5B9A\u91C7\u6837\u95F4\u9694\uFF1A</strong>' + ds.boundSampleInterval + '</p>' +
                '<p><strong>\u58F0\u660E\u65F6\u95F4\u5355\u4F4D\uFF1A</strong>' + ds.declaredTimeUnit + '</p>' +
                '<p><strong>\u7535\u538B\u5E8F\u5217\u70B9\u6570\uFF1A</strong>' + ds.voltageSequence.length + '</p>' +
                '</div></div>';
        }

        var tauDevPct = theoreticalTau > 0 ? (Math.abs(measuredTau - theoreticalTau) / theoreticalTau * 100).toFixed(1) + '%' : '-';
        var tauDevColor = theoreticalTau > 0 && Math.abs(measuredTau - theoreticalTau) / theoreticalTau > 0.2 ? '#ef4444' : '#10b981';

        return '<div class="report-section"><h4>\uD83D\uDCCB \u5B9E\u9A8C\u5206\u6790\u6458\u8981</h4><div class="report-summary">' +
            '<p><strong>\u62A5\u544A\u7F16\u53F7\uFF1A</strong>' + this.reportId + '</p>' +
            '<p><strong>\u5206\u6790\u65F6\u95F4\uFF1A</strong>' + new Date().toLocaleString() + '</p>' +
            '<p><strong>\u6570\u636E\u70B9\u6570\uFF1A</strong>' + this.dataPoints.length + ' \u4E2A</p>' +
            '<p><strong>\u62DF\u5408\u4F18\u5EA6 R\u00B2\uFF1A</strong>' + (rSquared * 100).toFixed(2) + '%</p>' +
            '<p><strong>\u7ED3\u8BBA\uFF1A</strong>' + (rSquared > 0.95 ? '\u2705 \u62DF\u5408\u6548\u679C\u826F\u597D' : '\u26A0\uFE0F \u62DF\u5408\u5B58\u5728\u504F\u5DEE\uFF0C\u5EFA\u8BAE\u68C0\u67E5') + '</p></div></div>' +
            dsInfo + humanReadableIssues +
            '<div class="report-section"><h4>\uD83D\uDCCA \u5173\u952E\u53C2\u6570\u5BF9\u6BD4</h4><div class="table-wrapper"><table class="data-table">' +
            '<thead><tr><th>\u53C2\u6570</th><th>\u7406\u8BBA\u503C (R\u00D7C)</th><th>\u5B9E\u6D4B\u503C (\u7535\u538B\u62DF\u5408)</th><th>\u504F\u5DEE</th></tr></thead><tbody>' +
            '<tr><td>\u65F6\u95F4\u5E38\u6570 \u03C4</td><td>' + (theoreticalTau > 0 ? this.formatTime(theoreticalTau) : '\u65E0\u6CD5\u8BA1\u7B97') + '</td><td>' + this.formatTime(measuredTau) + '</td><td style="color:' + tauDevColor + '">' + tauDevPct + '</td></tr>' +
            '<tr><td>\u7535\u963B R</td><td>' + this.parameters.R + ' \u03A9</td><td>-</td><td>-</td></tr>' +
            '<tr><td>\u7535\u5BB9 C</td><td>' + (this.parameters.C || '\u672A\u586B') + '</td><td>-</td><td>-</td></tr>' +
            '</tbody></table></div></div>' +
            '<div class="report-section"><h4>\uD83D\uDEA8 \u5F02\u5E38\u68C0\u6D4B\u7ED3\u679C\uFF08\u6309\u68C0\u6D4B\u5E8F\u53F7\u6392\u5217\uFF09</h4><div class="table-wrapper"><table class="data-table">' +
            '<thead><tr><th>\u5E8F\u53F7</th><th>\u7EA7\u522B</th><th>\u5F02\u5E38\u7C7B\u578B</th><th>\u8BE6\u7EC6\u8BF4\u660E</th></tr></thead><tbody>' + anomalyRows + '</tbody></table></div></div>' +
            '<div class="report-section"><h4>\uD83D\uDCDD \u51B2\u7A81\u7559\u75D5\u8BB0\u5F55</h4><div class="table-wrapper"><table class="data-table">' +
            '<thead><tr><th>\u5E8F\u53F7</th><th>\u65F6\u95F4</th><th>\u7C7B\u578B</th><th>\u5904\u7406\u8BF4\u660E</th></tr></thead><tbody>' + conflictRows + '</tbody></table></div></div>' +
            '<div class="report-section"><h4>\uD83D\uDD17 \u6570\u636E\u6EAF\u6E90\u8BF4\u660E</h4><div class="report-summary">' +
            '<p><strong>\u7535\u538B\u5E8F\u5217 \u2192 \u65F6\u95F4\u5E38\u6570\uFF1A</strong>\u901A\u8FC7\u6307\u6570\u62DF\u5408\u76F4\u63A5\u4ECE\u7535\u538B\u6570\u636E\u63A8\u5BFC</p>' +
            '<p><strong>R/C\u53C2\u6570 \u2192 \u65F6\u95F4\u5E38\u6570\uFF1A</strong>\u901A\u8FC7 \u03C4 = R \u00D7 C \u516C\u5F0F\u8BA1\u7B97</p>' +
            '<p><strong>\u51B2\u7A81\u5904\u7406\u539F\u5219\uFF1A</strong>\u4E09\u8005\u4E0D\u4E00\u81F4\u65F6\uFF0C\u4F18\u5148\u4FDD\u7559\u7535\u538B\u5E8F\u5217\u6570\u636E\uFF0C\u540C\u65F6\u8BB0\u5F55R/C\u53C2\u6570\u4F5C\u4E3A\u8865\u5145\u8BC1\u636E</p>' +
            '<p><strong>\u590D\u6838\u65B9\u5F0F\uFF1A</strong>\u70B9\u51FB\u4EFB\u610F3D\u6570\u636E\u70B9\uFF0C\u53EF\u67E5\u770B\u8BE5\u70B9\u5BF9\u5E94\u7684\u7535\u538B\u5E8F\u5217\u7D22\u5F15\u3001\u5173\u8054\u62A5\u544A\u7F16\u53F7\u3001\u4EE5\u53CA\u6570\u636E\u96C6\u7ED1\u5B9A\u7684RC\u53C2\u6570\u5FEB\u7167</p></div></div>';
    }

    downloadReport() {
        var text = this.generatePlainTextReport();
        var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.download = 'RC\u5206\u6790\u62A5\u544A-' + this.reportId + '.txt';
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    }

    copyReportText() {
        var text = this.generatePlainTextReport();
        navigator.clipboard.writeText(text).then(function() { alert('\u62A5\u544A\u6587\u672C\u5DF2\u590D\u5236\u5230\u526A\u8D34\u677F\uFF01'); });
    }

    generatePlainTextReport() {
        var theoreticalTau = this.parameters.R * (this.parameters.C || 0);
        var measuredTau = this.fitParams ? this.fitParams.tau : theoreticalTau;
        var rSquared = this.fitParams ? this.fitParams.rSquared : 0;
        var ds = this.dataSet;
        var lines = [];

        lines.push('\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');
        lines.push('         \u7535\u8DEFRC\u5145\u653E\u7535\u62DF\u5408\u5206\u6790\u62A5\u544A');
        lines.push('\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');
        lines.push('');
        lines.push('\uD83D\uDCCB \u57FA\u672C\u4FE1\u606F');
        lines.push('\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500');
        lines.push('\u62A5\u544A\u7F16\u53F7: ' + this.reportId);
        lines.push('\u5206\u6790\u65F6\u95F4: ' + new Date().toLocaleString());
        lines.push('\u6570\u636E\u70B9\u6570: ' + this.dataPoints.length + ' \u4E2A');
        lines.push('\u62DF\u5408\u4F18\u5EA6 R\u00B2: ' + (rSquared * 100).toFixed(2) + '%');
        lines.push('');

        if (ds) {
            lines.push('\uD83D\uDCE6 \u6570\u636E\u96C6\u7ED1\u5B9A\u4FE1\u606F');
            lines.push('\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500');
            lines.push('\u6570\u636E\u6765\u6E90: ' + ds.source);
            lines.push('\u5BFC\u5165\u65F6\u95F4: ' + ds.createdAt);
            lines.push('\u7ED1\u5B9A R: ' + ds.boundR + ' \u03A9');
            lines.push('\u7ED1\u5B9A C: ' + (ds.boundC !== null && ds.boundC !== undefined ? ds.boundC + ' F' : '\u672A\u586B'));
            lines.push('\u7ED1\u5B9A\u91C7\u6837\u95F4\u9694: ' + ds.boundSampleInterval);
            lines.push('\u58F0\u660E\u65F6\u95F4\u5355\u4F4D: ' + ds.declaredTimeUnit);
            lines.push('');
        }

        lines.push('\uD83D\uDCCA \u53C2\u6570\u5BF9\u6BD4');
        lines.push('\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500');
        lines.push('\u7406\u8BBA \u03C4 (R\u00D7C): ' + (theoreticalTau > 0 ? this.formatTime(theoreticalTau) : '\u65E0\u6CD5\u8BA1\u7B97'));
        lines.push('\u5B9E\u6D4B \u03C4 (\u62DF\u5408): ' + this.formatTime(measuredTau));
        lines.push('\u504F\u5DEE: ' + (theoreticalTau > 0 ? (Math.abs(measuredTau - theoreticalTau) / theoreticalTau * 100).toFixed(1) + '%' : '-'));
        lines.push('\u7535\u963B R: ' + this.parameters.R + ' \u03A9');
        lines.push('\u7535\u5BB9 C: ' + (this.parameters.C || '\u672A\u586B'));
        lines.push('');

        lines.push('\uD83D\uDEA8 \u5F02\u5E38\u68C0\u6D4B\uFF08\u6309\u68C0\u6D4B\u5E8F\u53F7\uFF09');
        lines.push('\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500');
        if (this.anomalies.length === 0) {
            lines.push('\u2713 \u65E0\u5F02\u5E38\u68C0\u6D4B\u5230');
        } else {
            this.anomalies.forEach(function(a) {
                lines.push('#' + a.seq + ' [' + a.level.toUpperCase() + '] ' + a.title + ': ' + a.description);
            });
        }
        lines.push('');

        var hasTimeUnitError = this.anomalies.some(function(a) {
            return a.title.indexOf('\u65F6\u95F4\u5355\u4F4D') !== -1 || a.title.indexOf('\u590D\u5408\u5F02\u5E38') !== -1;
        });
        if (hasTimeUnitError) {
            lines.push('\uD83D\uDCA1 \u7ED9\u975E\u6280\u672F\u540C\u4E8B\u7684\u89E3\u91CA');
            lines.push('\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500');
            lines.push('\u4E3A\u4EC0\u4E48\u8FD9\u4E2A\u6570\u636E\u201C\u6CA1\u901A\u8FC7\u201D\uFF1F');
            lines.push('');
            lines.push('\u60F3\u8C61\u4E00\u4E0B\uFF1A\u4F60\u539F\u672C\u4EE5\u4E3A\u6CE1\u4E00\u7897\u9762\u9700\u89815\u5206\u949F\uFF0C\u7ED3\u679C\u5B9E\u9645\u6CE1\u4E8650\u5206\u949F\u624D\u6CE1\u5F00...');
            lines.push('');
            lines.push('\u53EF\u80FD\u7684\u539F\u56E0\uFF1A');
            lines.push('1. \u65F6\u95F4\u5355\u4F4D\u586B\u9519\u4E86 - \u6BD4\u5982\u628A\u201C\u6BEB\u79D2\u201D\u5199\u6210\u201C\u79D2\u201D');
            lines.push('2. \u7535\u5BB9\u503C\u6CA1\u586B\u5BF9 - \u5C31\u50CF\u201C\u6C34\u6C60\u5927\u5C0F\u201D\u5199\u9519\u4E86');
            lines.push('3. \u66F2\u7EBF\u8FD8\u6CA1\u5230\u201C\u9971\u201D - \u6C34\u6CA1\u70E7\u5F00\u5C31\u5173\u706B\u4E86');
            lines.push('');
            lines.push('\u5EFA\u8BAE\uFF1A\u5148\u68C0\u67E5\u65F6\u95F4\u5355\u4F4D\uFF0C\u518D\u770B\u7535\u5BB9\u503C\u3002');
            lines.push('');
        }

        lines.push('\uD83D\uDCDD \u51B2\u7A81\u7559\u75D5');
        lines.push('\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500');
        if (this.conflictLogs.length === 0) {
            lines.push('\u6682\u65E0\u51B2\u7A81\u8BB0\u5F55');
        } else {
            this.conflictLogs.forEach(function(log) {
                lines.push('#' + log.seq + ' [' + log.timestamp + '] ' + log.type + ': ' + log.message);
            });
        }
        lines.push('');

        lines.push('\uD83D\uDD17 \u6570\u636E\u6EAF\u6E90\u8BF4\u660E');
        lines.push('\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500');
        lines.push('\u2022 \u7535\u538B\u5E8F\u5217 \u2192 \u65F6\u95F4\u5E38\u6570\uFF1A\u901A\u8FC7\u6307\u6570\u62DF\u5408\u63A8\u5BFC');
        lines.push('\u2022 R/C\u53C2\u6570 \u2192 \u65F6\u95F4\u5E38\u6570\uFF1A\u901A\u8FC7 \u03C4 = R \u00D7 C \u8BA1\u7B97');
        lines.push('\u2022 \u51B2\u7A81\u5904\u7406\uFF1A\u4F18\u5148\u4FDD\u7559\u7535\u538B\u5E8F\u5217\u6570\u636E\uFF0CR/C\u4F5C\u4E3A\u8865\u5145\u8BC1\u636E');
        lines.push('\u2022 \u590D\u6838\u65B9\u5F0F\uFF1A\u70B9\u51FB3D\u6570\u636E\u70B9\u67E5\u770B\u5B8C\u6574\u6EAF\u6E90\u4FE1\u606F');
        lines.push('');
        lines.push('\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');

        return lines.join('\n');
    }

    animate() {
        var self = this;
        requestAnimationFrame(function() { self.animate(); });
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    new RCFittingSystem();
});
