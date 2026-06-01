const GameState = {
    IDLE: 'idle',
    RUNNING: 'running',
    PAUSED: 'paused',
    FINISHED: 'finished'
};

const EventType = {
    INFO: 'info',
    WARNING: 'warning',
    DANGER: 'danger',
    SUCCESS: 'success'
};

class ElectromagneticTrainGame {
    constructor() {
        this.state = GameState.IDLE;
        this.gameTime = 0;
        this.lastFrameTime = 0;
        this.animationFrameId = null;
        
        this.train = {
            position: 0,
            speed: 0,
            acceleration: 0,
            mass: 1000
        };
        
        this.trackLength = 1000;
        this.targetSpeed = 120;
        this.maxAllowedSpeed = 150;
        
        this.coils = [];
        this.stations = [];
        this.events = [];
        this.history = [];
        
        this.energy = {
            total: 0,
            propulsion: 0,
            braking: 0,
            wasted: 0
        };
        
        this.score = 0;
        this.penalties = [];
        
        this.overloadedCoils = new Set();
        this.speedOverLimit = false;
        this.visitedStations = new Set();
        
        this.reviewData = null;
        
        this.initElements();
        this.initDefaultConfig();
        this.bindEvents();
        this.render();
    }
    
    initElements() {
        this.el = {
            trackContainer: document.getElementById('track-container'),
            train: document.getElementById('train'),
            speedDisplay: document.getElementById('speed-display'),
            positionDisplay: document.getElementById('position-display'),
            timeDisplay: document.getElementById('time-display'),
            energyDisplay: document.getElementById('energy-display'),
            scoreDisplay: document.getElementById('score-display'),
            coilControls: document.getElementById('coil-controls'),
            eventLog: document.getElementById('event-log'),
            btnStart: document.getElementById('btn-start'),
            btnPause: document.getElementById('btn-pause'),
            btnReset: document.getElementById('btn-reset'),
            btnReview: document.getElementById('btn-review'),
            btnImport: document.getElementById('btn-import'),
            importModal: document.getElementById('import-modal'),
            resultModal: document.getElementById('result-modal'),
            reviewModal: document.getElementById('review-modal'),
            importData: document.getElementById('import-data'),
            btnImportConfirm: document.getElementById('btn-import-confirm'),
            btnImportCancel: document.getElementById('btn-import-cancel'),
            btnLoadDemo: document.getElementById('btn-load-demo'),
            btnCloseResult: document.getElementById('btn-close-result'),
            btnExportReport: document.getElementById('btn-export-report'),
            btnCloseReview: document.getElementById('btn-close-review'),
            btnReviewPlay: document.getElementById('btn-review-play'),
            btnReviewPause: document.getElementById('btn-review-pause'),
            reviewSlider: document.getElementById('review-slider'),
            reviewTime: document.getElementById('review-time'),
            resultSummary: document.getElementById('result-summary'),
            timeline: document.getElementById('timeline'),
            energyBreakdown: document.getElementById('energy-breakdown'),
            penaltyDetails: document.getElementById('penalty-details'),
            reviewTrack: document.getElementById('review-track'),
            reviewStats: document.getElementById('review-stats')
        };
    }
    
    initDefaultConfig() {
        this.coils = [
            { id: 'C1', position: 100, power: 50, active: false, maxPower: 80, continuousTime: 0, note: '启动线圈' },
            { id: 'C2', position: 250, power: 60, active: false, maxPower: 70, continuousTime: 0, note: '加速段' },
            { id: 'C3', position: 400, power: 45, active: false, maxPower: 60, continuousTime: 0, note: '匀速线圈' },
            { id: 'C4', position: 550, power: 55, active: false, maxPower: 65, continuousTime: 0, note: null },
            { id: 'C5', position: 700, power: 40, active: false, maxPower: 55, continuousTime: 0, note: '减速准备' },
            { id: 'C6', position: 850, power: 35, active: false, maxPower: 50, continuousTime: 0, note: '旧线圈-需维护' }
        ];
        
        this.stations = [
            { id: 'S1', position: 0, name: '起点站', targetArrival: 0, visited: true },
            { id: 'S2', position: 500, name: '中间站', targetArrival: 25, visited: false },
            { id: 'S3', position: 1000, name: '终点站', targetArrival: 50, visited: false }
        ];
        
        this.visitedStations.add('S1');
    }
    
    bindEvents() {
        this.el.btnStart.addEventListener('click', () => this.start());
        this.el.btnPause.addEventListener('click', () => this.pause());
        this.el.btnReset.addEventListener('click', () => this.reset());
        this.el.btnReview.addEventListener('click', () => this.showReview());
        this.el.btnImport.addEventListener('click', () => this.showImportModal());
        
        this.el.btnImportConfirm.addEventListener('click', () => this.importData());
        this.el.btnImportCancel.addEventListener('click', () => this.hideImportModal());
        this.el.btnLoadDemo.addEventListener('click', () => this.loadDemoData());
        
        this.el.btnCloseResult.addEventListener('click', () => this.hideResultModal());
        this.el.btnExportReport.addEventListener('click', () => this.exportReport());
        
        this.el.btnCloseReview.addEventListener('click', () => this.hideReviewModal());
        this.el.btnReviewPlay.addEventListener('click', () => this.playReview());
        this.el.btnReviewPause.addEventListener('click', () => this.pauseReview());
        this.el.reviewSlider.addEventListener('input', (e) => this.seekReview(e.target.value));
    }
    
    start() {
        if (this.state === GameState.RUNNING) return;
        
        this.state = GameState.RUNNING;
        this.lastFrameTime = performance.now();
        
        this.el.btnStart.disabled = true;
        this.el.btnPause.disabled = false;
        this.el.btnReview.disabled = true;
        
        this.addEvent(EventType.INFO, '列车启动', '电磁列车开始运行');
        this.gameLoop();
    }
    
    pause() {
        if (this.state !== GameState.RUNNING) return;
        
        this.state = GameState.PAUSED;
        cancelAnimationFrame(this.animationFrameId);
        
        this.el.btnStart.disabled = false;
        this.el.btnPause.disabled = true;
        
        this.addEvent(EventType.INFO, '运行暂停', '列车已暂停运行');
    }
    
    reset() {
        this.state = GameState.IDLE;
        cancelAnimationFrame(this.animationFrameId);
        
        this.gameTime = 0;
        this.train = {
            position: 0,
            speed: 0,
            acceleration: 0,
            mass: 1000
        };
        
        this.energy = {
            total: 0,
            propulsion: 0,
            braking: 0,
            wasted: 0
        };
        
        this.score = 0;
        this.penalties = [];
        this.events = [];
        this.history = [];
        this.overloadedCoils.clear();
        this.speedOverLimit = false;
        this.visitedStations = new Set(['S1']);
        
        this.coils.forEach(coil => {
            coil.active = false;
            coil.continuousTime = 0;
        });
        
        this.stations.forEach(station => {
            station.visited = station.id === 'S1';
        });
        
        this.el.btnStart.disabled = false;
        this.el.btnPause.disabled = true;
        this.el.btnReview.disabled = true;
        
        this.render();
        this.addEvent(EventType.INFO, '系统重置', '游戏已重置，准备开始');
    }
    
    gameLoop() {
        if (this.state !== GameState.RUNNING) return;
        
        const now = performance.now();
        const deltaTime = (now - this.lastFrameTime) / 1000;
        this.lastFrameTime = now;
        
        this.update(deltaTime);
        this.render();
        
        this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
    }
    
    update(deltaTime) {
        this.gameTime += deltaTime;
        
        const force = this.calculatePropulsionForce();
        const drag = this.calculateDrag();
        const netForce = force - drag;
        
        this.train.acceleration = netForce / this.train.mass;
        this.train.speed += this.train.acceleration * deltaTime;
        this.train.speed = Math.max(0, this.train.speed);
        this.train.position += (this.train.speed / 3.6) * deltaTime;
        
        this.updateEnergy(deltaTime, force);
        this.checkCoilOverload(deltaTime);
        this.checkSpeedLimit();
        this.checkStationArrival();
        this.recordHistory();
        
        if (this.train.position >= this.trackLength) {
            this.finishGame();
        }
    }
    
    calculatePropulsionForce() {
        let totalForce = 0;
        
        this.coils.forEach(coil => {
            if (!coil.active) return;
            
            const distance = Math.abs(this.train.position - coil.position);
            const effectiveRange = 100;
            
            if (distance < effectiveRange) {
                const efficiency = 1 - (distance / effectiveRange);
                const force = (coil.power * 10) * efficiency;
                totalForce += force;
            }
        });
        
        return totalForce;
    }
    
    calculateDrag() {
        const airDrag = 0.5 * 1.225 * 2.5 * 0.3 * Math.pow(this.train.speed / 3.6, 2);
        const rollingResistance = 0.005 * this.train.mass * 9.8;
        return airDrag + rollingResistance;
    }
    
    updateEnergy(deltaTime, force) {
        const distance = (this.train.speed / 3.6) * deltaTime;
        const work = force * distance;
        
        if (work > 0) {
            this.energy.propulsion += work / 1000;
        } else {
            this.energy.braking += Math.abs(work) / 1000;
        }
        
        this.coils.forEach(coil => {
            if (coil.active) {
                this.energy.wasted += (coil.power * 0.1) * deltaTime;
            }
        });
        
        this.energy.total = this.energy.propulsion + this.energy.wasted;
    }
    
    checkCoilOverload(deltaTime) {
        this.coils.forEach(coil => {
            if (coil.active && coil.power > coil.maxPower * 0.8) {
                coil.continuousTime += deltaTime;
                
                if (coil.continuousTime > 5 && !this.overloadedCoils.has(coil.id)) {
                    this.overloadedCoils.add(coil.id);
                    this.addEvent(EventType.DANGER, '线圈过载', `${coil.id} 持续高功率运行超过5秒`);
                    this.addPenalty('coil_overload', `${coil.id} 过载`, 50);
                }
            } else {
                coil.continuousTime = 0;
            }
        });
    }
    
    checkSpeedLimit() {
        if (this.train.speed > this.maxAllowedSpeed) {
            if (!this.speedOverLimit) {
                this.speedOverLimit = true;
                this.addEvent(EventType.DANGER, '速度超限', `当前速度 ${this.train.speed.toFixed(1)} km/h 超过限制 ${this.maxAllowedSpeed} km/h`);
            }
            this.addPenalty('speed_overlimit', '速度超限', 10 * (this.train.speed - this.maxAllowedSpeed));
        } else if (this.speedOverLimit && this.train.speed <= this.maxAllowedSpeed) {
            this.speedOverLimit = false;
            this.addEvent(EventType.WARNING, '速度恢复', '速度已降至安全范围');
        }
    }
    
    checkStationArrival() {
        this.stations.forEach(station => {
            if (station.visited) return;
            
            const distance = this.train.position - station.position;
            
            if (distance >= 0 && distance < 50) {
                station.visited = true;
                this.visitedStations.add(station.id);
                
                const arrivalTime = this.gameTime;
                const timeDiff = arrivalTime - station.targetArrival;
                
                if (Math.abs(timeDiff) < 5) {
                    this.addEvent(EventType.SUCCESS, '准点到站', `${station.name} 到达，误差 ${timeDiff.toFixed(1)} 秒`);
                    this.score += 100;
                } else if (timeDiff > 0) {
                    this.addEvent(EventType.WARNING, '晚点到达', `${station.name} 晚点 ${timeDiff.toFixed(1)} 秒`);
                    this.addPenalty('late_arrival', `${station.name} 晚点`, timeDiff * 2);
                } else {
                    this.addEvent(EventType.WARNING, '早到', `${station.name} 提前 ${Math.abs(timeDiff).toFixed(1)} 秒`);
                    this.score += 50;
                }
            } else if (distance > 50 && !station.visited) {
                station.visited = true;
                this.addEvent(EventType.DANGER, '越过站点', `列车越过 ${station.name} 未停车`);
                this.addPenalty('station_skip', `越过 ${station.name}`, 200);
            }
        });
    }
    
    recordHistory() {
        this.history.push({
            time: this.gameTime,
            position: this.train.position,
            speed: this.train.speed,
            energy: { ...this.energy },
            coils: this.coils.map(c => ({ id: c.id, active: c.active, power: c.power })),
            score: this.score
        });
    }
    
    addEvent(type, title, description) {
        const event = {
            time: this.gameTime,
            type,
            title,
            description,
            timestamp: new Date().toISOString()
        };
        this.events.push(event);
        this.renderEventLog();
    }
    
    addPenalty(type, reason, amount) {
        const existing = this.penalties.find(p => p.type === type && p.reason === reason);
        if (existing) {
            existing.amount += amount;
            existing.count++;
        } else {
            this.penalties.push({
                type,
                reason,
                amount,
                count: 1,
                time: this.gameTime
            });
        }
        
        this.score = Math.max(0, this.score - amount);
    }
    
    finishGame() {
        this.state = GameState.FINISHED;
        cancelAnimationFrame(this.animationFrameId);
        
        this.el.btnStart.disabled = true;
        this.el.btnPause.disabled = true;
        this.el.btnReview.disabled = false;
        
        this.addEvent(EventType.SUCCESS, '运行完成', '列车已到达终点站');
        this.calculateFinalScore();
        this.showResult();
    }
    
    calculateFinalScore() {
        const baseScore = 500;
        const timeBonus = Math.max(0, 100 - (this.gameTime - 50) * 2);
        const efficiencyBonus = Math.max(0, 200 - this.energy.total * 0.5);
        
        this.score += baseScore + timeBonus + efficiencyBonus;
    }
    
    toggleCoil(coilId) {
        const coil = this.coils.find(c => c.id === coilId);
        if (!coil) return;
        
        coil.active = !coil.active;
        
        if (this.state === GameState.RUNNING) {
            this.addEvent(EventType.INFO, '线圈切换', `${coilId} ${coil.active ? '通电' : '断电'}`);
        }
        
        this.renderCoilControls();
        this.renderTrack();
    }
    
    render() {
        this.renderStatus();
        this.renderTrack();
        this.renderCoilControls();
        this.renderEventLog();
    }
    
    renderStatus() {
        this.el.speedDisplay.textContent = `${this.train.speed.toFixed(1)} km/h`;
        this.el.positionDisplay.textContent = `${this.train.position.toFixed(1)} m`;
        this.el.timeDisplay.textContent = this.formatTime(this.gameTime);
        this.el.energyDisplay.textContent = `${this.energy.total.toFixed(1)} kJ`;
        this.el.scoreDisplay.textContent = Math.round(this.score);
        
        if (this.train.speed > this.maxAllowedSpeed) {
            this.el.speedDisplay.style.color = '#ff4757';
        } else if (this.train.speed > this.maxAllowedSpeed * 0.9) {
            this.el.speedDisplay.style.color = '#ffa500';
        } else {
            this.el.speedDisplay.style.color = '#fff';
        }
    }
    
    renderTrack() {
        this.el.trackContainer.innerHTML = '';
        
        const track = document.createElement('div');
        track.className = 'track';
        this.el.trackContainer.appendChild(track);
        
        this.coils.forEach(coil => {
            const coilEl = document.createElement('div');
            coilEl.className = `coil ${coil.active ? 'active' : ''} ${this.overloadedCoils.has(coil.id) ? 'overload' : ''}`;
            coilEl.style.left = `${(coil.position / this.trackLength) * 100}%`;
            coilEl.title = `${coil.id} - ${coil.note || '无备注'}`;
            coilEl.onclick = () => this.toggleCoil(coil.id);
            
            const label = document.createElement('div');
            label.className = 'coil-label';
            label.textContent = coil.id;
            coilEl.appendChild(label);
            
            this.el.trackContainer.appendChild(coilEl);
        });
        
        this.stations.forEach(station => {
            const stationEl = document.createElement('div');
            stationEl.className = `station ${station.visited ? 'visited' : ''}`;
            stationEl.style.left = `${(station.position / this.trackLength) * 100}%`;
            
            const label = document.createElement('div');
            label.className = 'station-label';
            label.textContent = station.name;
            stationEl.appendChild(label);
            
            this.el.trackContainer.appendChild(stationEl);
        });
        
        const trainLeft = Math.min(100, (this.train.position / this.trackLength) * 100);
        this.el.train.style.left = `calc(${trainLeft}% - 40px)`;
    }
    
    renderCoilControls() {
        this.el.coilControls.innerHTML = '';
        
        this.coils.forEach(coil => {
            const item = document.createElement('div');
            item.className = `coil-control-item ${coil.active ? 'active' : ''} ${this.overloadedCoils.has(coil.id) ? 'overload' : ''}`;
            item.onclick = () => this.toggleCoil(coil.id);
            
            const name = document.createElement('span');
            name.className = 'coil-name';
            name.textContent = `${coil.id} (${coil.power}W)`;
            
            const status = document.createElement('span');
            status.className = 'coil-status';
            
            item.appendChild(name);
            item.appendChild(status);
            this.el.coilControls.appendChild(item);
        });
    }
    
    renderEventLog() {
        this.el.eventLog.innerHTML = '';
        
        const recentEvents = this.events.slice(-10).reverse();
        
        recentEvents.forEach(event => {
            const item = document.createElement('div');
            item.className = `event-item ${event.type}`;
            
            const time = document.createElement('span');
            time.className = 'event-time';
            time.textContent = `[${this.formatTime(event.time)}]`;
            
            const content = document.createElement('span');
            content.innerHTML = `<strong>${event.title}</strong>: ${event.description}`;
            
            item.appendChild(time);
            item.appendChild(content);
            this.el.eventLog.appendChild(item);
        });
    }
    
    showImportModal() {
        this.el.importModal.classList.remove('hidden');
    }
    
    hideImportModal() {
        this.el.importModal.classList.add('hidden');
    }
    
    sanitizeData(data) {
        const clean = (obj, defaults) => {
            if (obj === null || obj === undefined || obj === '') {
                return defaults;
            }
            if (typeof obj === 'object') {
                const result = Array.isArray(obj) ? [] : {};
                for (const key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        result[key] = clean(obj[key], defaults && defaults[key]);
                    }
                }
                return result;
            }
            return obj;
        };
        
        return clean(data);
    }
    
    importData() {
        try {
            const rawData = this.el.importData.value;
            let data;
            
            try {
                data = JSON.parse(rawData);
            } catch (e) {
                data = this.parseTextConfig(rawData);
            }
            
            data = this.sanitizeData(data);
            
            if (data.coils && Array.isArray(data.coils)) {
                this.coils = data.coils.map((c, i) => ({
                    id: c.id || `C${i + 1}`,
                    position: c.position !== undefined ? c.position : 100 + i * 150,
                    power: c.power || 50,
                    active: false,
                    maxPower: c.maxPower || 70,
                    continuousTime: 0,
                    note: c.note || c.remark || c.comment || null
                }));
            }
            
            if (data.stations && Array.isArray(data.stations)) {
                this.stations = data.stations.map((s, i) => ({
                    id: s.id || `S${i + 1}`,
                    position: s.position !== undefined ? s.position : i * 500,
                    name: s.name || `站点${i + 1}`,
                    targetArrival: s.targetArrival || s.arrival_time || i * 25,
                    visited: false
                }));
                this.stations[0].visited = true;
                this.visitedStations = new Set([this.stations[0].id]);
            }
            
            if (data.trackLength) {
                this.trackLength = data.trackLength;
            }
            
            this.hideImportModal();
            this.reset();
            this.addEvent(EventType.SUCCESS, '数据导入成功', '已加载自定义配置');
            
        } catch (error) {
            alert('导入失败: ' + error.message);
        }
    }
    
    parseTextConfig(text) {
        const coils = [];
        const stations = [];
        const lines = text.split('\n');
        
        lines.forEach(line => {
            const match = line.match(/(C\d+).*?(\d+).*?(\d+)/);
            if (match) {
                coils.push({
                    id: match[1],
                    position: parseInt(match[2]),
                    power: parseInt(match[3])
                });
            }
            
            const stationMatch = line.match(/(S\d+|站\d+|站点\d+).*?(\d+)/);
            if (stationMatch) {
                stations.push({
                    id: stationMatch[1],
                    position: parseInt(stationMatch[2])
                });
            }
        });
        
        return { coils, stations };
    }
    
    loadDemoData() {
        const demoData = {
            coils: [
                { id: 'C1', position: 80, power: 55, maxPower: 75, note: '启动线圈-2023款' },
                { id: 'C2', position: 200, power: 65, maxPower: 70, note: '' },
                { id: 'C3', position: 320, power: 70, maxPower: 65, note: '过载风险高' },
                { id: 'C4', position: 440, power: 50, maxPower: 80, note: null },
                { id: 'C5', position: 560, power: 45, maxPower: 60, note: '2022年检修' },
                { id: 'C6', position: 680, power: 55, maxPower: 70, note: undefined },
                { id: 'C7', position: 800, power: 40, maxPower: 55, note: '减速段' },
                { id: 'C8', position: 920, power: 30, maxPower: 45, note: '旧备注：终点站前' }
            ],
            stations: [
                { id: 'S1', position: 0, name: '始发站', targetArrival: 0 },
                { id: 'S2', position: 350, name: '科技城站', targetArrival: 18 },
                { id: 'S3', position: 650, name: '中心站', targetArrival: 35 },
                { id: 'S4', position: 1000, name: '终点站', targetArrival: 55 }
            ],
            trackLength: 1000,
            remarks: [
                '业务部提供数据',
                '部分线圈参数不全',
                '包含历史备注信息'
            ]
        };
        
        this.el.importData.value = JSON.stringify(demoData, null, 2);
    }
    
    showResult() {
        this.renderResultSummary();
        this.renderTimeline();
        this.renderEnergyBreakdown();
        this.renderPenaltyDetails();
        this.el.resultModal.classList.remove('hidden');
    }
    
    hideResultModal() {
        this.el.resultModal.classList.add('hidden');
    }
    
    renderResultSummary() {
        const totalPenalty = this.penalties.reduce((sum, p) => sum + p.amount, 0);
        
        this.el.resultSummary.innerHTML = `
            <div class="summary-card">
                <span class="label">运行时间</span>
                <span class="value">${this.formatTime(this.gameTime)}</span>
            </div>
            <div class="summary-card">
                <span class="label">总能耗</span>
                <span class="value">${this.energy.total.toFixed(1)} kJ</span>
            </div>
            <div class="summary-card">
                <span class="label">最终得分</span>
                <span class="value">${Math.round(this.score)}</span>
            </div>
            <div class="summary-card">
                <span class="label">总扣分</span>
                <span class="value" style="color: #ff4757;">${Math.round(totalPenalty)}</span>
            </div>
        `;
    }
    
    renderTimeline() {
        this.el.timeline.innerHTML = '';
        
        const sortedEvents = [...this.events].sort((a, b) => a.time - b.time);
        
        sortedEvents.forEach(event => {
            const item = document.createElement('div');
            item.className = `timeline-item ${event.type}`;
            
            item.innerHTML = `
                <div class="timeline-time">${this.formatTime(event.time)}</div>
                <div class="timeline-content">
                    <div class="title">${event.title}</div>
                    <div class="desc">${event.description}</div>
                </div>
            `;
            
            this.el.timeline.appendChild(item);
        });
    }
    
    renderEnergyBreakdown() {
        this.el.energyBreakdown.innerHTML = `
            <div class="energy-item">
                <span class="label">推进能耗</span>
                <span class="value">${this.energy.propulsion.toFixed(2)} kJ</span>
            </div>
            <div class="energy-item">
                <span class="label">制动能量</span>
                <span class="value">${this.energy.braking.toFixed(2)} kJ</span>
            </div>
            <div class="energy-item">
                <span class="label">空载损耗</span>
                <span class="value">${this.energy.wasted.toFixed(2)} kJ</span>
            </div>
            <div class="energy-item" style="border-top: 1px solid rgba(255,255,255,0.1); margin-top: 0.5rem; padding-top: 0.75rem;">
                <span class="label"><strong>总能耗</strong></span>
                <span class="value"><strong>${this.energy.total.toFixed(2)} kJ</strong></span>
            </div>
            <div class="energy-item">
                <span class="label">能量效率</span>
                <span class="value">${((this.energy.propulsion / (this.energy.total || 1)) * 100).toFixed(1)}%</span>
            </div>
        `;
    }
    
    renderPenaltyDetails() {
        if (this.penalties.length === 0) {
            this.el.penaltyDetails.innerHTML = '<div class="penalty-item"><span class="label">无扣分</span><span class="value positive">+0</span></div>';
            return;
        }
        
        let html = '';
        
        this.penalties.forEach(penalty => {
            html += `
                <div class="penalty-item">
                    <span class="label">${penalty.reason} ${penalty.count > 1 ? `(x${penalty.count})` : ''}</span>
                    <span class="value">-${Math.round(penalty.amount)}</span>
                </div>
            `;
        });
        
        const total = this.penalties.reduce((sum, p) => sum + p.amount, 0);
        html += `
            <div class="penalty-item" style="border-top: 1px solid rgba(255,255,255,0.1); margin-top: 0.5rem; padding-top: 0.75rem;">
                <span class="label"><strong>扣分合计</strong></span>
                <span class="value"><strong>-${Math.round(total)}</strong></span>
            </div>
        `;
        
        this.el.penaltyDetails.innerHTML = html;
    }
    
    showReview() {
        this.reviewData = {
            playing: false,
            currentIndex: 0,
            animationId: null
        };
        
        this.el.reviewSlider.max = this.history.length - 1;
        this.el.reviewSlider.value = 0;
        
        this.renderReviewTrack();
        this.updateReviewStats(0);
        this.el.reviewModal.classList.remove('hidden');
    }
    
    hideReviewModal() {
        if (this.reviewData && this.reviewData.animationId) {
            cancelAnimationFrame(this.reviewData.animationId);
        }
        this.el.reviewModal.classList.add('hidden');
    }
    
    renderReviewTrack() {
        let html = '<div style="position: absolute; top: 50%; left: 0; right: 0; height: 4px; background: #333; transform: translateY(-50%);"></div>';
        
        this.stations.forEach(station => {
            const left = (station.position / this.trackLength) * 100;
            html += `<div style="position: absolute; top: 30%; left: ${left}%; width: 60px; height: 50px; background: rgba(124, 58, 237, 0.3); border: 2px solid #7c3aed; border-radius: 4px;"></div>`;
            html += `<div style="position: absolute; top: 10%; left: ${left}%; font-size: 0.7rem; color: #7c3aed;">${station.name}</div>`;
        });
        
        html += '<div id="review-train" style="position: absolute; top: 50%; transform: translateY(-50%); width: 60px; height: 30px; background: linear-gradient(180deg, #00d4ff, #0088aa); border-radius: 6px 15px 15px 6px; left: 0;"></div>';
        
        this.el.reviewTrack.innerHTML = html;
    }
    
    updateReviewStats(index) {
        if (index < 0 || index >= this.history.length) return;
        
        const data = this.history[index];
        const trainEl = document.getElementById('review-train');
        
        if (trainEl) {
            const left = Math.min(100, (data.position / this.trackLength) * 100);
            trainEl.style.left = `calc(${left}% - 30px)`;
        }
        
        this.el.reviewTime.textContent = this.formatTime(data.time);
        this.el.reviewSlider.value = index;
        
        this.el.reviewStats.innerHTML = `
            <div class="review-stat">
                <span class="label">速度</span>
                <span class="value">${data.speed.toFixed(1)} km/h</span>
            </div>
            <div class="review-stat">
                <span class="label">位置</span>
                <span class="value">${data.position.toFixed(1)} m</span>
            </div>
            <div class="review-stat">
                <span class="label">得分</span>
                <span class="value">${Math.round(data.score)}</span>
            </div>
        `;
    }
    
    playReview() {
        if (!this.reviewData) return;
        
        this.reviewData.playing = true;
        this.animateReview();
    }
    
    pauseReview() {
        if (!this.reviewData) return;
        
        this.reviewData.playing = false;
        if (this.reviewData.animationId) {
            cancelAnimationFrame(this.reviewData.animationId);
        }
    }
    
    animateReview() {
        if (!this.reviewData || !this.reviewData.playing) return;
        
        this.reviewData.currentIndex++;
        
        if (this.reviewData.currentIndex >= this.history.length) {
            this.reviewData.playing = false;
            return;
        }
        
        this.updateReviewStats(this.reviewData.currentIndex);
        
        this.reviewData.animationId = setTimeout(() => {
            this.animateReview();
        }, 50);
    }
    
    seekReview(value) {
        if (!this.reviewData) return;
        
        this.reviewData.currentIndex = parseInt(value);
        this.updateReviewStats(this.reviewData.currentIndex);
    }
    
    exportReport() {
        const report = {
            version: '1.0',
            exportTime: new Date().toISOString(),
            gameResult: {
                totalTime: this.gameTime,
                totalEnergy: this.energy.total,
                finalScore: this.score,
                completed: true
            },
            energyBreakdown: {
                propulsion: this.energy.propulsion,
                braking: this.energy.braking,
                wasted: this.energy.wasted,
                efficiency: (this.energy.propulsion / (this.energy.total || 1)) * 100
            },
            events: this.events.map(e => ({
                time: e.time,
                type: e.type,
                title: e.title,
                description: e.description
            })),
            penalties: this.penalties.map(p => ({
                type: p.type,
                reason: p.reason,
                amount: p.amount,
                count: p.count
            })),
            coilStatus: this.coils.map(c => ({
                id: c.id,
                position: c.position,
                power: c.power,
                wasOverloaded: this.overloadedCoils.has(c.id),
                note: c.note
            })),
            corrections: {
                overloadCorrected: this.overloadedCoils.size > 0,
                overloadCount: this.overloadedCoils.size,
                adjustedScore: this.score
            }
        };
        
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `电磁列车运行报告_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.addEvent(EventType.SUCCESS, '报告导出', '运行报告已导出，包含修正后的口径');
    }
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.game = new ElectromagneticTrainGame();
});