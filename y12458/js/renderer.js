const Renderer = (function() {
    class UIRenderer {
        constructor(game, diagnosis) {
            this.game = game;
            this.diagnosis = diagnosis;
        }

        renderAll() {
            this.renderAgeGrid();
            this.renderMarketEvents();
            this.renderAssetCards();
            this.renderTaxAccount();
            this.renderGameStatus();
            this.renderAllocationReport();
            this.renderDiagnosis();
            this.renderHistory();
        }

        renderAgeGrid() {
            const container = document.getElementById('ageGrid');
            if (!container) return;

            container.innerHTML = '';
            this.game.ageCells.forEach(cell => {
                const cellEl = document.createElement('div');
                cellEl.className = 'age-cell';

                if (cell.age === this.game.currentAge) {
                    cellEl.classList.add('active');
                }
                if (cell.completed) {
                    cellEl.classList.add('completed');
                }
                if (cell.age >= 60) {
                    cellEl.classList.add('retired');
                }
                if (cell.affectedByRevocation) {
                    cellEl.classList.add('affected');
                }

                const riskLevel = cell.riskLevel || this._getRiskLevelColor(cell.riskOverstep);
                if (riskLevel) {
                    const riskIndicator = document.createElement('div');
                    riskIndicator.className = `risk-indicator risk-${riskLevel}`;
                    cellEl.appendChild(riskIndicator);
                }

                const ageSpan = document.createElement('span');
                ageSpan.className = 'age';
                ageSpan.textContent = cell.age;
                cellEl.appendChild(ageSpan);

                if (cell.remark) {
                    const remarkSpan = document.createElement('span');
                    remarkSpan.className = 'remark';
                    remarkSpan.textContent = cell.remark;
                    cellEl.appendChild(remarkSpan);
                }

                cellEl.addEventListener('click', () => this._onAgeCellClick(cell));
                container.appendChild(cellEl);
            });
        }

        _getRiskLevelColor(riskOverstep) {
            if (!riskOverstep) return 'low';
            if (riskOverstep.difference > 1) return 'high';
            if (riskOverstep.difference > 0.5) return 'medium';
            return 'low';
        }

        _onAgeCellClick(cell) {
            this._showAgeCellDetail(cell);
        }

        _showAgeCellDetail(cell) {
            let content = `<div><strong>年龄：</strong>${cell.age}岁</div>`;
            content += `<div><strong>备注：</strong>${cell.remark || '无'}</div>`;
            content += `<div><strong>状态：</strong>${cell.completed ? '已完成' : '未完成'}</div>`;
            
            if (cell.completed) {
                content += `<div><strong>风险值：</strong>${cell.riskLevel?.toFixed(2) || 'N/A'}</div>`;
                content += `<div><strong>预期资产：</strong>${cell.expectedValue?.toLocaleString() || 0}元</div>`;
                content += `<div><strong>实际资产：</strong>${cell.actualValue?.toLocaleString() || 0}元</div>`;
                
                if (cell.riskOverstep) {
                    content += `<div style="color: #ef4444; margin-top: 10px;">
                        <strong>⚠️ 风险超限：</strong>限值${cell.riskOverstep.riskLimit}，实际${cell.riskOverstep.currentRisk?.toFixed(2)}
                    </div>`;
                }
                
                if (cell.affectedByRevocation) {
                    content += `<div style="color: #ef4444; margin-top: 10px;">
                        <strong>🔴 受影响：</strong>退休目标撤回后此格结果失效
                    </div>`;
                }

                if (Object.keys(cell.allocation || {}).length > 0) {
                    content += `<div style="margin-top: 10px;"><strong>资产配置：</strong></div>`;
                    Object.entries(cell.allocation).forEach(([id, amount]) => {
                        if (amount > 0) {
                            const assetName = this._getAssetName(id);
                            content += `<div style="margin-left: 15px;">• ${assetName}: ${amount.toLocaleString()}元</div>`;
                        }
                    });
                }
            }

            this.showModal(`${cell.age}岁 - 年龄格详情`, content);
        }

        _getAssetName(id) {
            const { ASSET_TYPES } = GameModels;
            const type = Object.values(ASSET_TYPES).find(t => t.id === id);
            return type ? type.name : id;
        }

        renderMarketEvents() {
            const container = document.getElementById('marketEvents');
            if (!container) return;

            container.innerHTML = '';
            if (this.game.currentEvent) {
                const eventEl = document.createElement('div');
                eventEl.className = `event-card ${this.game.currentEvent.type}`;
                eventEl.innerHTML = `
                    <div class="event-title">${this.game.currentEvent.title}</div>
                    <div class="event-desc">${this.game.currentEvent.desc}</div>
                `;
                container.appendChild(eventEl);
            }
        }

        renderAssetCards() {
            const container = document.getElementById('assetCards');
            if (!container) return;

            container.innerHTML = '';
            Object.entries(this.game.assetCards).forEach(([id, card]) => {
                const cardEl = document.createElement('div');
                cardEl.className = `asset-card risk-${card.risk}`;
                if (card.selected) cardEl.classList.add('selected');

                cardEl.innerHTML = `
                    <div class="asset-name">${card.name}</div>
                    <div class="asset-details">
                        <div>预期收益: ${(card.expectedReturn * 100).toFixed(1)}%</div>
                        <div>波动率: ${(card.volatility * 100).toFixed(1)}%</div>
                        <div>风险等级: ${'★'.repeat(card.riskLevel)}${'☆'.repeat(3 - card.riskLevel)}</div>
                    </div>
                    <div class="asset-allocation">
                        <div class="allocation-input">
                            <input type="number" 
                                   id="alloc-${id}" 
                                   value="${card.allocationAmount}" 
                                   min="0"
                                   placeholder="配置金额">
                            <span>元</span>
                        </div>
                    </div>
                `;

                container.appendChild(cardEl);

                const input = cardEl.querySelector(`#alloc-${id}`);
                input.addEventListener('change', (e) => {
                    const amount = parseFloat(e.target.value) || 0;
                    this.game.setAssetAllocation(id, amount);
                    this.renderAllocationReport();
                    this.renderDiagnosis();
                });
            });
        }

        renderTaxAccount() {
            const balanceEl = document.getElementById('taxAccountBalance');
            const infoEl = document.getElementById('taxInfo');

            if (balanceEl) {
                balanceEl.textContent = this.game.taxAccount.balance.toLocaleString();
            }

            if (infoEl) {
                const tax = this.game.taxAccount;
                infoEl.innerHTML = `
                    <div>年度限额: ${tax.annualLimit.toLocaleString()}元</div>
                    <div>累计存入: ${tax.totalDeposits.toLocaleString()}元</div>
                    <div>累计支取: ${tax.totalWithdrawals.toLocaleString()}元</div>
                    <div>税优比例: ${(tax.taxDeductionRate * 100).toFixed(0)}%</div>
                `;
            }
        }

        renderGameStatus() {
            const currentAgeEl = document.getElementById('currentAge');
            const retirementGoalEl = document.getElementById('retirementGoal');
            const currentTurnEl = document.getElementById('currentTurn');
            const riskStatusEl = document.getElementById('riskStatus');

            if (currentAgeEl) currentAgeEl.textContent = this.game.currentAge;
            if (retirementGoalEl) {
                retirementGoalEl.textContent = this.game.retirementAge;
                if (this.game.goalRevoked) {
                    retirementGoalEl.style.textDecoration = 'line-through';
                    retirementGoalEl.style.color = '#ef4444';
                }
            }
            if (currentTurnEl) currentTurnEl.textContent = this.game.turn;

            if (riskStatusEl) {
                const riskCheck = this.game.checkRiskOverstep();
                const valueEl = riskStatusEl.querySelector('.value');
                if (valueEl) {
                    if (riskCheck.overstep) {
                        valueEl.textContent = `超限 (${riskCheck.currentRisk.toFixed(2)})`;
                        valueEl.className = 'value danger';
                    } else if (riskCheck.currentRisk > riskCheck.riskLimit * 0.8) {
                        valueEl.textContent = `偏高 (${riskCheck.currentRisk.toFixed(2)})`;
                        valueEl.className = 'value warning';
                    } else {
                        valueEl.textContent = `安全 (${riskCheck.currentRisk.toFixed(2)})`;
                        valueEl.className = 'value safe';
                    }
                }
            }
        }

        renderAllocationReport() {
            const container = document.getElementById('allocationReport');
            if (!container) return;

            const report = this.game.calculateAllocationReport();
            let html = '';

            Object.entries(report.assetReturns).forEach(([id, data]) => {
                if (data.allocated > 0) {
                    html += `
                        <div class="report-row">
                            <span class="label">${data.name}</span>
                            <span class="value">${data.expected.toLocaleString()}元</span>
                        </div>
                    `;
                }
            });

            if (report.taxInfo.yearlyReturn > 0) {
                html += `
                    <div class="report-row">
                        <span class="label">税延账户收益</span>
                        <span class="value">${report.taxInfo.yearlyReturn.toLocaleString()}元</span>
                    </div>
                `;
            }

            html += `
                <div class="report-row total">
                    <span class="label">预期合计</span>
                    <span class="value">${report.totalExpected.toLocaleString()}元</span>
                </div>
                <div class="report-row">
                    <span class="label">实际合计</span>
                    <span class="value">${report.totalActual.toLocaleString()}元</span>
                </div>
            `;

            if (report.mismatches.length > 0) {
                report.mismatches.forEach(mismatch => {
                    html += `
                        <div class="report-row mismatch">
                            <span class="label" style="color: #ef4444;">⚠️ ${mismatch.message}</span>
                        </div>
                    `;
                });
            }

            container.innerHTML = html;
        }

        renderDiagnosis() {
            const container = document.getElementById('diagnosis');
            if (!container) return;

            const diagnosis = this.diagnosis.diagnoseAllocation();
            let html = '';

            diagnosis.issues.forEach(issue => {
                html += this._renderDiagnosisItem(issue, 'error');
            });

            diagnosis.warnings.forEach(warning => {
                html += this._renderDiagnosisItem(warning, 'warning');
            });

            diagnosis.successes.forEach(success => {
                html += this._renderDiagnosisItem(success, 'success');
            });

            if (html === '') {
                html = '<div style="color: #6b7280; text-align: center; padding: 20px;">暂无诊断信息</div>';
            }

            container.innerHTML = html;
        }

        _renderDiagnosisItem(item, type) {
            const sourceText = item.source === 'asset_card' ? '【资产卡】' :
                              item.source === 'tax_account' ? '【税延账户】' : '';
            return `
                <div class="diagnosis-item ${type}">
                    <div class="diagnosis-title">${sourceText}${item.title}</div>
                    <div class="diagnosis-detail">${item.detail}</div>
                </div>
            `;
        }

        renderHistory() {
            const container = document.getElementById('history');
            if (!container) return;

            let html = '';
            const history = [...this.game.history].reverse();

            history.forEach((item, index) => {
                let className = 'history-item';
                if (item.action === 'allocation' && item.data?.riskCheck?.overstep) {
                    className += ' warning';
                }
                if (item.action === 'game_over') {
                    className += ' error';
                }

                html += `
                    <div class="${className}">
                        <div class="history-turn">第${item.turn}回合 - ${item.age}岁</div>
                        <div class="history-detail">${item.message}</div>
                    </div>
                `;
            });

            if (html === '') {
                html = '<div style="color: #6b7280; text-align: center; padding: 20px;">暂无历史记录</div>';
            }

            container.innerHTML = html;
        }

        renderLeaderboard(records) {
            const container = document.getElementById('leaderboardContent');
            if (!container) return;

            const sorted = [...records].sort((a, b) => b.score - a.score);

            let html = '<table class="leaderboard-table"><thead><tr>';
            html += '<th>排名</th><th>玩家</th><th>最终资产</th><th>得分</th>';
            html += '<th>风险错误</th><th>税延错误</th><th>配置错误</th><th>详情</th>';
            html += '</tr></thead><tbody>';

            sorted.forEach((record, index) => {
                const hasErrors = record.riskErrors.length > 0 ||
                                  record.taxErrors.length > 0 ||
                                  record.allocationErrors.length > 0;
                const rowClass = hasErrors ? 'error-step' : '';
                const rankClass = index < 3 ? `rank-${index + 1}` : '';

                html += `<tr class="${rowClass}">`;
                html += `<td class="rank ${rankClass}">${index + 1}</td>`;
                html += `<td>${record.name}</td>`;
                html += `<td>${record.totalValue.toLocaleString()}元</td>`;
                html += `<td style="font-weight: 700;">${record.score.toLocaleString()}</td>`;
                html += `<td>${this._renderErrorCount(record.riskErrors)}</td>`;
                html += `<td>${this._renderErrorCount(record.taxErrors)}</td>`;
                html += `<td>${this._renderErrorCount(record.allocationErrors)}</td>`;
                html += `<td>${this._renderErrorDetails(record)}</td>`;
                html += '</tr>';
            });

            html += '</tbody></table>';
            container.innerHTML = html;
        }

        _renderErrorCount(errors) {
            if (errors.length === 0) return '<span style="color: #10b981;">-</span>';
            return `<span style="color: #ef4444; font-weight: 600;">${errors.length}</span>`;
        }

        _renderErrorDetails(record) {
            const allErrors = [
                ...record.riskErrors.map(e => ({ ...e, type: '风险' })),
                ...record.taxErrors.map(e => ({ ...e, type: '税延' })),
                ...record.allocationErrors.map(e => ({ ...e, type: '配置' }))
            ];

            if (allErrors.length === 0) return '<span style="color: #10b981;">无错误</span>';

            let details = '';
            allErrors.slice(0, 3).forEach(e => {
                details += `<div class="step-details">第${e.turn}回合(${e.age}岁): ${e.type}错误</div>`;
            });
            if (allErrors.length > 3) {
                details += `<div class="step-details">...还有${allErrors.length - 3}个错误</div>`;
            }

            return details;
        }

        renderReplay(historyData, stepIndex) {
            const container = document.getElementById('replayContent');
            const stepEl = document.getElementById('replayStep');
            if (!container || !stepEl) return;

            const step = historyData[stepIndex];
            stepEl.textContent = `第 ${stepIndex + 1} / ${historyData.length} 步`;

            let html = '';

            if (step.data?.riskCheck?.overstep) {
                html += `
                    <div class="failure-message">
                        <h4>⚠️ 风险超限提示</h4>
                        <div class="failure-details">
                            当前风险值: ${step.data.riskCheck.currentRisk.toFixed(2)}，
                            限值: ${step.data.riskCheck.riskLimit}，
                            超出: ${step.data.riskCheck.difference.toFixed(2)}
                        </div>
                    </div>
                `;
            }

            html += '<div class="replay-step">';
            html += '<div class="replay-section">';
            html += '<h4>回合信息</h4>';
            html += `<div><strong>回合:</strong> 第${step.turn}回合</div>`;
            html += `<div><strong>年龄:</strong> ${step.age}岁</div>`;
            html += `<div><strong>操作:</strong> ${step.message}</div>`;
            html += '</div>';

            html += '<div class="replay-section">';
            html += '<h4>资产快照</h4>';
            html += `<div><strong>总资产:</strong> ${step.snapshot.totalAssets.toLocaleString()}元</div>`;
            html += `<div><strong>税延余额:</strong> ${step.snapshot.taxBalance.toLocaleString()}元</div>`;
            html += '</div>';
            html += '</div>';

            if (step.snapshot.allocation) {
                html += '<div class="replay-section" style="margin-top: 20px;">';
                html += '<h4>资产配置</h4>';
                Object.entries(step.snapshot.allocation).forEach(([id, amount]) => {
                    if (amount > 0) {
                        html += `<div>• ${this._getAssetName(id)}: ${amount.toLocaleString()}元</div>`;
                    }
                });
                html += '</div>';
            }

            container.innerHTML = html;
        }

        showModal(title, content, onConfirm = null) {
            const overlay = document.getElementById('modalOverlay');
            const titleEl = document.getElementById('modalTitle');
            const bodyEl = document.getElementById('modalBody');
            const confirmBtn = document.getElementById('modalConfirm');

            if (titleEl) titleEl.textContent = title;
            if (bodyEl) bodyEl.innerHTML = content;
            if (overlay) overlay.classList.remove('hidden');

            if (confirmBtn) {
                confirmBtn.onclick = () => {
                    this.hideModal();
                    if (onConfirm) onConfirm();
                };
            }
        }

        hideModal() {
            const overlay = document.getElementById('modalOverlay');
            if (overlay) overlay.classList.add('hidden');
        }
    }

    return { UIRenderer };
})();