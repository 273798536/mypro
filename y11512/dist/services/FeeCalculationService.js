"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeeCalculationService = void 0;
const CompensationRecord_1 = require("../entities/CompensationRecord");
const SupervisorComment_1 = require("../entities/SupervisorComment");
class FeeCalculationService {
    static calculateOverdueDays(dueDate, returnDate) {
        const now = returnDate || new Date();
        const due = new Date(dueDate);
        if (now <= due)
            return 0;
        const diffTime = now.getTime() - due.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }
    static calculateOverdueFee(dueDate, returnDate, renewalCount = 0, baseFee) {
        const days = this.calculateOverdueDays(dueDate, returnDate);
        const breakdown = [];
        if (days <= 0) {
            return { fee: 0, days: 0, breakdown };
        }
        let feePerDay = this.OVERDUE_FEE_PER_DAY;
        let fee = days * feePerDay;
        breakdown.push({
            type: 'OVERDUE_BASE',
            description: `逾期 ${days} 天，每天 ${feePerDay} 元`,
            amount: fee,
            source: 'system'
        });
        if (renewalCount > 0) {
            const renewalPenalty = renewalCount * 2;
            fee += renewalPenalty;
            breakdown.push({
                type: 'OVERDUE_RENEWAL_PENALTY',
                description: `续借 ${renewalCount} 次逾期额外处罚`,
                amount: renewalPenalty,
                source: 'system'
            });
        }
        if (baseFee) {
            const maxFee = baseFee * this.MAX_OVERDUE_FEE_MULTIPLIER;
            if (fee > maxFee) {
                breakdown.push({
                    type: 'OVERDUE_CAP',
                    description: `逾期费用封顶（书价${this.MAX_OVERDUE_FEE_MULTIPLIER}倍）`,
                    amount: maxFee - fee,
                    source: 'system'
                });
                fee = maxFee;
            }
        }
        return { fee, days, breakdown };
    }
    static calculateDamageFee(damageLevel, bookPrice = 50) {
        const breakdown = [];
        let fee = 0;
        switch (damageLevel) {
            case 'minor':
                fee = bookPrice * 0.2;
                breakdown.push({ type: 'DAMAGE_MINOR', description: '轻微污损处理费', amount: fee, source: 'system' });
                break;
            case 'medium':
                fee = bookPrice * 0.5;
                breakdown.push({ type: 'DAMAGE_MEDIUM', description: '中度污损修复费', amount: fee, source: 'system' });
                break;
            case 'severe':
                fee = bookPrice * 1.0;
                breakdown.push({ type: 'DAMAGE_SEVERE', description: '严重污损赔偿', amount: fee, source: 'system' });
                break;
            case 'lost':
                fee = bookPrice * 2.0;
                breakdown.push({ type: 'DAMAGE_LOST', description: '遗失赔偿（2倍书价）', amount: fee, source: 'system' });
                break;
        }
        return { fee, breakdown };
    }
    static async calculateTotalFee(application, expressOrders = [], compensationRecords = [], supervisorComments = []) {
        const breakdown = [];
        let totalOverdueFee = 0;
        let totalDamageFee = 0;
        let totalShippingFee = 0;
        if (application.isOverdue && application.dueDate) {
            const overdueResult = this.calculateOverdueFee(application.dueDate, application.returnDate, application.renewalCount);
            totalOverdueFee = overdueResult.fee;
            breakdown.push(...overdueResult.breakdown);
        }
        if (application.isDamaged) {
            const damageResult = this.calculateDamageFee('medium');
            totalDamageFee = damageResult.fee;
            breakdown.push(...damageResult.breakdown);
        }
        compensationRecords.forEach(record => {
            if (record.compensationType === CompensationRecord_1.CompensationType.OVERDUE) {
                totalOverdueFee += record.amount;
                breakdown.push({
                    type: 'COMPENSATION_OVERDUE',
                    description: '逾期赔偿记录',
                    amount: record.amount,
                    source: record.id
                });
            }
            else if (record.compensationType === CompensationRecord_1.CompensationType.DAMAGE || record.compensationType === CompensationRecord_1.CompensationType.LOST) {
                totalDamageFee += record.amount;
                breakdown.push({
                    type: `COMPENSATION_${record.compensationType.toUpperCase()}`,
                    description: '污损/遗失赔偿记录',
                    amount: record.amount,
                    source: record.id
                });
            }
        });
        expressOrders.forEach(order => {
            totalShippingFee += order.fee || 0;
            breakdown.push({
                type: 'SHIPPING',
                description: `快递费 - ${order.expressNo}`,
                amount: order.fee || 0,
                source: order.id
            });
        });
        supervisorComments
            .filter(c => c.commentType === SupervisorComment_1.CommentType.FEE_ADJUSTMENT && c.isDecision)
            .forEach(comment => {
            if (comment.changes && comment.changes.adjustment) {
                const adjustment = comment.changes.adjustment;
                breakdown.push({
                    type: 'FEE_ADJUSTMENT',
                    description: `主管费用调整: ${comment.content}`,
                    amount: adjustment,
                    source: comment.id
                });
                if (adjustment < 0) {
                    if (comment.changes.type === 'overdue')
                        totalOverdueFee += adjustment;
                    else if (comment.changes.type === 'damage')
                        totalDamageFee += adjustment;
                    else
                        totalShippingFee += adjustment;
                }
            }
        });
        const totalFee = Math.max(0, totalOverdueFee + totalDamageFee + totalShippingFee);
        return {
            overdueFee: Math.max(0, totalOverdueFee),
            damageFee: Math.max(0, totalDamageFee),
            shippingFee: Math.max(0, totalShippingFee),
            totalFee,
            breakdown,
            calculationTime: new Date()
        };
    }
}
exports.FeeCalculationService = FeeCalculationService;
FeeCalculationService.OVERDUE_FEE_PER_DAY = 0.5;
FeeCalculationService.MAX_OVERDUE_FEE_MULTIPLIER = 5;
