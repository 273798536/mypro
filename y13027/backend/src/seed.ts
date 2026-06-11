import { ReconciliationRepo, ExceptionQueueRepo } from './repo.js';
import { AppropriatenessCaliber, ReconciliationStatus } from './types.js';
import { detectDualCaliberConflict } from './services.js';

interface SeedRecord {
  businessNo: string;
  businessDate: string;
  clientName: string;
  clientId: string;
  productName: string;
  productCode: string;
  amount: number;
  primaryCaliber: AppropriatenessCaliber;
  secondaryCaliber?: AppropriatenessCaliber;
  status: ReconciliationStatus;
  isSplitRepayment?: boolean;
  splitParentId?: string;
  boundarySampleTag?: string;
  remark?: string;
  exceptionReason?: string;
  exceptionSeverity?: 'high' | 'medium' | 'low';
  exceptionCalibers?: AppropriatenessCaliber[];
}

const SEED_DATA: SeedRecord[] = [
  {
    businessNo: 'BIZ202606090001',
    businessDate: '2026-06-09',
    clientName: '张伟',
    clientId: 'C100001',
    productName: '稳健型理财计划A',
    productCode: 'FIN-A-001',
    amount: 500000,
    primaryCaliber: 'investor_rating',
    secondaryCaliber: 'product_risk_level',
    status: 'conflict',
    remark: '投资者评级C3匹配产品R3，但同时被产品风险等级口径识别，存在双口径重复认定',
    exceptionReason: '同一笔资金被投资者评级和产品风险等级两个口径同时认定，需裁定归属',
    exceptionSeverity: 'high',
    exceptionCalibers: ['investor_rating', 'product_risk_level'],
  },
  {
    businessNo: 'BIZ202606090002',
    businessDate: '2026-06-09',
    clientName: '李娜',
    clientId: 'C100002',
    productName: '进取型股票基金B',
    productCode: 'EQT-B-023',
    amount: 1200000,
    primaryCaliber: 'financial_status',
    secondaryCaliber: 'investor_rating',
    status: 'conflict',
    remark: '财务状况口径与投资者评级口径交叉，金额较大需重点复核',
    exceptionReason: '财务状况与投资者评级双口径冲突，客户资产证明材料待补',
    exceptionSeverity: 'high',
    exceptionCalibers: ['financial_status', 'investor_rating'],
  },
  {
    businessNo: 'BIZ202606090003-1',
    businessDate: '2026-06-08',
    clientName: '王强',
    clientId: 'C100003',
    productName: '债券型组合产品C',
    productCode: 'BND-C-008',
    amount: 300000,
    primaryCaliber: 'investment_term',
    status: 'split_repayment',
    isSplitRepayment: true,
    splitParentId: 'BIZ202606090003',
    remark: '回款拆分记录1/3，原回款90万拆分为三笔入账',
    exceptionReason: '回款拆分多笔记录，需合并判断不得按单笔正常通过',
    exceptionSeverity: 'medium',
    exceptionCalibers: ['investment_term'],
  },
  {
    businessNo: 'BIZ202606090003-2',
    businessDate: '2026-06-08',
    clientName: '王强',
    clientId: 'C100003',
    productName: '债券型组合产品C',
    productCode: 'BND-C-008',
    amount: 300000,
    primaryCaliber: 'investment_term',
    status: 'split_repayment',
    isSplitRepayment: true,
    splitParentId: 'BIZ202606090003',
    remark: '回款拆分记录2/3，原回款90万拆分为三笔入账',
    exceptionReason: '回款拆分多笔记录，需合并判断不得按单笔正常通过',
    exceptionSeverity: 'medium',
    exceptionCalibers: ['investment_term'],
  },
  {
    businessNo: 'BIZ202606090003-3',
    businessDate: '2026-06-08',
    clientName: '王强',
    clientId: 'C100003',
    productName: '债券型组合产品C',
    productCode: 'BND-C-008',
    amount: 300000,
    primaryCaliber: 'investment_term',
    status: 'split_repayment',
    isSplitRepayment: true,
    splitParentId: 'BIZ202606090003',
    remark: '回款拆分记录3/3，原回款90万拆分为三笔入账',
    exceptionReason: '回款拆分多笔记录，需合并判断不得按单笔正常通过',
    exceptionSeverity: 'medium',
    exceptionCalibers: ['investment_term'],
  },
  {
    businessNo: 'BIZ202606090004',
    businessDate: '2026-06-08',
    clientName: '赵敏',
    clientId: 'C100004',
    productName: '私募股权基金D',
    productCode: 'PE-D-005',
    amount: 3000000,
    primaryCaliber: 'investment_experience',
    secondaryCaliber: 'product_risk_level',
    status: 'reviewing',
    boundarySampleTag: '边界样本-合格投资者认定临界值',
    remark: '投资经验满35个月，距合格投资者36个月标准差1个月，属于边界样本',
    exceptionReason: '边界样本：投资经验临界值，需人工判定是否放行',
    exceptionSeverity: 'medium',
    exceptionCalibers: ['investment_experience', 'product_risk_level'],
  },
  {
    businessNo: 'BIZ202606080005',
    businessDate: '2026-06-07',
    clientName: '孙丽',
    clientId: 'C100005',
    productName: '货币市场基金E',
    productCode: 'MMF-E-012',
    amount: 150000,
    primaryCaliber: 'investor_rating',
    status: 'passed',
    remark: '投资者C1匹配R1低风险产品，自动通过',
  },
  {
    businessNo: 'BIZ202606080006',
    businessDate: '2026-06-07',
    clientName: '周杰',
    clientId: 'C100006',
    productName: '混合型产品F',
    productCode: 'MIX-F-020',
    amount: 800000,
    primaryCaliber: 'product_risk_level',
    status: 'supplement_required',
    remark: '产品风险等级R4，客户风险测评已过期，需重新提供风险测评报告',
    exceptionReason: '客户风险测评报告已过期超3个月，需补录最新测评',
    exceptionSeverity: 'low',
    exceptionCalibers: ['product_risk_level'],
  },
  {
    businessNo: 'BIZ202606070007',
    businessDate: '2026-06-06',
    clientName: '吴昊',
    clientId: 'C100007',
    productName: '结构性存款G',
    productCode: 'STR-G-003',
    amount: 500000,
    primaryCaliber: 'investor_rating',
    status: 'passed',
    remark: '投资者C4匹配R3产品，2026-06-07 10:32由阿敏复核放行',
  },
  {
    businessNo: 'BIZ202606070008',
    businessDate: '2026-06-06',
    clientName: '郑雪',
    clientId: 'C100008',
    productName: 'QDII跨境产品H',
    productCode: 'QDII-H-009',
    amount: 2000000,
    primaryCaliber: 'financial_status',
    status: 'pending',
    remark: '跨境产品，金融资产证明待核实',
    exceptionReason: '跨境产品需额外提供外币资产证明材料',
    exceptionSeverity: 'medium',
    exceptionCalibers: ['financial_status'],
  },
  {
    businessNo: 'BIZ202606060009',
    businessDate: '2026-06-05',
    clientName: '陈明',
    clientId: 'C100009',
    productName: '国债逆回购I',
    productCode: 'GOV-I-101',
    amount: 250000,
    primaryCaliber: 'investment_term',
    status: 'passed',
    remark: '7天期逆回购，投资期限完全匹配，自动通过',
  },
  {
    businessNo: 'BIZ202606060010',
    businessDate: '2026-06-05',
    clientName: '黄芳',
    clientId: 'C100010',
    productName: '科创板ETF J',
    productCode: 'ETF-J-045',
    amount: 600000,
    primaryCaliber: 'investment_experience',
    status: 'rejected',
    remark: '投资经验不足6个月，不符合科创板适当性要求，已驳回',
  },
];

export function runSeed() {
  const existing = ReconciliationRepo.getAll();
  if (existing.length > 0) return;

  for (const seed of SEED_DATA) {
    const isConflict = detectDualCaliberConflict(seed.primaryCaliber, seed.secondaryCaliber);
    const rec = ReconciliationRepo.create({
      businessNo: seed.businessNo,
      businessDate: seed.businessDate,
      clientName: seed.clientName,
      clientId: seed.clientId,
      productName: seed.productName,
      productCode: seed.productCode,
      amount: seed.amount,
      currency: 'CNY',
      primaryCaliber: seed.primaryCaliber,
      secondaryCaliber: seed.secondaryCaliber,
      status: seed.status,
      isDualCaliberConflict: isConflict,
      isSplitRepayment: seed.isSplitRepayment ?? false,
      splitParentId: seed.splitParentId,
      boundarySampleTag: seed.boundarySampleTag,
      remark: seed.remark,
      operator: undefined,
    });

    if (seed.exceptionReason) {
      ExceptionQueueRepo.create({
        reconciliationId: rec.id,
        caliberFilter: seed.exceptionCalibers ?? [seed.primaryCaliber],
        reason: seed.exceptionReason,
        severity: seed.exceptionSeverity ?? 'medium',
        isActive: seed.status !== 'passed' && seed.status !== 'rejected',
      });
    }
  }
}
