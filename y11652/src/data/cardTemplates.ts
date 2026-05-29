import type { Card, CardSource, MaterialType, RetentionPeriod, SecurityLevel } from '@/types';

export interface CardTemplate {
  source: CardSource;
  materialType: MaterialType;
  titles: string[];
  contents: string[];
  correctSecurityLevel: SecurityLevel;
  correctRetentionPeriod: RetentionPeriod;
  hints: string[];
}

export const CARD_TEMPLATES: CardTemplate[] = [
  {
    source: 'file_card',
    materialType: 'contract',
    titles: ['采购合同-2024-001', '服务协议-技术支持', '租赁合同-办公场地', '劳动合同-技术部', '合作框架协议'],
    contents: [
      '甲方：某某科技有限公司，乙方：某某供应商有限公司。合同金额：50万元。签订日期：2024年3月15日。有效期：2024年3月15日至2025年3月15日。',
      '甲方因业务发展需要，委托乙方提供技术支持服务，服务期限一年，服务费按月支付。',
      '租赁协议，租赁面积500平方米，月租金3万元，租赁期限3年。',
      '员工劳动合同，期限3年，试用期3个月，岗位：高级工程师。',
      '甲乙双方经友好协商，就长期合作达成框架协议，具体项目另行签订补充协议。',
    ],
    correctSecurityLevel: 'internal',
    correctRetentionPeriod: '30years',
    hints: ['合同涉及双方权利义务', '有法律效力的文件', '涉及经济往来'],
  },
  {
    source: 'file_card',
    materialType: 'invoice',
    titles: ['增值税专用发票-001234', '普通发票-服务费', '增值税普通发票-办公用品', '电子发票-差旅费', '专用发票-设备采购'],
    contents: [
      '发票代码：1100123456，发票号码：001234，开票日期：2024年5月20日，金额：50000元，税率13%，税额：6500元，价税合计：56500元。',
      '开票方：某某咨询有限公司，收票方：我司，项目：咨询服务费，金额：8000元。',
      '购买办公用品一批，明细：打印纸、墨盒、文件夹等，合计金额：2340元。',
      '员工差旅费报销，包含：交通费1200元，住宿费800元，餐饮费500元，合计2500元。',
      '采购办公设备采购发票，设备名称：多功能一体机，金额：12000元，税额：1560元。',
    ],
    correctSecurityLevel: 'internal',
    correctRetentionPeriod: '30years',
    hints: ['财务凭证', '有税号和金额', '报销凭证'],
  },
  {
    source: 'file_card',
    materialType: 'confidential',
    titles: ['核心技术方案-V2.0', '客户数据统计分析报告', '公司战略规划2025', '技术秘密-算法文档', '商业秘密-客户名单'],
    contents: [
      '本文件包含公司核心产品的技术架构、核心算法、技术实现细节。仅限研发部核心人员查阅。保密级别：机密。',
      '包含公司全体客户的详细信息、消费行为分析、潜在客户挖掘分析。数据敏感，严禁外传。保密级别：机密。',
      '公司未来三年的发展战略、市场布局、产品规划、投资计划。董事会内部讨论稿。保密级别：机密。',
      '核心算法的数学模型、参数配置、优化方案。属于公司核心技术资产。保密级别：机密。',
      '重点客户名单、联系方式、合作详情。保密级别：机密。',
    ],
    correctSecurityLevel: 'confidential',
    correctRetentionPeriod: 'permanent',
    hints: ['标注保密字样', '涉及商业秘密/技术秘密', '仅限特定人员查阅'],
  },
  {
    source: 'archive_box',
    materialType: 'contract',
    titles: ['合同档案盒-2024-Q1', '合同档案盒-采购类', '合同档案盒-人事类', '合同档案盒-服务类'],
    contents: [
      '2024年第一季度签订的所有合同文件，共计15份合同原件。',
      '采购类合同归档，包含供应商合同、采购订单、验收单等。',
      '人事合同档案盒，包含员工劳动合同、保密协议、竞业限制协议等。',
      '服务类合同归档，包含技术服务、咨询服务、物业服务等合同。',
    ],
    correctSecurityLevel: 'internal',
    correctRetentionPeriod: '30years',
    hints: ['合同类档案归档', '档案盒标签', '多份合同集中归档'],
  },
  {
    source: 'archive_box',
    materialType: 'invoice',
    titles: ['发票档案盒-2024-05', '发票档案盒-进项税', '发票档案盒-费用类'],
    contents: [
      '2024年5月开具和收到的所有发票，按发票存根联、抵扣联。',
      '进项税发票抵扣联，按月装订归档。',
      '费用类发票归档，差旅费、办公费、招待费等发票。',
    ],
    correctSecurityLevel: 'internal',
    correctRetentionPeriod: '30years',
    hints: ['财务凭证归档', '发票存根联', '税务相关凭证'],
  },
  {
    source: 'security_tag',
    materialType: 'confidential',
    titles: ['保密文件-秘密级'],
    contents: [
      '秘密级保密文件，仅限相关业务人员查阅，不得擅自复制或传播。',
    ],
    correctSecurityLevel: 'secret',
    correctRetentionPeriod: 'permanent',
    hints: ['保密标识', '保密级别标注', '查阅限制'],
  },
  {
    source: 'security_tag',
    materialType: 'confidential',
    titles: ['保密文件-机密级'],
    contents: [
      '机密级保密文件，仅限部门经理及以上人员查阅，需要审批登记。',
    ],
    correctSecurityLevel: 'confidential',
    correctRetentionPeriod: 'permanent',
    hints: ['保密标识', '保密级别标注', '查阅限制'],
  },
  {
    source: 'security_tag',
    materialType: 'confidential',
    titles: ['保密文件-绝密级'],
    contents: [
      '绝密级保密文件，仅限公司高管查阅，严禁复印、摘抄，阅后立即归还。',
    ],
    correctSecurityLevel: 'top_secret',
    correctRetentionPeriod: 'permanent',
    hints: ['保密标识', '保密级别标注', '查阅限制'],
  },
  {
    source: 'retention_tag',
    materialType: 'contract',
    titles: ['保管期限标签-永久'],
    contents: [
      '本档案为永久保管档案，不得销毁，需长期保存。',
    ],
    correctSecurityLevel: 'internal',
    correctRetentionPeriod: 'permanent',
    hints: ['保管期限标识', '期限计算起点', '销毁限制'],
  },
  {
    source: 'retention_tag',
    materialType: 'contract',
    titles: ['保管期限标签-30年'],
    contents: [
      '本档案保管期限30年，自归档之日起计算，期满后按规定销毁。',
    ],
    correctSecurityLevel: 'internal',
    correctRetentionPeriod: '30years',
    hints: ['保管期限标识', '期限计算起点', '销毁限制'],
  },
  {
    source: 'retention_tag',
    materialType: 'invoice',
    titles: ['保管期限标签-30年'],
    contents: [
      '财务凭证保管期限30年，期满后按规定程序销毁。',
    ],
    correctSecurityLevel: 'internal',
    correctRetentionPeriod: '30years',
    hints: ['财务档案期限', '税务档案期限'],
  },
  {
    source: 'retention_tag',
    materialType: 'invoice',
    titles: ['保管期限标签-10年'],
    contents: [
      '银行对账单、银行存款余额调节表保管期限10年，期满后按规定销毁。',
    ],
    correctSecurityLevel: 'internal',
    correctRetentionPeriod: '10years',
    hints: ['财务档案期限', '税务档案期限'],
  },
  {
    source: 'borrow_request',
    materialType: 'contract',
    titles: ['借阅申请单-合同2024-001', '借阅申请单-合同2024-002'],
    contents: [
      '借阅人：张三，部门：销售部，借阅日期：2024年6月10日，用途：客户沟通，预计归还日期：2024年6月17日。',
      '借阅人：李四，部门：财务部，借阅日期：2024年6月15日，用途：审计查阅，预计归还日期：2024年6月20日。',
    ],
    correctSecurityLevel: 'internal',
    correctRetentionPeriod: '30years',
    hints: ['有借阅人信息', '借阅日期', '借阅用途'],
  },
  {
    source: 'borrow_request',
    materialType: 'confidential',
    titles: ['借阅申请单-保密文件-001'],
    contents: [
      '借阅人：王五，部门：研发部，借阅日期：2024年6月12日，用途：项目开发参考，审批人：技术总监，预计归还日期：2024年6月15日。',
    ],
    correctSecurityLevel: 'confidential',
    correctRetentionPeriod: 'permanent',
    hints: ['保密文件借阅', '需要审批', '借阅人权限'],
  },
  {
    source: 'archive_report',
    materialType: 'contract',
    titles: ['归档报告-合同类2024'],
    contents: [
      '2024年度合同类档案归档报告，共计归档合同45份，其中永久保管5份，30年保管40份。',
    ],
    correctSecurityLevel: 'internal',
    correctRetentionPeriod: 'permanent',
    hints: ['归档统计报告', '归档数量统计', '保管期限汇总'],
  },
  {
    source: 'archive_report',
    materialType: 'invoice',
    titles: ['归档报告-发票类2024'],
    contents: [
      '2024年度发票类档案归档报告，共计归档发票1200份，保管期限30年。',
    ],
    correctSecurityLevel: 'internal',
    correctRetentionPeriod: 'permanent',
    hints: ['归档统计报告', '归档数量统计', '保管期限汇总'],
  },
  {
    source: 'archive_report',
    materialType: 'confidential',
    titles: ['归档报告-保密类2024'],
    contents: [
      '2024年度保密档案归档报告，共计归档保密文件28份，其中秘密级15份，机密级10份，绝密级3份。',
    ],
    correctSecurityLevel: 'confidential',
    correctRetentionPeriod: 'permanent',
    hints: ['归档统计报告', '归档数量统计', '保管期限汇总'],
  },
];

export const BORROWERS = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十'];
export const DEPARTMENTS = ['销售部', '财务部', '研发部', '人事部', '行政部', '技术部'];

export function generateRandomCard(id: string, template: CardTemplate, hasBorrowRequest: boolean): Card {
  const title = template.titles[Math.floor(Math.random() * template.titles.length)];
  const content = template.contents[Math.floor(Math.random() * template.contents.length)];
  
  const card: Card = {
    id,
    source: template.source,
    materialType: template.materialType,
    title,
    content,
    correctSecurityLevel: template.correctSecurityLevel,
    correctRetentionPeriod: template.correctRetentionPeriod,
    hasBorrowRequest,
    hints: template.hints,
  };

  if (hasBorrowRequest) {
    card.borrower = BORROWERS[Math.floor(Math.random() * BORROWERS.length)];
    const borrowDate = new Date();
    borrowDate.setDate(borrowDate.getDate() - Math.floor(Math.random() * 30));
    card.borrowDate = borrowDate.toISOString().split('T')[0];
  }

  return card;
}
