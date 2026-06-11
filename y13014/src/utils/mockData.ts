import type { WarningRecord } from '@/types';

const billNos = [
  'BP202605120001',
  'BP202605120002',
  'BP202605150003',
  'BP202605180004',
  'BP202605200005',
  'BP202605220006',
  'BP202605250007',
  'BP202605280008',
  'BP202606010009',
  'BP202606030010',
  'BP202606050011',
  'BP202606080012',
];

const customers = [
  '华东钢铁集团有限公司',
  '南方建材股份有限公司',
  '长江物流运输有限公司',
  '北方重工机械集团',
  '东方能源投资有限公司',
  '中联贸易发展有限公司',
  '新世纪电子科技有限公司',
  '远洋船舶制造有限公司',
];

const riskTypes = [
  '质押率超限',
  '票据到期未兑付',
  '承兑人资质预警',
  '票据真实性存疑',
  '重复质押预警',
  '金额异常波动',
];

const descriptions = [
  '该笔票据质押率已超过约定阈值80%，建议追加保证金或补充质押物。',
  '票据已于3日前到期但尚未收到承兑人付款，需尽快联系承兑行核实。',
  '承兑人近期信用评级下调，存在兑付风险，建议持续跟踪。',
  '票据背书链条存在不连续情况，需补充贸易背景材料验证真实性。',
  '系统检测到该票据号在其他台账中出现，疑似重复质押。',
  '本月质押金额较上月环比增长超过200%，触发异常波动预警。',
];

function randomDate(start: Date, end: Date): string {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return d.toISOString().slice(0, 10);
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function generateMockWarnings(): WarningRecord[] {
  const start = new Date('2026-05-01');
  const end = new Date('2026-06-09');
  const statuses: WarningRecord['status'][] = ['confirmed', 'pending', 'returned'];
  const riskLevels: WarningRecord['riskLevel'][] = ['high', 'medium', 'low'];

  return billNos.map((billNo, idx) => {
    const isNeg = idx % 4 === 1 || idx % 5 === 2;
    const status = statuses[idx % 3];
    const riskLevel = riskLevels[idx % 3];
    const createDate = randomDate(start, end);
    const customer = customers[idx % customers.length];
    const riskType = riskTypes[idx % riskTypes.length];
    const description = descriptions[idx % descriptions.length];
    const amount = Math.round((Math.random() * 800 + 100) * 10000) / 100;

    const record: WarningRecord = {
      id: uid(),
      billNo,
      customerName: customer,
      amount: isNeg ? -amount : amount,
      isNegativeCorrection: isNeg,
      status,
      riskType,
      riskLevel,
      createDate,
      description,
      remarks: [
        {
          id: uid(),
          content: '系统自动生成预警，请人工复核。',
          author: '系统',
          createdAt: createDate + ' 09:00',
          isTemporaryLedger: false,
        },
      ],
      screenshots: [
        {
          id: uid(),
          url: `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(
            `银行票据凭证 ${billNo} ${customer} 金融单据扫描件 黑白高清`,
          )}&image_size=landscape_4_3`,
          name: `${billNo}-票据凭证.jpg`,
          uploadAt: createDate + ' 09:05',
          uploadBy: '系统',
        },
      ],
    };

    if (status === 'confirmed') {
      record.confirmDate = createDate;
      record.operator = '老许';
      record.remarks.push({
        id: uid(),
        content: '已核实质押物真实有效，风险可控，予以确认。',
        author: '老许',
        createdAt: createDate + ' 14:30',
        isTemporaryLedger: false,
      });
    }

    if (status === 'pending') {
      record.remarks.push({
        id: uid(),
        content: '缺少贸易合同扫描件，请业务岗补充后再复核。',
        author: '老许',
        createdAt: createDate + ' 11:20',
        isTemporaryLedger: false,
      });
    }

    if (idx === 3) {
      record.remarks.push({
        id: uid(),
        content: '社区公示前临时补充：经查该客户本月台账另有一笔关联冲正交易。',
        author: '台账管理员',
        createdAt: '2026-06-08 16:45',
        isTemporaryLedger: true,
        judgmentImpact: '原风险等级由高风险调整为中风险，原判断依据需补充关联交易审查。',
      });
    }

    return record;
  });
}
