const PensionGameApp = (function() {
    const { Game } = GameEngine;
    const { DiagnosisEngine } = Diagnosis;
    const { UIRenderer } = Renderer;

    class App {
        constructor() {
            this.game = new Game();
            this.diagnosis = new DiagnosisEngine(this.game);
            this.renderer = new UIRenderer(this.game, this.diagnosis);
            this.leaderboard = this._loadLeaderboard();
            this.replayIndex = 0;
            this.replayData = [];
            this.autoReplayInterval = null;

            this._init();
        }

        _init() {
            this._bindEvents();
            this._startNewGame();
        }

        _bindEvents() {
            document.getElementById('btnNewGame').addEventListener('click', () => {
                this._promptNewGame();
            });

            document.getElementById('btnReplay').addEventListener('click', () => {
                this._showReplay();
            });

            document.getElementById('btnLeaderboard').addEventListener('click', () => {
                this._showLeaderboard();
            });

            document.getElementById('btnConfirmAllocation').addEventListener('click', () => {
                this._confirmAllocation();
            });

            document.getElementById('btnNextTurn').addEventListener('click', () => {
                this._nextTurn();
            });

            document.getElementById('btnTaxDeposit').addEventListener('click', () => {
                this._taxDeposit();
            });

            document.getElementById('btnTaxWithdraw').addEventListener('click', () => {
                this._taxWithdraw();
            });

            document.getElementById('btnRevokeGoal').addEventListener('click', () => {
                this._revokeRetirementGoal();
            });

            document.getElementById('modalClose').addEventListener('click', () => {
                this.renderer.hideModal();
            });

            document.getElementById('modalConfirm').addEventListener('click', () => {
                this.renderer.hideModal();
            });

            document.getElementById('leaderboardClose').addEventListener('click', () => {
                document.getElementById('leaderboardOverlay').classList.add('hidden');
            });

            document.getElementById('replayClose').addEventListener('click', () => {
                this._closeReplay();
            });

            document.getElementById('replayPrev').addEventListener('click', () => {
                this._replayPrev();
            });

            document.getElementById('replayNext').addEventListener('click', () => {
                this._replayNext();
            });

            document.getElementById('replayAuto').addEventListener('click', () => {
                this._toggleAutoReplay();
            });
        }

        _startNewGame() {
            const playerName = '玩家' + Math.floor(Math.random() * 1000);
            this.game.startGame(playerName);
            this.renderer.renderAll();
        }

        _promptNewGame() {
            const content = `
                <div style="text-align: center;">
                    <p style="margin-bottom: 20px;">确定要开始新游戏吗？当前进度将会丢失。</p>
                    <input type="text" id="playerNameInput" 
                           placeholder="输入你的名字" 
                           style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; margin-bottom: 15px;">
                </div>
            `;
            this.renderer.showModal('新游戏', content, () => {
                const nameInput = document.getElementById('playerNameInput');
                const playerName = nameInput?.value || '玩家';
                this.game.startGame(playerName);
                this.renderer.renderAll();
            });
        }

        _confirmAllocation() {
            const { report, riskCheck } = this.game.confirmAllocation();
            this.renderer.renderAll();

            if (riskCheck.overstep) {
                const content = `
                    <div class="failure-message" style="margin-bottom: 20px;">
                        <h4>⚠️ 风险超限警告</h4>
                        <div class="failure-details">
                            当前风险值: ${riskCheck.currentRisk.toFixed(2)}<br>
                            年龄限值: ${riskCheck.riskLimit}<br>
                            超出: ${riskCheck.difference.toFixed(2)}
                        </div>
                    </div>
                    <p>建议在下一回合降低高风险资产配置比例，或增加税延账户存入。</p>
                `;
                this.renderer.showModal('配置确认 - 风险提示', content);
            }
        }

        _nextTurn() {
            const result = this.game.nextTurn();

            if (result.gameOver) {
                const record = this.game.getLeaderboardData();
                this.leaderboard.push(record);
                this._saveLeaderboard();

                const content = `
                    <div style="text-align: center;">
                        <h3 style="color: #10b981; margin-bottom: 20px;">🎉 恭喜完成游戏！</h3>
                        <div style="text-align: left; background: #f9fafb; padding: 20px; border-radius: 8px;">
                            <p><strong>玩家：</strong>${record.name}</p>
                            <p><strong>最终年龄：</strong>${record.finalAge}岁</p>
                            <p><strong>最终资产：</strong>${record.totalValue.toLocaleString()}元</p>
                            <p><strong>风险错误：</strong>${record.riskErrors.length}次</p>
                            <p><strong>税延错误：</strong>${record.taxErrors.length}次</p>
                            <p><strong>配置错误：</strong>${record.allocationErrors.length}次</p>
                            <p style="margin-top: 15px; font-size: 20px; font-weight: 700; color: #3b82f6;">
                                最终得分：${record.score.toLocaleString()}分
                            </p>
                        </div>
                    </div>
                `;
                this.renderer.showModal('游戏结束', content, () => {
                    this._showLeaderboard();
                });
            }

            this.renderer.renderAll();
        }

        _taxDeposit() {
            const amountInput = document.getElementById('taxAmount');
            const amount = parseFloat(amountInput?.value) || 0;
            const result = this.game.depositToTaxAccount(amount);

            if (!result.success) {
                this.renderer.showModal('操作失败', `<p>${result.message}</p>`);
            }

            this.renderer.renderAll();
        }

        _taxWithdraw() {
            const amountInput = document.getElementById('taxAmount');
            const amount = parseFloat(amountInput?.value) || 0;
            const result = this.game.withdrawFromTaxAccount(amount);

            if (!result.success) {
                this.renderer.showModal('操作失败', `<p>${result.message}</p>`);
            } else if (result.penalty > 0) {
                this.renderer.showModal('提前支取', `
                    <p>${result.message}</p>
                    <p style="color: #ef4444; margin-top: 10px;">
                        注意：提前支取税延账户会产生罚息，建议退休后再支取。
                    </p>
                `);
            }

            this.renderer.renderAll();
        }

        _revokeRetirementGoal() {
            const affected = this.game.revokeRetirementGoal();
            this.renderer.renderAll();

            const affectedAges = affected.map(c => c.age + '岁').join('、');
            const content = `
                <div style="color: #ef4444;">
                    <p><strong>⚠️ 退休目标已撤回</strong></p>
                    <p style="margin-top: 10px;">以下年龄格结果已标记为受影响：</p>
                    <p style="margin-top: 5px;">${affectedAges || '无'}</p>
                    <p style="margin-top: 10px; font-size: 12px;">
                        红色脉冲标记的单元格表示结果失效，需要重新配置。
                    </p>
                </div>
            `;
            this.renderer.showModal('目标撤回', content);
        }

        _showReplay() {
            this.replayData = this.game.getReplayData();
            if (this.replayData.length === 0) {
                this.renderer.showModal('提示', '<p>暂无回放数据，请先完成游戏。</p>');
                return;
            }

            this.replayIndex = 0;
            this.renderer.renderReplay(this.replayData, this.replayIndex);
            document.getElementById('replayOverlay').classList.remove('hidden');
        }

        _closeReplay() {
            document.getElementById('replayOverlay').classList.add('hidden');
            this._stopAutoReplay();
        }

        _replayPrev() {
            if (this.replayIndex > 0) {
                this.replayIndex--;
                this.renderer.renderReplay(this.replayData, this.replayIndex);
            }
        }

        _replayNext() {
            if (this.replayIndex < this.replayData.length - 1) {
                this.replayIndex++;
                this.renderer.renderReplay(this.replayData, this.replayIndex);
            }
        }

        _toggleAutoReplay() {
            const btn = document.getElementById('replayAuto');
            if (this.autoReplayInterval) {
                this._stopAutoReplay();
                btn.textContent = '自动播放';
                btn.classList.remove('btn-danger');
                btn.classList.add('btn-primary');
            } else {
                this._startAutoReplay();
                btn.textContent = '暂停';
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-danger');
            }
        }

        _startAutoReplay() {
            this.autoReplayInterval = setInterval(() => {
                if (this.replayIndex < this.replayData.length - 1) {
                    this._replayNext();
                } else {
                    this._stopAutoReplay();
                    const btn = document.getElementById('replayAuto');
                    btn.textContent = '自动播放';
                    btn.classList.remove('btn-danger');
                    btn.classList.add('btn-primary');
                }
            }, 2000);
        }

        _stopAutoReplay() {
            if (this.autoReplayInterval) {
                clearInterval(this.autoReplayInterval);
                this.autoReplayInterval = null;
            }
        }

        _showLeaderboard() {
            this.renderer.renderLeaderboard(this.leaderboard);
            document.getElementById('leaderboardOverlay').classList.remove('hidden');
        }

        _loadLeaderboard() {
            try {
                const data = localStorage.getItem('pensionGameLeaderboard');
                return data ? JSON.parse(data) : this._getSampleLeaderboard();
            } catch (e) {
                return this._getSampleLeaderboard();
            }
        }

        _saveLeaderboard() {
            try {
                localStorage.setItem('pensionGameLeaderboard', JSON.stringify(this.leaderboard));
            } catch (e) {
                console.error('Failed to save leaderboard:', e);
            }
        }

        _getSampleLeaderboard() {
            return [
                {
                    id: 1,
                    name: '王老师',
                    score: 980000,
                    totalValue: 1100000,
                    riskErrors: [],
                    taxErrors: [],
                    allocationErrors: [],
                    completedTurns: 8,
                    finalAge: 60,
                    goalRevoked: false
                },
                {
                    id: 2,
                    name: '李老师',
                    score: 750000,
                    totalValue: 900000,
                    riskErrors: [{ turn: 3, age: 40, detail: '风险超限' }],
                    taxErrors: [{ turn: 2, age: 35, detail: '提前支取' }],
                    allocationErrors: [],
                    completedTurns: 8,
                    finalAge: 60,
                    goalRevoked: false
                },
                {
                    id: 3,
                    name: '张老师',
                    score: 620000,
                    totalValue: 820000,
                    riskErrors: [
                        { turn: 2, age: 30, detail: '风险超限' },
                        { turn: 4, age: 45, detail: '风险超限' }
                    ],
                    taxErrors: [],
                    allocationErrors: [{ turn: 1, age: 25, detail: '配置不足' }],
                    completedTurns: 8,
                    finalAge: 60,
                    goalRevoked: true
                }
            ];
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        new App();
    });

    return { App };
})();