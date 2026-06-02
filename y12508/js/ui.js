import { ReportGenerator } from './report.js';

const _UIManager = (() => {
    const { formatters } = ReportGenerator;

    class UI {
        constructor(solver, scene, dataStore, exporter) {
            this.solver = solver;
            this.scene = scene;
            this.dataStore = dataStore;
            this.exporter = exporter;
            
            this.selectedBody = null;
            this.speedMultiplier = 1;
            this.isInitialized = false;
            
            this.elements = {};
            this.cacheElements();
            this.bindEvents();
        }

        cacheElements() {
            this.elements = {
                btnPlay: document.getElementById('btn-play'),
                btnPause: document.getElementById('btn-pause'),
                btnReset: document.getElementById('btn-reset'),
                timestepSlider: document.getElementById('timestep-slider'),
                timestepValue: document.getElementById('timestep-value'),
                speedSlider: document.getElementById('speed-slider'),
                speedValue: document.getElementById('speed-value'),
                simulationTime: document.getElementById('simulation-time'),
                filterTypes: document.querySelectorAll('.filter-type'),
                showOrbits: document.getElementById('show-orbits'),
                showTrail: document.getElementById('show-trail'),
                trailLength: document.getElementById('trail-length'),
                trailLengthValue: document.getElementById('trail-length-value'),
                btnLoadData: document.getElementById('btn-load-data'),
                btnMergeData: document.getElementById('btn-merge-data'),
                fileInput: document.getElementById('file-input'),
                conflictPanel: document.getElementById('conflict-panel'),
                conflictList: document.getElementById('conflict-list'),
                parameterControls: document.getElementById('parameter-controls'),
                bodyList: document.getElementById('body-list'),
                bodyDetails: document.getElementById('body-details'),
                systemWarnings: document.getElementById('system-warnings'),
                collisionInfo: document.getElementById('collision-info'),
                evidencePanel: document.getElementById('evidence-panel'),
                evidenceMissing: document.getElementById('evidence-missing'),
                warningBanner: document.getElementById('warning-banner'),
                infoTooltip: document.getElementById('info-tooltip'),
                btnScreenshot: document.getElementById('btn-screenshot'),
                btnExportReport: document.getElementById('btn-export-report'),
                reportModal: document.getElementById('report-modal'),
                reportContent: document.getElementById('report-content'),
                btnCloseModal: document.getElementById('btn-close-modal'),
                btnCopyReport: document.getElementById('btn-copy-report'),
                btnDownloadReport: document.getElementById('btn-download-report')
            };
        }

        bindEvents() {
            this.elements.btnPlay.addEventListener('click', () => this.play());
            this.elements.btnPause.addEventListener('click', () => this.pause());
            this.elements.btnReset.addEventListener('click', () => this.reset());
            
            this.elements.timestepSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.solver.timeStep = value;
                this.elements.timestepValue.textContent = value.toFixed(1);
            });
            
            this.elements.speedSlider.addEventListener('input', (e) => {
                this.speedMultiplier = parseFloat(e.target.value);
                this.elements.speedValue.textContent = this.speedMultiplier.toFixed(1);
            });
            
            this.elements.filterTypes.forEach(checkbox => {
                checkbox.addEventListener('change', () => this.updateFilters());
            });
            
            this.elements.showOrbits.addEventListener('change', (e) => {
                this.scene.setShowOrbits(e.target.checked);
            });
            
            this.elements.showTrail.addEventListener('change', (e) => {
                this.scene.setShowTrails(e.target.checked);
            });
            
            this.elements.trailLength.addEventListener('input', (e) => {
                const length = parseInt(e.target.value);
                this.elements.trailLengthValue.textContent = length;
                for (const body of this.solver.bodies) {
                    body.maxTrailLength = length;
                }
            });
            
            this.elements.btnLoadData.addEventListener('click', () => {
                this.elements.fileInput.click();
            });
            
            this.elements.fileInput.addEventListener('change', (e) => {
                this.loadDataFile(e.target.files[0]);
            });
            
            this.elements.btnMergeData.addEventListener('click', () => {
                this.showMergeDialog();
            });
            
            this.elements.btnScreenshot.addEventListener('click', () => {
                this.takeScreenshot();
            });
            
            this.elements.btnExportReport.addEventListener('click', () => {
                this.showReport();
            });
            
            this.elements.btnCloseModal.addEventListener('click', () => {
                this.closeReport();
            });
            
            this.elements.btnCopyReport.addEventListener('click', () => {
                this.copyReport();
            });
            
            this.elements.btnDownloadReport.addEventListener('click', () => {
                this.downloadReport();
            });
            
            this.scene.onBodyClick = (body) => {
                this.selectBody(body);
            };
            
            this.scene.onBodyHover = (body, x, y) => {
                this.showTooltip(body, x, y);
            };
            
            this.dataStore.onConflict((conflicts) => {
                this.showConflicts(conflicts);
            });
            
            this.elements.reportModal.addEventListener('click', (e) => {
                if (e.target === this.elements.reportModal) {
                    this.closeReport();
                }
            });
        }

        init() {
            this.updateBodyList();
            this.updateFilters();
            this.isInitialized = true;
        }

        play() {
            this.solver.isRunning = true;
            this.elements.btnPlay.disabled = true;
            this.elements.btnPause.disabled = false;
        }

        pause() {
            this.solver.isRunning = false;
            this.elements.btnPlay.disabled = false;
            this.elements.btnPause.disabled = true;
        }

        reset() {
            this.solver.reset();
            this.solver.isRunning = false;
            this.elements.btnPlay.disabled = false;
            this.elements.btnPause.disabled = true;
            this.elements.simulationTime.textContent = '0';
            this.clearWarnings();
            this.clearCollisions();
            this.updateBodyList();
            if (this.selectedBody) {
                this.selectBody(this.selectedBody);
            }
        }

        updateFilters() {
            const visibleTypes = [];
            this.elements.filterTypes.forEach(checkbox => {
                if (checkbox.checked) {
                    visibleTypes.push(checkbox.value);
                }
            });
            this.scene.setVisibleTypes(visibleTypes);
        }

        updateBodyList() {
            const typeLabels = {
                star: '恒星', planet: '行星', moon: '卫星',
                asteroid: '小行星', comet: '彗星', blackhole: '黑洞'
            };

            this.elements.bodyList.innerHTML = '';
            
            for (const body of this.solver.bodies) {
                const item = document.createElement('div');
                item.className = 'body-item';
                if (this.selectedBody && this.selectedBody.id === body.id) {
                    item.classList.add('selected');
                }
                
                item.innerHTML = `
                    <span class="body-color" style="background: ${body.color};"></span>
                    <span class="body-name">${body.name}</span>
                    <span class="body-type">${typeLabels[body.type] || body.type}</span>
                `;
                
                item.addEventListener('click', () => {
                    this.selectBody(body);
                    this.scene.focusOnBody(body.id);
                });
                
                this.elements.bodyList.appendChild(item);
            }
        }

        selectBody(body) {
            this.selectedBody = body;
            this.scene.selectBody(body.id);
            this.updateBodyList();
            this.updateBodyDetails(body);
            this.updateParameterControls(body);
        }

        updateBodyDetails(body) {
            const { AU, M_SUN } = PhysicsEngine.Constants;
            const centralBody = this.findCentralBody();
            const elements = body.getOrbitalElements(centralBody);
            const stability = this.solver.analyzeOrbitStability(body, centralBody);
            const dominantPerturbation = this.solver.getDominantPerturbation(body);

            const typeLabels = {
                star: '恒星', planet: '行星', moon: '卫星',
                asteroid: '小行星', comet: '彗星', blackhole: '黑洞'
            };

            let html = `<h3>${body.name}</h3>`;
            
            html += `<div class="detail-row">
                <span class="detail-label">类型</span>
                <span class="detail-value">${typeLabels[body.type] || body.type}</span>
            </div>`;
            
            html += `<div class="detail-row">
                <span class="detail-label">质量</span>
                <span class="detail-value">${formatters.formatMass(body.mass)}</span>
            </div>`;
            
            html += `<div class="detail-row">
                <span class="detail-label">半径</span>
                <span class="detail-value">${formatters.formatDistance(body.radius)}</span>
            </div>`;
            
            html += `<div class="detail-row">
                <span class="detail-label">当前速度</span>
                <span class="detail-value">${formatters.formatVelocity(body.getSpeed())}</span>
            </div>`;
            
            html += `<div class="detail-row">
                <span class="detail-label">距中心</span>
                <span class="detail-value">${centralBody ? formatters.formatDistance(body.getDistance(centralBody)) : '—'}</span>
            </div>`;

            if (elements) {
                html += `<div class="detail-row">
                    <span class="detail-label">轨道偏心率</span>
                    <span class="detail-value">${elements.eccentricity.toFixed(4)}</span>
                </div>`;
                
                html += `<div class="detail-row">
                    <span class="detail-label">半长轴</span>
                    <span class="detail-value">${formatters.formatDistance(elements.semiMajorAxis)}</span>
                </div>`;
                
                html += `<div class="detail-row">
                    <span class="detail-label">公转周期</span>
                    <span class="detail-value">${formatters.formatTime(elements.period)}</span>
                </div>`;
                
                html += `<div class="detail-row">
                    <span class="detail-label">轨道倾角</span>
                    <span class="detail-value">${(elements.inclination * 180 / Math.PI).toFixed(1)}°</span>
                </div>`;
                
                html += `<div class="detail-row">
                    <span class="detail-label">束缚状态</span>
                    <span class="detail-value ${elements.isBound ? 'success-text' : 'error-text'}" style="color: ${elements.isBound ? '#10b981' : '#ef4444'}">${elements.isBound ? '束缚轨道' : '逃逸轨道'}</span>
                </div>`;
            }

            if (stability) {
                const stabInfo = formatters.explainStability(stability.stabilityIndex);
                html += `<div class="detail-row">
                    <span class="detail-label">稳定性</span>
                    <span class="detail-value" style="color: ${stabInfo.class === 'success-text' ? '#10b981' : stabInfo.class === 'warning-text' ? '#f59e0b' : '#ef4444'}">${stabInfo.text} (${stability.stabilityIndex.toFixed(0)})</span>
                </div>`;
            }

            if (dominantPerturbation) {
                html += `<div class="detail-row">
                    <span class="detail-label">主要摄动源</span>
                    <span class="detail-value">${dominantPerturbation.source}</span>
                </div>`;
            }

            if (body.collided) {
                html += `<div class="detail-row">
                    <span class="detail-label">状态</span>
                    <span class="detail-value" style="color: #ef4444;">⚠️ 已碰撞</span>
                </div>`;
            }

            if (body.escapeDetected) {
                html += `<div class="detail-row">
                    <span class="detail-label">状态</span>
                    <span class="detail-value" style="color: #f59e0b;">⚠️ 已逃逸</span>
                </div>`;
            }

            if (body.divergenceDetected) {
                html += `<div class="detail-row">
                    <span class="detail-label">状态</span>
                    <span class="detail-value" style="color: #ef4444;">⚠️ 数值发散</span>
                </div>`;
            }

            if (body.description) {
                html += `<p style="margin-top: 12px; color: #888; font-style: italic; font-size: 11px;">${body.description}</p>`;
            }

            this.elements.bodyDetails.innerHTML = html;
        }

        updateParameterControls(body) {
            const { PARAMETER_BOUNDS } = DataManager;
            
            let html = `<h3 style="margin-bottom: 12px; color: #6bb3ff; font-size: 14px;">${body.name} 参数</h3>`;
            
            const massBounds = PARAMETER_BOUNDS.mass;
            const massLogMin = Math.log10(massBounds.min);
            const massLogMax = Math.log10(massBounds.max);
            const massLogValue = Math.log10(Math.max(massBounds.min, Math.min(massBounds.max, body.mass)));
            const massPercent = ((massLogValue - massLogMin) / (massLogMax - massLogMin)) * 100;
            
            const massCheck = this.dataStore.checkParameterBounds('mass', body.mass);
            const massWarning = massCheck.warning;
            
            html += `<div class="parameter-control ${massWarning ? 'warning' : ''}">
                <label>
                    <span>质量</span>
                    <span class="param-value">${formatters.formatMass(body.mass)}</span>
                </label>
                <input type="range" id="param-mass" min="0" max="100" step="0.1" value="${massPercent}">
                <div class="param-bounds">
                    <span>${formatters.formatMass(massBounds.min)}</span>
                    <span>${formatters.formatMass(massBounds.max)}</span>
                </div>
                ${massWarning ? `<p style="color: #f59e0b; font-size: 10px; margin-top: 4px;">${massWarning.message}</p>` : ''}
            </div>`;
            
            const velBounds = PARAMETER_BOUNDS.velocity;
            const speed = body.velocity.length();
            const velPercent = ((speed - velBounds.min) / (velBounds.max - velBounds.min)) * 100;
            
            const velCheck = this.dataStore.checkParameterBounds('velocity', speed);
            const velWarning = velCheck.warning;
            
            html += `<div class="parameter-control ${velWarning ? 'warning' : ''}">
                <label>
                    <span>初速度</span>
                    <span class="param-value">${formatters.formatVelocity(speed)}</span>
                </label>
                <input type="range" id="param-velocity" min="0" max="100" step="0.1" value="${Math.max(0, Math.min(100, velPercent))}">
                <div class="param-bounds">
                    <span>${formatters.formatVelocity(velBounds.min)}</span>
                    <span>${formatters.formatVelocity(velBounds.max)}</span>
                </div>
                ${velWarning ? `<p style="color: #f59e0b; font-size: 10px; margin-top: 4px;">${velWarning.message}</p>` : ''}
            </div>`;

            this.elements.parameterControls.innerHTML = html;
            
            const massSlider = document.getElementById('param-mass');
            if (massSlider) {
                massSlider.addEventListener('input', (e) => {
                    const percent = parseFloat(e.target.value);
                    const logMass = massLogMin + (massLogMax - massLogMin) * percent / 100;
                    const newMass = Math.pow(10, logMass);
                    this.updateBodyMass(body, newMass);
                });
            }
            
            const velSlider = document.getElementById('param-velocity');
            if (velSlider) {
                velSlider.addEventListener('input', (e) => {
                    const percent = parseFloat(e.target.value);
                    const newSpeed = velBounds.min + (velBounds.max - velBounds.min) * percent / 100;
                    this.updateBodyVelocity(body, newSpeed);
                });
            }
        }

        updateBodyMass(body, newMass) {
            body.mass = newMass;
            body.initialMass = newMass;
            
            const massCheck = this.dataStore.checkParameterBounds('mass', newMass);
            this.showWarningBanner(massCheck.warning);
            
            this.updateParameterControls(body);
            this.updateBodyDetails(body);
        }

        updateBodyVelocity(body, newSpeed) {
            const currentSpeed = body.velocity.length();
            if (currentSpeed > 0) {
                const scale = newSpeed / currentSpeed;
                body.velocity.multiplyScalar(scale);
                body.initialVelocity.copy(body.velocity);
            }
            
            const velCheck = this.dataStore.checkParameterBounds('velocity', newSpeed);
            this.showWarningBanner(velCheck.warning);
            
            this.updateParameterControls(body);
            this.updateBodyDetails(body);
        }

        showWarningBanner(warning) {
            if (!warning) {
                this.elements.warningBanner.classList.add('hidden');
                return;
            }
            
            this.elements.warningBanner.textContent = warning.message;
            this.elements.warningBanner.classList.remove('hidden');
            
            clearTimeout(this._warningTimeout);
            this._warningTimeout = setTimeout(() => {
                this.elements.warningBanner.classList.add('hidden');
            }, 5000);
        }

        showTooltip(body, x, y) {
            if (!body) {
                this.elements.infoTooltip.classList.add('hidden');
                return;
            }

            const centralBody = this.findCentralBody();
            const elements = body.getOrbitalElements(centralBody);

            let html = `<h4>${body.name}</h4>`;
            html += `<div class="info-row"><span class="label">类型</span><span class="value">${DataManager.BODY_TYPES[body.type]?.label || body.type}</span></div>`;
            html += `<div class="info-row"><span class="label">质量</span><span class="value">${formatters.formatMass(body.mass)}</span></div>`;
            html += `<div class="info-row"><span class="label">速度</span><span class="value">${formatters.formatVelocity(body.getSpeed())}</span></div>`;
            
            if (elements) {
                html += `<div class="info-row"><span class="label">偏心率</span><span class="value">${elements.eccentricity.toFixed(3)}</span></div>`;
                html += `<div class="info-row"><span class="label">周期</span><span class="value">${formatters.formatTime(elements.period)}</span></div>`;
            }

            this.elements.infoTooltip.innerHTML = html;
            this.elements.infoTooltip.classList.remove('hidden');
            
            const canvasRect = document.getElementById('canvas-wrapper').getBoundingClientRect();
            let left = x - canvasRect.left + 15;
            let top = y - canvasRect.top + 15;
            
            const tooltipRect = this.elements.infoTooltip.getBoundingClientRect();
            if (left + tooltipRect.width > canvasRect.width) {
                left = x - canvasRect.left - tooltipRect.width - 15;
            }
            if (top + tooltipRect.height > canvasRect.height) {
                top = y - canvasRect.top - tooltipRect.height - 15;
            }
            
            this.elements.infoTooltip.style.left = left + 'px';
            this.elements.infoTooltip.style.top = top + 'px';
        }

        updateWarnings(warnings) {
            if (warnings.length === 0) {
                this.elements.systemWarnings.innerHTML = '<p class="hint">暂无警告</p>';
                return;
            }

            let html = '';
            for (const w of warnings) {
                const className = w.level === 'error' ? 'error' : w.level === 'info' ? 'info' : '';
                html += `<div class="warning-item ${className}">${w.message}</div>`;
            }
            this.elements.systemWarnings.innerHTML = html;
        }

        clearWarnings() {
            this.elements.systemWarnings.innerHTML = '<p class="hint">暂无警告</p>';
        }

        updateCollisions(collisions) {
            if (collisions.length === 0) {
                this.elements.collisionInfo.innerHTML = '<p class="hint">暂无碰撞事件</p>';
                this.elements.evidencePanel.classList.add('hidden');
                return;
            }

            let html = '';
            for (let i = 0; i < collisions.length; i++) {
                const c = collisions[i];
                html += `<div class="collision-event">
                    <h4>💥 ${c.bodyA.name} ↔ ${c.bodyB.name}</h4>
                    <p>时间: 第 ${formatters.formatTime(c.time)}</p>
                    <p>相对速度: ${formatters.formatVelocity(c.relativeVelocity)}</p>
                </div>`;
            }
            this.elements.collisionInfo.innerHTML = html;

            if (collisions.length > 0) {
                const analysis = this.dataStore.evidenceAnalyzer.analyzeCollisionEvidence(collisions[collisions.length - 1]);
                if (!analysis.isSufficient) {
                    this.elements.evidencePanel.classList.remove('hidden');
                    let evidenceHtml = '';
                    for (const item of analysis.missing) {
                        const priority = item.required ? '必需' : '补充';
                        evidenceHtml += `<div class="evidence-item">[${priority}] ${item.label}</div>`;
                    }
                    this.elements.evidenceMissing.innerHTML = evidenceHtml;
                } else {
                    this.elements.evidencePanel.classList.add('hidden');
                }
            }
        }

        clearCollisions() {
            this.elements.collisionInfo.innerHTML = '<p class="hint">暂无碰撞事件</p>';
            this.elements.evidencePanel.classList.add('hidden');
        }

        showConflicts(conflicts) {
            if (conflicts.length === 0) {
                this.elements.conflictPanel.classList.add('hidden');
                return;
            }

            this.elements.conflictPanel.classList.remove('hidden');
            
            let html = '';
            for (const conflict of conflicts) {
                const diffPercent = conflict.getDifferencePercent();
                html += `<div class="conflict-item">
                    <h4>${conflict.getDescription()}</h4>
                    <p style="font-size: 11px; color: #aaa; margin-bottom: 8px;">天体: ${conflict.bodyId}</p>
                    <div class="conflict-values">
                        <div class="conflict-value">
                            <span class="source">${conflict.sourceA}</span>
                            <span class="val">${this.formatConflictValue(conflict.field, conflict.valueA)}</span>
                        </div>
                        <div class="conflict-value">
                            <span class="source">${conflict.sourceB}</span>
                            <span class="val">${this.formatConflictValue(conflict.field, conflict.valueB)}</span>
                        </div>
                    </div>
                    ${diffPercent !== null ? `<p style="font-size: 10px; color: #ef4444; margin-bottom: 8px;">差异: ${diffPercent.toFixed(1)}%</p>` : ''}
                    <div class="conflict-actions">
                        <button class="btn btn-secondary" onclick="app.resolveConflict('${conflict.id}', 'A')">采用A</button>
                        <button class="btn btn-secondary" onclick="app.resolveConflict('${conflict.id}', 'B')">采用B</button>
                        <button class="btn btn-primary" onclick="app.resolveConflict('${conflict.id}', 'average')">取平均</button>
                    </div>
                </div>`;
            }
            
            if (conflicts.length > 1) {
                html += `<div style="margin-top: 12px; display: flex; gap: 8px;">
                    <button class="btn btn-secondary" style="flex: 1;" onclick="app.resolveAllConflicts('original')">全部采用A</button>
                    <button class="btn btn-secondary" style="flex: 1;" onclick="app.resolveAllConflicts('latest')">全部采用B</button>
                </div>`;
            }
            
            this.elements.conflictList.innerHTML = html;
        }

        formatConflictValue(field, value) {
            if (typeof value === 'number') {
                if (field === 'mass') return formatters.formatMass(value);
                if (field === 'radius') return formatters.formatDistance(value);
                if (field === 'velocity') return formatters.formatVelocity(value);
                return value.toExponential(2);
            }
            if (typeof value === 'object' && value !== null) {
                return `(${value.x?.toFixed(1) || 0}, ${value.y?.toFixed(1) || 0}, ${value.z?.toFixed(1) || 0})`;
            }
            return String(value);
        }

        async loadDataFile(file) {
            if (!file) return;
            
            try {
                const text = await file.text();
                const result = this.dataStore.importData(text, file.name);
                
                if (result.success) {
                    this.loadDatasetToSolver(result.data);
                    if (result.warnings && result.warnings.length > 0) {
                        alert(`数据加载成功，但有以下警告:\n\n${result.warnings.join('\n')}`);
                    } else {
                        alert('数据加载成功！');
                    }
                } else {
                    alert(`数据加载失败:\n\n${result.error}`);
                }
            } catch (e) {
                alert(`读取文件失败: ${e.message}`);
            }
            
            this.elements.fileInput.value = '';
        }

        loadDatasetToSolver(data) {
            this.pause();
            this.solver.loadJSON(data);
            this.scene.clearAll();
            
            for (const body of this.solver.bodies) {
                this.scene.addBody(body);
            }
            
            this.solver.reset();
            this.updateBodyList();
            this.clearWarnings();
            this.clearCollisions();
        }

        showMergeDialog() {
            const datasets = Object.keys(this.dataStore.datasets);
            if (datasets.length < 2) {
                alert('请先加载至少两个数据集才能进行合并。');
                return;
            }

            const result = this.dataStore.mergeDatasets('merged', datasets, {
                resolveConflicts: 'manual'
            });

            if (result.conflicts.length > 0) {
                this.showConflicts(result.conflicts);
                alert(`发现 ${result.conflicts.length} 个数据冲突，请在左侧面板中手动解决。`);
            } else {
                this.loadDatasetToSolver(result.data);
                alert('数据合并成功，无冲突！');
            }
        }

        async takeScreenshot() {
            const wasRunning = this.solver.isRunning;
            if (wasRunning) this.pause();
            
            try {
                await this.exporter.takeScreenshot({
                    filename: `轨道截图_${this.getTimestamp()}`,
                    watermark: true
                });
            } catch (e) {
                alert('截图失败: ' + e.message);
            }
            
            if (wasRunning) this.play();
        }

        showReport() {
            const report = new ReportGenerator.Report(this.solver, this.dataStore);
            this.elements.reportContent.innerHTML = report.generateHTML();
            this.elements.reportModal.classList.remove('hidden');
        }

        closeReport() {
            this.elements.reportModal.classList.add('hidden');
        }

        async copyReport() {
            const report = new ReportGenerator.Report(this.solver, this.dataStore);
            const text = report.generatePlainText();
            const success = await this.exporter.copyToClipboard(text);
            
            if (success) {
                const originalText = this.elements.btnCopyReport.textContent;
                this.elements.btnCopyReport.textContent = '✓ 已复制';
                setTimeout(() => {
                    this.elements.btnCopyReport.textContent = originalText;
                }, 2000);
            } else {
                alert('复制失败，请手动复制');
            }
        }

        downloadReport() {
            this.exporter.exportReport('html');
            this.closeReport();
        }

        updateSimulationTime() {
            this.elements.simulationTime.textContent = this.solver.time.toFixed(1);
        }

        findCentralBody() {
            if (this.solver.bodies.length === 0) return null;
            
            let mostMassive = this.solver.bodies[0];
            for (const body of this.solver.bodies) {
                if (body.mass > mostMassive.mass) {
                    mostMassive = body;
                }
            }
            return mostMassive;
        }

        getTimestamp() {
            const now = new Date();
            const pad = (n) => n.toString().padStart(2, '0');
            return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
        }

        update() {
            if (!this.isInitialized) return;
            
            const result = this.solver.step(this.speedMultiplier);
            
            if (result) {
                const { collisions, warnings } = result;
                
                if (collisions && collisions.length > 0) {
                    this.updateCollisions(this.solver.collisions);
                }
                
                if (warnings && warnings.length > 0) {
                    this.updateWarnings(warnings);
                    
                    const critical = warnings.find(w => w.level === 'error');
                    if (critical) {
                        this.showWarningBanner(critical);
                    }
                }
            }
            
            this.scene.updateAllBodies(this.solver.bodies);
            this.updateSimulationTime();
            
            if (this.selectedBody) {
                this.updateBodyDetails(this.selectedBody);
            }
        }
    }

    return { UI };
})();

export const UIManager = window.UIManager || _UIManager;
window.UIManager = UIManager;
