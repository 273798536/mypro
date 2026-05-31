class AnchorContract {
    constructor(data) {
        this.id = data.id;
        this.anchorId = data.anchorId;
        this.anchorName = data.anchorName;
        this.contractNo = data.contractNo;
        this.minimumGuarantee = data.minimumGuarantee;
        this.commissionRate = data.commissionRate;
        this.startDate = data.startDate;
        this.endDate = data.endDate;
        this.platform = data.platform;
        this.status = data.status || 'active';
    }
}

class LiveStream {
    constructor(data) {
        this.id = data.id;
        this.anchorId = data.anchorId;
        this.streamDate = data.streamDate;
        this.streamTitle = data.streamTitle;
        this.duration = data.duration;
        this.giftRevenue = data.giftRevenue;
        this.goodsRevenue = data.goodsRevenue;
        this.otherRevenue = data.otherRevenue;
        this.totalRevenue = data.totalRevenue || (data.giftRevenue + data.goodsRevenue + data.otherRevenue);
        this.receiptStatus = data.receiptStatus;
        this.receiptDate = data.receiptDate;
        this.platform = data.platform;
        this.remark = data.remark || '';
    }
}

class Deduction {
    constructor(data) {
        this.id = data.id;
        this.settlementId = data.settlementId;
        this.name = data.name;
        this.amount = data.amount;
        this.type = data.type;
        this.source = data.source;
        this.sourceId = data.sourceId;
        this.remark = data.remark || '';
        this.isDuplicate = data.isDuplicate || false;
        this.duplicateWith = data.duplicateWith || null;
    }
}

class ReviewNote {
    constructor(data) {
        this.id = data.id;
        this.settlementId = data.settlementId;
        this.type = data.type;
        this.content = data.content;
        this.createdBy = data.createdBy;
        this.createdAt = data.createdAt || new Date().toISOString();
    }
}

class Settlement {
    constructor(data) {
        this.id = data.id;
        this.anchorId = data.anchorId;
        this.anchorName = data.anchorName;
        this.contractId = data.contractId;
        this.settlementMonth = data.settlementMonth;
        this.streams = data.streams || [];
        this.deductions = data.deductions || [];
        this.notes = data.notes || [];
        
        this.totalStreamRevenue = data.totalStreamRevenue || 0;
        this.totalDeductions = data.totalDeductions || 0;
        this.commissionAmount = data.commissionAmount || 0;
        this.minimumGuarantee = data.minimumGuarantee || 0;
        this.isMinimumTriggered = data.isMinimumTriggered || false;
        this.finalAmount = data.finalAmount || 0;
        
        this.status = data.status || 'pending';
        this.warnings = data.warnings || [];
        this.actionHints = data.actionHints || [];
        
        this.createdAt = data.createdAt || new Date().toISOString();
        this.confirmedAt = data.confirmedAt || null;
        this.confirmedBy = data.confirmedBy || null;
    }
}

const DeductionType = {
    PLATFORM_FEE: 'platform_fee',
    TAX: 'tax',
    PENALTY: 'penalty',
    OTHER: 'other'
};

const ReceiptStatus = {
    RECEIVED: 'received',
    MISSING: 'missing',
    DELAYED: 'delayed'
};

const SettlementStatus = {
    READY: 'ready',
    REVIEW: 'review',
    PENDING: 'pending',
    CONFIRMED: 'confirmed'
};
