class GuaranteeCard {
  constructor(data) {
    this.id = data.id;
    this.guaranteeNo = data.guaranteeNo;
    this.applicant = data.applicant;
    this.beneficiary = data.beneficiary;
    this.guaranteeType = data.guaranteeType;
    this.currency = data.currency || 'CNY';
    this.amount = parseFloat(data.amount) || 0;
    this.issueDate = data.issueDate;
    this.expiryDate = data.expiryDate;
    this.claimExpiryDate = data.claimExpiryDate;
    this.projectId = data.projectId;
    this.counterGuaranteeIds = data.counterGuaranteeIds || [];
    this.status = data.status || 'active';
    this.clues = data.clues || [];
    this.remarks = data.remarks || [];
    this.isExpiryMissed = data.isExpiryMissed || false;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  validate() {
    const errors = [];
    if (!this.guaranteeNo) errors.push('保函编号不能为空');
    if (!this.applicant) errors.push('申请人不能为空');
    if (!this.beneficiary) errors.push('受益人不能为空');
    if (this.amount <= 0) errors.push('保函金额必须大于0');
    if (!this.issueDate) errors.push('开立日期不能为空');
    if (!this.expiryDate) errors.push('到期日期不能为空');
    return errors;
  }

  toJSON() {
    return {
      id: this.id,
      guaranteeNo: this.guaranteeNo,
      applicant: this.applicant,
      beneficiary: this.beneficiary,
      guaranteeType: this.guaranteeType,
      currency: this.currency,
      amount: this.amount,
      issueDate: this.issueDate,
      expiryDate: this.expiryDate,
      claimExpiryDate: this.claimExpiryDate,
      projectId: this.projectId,
      counterGuaranteeIds: this.counterGuaranteeIds,
      status: this.status,
      clues: this.clues,
      remarks: this.remarks,
      isExpiryMissed: this.isExpiryMissed,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = GuaranteeCard;
