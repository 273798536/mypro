class ProjectClue {
  constructor(data) {
    this.id = data.id;
    this.clueNo = data.clueNo;
    this.projectId = data.projectId;
    this.projectName = data.projectName;
    this.clueType = data.clueType;
    this.description = data.description;
    this.riskLevel = data.riskLevel || 'medium';
    this.relatedGuaranteeIds = data.relatedGuaranteeIds || [];
    this.relatedCounterGuaranteeIds = data.relatedCounterGuaranteeIds || [];
    this.discoveryDate = data.discoveryDate;
    this.status = data.status || 'pending';
    this.impactAnalysis = data.impactAnalysis || '';
    this.handler = data.handler || '';
    this.remarks = data.remarks || [];
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  validate() {
    const errors = [];
    if (!this.clueNo) errors.push('线索编号不能为空');
    if (!this.projectName) errors.push('项目名称不能为空');
    if (!this.clueType) errors.push('线索类型不能为空');
    if (!this.description) errors.push('线索描述不能为空');
    return errors;
  }

  getRiskDescription() {
    const riskMap = {
      low: '低风险 - 需要关注',
      medium: '中风险 - 需要调查核实',
      high: '高风险 - 需要立即采取措施'
    };
    return riskMap[this.riskLevel] || '未知风险';
  }

  toJSON() {
    return {
      id: this.id,
      clueNo: this.clueNo,
      projectId: this.projectId,
      projectName: this.projectName,
      clueType: this.clueType,
      description: this.description,
      riskLevel: this.riskLevel,
      relatedGuaranteeIds: this.relatedGuaranteeIds,
      relatedCounterGuaranteeIds: this.relatedCounterGuaranteeIds,
      discoveryDate: this.discoveryDate,
      status: this.status,
      impactAnalysis: this.impactAnalysis,
      handler: this.handler,
      remarks: this.remarks,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = ProjectClue;
