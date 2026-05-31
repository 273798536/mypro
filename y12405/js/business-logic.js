class SettlementCalculator {
    static calculateSettlement(contract, streams, deductions) {
        const totalStreamRevenue = streams.reduce((sum, s) => sum + s.totalRevenue, 0);
        const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
        const commissionAmount = totalStreamRevenue * contract.commissionRate;
        const isMinimumTriggered = commissionAmount - totalDeductions < contract.minimumGuarantee;
        const finalAmount = isMinimumTriggered ? contract.minimumGuarantee : (commissionAmount - totalDeductions);
        
        return {
            totalStreamRevenue,
            totalDeductions,
            commissionAmount,
            isMinimumTriggered,
            finalAmount
        };
    }
}

class ReceiptChecker {
    static checkReceipts(streams) {
        const missing = streams.filter(s => s.receiptStatus === 'missing');
        const delayed = streams.filter(s => s.receiptStatus === 'delayed');
        
        return {
            missingCount: missing.length,
            delayedCount: delayed.length,
            missingStreams: missing,
            delayedStreams: delayed,
            hasIssues: missing.length > 0 || delayed.length > 0
        };
    }
    
    static getReceiptHints(streams) {
        const hints = [];
        const check = this.checkReceipts(streams);
        
        if (check.missingCount > 0) {
            const titles = check.missingStreams.map(s => s.streamTitle).join('、');
            hints.push(`请联系平台运营补回以下直播回单：${titles}`);
        }
        if (check.delayedCount > 0) {
            hints.push(`关注延迟回单的到账情况，可暂缓结算或按部分到账金额处理`);
        }
        
        return hints;
    }
}

class DeductionAuditor {
    static detectDuplicates(deductions) {
        const duplicates = [];
        const seen = new Map();
        
        deductions.forEach((d, index) => {
            const key = `${d.name}_${d.amount}_${d.type}`;
            if (seen.has(key)) {
                const firstIndex = seen.get(key);
                deductions[firstIndex].isDuplicate = true;
                deductions[index].isDuplicate = true;
                deductions[firstIndex].duplicateWith = deductions[index].id;
                deductions[index].duplicateWith = deductions[firstIndex].id;
                duplicates.push(deductions[firstIndex], deductions[index]);
            } else {
                seen.set(key, index);
            }
        });
        
        return {
            hasDuplicates: duplicates.length > 0,
            duplicateCount: duplicates.length / 2,
            duplicates: duplicates
        };
    }
    
    static getDuplicateHints(deductions) {
        const hints = [];
        const result = this.detectDuplicates(deductions);
        
        if (result.hasDuplicates) {
            hints.push(`检测到 ${result.duplicateCount} 笔疑似重复扣款，请与扣款来源部门确认处理方式，建议删除重复项`);
        }
        
        return hints;
    }
}

class StatusClassifier {
    static classify(settlement) {
        const receiptCheck = ReceiptChecker.checkReceipts(settlement.streams);
        const deductionCheck = DeductionAuditor.detectDuplicates(settlement.deductions);
        
        if (receiptCheck.missingCount > 0 || deductionCheck.hasDuplicates) {
            return 'pending';
        }
        
        if (receiptCheck.delayedCount > 0 || settlement.isMinimumTriggered) {
            return 'review';
        }
        
        return 'ready';
    }
    
    static getStatusText(status) {
        const map = {
            'ready': '可直接结算',
            'review': '需财务确认',
            'pending': '暂不能结算',
            'confirmed': '已确认'
        };
        return map[status] || status;
    }
}

class WarningGenerator {
    static generate(settlement) {
        const warnings = [];
        const receiptCheck = ReceiptChecker.checkReceipts(settlement.streams);
        const deductionCheck = DeductionAuditor.detectDuplicates(settlement.deductions);
        
        if (receiptCheck.missingCount > 0) {
            warnings.push(`存在 ${receiptCheck.missingCount} 场直播回单缺失`);
        }
        if (receiptCheck.delayedCount > 0) {
            warnings.push(`存在 ${receiptCheck.delayedCount} 场直播回单延迟`);
        }
        if (deductionCheck.hasDuplicates) {
            warnings.push(`检测到 ${deductionCheck.duplicateCount} 笔疑似重复扣款`);
        }
        if (settlement.isMinimumTriggered) {
            warnings.push(`本月流水未达标，已触发保底机制`);
        }
        
        return warnings;
    }
}

class HintGenerator {
    static generate(settlement) {
        const hints = [];
        
        hints.push(...ReceiptChecker.getReceiptHints(settlement.streams));
        hints.push(...DeductionAuditor.getDuplicateHints(settlement.deductions));
        
        if (settlement.isMinimumTriggered) {
            hints.push(`请复核保底条款，确认主播本月直播时长/场次是否符合保底要求`);
        }
        
        return hints;
    }
}

class SettlementManager {
    constructor() {
        this.settlements = [];
    }
    
    loadSettlements() {
        this.settlements = generateSampleSettlements();
        return this.settlements;
    }
    
    getSettlements() {
        return this.settlements;
    }
    
    getSettlementById(id) {
        return this.settlements.find(s => s.id === id);
    }
    
    filterSettlements(filters) {
        let result = [...this.settlements];
        
        if (filters.anchorId) {
            result = result.filter(s => s.anchorId === filters.anchorId);
        }
        if (filters.month) {
            result = result.filter(s => s.settlementMonth === filters.month);
        }
        if (filters.status) {
            result = result.filter(s => s.status === filters.status);
        }
        if (filters.minimumTriggered !== undefined) {
            result = result.filter(s => s.isMinimumTriggered === filters.minimumTriggered);
        }
        
        return result;
    }
    
    confirmSettlement(id, confirmedBy) {
        const settlement = this.getSettlementById(id);
        if (settlement) {
            settlement.status = 'confirmed';
            settlement.confirmedAt = new Date().toISOString();
            settlement.confirmedBy = confirmedBy;
        }
        return settlement;
    }
    
    addNote(settlementId, noteData) {
        const settlement = this.getSettlementById(settlementId);
        if (settlement) {
            const note = new ReviewNote({
                id: `note_${Date.now()}`,
                settlementId: settlementId,
                type: noteData.type,
                content: noteData.content,
                createdBy: noteData.createdBy || '当前用户'
            });
            settlement.notes.push(note);
        }
        return settlement;
    }
    
    getStatistics() {
        const ready = this.settlements.filter(s => s.status === 'ready').length;
        const review = this.settlements.filter(s => s.status === 'review').length;
        const pending = this.settlements.filter(s => s.status === 'pending').length;
        
        return { ready, review, pending };
    }
    
    exportSettlements(options) {
        let dataToExport = [];
        
        switch (options.scope) {
            case 'ready':
                dataToExport = this.settlements.filter(s => s.status === 'ready');
                break;
            case 'filtered':
                dataToExport = options.filteredData || this.settlements;
                break;
            default:
                dataToExport = this.settlements;
        }
        
        return dataToExport.map(s => this.formatForExport(s, options));
    }
    
    formatForExport(settlement, options) {
        const result = {
            结算单号: settlement.id,
            主播: settlement.anchorName,
            结算月份: settlement.settlementMonth,
            状态: StatusClassifier.getStatusText(settlement.status),
            直播流水总额: settlement.totalStreamRevenue,
            扣款总额: settlement.totalDeductions,
            佣金金额: settlement.commissionAmount,
            保底金额: settlement.minimumGuarantee,
            保底触发: settlement.isMinimumTriggered ? '是' : '否',
            最终结算金额: settlement.finalAmount
        };
        
        if (options.includeContract) {
            const contract = sampleContracts.find(c => c.id === settlement.contractId);
            if (contract) {
                result['合同编号'] = contract.contractNo;
                result['佣金比例'] = `${contract.commissionRate * 100}%`;
                result['保底金额(合同)'] = contract.minimumGuarantee;
            }
        }
        
        if (options.includeStreams) {
            result['直播明细'] = settlement.streams.map(s => ({
                日期: s.streamDate,
                标题: s.streamTitle,
                礼物收入: s.giftRevenue,
                带货收入: s.goodsRevenue,
                其他收入: s.otherRevenue,
                总收入: s.totalRevenue,
                回单状态: s.receiptStatus,
                备注: s.remark
            }));
        }
        
        if (options.includeDeductions) {
            result['扣款明细'] = settlement.deductions.map(d => ({
                名称: d.name,
                金额: d.amount,
                类型: d.type,
                来源: d.source,
                重复扣款: d.isDuplicate ? '是' : '否',
                备注: d.remark
            }));
        }
        
        if (options.includeNotes) {
            result['复核备注'] = settlement.notes.map(n => ({
                类型: n.type,
                内容: n.content,
                创建人: n.createdBy,
                创建时间: n.createdAt
            }));
        }
        
        return result;
    }
}
