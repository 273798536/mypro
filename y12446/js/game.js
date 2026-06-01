class Game {
    constructor() {
        this.acousticModel = new AcousticModel();
        this.problemDetector = new ProblemDetector(this.acousticModel);
        this.replaySystem = new ReplaySystem();
        
        this.currentLevelIndex = 0;
        this.currentLevel = null;
        this.sources = [];
        this.mics = [];
        this.obstacles = [];
        this.settings = {};
        this.problems = [];
        this.coverage = null;
        this.score = 0;
        this.timeRemaining = 0;
        this.timerInterval = null;
        this.isPlaying = false;
        this.selectedMic = null;
        this.dragging = false;
        this.lastReport = null;
    }

    init() {
        this.loadLevel(0);
        this.setupEventListeners();
        this.updateUI();
    }

    loadLevel(levelIndex) {
        if (levelIndex >= LEVELS.length) {
            this.showGameComplete();
            return;
        }

        this.currentLevelIndex = levelIndex;
        this.currentLevel = LEVELS[levelIndex];
        
        this.sources = JSON.parse(JSON.stringify(this.currentLevel.sources));
        this.mics = JSON.parse(JSON.stringify(this.currentLevel.initialMics));
        this.obstacles = JSON.parse(JSON.stringify(this.currentLevel.obstacles));
        this.settings = JSON.parse(JSON.stringify(this.currentLevel.initialSettings));
        this.problems = [];
        this.coverage = null;
        this.timeRemaining = this.currentLevel.timeLimit;
        this.score = 0;
        this.selectedMic = null;

        this.replaySystem.startSession(this.currentLevel.id, this.currentLevel.name);
        this.replaySystem.recordInitialState({
            settings: this.settings,
            mics: this.mics,
            sources: this.sources,
            obstacles: this.obstacles
        });

        this.detectProblems('关卡加载');
        this.calculateCoverage();
        this.startTimer();
        this.isPlaying = true;

        this.updateUI();
        this.renderStage();
    }

    startTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        this.timerInterval = setInterval(() => {
            this.timeRemaining--;
            this.updateTimerDisplay();
            
            if (this.timeRemaining <= 0) {
                this.timeUp();
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    updateTimerDisplay() {
        const timeInfo = document.getElementById('time-info');
        if (timeInfo) {
            const mins = Math.floor(this.timeRemaining / 60);
            const secs = this.timeRemaining % 60;
            timeInfo.textContent = `时间: ${mins}:${secs.toString().padStart(2, '0')}`;
        }
    }

    timeUp() {
        this.stopTimer();
        this.isPlaying = false;
        this.checkResults(true);
    }

    detectProblems(action = '') {
        this.problems = this.problemDetector.detectAllProblems(
            this.sources,
            this.mics,
            this.obstacles,
            this.settings,
            this.currentLevel.problems
        );

        this.replaySystem.recordSnapshot(
            { settings: this.settings, mics: this.mics, coverage: this.coverage },
            this.problems,
            action
        );

        return this.problems;
    }

    updateProblems() {
        for (const problem of this.problems) {
            const wasResolved = problem.resolved;
            this.problemDetector.updateProblemValues(
                problem,
                this.sources,
                this.mics,
                this.obstacles,
                this.settings
            );
            
            if (wasResolved !== problem.resolved) {
                this.replaySystem.recordProblemChange(problem, problem.resolved);
            }
        }
    }

    calculateCoverage() {
        this.coverage = this.acousticModel.calculateCoverage(
            this.sources,
            this.mics,
            this.obstacles,
            this.settings
        );
        return this.coverage;
    }

    checkResults(timeUp = false) {
        this.stopTimer();
        this.isPlaying = false;

        this.calculateCoverage();
        this.updateProblems();

        const unresolvedCritical = this.problems.filter(p => !p.resolved && !p.isWarning);
        const coverageMet = this.coverage.percentage >= this.currentLevel.targetCoverage;

        const finalState = {
            settings: this.settings,
            mics: this.mics,
            sources: this.sources,
            obstacles: this.obstacles,
            coverage: this.coverage
        };

        const session = this.replaySystem.endSession(finalState, 0, false);
        const score = this.replaySystem.calculateScore(session, this.currentLevel);
        const passed = score.total >= 60 && unresolvedCritical.length === 0;

        session.score = score;
        session.passed = passed;

        this.score = score.total;
        this.lastReport = this.replaySystem.generateReplayReport(session, this.currentLevel, score);

        if (passed) {
            this.showSuccess(score);
        } else {
            this.showFail(score, unresolvedCritical, coverageMet, timeUp);
        }

        return { passed, score };
    }

    showSuccess(score) {
        const modal = document.getElementById('success-modal');
        const info = document.getElementById('success-info');
        
        info.innerHTML = `
            <div class="score-breakdown">
                ${score.breakdown.map(item => `
                    <div class="score-item ${item.name === '总分' ? 'total' : ''}">
                        <span>${item.name}</span>
                        <span>${item.score}/${item.max}</span>
                    </div>
                `).join('')}
            </div>
            <div style="margin-top: 15px;">
                <div>声场覆盖: ${this.coverage.percentage.toFixed(1)}% / 目标 ${this.currentLevel.targetCoverage}%</div>
                <div class="coverage-bar">
                    <div class="coverage-fill" style="width: ${Math.min(100, this.coverage.percentage)}%"></div>
                </div>
            </div>
        `;

        modal.classList.remove('hidden');
    }

    showFail(score, unresolvedCritical, coverageMet, timeUp) {
        const modal = document.getElementById('fail-modal');
        const reason = document.getElementById('fail-reason');
        
        let reasons = [];
        if (timeUp) {
            reasons.push('时间已耗尽');
        }
        if (unresolvedCritical.length > 0) {
            reasons.push(`还有 ${unresolvedCritical.length} 个问题未解决：`);
            for (const p of unresolvedCritical) {
                reasons.push(`- ${p.title}: ${p.description}`);
            }
        }
        if (!coverageMet) {
            reasons.push(`声场覆盖率不足 (${this.coverage.percentage.toFixed(1)}% / ${this.currentLevel.targetCoverage}%)`);
        }

        reason.innerHTML = `
            <div>${reasons.join('<br>')}</div>
            <div style="margin-top: 15px;">
                <div style="font-weight: bold; margin-bottom: 10px;">得分详情:</div>
                <div class="score-breakdown">
                    ${score.breakdown.map(item => `
                        <div class="score-item ${item.name === '总分' ? 'total' : ''}">
                            <span>${item.name}</span>
                            <span>${item.score}/${item.max}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        modal.classList.remove('hidden');
    }

    showGameComplete() {
        alert('恭喜你完成了所有关卡！');
    }

    showReplay() {
        if (!this.lastReport) {
            if (this.replaySystem.currentSession) {
                const session = this.replaySystem.currentSession;
                const finalState = {
                    settings: this.settings,
                    mics: this.mics,
                    coverage: this.coverage
                };
                const score = this.replaySystem.calculateScore(session, this.currentLevel);
                this.lastReport = this.replaySystem.generateReplayReport(session, this.currentLevel, score);
            } else {
                alert('没有可用的复盘数据');
                return;
            }
        }

        const modal = document.getElementById('replay-modal');
        const content = document.getElementById('replay-content');

        content.innerHTML = this.generateReplayHTML(this.lastReport);
        modal.classList.remove('hidden');
    }

    generateReplayHTML(report) {
        const problemNames = {
            howling: '啸叫',
            reverb: '混响过长',
            occlusion: '座位遮挡',
            warning: '提示警告'
        };

        let html = `
            <div class="replay-section">
                <h3>基本信息</h3>
                <table class="replay-table">
                    <tr><th>关卡</th><td>${report.level}</td></tr>
                    <tr><th>时长</th><td>${report.duration}</td></tr>
                    <tr><th>结果</th><td style="color: ${report.passed ? '#00cc88' : '#ff4444'}">${report.passed ? '通过' : '未通过'}</td></tr>
                </table>
            </div>

            <div class="replay-section">
                <h3>得分明细</h3>
                <div class="score-breakdown">
                    ${report.score.breakdown.map(item => `
                        <div class="score-item ${item.name === '总分' ? 'total' : ''}">
                            <span>${item.name}</span>
                            <span>${item.score}/${item.max}</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="replay-section">
                <h3>覆盖评分</h3>
                <div>目标覆盖率: ${report.targetCoverage}%</div>
                <div>最终覆盖率: ${report.finalCoverage.toFixed(1)}%</div>
                <div class="coverage-bar">
                    <div class="coverage-fill" style="width: ${Math.min(100, report.finalCoverage)}%"></div>
                </div>
                <div style="margin-top: 8px; font-size: 12px; color: #aaa;">
                    达标: ${report.finalCoverage >= report.targetCoverage ? '是' : '否'}
                </div>
            </div>

            <div class="replay-section">
                <h3>问题汇总</h3>
                ${Object.entries(report.problemSummary).filter(([, data]) => data.total > 0).map(([type, data]) => `
                    <div style="margin: 5px 0;">
                        ${problemNames[type]}: 
                        <span class="value-compare">
                            <span style="color: #66ff66;">${data.resolved}</span>/<span>${data.total}</span> 已解决
                        </span>
                    </div>
                `).join('') || '<div style="color: #888;">无检测到问题</div>'}
            </div>

            <div class="replay-section">
                <h3>参数对比（原始值 → 当前值）</h3>
                <table class="replay-table">
                    <tr><th>参数</th><th>原始值</th><th>当前值</th></tr>
                    ${report.valueComparisons.settings.map(comp => `
                        <tr>
                            <td>${comp.name}${comp.changed ? ' *' : ''}</td>
                            <td class="original">${comp.original}</td>
                            <td class="current">${comp.current}</td>
                        </tr>
                    `).join('')}
                </table>
                ${report.valueComparisons.micChanges.length > 0 ? `
                    <div style="margin-top: 10px; font-size: 12px; color: #00d9ff;">麦克风位置/增益变化:</div>
                    ${report.valueComparisons.micChanges.map(mic => `
                        <div style="margin: 5px 0; padding: 8px; background: #1a1a2e; border-radius: 4px; font-size: 12px;">
                            <div><strong>${mic.name}:</strong></div>
                            <div>位置: <span class="original">(${mic.original.x}, ${mic.original.y})</span> → <span class="current">(${mic.current.x}, ${mic.current.y})</span></div>
                            <div>增益: <span class="original">${mic.original.gain}</span> → <span class="current">${mic.current.gain}</span></div>
                        </div>
                    `).join('')}
                ` : ''}
                ${report.valueComparisons.addedMics.length > 0 ? `
                    <div style="margin-top: 8px; font-size: 12px; color: #00cc88;">
                        新增麦克风: ${report.valueComparisons.addedMics.join(', ')}
                    </div>
                ` : ''}
                ${report.valueComparisons.removedMics.length > 0 ? `
                    <div style="margin-top: 8px; font-size: 12px; color: #ff4444;">
                        移除麦克风: ${report.valueComparisons.removedMics.join(', ')}
                    </div>
                ` : ''}
            </div>
        `;

        if (report.feedbackAnalysis.length > 0) {
            html += `
                <div class="replay-section">
                    <h3>反馈灯口径影响分析</h3>
                    ${report.feedbackAnalysis.map(impact => `
                        <div style="margin: 8px 0; padding: 8px; background: #1a1a2e; border-radius: 4px;">
                            <div>
                                <span class="original-value">${impact.oldAperture}</span>
                                →
                                <span class="current-value">${impact.newAperture}</span>
                            </div>
                            <div style="font-size: 12px; margin-top: 4px;">
                                啸叫问题变化: 
                                <span class="${impact.improved ? 'impact-positive' : 'impact-negative'}">
                                    ${impact.howlingProblemsChange > 0 ? '+' : ''}${impact.howlingProblemsChange}
                                </span>
                            </div>
                            ${impact.coverageChange !== null ? `
                                <div style="font-size: 12px;">
                                    覆盖率变化: 
                                    <span class="${parseFloat(impact.coverageChange) > 0 ? 'impact-positive' : 'impact-negative'}">
                                        ${parseFloat(impact.coverageChange) > 0 ? '+' : ''}${impact.coverageChange}%
                                    </span>
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
        }

        html += `
            <div class="replay-section">
                <h3>事件时间线</h3>
                ${report.timeline.map(event => `
                    <div style="margin: 6px 0; padding: 6px; background: #1a1a2e; border-radius: 4px; font-size: 12px;">
                        <span style="color: #00d9ff; margin-right: 10px;">[${event.time}]</span>
                        <span>${event.description}</span>
                        ${event.originalValues && event.currentValues ? `
                            <div style="margin-top: 4px; padding-left: 20px; font-size: 11px; color: #888;">
                                <div>原始值: ${JSON.stringify(event.originalValues)}</div>
                                <div>当前值: ${JSON.stringify(event.currentValues)}</div>
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `;

        return html;
    }

    exportReport() {
        if (this.lastReport) {
            this.replaySystem.downloadReport(this.lastReport);
        }
    }

    addMic() {
        const newId = `m${Date.now()}`;
        const micNum = this.mics.length + 1;
        const newMic = {
            id: newId,
            name: `麦克风${micNum}`,
            x: 400,
            y: 300,
            angle: 180,
            gain: 60
        };
        this.mics.push(newMic);
        this.detectProblems(`添加麦克风: ${newMic.name}`);
        this.calculateCoverage();
        this.updateUI();
        this.renderStage();
    }

    removeMic(micId) {
        const mic = this.mics.find(m => m.id === micId);
        if (mic) {
            this.mics = this.mics.filter(m => m.id !== micId);
            if (this.selectedMic === micId) {
                this.selectedMic = null;
            }
            this.detectProblems(`移除麦克风: ${mic.name}`);
            this.calculateCoverage();
            this.updateUI();
            this.renderStage();
        }
    }

    updateMicGain(micId, gain) {
        const mic = this.mics.find(m => m.id === micId);
        if (mic) {
            const oldGain = mic.gain;
            mic.gain = parseInt(gain);
            this.detectProblems(`调整 ${mic.name} 增益: ${oldGain} → ${mic.gain}`);
            this.updateProblems();
            this.calculateCoverage();
            this.updateUI();
            this.renderStage();
        }
    }

    updateMicPosition(micId, x, y) {
        const mic = this.mics.find(m => m.id === micId);
        if (mic) {
            const oldX = mic.x;
            const oldY = mic.y;
            mic.x = Math.max(20, Math.min(780, x));
            mic.y = Math.max(20, Math.min(480, y));
            this.detectProblems(`移动 ${mic.name}: (${oldX}, ${oldY}) → (${mic.x}, ${mic.y})`);
            this.updateProblems();
            this.calculateCoverage();
        }
    }

    updateSetting(key, value) {
        const oldValue = this.settings[key];
        this.settings[key] = parseInt(value);
        
        let action = '';
        const settingNames = {
            volume: '主音量',
            reverb: '混响',
            delay: '延迟',
            eqHigh: '高频均衡',
            eqLow: '低频均衡',
            feedbackAperture: '反馈灯口径'
        };
        
        if (oldValue !== this.settings[key]) {
            action = `调整 ${settingNames[key]}: ${oldValue} → ${this.settings[key]}`;
            this.detectProblems(action);
            this.updateProblems();
            this.calculateCoverage();
        }
        
        this.updateUI();
        this.renderStage();
    }

    getApertureImpact() {
        return this.acousticModel.analyzeApertureImpact(
            this.settings.feedbackAperture,
            this.sources,
            this.mics,
            this.settings
        );
    }

    retryLevel() {
        this.loadLevel(this.currentLevelIndex);
    }

    nextLevel() {
        this.loadLevel(this.currentLevelIndex + 1);
    }

    closeModals() {
        document.getElementById('replay-modal').classList.add('hidden');
        document.getElementById('fail-modal').classList.add('hidden');
        document.getElementById('success-modal').classList.add('hidden');
    }

    setupEventListeners() {
        document.getElementById('check-btn').addEventListener('click', () => {
            if (this.isPlaying) {
                this.checkResults(false);
            }
        });

        document.getElementById('replay-btn').addEventListener('click', () => {
            this.showReplay();
        });

        document.getElementById('next-level-btn').addEventListener('click', () => {
            if (confirm('确定跳过当前关卡吗？')) {
                this.nextLevel();
            }
        });

        document.getElementById('add-mic-btn').addEventListener('click', () => {
            if (this.isPlaying) {
                this.addMic();
            }
        });

        const sliders = ['volume', 'reverb', 'delay', 'eq-high', 'eq-low', 'feedback-aperture'];
        for (const slider of sliders) {
            const element = document.getElementById(`${slider}-slider`);
            const valueElement = document.getElementById(`${slider.replace('-', '')}-value`);
            
            if (element && valueElement) {
                element.addEventListener('input', (e) => {
                    valueElement.textContent = e.target.value;
                    const settingKey = slider.replace('-', '');
                    this.updateSetting(settingKey, e.target.value);
                });
            }
        }

        document.getElementById('close-replay-btn').addEventListener('click', () => {
            document.getElementById('replay-modal').classList.add('hidden');
        });

        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportReport();
        });

        document.getElementById('retry-btn').addEventListener('click', () => {
            this.closeModals();
            this.retryLevel();
        });

        document.getElementById('view-replay-btn').addEventListener('click', () => {
            this.closeModals();
            this.showReplay();
        });

        document.getElementById('next-btn').addEventListener('click', () => {
            this.closeModals();
            this.nextLevel();
        });

        document.getElementById('view-success-replay-btn').addEventListener('click', () => {
            this.closeModals();
            this.showReplay();
        });

        this.setupCanvasEvents();
    }

    setupCanvasEvents() {
        const canvas = document.getElementById('stage-canvas');
        
        canvas.addEventListener('mousedown', (e) => {
            if (!this.isPlaying) return;
            
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;

            for (const mic of this.mics) {
                const dist = this.acousticModel.calculateDistance({ x, y }, mic);
                if (dist < 20) {
                    this.selectedMic = mic.id;
                    this.dragging = true;
                    this.updateUI();
                    this.renderStage();
                    return;
                }
            }

            this.selectedMic = null;
            this.updateUI();
            this.renderStage();
        });

        canvas.addEventListener('mousemove', (e) => {
            if (!this.isPlaying || !this.dragging || !this.selectedMic) return;

            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;

            this.updateMicPosition(this.selectedMic, x, y);
            this.renderStage();
        });

        canvas.addEventListener('mouseup', () => {
            if (this.dragging && this.selectedMic) {
                this.dragging = false;
                this.updateUI();
            }
        });

        canvas.addEventListener('mouseleave', () => {
            this.dragging = false;
        });
    }

    updateUI() {
        document.getElementById('level-info').textContent = `关卡 ${this.currentLevelIndex + 1}/${LEVELS.length}: ${this.currentLevel.name}`;
        document.getElementById('score-info').textContent = `得分: ${this.score}`;
        this.updateTimerDisplay();

        this.updateSourceList();
        this.updateMicList();
        this.updateProblemList();
        this.updateFeedbackEffect();
    }

    updateSourceList() {
        const list = document.getElementById('source-list');
        list.innerHTML = this.sources.map(source => `
            <div class="source-item" data-id="${source.id}">
                <span>${source.name}</span>
                <span style="font-size: 12px; color: #888;">音量: ${source.volume}</span>
            </div>
        `).join('');
    }

    updateMicList() {
        const list = document.getElementById('mic-list');
        list.innerHTML = this.mics.map(mic => {
            const hasProblem = this.problems.some(p => 
                p.mic && p.mic.id === mic.id && !p.resolved && !p.isWarning
            );
            const hasWarning = this.problems.some(p => 
                p.mic && p.mic.id === mic.id && p.isWarning && !p.resolved
            );
            const statusClass = hasProblem ? 'error' : hasWarning ? 'warning' : '';
            const selectedClass = this.selectedMic === mic.id ? 'active' : '';

            return `
                <div class="mic-item ${statusClass} ${selectedClass}" data-id="${mic.id}">
                    <div style="flex: 1;">
                        <div>${mic.name}</div>
                        <div style="font-size: 11px; color: #888;">
                            增益: <input type="range" class="mic-gain-slider" data-id="${mic.id}" 
                                min="0" max="100" value="${mic.gain}" style="width: 80px;">
                            <span class="mic-gain-value" data-id="${mic.id}">${mic.gain}</span>
                        </div>
                    </div>
                    <button class="remove-btn" data-id="${mic.id}">删除</button>
                </div>
            `;
        }).join('');

        list.querySelectorAll('.mic-gain-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const micId = e.target.dataset.id;
                const valueSpan = list.querySelector(`.mic-gain-value[data-id="${micId}"]`);
                if (valueSpan) valueSpan.textContent = e.target.value;
                this.updateMicGain(micId, e.target.value);
            });
        });

        list.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const micId = btn.dataset.id;
                if (confirm('确定删除这个麦克风吗？')) {
                    this.removeMic(micId);
                }
            });
        });
    }

    updateProblemList() {
        const list = document.getElementById('problem-list');
        
        const suggestions = this.problemDetector.getOperationalSuggestions(this.problems);
        let suggestionHTML = '';
        
        if (suggestions.length > 0) {
            suggestionHTML = suggestions.map(s => `
                <div class="problem-tip">
                    <strong>${s.priority === 'critical' ? '⚠️ 紧急：' : '💡 '}${s.action}</strong>
                    ${s.steps ? `<br><span style="font-size: 11px; color: #ddd;">${s.steps.join('<br>')}</span>` : ''}
                </div>
            `).join('');
        }

        list.innerHTML = suggestionHTML + this.problems.map(problem => `
            <div class="problem-item ${problem.type} ${problem.resolved ? 'resolved' : ''}" data-id="${problem.id}">
                <div class="problem-title">${problem.title}${problem.isWarning ? ' (提示)' : ''}</div>
                <div class="problem-desc">${problem.description}</div>
                <div style="margin-top: 6px; font-size: 11px; color: #888;">
                    <strong>建议:</strong> ${problem.resolutionHint}
                </div>
                ${this.generateValueComparison(problem)}
            </div>
        `).join('');

        if (this.problems.length === 0 && suggestions.length === 0) {
            list.innerHTML = '<div style="color: #00cc88; text-align: center; padding: 20px;">✓ 声场状态良好</div>';
        }
    }

    generateValueComparison(problem) {
        if (!problem.originalValues || !problem.currentValues) return '';

        const keys = Object.keys(problem.originalValues);
        const comparisons = keys.filter(key => {
            const orig = problem.originalValues[key];
            const curr = problem.currentValues[key];
            return typeof orig === 'number' && typeof curr === 'number' && orig !== curr;
        });

        if (comparisons.length === 0) return '';

        const keyNames = {
            micGain: '麦克风增益',
            sourceVolume: '声源音量',
            eqHigh: '高频均衡',
            distance: '距离',
            reverb: '混响',
            delay: '延迟',
            reverbTime: '混响时间',
            micX: '麦克风X',
            micY: '麦克风Y',
            sourceX: '声源X',
            sourceY: '声源Y'
        };

        return `
            <div style="margin-top: 6px; padding: 6px; background: rgba(0,0,0,0.3); border-radius: 4px; font-size: 11px;">
                <div style="color: #00d9ff; margin-bottom: 3px;">参数追踪:</div>
                ${comparisons.map(key => {
                    const name = keyNames[key] || key;
                    const orig = problem.originalValues[key];
                    const curr = problem.currentValues[key];
                    return `
                        <div class="value-compare">
                            <span>${name}:</span>
                            <span class="original-value">${typeof orig === 'number' ? orig.toFixed(1) : orig}</span>
                            →
                            <span class="current-value">${typeof curr === 'number' ? curr.toFixed(1) : curr}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    updateFeedbackEffect() {
        const effectDiv = document.getElementById('feedback-effect');
        const impact = this.getApertureImpact();
        const aperture = this.settings.feedbackAperture;

        let html = `
            <div>当前口径: <span class="highlight">${aperture}</span></div>
            <div style="margin-top: 6px;">
                平均灵敏度: <span class="highlight">${impact.avgSensitivity.toFixed(0)}</span>
            </div>
            <div style="margin-top: 4px;">
                检测范围: <span class="highlight">${50 + aperture * 10}px</span>
            </div>
        `;

        if (impact.impacts.length > 0) {
            html += `<div class="feedback-impact" style="margin-top: 10px;">`;
            html += `<div style="font-weight: bold; margin-bottom: 6px;">声场影响分析:</div>`;
            
            for (const item of impact.impacts) {
                const changeClass = item.improved ? 'impact-positive' : 'impact-negative';
                const changeText = item.riskChange > 0 ? '+' : '';
                html += `
                    <div class="impact-item">
                        <span>${item.mic} ↔ ${item.source}</span>
                        <span class="${changeClass}">啸叫风险 ${changeText}${item.riskChange.toFixed(1)}</span>
                    </div>
                `;
            }
            
            html += `</div>`;
        }

        effectDiv.innerHTML = html;
    }

    renderStage() {
        const canvas = document.getElementById('stage-canvas');
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        this.drawAudienceArea(ctx);
        this.drawCoverageHeatmap(ctx);
        this.drawSoundPaths(ctx);
        this.drawObstacles(ctx);
        this.drawSources(ctx);
        this.drawMics(ctx);
        this.drawFeedbackRings(ctx);
    }

    drawAudienceArea(ctx) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.fillRect(0, 350, 800, 150);
        
        ctx.strokeStyle = 'rgba(0, 217, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(10, 360, 780, 130);
        ctx.setLineDash([]);
        
        ctx.fillStyle = 'rgba(0, 217, 255, 0.5)';
        ctx.font = '12px sans-serif';
        ctx.fillText('观众区域', 350, 375);
    }

    drawCoverageHeatmap(ctx) {
        if (!this.coverage || !this.coverage.coverageData) return;

        for (const data of this.coverage.coverageData) {
            const level = data.level;
            let alpha = 0;
            let color = '0, 204, 136';
            
            if (level > 0) {
                alpha = Math.min(0.4, level / 100);
            } else if (level > -10) {
                alpha = 0.1;
                color = '255, 204, 0';
            }
            
            if (alpha > 0) {
                ctx.fillStyle = `rgba(${color}, ${alpha})`;
                ctx.fillRect(data.point.x - 20, data.point.y - 20, 40, 40);
            }
        }
    }

    drawSoundPaths(ctx) {
        for (const source of this.sources) {
            for (const mic of this.mics) {
                const occlusion = this.acousticModel.checkOcclusion(source, mic, this.obstacles);
                
                ctx.beginPath();
                ctx.moveTo(source.x, source.y);
                ctx.lineTo(mic.x, mic.y);
                
                if (occlusion.blocked) {
                    ctx.strokeStyle = 'rgba(255, 68, 68, 0.3)';
                    ctx.setLineDash([5, 5]);
                } else {
                    const feedback = this.acousticModel.calculateFeedbackRisk(
                        mic, source, this.settings, this.settings.feedbackAperture
                    );
                    if (feedback.howlingLikely) {
                        ctx.strokeStyle = 'rgba(255, 68, 68, 0.6)';
                        ctx.lineWidth = 2;
                    } else if (feedback.level === 'medium') {
                        ctx.strokeStyle = 'rgba(255, 204, 0, 0.4)';
                        ctx.lineWidth = 1.5;
                    } else {
                        ctx.strokeStyle = 'rgba(0, 204, 136, 0.3)';
                        ctx.lineWidth = 1;
                    }
                    ctx.setLineDash([]);
                }
                
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.lineWidth = 1;
            }
        }
    }

    drawObstacles(ctx) {
        for (const obs of this.obstacles) {
            ctx.fillStyle = 'rgba(100, 100, 120, 0.8)';
            ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
            
            ctx.strokeStyle = 'rgba(150, 150, 170, 0.8)';
            ctx.lineWidth = 2;
            ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
            
            ctx.fillStyle = '#ddd';
            ctx.font = '11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(obs.name, obs.x + obs.width / 2, obs.y + obs.height / 2 + 4);
            ctx.textAlign = 'left';
        }
    }

    drawSources(ctx) {
        const colors = {
            vocal: '#ff6b6b',
            guitar: '#4ecdc4',
            drums: '#ffe66d',
            keyboard: '#95e1d3'
        };

        for (const source of this.sources) {
            const color = colors[source.type] || '#00d9ff';
            
            const gradient = ctx.createRadialGradient(
                source.x, source.y, 0,
                source.x, source.y, 30
            );
            gradient.addColorStop(0, color);
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(source.x, source.y, 30, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(source.x, source.y, 15, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(source.name, source.x, source.y + 30);
            ctx.font = '10px sans-serif';
            ctx.fillStyle = '#aaa';
            ctx.fillText(`${source.volume}dB`, source.x, source.y + 43);
            ctx.textAlign = 'left';
        }
    }

    drawMics(ctx) {
        for (const mic of this.mics) {
            const isSelected = this.selectedMic === mic.id;
            
            const hasHowling = this.problems.some(p => 
                p.type === 'howling' && p.mic && p.mic.id === mic.id && !p.resolved
            );
            const hasOcclusion = this.problems.some(p => 
                p.type === 'occlusion' && p.mic && p.mic.id === mic.id && !p.resolved
            );
            
            let micColor = '#00d9ff';
            if (hasHowling) micColor = '#ff4444';
            else if (hasOcclusion) micColor = '#9966ff';
            
            if (isSelected) {
                ctx.strokeStyle = '#ffcc00';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(mic.x, mic.y, 25, 0, Math.PI * 2);
                ctx.stroke();
            }
            
            ctx.fillStyle = micColor;
            ctx.beginPath();
            ctx.arc(mic.x, mic.y, 12, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(mic.x, mic.y, 5, 0, Math.PI * 2);
            ctx.fill();
            
            const angleRad = (mic.angle - 90) * Math.PI / 180;
            ctx.beginPath();
            ctx.moveTo(mic.x, mic.y);
            ctx.lineTo(
                mic.x + Math.cos(angleRad) * 20,
                mic.y + Math.sin(angleRad) * 20
            );
            ctx.strokeStyle = micColor;
            ctx.lineWidth = 3;
            ctx.stroke();
            
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(mic.name, mic.x, mic.y - 20);
            ctx.font = '9px sans-serif';
            ctx.fillStyle = '#aaa';
            ctx.fillText(`增益:${mic.gain}`, mic.x, mic.y - 8);
            ctx.textAlign = 'left';
        }
    }

    drawFeedbackRings(ctx) {
        const aperture = this.settings.feedbackAperture;
        const ringRadius = 50 + aperture * 10;
        const sensitivity = 10 + (10 - aperture) * 2;
        
        for (const mic of this.mics) {
            for (const source of this.sources) {
                const feedback = this.acousticModel.calculateFeedbackRisk(
                    mic, source, this.settings, aperture
                );
                
                if (feedback.risk > 30) {
                    ctx.beginPath();
                    ctx.arc(mic.x, mic.y, ringRadius, 0, Math.PI * 2);
                    ctx.strokeStyle = `rgba(255, 100, 100, ${feedback.risk / 200})`;
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    
                    if (feedback.howlingLikely) {
                        const time = Date.now() / 1000;
                        const pulseRadius = ringRadius + Math.sin(time * 4) * 5;
                        ctx.beginPath();
                        ctx.arc(mic.x, mic.y, pulseRadius, 0, Math.PI * 2);
                        ctx.strokeStyle = `rgba(255, 50, 50, ${0.3 + Math.sin(time * 4) * 0.2})`;
                        ctx.lineWidth = 3;
                        ctx.stroke();
                    }
                }
            }
        }
    }
}

const game = new Game();

document.addEventListener('DOMContentLoaded', () => {
    game.init();
});
