import { ReconciliationRepo, ExceptionQueueRepo, HistoryChangeLogRepo } from './repo.js';
const CALIBER_LABELS = {
    investor_rating: '投资者风险承受能力评级',
    product_risk_level: '产品风险等级',
    investment_term: '投资期限匹配',
    financial_status: '财务状况',
    investment_experience: '投资经验',
};
const STATUS_LABELS = {
    pending: '待复核',
    reviewing: '复核中',
    passed: '正常通过',
    split_passed: '回款拆分-通过',
    rejected: '复核驳回',
    supplement_required: '待补材料',
    conflict: '双口径冲突',
    split_repayment: '回款拆分记录',
};
const CONCLUSION_LABELS = {
    pass: '放行',
    reject: '驳回',
    supplement: '待补材料',
    escalate: '上报升级',
};
export function getCaliberLabel(c) {
    return CALIBER_LABELS[c];
}
export function getStatusLabel(s) {
    return STATUS_LABELS[s];
}
export function getConclusionLabel(c) {
    return CONCLUSION_LABELS[c];
}
export function detectDualCaliberConflict(primary, secondary) {
    if (!secondary)
        return false;
    const ordered = [primary, secondary].sort();
    const conflictPairs = [
        ['investor_rating', 'product_risk_level'],
        ['financial_status', 'investor_rating'],
        ['investment_experience', 'product_risk_level'],
    ];
    return conflictPairs.some(([a, b]) => a === ordered[0] && b === ordered[1]);
}
export function detectSplitRepayment(parentId, records) {
    if (!parentId)
        return false;
    return records.filter((r) => r.splitParentId === parentId).length >= 2;
}
export function buildExportRows(records) {
    return records.map((r) => ({
        businessNo: r.businessNo,
        businessDate: r.businessDate,
        clientName: r.clientName,
        productName: r.productName,
        amount: r.amount,
        primaryCaliber: CALIBER_LABELS[r.primaryCaliber],
        secondaryCaliber: r.secondaryCaliber ? CALIBER_LABELS[r.secondaryCaliber] : '-',
        status: STATUS_LABELS[r.status],
        conclusion: r.currentConclusion
            ? (r.isSplitRepayment && r.currentConclusion === 'pass' ? '回款拆分放行(非单笔)' : CONCLUSION_LABELS[r.currentConclusion])
            : '-',
        isConflict: r.isDualCaliberConflict,
        isSplit: r.isSplitRepayment,
        remark: r.remark ?? '',
    }));
}
export function reviewRecord(id, conclusion, remark, changeReason, operator, supplementaryMaterials) {
    const existing = ReconciliationRepo.getById(id);
    if (!existing)
        return undefined;
    let newStatus;
    switch (conclusion) {
        case 'pass':
            newStatus = existing.isSplitRepayment ? 'split_passed' : 'passed';
            break;
        case 'reject':
            newStatus = 'rejected';
            break;
        case 'supplement':
            newStatus = 'supplement_required';
            break;
        case 'escalate':
            newStatus = 'reviewing';
            break;
    }
    if (existing.isSplitRepayment && conclusion === 'pass') {
        remark = `【回款拆分-特殊标注】${remark || '已复核，属于回款拆分多笔记录，合并后放行（非单笔正常通过）'}`;
    }
    let previousMaterials;
    const existingHistory = HistoryChangeLogRepo.getByReconciliationId(id);
    for (const h of existingHistory) {
        if (h.newSupplementaryMaterials && h.newSupplementaryMaterials.length > 0) {
            previousMaterials = h.newSupplementaryMaterials;
            break;
        }
        if (h.supplementaryMaterials && h.supplementaryMaterials.length > 0) {
            previousMaterials = h.supplementaryMaterials;
            break;
        }
    }
    HistoryChangeLogRepo.create({
        reconciliationId: id,
        changedBy: operator,
        previousConclusion: existing.currentConclusion,
        newConclusion: conclusion,
        previousRemark: existing.remark,
        newRemark: remark,
        previousStatus: existing.status,
        newStatus,
        changeReason,
        previousSupplementaryMaterials: previousMaterials,
        newSupplementaryMaterials: supplementaryMaterials,
        supplementaryMaterials,
    });
    if (conclusion === 'pass' || conclusion === 'reject') {
        const exc = ExceptionQueueRepo.getByReconciliationId(id);
        if (exc)
            ExceptionQueueRepo.resolve(exc.id, operator);
    }
    return ReconciliationRepo.updateStatusAndConclusion(id, newStatus, conclusion, remark, operator);
}
export function getManagerSummary() {
    const all = ReconciliationRepo.getAll();
    const needSupplement = all.filter((r) => r.status === 'supplement_required' || (r.isDualCaliberConflict && !r.currentConclusion));
    const canRelease = all.filter((r) => r.status === 'passed' || r.status === 'split_passed' || (r.status === 'reviewing' && r.currentConclusion === 'pass'));
    const inConflict = all.filter((r) => r.isDualCaliberConflict && r.status !== 'passed' && r.status !== 'split_passed');
    const splitRepayments = all.filter((r) => r.isSplitRepayment);
    return {
        total: all.length,
        needSupplementCount: needSupplement.length,
        canReleaseCount: canRelease.length,
        inConflictCount: inConflict.length,
        splitRepaymentCount: splitRepayments.length,
        needSupplementList: needSupplement.map((r) => ({
            id: r.id,
            businessNo: r.businessNo,
            clientName: r.clientName,
            productName: r.productName,
            amount: r.amount,
            reason: r.isDualCaliberConflict ? '双口径冲突待裁定' : '待补充证明材料',
            remark: r.remark ?? '',
        })),
        canReleaseList: canRelease.map((r) => ({
            id: r.id,
            businessNo: r.businessNo,
            clientName: r.clientName,
            productName: r.productName,
            amount: r.amount,
            status: r.status,
            isSplitRepayment: r.isSplitRepayment,
            conclusion: r.currentConclusion,
            remark: r.remark ?? '',
        })),
    };
}
export function getExceptionQueueWithRecords() {
    const excList = ExceptionQueueRepo.getAll(true);
    return excList.map((exc) => {
        const rec = ReconciliationRepo.getById(exc.reconciliationId);
        return { exception: exc, record: rec };
    }).filter((x) => x.record);
}
