const GameState = {
    isRunning: false,
    depth: 0,
    maxDepth: 0,
    oxygen: 100,
    score: 0,
    timeElapsed: 0,
    
    submarine: {
        volume: 2.5,
        baseMass: 2000,
        ballastWaterLeft: 0,
        ballastWaterRight: 0,
        ballastCapacity: 1500,
        cargo: [],
        cargoCapacity: 500,
        waterDensity: 1025,
        targetDepth: 0,
        holdPosition: false
    },
    
    pendingBallastLeft: 0,
    pendingBallastRight: 0,
    
    artifacts: [],
    currentArtifacts: [],
    
    anomalies: {
        densityAnomaly: null,
        tankNotes: { left: null, right: null },
        oxygenLabelRenamed: false,
        tankFillingErrors: { left: false, right: false }
    },
    
    events: [],
    operations: [],
    failureReason: null,
    missionEnded: false
};

const UI = {
    elements: {},
    
    init() {
        this.elements = {
            depthDisplay: document.getElementById('depth-display'),
            oxygenDisplay: document.getElementById('oxygen-display'),
            oxygenLabel: document.getElementById('oxygen-label'),
            scoreDisplay: document.getElementById('score-display'),
            artifactCount: document.getElementById('artifact-count'),
            densityValue: document.getElementById('density-value'),
            submarine: document.getElementById('submarine'),
            waterLayer: document.getElementById('water-layer'),
            tankLeftFill: document.getElementById('tank-left-fill'),
            tankRightFill: document.getElementById('tank-right-fill'),
            tankLeftWater: document.getElementById('tank-left-water'),
            tankRightWater: document.getElementById('tank-right-water'),
            tankLeftStatus: document.getElementById('tank-left-status'),
            tankRightStatus: document.getElementById('tank-right-status'),
            tankLeftInput: document.getElementById('tank-left-input'),
            tankRightInput: document.getElementById('tank-right-input'),
            tankLeftNote: document.getElementById('tank-left-note'),
            tankLeftNoteDisplay: document.getElementById('tank-left-note'),
            tankRightNote: document.getElementById('tank-right-note'),
            cargoFill: document.getElementById('cargo-fill'),
            cargoCurrent: document.getElementById('cargo-current'),
            cargoMax: document.getElementById('cargo-max'),
            buoyancyStatus: document.getElementById('buoyancy-status'),
            netBuoyancy: document.getElementById('net-buoyancy'),
            subWeight: document.getElementById('sub-weight'),
            displacement: document.getElementById('displacement'),
            leftWaterAmount: document.getElementById('left-water-amount'),
            rightWaterAmount: document.getElementById('right-water-amount'),
            totalBallast: document.getElementById('total-ballast'),
            btnSalvage: document.getElementById('btn-salvage'),
            btnStart: document.getElementById('btn-start'),
            btnEnd: document.getElementById('btn-end'),
            btnExport: document.getElementById('btn-export'),
            btnAscent: document.getElementById('btn-ascent'),
            btnDescent: document.getElementById('btn-descent'),
            btnHold: document.getElementById('btn-hold'),
            btnFillLeft: document.getElementById('btn-fill-left'),
            btnDrainLeft: document.getElementById('btn-drain-left'),
            btnFillRight: document.getElementById('btn-fill-right'),
            btnDrainRight: document.getElementById('btn-drain-right'),
            btnApplyBallast: document.getElementById('btn-apply-ballast'),
            btnRelease: document.getElementById('btn-release'),
            btnReleaseAll: document.getElementById('btn-release-all'),
            btnClearLog: document.getElementById('btn-clear-log'),
            btnModalClose: document.getElementById('modal-close'),
            artifactList: document.getElementById('artifact-list'),
            artifactsContainer: document.getElementById('artifacts'),
            systemAlerts: document.getElementById('system-alerts'),
            logContent: document.getElementById('log-content'),
            modalOverlay: document.getElementById('modal-overlay'),
            modalTitle: document.getElementById('modal-title'),
            modalBody: document.getElementById('modal-body'),
            modalHeader: document.getElementById('modal-header')
        };
        
        this.bindEvents();
    },
    
    bindEvents() {
        this.elements.btnStart.addEventListener('click', () => Game.startMission());
        this.elements.btnEnd.addEventListener('click', () => Game.endMission());
        this.elements.btnExport.addEventListener('click', () => Game.exportResults());
        this.elements.btnAscent.addEventListener('click', () => Game.setTargetDepth(GameState.depth - 20));
        this.elements.btnDescent.addEventListener('click', () => Game.setTargetDepth(GameState.depth + 20));
        this.elements.btnHold.addEventListener('click', () => Game.holdPosition());
        this.elements.btnFillLeft.addEventListener('click', () => Game.adjustBallast('left', 20));
        this.elements.btnDrainLeft.addEventListener('click', () => Game.adjustBallast('left', -20));
        this.elements.btnFillRight.addEventListener('click', () => Game.adjustBallast('right', 20));
        this.elements.btnDrainRight.addEventListener('click', () => Game.adjustBallast('right', -20));
        this.elements.btnApplyBallast.addEventListener('click', () => Game.applyBallast());
        this.elements.btnSalvage.addEventListener('click', () => Game.salvageArtifact());
        this.elements.btnRelease.addEventListener('click', () => Game.releaseArtifact());
        this.elements.btnReleaseAll.addEventListener('click', () => Game.releaseAllArtifacts());
        this.elements.btnClearLog.addEventListener('click', () => Game.clearLog());
        this.elements.btnModalClose.addEventListener('click', () => Game.closeModal());
        this.elements.tankLeftInput.addEventListener('input', (e) => Game.updatePendingBallast('left', e.target.value));
        this.elements.tankRightInput.addEventListener('input', (e) => Game.updatePendingBallast('right', e.target.value));
    },
    
    updateDisplay() {
        const state = Game.calculatePhysicsState();
        
        this.elements.depthDisplay.textContent = Math.round(GameState.depth);
        this.elements.oxygenDisplay.textContent = GameState.oxygen.toFixed(1);
        this.elements.scoreDisplay.textContent = GameState.score;
        this.elements.artifactCount.textContent = GameState.submarine.cargo.length;
        
        const displayDensity = GameState.anomalies.densityAnomaly 
            ? GameState.anomalies.densityAnomaly.displayValue 
            : (state.actualDensity / 1000).toFixed(3);
        this.elements.densityValue.textContent = displayDensity;
        
        const leftPercent = (GameState.submarine.ballastWaterLeft / (GameState.submarine.ballastCapacity / 2)) * 100;
        const rightPercent = (GameState.submarine.ballastWaterRight / (GameState.submarine.ballastCapacity / 2)) * 100;
        this.elements.tankLeftFill.style.width = leftPercent + '%';
        this.elements.tankRightFill.style.width = rightPercent + '%';
        this.elements.tankLeftWater.style.height = leftPercent + '%';
        this.elements.tankRightWater.style.height = rightPercent + '%';
        
        const cargoPercent = (Game.getCargoMass() / GameState.submarine.cargoCapacity) * 100;
        this.elements.cargoFill.style.width = Math.min(cargoPercent, 100) + '%';
        this.elements.cargoCurrent.textContent = Game.getCargoMass();
        this.elements.cargoMax.textContent = GameState.submarine.cargoCapacity;
        
        this.elements.buoyancyStatus.textContent = state.buoyancyState.label;
        this.elements.buoyancyStatus.className = state.buoyancyState.class;
        this.elements.netBuoyancy.textContent = state.netBuoyancy.toFixed(1);
        this.elements.subWeight.textContent = Math.round(state.totalMass);
        this.elements.displacement.textContent = Math.round(state.displacementMass);
        
        this.elements.leftWaterAmount.textContent = Math.round(GameState.submarine.ballastWaterLeft);
        this.elements.rightWaterAmount.textContent = Math.round(GameState.submarine.ballastWaterRight);
        this.elements.totalBallast.textContent = Math.round(GameState.submarine.ballastWaterLeft + GameState.submarine.ballastWaterRight);
        
        const subBottom = Math.min(GameState.depth * 2, 600);
        this.elements.submarine.style.bottom = (50 + subBottom) + 'px';
        
        const canSalvage = GameState.depth > 10 && GameState.currentArtifacts.length > 0 && GameState.isRunning;
        this.elements.btnSalvage.disabled = !canSalvage;
    },
    
    updateTankStatus(tank, status, note) {
        const statusEl = tank === 'left' ? this.elements.tankLeftStatus : this.elements.tankRightStatus;
        const noteEl = tank === 'left' ? this.elements.tankLeftNote : this.elements.tankRightNote;
        
        statusEl.textContent = status;
        statusEl.className = 'tank-status ' + (status !== '正常' ? 'status-warning' : '');
        
        if (note) {
            noteEl.textContent = note;
            noteEl.style.display = 'block';
        } else {
            noteEl.textContent = '';
            noteEl.style.display = 'none';
        }
    },
    
    updateOxygenLabel(label) {
        this.elements.oxygenLabel.textContent = label;
    },
    
    renderArtifacts() {
        this.elements.artifactsContainer.innerHTML = '';
        
        GameState.currentArtifacts.forEach(artifact => {
            const el = document.createElement('div');
            el.className = 'artifact';
            el.style.left = artifact.x + '%';
            el.style.bottom = '20px';
            
            const materialName = Physics.getMaterialName(artifact.material);
            const typeName = Physics.getArtifactTypeName(artifact.type);
            
            el.innerHTML = `
                <div class="artifact-icon">${this.getArtifactIcon(artifact.type)}</div>
                <div class="artifact-info">
                    <div class="artifact-name">${materialName}${typeName}</div>
                    <div class="artifact-weight">${artifact.weight}kg</div>
                </div>
            `;
            
            this.elements.artifactsContainer.appendChild(el);
        });
    },
    
    getArtifactIcon(type) {
        const icons = {
            'coin': '🪙',
            'vase': '🏺',
            'statue': '🗿',
            'weapon': '⚔️',
            'jewelry': '💍',
            'pottery': '🏺',
            'scroll': '📜',
            'instrument': '🎺',
            'furniture': '🪑',
            'cannon': '💣'
        };
        return icons[type] || '📦';
    },
    
    updateCargoList() {
        if (GameState.submarine.cargo.length === 0) {
            this.elements.artifactList.innerHTML = '<div class="empty-hint">货舱为空</div>';
            return;
        }
        
        let html = '';
        GameState.submarine.cargo.forEach((artifact, index) => {
            const materialName = Physics.getMaterialName(artifact.material);
            const typeName = Physics.getArtifactTypeName(artifact.type);
            const score = Physics.calculateSalvageScore(artifact, artifact.depth);
            
            html += `
                <div class="artifact-item">
                    <span class="artifact-icon-small">${this.getArtifactIcon(artifact.type)}</span>
                    <div class="artifact-details">
                        <div class="artifact-name">${materialName}${typeName}</div>
                        <div class="artifact-meta">${artifact.weight}kg · ${score}分</div>
                    </div>
                    <button class="artifact-release" data-index="${index}">丢弃</button>
                </div>
            `;
        });
        
        this.elements.artifactList.innerHTML = html;
        
        this.elements.artifactList.querySelectorAll('.artifact-release').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                Game.releaseSpecificArtifact(index);
            });
        });
    },
    
    addAlert(message, type = 'info') {
        const alert = document.createElement('div');
        alert.className = `alert-${type}`;
        alert.textContent = message;
        this.elements.systemAlerts.innerHTML = '';
        this.elements.systemAlerts.appendChild(alert);
        
        setTimeout(() => {
            if (this.elements.systemAlerts.contains(alert)) {
                alert.style.opacity = '0';
                setTimeout(() => alert.remove(), 300);
            }
        }, 5000);
    },
    
    addLog(message, type = 'info') {
        const time = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry log-${type}`;
        logEntry.innerHTML = `<span class="log-time">[${time}]</span> ${message}`;
        this.elements.logContent.appendChild(logEntry);
        this.elements.logContent.scrollTop = this.elements.logContent.scrollHeight;
    },
    
    clearLog() {
        this.elements.logContent.innerHTML = '';
    },
    
    showModal(title, body, type = 'info') {
        this.elements.modalTitle.textContent = title;
        this.elements.modalBody.innerHTML = body;
        this.elements.modalHeader.className = `modal-header modal-${type}`;
        this.elements.modalOverlay.style.display = 'flex';
    },
    
    closeModal() {
        this.elements.modalOverlay.style.display = 'none';
    },
    
    setButtonStates(running) {
        this.elements.btnStart.disabled = running;
        this.elements.btnEnd.disabled = !running;
        this.elements.btnExport.disabled = running;
    }
};

const AnomalySystem = {
    notes: [
        '注意：此舱压力表故障，实际注水量需减少20%',
        '备注：上次检修后此舱阀门有残留100kg水',
        '夹注：此舱密封垫老化，会漏水约50kg',
        '附记：此舱已改装，容量减少100kg',
        '备注：此舱排水系统故障，只能排一半'
    ],
    
    oxygenLabels: [
        '空气质量指数',
        '船舱气压表',
        'CO2浓度指示',
        '生命维持指数',
        '空气余量指示'
    ],
    
    densityAnomalies: [
        { displayValue: '1.025', actualMultiplier: 0.97, description: '仪器校准错误，实际密度比显示值低3%' },
        { displayValue: '1.025', actualMultiplier: 1.04, description: '密度计故障，实际密度比显示值高4%' },
        { displayValue: '1.030', actualMultiplier: 1.00, description: '显示密度1.030，但实际是1.000的淡水层' },
        { displayValue: '1.020', actualMultiplier: 1.05, description: '显示密度偏低，实际是高盐度水层' }
    ],
    
    triggerRandomAnomaly() {
        const roll = Math.random();
        
        if (roll < 0.15) {
            this.addTankNote('left');
        } else if (roll < 0.3) {
            this.addTankNote('right');
        } else if (roll < 0.45) {
            this.renameOxygenLabel();
        } else if (roll < 0.6) {
            this.triggerDensityAnomaly();
        } else if (roll < 0.7) {
            this.triggerFillingError('left');
        } else if (roll < 0.8) {
            this.triggerFillingError('right');
        }
    },
    
    addTankNote(tank) {
        const note = this.notes[Math.floor(Math.random() * this.notes.length)];
        GameState.anomalies.tankNotes[tank] = note;
        UI.updateTankStatus(tank, '有备注', note);
        UI.addLog(`⚠️ ${tank === 'left' ? '左' : '右'}压载舱出现异常备注：${note}`, 'warning');
        GameState.operations.push({
            time: GameState.timeElapsed,
            type: 'anomaly',
            detail: `${tank === 'left' ? '左' : '右'}压载舱备注: ${note}`
        });
    },
    
    renameOxygenLabel() {
        if (!GameState.anomalies.oxygenLabelRenamed) {
            const newLabel = this.oxygenLabels[Math.floor(Math.random() * this.oxygenLabels.length)];
            GameState.anomalies.oxygenLabelRenamed = true;
            UI.updateOxygenLabel(newLabel);
            UI.addLog(`⚠️ 氧气表标签被临时改名为"${newLabel}"，注意识别！`, 'warning');
            GameState.operations.push({
                time: GameState.timeElapsed,
                type: 'anomaly',
                detail: `氧气表改名: ${newLabel}`
            });
        }
    },
    
    triggerDensityAnomaly() {
        const anomaly = this.densityAnomalies[Math.floor(Math.random() * this.densityAnomalies.length)];
        GameState.anomalies.densityAnomaly = anomaly;
        UI.addAlert(`注意：${anomaly.description}`, 'warning');
        UI.addLog(`⚠️ 密度异常：${anomaly.description}`, 'warning');
        GameState.operations.push({
            time: GameState.timeElapsed,
            type: 'anomaly',
            detail: `密度突变: ${anomaly.description}`
        });
    },
    
    triggerFillingError(tank) {
        GameState.anomalies.tankFillingErrors[tank] = true;
        UI.updateTankStatus(tank, '漏填风险', '此舱数值可能未正确应用');
        UI.addLog(`⚠️ ${tank === 'left' ? '左' : '右'}压载舱控制系统不稳定，上次设置可能漏填！`, 'warning');
        GameState.operations.push({
            time: GameState.timeElapsed,
            type: 'anomaly',
            detail: `${tank === 'left' ? '左' : '右'}压载舱漏填风险`
        });
    },
    
    applyBallastModifications(tank, amount) {
        const note = GameState.anomalies.tankNotes[tank];
        if (!note) return amount;
        
        if (note.includes('减少20%')) {
            return amount * 0.8;
        } else if (note.includes('残留100kg')) {
            return amount + 100;
        } else if (note.includes('漏水约50kg')) {
            return Math.max(0, amount - 50);
        } else if (note.includes('容量减少100kg')) {
            return Math.min(amount, (GameState.submarine.ballastCapacity / 2) - 100);
        } else if (note.includes('只能排一半')) {
            return amount > 0 ? amount : amount / 2;
        }
        
        return amount;
    },
    
    checkFillingError(tank, amount) {
        if (GameState.anomalies.tankFillingErrors[tank] && Math.random() < 0.3) {
            UI.addLog(`⚠️ ${tank === 'left' ? '左' : '右'}压载舱设置未生效！请重新确认。`, 'error');
            GameState.anomalies.tankFillingErrors[tank] = false;
            UI.updateTankStatus(tank, '正常', null);
            return null;
        }
        return amount;
    },
    
    getActualDensity() {
        if (GameState.anomalies.densityAnomaly) {
            return 1025 * GameState.anomalies.densityAnomaly.actualMultiplier;
        }
        return 1025;
    },
    
    reset() {
        GameState.anomalies = {
            densityAnomaly: null,
            tankNotes: { left: null, right: null },
            oxygenLabelRenamed: false,
            tankFillingErrors: { left: false, right: false }
        };
        UI.updateOxygenLabel('氧气含量');
        UI.updateTankStatus('left', '正常', null);
        UI.updateTankStatus('right', '正常', null);
    }
};

const Game = {
    gameLoop: null,
    anomalyTimer: null,
    
    init() {
        UI.init();
        UI.updateDisplay();
        UI.addLog('系统初始化完成，点击"开始任务"开始潜水考古', 'info');
    },
    
    startMission() {
        GameState.isRunning = true;
        GameState.missionEnded = false;
        GameState.failureReason = null;
        GameState.depth = 0;
        GameState.maxDepth = 0;
        GameState.oxygen = 100;
        GameState.score = 0;
        GameState.timeElapsed = 0;
        GameState.operations = [];
        GameState.submarine.ballastWaterLeft = 0;
        GameState.submarine.ballastWaterRight = 0;
        GameState.submarine.cargo = [];
        GameState.submarine.targetDepth = 0;
        GameState.submarine.holdPosition = false;
        GameState.currentArtifacts = [];
        GameState.pendingBallastLeft = 0;
        GameState.pendingBallastRight = 0;
        UI.elements.tankLeftInput.value = '';
        UI.elements.tankRightInput.value = '';
        
        AnomalySystem.reset();
        UI.clearLog();
        UI.setButtonStates(true);
        UI.addLog('🚀 任务开始！潜水考古队出发！', 'success');
        UI.addLog('提示：通过控制压载舱水量调节浮力，注意氧气消耗和密度变化', 'info');
        
        this.generateArtifactsAtDepth();
        
        this.startGameLoop();
        this.startAnomalyTimer();
        UI.updateDisplay();
    },
    
    startGameLoop() {
        if (this.gameLoop) clearInterval(this.gameLoop);
        
        this.gameLoop = setInterval(() => {
            this.updateGame();
        }, 1000);
    },
    
    startAnomalyTimer() {
        if (this.anomalyTimer) clearInterval(this.anomalyTimer);
        
        this.anomalyTimer = setInterval(() => {
            if (GameState.isRunning && Math.random() < 0.2) {
                AnomalySystem.triggerRandomAnomaly();
            }
        }, 15000);
    },
    
    updateGame() {
        if (!GameState.isRunning) return;
        
        GameState.timeElapsed++;
        
        this.updateDepth();
        this.updateOxygen();
        this.checkOxygenConsumption();
        this.checkCargoWarning();
        
        if (GameState.oxygen <= 0) {
            this.oxygenDepleted();
            return;
        }
        
        if (GameState.depth >= 200) {
            this.endMission('reached_max_depth');
            return;
        }
        
        UI.updateDisplay();
    },
    
    updateDepth() {
        const state = this.calculatePhysicsState();
        const target = GameState.submarine.targetDepth;
        
        if (GameState.submarine.holdPosition) {
            return;
        }
        
        let depthChange = 0;
        if (state.netBuoyancy > 50) {
            depthChange = -0.5;
        } else if (state.netBuoyancy < -50) {
            depthChange = 0.5;
        }
        
        if (target > GameState.depth && state.netBuoyancy < 0) {
            depthChange = Math.min(1, (target - GameState.depth) * 0.1);
        } else if (target < GameState.depth && state.netBuoyancy > 0) {
            depthChange = Math.max(-1, (target - GameState.depth) * 0.1);
        }
        
        const newDepth = Math.max(0, Math.min(200, GameState.depth + depthChange));
        
        const oldFloor = Math.floor(GameState.depth / 20);
        const newFloor = Math.floor(newDepth / 20);
        
        GameState.depth = newDepth;
        
        if (newDepth > GameState.maxDepth) {
            GameState.maxDepth = newDepth;
        }
        
        if (oldFloor !== newFloor && newFloor > oldFloor) {
            this.generateArtifactsAtDepth();
        }
        
        if (newDepth <= 0 && GameState.submarine.cargo.length > 0) {
            this.salvageSuccess();
        }
    },
    
    updateOxygen() {
        const consumption = Physics.calculateOxygenConsumption(GameState.depth);
        GameState.oxygen = Math.max(0, GameState.oxygen - consumption);
    },
    
    checkOxygenConsumption() {
        const consumption = Physics.calculateOxygenConsumption(GameState.depth);
        const check = Physics.checkOxygenSufficiency(GameState.oxygen, GameState.depth, consumption);
        
        if (!check.sufficient && GameState.oxygen < 30) {
            UI.addAlert(`⚠️ 氧气不足！剩余${GameState.oxygen.toFixed(1)}%，返回水面需要${check.requiredOxygen.toFixed(1)}%`, 'warning');
        }
        
        if (GameState.oxygen < 20) {
            UI.elements.oxygenDisplay.parentElement.classList.add('oxygen-critical');
        } else if (GameState.oxygen < 50) {
            UI.elements.oxygenDisplay.parentElement.classList.add('oxygen-warning');
        } else {
            UI.elements.oxygenDisplay.parentElement.classList.remove('oxygen-critical', 'oxygen-warning');
        }
    },
    
    checkCargoWarning() {
        const cargoMass = this.getCargoMass();
        const warning = Physics.calculateCargoCapacityWarning(cargoMass, GameState.submarine.cargoCapacity);
        
        if (warning.level === 'critical') {
            UI.addAlert(warning.message, 'error');
        } else if (warning.level === 'warning' && Math.random() < 0.1) {
            UI.addAlert(warning.message, 'warning');
        }
    },
    
    calculatePhysicsState() {
        const actualDensity = AnomalySystem.getActualDensity();
        
        return Physics.calculateSubmarineState({
            volume: GameState.submarine.volume,
            baseMass: GameState.submarine.baseMass,
            ballastWater: GameState.submarine.ballastWaterLeft + GameState.submarine.ballastWaterRight,
            cargoMass: this.getCargoMass(),
            depth: GameState.depth,
            waterDensity: actualDensity
        });
    },
    
    getCargoMass() {
        return GameState.submarine.cargo.reduce((sum, a) => sum + a.weight, 0);
    },
    
    setTargetDepth(depth) {
        if (!GameState.isRunning) return;
        GameState.submarine.targetDepth = Math.max(0, Math.min(200, depth));
        GameState.submarine.holdPosition = false;
        UI.addLog(`🎯 设置目标深度：${GameState.submarine.targetDepth}米`, 'info');
        GameState.operations.push({
            time: GameState.timeElapsed,
            type: 'target_depth',
            detail: `设置目标深度: ${GameState.submarine.targetDepth}米`
        });
        UI.updateDisplay();
    },
    
    holdPosition() {
        if (!GameState.isRunning) return;
        GameState.submarine.holdPosition = true;
        GameState.submarine.targetDepth = GameState.depth;
        UI.addLog('⏸️ 保持当前深度', 'info');
        GameState.operations.push({
            time: GameState.timeElapsed,
            type: 'hold',
            detail: `保持深度: ${GameState.depth.toFixed(1)}米`
        });
    },
    
    adjustBallast(tank, amount) {
        if (!GameState.isRunning) return;
        
        const current = tank === 'left' ? GameState.pendingBallastLeft : GameState.pendingBallastRight;
        const maxPerTank = GameState.submarine.ballastCapacity / 2;
        const newValue = Math.max(0, Math.min(maxPerTank, current + amount));
        
        if (tank === 'left') {
            GameState.pendingBallastLeft = newValue;
            UI.elements.tankLeftInput.value = newValue;
        } else {
            GameState.pendingBallastRight = newValue;
            UI.elements.tankRightInput.value = newValue;
        }
        
        const action = amount > 0 ? '增加' : '减少';
        UI.addLog(`💧 ${tank === 'left' ? '左' : '右'}压载舱预${action}${Math.abs(amount)}kg，当前预设置：${newValue}kg`, 'info');
    },
    
    updatePendingBallast(tank, value) {
        const numValue = parseFloat(value) || 0;
        const maxPerTank = GameState.submarine.ballastCapacity / 2;
        const clamped = Math.max(0, Math.min(maxPerTank, numValue));
        
        if (tank === 'left') {
            GameState.pendingBallastLeft = clamped;
        } else {
            GameState.pendingBallastRight = clamped;
        }
    },
    
    applyBallast() {
        if (!GameState.isRunning) return;
        
        let leftAmount = GameState.pendingBallastLeft;
        let rightAmount = GameState.pendingBallastRight;
        
        leftAmount = AnomalySystem.applyBallastModifications('left', leftAmount);
        rightAmount = AnomalySystem.applyBallastModifications('right', rightAmount);
        
        leftAmount = AnomalySystem.checkFillingError('left', leftAmount);
        rightAmount = AnomalySystem.checkFillingError('right', rightAmount);
        
        if (leftAmount !== null) {
            const oldLeft = GameState.submarine.ballastWaterLeft;
            GameState.submarine.ballastWaterLeft = leftAmount;
            UI.addLog(`✅ 左压载舱设置已应用：${oldLeft}kg → ${leftAmount}kg`, 'success');
            GameState.operations.push({
                time: GameState.timeElapsed,
                type: 'ballast',
                detail: `左压载舱: ${oldLeft}kg → ${leftAmount}kg`
            });
        }
        
        if (rightAmount !== null) {
            const oldRight = GameState.submarine.ballastWaterRight;
            GameState.submarine.ballastWaterRight = rightAmount;
            UI.addLog(`✅ 右压载舱设置已应用：${oldRight}kg → ${rightAmount}kg`, 'success');
            GameState.operations.push({
                time: GameState.timeElapsed,
                type: 'ballast',
                detail: `右压载舱: ${oldRight}kg → ${rightAmount}kg`
            });
        }
        
        UI.updateDisplay();
    },
    
    generateArtifactsAtDepth() {
        const depth = Math.floor(GameState.depth / 20) * 20;
        if (depth > 0 && !GameState.artifacts[depth]) {
            const count = 3 + Math.floor(Math.random() * 4);
            GameState.artifacts[depth] = Physics.generateArtifacts(depth, count);
        }
        
        const currentDepth = Math.floor(GameState.depth / 20) * 20;
        GameState.currentArtifacts = GameState.artifacts[currentDepth] || [];
        UI.renderArtifacts();
    },
    
    salvageArtifact() {
        if (!GameState.isRunning || GameState.currentArtifacts.length === 0) return;
        
        const artifact = GameState.currentArtifacts.pop();
        if (!artifact) return;
        
        const currentCargo = this.getCargoMass();
        if (currentCargo + artifact.weight > GameState.submarine.cargoCapacity) {
            UI.addAlert(`⚠️ 货舱容量不足！${Physics.getMaterialName(artifact.material)}${Physics.getArtifactTypeName(artifact.type)}重${artifact.weight}kg，无法装载`, 'error');
            GameState.currentArtifacts.push(artifact);
            return;
        }
        
        GameState.submarine.cargo.push(artifact);
        const score = Physics.calculateSalvageScore(artifact, artifact.depth);
        
        UI.addLog(`🎯 成功打捞：${Physics.getMaterialName(artifact.material)}${Physics.getArtifactTypeName(artifact.type)}，重${artifact.weight}kg，预计${score}分`, 'success');
        GameState.operations.push({
            time: GameState.timeElapsed,
            type: 'salvage',
            detail: `打捞: ${Physics.getMaterialName(artifact.material)}${Physics.getArtifactTypeName(artifact.type)} (${artifact.weight}kg, ${score}分)`
        });
        
        UI.renderArtifacts();
        UI.updateCargoList();
        UI.updateDisplay();
    },
    
    releaseArtifact() {
        if (!GameState.isRunning || GameState.submarine.cargo.length === 0) return;
        
        const artifact = GameState.submarine.cargo.pop();
        const materialName = Physics.getMaterialName(artifact.material);
        const typeName = Physics.getArtifactTypeName(artifact.type);
        
        UI.addLog(`📤 释放了${materialName}${typeName}`, 'info');
        GameState.operations.push({
            time: GameState.timeElapsed,
            type: 'release',
            detail: `释放: ${materialName}${typeName}`
        });
        
        UI.updateCargoList();
        UI.updateDisplay();
    },
    
    releaseSpecificArtifact(index) {
        if (!GameState.isRunning) return;
        
        const artifact = GameState.submarine.cargo.splice(index, 1)[0];
        if (!artifact) return;
        
        const materialName = Physics.getMaterialName(artifact.material);
        const typeName = Physics.getArtifactTypeName(artifact.type);
        
        UI.addLog(`📤 丢弃了${materialName}${typeName}`, 'info');
        GameState.operations.push({
            time: GameState.timeElapsed,
            type: 'release',
            detail: `丢弃: ${materialName}${typeName}`
        });
        
        UI.updateCargoList();
        UI.updateDisplay();
    },
    
    releaseAllArtifacts() {
        if (!GameState.isRunning || GameState.submarine.cargo.length === 0) return;
        
        const count = GameState.submarine.cargo.length;
        GameState.submarine.cargo = [];
        
        UI.addLog(`🗑️ 全部释放了${count}件文物`, 'info');
        GameState.operations.push({
            time: GameState.timeElapsed,
            type: 'release_all',
            detail: `释放全部: ${count}件文物`
        });
        
        UI.updateCargoList();
        UI.updateDisplay();
    },
    
    salvageSuccess() {
        let totalScore = 0;
        GameState.submarine.cargo.forEach(artifact => {
            totalScore += Physics.calculateSalvageScore(artifact, artifact.depth);
        });
        
        GameState.score += totalScore;
        
        UI.addLog(`🎉 成功返回水面！本次打捞${GameState.submarine.cargo.length}件文物，获得${totalScore}分`, 'success');
        
        GameState.operations.push({
            time: GameState.timeElapsed,
            type: 'surface',
            detail: `返回水面: 打捞${GameState.submarine.cargo.length}件文物, +${totalScore}分`
        });
        
        GameState.submarine.cargo = [];
        UI.updateCargoList();
    },
    
    oxygenDepleted() {
        GameState.failureReason = 'oxygen_depleted';
        this.endMission('oxygen_depleted');
    },
    
    endMission(reason = 'manual') {
        GameState.isRunning = false;
        GameState.missionEnded = true;
        
        if (this.gameLoop) clearInterval(this.gameLoop);
        if (this.anomalyTimer) clearInterval(this.anomalyTimer);
        
        UI.setButtonStates(false);
        UI.elements.btnExport.disabled = false;
        
        let title, body, type;
        
        if (reason === 'oxygen_depleted') {
            title = '💀 任务失败';
            const humanReadable = this.getHumanReadableOxygenExplanation();
            body = `
                <div class="failure-reason">
                    <h3>氧气耗尽</h3>
                    <p>${humanReadable}</p>
                    <div class="stats-summary">
                        <div>最大深度：${GameState.maxDepth.toFixed(1)}米</div>
                        <div>任务时长：${GameState.timeElapsed}秒</div>
                        <div>最终得分：${GameState.score}分</div>
                        <div>打捞文物：${GameState.submarine.cargo.length}件（随艇沉没）</div>
                    </div>
                </div>
            `;
            type = 'error';
            UI.addLog('💀 任务失败：氧气耗尽', 'error');
        } else if (reason === 'reached_max_depth') {
            title = '🏆 任务完成';
            body = `
                <div class="success-reason">
                    <h3>到达最大深度</h3>
                    <p>恭喜你成功到达200米深度并安全返回！</p>
                    <div class="stats-summary">
                        <div>最大深度：${GameState.maxDepth.toFixed(1)}米</div>
                        <div>任务时长：${GameState.timeElapsed}秒</div>
                        <div>最终得分：${GameState.score}分</div>
                        <div>打捞文物：${GameState.submarine.cargo.length}件</div>
                        <div>剩余氧气：${GameState.oxygen.toFixed(1)}%</div>
                    </div>
                </div>
            `;
            type = 'success';
            UI.addLog('🏆 任务完成：到达最大深度', 'success');
        } else {
            title = '📋 任务结束';
            body = `
                <div class="end-reason">
                    <h3>任务已结束</h3>
                    <div class="stats-summary">
                        <div>最大深度：${GameState.maxDepth.toFixed(1)}米</div>
                        <div>任务时长：${GameState.timeElapsed}秒</div>
                        <div>最终得分：${GameState.score}分</div>
                        <div>打捞文物：${GameState.submarine.cargo.length}件</div>
                        <div>剩余氧气：${GameState.oxygen.toFixed(1)}%</div>
                    </div>
                </div>
            `;
            type = 'info';
            UI.addLog('📋 任务已结束', 'info');
        }
        
        GameState.operations.push({
            time: GameState.timeElapsed,
            type: 'mission_end',
            detail: `任务结束: ${reason}, 得分: ${GameState.score}`
        });
        
        UI.showModal(title, body, type);
        UI.updateDisplay();
    },
    
    getHumanReadableOxygenExplanation() {
        const maxDepth = GameState.maxDepth.toFixed(1);
        const timeElapsed = GameState.timeElapsed;
        const cargoCount = GameState.submarine.cargo.length;
        
        const explanations = [
            `在${maxDepth}米深的水下，氧气消耗速度是水面的${(1 + maxDepth * 0.001).toFixed(2)}倍。`,
            `你在水下待了${timeElapsed}秒，深度越大，每一秒的氧气都在加倍消耗。`,
            `深度增加，压力增大，每次呼吸都需要更多氧气来维持。`,
            `那${cargoCount}件文物让你舍不得丢，却忘了氧气表还在走。`
        ];
        
        if (GameState.anomalies.oxygenLabelRenamed) {
            explanations.push('氧气表被改名了，你可能没注意到它在往下掉。');
        }
        
        if (GameState.anomalies.densityAnomaly) {
            explanations.push('密度突变让你多花了时间调整浮力，错过了上浮的窗口。');
        }
        
        return explanations.join(' ');
    },
    
    exportResults() {
        const data = {
            missionId: `MISSION-${Date.now()}`,
            date: new Date().toLocaleString(),
            duration: GameState.timeElapsed,
            maxDepth: GameState.maxDepth.toFixed(1),
            finalScore: GameState.score,
            finalOxygen: GameState.oxygen.toFixed(1),
            cargoCount: GameState.submarine.cargo.length,
            cargoItems: GameState.submarine.cargo.map(a => ({
                material: Physics.getMaterialName(a.material),
                type: Physics.getArtifactTypeName(a.type),
                weight: a.weight,
                value: a.value,
                depth: a.depth
            })),
            operations: GameState.operations,
            anomalies: {
                densityAnomaly: GameState.anomalies.densityAnomaly?.description || null,
                tankNotes: GameState.anomalies.tankNotes,
                oxygenLabelRenamed: GameState.anomalies.oxygenLabelRenamed
            },
            failureReason: GameState.failureReason,
            physicsData: {
                gravity: Physics.GRAVITY,
                baseDensity: Physics.SEA_WATER_DENSITY,
                finalDensity: AnomalySystem.getActualDensity(),
                submarineVolume: GameState.submarine.volume,
                baseMass: GameState.submarine.baseMass
            }
        };
        
        const csvContent = this.generateCSV(data);
        this.downloadFile(csvContent, `diving-mission-${Date.now()}.csv`, 'text/csv');
        
        UI.addLog('📥 成绩已导出为CSV文件', 'success');
        
        const jsonContent = JSON.stringify(data, null, 2);
        this.downloadFile(jsonContent, `diving-mission-${Date.now()}.json`, 'application/json');
        
        UI.addLog('📥 详细数据已导出为JSON文件', 'success');
    },
    
    generateCSV(data) {
        let csv = '浮力潜水考古队 - 任务报告\n';
        csv += '\n基本信息\n';
        csv += `任务ID,${data.missionId}\n`;
        csv += `日期,${data.date}\n`;
        csv += `任务时长(秒),${data.duration}\n`;
        csv += `最大深度(米),${data.maxDepth}\n`;
        csv += `最终得分,${data.finalScore}\n`;
        csv += `剩余氧气(%),${data.finalOxygen}\n`;
        csv += `打捞文物数,${data.cargoCount}\n`;
        
        csv += `\n操作记录\n`;
        csv += '时间(秒),操作类型,详情\n';
        data.operations.forEach(op => {
            csv += `${op.time},${op.type},"${op.detail}"\n`;
        });
        
        csv += `\n异常事件\n`;
        csv += '异常类型,详情\n';
        if (data.anomalies.densityAnomaly) {
            csv += `密度突变,"${data.anomalies.densityAnomaly}"\n`;
        }
        if (data.anomalies.tankNotes.left) {
            csv += `左舱备注,"${data.anomalies.tankNotes.left}"\n`;
        }
        if (data.anomalies.tankNotes.right) {
            csv += `右舱备注,"${data.anomalies.tankNotes.right}"\n`;
        }
        if (data.anomalies.oxygenLabelRenamed) {
            csv += `氧气表改名,是\n`;
        }
        
        if (data.cargoItems.length > 0) {
            csv += `\n打捞文物\n`;
            csv += '材质,类型,重量(kg),价值,打捞深度(米)\n';
            data.cargoItems.forEach(item => {
                csv += `${item.material},${item.type},${item.weight},${item.value},${item.depth}\n`;
            });
        }
        
        csv += `\n物理参数\n`;
        csv += `重力加速度(m/s²),${data.physicsData.gravity}\n`;
        csv += `标准海水密度(kg/m³),${data.physicsData.baseDensity}\n`;
        csv += `实际海水密度(kg/m³),${data.physicsData.finalDensity.toFixed(1)}\n`;
        csv += `潜艇体积(m³),${data.physicsData.submarineVolume}\n`;
        csv += `潜艇自重(kg),${data.physicsData.baseMass}\n`;
        
        return csv;
    },
    
    downloadFile(content, filename, type) {
        const blob = new Blob([content], { type: type + ';charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },
    
    closeModal() {
        UI.closeModal();
    },
    
    clearLog() {
        UI.clearLog();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Game.init();
});
