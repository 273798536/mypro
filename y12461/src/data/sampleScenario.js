const sampleScenario = {
  name: '基础风控培训场景',
  description: '包含典型反担保过期、到期漏看、线索关联等风控问题的培训场景',
  
  guarantees: [
    {
      guaranteeNo: 'GB-2024-001',
      applicant: '华建工程有限公司',
      beneficiary: '城市发展集团',
      guaranteeType: 'bid',
      currency: 'CNY',
      amount: 5000000,
      issueDate: '2024-01-15',
      expiryDate: '2024-06-30',
      claimExpiryDate: '2024-07-15',
      projectId: 'PRJ-001',
      counterGuaranteeIds: ['CG-001', 'CG-002'],
      isExpiryMissed: false,
      remarks: [{ content: '投标保函，项目状态正常', timestamp: '2024-01-15T10:00:00Z' }]
    },
    {
      guaranteeNo: 'GB-2024-002',
      applicant: '盛达建设集团',
      beneficiary: '市政投资公司',
      guaranteeType: 'performance',
      currency: 'CNY',
      amount: 20000000,
      issueDate: '2024-02-20',
      expiryDate: '2024-12-31',
      claimExpiryDate: '2025-01-15',
      projectId: 'PRJ-002',
      counterGuaranteeIds: ['CG-003'],
      isExpiryMissed: true,
      remarks: [{ content: '履约保函，需关注施工进度', timestamp: '2024-02-20T14:00:00Z' }]
    },
    {
      guaranteeNo: 'GB-2024-003',
      applicant: '泰禾地产开发公司',
      beneficiary: '土地储备中心',
      guaranteeType: 'payment',
      currency: 'CNY',
      amount: 8000000,
      issueDate: '2024-03-10',
      expiryDate: '2024-09-10',
      claimExpiryDate: '2024-09-25',
      projectId: 'PRJ-003',
      counterGuaranteeIds: ['CG-004'],
      isExpiryMissed: false,
      remarks: [{ content: '预付款保函', timestamp: '2024-03-10T09:00:00Z' }]
    }
  ],

  clues: [
    {
      clueNo: 'CL-001',
      projectId: 'PRJ-001',
      projectName: '市中心商务楼项目',
      clueType: 'financial',
      description: '华建工程近期资金链紧张，有多笔逾期贷款记录',
      riskLevel: 'high',
      relatedGuaranteeIds: ['GB-2024-001'],
      relatedCounterGuaranteeIds: ['CG-001'],
      discoveryDate: '2024-05-01',
      status: 'pending',
      impactAnalysis: '可能影响投标保证金的安全性，建议追加反担保',
      handler: ''
    },
    {
      clueNo: 'CL-002',
      projectId: 'PRJ-002',
      projectName: '城市地铁3号线项目',
      clueType: 'schedule',
      description: '盛达建设施工进度滞后计划30%，可能触发履约索赔',
      riskLevel: 'high',
      relatedGuaranteeIds: ['GB-2024-002'],
      relatedCounterGuaranteeIds: ['CG-003'],
      discoveryDate: '2024-04-15',
      status: 'investigating',
      impactAnalysis: '若进度持续滞后，业主可能提出保函索赔',
      handler: '张经理'
    },
    {
      clueNo: 'CL-003',
      projectId: 'PRJ-003',
      projectName: '城东新区土地开发项目',
      clueType: 'market',
      description: '泰禾地产在售楼盘销售不及预期，现金流承压',
      riskLevel: 'medium',
      relatedGuaranteeIds: ['GB-2024-003'],
      relatedCounterGuaranteeIds: [],
      discoveryDate: '2024-05-10',
      status: 'pending',
      impactAnalysis: '需关注土地出让金支付能力',
      handler: ''
    }
  ],

  counterGuarantees: [
    {
      cgNo: 'CG-001',
      type: 'cash',
      provider: '华建工程有限公司',
      currency: 'CNY',
      amount: 2500000,
      coverageRatio: 50,
      issueDate: '2024-01-15',
      expiryDate: '2024-06-30',
      relatedGuaranteeIds: ['GB-2024-001'],
      relatedClueIds: ['CL-001'],
      isExpired: false,
      valuation: 2500000
    },
    {
      cgNo: 'CG-002',
      type: 'bank_guarantee',
      provider: '工商银行XX支行',
      currency: 'CNY',
      amount: 2500000,
      coverageRatio: 50,
      issueDate: '2024-01-15',
      expiryDate: '2024-05-15',
      relatedGuaranteeIds: ['GB-2024-001'],
      relatedClueIds: ['CL-001'],
      isExpired: true,
      valuation: 2500000
    },
    {
      cgNo: 'CG-003',
      type: 'real_estate',
      provider: '盛达建设集团',
      currency: 'CNY',
      amount: 15000000,
      coverageRatio: 75,
      issueDate: '2024-02-20',
      expiryDate: '2024-08-20',
      relatedGuaranteeIds: ['GB-2024-002'],
      relatedClueIds: ['CL-002'],
      isExpired: true,
      valuation: 20000000,
      assetDetails: {
        address: 'XX市XX区XX路123号办公楼',
        area: 5000,
        type: 'commercial'
      }
    },
    {
      cgNo: 'CG-004',
      type: 'corporate_guarantee',
      provider: '泰禾集团总公司',
      currency: 'CNY',
      amount: 8000000,
      coverageRatio: 100,
      issueDate: '2024-03-10',
      expiryDate: '2025-03-10',
      relatedGuaranteeIds: ['GB-2024-003'],
      relatedClueIds: ['CL-003'],
      isExpired: false,
      valuation: 8000000
    }
  ]
};

module.exports = sampleScenario;
