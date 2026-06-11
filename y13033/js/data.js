const DataStore = (function () {
  const STORAGE_KEY = 'scm_payment_trail_data';
  const CURRENT_USER = '产品财务小周';

  function uid(prefix = 'id') {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function nowISO(offsetDays = 0, offsetHours = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    d.setHours(d.getHours() + offsetHours);
    return d.toISOString();
  }

  function fmtDate(iso) {
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function fmtAmount(n) {
    return '¥' + Number(n).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function buildMockData() {
    const today = new Date();
    const dOffset = (days) => {
      const d = new Date(today);
      d.setDate(d.getDate() - days);
      return d.toISOString().split('T')[0];
    };

    const transactions = [
      {
        id: 'tx_001',
        bankDate: dOffset(5),
        amount: 500000.00,
        counterparty: '深圳市华信电子材料有限公司',
        counterpartyAccount: '6222****8891',
        summary: '供应链预付款-6月订单',
        remark: '',
        remarkHistory: [],
        isSupplementRemark: false,
        createdAt: nowISO(-5),
        createdBy: '系统导入'
      },
      {
        id: 'tx_002',
        bankDate: dOffset(4),
        amount: 320000.00,
        counterparty: '苏州恒瑞塑料制品有限公司',
        counterpartyAccount: '6228****3345',
        summary: '预付款-Q2原材料采购',
        remark: '',
        remarkHistory: [],
        isSupplementRemark: false,
        createdAt: nowISO(-4),
        createdBy: '系统导入'
      },
      {
        id: 'tx_003',
        bankDate: dOffset(3),
        amount: 180000.00,
        counterparty: '广州明辉包装制品厂',
        counterpartyAccount: '6217****6612',
        summary: '包装材料预付款',
        remark: '',
        remarkHistory: [],
        isSupplementRemark: false,
        createdAt: nowISO(-3),
        createdBy: '系统导入'
      },
      {
        id: 'tx_004',
        bankDate: dOffset(2),
        amount: 750000.00,
        counterparty: '东莞盛达五金电子有限公司',
        counterpartyAccount: '6225****7788',
        summary: '预付货款-五金配件',
        remark: '',
        remarkHistory: [],
        isSupplementRemark: false,
        createdAt: nowISO(-2),
        createdBy: '系统导入'
      },
      {
        id: 'tx_005',
        bankDate: dOffset(1),
        amount: 285000.00,
        counterparty: '佛山顺达化工原料有限公司',
        counterpartyAccount: '6222****1122',
        summary: '化工原料预付款',
        remark: '',
        remarkHistory: [],
        isSupplementRemark: false,
        createdAt: nowISO(-1),
        createdBy: '系统导入'
      },
      {
        id: 'tx_006',
        bankDate: dOffset(6),
        amount: 410000.00,
        counterparty: '杭州锐捷机械制造有限公司',
        counterpartyAccount: '6228****5566',
        summary: '设备预付款',
        remark: '',
        remarkHistory: [],
        isSupplementRemark: false,
        createdAt: nowISO(-6),
        createdBy: '系统导入'
      },
      {
        id: 'tx_007',
        bankDate: dOffset(0),
        amount: 420000.00,
        counterparty: '宁波联华纺织面料有限公司',
        counterpartyAccount: '6222****7733',
        summary: '面料采购预付款',
        remark: '',
        remarkHistory: [],
        isSupplementRemark: false,
        createdAt: nowISO(0, -4),
        createdBy: '系统导入'
      }
    ];

    const approvals = [
      {
        id: 'ap_001',
        transactionId: 'tx_001',
        supplierName: '深圳市华信电子材料有限公司',
        contractNo: 'HT-2026-0601',
        prepaidAmount: 500000.00,
        paymentReason: '6月份电子元器件采购订单，合同约定预付50%',
        approver: '张明远',
        approverHistory: [],
        approvalStatus: 'approved',
        judgment: '符合合同约定，同意预付',
        judgmentHistory: [
          {
            id: 'jh_001',
            timestamp: nowISO(-5, -2),
            operator: '产品财务小周',
            oldJudgment: null,
            newJudgment: '符合合同约定，同意预付',
            reason: '初次审核，合同付款条款约定预付50%'
          }
        ],
        screenshots: [
          {
            id: 'ss_001',
            description: '银行回单-6月5日转出50万元至华信电子',
            processingResult: '银行流水与合同预付款条款一致，审批通过',
            uploadedAt: nowISO(-5),
            uploadedBy: '产品财务小周'
          }
        ],
        createdAt: nowISO(-5),
        createdBy: '产品财务小周'
      },
      {
        id: 'ap_002',
        transactionId: 'tx_002',
        supplierName: '苏州恒瑞塑料制品有限公司',
        contractNo: 'HT-2026-0518',
        prepaidAmount: 320000.00,
        paymentReason: 'Q2季度塑料粒子框架采购协议预付款',
        approver: '李建国',
        approverHistory: [],
        approvalStatus: 'approved',
        judgment: '框架协议约定季度预付，金额匹配',
        judgmentHistory: [
          {
            id: 'jh_002',
            timestamp: nowISO(-4, -3),
            operator: '产品财务小周',
            oldJudgment: null,
            newJudgment: '框架协议约定季度预付，金额匹配',
            reason: '初次审核，季度框架采购协议'
          }
        ],
        screenshots: [
          {
            id: 'ss_002',
            description: '银行转账回单-恒瑞塑料32万',
            processingResult: '流水备注"预付款-Q2"与框架协议名称匹配，已审批',
            uploadedAt: nowISO(-4),
            uploadedBy: '产品财务小周'
          }
        ],
        createdAt: nowISO(-4),
        createdBy: '产品财务小周'
      },
      {
        id: 'ap_003',
        transactionId: 'tx_003',
        supplierName: '广州明辉包装制品厂',
        contractNo: 'HT-2026-0603',
        prepaidAmount: 180000.00,
        paymentReason: '新品包装打样及首批量产预付款',
        approver: '王芳',
        approverHistory: [
          {
            id: 'ah_001',
            timestamp: nowISO(-3, -5),
            operator: '产品财务小周',
            oldApprover: '刘强',
            newApprover: '王芳',
            reason: '刘强休产假，审批人变更为王芳（采购部代理主管）',
            sourceLine: '采购部人事通知-20260605'
          }
        ],
        approvalStatus: 'approved',
        judgment: '包装新品打样预付款，符合新品立项流程',
        judgmentHistory: [
          {
            id: 'jh_003',
            timestamp: nowISO(-3, -6),
            operator: '产品财务小周',
            oldJudgment: null,
            newJudgment: '包装新品打样预付款，符合新品立项流程',
            reason: '初次审核'
          }
        ],
        screenshots: [
          {
            id: 'ss_003',
            description: '银行付款凭证-明辉包装18万',
            processingResult: '付款已到账，审批人已由刘强变更为王芳，审批通过',
            uploadedAt: nowISO(-3),
            uploadedBy: '产品财务小周'
          }
        ],
        createdAt: nowISO(-3),
        createdBy: '产品财务小周'
      },
      {
        id: 'ap_004',
        transactionId: 'tx_004',
        supplierName: '东莞盛达五金电子有限公司',
        contractNo: 'HT-2026-0528',
        prepaidAmount: 750000.00,
        paymentReason: '五金配件年度备货预付款',
        approver: '张伟',
        approverHistory: [],
        approvalStatus: 'pending',
        judgment: '金额较大，需补充说明备货依据',
        judgmentHistory: [
          {
            id: 'jh_004',
            timestamp: nowISO(-2, -4),
            operator: '产品财务小周',
            oldJudgment: null,
            newJudgment: '金额较大，需补充说明备货依据',
            reason: '初次审核，单笔超过50万需额外材料'
          },
          {
            id: 'jh_005',
            timestamp: nowISO(-1, +2),
            operator: '产品财务小周',
            oldJudgment: '金额较大，需补充说明备货依据',
            newJudgment: '等待采购补充年度需求预测报告后再审批',
            reason: '与采购沟通后，明确需要补充需求预测'
          }
        ],
        screenshots: [
          {
            id: 'ss_004',
            description: '银行大额转账回单-盛达五金75万',
            processingResult: '待补充需求预测报告，暂挂审批',
            uploadedAt: nowISO(-2),
            uploadedBy: '产品财务小周'
          }
        ],
        createdAt: nowISO(-2),
        createdBy: '产品财务小周'
      },
      {
        id: 'ap_005',
        transactionId: 'tx_005',
        supplierName: '佛山顺达化工原料有限公司',
        contractNo: 'HT-2026-0530',
        prepaidAmount: 285000.00,
        paymentReason: '化工原料紧急补货预付款',
        approver: '陈志刚',
        approverHistory: [],
        approvalStatus: 'modified',
        judgment: '月底临时补备注：实为上月尾款结清，非本月预付款',
        judgmentHistory: [
          {
            id: 'jh_006',
            timestamp: nowISO(-1, -2),
            operator: '产品财务小周',
            oldJudgment: null,
            newJudgment: '紧急补货预付款，流程合规同意支付',
            reason: '初次审核，按紧急补货流程处理'
          },
          {
            id: 'jh_007',
            timestamp: nowISO(0, -3),
            operator: '产品财务小周',
            oldJudgment: '紧急补货预付款，流程合规同意支付',
            newJudgment: '月底临时补备注：实为上月尾款结清，非本月预付款',
            reason: '月底封账前银行补录备注"结清5月货款"，原审批判断需调整。影响：本月预付款统计减少28.5万，计入应付账款核销。',
            changedFields: ['approvalStatus: approved→modified', 'judgment: 紧急补货→实为尾款'],
            impactScope: ['本月预付款汇总统计', '5月应付账款核销', '顺达化工供应商往来对账']
          }
        ],
        screenshots: [
          {
            id: 'ss_005',
            description: '银行流水补录备注截图-顺达化工',
            processingResult: '银行月底补录备注"结清5月货款"，原预付款判定调整为应付尾款核销，已更新审批判断',
            uploadedAt: nowISO(0, -3),
            uploadedBy: '产品财务小周'
          }
        ],
        createdAt: nowISO(-1),
        createdBy: '产品财务小周'
      },
      {
        id: 'ap_006',
        transactionId: 'tx_006',
        supplierName: '杭州锐捷机械制造有限公司',
        contractNo: 'HT-2026-0415',
        prepaidAmount: 410000.00,
        paymentReason: '新生产线设备首批预付款',
        approver: '赵海涛',
        approverHistory: [],
        approvalStatus: 'approved',
        judgment: '设备采购合同约定分三期付款，此为首期30%',
        judgmentHistory: [
          {
            id: 'jh_008',
            timestamp: nowISO(-6, -2),
            operator: '产品财务小周',
            oldJudgment: null,
            newJudgment: '设备采购合同约定分三期付款，此为首期30%',
            reason: '初次审核，设备采购合同分三期'
          }
        ],
        screenshots: [
          {
            id: 'ss_006',
            description: '设备采购银行回单-锐捷机械41万',
            processingResult: '合同首期款，已按设备采购流程审批',
            uploadedAt: nowISO(-6),
            uploadedBy: '产品财务小周'
          }
        ],
        createdAt: nowISO(-6),
        createdBy: '产品财务小周'
      },
      {
        id: 'ap_007',
        transactionId: 'tx_007',
        supplierName: '宁波联华纺织面料有限公司',
        contractNo: 'HT-2026-0608',
        prepaidAmount: 420000.00,
        paymentReason: '6月夏装面料采购预付款，合同约定预付40%',
        approver: '周文斌',
        approverHistory: [],
        approvalStatus: 'approved',
        judgment: '夏装面料采购订单，合同约定预付40%，符合约定',
        judgmentHistory: [
          {
            id: 'jh_009',
            timestamp: nowISO(0, -4),
            operator: '产品财务小周',
            oldJudgment: null,
            newJudgment: '夏装面料采购订单，合同约定预付40%，符合约定',
            reason: '初次审核，面料采购合同'
          }
        ],
        screenshots: [
          {
            id: 'ss_007',
            description: '面料采购银行回单-联华纺织42万',
            processingResult: '付款已到账，合同预付比例40%，审批通过',
            uploadedAt: nowISO(0, -4),
            uploadedBy: '产品财务小周'
          }
        ],
        createdAt: nowISO(0, -4),
        createdBy: '产品财务小周'
      }
    ];

    transactions[4].remark = '结清5月货款';
    transactions[4].remarkHistory = [
      {
        id: 'rh_001',
        timestamp: nowISO(0, -3),
        operator: '产品财务小周',
        oldRemark: '',
        newRemark: '结清5月货款',
        reason: '月底封账前银行补录备注，需同步更新系统。影响：对应审批ap_005原"紧急补货预付款"判定变更为"应付尾款核销"。',
        impactScope: ['本月预付款统计减少¥285,000.00', '审批记录ap_005状态变更为已调整', '供应商顺达化工往来款重分类']
      }
    ];
    transactions[4].isSupplementRemark = true;

    const auditLogs = [
      {
        id: 'audit_001',
        timestamp: nowISO(-3, -5),
        operator: '产品财务小周',
        actionType: 'approver_change',
        entityType: 'approval',
        entityId: 'ap_003',
        fieldName: 'approver',
        oldValue: '刘强',
        newValue: '王芳',
        reason: '刘强休产假，审批人变更为王芳（采购部代理主管）',
        sourceLine: '采购部人事通知-20260605',
        impactScope: ['审批记录ap_003的审批人字段'],
        relatedEntityLink: 'ap_003'
      },
      {
        id: 'audit_002',
        timestamp: nowISO(-1, +2),
        operator: '产品财务小周',
        actionType: 'judgment_change',
        entityType: 'approval',
        entityId: 'ap_004',
        fieldName: 'judgment',
        oldValue: '金额较大，需补充说明备货依据',
        newValue: '等待采购补充年度需求预测报告后再审批',
        reason: '与采购沟通后，明确需要补充需求预测',
        sourceLine: '与采购主管张伟微信沟通记录',
        impactScope: ['审批记录ap_004的判断结论'],
        relatedEntityLink: 'ap_004'
      },
      {
        id: 'audit_003',
        timestamp: nowISO(0, -3),
        operator: '产品财务小周',
        actionType: 'remark_supplement',
        entityType: 'transaction',
        entityId: 'tx_005',
        fieldName: 'remark',
        oldValue: '',
        newValue: '结清5月货款',
        reason: '月底封账前银行补录备注"结清5月货款"，原审批判断为预付款，现需调整为应付尾款核销',
        sourceLine: '银行流水补录备注行-交易日期2026-06-08 顺达化工',
        impactScope: [
          '本月预付款汇总统计：减少¥285,000.00',
          '审批记录ap_005：状态由approved改为modified',
          '审批记录ap_005：判断由预付款改为尾款核销',
          '5月应付账款：需同步核销顺达化工¥285,000.00'
        ],
        relatedEntityLink: 'tx_005'
      },
      {
        id: 'audit_004',
        timestamp: nowISO(0, -3),
        operator: '产品财务小周',
        actionType: 'judgment_change',
        entityType: 'approval',
        entityId: 'ap_005',
        fieldName: 'judgment',
        oldValue: '紧急补货预付款，流程合规同意支付',
        newValue: '月底临时补备注：实为上月尾款结清，非本月预付款',
        reason: '银行流水tx_005月底补录备注"结清5月货款"，触发审批判断调整',
        sourceLine: '银行流水tx_005补录备注触发（关联audit_003）',
        impactScope: [
          '审批状态：approved→modified',
          '金额归属：本月预付款→5月应付核销',
          '汇总统计：本月预付款笔数-1，金额-¥285,000.00'
        ],
        relatedEntityLink: 'ap_005'
      }
    ];

    return {
      transactions,
      approvals,
      auditLogs,
      initializedAt: nowISO()
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('数据加载失败，使用Mock数据', e);
    }
    const mock = buildMockData();
    save(mock);
    return mock;
  }

  function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function reset() {
    localStorage.removeItem(STORAGE_KEY);
    return load();
  }

  let state = load();

  function getState() {
    return state;
  }

  function getTransactions() {
    return state.transactions;
  }

  function getTransactionById(id) {
    return state.transactions.find(t => t.id === id);
  }

  function getApprovals() {
    return state.approvals;
  }

  function getApprovalById(id) {
    return state.approvals.find(a => a.id === id);
  }

  function getApprovalByTransactionId(txId) {
    return state.approvals.find(a => a.transactionId === txId);
  }

  function getAuditLogs() {
    return [...state.auditLogs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  function getAuditLogsByEntity(entityType, entityId) {
    return state.auditLogs.filter(l => l.entityType === entityType && l.entityId === entityId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  function updateTransactionRemark(txId, newRemark, optsOrReason) {
    let opts = {};
    if (typeof optsOrReason === 'string') {
      opts = { reason: optsOrReason, syncApproval: false };
    } else if (optsOrReason && typeof optsOrReason === 'object') {
      opts = optsOrReason;
    }
    const {
      reason = '',
      syncApproval = false,
      approvalNewStatus = null,
      approvalNewJudgment = null,
      approvalJudgmentReason = ''
    } = opts;

    const tx = getTransactionById(txId);
    if (!tx) return null;

    const oldRemark = tx.remark;
    const rh = {
      id: uid('rh'),
      timestamp: nowISO(),
      operator: CURRENT_USER,
      oldRemark,
      newRemark,
      reason: reason || ''
    };
    tx.remarkHistory.push(rh);
    tx.remark = newRemark;
    tx.isSupplementRemark = true;

    const impactScope = [];
    const relatedApproval = getApprovalByTransactionId(txId);
    let approvalUpdateResult = null;

    if (relatedApproval && syncApproval && approvalNewJudgment) {
      const ap = relatedApproval;
      const oldJudgment = ap.judgment;
      const oldStatus = ap.approvalStatus;

      const jh = {
        id: uid('jh'),
        timestamp: nowISO(),
        operator: CURRENT_USER,
        oldJudgment,
        newJudgment: approvalNewJudgment,
        reason: approvalJudgmentReason || reason || `银行流水${txId}补录备注"${newRemark}"，触发审批判断调整`
      };
      ap.judgmentHistory.push(jh);
      ap.judgment = approvalNewJudgment;

      const finalStatus = approvalNewStatus || ap.approvalStatus;
      const statusChanged = approvalNewStatus && approvalNewStatus !== oldStatus;
      if (statusChanged) {
        ap.approvalStatus = approvalNewStatus;
      }

      const changedFields = [];
      if (statusChanged) {
        changedFields.push(`审批状态：${oldStatus} → ${approvalNewStatus}`);
      }
      changedFields.push(`审批判断："${oldJudgment.substring(0, 20)}${oldJudgment.length > 20 ? '...' : ''}" → "${approvalNewJudgment.substring(0, 20)}${approvalNewJudgment.length > 20 ? '...' : ''}"`);
      changedFields.push(`判断历史版本数：${ap.judgmentHistory.length - 1} → ${ap.judgmentHistory.length}`);
      if (ap.prepaidAmount) {
        if (approvalNewStatus === 'modified') {
          changedFields.push(`金额归属：本月预付款 → 不计入本月预付款（金额 ${fmtAmount(ap.prepaidAmount)}）`);
        } else if (oldStatus === 'modified' && approvalNewStatus && approvalNewStatus !== 'modified') {
          changedFields.push(`金额归属：不计入本月预付款 → 本月预付款（金额 ${fmtAmount(ap.prepaidAmount)}）`);
        }
      }
      jh.changedFields = changedFields;

      const txAudit = {
        id: uid('audit'),
        timestamp: nowISO(),
        operator: CURRENT_USER,
        actionType: 'judgment_change',
        entityType: 'approval',
        entityId: ap.id,
        fieldName: 'judgment',
        oldValue: oldJudgment,
        newValue: approvalNewJudgment,
        reason: jh.reason,
        sourceLine: `银行流水${txId}补录备注"${newRemark}"触发（${tx.counterparty}）`,
        impactScope: changedFields,
        relatedEntityLink: ap.id
      };
      state.auditLogs.push(txAudit);

      approvalUpdateResult = { ap, judgmentHistory: jh, audit: txAudit };

      impactScope.push(`关联审批${ap.id}判断已同步更新（${changedFields.length}项变化）`);
      changedFields.forEach(f => impactScope.push('  · ' + f));
    } else if (relatedApproval) {
      impactScope.push(`关联审批${relatedApproval.id}未同步修改（仅记录流水补录，未调整审批）`);
      if (relatedApproval.prepaidAmount) {
        impactScope.push(`预付款金额${fmtAmount(relatedApproval.prepaidAmount)}的归属未变化`);
      }
    }

    impactScope.push(`银行流水${txId}备注补录："${oldRemark || '（空）'}" → "${newRemark}"`);

    const audit = {
      id: uid('audit'),
      timestamp: nowISO(),
      operator: CURRENT_USER,
      actionType: 'remark_supplement',
      entityType: 'transaction',
      entityId: txId,
      fieldName: 'remark',
      oldValue: oldRemark,
      newValue: newRemark,
      reason: reason || '',
      sourceLine: `银行流水${txId} - ${tx.counterparty}`,
      impactScope,
      relatedEntityLink: txId
    };
    state.auditLogs.push(audit);
    rh.impactScope = impactScope;

    save(state);
    return { tx, audit, approvalUpdate: approvalUpdateResult };
  }

  function updateApprovalJudgment(approvalId, newJudgment, newStatus, reason) {
    const ap = getApprovalById(approvalId);
    if (!ap) return null;

    const oldJudgment = ap.judgment;
    const oldStatus = ap.approvalStatus;

    const jh = {
      id: uid('jh'),
      timestamp: nowISO(),
      operator: CURRENT_USER,
      oldJudgment,
      newJudgment,
      reason: reason || ''
    };
    ap.judgmentHistory.push(jh);
    ap.judgment = newJudgment;

    if (newStatus) {
      ap.approvalStatus = newStatus;
    }

    const impactScope = [];
    if (oldStatus !== ap.approvalStatus) {
      impactScope.push(`审批状态：${oldStatus} → ${ap.approvalStatus}`);
    }
    impactScope.push(`判断结论已更新（共${ap.judgmentHistory.length}个历史版本）`);
    if (ap.prepaidAmount) {
      impactScope.push(`预付款金额${fmtAmount(ap.prepaidAmount)}的统计分类可能受影响`);
    }

    const tx = getTransactionById(ap.transactionId);
    const audit = {
      id: uid('audit'),
      timestamp: nowISO(),
      operator: CURRENT_USER,
      actionType: 'judgment_change',
      entityType: 'approval',
      entityId: approvalId,
      fieldName: 'judgment',
      oldValue: oldJudgment,
      newValue: newJudgment,
      reason: reason || '',
      sourceLine: tx ? `银行流水${tx.id} - ${tx.counterparty}` : '',
      impactScope,
      relatedEntityLink: approvalId
    };
    state.auditLogs.push(audit);
    jh.changedFields = impactScope;

    save(state);
    return { ap, audit };
  }

  function updateApprover(approvalId, newApprover, reason, sourceLine) {
    const ap = getApprovalById(approvalId);
    if (!ap) return null;

    const oldApprover = ap.approver;
    const ah = {
      id: uid('ah'),
      timestamp: nowISO(),
      operator: CURRENT_USER,
      oldApprover,
      newApprover,
      reason: reason || '',
      sourceLine: sourceLine || ''
    };
    ap.approverHistory.push(ah);
    ap.approver = newApprover;

    const impactScope = [`审批记录${approvalId}的审批人：${oldApprover} → ${newApprover}`];
    if (ah.sourceLine) {
      impactScope.push(`来源依据：${ah.sourceLine}`);
    }

    const audit = {
      id: uid('audit'),
      timestamp: nowISO(),
      operator: CURRENT_USER,
      actionType: 'approver_change',
      entityType: 'approval',
      entityId: approvalId,
      fieldName: 'approver',
      oldValue: oldApprover,
      newValue: newApprover,
      reason: reason || '',
      sourceLine: sourceLine || '',
      impactScope,
      relatedEntityLink: approvalId
    };
    state.auditLogs.push(audit);

    save(state);
    return { ap, audit };
  }

  function addScreenshot(approvalId, description, processingResult) {
    const ap = getApprovalById(approvalId);
    if (!ap) return null;

    const ss = {
      id: uid('ss'),
      description,
      processingResult,
      uploadedAt: nowISO(),
      uploadedBy: CURRENT_USER
    };
    ap.screenshots.push(ss);
    save(state);
    return ss;
  }

  function filterData(filters) {
    const { dateFrom, dateTo, supplier, status, onlyChanged } = filters || {};
    let approvals = [...state.approvals];

    if (dateFrom) {
      approvals = approvals.filter(a => {
        const tx = getTransactionById(a.transactionId);
        return tx && tx.bankDate >= dateFrom;
      });
    }
    if (dateTo) {
      approvals = approvals.filter(a => {
        const tx = getTransactionById(a.transactionId);
        return tx && tx.bankDate <= dateTo;
      });
    }
    if (supplier) {
      const kw = supplier.trim().toLowerCase();
      if (kw) {
        approvals = approvals.filter(a =>
          a.supplierName.toLowerCase().includes(kw)
        );
      }
    }
    if (status && status !== 'all') {
      approvals = approvals.filter(a => a.approvalStatus === status);
    }
    if (onlyChanged) {
      approvals = approvals.filter(a =>
        a.judgmentHistory.length > 1 ||
        a.approverHistory.length > 0
      );
    }

    const txIds = approvals.map(a => a.transactionId);
    const transactions = state.transactions.filter(t => txIds.includes(t.id));

    return { approvals, transactions };
  }

  function computeSummary(filteredApprovals) {
    const totalCount = filteredApprovals.length;
    const totalAmount = filteredApprovals.reduce((s, a) => s + a.prepaidAmount, 0);
    const approved = filteredApprovals.filter(a => a.approvalStatus === 'approved');
    const pending = filteredApprovals.filter(a => a.approvalStatus === 'pending');
    const modified = filteredApprovals.filter(a => a.approvalStatus === 'modified');
    const rejected = filteredApprovals.filter(a => a.approvalStatus === 'rejected');
    const changedCount = filteredApprovals.filter(a =>
      a.judgmentHistory.length > 1 || a.approverHistory.length > 0
    ).length;

    return {
      totalCount,
      totalAmount,
      approvedCount: approved.length,
      approvedAmount: approved.reduce((s, a) => s + a.prepaidAmount, 0),
      pendingCount: pending.length,
      pendingAmount: pending.reduce((s, a) => s + a.prepaidAmount, 0),
      modifiedCount: modified.length,
      modifiedAmount: modified.reduce((s, a) => s + a.prepaidAmount, 0),
      rejectedCount: rejected.length,
      rejectedAmount: rejected.reduce((s, a) => s + a.prepaidAmount, 0),
      changedCount
    };
  }

  return {
    CURRENT_USER,
    uid,
    nowISO,
    fmtDate,
    fmtAmount,
    load,
    save,
    reset,
    getState,
    getTransactions,
    getTransactionById,
    getApprovals,
    getApprovalById,
    getApprovalByTransactionId,
    getAuditLogs,
    getAuditLogsByEntity,
    updateTransactionRemark,
    updateApprovalJudgment,
    updateApprover,
    addScreenshot,
    filterData,
    computeSummary
  };
})();
