import type {
  Enterprise,
  Person,
  GuaranteeContract,
  LoanBalance,
  RiskLabel,
  InvestigationReport,
  DataRevision,
  RiskScore,
} from '../types'

export const enterprises: Enterprise[] = [
  { id: 'e1', name: '鸿远建设集团', industry: '建筑工程', registration: '91110000MA01A1B2C3', legalRepresentative: '张建国', registeredCapital: 5000, controlledBy: 'p1', dataSource: '工商登记' },
  { id: 'e2', name: '鼎盛地产开发', industry: '房地产', registration: '91310000MA1G2D3E4F', legalRepresentative: '张建国', registeredCapital: 8000, controlledBy: 'p1', dataSource: '工商登记' },
  { id: 'e3', name: '鑫源贸易公司', industry: '商贸流通', registration: '91440000MA5H6J7K8L', legalRepresentative: '李明辉', registeredCapital: 2000, controlledBy: 'p2', dataSource: '工商登记' },
  { id: 'e4', name: '华通科技实业', industry: '信息技术', registration: '91500000MA6I9M0N1P', legalRepresentative: '王丽华', registeredCapital: 3000, controlledBy: 'p3', dataSource: '工商登记' },
  { id: 'e5', name: '永泰矿业集团', industry: '矿产资源', registration: '91610000MA7K3P4Q5R', legalRepresentative: '赵德强', registeredCapital: 12000, controlledBy: 'p4', dataSource: '工商登记' },
  { id: 'e6', name: '万达物流运输', industry: '物流运输', registration: '91720000MA8L6S7T8U', legalRepresentative: '陈志远', registeredCapital: 1500, controlledBy: 'p5', dataSource: '工商登记' },
  { id: 'e7', name: '瑞丰农业发展', industry: '农业', registration: '91830000MA9N0V1W2X', legalRepresentative: '刘秀兰', registeredCapital: 800, controlledBy: 'p6', dataSource: '工商登记' },
  { id: 'e8', name: '中汇金融控股', industry: '金融服务', registration: '91910000MA0P3Y4Z5A', legalRepresentative: '孙伟明', registeredCapital: 20000, controlledBy: 'p7', dataSource: '工商登记' },
  { id: 'e9', name: '天成化工实业', industry: '化工制造', registration: '91020000MA1Q6A7B8C', legalRepresentative: '李明辉', registeredCapital: 6000, controlledBy: 'p2', dataSource: '工商登记' },
  { id: 'e10', name: '长河能源开发', industry: '能源', registration: '91130000MA2R9D0E1F', legalRepresentative: '周国庆', registeredCapital: 15000, controlledBy: 'p8', dataSource: '工商登记' },
  { id: 'e11', name: '锦绣纺织集团', industry: '纺织制造', registration: '91240000MA3S2G3H4I', legalRepresentative: '吴芳芳', registeredCapital: 4000, controlledBy: 'p9', dataSource: '工商登记' },
  { id: 'e12', name: '宏图机械制造', industry: '机械制造', registration: '91350000MA4T5J6K7L', legalRepresentative: '赵德强', registeredCapital: 7000, controlledBy: 'p4', dataSource: '工商登记' },
]

export const persons: Person[] = [
  { id: 'p1', name: '张建国', idNumber: '110101196001011234', relatedEnterprises: ['e1', 'e2'], dataSource: '股权穿透' },
  { id: 'p2', name: '李明辉', idNumber: '440106197505052345', relatedEnterprises: ['e3', 'e9'], dataSource: '股权穿透' },
  { id: 'p3', name: '王丽华', idNumber: '500103198203033456', relatedEnterprises: ['e4'], dataSource: '股权穿透' },
  { id: 'p4', name: '赵德强', idNumber: '610102196808084567', relatedEnterprises: ['e5', 'e12'], dataSource: '股权穿透' },
  { id: 'p5', name: '陈志远', idNumber: '720105199101015678', relatedEnterprises: ['e6'], dataSource: '股权穿透' },
  { id: 'p6', name: '刘秀兰', idNumber: '830106198506066789', relatedEnterprises: ['e7'], dataSource: '股权穿透' },
  { id: 'p7', name: '孙伟明', idNumber: '910107197003037890', relatedEnterprises: ['e8'], dataSource: '股权穿透' },
  { id: 'p8', name: '周国庆', idNumber: '130102196502028901', relatedEnterprises: ['e10'], dataSource: '股权穿透' },
  { id: 'p9', name: '吴芳芳', idNumber: '240103199004040123', relatedEnterprises: ['e11'], dataSource: '股权穿透' },
]

export const guaranteeContracts: GuaranteeContract[] = [
  { id: 'g1', guarantorId: 'e1', guaranteedId: 'e2', guaranteeAmount: 3000, guaranteeType: '连带责任', startDate: '2024-01-15', endDate: '2026-01-15', status: '生效', dataSource: '合同库' },
  { id: 'g2', guarantorId: 'e2', guaranteedId: 'e3', guaranteeAmount: 1500, guaranteeType: '一般保证', startDate: '2024-03-01', endDate: '2026-03-01', status: '生效', dataSource: '合同库' },
  { id: 'g3', guarantorId: 'e3', guaranteedId: 'e1', guaranteeAmount: 2000, guaranteeType: '连带责任', startDate: '2024-02-20', endDate: '2026-02-20', status: '生效', dataSource: '合同库' },
  { id: 'g4', guarantorId: 'e5', guaranteedId: 'e4', guaranteeAmount: 5000, guaranteeType: '抵押担保', startDate: '2023-06-10', endDate: '2025-06-10', status: '生效', dataSource: '合同库' },
  { id: 'g5', guarantorId: 'e4', guaranteedId: 'e6', guaranteeAmount: 800, guaranteeType: '连带责任', startDate: '2024-05-01', endDate: '2026-05-01', status: '生效', dataSource: '合同库' },
  { id: 'g6', guarantorId: 'e8', guaranteedId: 'e5', guaranteeAmount: 8000, guaranteeType: '连带责任', startDate: '2024-01-01', endDate: '2026-12-31', status: '生效', dataSource: '合同库' },
  { id: 'g7', guarantorId: 'e5', guaranteedId: 'e8', guaranteeAmount: 6000, guaranteeType: '质押担保', startDate: '2024-04-15', endDate: '2026-04-15', status: '生效', dataSource: '合同库' },
  { id: 'g8', guarantorId: 'e10', guaranteedId: 'e9', guaranteeAmount: 4000, guaranteeType: '连带责任', startDate: '2024-02-01', endDate: '2026-02-01', status: '生效', dataSource: '合同库' },
  { id: 'g9', guarantorId: 'e9', guaranteedId: 'e10', guaranteeAmount: 3500, guaranteeType: '一般保证', startDate: '2024-03-15', endDate: '2026-03-15', status: '生效', dataSource: '合同库' },
  { id: 'g10', guarantorId: 'e11', guaranteedId: 'e12', guaranteeAmount: 2500, guaranteeType: '抵押担保', startDate: '2024-06-01', endDate: '2026-06-01', status: '生效', dataSource: '合同库' },
  { id: 'g11', guarantorId: 'e12', guaranteedId: 'e5', guaranteeAmount: 4500, guaranteeType: '连带责任', startDate: '2023-12-01', endDate: '2025-12-01', status: '生效', dataSource: '合同库' },
  { id: 'g12', guarantorId: 'e6', guaranteedId: 'e7', guaranteeAmount: 600, guaranteeType: '一般保证', startDate: '2024-07-01', endDate: '2025-07-01', status: '生效', dataSource: '合同库' },
  { id: 'g13', guarantorId: 'e7', guaranteedId: 'e6', guaranteeAmount: 400, guaranteeType: '一般保证', startDate: '2024-08-01', endDate: '2025-08-01', status: '生效', dataSource: '合同库' },
  { id: 'g14', guarantorId: 'e1', guaranteedId: 'e5', guaranteeAmount: 2000, guaranteeType: '连带责任', startDate: '2024-04-01', endDate: '2026-04-01', status: '生效', dataSource: '合同库' },
  { id: 'g15', guarantorId: 'e2', guaranteedId: 'e8', guaranteeAmount: 5000, guaranteeType: '质押担保', startDate: '2024-01-20', endDate: '2026-01-20', status: '诉讼中', dataSource: '合同库' },
]

export const loanBalances: LoanBalance[] = [
  { id: 'l1', enterpriseId: 'e1', outstandingBalance: 2800, totalLimit: 5000, dueDate: '2025-09-30', dataSource: '核心系统' },
  { id: 'l2', enterpriseId: 'e2', outstandingBalance: 6500, totalLimit: 10000, dueDate: '2025-12-31', dataSource: '核心系统' },
  { id: 'l3', enterpriseId: 'e3', outstandingBalance: 1200, totalLimit: 2000, dueDate: '2025-06-30', dataSource: '核心系统' },
  { id: 'l4', enterpriseId: 'e4', outstandingBalance: 2500, totalLimit: 4000, dueDate: '2026-03-31', dataSource: '核心系统' },
  { id: 'l5', enterpriseId: 'e5', outstandingBalance: 9500, totalLimit: 15000, dueDate: '2025-08-31', dataSource: '核心系统' },
  { id: 'l6', enterpriseId: 'e6', outstandingBalance: 800, totalLimit: 1500, dueDate: '2025-11-30', dataSource: '核心系统' },
  { id: 'l7', enterpriseId: 'e7', outstandingBalance: 500, totalLimit: 800, dueDate: '2025-10-31', dataSource: '核心系统' },
  { id: 'l8', enterpriseId: 'e8', outstandingBalance: 15000, totalLimit: 25000, dueDate: '2026-06-30', dataSource: '核心系统' },
  { id: 'l9', enterpriseId: 'e9', outstandingBalance: 4200, totalLimit: 6000, dueDate: '2025-07-31', dataSource: '核心系统' },
  { id: 'l10', enterpriseId: 'e10', outstandingBalance: 11000, totalLimit: 18000, dueDate: '2026-01-31', dataSource: '核心系统' },
  { id: 'l11', enterpriseId: 'e11', outstandingBalance: 3000, totalLimit: 5000, dueDate: '2025-05-31', dataSource: '核心系统' },
  { id: 'l12', enterpriseId: 'e12', outstandingBalance: 5500, totalLimit: 8000, dueDate: '2025-04-30', dataSource: '核心系统' },
]

export const riskLabels: RiskLabel[] = [
  { id: 'r1', targetId: 'e1', labelType: '循环担保', severity: 'high', description: '参与循环担保链：鸿远建设→鼎盛地产→鑫源贸易→鸿远建设', source: '风控模型', createdAt: '2025-01-15T10:00:00Z' },
  { id: 'r2', targetId: 'e2', labelType: '循环担保', severity: 'high', description: '参与循环担保链：鸿远建设→鼎盛地产→鑫源贸易→鸿远建设', source: '风控模型', createdAt: '2025-01-15T10:00:00Z' },
  { id: 'r3', targetId: 'e3', labelType: '循环担保', severity: 'high', description: '参与循环担保链：鸿远建设→鼎盛地产→鑫源贸易→鸿远建设', source: '风控模型', createdAt: '2025-01-15T10:00:00Z' },
  { id: 'r4', targetId: 'e5', labelType: '循环担保', severity: 'high', description: '参与循环担保链：永泰矿业→中汇金融→永泰矿业（互保）', source: '风控模型', createdAt: '2025-02-01T14:00:00Z' },
  { id: 'r5', targetId: 'e8', labelType: '循环担保', severity: 'high', description: '参与循环担保链：永泰矿业→中汇金融→永泰矿业（互保）', source: '风控模型', createdAt: '2025-02-01T14:00:00Z' },
  { id: 'r6', targetId: 'e9', labelType: '循环担保', severity: 'high', description: '参与循环担保链：长河能源→天成化工→长河能源（互保）', source: '风控模型', createdAt: '2025-02-10T09:00:00Z' },
  { id: 'r7', targetId: 'e10', labelType: '循环担保', severity: 'high', description: '参与循环担保链：长河能源→天成化工→长河能源（互保）', source: '风控模型', createdAt: '2025-02-10T09:00:00Z' },
  { id: 'r8', targetId: 'p1', labelType: '同人多企', severity: 'medium', description: '实控人张建国同时控制鸿远建设与鼎盛地产，存在同人多企风险', source: '风控模型', createdAt: '2025-01-20T11:00:00Z' },
  { id: 'r9', targetId: 'p2', labelType: '同人多企', severity: 'medium', description: '实控人李明辉同时控制鑫源贸易与天成化工，存在同人多企风险', source: '风控模型', createdAt: '2025-01-20T11:00:00Z' },
  { id: 'r10', targetId: 'p4', labelType: '同人多企', severity: 'medium', description: '实控人赵德强同时控制永泰矿业与宏图机械，存在同人多企风险', source: '风控模型', createdAt: '2025-01-20T11:00:00Z' },
  { id: 'r11', targetId: 'e5', labelType: '逾期', severity: 'high', description: '贷款余额9500万即将于2025-08-31到期，逾期风险高', source: '风控模型', createdAt: '2025-03-01T08:00:00Z' },
  { id: 'r12', targetId: 'e12', labelType: '逾期', severity: 'medium', description: '贷款余额5500万即将于2025-04-30到期，需关注', source: '风控模型', createdAt: '2025-03-01T08:00:00Z' },
  { id: 'r13', targetId: 'e8', labelType: '诉讼', severity: 'high', description: '与鼎盛地产担保合同纠纷进入诉讼程序', source: '风控模型', createdAt: '2025-02-15T16:00:00Z' },
  { id: 'r14', targetId: 'e6', labelType: '循环担保', severity: 'low', description: '参与小额互保链：万达物流↔瑞丰农业', source: '风控模型', createdAt: '2025-03-05T10:00:00Z' },
  { id: 'r15', targetId: 'e7', labelType: '循环担保', severity: 'low', description: '参与小额互保链：万达物流↔瑞丰农业', source: '风控模型', createdAt: '2025-03-05T10:00:00Z' },
  { id: 'r16', targetId: 'e2', labelType: '经营异常', severity: 'medium', description: '鼎盛地产近期经营收入持续下滑，现金流紧张', source: '尽调团队', createdAt: '2025-03-10T14:00:00Z' },
]

export const investigationReports: InvestigationReport[] = [
  { id: 'ir1', contractId: 'g1', title: '鸿远建设为鼎盛地产担保尽调报告', summary: '鸿远建设与鼎盛地产同为张建国实控，担保链条形成闭环。鸿远建设财务状况尚可，但鼎盛地产现金流紧张，需重点关注。', author: '王尽调', date: '2024-01-10', dataSource: '尽调团队' },
  { id: 'ir2', contractId: 'g6', title: '中汇金融为永泰矿业担保尽调报告', summary: '中汇金融为永泰矿业提供8000万连带责任担保，同时永泰矿业为中汇金融提供6000万质押担保，形成互保。建议审慎评估。', author: '李尽调', date: '2024-03-28', dataSource: '尽调团队' },
  { id: 'ir3', contractId: 'g15', title: '鼎盛地产为中汇金融担保尽调报告', summary: '鼎盛地产为中汇金融提供5000万质押担保，目前因合同纠纷进入诉讼程序。担保代偿风险较高。', author: '张尽调', date: '2024-12-15', dataSource: '尽调团队' },
  { id: 'ir4', contractId: 'g8', title: '长河能源为天成化工担保尽调报告', summary: '长河能源与天成化工形成互保关系，合计担保金额7500万。天成化工实控人李明辉同时控制鑫源贸易，关联风险需关注。', author: '赵尽调', date: '2024-01-25', dataSource: '尽调团队' },
]

export const dataRevisions: DataRevision[] = [
  { id: 'rev1', targetEntityId: 'e2', targetField: 'registeredCapital', oldValue: '5000', newValue: '8000', reason: '工商变更登记，增资3000万', operator: '风控审查员-刘', timestamp: '2025-01-20T14:30:00Z', sourceRef: '工商变更通知书2025-001' },
  { id: 'rev2', targetEntityId: 'g15', targetField: 'status', oldValue: '生效', newValue: '诉讼中', reason: '合同纠纷立案，案号(2025)京0101民初1234号', operator: '风控审查员-陈', timestamp: '2025-02-15T16:00:00Z', sourceRef: '法院立案通知书' },
  { id: 'rev3', targetEntityId: 'e5', targetField: 'outstandingBalance', oldValue: '9000', newValue: '9500', reason: '新增提款500万', operator: '系统同步', timestamp: '2025-03-01T08:00:00Z', sourceRef: '核心系统流水20250301001' },
  { id: 'rev4', targetEntityId: 'e8', targetField: 'riskLabel', oldValue: '诉讼', newValue: '诉讼;循环担保', reason: '新增循环担保风险标签', operator: '风控模型', timestamp: '2025-02-01T14:00:00Z', sourceRef: '风控模型输出20250201' },
]

export const riskScores: RiskScore[] = [
  {
    id: 'rs1', targetId: 'e1', totalScore: 72, calculatedAt: '2025-03-15T10:00:00Z',
    factors: [
      { name: '担保集中度', weight: 0.25, rawValue: 0.6, contribution: 15, anomalySource: null },
      { name: '循环担保参与', weight: 0.30, rawValue: 1.0, contribution: 30, anomalySource: '风控模型-循环担保链检测' },
      { name: '实控人关联风险', weight: 0.20, rawValue: 0.8, contribution: 16, anomalySource: '股权穿透-同人多企标记' },
      { name: '贷款逾期风险', weight: 0.15, rawValue: 0.3, contribution: 4.5, anomalySource: null },
      { name: '行业风险系数', weight: 0.10, rawValue: 0.65, contribution: 6.5, anomalySource: null },
    ],
  },
  {
    id: 'rs2', targetId: 'e5', totalScore: 89, calculatedAt: '2025-03-15T10:00:00Z',
    factors: [
      { name: '担保集中度', weight: 0.25, rawValue: 0.85, contribution: 21.25, anomalySource: '核心系统-贷款余额占比过高' },
      { name: '循环担保参与', weight: 0.30, rawValue: 1.0, contribution: 30, anomalySource: '风控模型-互保链检测' },
      { name: '实控人关联风险', weight: 0.20, rawValue: 0.7, contribution: 14, anomalySource: '股权穿透-同人多企标记' },
      { name: '贷款逾期风险', weight: 0.15, rawValue: 0.95, contribution: 14.25, anomalySource: '风控模型-即将到期预警' },
      { name: '行业风险系数', weight: 0.10, rawValue: 0.95, contribution: 9.5, anomalySource: null },
    ],
  },
  {
    id: 'rs3', targetId: 'e8', totalScore: 85, calculatedAt: '2025-03-15T10:00:00Z',
    factors: [
      { name: '担保集中度', weight: 0.25, rawValue: 0.7, contribution: 17.5, anomalySource: null },
      { name: '循环担保参与', weight: 0.30, rawValue: 1.0, contribution: 30, anomalySource: '风控模型-互保链检测' },
      { name: '实控人关联风险', weight: 0.20, rawValue: 0.4, contribution: 8, anomalySource: null },
      { name: '贷款逾期风险', weight: 0.15, rawValue: 0.6, contribution: 9, anomalySource: null },
      { name: '诉讼风险', weight: 0.10, rawValue: 1.0, contribution: 20.5, anomalySource: '法院-立案通知书' },
    ],
  },
  {
    id: 'rs4', targetId: 'e2', totalScore: 78, calculatedAt: '2025-03-15T10:00:00Z',
    factors: [
      { name: '担保集中度', weight: 0.25, rawValue: 0.75, contribution: 18.75, anomalySource: '核心系统-贷款余额偏高' },
      { name: '循环担保参与', weight: 0.30, rawValue: 1.0, contribution: 30, anomalySource: '风控模型-循环担保链检测' },
      { name: '实控人关联风险', weight: 0.20, rawValue: 0.8, contribution: 16, anomalySource: '股权穿透-同人多企标记' },
      { name: '经营异常', weight: 0.15, rawValue: 0.7, contribution: 10.5, anomalySource: '尽调团队-收入下滑报告' },
      { name: '行业风险系数', weight: 0.10, rawValue: 0.275, contribution: 2.75, anomalySource: null },
    ],
  },
]
