class CounterGuarantee {
  constructor(data) {
    this.id = data.id;
    this.cgNo = data.cgNo;
    this.type = data.type;
    this.provider = data.provider;
    this.currency = data.currency || 'CNY';
    this.amount = parseFloat(data.amount) || 0;
    this.coverageRatio = parseFloat(data.coverageRatio) || 100;
    this.issueDate = data.issueDate;
    this.expiryDate = data.expiryDate;
    this.relatedGuaranteeIds = data.relatedGuaranteeIds || [];
    this.relatedClueIds = data.relatedClueIds || [];
    this.status = data.status || 'valid';
    this.isExpired = data.isExpired || false;
    this.assetDetails = data.assetDetails || {};
    this.valuation = parseFloat(data.valuation) || 0;
    this.remarks = data.remarks || [];
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  validate() {
    const errors = [];
    if (!this.cgNo) errors.push('反担保编号不能为空');
    if (!this.type) errors.push('反担保类型不能为空');
    if (!this.provider) errors.push('反担保提供方不能为空');
    if (this.amount <= 0) errors.push('反担保金额必须大于0');
    if (!this.issueDate) errors.push('开立日期不能为空');
    if (!this.expiryDate) errors.push('到期日期不能为空');
    return errors;
  }

  getTypeDescription() {
    const typeMap = {
      'cash': '现金保证金',
      'bank_guarantee': '银行保函',
      'corporate_guarantee': '企业担保',
      'real_estate': '不动产抵押',
      'equity': '股权质押',
      'other': '其他'
    };
    return typeMap[this.type] || this.type;
  }

  getEffectiveAmount() {
    if (this.isExpired) return 0;
    return (this.amount * this.coverageRatio) / 100;
  }

  checkExpiry(currentDate = new Date()) {
    const expiry = new Date(this.expiryDate);
    this.isExpired = expiry < currentDate;
    return this.isExpired;
  }

  toJSON() {
    return {
      id: this.id,
      cgNo: this.cgNo,
      type: this.type,
      provider: this.provider,
      currency: this.currency,
      amount: this.amount,
      coverageRatio: this.coverageRatio,
      issueDate: this.issueDate,
      expiryDate: this.expiryDate,
      relatedGuaranteeIds: this.relatedGuaranteeIds,
      relatedClueIds: this.relatedClueIds,
      status: this.status,
      isExpired: this.isExpired,
      assetDetails: this.assetDetails,
      valuation: this.valuation,
      remarks: this.remarks,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = CounterGuarantee;
