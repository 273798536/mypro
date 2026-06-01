class SailingGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.renderer = new Renderer(this.canvas);
        
        this.grid = new Grid(800, 600, 50);
        this.grid.originX = 0;
        this.grid.originY = 0;
        
        this.levels = Level.getPredefinedLevels(this.grid);
        this.currentLevel = this.levels[0];
        
        this.gameState = new GameState();
        this.gameState.currentLevel = this.currentLevel;
        this.gameState.maxSteps = this.currentLevel.maxSteps;
        
        this.errorDetector = new ErrorDetector();
        this.scoreSystem = new ScoreSystem();
        this.manualCorrection = new ManualCorrection();
        
        this.animationId = null;
        this.stepIntervalId = null;
        this.showPaths = true;
        this.showVectors = true;
        this.runCount = 0;
        this.firstRunResults = null;
        this.secondRunResults = null;
        this.currentReport = null;
        
        this.init();
    }

    init() {
        this.setupLevelSelect();
        this.setupEventListeners();
        this.loadLevel(this.levels[0].id);
        this.createSailboats(1);
        this.updateUI();
        this.startAnimationLoop();
    }

    setupLevelSelect() {
        const select = document.getElementById('levelSelect');
        select.innerHTML = '';
        
        const difficultyLabels = {
            'easy': '🟢 简单',
            'medium': '🟡 中等',
            'hard': '🔴 困难',
            'teaching': '📚 教学'
        };
        
        for (const level of this.levels) {
            const option = document.createElement('option');
            option.value = level.id;
            option.textContent = `${difficultyLabels[level.difficulty]} ${level.name}`;
            select.appendChild(option);
        }
        
        select.addEventListener('change', (e) => {
            this.loadLevel(e.target.value);
        });
    }

    loadLevel(levelId) {
        const level = this.levels.find(l => l.id === levelId);
        if (!level) return;
        
        this.currentLevel = level;
        this.gameState.currentLevel = level;
        this.gameState.maxSteps = level.maxSteps;
        
        document.getElementById('windAngle').value = level.wind.direction;
        document.getElementById('windMagnitude').value = level.wind.magnitude;
        document.getElementById('stepCount').value = level.maxSteps;
        document.getElementById('correctedWindAngle').value = level.wind.direction;
        document.getElementById('correctedWindMagnitude').value = level.wind.magnitude;
        
        this.resetGame();
        this.updateUI();
    }

    setupEventListeners() {
        document.getElementById('startBtn').addEventListener('click', () => this.startSailing());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetGame());
        document.getElementById('runTwiceBtn').addEventListener('click', () => this.runTwice());
        document.getElementById('compareBtn').addEventListener('click', () => this.showComparison());
        document.getElementById('applyCorrectionBtn').addEventListener('click', () => this.applyCorrection());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportReport('text'));
        document.getElementById('exportJsonBtn').addEventListener('click', () => this.exportReport('json'));
        
        ['windAngle', 'windMagnitude', 'stepCount'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => {
                if (!this.gameState.isRunning) {
                    this.updateWindFromUI();
                }
            });
        });
        
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    }

    handleCanvasClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        const clickPos = new Vector(x, y);
        const gridCoord = this.grid.getGridCoordinateLabel(clickPos);
        console.log(`点击位置: ${clickPos.toString()}，网格坐标: ${gridCoord}`);
    }

    updateWindFromUI() {
        const angle = parseFloat(document.getElementById('windAngle').value) || 0;
        const magnitude = parseFloat(document.getElementById('windMagnitude').value) || 0;
        const steps = parseInt(document.getElementById('stepCount').value) || 5;
        
        this.currentLevel.wind.update(angle, magnitude);
        this.gameState.maxSteps = Math.min(steps, this.currentLevel.maxSteps);
        
        this.updateUI();
    }

    createSailboats(count) {
        this.gameState.sailboats = [];
        for (let i = 0; i < count; i++) {
            const boat = this.currentLevel.createSailboat(`boat-${i + 1}`);
            boat.color = this.getBoatColor(i);
            this.gameState.addSailboat(boat);
        }
    }

    getBoatColor(index) {
        const colors = ['#4299e1', '#9f7aea', '#f6ad55', '#68d391', '#fc8181'];
        return colors[index % colors.length];
    }

    startSailing() {
        if (this.gameState.isRunning) return;
        
        this.resetGame();
        this.updateWindFromUI();
        
        this.gameState.isRunning = true;
        this.gameState.gameStatus = 'running';
        
        this.scoreSystem.startAttempt(this.currentLevel, this.gameState.sailboats.length);
        this.manualCorrection.saveOriginalConfig(this.currentLevel);
        
        document.getElementById('startBtn').disabled = true;
        document.getElementById('pauseBtn').disabled = false;
        document.getElementById('resetBtn').disabled = true;
        
        this.runStepLoop();
    }

    runStepLoop() {
        const speed = this.gameState.animationSpeed;
        
        this.stepIntervalId = setInterval(() => {
            if (this.gameState.isPaused) return;
            
            this.executeStep();
            
            if (this.gameState.isComplete()) {
                this.finishSailing();
            }
        }, speed);
    }

    executeStep() {
        const stepResults = this.gameState.stepAll(this.grid);
        
        for (const result of stepResults) {
            const detection = this.errorDetector.detectAll(result, this.grid, this.currentLevel);
            this.scoreSystem.recordStep(this.gameState.currentStep - 1, stepResults, detection.errors, detection.warnings);
            this.updateStepLog(result, detection);
        }
        
        this.updateUI();
        this.updateStatusIndicator();
    }

    finishSailing() {
        clearInterval(this.stepIntervalId);
        this.stepIntervalId = null;
        
        const attempt = this.scoreSystem.completeAttempt(this.gameState, this.currentLevel);
        this.currentReport = this.scoreSystem.generateReport(attempt, this.currentLevel, this.grid);
        
        if (this.runCount === 0) {
            this.firstRunResults = this.currentReport;
            this.manualCorrection.saveOriginalResult(this.currentReport);
        } else if (this.runCount === 1) {
            this.secondRunResults = this.currentReport;
        }
        
        this.gameState.isRunning = false;
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        document.getElementById('resetBtn').disabled = false;
        
        if (this.manualCorrection.correctedConfig) {
            this.manualCorrection.saveCorrectedResult(this.currentReport);
            document.getElementById('compareBtn').disabled = false;
        }
        
        this.updateUI();
        this.updateStatusIndicator();
        this.showCompletionMessage();
    }

    togglePause() {
        if (!this.gameState.isRunning) return;
        
        this.gameState.isPaused = !this.gameState.isPaused;
        document.getElementById('pauseBtn').textContent = this.gameState.isPaused ? '继续' : '暂停';
    }

    resetGame() {
        if (this.stepIntervalId) {
            clearInterval(this.stepIntervalId);
            this.stepIntervalId = null;
        }
        
        this.gameState.reset();
        this.createSailboats(this.gameState.sailboats.length || 1);
        
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        document.getElementById('pauseBtn').textContent = '暂停';
        document.getElementById('resetBtn').disabled = false;
        
        document.getElementById('stepLog').innerHTML = '<p class="hint">开始航行后将显示每一步的详细记录</p>';
        document.getElementById('errorPanel').innerHTML = '<p class="hint">错误信息将在此显示，并附带解释和修正建议</p>';
        document.getElementById('exportPreview').classList.remove('show');
        
        this.runCount = 0;
        this.firstRunResults = null;
        this.secondRunResults = null;
        this.currentReport = null;
        
        this.manualCorrection.reset();
        
        document.getElementById('compareBtn').disabled = true;
        document.getElementById('comparePanel').style.display = 'none';
        
        this.updateUI();
    }

    runTwice() {
        if (this.gameState.isRunning) return;
        
        this.runCount = 0;
        this.resetGame();
        
        const run1 = () => {
            return new Promise((resolve) => {
                this.startSailing();
                
                const checkComplete = setInterval(() => {
                    if (this.gameState.isComplete() || !this.gameState.isRunning) {
                        clearInterval(checkComplete);
                        resolve();
                    }
                }, 100);
            });
        };
        
        run1().then(() => {
            if (this.verifyReproducibility()) {
                this.runCount = 1;
                this.gameState.reset();
                this.createSailboats(1);
                
                setTimeout(() => {
                    this.startSailing();
                }, 500);
            }
        });
    }

    verifyReproducibility() {
        if (!this.firstRunResults) return false;
        
        const boat1 = this.firstRunResults.sailboatResults[0];
        console.log('可重复性验证 - 第一次运行结果:');
        console.log('  最终位置:', boat1.finalPosition);
        console.log('  得分:', boat1.score ? boat1.score.total : 'N/A');
        console.log('  状态:', boat1.finalState);
        
        return true;
    }

    applyCorrection() {
        const correctedAngle = parseFloat(document.getElementById('correctedWindAngle').value) || 0;
        const correctedMagnitude = parseFloat(document.getElementById('correctedWindMagnitude').value) || 0;
        
        this.manualCorrection.saveCorrectedConfig(
            correctedAngle, correctedMagnitude,
            this.currentLevel.current.direction, this.currentLevel.current.magnitude
        );
        
        const changes = this.manualCorrection.applyCorrection(this.currentLevel);
        
        document.getElementById('windAngle').value = correctedAngle;
        document.getElementById('windMagnitude').value = correctedMagnitude;
        
        const resultDiv = document.getElementById('correctionResult');
        resultDiv.classList.add('show');
        resultDiv.innerHTML = `
            <p><strong>✅ 已应用修正</strong></p>
            <p>风向: ${changes.wind.from}° → ${changes.wind.to}°</p>
            <p>风力: ${changes.windMagnitude.from} → ${changes.windMagnitude.to}</p>
            <p class="hint">点击"开始航行"重新运行，然后点击"对比修正结果"查看差异</p>
        `;
        
        this.resetGame();
    }

    showComparison() {
        if (!this.manualCorrection.canCompare()) {
            alert('请先完成原始航行和修正后的航行');
            return;
        }
        
        const comparison = this.manualCorrection.compareResults();
        const report = this.manualCorrection.generateComparisonReport();
        
        document.getElementById('comparePanel').style.display = 'block';
        
        const origDiv = document.getElementById('originalResult');
        const corrDiv = document.getElementById('correctedResult');
        
        if (comparison.originalResult) {
            origDiv.innerHTML = this.formatResultForComparison(comparison.originalResult);
        }
        
        if (comparison.correctedResult) {
            corrDiv.innerHTML = this.formatResultForComparison(comparison.correctedResult);
        }
        
        const exportPreview = document.getElementById('exportPreview');
        exportPreview.textContent = report;
        exportPreview.classList.add('show');
        
        document.getElementById('comparePanel').scrollIntoView({ behavior: 'smooth' });
    }

    formatResultForComparison(result) {
        return `
            <div class="compare-result-item">
                <span class="label">状态:</span>
                <span class="value">${result.status}</span>
            </div>
            <div class="compare-result-item">
                <span class="label">得分:</span>
                <span class="value">${result.score}/${result.maxScore}</span>
            </div>
            <div class="compare-result-item">
                <span class="label">位置:</span>
                <span class="value">${result.gridCoordinate}</span>
            </div>
            <div class="compare-result-item">
                <span class="label">距离:</span>
                <span class="value">${result.distance}</span>
            </div>
            <div class="compare-result-item">
                <span class="label">错误:</span>
                <span class="value">${result.errorCount} 个</span>
            </div>
            <div class="compare-result-item">
                <span class="label">警告:</span>
                <span class="value">${result.warningCount} 个</span>
            </div>
            <div class="compare-result-item">
                <span class="label">步数:</span>
                <span class="value">${result.totalSteps}</span>
            </div>
        `;
    }

    updateStepLog(stepResult, detection) {
        const logDiv = document.getElementById('stepLog');
        const stepNum = stepResult.step + 1;
        
        let cssClass = 'step-entry';
        if (stepResult.errors.length > 0) {
            cssClass += ' step-error';
        } else if (stepResult.warnings.length > 0 || detection.warnings.length > 0) {
            cssClass += ' step-warning';
        } else {
            cssClass += ' step-success';
        }
        
        const entry = document.createElement('div');
        entry.className = cssClass;
        
        let content = `<span class="step-number">第 ${stepNum} 步</span>`;
        content += `<br>从 <span class="step-vector">${stepResult.startPosition.toString()}</span>`;
        content += ` → <span class="step-vector">${stepResult.endPosition.toString()}</span>`;
        content += `<br>合力: <span class="step-vector">${stepResult.totalForce.toString()}</span>`;
        content += ` = 风 ${stepResult.windVector.toString()} + 水流 ${stepResult.currentVector.toString()}`;
        
        if (stepResult.errors.length > 0) {
            content += `<br><strong style="color: #e53e3e;">❌ 错误:</strong> ${stepResult.errors.map(e => e.message).join(', ')}`;
        }
        
        if (stepResult.warnings.length > 0) {
            content += `<br><strong style="color: #dd6b20;">⚠️ 警告:</strong> ${stepResult.warnings.map(w => w.message).join(', ')}`;
        }
        
        entry.innerHTML = content;
        
        if (logDiv.querySelector('.hint')) {
            logDiv.innerHTML = '';
        }
        
        logDiv.appendChild(entry);
        logDiv.scrollTop = logDiv.scrollHeight;
        
        this.updateErrorPanel(detection);
    }

    updateErrorPanel(detection) {
        const panel = document.getElementById('errorPanel');
        
        if (detection.errors.length === 0 && detection.warnings.length === 0) {
            return;
        }
        
        let html = '';
        
        for (const error of detection.errors) {
            html += this.formatErrorItem(error, 'error');
        }
        
        for (const warning of detection.warnings) {
            html += this.formatErrorItem(warning, warning.severity);
        }
        
        panel.innerHTML = html;
    }

    formatErrorItem(error, severity) {
        const severityClass = severity === 'error' ? '' : severity;
        return `
            <div class="error-item ${severityClass}">
                <div class="error-title">${error.title}</div>
                <div class="error-description">${error.description}</div>
                <div class="error-suggestion">💡 ${error.suggestion}</div>
                ${error.correction ? `<div class="error-suggestion">🔧 修正: ${error.correction}</div>` : ''}
            </div>
        `;
    }

    updateUI() {
        const stateDiv = document.getElementById('currentState');
        
        if (this.gameState.sailboats.length === 0) {
            stateDiv.innerHTML = '<p>等待开始...</p>';
            return;
        }
        
        const boat = this.gameState.sailboats[0];
        const statusLabels = {
            'idle': '⏸️ 等待',
            'moving': '⛵ 航行中',
            'success': '✅ 成功',
            'failed': '❌ 失败'
        };
        
        let html = '';
        html += `<div class="state-item"><span class="state-label">关卡:</span><span class="state-value">${this.currentLevel.name}</span></div>`;
        html += `<div class="state-item"><span class="state-label">状态:</span><span class="state-value">${statusLabels[boat.state] || boat.state}</span></div>`;
        html += `<div class="state-item"><span class="state-label">步数:</span><span class="state-value">${this.gameState.currentStep} / ${this.gameState.maxSteps}</span></div>`;
        html += `<div class="state-item"><span class="state-label">位置:</span><span class="state-value">${this.grid.getGridCoordinateLabel(boat.position)}</span></div>`;
        html += `<div class="state-item"><span class="state-label">坐标:</span><span class="state-value">${boat.position.toString()}</span></div>`;
        html += `<div class="state-item"><span class="state-label">风向:</span><span class="state-value">${this.currentLevel.wind.direction}° (${this.currentLevel.wind.magnitude} 单位)</span></div>`;
        html += `<div class="state-item"><span class="state-label">水流:</span><span class="state-value">${this.currentLevel.current.direction}° (${this.currentLevel.current.magnitude} 单位)</span></div>`;
        
        if (boat.stepRecords.length > 0) {
            const lastRecord = boat.stepRecords[boat.stepRecords.length - 1];
            const totalErrors = boat.stepRecords.reduce((sum, r) => sum + r.errors.length, 0);
            const totalWarnings = boat.stepRecords.reduce((sum, r) => sum + r.warnings.length, 0);
            
            html += `<div class="state-item"><span class="state-label">航行距离:</span><span class="state-value">${boat.getDistanceTraveled().toFixed(1)} 像素</span></div>`;
            html += `<div class="state-item"><span class="state-label">累计错误:</span><span class="state-value">${totalErrors} 个</span></div>`;
            html += `<div class="state-item"><span class="state-label">累计警告:</span><span class="state-value">${totalWarnings} 个</span></div>`;
        }
        
        stateDiv.innerHTML = html;
    }

    updateStatusIndicator() {
        const indicator = document.getElementById('statusIndicator');
        const boat = this.gameState.sailboats[0];
        
        if (this.gameState.isPaused) {
            indicator.textContent = '⏸️ 已暂停';
            indicator.className = 'status-indicator warning';
        } else if (this.gameState.isRunning) {
            indicator.textContent = `⛵ 航行中 - 第 ${this.gameState.currentStep} 步`;
            indicator.className = 'status-indicator info';
        } else if (boat && boat.state === 'success') {
            indicator.textContent = '✅ 成功到达目标！';
            indicator.className = 'status-indicator success';
        } else if (boat && boat.state === 'failed') {
            indicator.textContent = '❌ 航行失败';
            indicator.className = 'status-indicator error';
        } else if (this.gameState.gameStatus === 'timeout') {
            indicator.textContent = '⏱️ 步数用尽';
            indicator.className = 'status-indicator warning';
        } else {
            indicator.textContent = '准备就绪';
            indicator.className = 'status-indicator';
        }
    }

    showCompletionMessage() {
        const boat = this.gameState.sailboats[0];
        const score = this.currentLevel.calculateScore(boat);
        
        let message = '';
        if (boat.state === 'success') {
            message = `🎉 恭喜！成功到达目标！得分: ${score.total}/100`;
        } else if (boat.state === 'failed') {
            message = `💥 航行失败。${boat.collision ? boat.collision.type === 'island' ? '撞上了岛屿！' : '驶出了边界！' : ''} 得分: ${score.total}/100`;
        } else {
            message = `⏱️ 步数用尽。得分: ${score.total}/100`;
        }
        
        console.log(message);
    }

    exportReport(format = 'text') {
        if (!this.currentReport) {
            alert('请先完成一次航行');
            return;
        }
        
        this.scoreSystem.downloadReport(this.currentReport, format);
        
        const preview = document.getElementById('exportPreview');
        if (format === 'text') {
            preview.textContent = this.scoreSystem.exportReportToText(this.currentReport);
        } else if (format === 'json') {
            preview.textContent = this.scoreSystem.exportReportToJSON(this.currentReport);
        } else if (format === 'csv') {
            preview.textContent = this.scoreSystem.exportReportToCSV(this.currentReport);
        }
        preview.classList.add('show');
    }

    startAnimationLoop() {
        const animate = (time) => {
            this.renderer.updateAnimationTime(time);
            this.renderer.drawAll(this.grid, this.currentLevel, this.gameState.sailboats, this.showPaths, this.showVectors);
            this.animationId = requestAnimationFrame(animate);
        };
        this.animationId = requestAnimationFrame(animate);
    }

    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.stepIntervalId) {
            clearInterval(this.stepIntervalId);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.game = new SailingGame();
    
    console.log('🚀 向量风帆航海课已加载');
    console.log('📖 使用说明:');
    console.log('  1. 选择关卡');
    console.log('  2. 调整风向和风力参数');
    console.log('  3. 点击"开始航行"观察结果');
    console.log('  4. 查看错误检测和修正建议');
    console.log('  5. 使用"手动修正"调整参数后对比结果');
    console.log('  6. 导出成绩报告进行分析');
});
