class MusicCopyrightCourtGame {
    constructor() {
        this.gameState = 'idle';
        this.score = 0;
        this.timer = 0;
        this.timerInterval = null;
        this.currentCaseIndex = 0;
        this.evidencePool = [];
        this.placedEvidence = {};
        this.reviewEvidence = { expired: [], exceeded: [], confusion: [] };
        this.gameHistory = [];
        this.currentCase = null;
        this.draggedElement = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadCases();
        this.updateUI();
    }

    bindEvents() {
        document.getElementById('btn-start').addEventListener('click', () => this.startGame());
        document.getElementById('btn-pause').addEventListener('click', () => this.togglePause());
        document.getElementById('btn-reset').addEventListener('click', () => this.resetGame());
        document.getElementById('btn-submit').addEventListener('click', () => this.submitCase());
        document.getElementById('btn-review').addEventListener('click', () => this.showReview());
        document.getElementById('btn-export').addEventListener('click', () => this.exportResults());
        document.getElementById('btn-help').addEventListener('click', () => this.showHelp());

        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                e.target.closest('.modal').classList.remove('show');
            });
        });

        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('show');
                }
            });
        });

        document.querySelectorAll('.slot, .review-slot').forEach(slot => {
            this.setupDropZone(slot);
        });

        document.querySelectorAll('.zone').forEach(zone => {
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                zone.classList.add('drag-over');
            });
            zone.addEventListener('dragleave', () => {
                zone.classList.remove('drag-over');
            });
            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                zone.classList.remove('drag-over');
            });
        });
    }

    setupDropZone(slot) {
        slot.addEventListener('dragover', (e) => {
            e.preventDefault();
            slot.classList.add('drag-over');
        });

        slot.addEventListener('dragleave', () => {
            slot.classList.remove('drag-over');
        });

        slot.addEventListener('drop', (e) => {
            e.preventDefault();
            slot.classList.remove('drag-over');
            
            if (this.draggedElement) {
                this.handleDrop(slot, this.draggedElement);
            }
        });
    }

    loadCases() {
        this.cases = [
            {
                id: 1,
                title: "《星空》采样侵权案",
                description: "独立音乐人小王在新专辑中使用了一段经典老歌的旋律片段，被原作者起诉。请整理相关证据。",
                evidences: [
                    {
                        id: 'e1-1',
                        type: 'audio',
                        title: '小王《星空》片段',
                        desc: '时长3:45，2:15-2:30出现疑似采样段落',
                        authType: 'sampling',
                        isExpired: false,
                        isExceeded: false,
                        isConfusion: false
                    },
                    {
                        id: 'e1-2',
                        type: 'contract',
                        title: '采样授权合同',
                        desc: '授权使用《旧日时光》8秒片段，有效期2023.01-2025.12',
                        authType: 'sampling',
                        isExpired: false,
                        isExceeded: false,
                        isConfusion: false
                    },
                    {
                        id: 'e1-3',
                        type: 'notice',
                        title: '音乐平台采样通知',
                        desc: '已按流程报备，采样比例符合平台规定',
                        authType: 'sampling',
                        isExpired: false,
                        isExceeded: false,
                        isConfusion: false
                    }
                ]
            },
            {
                id: 2,
                title: "《青春纪念册》改编纠纷案",
                description: "某选秀节目选手改编了一首经典歌曲并在节目中演唱，原作者认为未获得改编授权。",
                evidences: [
                    {
                        id: 'e2-1',
                        type: 'audio',
                        title: '选手改编版《青春纪念册》',
                        desc: '重新编曲，改变了节奏和风格，保留原曲主旋律',
                        authType: 'adaptation',
                        isExpired: false,
                        isExceeded: false,
                        isConfusion: false
                    },
                    {
                        id: 'e2-2',
                        type: 'contract',
                        title: '表演授权合同',
                        desc: '仅授权现场表演，未授权改编权',
                        authType: 'adaptation',
                        isExpired: false,
                        isExceeded: false,
                        isConfusion: false
                    },
                    {
                        id: 'e2-3',
                        type: 'notice',
                        title: '节目组通知函',
                        desc: '通知选手需确保改编作品已获完整授权',
                        authType: 'adaptation',
                        isExpired: false,
                        isExceeded: false,
                        isConfusion: false
                    }
                ]
            },
            {
                id: 3,
                title: "咖啡店公播授权案",
                description: "连锁咖啡店因播放背景音乐被音集协起诉，称其未获得公播授权。",
                evidences: [
                    {
                        id: 'e3-1',
                        type: 'audio',
                        title: '咖啡店背景音乐录像',
                        desc: '营业时间内循环播放流行音乐清单',
                        authType: 'public-broadcast',
                        isExpired: false,
                        isExceeded: false,
                        isConfusion: false
                    },
                    {
                        id: 'e3-2',
                        type: 'contract',
                        title: '公播授权协议',
                        desc: '已与音集协签订2024年度公播许可协议',
                        authType: 'public-broadcast',
                        isExpired: false,
                        isExceeded: false,
                        isConfusion: false
                    },
                    {
                        id: 'e3-3',
                        type: 'notice',
                        title: '缴费确认通知',
                        desc: '2024年度公播版权费已足额缴纳',
                        authType: 'public-broadcast',
                        isExpired: false,
                        isExceeded: false,
                        isConfusion: false
                    }
                ]
            },
            {
                id: 4,
                title: "授权过期特殊案",
                description: "某网络主播在2024年直播中使用了一首歌曲，但授权合同已于2023年底到期。",
                evidences: [
                    {
                        id: 'e4-1',
                        type: 'audio',
                        title: '直播录像片段',
                        desc: '2024年3月15日直播中播放《晚霞》完整版本',
                        authType: 'public-broadcast',
                        isExpired: true,
                        isExceeded: false,
                        isConfusion: false
                    },
                    {
                        id: 'e4-2',
                        type: 'contract',
                        title: '旧授权合同',
                        desc: '授权有效期：2022.01.01-2023.12.31，已过期',
                        authType: 'public-broadcast',
                        isExpired: true,
                        isExceeded: false,
                        isConfusion: false
                    },
                    {
                        id: 'e4-3',
                        type: 'notice',
                        title: '版权方提醒邮件',
                        desc: '2024年1月5日发函提醒授权已过期需续约',
                        authType: 'public-broadcast',
                        isExpired: true,
                        isExceeded: false,
                        isConfusion: false
                    }
                ]
            },
            {
                id: 5,
                title: "采样超限争议案",
                description: "说唱歌手在新曲中采样了某经典歌曲，但使用长度超过了授权合同约定。",
                evidences: [
                    {
                        id: 'e5-1',
                        type: 'audio',
                        title: '《街头诗人》完整曲目',
                        desc: '0:45-1:00使用了《爵士旋律》片段，时长15秒',
                        authType: 'sampling',
                        isExpired: false,
                        isExceeded: true,
                        isConfusion: false
                    },
                    {
                        id: 'e5-2',
                        type: 'contract',
                        title: '采样授权合同',
                        desc: '合同约定采样时长不得超过8秒',
                        authType: 'sampling',
                        isExpired: false,
                        isExceeded: true,
                        isConfusion: false
                    },
                    {
                        id: 'e5-3',
                        type: 'notice',
                        title: '法务对比报告',
                        desc: '专业鉴定实际采样时长约15秒，超出合同约定',
                        authType: 'sampling',
                        isExpired: false,
                        isExceeded: true,
                        isConfusion: false
                    }
                ]
            },
            {
                id: 6,
                title: "同名曲混淆案",
                description: "两首歌曲同名《北极星》，但分别属于不同作者，版权方误将B的歌曲维权。",
                evidences: [
                    {
                        id: 'e6-1',
                        type: 'audio',
                        title: '歌手A《北极星》',
                        desc: '2023年发行，流行曲风，时长4:12',
                        authType: 'adaptation',
                        isExpired: false,
                        isExceeded: false,
                        isConfusion: true
                    },
                    {
                        id: 'e6-2',
                        type: 'audio',
                        title: '歌手B《北极星》',
                        desc: '2020年发行，民谣曲风，时长3:45',
                        authType: 'adaptation',
                        isExpired: false,
                        isExceeded: false,
                        isConfusion: true
                    },
                    {
                        id: 'e6-3',
                        type: 'contract',
                        title: '歌手B授权书',
                        desc: '版权方仅获得歌手B《北极星》的维权授权',
                        authType: 'adaptation',
                        isExpired: false,
                        isExceeded: false,
                        isConfusion: true
                    },
                    {
                        id: 'e6-4',
                        type: 'notice',
                        title: '作品登记证书对比',
                        desc: '两首《北极星》登记号、作者、创作时间均不同',
                        authType: 'adaptation',
                        isExpired: false,
                        isExceeded: false,
                        isConfusion: true
                    }
                ]
            },
            {
                id: 7,
                title: "综合复杂案：采样+过期",
                description: "某电影在2024年使用了一首1990年代的歌曲片段，但授权合同存在多重问题。",
                evidences: [
                    {
                        id: 'e7-1',
                        type: 'audio',
                        title: '电影《旧时光》片段',
                        desc: '使用《恋曲1990》片段约12秒',
                        authType: 'sampling',
                        isExpired: true,
                        isExceeded: true,
                        isConfusion: false
                    },
                    {
                        id: 'e7-2',
                        type: 'contract',
                        title: '电影配乐授权合同',
                        desc: '授权10秒采样，有效期至2023.12.31，已过期且超限',
                        authType: 'sampling',
                        isExpired: true,
                        isExceeded: true,
                        isConfusion: false
                    },
                    {
                        id: 'e7-3',
                        type: 'notice',
                        title: '版权方催款函',
                        desc: '2024年2月发函要求停止侵权并赔偿',
                        authType: 'sampling',
                        isExpired: true,
                        isExceeded: true,
                        isConfusion: false
                    }
                ]
            }
        ];
    }

    startGame() {
        this.gameState = 'playing';
        this.score = 0;
        this.timer = 0;
        this.currentCaseIndex = 0;
        this.gameHistory = [];
        
        document.getElementById('btn-start').disabled = true;
        document.getElementById('btn-pause').disabled = false;
        document.getElementById('btn-submit').disabled = false;
        document.getElementById('btn-pause').textContent = '⏸️ 暂停';
        
        this.startTimer();
        this.loadCurrentCase();
        this.showMessage('游戏开始！请仔细分析证据并正确归类。', 'info');
    }

    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            this.stopTimer();
            document.getElementById('btn-pause').textContent = '▶️ 继续';
            this.showMessage('游戏已暂停', 'warning');
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            this.startTimer();
            document.getElementById('btn-pause').textContent = '⏸️ 暂停';
            this.showMessage('游戏继续', 'info');
        }
    }

    resetGame() {
        this.stopTimer();
        this.gameState = 'idle';
        this.score = 0;
        this.timer = 0;
        this.currentCaseIndex = 0;
        this.evidencePool = [];
        this.placedEvidence = {};
        this.reviewEvidence = { expired: [], exceeded: [], confusion: [] };
        this.gameHistory = [];
        this.currentCase = null;
        
        document.getElementById('btn-start').disabled = false;
        document.getElementById('btn-pause').disabled = true;
        document.getElementById('btn-submit').disabled = true;
        document.getElementById('btn-review').disabled = true;
        document.getElementById('btn-export').disabled = true;
        document.getElementById('btn-pause').textContent = '⏸️ 暂停';
        
        this.clearAllSlots();
        this.updateUI();
        this.showMessage('游戏已重置，点击"开始游戏"重新开始', 'info');
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            this.timer++;
            this.updateTimerDisplay();
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    updateTimerDisplay() {
        const minutes = Math.floor(this.timer / 60).toString().padStart(2, '0');
        const seconds = (this.timer % 60).toString().padStart(2, '0');
        document.getElementById('timer').textContent = `${minutes}:${seconds}`;
    }

    loadCurrentCase() {
        if (this.currentCaseIndex >= this.cases.length) {
            this.finishGame();
            return;
        }

        this.currentCase = this.cases[this.currentCaseIndex];
        this.evidencePool = [...this.currentCase.evidences];
        this.placedEvidence = {};
        this.reviewEvidence = { expired: [], exceeded: [], confusion: [] };
        
        this.clearAllSlots();
        this.renderEvidencePool();
        this.updateCaseDescription();
        this.updateUI();
    }

    clearAllSlots() {
        document.querySelectorAll('.slot, .review-slot').forEach(slot => {
            slot.innerHTML = '';
            slot.classList.remove('filled');
            const slotLabel = document.createElement('span');
            slotLabel.className = 'slot-label';
            if (slot.classList.contains('review-slot')) {
                const reviewType = slot.dataset.review;
                const labels = {
                    expired: '拖入过期证据',
                    exceeded: '拖入超限证据',
                    confusion: '拖入混淆证据'
                };
                slotLabel.textContent = labels[reviewType] || '拖入证据';
            } else {
                const slotType = slot.dataset.slot;
                const labels = {
                    audio: '歌曲片段',
                    contract: '授权合同',
                    notice: '平台通知'
                };
                slotLabel.textContent = labels[slotType] || '拖入证据';
            }
            slot.appendChild(slotLabel);
        });
    }

    renderEvidencePool() {
        const pool = document.getElementById('evidence-pool');
        pool.innerHTML = '';

        if (this.evidencePool.length === 0) {
            pool.innerHTML = '<p class="empty-hint">所有证据已处理完毕</p>';
            return;
        }

        this.evidencePool.forEach(evidence => {
            const card = this.createEvidenceCard(evidence);
            pool.appendChild(card);
        });
    }

    createEvidenceCard(evidence) {
        const card = document.createElement('div');
        card.className = 'evidence-card';
        card.draggable = true;
        card.dataset.evidenceId = evidence.id;
        card.dataset.evidenceType = evidence.type;
        card.dataset.authType = evidence.authType;
        
        if (evidence.isExpired) card.classList.add('expired');
        if (evidence.isExceeded) card.classList.add('exceeded');
        if (evidence.isConfusion) card.classList.add('confusion');

        const typeLabels = {
            audio: '🎵 歌曲片段',
            contract: '📄 授权合同',
            notice: '📧 平台通知'
        };

        let warningBadge = '';
        if (evidence.isExpired || evidence.isExceeded || evidence.isConfusion) {
            warningBadge = '<span class="warning-badge">!</span>';
        }

        card.innerHTML = `
            ${warningBadge}
            <span class="evidence-type">${typeLabels[evidence.type]}</span>
            <div class="evidence-title">${evidence.title}</div>
            <div class="evidence-desc">${evidence.desc}</div>
        `;

        card.addEventListener('dragstart', (e) => {
            if (this.gameState !== 'playing') return;
            this.draggedElement = evidence;
            card.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
            this.draggedElement = null;
        });

        card.addEventListener('dblclick', () => {
            if (this.gameState !== 'playing') return;
            this.returnToPool(evidence);
        });

        card.addEventListener('click', () => {
            this.showEvidenceDetail(evidence);
        });

        return card;
    }

    handleDrop(slot, evidence) {
        if (this.gameState !== 'playing') {
            this.showMessage('请先开始游戏！', 'warning');
            return;
        }

        const isReviewSlot = slot.classList.contains('review-slot');
        const slotType = slot.dataset.slot;
        const reviewType = slot.dataset.review;
        const authZoneType = slot.closest('.zone')?.dataset.type;

        if (isReviewSlot) {
            this.placeInReviewZone(evidence, reviewType, slot);
        } else if (slotType === evidence.type) {
            this.placeInSlot(evidence, authZoneType, slotType, slot);
        } else {
            this.showMessage(`该槽位需要${this.getSlotTypeName(slotType)}类型证据`, 'error');
            return;
        }
    }

    getSlotTypeName(slotType) {
        const names = {
            audio: '歌曲片段',
            contract: '授权合同',
            notice: '平台通知'
        };
        return names[slotType] || slotType;
    }

    placeInSlot(evidence, authType, slotType, slot) {
        this.removeEvidenceFromCurrentLocation(evidence);

        const key = `${authType}-${slotType}`;
        
        if (this.placedEvidence[key]) {
            this.evidencePool.push(this.placedEvidence[key]);
        }

        this.placedEvidence[key] = evidence;
        this.removeFromPool(evidence.id);
        this.renderSlotContent(slot, evidence);
        this.renderEvidencePool();
        this.updateUI();
        this.showMessage(`证据已放入${this.getAuthTypeName(authType)}区`, 'success');
    }

    placeInReviewZone(evidence, reviewType, slot) {
        this.removeEvidenceFromCurrentLocation(evidence);

        if (this.reviewEvidence[reviewType].length > 0) {
            this.evidencePool.push(...this.reviewEvidence[reviewType]);
            this.reviewEvidence[reviewType] = [];
        }

        this.reviewEvidence[reviewType].push(evidence);
        this.removeFromPool(evidence.id);
        this.renderReviewSlotContent(slot, evidence);
        this.renderEvidencePool();
        this.updateUI();
        this.showMessage(`证据已放入${this.getReviewTypeName(reviewType)}复核区`, 'warning');
    }

    removeEvidenceFromCurrentLocation(evidence) {
        for (const key in this.placedEvidence) {
            if (this.placedEvidence[key]?.id === evidence.id) {
                delete this.placedEvidence[key];
                this.clearSlotByKey(key);
                return;
            }
        }

        for (const reviewType in this.reviewEvidence) {
            const idx = this.reviewEvidence[reviewType].findIndex(e => e.id === evidence.id);
            if (idx !== -1) {
                this.reviewEvidence[reviewType].splice(idx, 1);
                this.clearReviewSlot(reviewType);
                return;
            }
        }
    }

    clearSlotByKey(key) {
        const [authType, slotType] = key.split('-');
        const slot = document.querySelector(`.slot[data-type="${authType}"][data-slot="${slotType}"]`);
        if (slot) {
            slot.innerHTML = `<span class="slot-label">${this.getSlotTypeName(slotType)}</span>`;
            slot.classList.remove('filled');
        }
    }

    clearReviewSlot(reviewType) {
        const slot = document.querySelector(`.review-slot[data-review="${reviewType}"]`);
        if (slot) {
            const labels = {
                expired: '拖入过期证据',
                exceeded: '拖入超限证据',
                confusion: '拖入混淆证据'
            };
            slot.innerHTML = `<span class="slot-label">${labels[reviewType]}</span>`;
            slot.classList.remove('filled');
        }
    }

    returnToPool(evidence) {
        this.removeEvidenceFromCurrentLocation(evidence);
        if (!this.evidencePool.find(e => e.id === evidence.id)) {
            this.evidencePool.push(evidence);
        }
        this.renderEvidencePool();
        this.updateUI();
        this.showMessage('证据已放回待分析区', 'info');
    }

    removeFromPool(evidenceId) {
        const idx = this.evidencePool.findIndex(e => e.id === evidenceId);
        if (idx !== -1) {
            this.evidencePool.splice(idx, 1);
        }
    }

    renderSlotContent(slot, evidence) {
        const card = this.createEvidenceCard(evidence);
        slot.innerHTML = '';
        slot.appendChild(card);
        slot.classList.add('filled');
    }

    renderReviewSlotContent(slot, evidence) {
        const card = this.createEvidenceCard(evidence);
        slot.innerHTML = '';
        slot.appendChild(card);
        slot.classList.add('filled');
    }

    getAuthTypeName(type) {
        const names = {
            'sampling': '采样授权',
            'adaptation': '改编授权',
            'public-broadcast': '公播授权'
        };
        return names[type] || type;
    }

    getReviewTypeName(type) {
        const names = {
            'expired': '授权过期',
            'exceeded': '采样超限',
            'confusion': '同名曲混淆'
        };
        return names[type] || type;
    }

    showEvidenceDetail(evidence) {
        const typeLabels = {
            audio: '歌曲片段',
            contract: '授权合同',
            notice: '平台通知'
        };
        
        let warnings = [];
        if (evidence.isExpired) warnings.push('授权已过期');
        if (evidence.isExceeded) warnings.push('采样可能超限');
        if (evidence.isConfusion) warnings.push('可能存在同名曲混淆');
        
        const warningText = warnings.length > 0 ? `\n\n⚠️ 注意：${warnings.join('、')}` : '';
        
        alert(`【${typeLabels[evidence.type]}】\n\n${evidence.title}\n\n${evidence.desc}${warningText}`);
    }

    updateCaseDescription() {
        const descEl = document.getElementById('case-description');
        if (this.currentCase) {
            descEl.innerHTML = `
                <p><strong>案件编号：</strong>${this.currentCase.id}</p>
                <p><strong>案件名称：</strong>${this.currentCase.title}</p>
                <p><strong>案情描述：</strong>${this.currentCase.description}</p>
                <p><strong>证据数量：</strong>${this.currentCase.evidences.length}件</p>
            `;
        } else {
            descEl.innerHTML = '<p>开始游戏后显示案件详情</p>';
        }
    }

    updateUI() {
        document.getElementById('current-case').textContent = this.currentCase ? `第${this.currentCaseIndex + 1}案/${this.cases.length}案` : '未开始';
        document.getElementById('score').textContent = this.score;
        
        const total = this.currentCase ? this.currentCase.evidences.length : 0;
        const placed = Object.keys(this.placedEvidence).length + 
                      this.reviewEvidence.expired.length +
                      this.reviewEvidence.exceeded.length +
                      this.reviewEvidence.confusion.length;
        document.getElementById('progress').textContent = `${placed}/${total}`;
        
        this.updateTimerDisplay();
    }

    submitCase() {
        if (this.gameState !== 'playing') return;

        const totalEvidence = this.currentCase.evidences.length;
        const placedCount = Object.keys(this.placedEvidence).length +
                          this.reviewEvidence.expired.length +
                          this.reviewEvidence.exceeded.length +
                          this.reviewEvidence.confusion.length;

        if (placedCount < totalEvidence) {
            if (!confirm(`还有 ${totalEvidence - placedCount} 件证据未处理，确定要提交吗？`)) {
                return;
            }
        }

        const caseResult = this.evaluateCurrentCase();
        this.gameHistory.push(caseResult);
        this.score += caseResult.scoreDelta;

        if (this.currentCaseIndex < this.cases.length - 1) {
            this.currentCaseIndex++;
            this.loadCurrentCase();
            this.showMessage(`第${this.currentCaseIndex}案处理完毕！得分：${caseResult.scoreDelta > 0 ? '+' : ''}${caseResult.scoreDelta}`, 
                          caseResult.scoreDelta >= 0 ? 'success' : 'error');
        } else {
            this.finishGame();
        }

        this.updateUI();
    }

    evaluateCurrentCase() {
        const result = {
            caseId: this.currentCase.id,
            caseTitle: this.currentCase.title,
            scoreDelta: 0,
            correctPlacements: [],
            wrongPlacements: [],
            expiredErrors: [],
            missedSpecials: []
        };

        const correctAuthType = this.currentCase.evidences[0]?.authType;
        const hasExpired = this.currentCase.evidences.some(e => e.isExpired);
        const hasExceeded = this.currentCase.evidences.some(e => e.isExceeded);
        const hasConfusion = this.currentCase.evidences.some(e => e.isConfusion);

        for (const key in this.placedEvidence) {
            const [authType, slotType] = key.split('-');
            const evidence = this.placedEvidence[key];
            
            const correctAuth = evidence.authType;
            const correctSlot = evidence.type === slotType;
            
            let isCorrect = true;
            let errorMessage = '';

            if (evidence.isExpired) {
                result.scoreDelta -= 20;
                isCorrect = false;
                errorMessage = '授权过期证据混入正常授权区，严重错误！';
                result.expiredErrors.push({
                    evidence,
                    placedAt: `${this.getAuthTypeName(authType)} - ${this.getSlotTypeName(slotType)}`,
                    error: errorMessage
                });
            } else if (authType !== correctAuth) {
                result.scoreDelta -= 5;
                isCorrect = false;
                errorMessage = `授权类型错误：应为${this.getAuthTypeName(correctAuth)}，实际放入${this.getAuthTypeName(authType)}`;
            } else if (!correctSlot) {
                result.scoreDelta -= 5;
                isCorrect = false;
                errorMessage = `证据槽位错误：应为${this.getSlotTypeName(evidence.type)}，实际放入${this.getSlotTypeName(slotType)}`;
            } else {
                result.scoreDelta += 10;
            }

            if (isCorrect) {
                result.correctPlacements.push({
                    evidence,
                    placedAt: `${this.getAuthTypeName(authType)} - ${this.getSlotTypeName(slotType)}`
                });
            } else if (!evidence.isExpired) {
                result.wrongPlacements.push({
                    evidence,
                    placedAt: `${this.getAuthTypeName(authType)} - ${this.getSlotTypeName(slotType)}`,
                    shouldBe: `${this.getAuthTypeName(correctAuth)} - ${this.getSlotTypeName(evidence.type)}`,
                    error: errorMessage
                });
            }
        }

        for (const reviewType in this.reviewEvidence) {
            this.reviewEvidence[reviewType].forEach(evidence => {
                const shouldBeExpired = evidence.isExpired;
                const shouldBeExceeded = evidence.isExceeded;
                const shouldBeConfusion = evidence.isConfusion;

                let isCorrect = false;
                
                if (reviewType === 'expired' && shouldBeExpired) isCorrect = true;
                else if (reviewType === 'exceeded' && shouldBeExceeded) isCorrect = true;
                else if (reviewType === 'confusion' && shouldBeConfusion) isCorrect = true;

                if (isCorrect) {
                    result.scoreDelta += 15;
                    result.correctPlacements.push({
                        evidence,
                        placedAt: `${this.getReviewTypeName(reviewType)}复核区`
                    });
                } else {
                    result.scoreDelta -= 5;
                    result.wrongPlacements.push({
                        evidence,
                        placedAt: `${this.getReviewTypeName(reviewType)}复核区`,
                        shouldBe: this.getCorrectPlacement(evidence),
                        error: `错误放入复核区，该证据应为正常${this.getAuthTypeName(evidence.authType)}证据`
                    });
                }
            });
        }

        if (hasExpired && this.reviewEvidence.expired.length === 0) {
            result.scoreDelta -= 10;
            result.missedSpecials.push({
                type: 'expired',
                message: '未识别出授权过期案件，应放入"授权过期"复核区'
            });
        }
        if (hasExceeded && this.reviewEvidence.exceeded.length === 0) {
            result.scoreDelta -= 10;
            result.missedSpecials.push({
                type: 'exceeded',
                message: '未识别出采样超限案件，应放入"采样超限"复核区'
            });
        }
        if (hasConfusion && this.reviewEvidence.confusion.length === 0) {
            result.scoreDelta -= 10;
            result.missedSpecials.push({
                type: 'confusion',
                message: '未识别出同名曲混淆案件，应放入"同名曲混淆"复核区'
            });
        }

        return result;
    }

    getCorrectPlacement(evidence) {
        const typeLabels = {
            audio: '歌曲片段',
            contract: '授权合同',
            notice: '平台通知'
        };
        
        if (evidence.isExpired) return '授权过期复核区';
        if (evidence.isExceeded) return '采样超限复核区';
        if (evidence.isConfusion) return '同名曲混淆复核区';
        
        return `${this.getAuthTypeName(evidence.authType)} - ${typeLabels[evidence.type]}`;
    }

    finishGame() {
        this.stopTimer();
        this.gameState = 'finished';
        
        document.getElementById('btn-pause').disabled = true;
        document.getElementById('btn-submit').disabled = true;
        document.getElementById('btn-review').disabled = false;
        document.getElementById('btn-export').disabled = false;
        
        this.showResultModal();
        this.showMessage('🎉 所有案件处理完毕！点击"复盘"查看详细分析', 'success');
    }

    showResultModal() {
        const modal = document.getElementById('result-modal');
        const content = document.getElementById('result-content');
        
        const totalScore = this.score;
        const maxScore = this.cases.length * 45;
        const percentage = Math.max(0, Math.min(100, Math.round((totalScore / maxScore) * 100)));
        
        let grade = 'F';
        if (percentage >= 90) grade = 'A';
        else if (percentage >= 80) grade = 'B';
        else if (percentage >= 70) grade = 'C';
        else if (percentage >= 60) grade = 'D';
        
        const totalCorrect = this.gameHistory.reduce((sum, r) => sum + r.correctPlacements.length, 0);
        const totalWrong = this.gameHistory.reduce((sum, r) => sum + r.wrongPlacements.length + r.expiredErrors.length, 0);
        const totalExpiredErrors = this.gameHistory.reduce((sum, r) => sum + r.expiredErrors.length, 0);
        
        content.innerHTML = `
            <div class="result-summary">
                <div>最终得分</div>
                <div class="final-score">${totalScore}</div>
                <div class="grade">评级：${grade}</div>
                <div>正确率：${percentage}%</div>
            </div>
            
            <div class="result-stats">
                <div class="stat-item correct">
                    <div class="stat-label">正确归类</div>
                    <div class="stat-value">${totalCorrect}</div>
                </div>
                <div class="stat-item wrong">
                    <div class="stat-label">错误归类</div>
                    <div class="stat-value">${totalWrong}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">用时</div>
                    <div class="stat-value">${this.formatTime(this.timer)}</div>
                </div>
                <div class="stat-item wrong">
                    <div class="stat-label">过期混入错误</div>
                    <div class="stat-value">${totalExpiredErrors}</div>
                </div>
            </div>
            
            <div class="result-details">
                <h3>各案件得分</h3>
                ${this.gameHistory.map((result, idx) => `
                    <div class="${result.scoreDelta >= 0 ? 'correct-item' : 'error-item'}">
                        <div class="${result.scoreDelta >= 0 ? 'correct-step' : 'error-step'}">
                            第${idx + 1}案：${result.caseTitle}
                            <span style="float: right;">${result.scoreDelta > 0 ? '+' : ''}${result.scoreDelta}分</span>
                        </div>
                        <div class="${result.scoreDelta >= 0 ? 'correct-desc' : 'error-desc'}">
                            正确${result.correctPlacements.length}处，错误${result.wrongPlacements.length + result.expiredErrors.length}处
                            ${result.expiredErrors.length > 0 ? '<span class="highlight-red">（含过期混入错误）</span>' : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        modal.classList.add('show');
    }

    showReview() {
        const modal = document.getElementById('review-modal');
        const content = document.getElementById('review-content');
        
        let html = '<div class="review-section">';
        html += '<h3>📊 整体分析</h3>';
        
        const totalCorrect = this.gameHistory.reduce((sum, r) => sum + r.correctPlacements.length, 0);
        const totalWrong = this.gameHistory.reduce((sum, r) => sum + r.wrongPlacements.length, 0);
        const totalExpiredErrors = this.gameHistory.reduce((sum, r) => sum + r.expiredErrors.length, 0);
        const totalMissed = this.gameHistory.reduce((sum, r) => sum + r.missedSpecials.length, 0);
        
        html += `
            <table class="review-table">
                <thead>
                    <tr>
                        <th>统计项</th>
                        <th>数量</th>
                        <th>说明</th>
                    </tr>
                </thead>
                <tbody>
                    <tr class="correct-row">
                        <td>正确归类</td>
                        <td class="status-correct">${totalCorrect}</td>
                        <td>+10分/个（特殊案件+15分）</td>
                    </tr>
                    <tr class="wrong-row">
                        <td>错误归类</td>
                        <td class="status-wrong">${totalWrong}</td>
                        <td>-5分/个</td>
                    </tr>
                    <tr class="expired-row">
                        <td>过期混入错误</td>
                        <td class="status-expired">${totalExpiredErrors}</td>
                        <td>-20分/个（严重错误）</td>
                    </tr>
                    <tr class="wrong-row">
                        <td>遗漏特殊案件</td>
                        <td class="status-wrong">${totalMissed}</td>
                        <td>-10分/个</td>
                    </tr>
                </tbody>
            </table>
        `;
        html += '</div>';

        this.gameHistory.forEach((result, caseIdx) => {
            html += `<div class="review-section">`;
            html += `<h3>📁 第${caseIdx + 1}案：${result.caseTitle} <span style="float:right; font-size:14px; ${result.scoreDelta >= 0 ? 'color:#4caf50' : 'color:#f44336'}">${result.scoreDelta > 0 ? '+' : ''}${result.scoreDelta}分</span></h3>`;
            
            if (result.correctPlacements.length > 0) {
                html += `
                    <table class="review-table">
                        <thead>
                            <tr>
                                <th>证据</th>
                                <th>放置位置</th>
                                <th>状态</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${result.correctPlacements.map(p => `
                                <tr class="correct-row">
                                    <td>${p.evidence.title}</td>
                                    <td>${p.placedAt}</td>
                                    <td class="status-correct">✓ 正确</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            }

            if (result.wrongPlacements.length > 0) {
                html += `
                    <table class="review-table">
                        <thead>
                            <tr>
                                <th>证据</th>
                                <th>错误放置</th>
                                <th>正确位置</th>
                                <th>状态</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${result.wrongPlacements.map(p => `
                                <tr class="wrong-row">
                                    <td>${p.evidence.title}</td>
                                    <td>${p.placedAt}</td>
                                    <td>${p.shouldBe}</td>
                                    <td class="status-wrong">✗ 错误</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            }

            if (result.expiredErrors.length > 0) {
                html += `
                    <table class="review-table">
                        <thead>
                            <tr>
                                <th>证据</th>
                                <th>错误放置</th>
                                <th>严重错误</th>
                                <th>状态</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${result.expiredErrors.map(p => `
                                <tr class="expired-row">
                                    <td>${p.evidence.title}</td>
                                    <td>${p.placedAt}</td>
                                    <td>授权过期证据混入正常授权区</td>
                                    <td class="status-expired">✗ 严重错误</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            }

            if (result.missedSpecials.length > 0) {
                html += `<div class="analysis-notes">
                    <h4>⚠️ 遗漏的特殊案件</h4>
                    <ul>
                        ${result.missedSpecials.map(m => `<li>${m.message}</li>`).join('')}
                    </ul>
                </div>`;
            }

            html += '</div>';
        });

        const expiredErrors = this.gameHistory.flatMap(r => r.expiredErrors);
        if (expiredErrors.length > 0) {
            html += '<div class="review-section">';
            html += '<h3>🚨 授权过期错误详细分析</h3>';
            html += `<div class="analysis-notes">
                <h4>处理错误步骤：</h4>
                <ul>
                    ${expiredErrors.map((e, idx) => `
                        <li>
                            <strong>第${idx + 1}步错误：</strong>
                            将"${e.evidence.title}"（${e.evidence.desc}）放入了"${e.placedAt}"
                            <br>→ 正确做法：授权过期证据应单独放入"授权过期"复核区，绝不能混入正常授权结果中
                        </li>
                    `).join('')}
                </ul>
                <p style="margin-top: 10px; color: #d32f2f; font-weight: 600;">
                    法律提示：授权过期后继续使用构成侵权，应立即停止使用并补办授权手续。
                </p>
            </div>`;
            html += '</div>';
        }

        content.innerHTML = html;
        modal.classList.add('show');
    }

    exportResults() {
        const exportData = {
            exportTime: new Date().toLocaleString('zh-CN'),
            totalScore: this.score,
            totalTime: this.formatTime(this.timer),
            caseCount: this.cases.length,
            cases: this.gameHistory.map(result => ({
                caseId: result.caseId,
                caseTitle: result.caseTitle,
                scoreDelta: result.scoreDelta,
                correctPlacements: result.correctPlacements.map(p => ({
                    evidence: p.evidence.title,
                    evidenceDesc: p.evidence.desc,
                    placedAt: p.placedAt
                })),
                wrongPlacements: result.wrongPlacements.map(p => ({
                    evidence: p.evidence.title,
                    evidenceDesc: p.evidence.desc,
                    placedAt: p.placedAt,
                    shouldBe: p.shouldBe,
                    error: p.error
                })),
                expiredErrors: result.expiredErrors.map(e => ({
                    evidence: e.evidence.title,
                    evidenceDesc: e.evidence.desc,
                    placedAt: e.placedAt,
                    error: e.error
                })),
                missedSpecials: result.missedSpecials
            })),
            summary: {
                totalCorrect: this.gameHistory.reduce((sum, r) => sum + r.correctPlacements.length, 0),
                totalWrong: this.gameHistory.reduce((sum, r) => sum + r.wrongPlacements.length, 0),
                totalExpiredErrors: this.gameHistory.reduce((sum, r) => sum + r.expiredErrors.length, 0),
                totalMissed: this.gameHistory.reduce((sum, r) => sum + r.missedSpecials.length, 0)
            }
        };

        let csvContent = this.generateCSV(exportData);
        
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `音乐版权法庭战成绩_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.showMessage('成绩已导出为CSV文件', 'success');
    }

    generateCSV(data) {
        let csv = '音乐版权法庭战 - 成绩报告\n';
        csv += `导出时间,${data.exportTime}\n`;
        csv += `总得分,${data.totalScore}\n`;
        csv += `总用时,${data.totalTime}\n`;
        csv += `案件数,${data.caseCount}\n\n`;

        csv += '汇总统计\n';
        csv += '正确归类数,错误归类数,过期混入错误数,遗漏特殊案件数\n';
        csv += `${data.summary.totalCorrect},${data.summary.totalWrong},${data.summary.totalExpiredErrors},${data.summary.totalMissed}\n\n`;

        csv += '各案件明细\n';
        csv += '案件编号,案件名称,得分变化,正确数,错误数,过期错误数,遗漏数\n';
        data.cases.forEach((c, idx) => {
            csv += `${idx + 1},${c.caseTitle},${c.scoreDelta},${c.correctPlacements.length},${c.wrongPlacements.length},${c.expiredErrors.length},${c.missedSpecials.length}\n`;
        });
        csv += '\n';

        if (data.summary.totalExpiredErrors > 0) {
            csv += '🚨 授权过期错误详情（重点关注）\n';
            csv += '案件,证据名称,证据描述,错误放置位置,错误说明\n';
            data.cases.forEach((c, caseIdx) => {
                c.expiredErrors.forEach(e => {
                    csv += `${caseIdx + 1}-${c.caseTitle},${e.evidence},${e.evidenceDesc},${e.placedAt},${e.error}\n`;
                });
            });
            csv += '\n';
        }

        if (data.summary.totalWrong > 0) {
            csv += '❌ 错误归类详情\n';
            csv += '案件,证据名称,证据描述,错误放置,正确位置,错误说明\n';
            data.cases.forEach((c, caseIdx) => {
                c.wrongPlacements.forEach(w => {
                    csv += `${caseIdx + 1}-${c.caseTitle},${w.evidence},${w.evidenceDesc},${w.placedAt},${w.shouldBe},${w.error}\n`;
                });
            });
            csv += '\n';
        }

        csv += '✅ 正确归类详情\n';
        csv += '案件,证据名称,证据描述,放置位置\n';
        data.cases.forEach((c, caseIdx) => {
            c.correctPlacements.forEach(p => {
                csv += `${caseIdx + 1}-${c.caseTitle},${p.evidence},${p.evidenceDesc},${p.placedAt}\n`;
            });
        });

        return csv;
    }

    showHelp() {
        document.getElementById('help-modal').classList.add('show');
    }

    showMessage(text, type = 'info') {
        const msgEl = document.getElementById('message');
        msgEl.textContent = text;
        msgEl.className = `message ${type}`;
        
        setTimeout(() => {
            if (msgEl.textContent === text) {
                msgEl.textContent = '';
                msgEl.className = 'message';
            }
        }, 3000);
    }

    formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}分${s}秒`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MusicCopyrightCourtGame();
});
