class App {
    constructor() {
        this.manager = new SettlementManager();
        this.currentSettlements = [];
        this.currentFilters = {};
        this.selectedSettlementId = null;
        this.init();
    }
    
    init() {
        this.manager.loadSettlements();
        this.currentSettlements = this.manager.getSettlements();
        this.populateAnchorFilter();
        this.render();
        this.bindEvents();
    }
    
    populateAnchorFilter() {
        const select = document.getElementById('filter-anchor');
        const anchors = [...new Set(this.manager.getSettlements().map(s => s.anchorName))];
        
        anchors.forEach(anchor => {
            const option = document.createElement('option');
            option.value = anchor;
            option.textContent = anchor;
            select.appendChild(option);
        });
    }
    
    bindEvents() {
        document.getElementById('btn-filter').addEventListener('click', () => this.applyFilters());
        document.getElementById('btn-reset').addEventListener('click', () => this.resetFilters());
        document.getElementById('btn-refresh').addEventListener('click', () => this.refresh());
        document.getElementById('btn-export').addEventListener('click', () => this.openExportModal());
        
        document.getElementById('modal-close').addEventListener('click', () => this.closeModal('modal-detail'));
        document.getElementById('modal-note-close').addEventListener('click', () => this.closeModal('modal-note'));
        document.getElementById('modal-export-close').addEventListener('click', () => this.closeModal('modal-export'));
        
        document.getElementById('btn-confirm-settlement').addEventListener('click', () => this.confirmSettlement());
        document.getElementById('btn-add-note').addEventListener('click', () => this.openNoteModal());
        document.getElementById('btn-save-note').addEventListener('click', () => this.saveNote());
        document.getElementById('btn-cancel-note').addEventListener('click', () => this.closeModal('modal-note'));
        document.getElementById('btn-do-export').addEventListener('click', () => this.doExport());
        document.getElementById('btn-cancel-export').addEventListener('click', () => this.closeModal('modal-export'));
        
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('show');
                }
            });
        });
    }
    
    applyFilters() {
        const anchorName = document.getElementById('filter-anchor').value;
        const month = document.getElementById('filter-month').value;
        const status = document.getElementById('filter-status').value;
        const minimum = document.getElementById('filter-minimum').value;
        
        this.currentFilters = {};
        
        if (anchorName) {
            const settlement = this.manager.getSettlements().find(s => s.anchorName === anchorName);
            if (settlement) {
                this.currentFilters.anchorId = settlement.anchorId;
            }
        }
        if (month) {
            this.currentFilters.month = month;
        }
        if (status) {
            this.currentFilters.status = status;
        }
        if (minimum) {
            this.currentFilters.minimumTriggered = minimum === 'true';
        }
        
        this.currentSettlements = this.manager.filterSettlements(this.currentFilters);
        this.render();
    }
    
    resetFilters() {
        document.getElementById('filter-anchor').value = '';
        document.getElementById('filter-month').value = '';
        document.getElementById('filter-status').value = '';
        document.getElementById('filter-minimum').value = '';
        
        this.currentFilters = {};
        this.currentSettlements = this.manager.getSettlements();
        this.render();
    }
    
    refresh() {
        this.currentSettlements = this.manager.getSettlements();
        this.render();
    }
    
    render() {
        this.renderStatistics();
        this.renderSettlementList();
    }
    
    renderStatistics() {
        const stats = this.manager.getStatistics();
        document.getElementById('summary-ready').textContent = stats.ready;
        document.getElementById('summary-review').textContent = stats.review;
        document.getElementById('summary-pending').textContent = stats.pending;
    }
    
    renderSettlementList() {
        const container = document.getElementById('settlement-list');
        
        if (this.currentSettlements.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <div class="empty-state-text">暂无符合条件的结算单</div>
                    <div class="empty-state-hint">请调整筛选条件或刷新数据</div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.currentSettlements.map(s => this.renderSettlementItem(s)).join('');
        
        container.querySelectorAll('.settlement-header').forEach(header => {
            header.addEventListener('click', (e) => {
                if (!e.target.closest('.btn')) {
                    const item = header.closest('.settlement-item');
                    item.classList.toggle('expanded');
                }
            });
        });
        
        container.querySelectorAll('.btn-view-detail').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                this.openDetailModal(id);
            });
        });
        
        container.querySelectorAll('.btn-quick-confirm').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                this.quickConfirm(id);
            });
        });
    }
    
    renderSettlementItem(settlement) {
        const statusText = StatusClassifier.getStatusText(settlement.status);
        const contract = sampleContracts.find(c => c.id === settlement.contractId);
        
        return `
            <div class="settlement-item" data-id="${settlement.id}">
                <div class="settlement-header">
                    <div class="settlement-title">
                        <span class="status-badge ${settlement.status}">${statusText}</span>
                        ${settlement.isMinimumTriggered ? '<span class="minimum-badge">保底已触发</span>' : ''}
                        <strong>${settlement.anchorName}</strong>
                        <span style="color: #6b7280; font-size: 13px;">${settlement.settlementMonth} 结算</span>
                    </div>
                    <div class="settlement-amounts">
                        <div class="amount-item">
                            <div class="amount-label">流水总额</div>
                            <div class="amount-value">¥${settlement.totalStreamRevenue.toLocaleString()}</div>
                        </div>
                        <div class="amount-item">
                            <div class="amount-label">扣款总额</div>
                            <div class="amount-value" style="color: #dc2626;">-¥${settlement.totalDeductions.toLocaleString()}</div>
                        </div>
                        <div class="amount-item">
                            <div class="amount-label">最终结算</div>
                            <div class="amount-value final">¥${settlement.finalAmount.toLocaleString()}</div>
                        </div>
                        <div class="amount-item" style="display: flex; align-items: center; gap: 8px;">
                            <button class="btn btn-sm btn-primary btn-view-detail" data-id="${settlement.id}">查看详情</button>
                            ${settlement.status === 'ready' ? `<button class="btn btn-sm btn-secondary btn-quick-confirm" data-id="${settlement.id}">快速确认</button>` : ''}
                        </div>
                    </div>
                </div>
                <div class="settlement-body">
                    ${settlement.warnings.length > 0 ? `
                        <div class="warning-box">
                            ${settlement.warnings.map(w => `<p>⚠️ ${w}</p>`).join('')}
                        </div>
                    ` : ''}
                    
                    ${settlement.actionHints.length > 0 ? `
                        <div class="warning-box" style="background: #eff6ff; border-color: #93c5fd;">
                            ${settlement.actionHints.map(h => `<p style="color: #1e40af;">💡 ${h}</p>`).join('')}
                        </div>
                    ` : ''}
                    
                    <div class="section-title">合同信息</div>
                    <div class="contract-info">
                        <div class="info-item">
                            <div class="info-label">合同编号</div>
                            <div class="info-value">${contract ? contract.contractNo : '-'}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">保底金额</div>
                            <div class="info-value">¥${contract ? contract.minimumGuarantee.toLocaleString() : '-'}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">佣金比例</div>
                            <div class="info-value">${contract ? (contract.commissionRate * 100) : 0}%</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">平台</div>
                            <div class="info-value">${contract ? contract.platform : '-'}</div>
                        </div>
                    </div>
                    
                    <div class="section-title">保底计算过程</div>
                    <div class="minimum-calculation">
                        <div class="calc-row">
                            <span>直播流水总额</span>
                            <span>¥${settlement.totalStreamRevenue.toLocaleString()}</span>
                        </div>
                        <div class="calc-row">
                            <span>× 佣金比例 (${contract ? (contract.commissionRate * 100) : 0}%)</span>
                            <span>= ¥${settlement.commissionAmount.toLocaleString()}</span>
                        </div>
                        <div class="calc-row">
                            <span>- 扣款总额</span>
                            <span>- ¥${settlement.totalDeductions.toLocaleString()}</span>
                        </div>
                        <div class="calc-row">
                            <span>= 计算后金额</span>
                            <span>¥${(settlement.commissionAmount - settlement.totalDeductions).toLocaleString()}</span>
                        </div>
                        <div class="calc-row">
                            <span>对比保底金额</span>
                            <span>¥${settlement.minimumGuarantee.toLocaleString()}</span>
                        </div>
                        <div class="calc-row final">
                            <span>${settlement.isMinimumTriggered ? '触发保底，按保底发放' : '未触发保底，按计算发放'}</span>
                            <span>= ¥${settlement.finalAmount.toLocaleString()}</span>
                        </div>
                    </div>
                    
                    <div class="section-title">直播流水明细</div>
                    <table class="stream-table">
                        <thead>
                            <tr>
                                <th>日期</th>
                                <th>直播标题</th>
                                <th>礼物收入</th>
                                <th>带货收入</th>
                                <th>其他收入</th>
                                <th>总收入</th>
                                <th>回单状态</th>
                                <th>备注</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${settlement.streams.map(s => `
                                <tr>
                                    <td>${s.streamDate}</td>
                                    <td>${s.streamTitle}</td>
                                    <td>¥${s.giftRevenue.toLocaleString()}</td>
                                    <td>¥${s.goodsRevenue.toLocaleString()}</td>
                                    <td>¥${s.otherRevenue.toLocaleString()}</td>
                                    <td>¥${s.totalRevenue.toLocaleString()}</td>
                                    <td><span class="receipt-badge ${s.receiptStatus}">${this.getReceiptStatusText(s.receiptStatus)}</span></td>
                                    <td>${s.remark || '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    
                    <div class="section-title">扣款明细</div>
                    ${settlement.deductions.map(d => `
                        <div class="deduction-item ${d.isDuplicate ? 'duplicate' : ''}">
                            <div class="deduction-info">
                                <div class="deduction-name">${d.name} ${d.isDuplicate ? '<span style="color: #dc2626; font-size: 12px;">(疑似重复)</span>' : ''}</div>
                                <div class="deduction-source">来源: ${d.source}${d.remark ? ' | ' + d.remark : ''}</div>
                            </div>
                            <div class="deduction-amount">-¥${d.amount.toLocaleString()}</div>
                        </div>
                    `).join('')}
                    
                    ${settlement.notes.length > 0 ? `
                        <div class="section-title" style="margin-top: 24px;">复核备注历史</div>
                        ${settlement.notes.map(n => `
                            <div class="note-item">
                                <div class="note-header">
                                    <span class="note-type">${this.getNoteTypeText(n.type)}</span>
                                    <span class="note-time">${n.createdBy} · ${new Date(n.createdAt).toLocaleString('zh-CN')}</span>
                                </div>
                                <div class="note-content">${n.content}</div>
                            </div>
                        `).join('')}
                    ` : ''}
                    
                    <div class="actions-row">
                        <button class="btn btn-primary btn-view-detail" data-id="${settlement.id}">查看完整详情</button>
                        <button class="btn btn-secondary" onclick="app.openNoteModalFromList('${settlement.id}')">添加备注</button>
                    </div>
                </div>
            </div>
        `;
    }
    
    getReceiptStatusText(status) {
        const map = {
            'received': '已回单',
            'missing': '回单缺失',
            'delayed': '回单延迟'
        };
        return map[status] || status;
    }
    
    getNoteTypeText(type) {
        const map = {
            'normal': '常规备注',
            'deduction': '扣款相关',
            'receipt': '回单问题',
            'minimum': '保底问题'
        };
        return map[type] || type;
    }
    
    openDetailModal(id) {
        this.selectedSettlementId = id;
        const settlement = this.manager.getSettlementById(id);
        if (!settlement) return;
        
        const modal = document.getElementById('modal-detail');
        const body = document.getElementById('modal-detail-body');
        
        body.innerHTML = this.renderSettlementItem(settlement);
        modal.classList.add('show');
        
        setTimeout(() => {
            const item = body.querySelector('.settlement-item');
            if (item) item.classList.add('expanded');
        }, 100);
    }
    
    openNoteModal() {
        document.getElementById('modal-note').classList.add('show');
    }
    
    openNoteModalFromList(id) {
        this.selectedSettlementId = id;
        this.openNoteModal();
    }
    
    openExportModal() {
        document.getElementById('modal-export').classList.add('show');
    }
    
    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('show');
    }
    
    saveNote() {
        const type = document.getElementById('note-type').value;
        const content = document.getElementById('note-content').value;
        
        if (!content.trim()) {
            alert('请输入备注内容');
            return;
        }
        
        this.manager.addNote(this.selectedSettlementId, {
            type,
            content,
            createdBy: '当前用户'
        });
        
        document.getElementById('note-content').value = '';
        this.closeModal('modal-note');
        this.render();
        
        if (document.getElementById('modal-detail').classList.contains('show')) {
            this.openDetailModal(this.selectedSettlementId);
        }
    }
    
    confirmSettlement() {
        if (!this.selectedSettlementId) return;
        
        if (confirm('确定要确认此结算单吗？确认后状态将变更为"已确认"。')) {
            this.manager.confirmSettlement(this.selectedSettlementId, '当前用户');
            this.closeModal('modal-detail');
            this.render();
        }
    }
    
    quickConfirm(id) {
        if (confirm('确定要快速确认此结算单吗？')) {
            this.manager.confirmSettlement(id, '当前用户');
            this.render();
        }
    }
    
    doExport() {
        const scope = document.getElementById('export-scope').value;
        const includeContract = document.getElementById('export-contract').checked;
        const includeStreams = document.getElementById('export-stream').checked;
        const includeDeductions = document.getElementById('export-deduction').checked;
        const includeNotes = document.getElementById('export-notes').checked;
        
        const exportData = this.manager.exportSettlements({
            scope,
            filteredData: scope === 'filtered' ? this.currentSettlements : null,
            includeContract,
            includeStreams,
            includeDeductions,
            includeNotes
        });
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `结算单导出_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.closeModal('modal-export');
        
        console.log('导出数据:', exportData);
        alert(`导出成功！共导出 ${exportData.length} 条结算单数据\n\n(在控制台可查看详细内容，实际项目中可导出为Excel/PDF格式)`);
    }
}

let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new App();
});
