const CASES = [
  {
    id: "C001",
    name: "王建国",
    gender: "男",
    age: 45,
    industry: "餐饮",
    industryRisk: "low",
    loanAmount: 500000,
    loanPurpose: "门店装修扩建",
    creditScore: 720,
    overdueRecord: false,
    overdueMasked: false,
    collateral: {
      type: "房产抵押",
      value: 800000,
      expiryDate: "2027-06-01",
      expired: false
    },
    cashFlow: {
      monthly: [42000, 45000, 43000, 47000, 44000, 46000, 48000, 45000, 44000, 47000, 46000, 45000],
      gapMonths: [],
      avgMonthly: 45167,
      trend: "stable"
    },
    correctDecision: "approve",
    difficulty: 1,
    narrative: "老牌餐饮店主，经营8年，流水稳定，房产抵押充足。"
  },
  {
    id: "C002",
    name: "李美华",
    gender: "女",
    age: 38,
    industry: "服装零售",
    industryRisk: "medium",
    loanAmount: 800000,
    loanPurpose: "开拓线上渠道",
    creditScore: 650,
    overdueRecord: false,
    overdueMasked: false,
    collateral: {
      type: "车辆抵押",
      value: 350000,
      expiryDate: "2027-03-15",
      expired: false
    },
    cashFlow: {
      monthly: [38000, 36000, 35000, 0, 0, 0, 0, 28000, 30000, 32000, 31000, 29000],
      gapMonths: [4, 5, 6, 7],
      avgMonthly: 24833,
      trend: "declining"
    },
    correctDecision: "reject",
    difficulty: 2,
    narrative: "服装零售店主，线下客流骤降后流水中断4个月，虽有恢复但担保不足。"
  },
  {
    id: "C003",
    name: "赵强",
    gender: "男",
    age: 52,
    industry: "房地产中介",
    industryRisk: "high",
    loanAmount: 2000000,
    loanPurpose: "资金周转",
    creditScore: 680,
    overdueRecord: true,
    overdueMasked: true,
    overdueDetail: "2025年Q3信用卡逾期2期，2025年Q4贷款逾期1期",
    collateral: {
      type: "房产抵押",
      value: 2500000,
      expiryDate: "2026-12-01",
      expired: false
    },
    cashFlow: {
      monthly: [85000, 82000, 78000, 65000, 55000, 42000, 38000, 35000, 30000, 28000, 25000, 22000],
      gapMonths: [],
      avgMonthly: 48750,
      trend: "sharp_decline"
    },
    correctDecision: "reject",
    difficulty: 3,
    narrative: "房地产中介老板，行业下行，流水持续骤降，逾期记录被遮盖。"
  },
  {
    id: "C004",
    name: "陈晓燕",
    gender: "女",
    age: 41,
    industry: "制造业",
    industryRisk: "medium",
    loanAmount: 1200000,
    loanPurpose: "采购原材料",
    creditScore: 700,
    overdueRecord: false,
    overdueMasked: false,
    collateral: {
      type: "设备抵押",
      value: 1000000,
      expiryDate: "2026-03-01",
      expired: true
    },
    cashFlow: {
      monthly: [62000, 58000, 60000, 59000, 61000, 63000, 58000, 60000, 61000, 59000, 62000, 60000],
      gapMonths: [],
      avgMonthly: 60167,
      trend: "stable"
    },
    correctDecision: "conditional",
    difficulty: 2,
    narrative: "制造业业主，流水尚可，但设备抵押已过期3个月，需补充担保。"
  },
  {
    id: "C005",
    name: "刘志远",
    gender: "男",
    age: 35,
    industry: "科技初创",
    industryRisk: "high",
    loanAmount: 3000000,
    loanPurpose: "产品研发投入",
    creditScore: 580,
    overdueRecord: true,
    overdueMasked: true,
    overdueDetail: "2025年多次短期借贷逾期，最长逾期45天",
    collateral: {
      type: "股权质押",
      value: 1500000,
      expiryDate: "2025-09-01",
      expired: true
    },
    cashFlow: {
      monthly: [120000, 95000, 80000, 0, 0, 0, 0, 45000, 30000, 0, 0, 15000],
      gapMonths: [3, 4, 5, 6, 9, 10],
      avgMonthly: 40417,
      trend: "sharp_decline"
    },
    correctDecision: "reject",
    difficulty: 3,
    narrative: "科技初创公司CEO，信用分低，流水断档6个月，股权质押过期，逾期被遮盖。多重风险叠加。"
  }
];

const RULES = [
  {
    id: "R1",
    name: "信用分门槛",
    description: "信用分低于600分，不予批准",
    threshold: 600,
    riskLevel: "high",
    appliesTo: ["approve", "conditional"],
    affectedResults: ["审批结论", "利率定价", "授信额度"]
  },
  {
    id: "R2",
    name: "逾期记录一票否决",
    description: "存在逾期记录直接拒绝，不可有条件批准",
    riskLevel: "high",
    maskable: true,
    appliesTo: ["approve", "conditional"],
    affectedResults: ["审批结论", "担保要求", "贷后监控等级"]
  },
  {
    id: "R3",
    name: "担保有效性检查",
    description: "担保/抵押已过期的，需补充有效担保后方可有条件批准",
    riskLevel: "medium",
    appliesTo: ["approve"],
    affectedResults: ["审批结论", "担保要求", "风险覆盖比例"]
  },
  {
    id: "R4",
    name: "流水断档严重",
    description: "连续断档超过2个月，直接拒绝",
    threshold: 2,
    riskLevel: "high",
    appliesTo: ["approve", "conditional"],
    affectedResults: ["审批结论", "还款能力评估", "授信额度"]
  },
  {
    id: "R5",
    name: "流水短期断档",
    description: "断档1-2个月，有条件批准并加强贷后监控",
    riskLevel: "medium",
    appliesTo: ["approve"],
    affectedResults: ["还款能力评估", "贷后监控等级"]
  },
  {
    id: "R6",
    name: "贷款金额与流水匹配",
    description: "贷款金额超过月均流水18倍，偿债能力不足",
    threshold: 18,
    riskLevel: "high",
    appliesTo: ["approve", "conditional"],
    affectedResults: ["授信额度", "还款能力评估", "审批结论"]
  },
  {
    id: "R7",
    name: "高风险行业预警",
    description: "高风险行业且流水下滑，需降级处理",
    riskLevel: "medium",
    appliesTo: ["approve"],
    affectedResults: ["审批结论", "利率定价", "行业风险敞口"]
  }
];

const DECISION_LABELS = {
  approve: "批准",
  conditional: "有条件批准",
  reject: "拒绝"
};

const RISK_LEVELS = {
  high: { label: "高风险", color: "#ef4444", icon: "🔴" },
  medium: { label: "中风险", color: "#f59e0b", icon: "🟡" },
  low: { label: "低风险", color: "#22c55e", icon: "🟢" }
};

const PHASES = [
  { id: "card", name: "客户卡", description: "查看客户基本信息和申请资料" },
  { id: "cashflow", name: "流水线索", description: "分析银行流水和资金趋势" },
  { id: "overdue", name: "逾期揭示", description: "逾期遮盖下的隐藏风险" }
];

const TIME_LIMIT = 90;
const TIME_BONUS_THRESHOLD = 60;
const TIME_PENALTY_PER_10S = 3;
const TIME_BONUS_PER_10S = 2;
const MAX_TIME_BONUS = 10;

const SCORING = {
  correctApprove: 10,
  correctReject: 15,
  correctConditional: 12,
  wrongApprove: -20,
  wrongReject: -10,
  wrongConditionalShouldReject: -15,
  wrongConditionalShouldApprove: -5
};
