import {
  MemberAccount,
  MileageTransaction,
  ExchangeOrder,
  ExpireCalendar,
  LiabilityRecord,
  BadRecord,
  Activity,
  EstimateDetail,
  AccountType,
} from '@/types';
import { generateId, formatDate } from '@/utils/date';
import { parseNumber } from '@/utils/number';

const memberNames = [
  '张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十',
  '郑明', '王芳', '李华', '张伟', '刘洋', '陈静', '杨帆', '黄磊',
  '周杰', '吴昊', '郑凯', '王丽', '李娜', '张强', '赵敏', '孙丽',
];

const accountTypes: AccountType[] = ['普通', '银卡', '金卡', '白金卡'];

function randomDate(start: Date, end: Date): string {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return formatDate(date, 'yyyy-MM-dd');
}

function generateMemberAccounts(): MemberAccount[] {
  const accounts: MemberAccount[] = [];
  
  for (let i = 0; i < 50; i++) {
    const memberNo = `MEM-${String(10000 + i).padStart(6, '0')}`;
    const totalMiles = Math.floor(Math.random() * 100000) + 10000;
    const usedMiles = Math.floor(totalMiles * Math.random() * 0.6);
    const remainingMiles = totalMiles - usedMiles;
    const accountType = accountTypes[Math.floor(Math.random() * accountTypes.length)];
    
    accounts.push({
      id: generateId('MEM'),
      memberNo,
      memberName: memberNames[i % memberNames.length],
      accountType,
      totalMiles,
      usedMiles,
      remainingMiles,
      expireDate: randomDate(new Date(2024, 0, 1), new Date(2026, 11, 31)),
      lastTransactionDate: randomDate(new Date(2024, 0, 1), new Date(2026, 4, 28)),
      createTime: formatDate(new Date(2024, 0, 1), 'yyyy-MM-dd HH:mm:ss'),
      updateTime: formatDate(new Date(2026, 4, 28), 'yyyy-MM-dd HH:mm:ss'),
      remark: i % 7 === 0 ? '重要客户' : undefined,
    });
  }
  
  accounts.push({
    id: generateId('MEM'),
    memberNo: 'TEST-2024-EXPIRE',
    memberName: '测试过期用户',
    accountType: '银卡',
    totalMiles: 85000,
    usedMiles: 35000,
    remainingMiles: 50000,
    expireDate: formatDate(new Date(2024, 5, 15), 'yyyy-MM-dd'),
    lastTransactionDate: formatDate(new Date(2024, 3, 20), 'yyyy-MM-dd'),
    createTime: formatDate(new Date(2023, 0, 15), 'yyyy-MM-dd HH:mm:ss'),
    updateTime: formatDate(new Date(2024, 3, 20), 'yyyy-MM-dd HH:mm:ss'),
    remark: '测试账户-用于验证里程过期失败路径',
  });
  
  return accounts;
}

function generateTransactions(accounts: MemberAccount[]): MileageTransaction[] {
  const transactions: MileageTransaction[] = [];
  const activities = generateActivities();
  
  accounts.forEach((account, idx) => {
    const transCount = Math.floor(Math.random() * 8) + 3;
    
    for (let i = 0; i < transCount; i++) {
      const isExpireTest = account.memberNo === 'TEST-2024-EXPIRE' && i === transCount - 1;
      
      let transactionType: MileageTransaction['transactionType'] = '累积';
      let businessType: MileageTransaction['businessType'] = '正常';
      let description = '航班飞行累积';
      let miles = Math.floor(Math.random() * 5000) + 500;
      
      if (i === transCount - 2 && Math.random() > 0.7) {
        transactionType = '兑换';
        description = '兑换机票';
        miles = -Math.floor(Math.random() * 10000) - 1000;
      }
      
      if (isExpireTest) {
        transactionType = '过期';
        description = '里程过期自动清零';
        miles = -50000;
      }
      
      if (i === 2 && idx % 8 === 0 && !isExpireTest) {
        businessType = '升舱';
        transactionType = '退回';
        description = '升舱服务取消，里程退回';
        miles = Math.floor(Math.random() * 3000) + 1000;
      }
      
      if (i === 3 && idx % 6 === 0 && !isExpireTest) {
        businessType = '活动赠送';
        description = `活动双倍积分赠送 - ${activities[idx % activities.length].name}`;
        miles = Math.floor(Math.random() * 4000) + 2000;
      }
      
      transactions.push({
        id: generateId('TRX'),
        memberNo: account.memberNo,
        transactionType,
        businessType,
        miles,
        transactionDate: randomDate(new Date(2024, 0, 1), new Date(2026, 4, 28)),
        orderNo: transactionType === '兑换' ? `ORD-${generateId('ORD').slice(0, 12)}` : undefined,
        activityId: businessType === '活动赠送' ? activities[idx % activities.length].id : undefined,
        description,
        operator: ['系统', '张会计', '李会计', '王主管'][Math.floor(Math.random() * 4)],
        status: '已完成',
        remark: isExpireTest ? '测试过期流水' : undefined,
      });
    }
  });
  
  return transactions;
}

function generateOrders(accounts: MemberAccount[]): ExchangeOrder[] {
  const orders: ExchangeOrder[] = [];
  const statuses: ExchangeOrder['status'][] = ['待审核', '已审核', '已兑付', '已退回'];
  
  accounts.slice(0, 35).forEach((account, idx) => {
    const orderCount = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < orderCount; i++) {
      const isUpgradeRefund = idx % 5 === 0 && i === 0;
      
      orders.push({
        id: generateId('ORD'),
        orderNo: `ORD-${String(202400000 + idx * 10 + i).padStart(10, '0')}`,
        memberNo: account.memberNo,
        exchangeType: isUpgradeRefund ? '升舱' : ['机票', '礼品', '积分'][Math.floor(Math.random() * 3)] as ExchangeOrder['exchangeType'],
        miles: Math.floor(Math.random() * 15000) + 5000,
        amount: Math.floor(Math.random() * 5000) + 500,
        applyDate: randomDate(new Date(2024, 0, 1), new Date(2026, 4, 28)),
        status: isUpgradeRefund ? '已退回' : statuses[Math.floor(Math.random() * statuses.length)],
        auditor: ['李主管', '王经理', '张总监'][Math.floor(Math.random() * 3)],
        auditTime: randomDate(new Date(2024, 0, 1), new Date(2026, 4, 28)),
        payoutTime: idx % 3 !== 0 ? randomDate(new Date(2024, 0, 1), new Date(2026, 4, 28)) : undefined,
        rejectReason: isUpgradeRefund ? '航班取消，升舱服务未使用' : undefined,
        remark: isUpgradeRefund ? '升舱退回，里程需单独复核' : undefined,
      });
    }
  });
  
  return orders;
}

function generateExpireCalendars(accounts: MemberAccount[]): ExpireCalendar[] {
  const calendars: ExpireCalendar[] = [];
  
  const expireAccounts = accounts.filter(a => {
    const expireDate = new Date(a.expireDate);
    const today = new Date();
    return expireDate < today || a.memberNo === 'TEST-2024-EXPIRE';
  });
  
  expireAccounts.forEach((account, idx) => {
    const isTest = account.memberNo === 'TEST-2024-EXPIRE';
    
    calendars.push({
      id: generateId('EXP'),
      memberNo: account.memberNo,
      batchNo: `EXP-BATCH-2024-${String(idx + 1).padStart(4, '0')}`,
      expireDate: account.expireDate,
      milesToExpire: account.remainingMiles,
      actualExpiredMiles: isTest ? 50000 : Math.floor(account.remainingMiles * (0.7 + Math.random() * 0.3)),
      isExpired: true,
      expireReason: isTest ? '测试过期-里程有效期已满' : '里程有效期已满，未在有效期内使用',
      processStatus: idx % 3 === 0 ? '已冲回' : idx % 3 === 1 ? '已豁免' : '未处理',
      processor: idx % 3 !== 2 ? ['张会计', '李主管', '王经理'][idx % 3] : undefined,
      processTime: idx % 3 !== 2 ? randomDate(new Date(2025, 0, 1), new Date(2026, 4, 28)) : undefined,
      remark: isTest ? '测试过期日历记录' : undefined,
    });
  });
  
  return calendars;
}

function generateActivities(): Activity[] {
  return [
    {
      id: 'ACT-2024-SPRING',
      name: '春季双倍积分活动',
      startDate: '2024-03-01',
      endDate: '2024-05-31',
      multiplier: 2,
      description: '活动期间飞行累积享双倍积分',
    },
    {
      id: 'ACT-2024-SUMMER',
      name: '暑期特惠活动',
      startDate: '2024-07-01',
      endDate: '2024-08-31',
      multiplier: 2,
      description: '暑期出行享双倍积分',
    },
    {
      id: 'ACT-2024-ANNIVERSARY',
      name: '周年庆双倍积分',
      startDate: '2024-10-01',
      endDate: '2024-10-31',
      multiplier: 2,
      description: '公司周年庆，所有累积双倍',
    },
  ];
}

function calculateEstimateDetail(remainingMiles: number, accountType: AccountType): EstimateDetail {
  const coefficientMap: Record<AccountType, number> = {
    '普通': 0.08,
    '银卡': 0.1,
    '金卡': 0.12,
    '白金卡': 0.15,
  };
  const probabilityMap: Record<AccountType, number> = {
    '普通': 0.4,
    '银卡': 0.6,
    '金卡': 0.75,
    '白金卡': 0.9,
  };
  
  const liabilityCoefficient = coefficientMap[accountType];
  const probabilityCoefficient = probabilityMap[accountType];
  const estimatedLiability = remainingMiles * liabilityCoefficient * probabilityCoefficient;
  
  return {
    formula: '剩余里程 × 单位里程负债系数 × 兑换概率系数',
    parameters: {
      remainingMiles,
      liabilityCoefficient,
      probabilityCoefficient,
    },
    calculationProcess: `${remainingMiles.toLocaleString()} × ${liabilityCoefficient} × ${probabilityCoefficient} = ${estimatedLiability.toFixed(2)}`,
    calculator: '系统自动估算',
    calculateTime: formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss'),
  };
}

function generateLiabilityRecords(
  accounts: MemberAccount[],
  transactions: MileageTransaction[],
  orders: ExchangeOrder[],
  expireCalendars: ExpireCalendar[]
): LiabilityRecord[] {
  const records: LiabilityRecord[] = [];
  
  accounts.forEach((account) => {
    const accountTransactions = transactions.filter(t => t.memberNo === account.memberNo);
    const accountOrders = orders.filter(o => o.memberNo === account.memberNo);
    const accountExpireRecords = expireCalendars.filter(e => e.memberNo === account.memberNo);
    
    const latestTransaction = accountTransactions.length > 0
      ? accountTransactions.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())[0]
      : null;
    
    let businessCategory: LiabilityRecord['businessCategory'] = '正常';
    let isExpired = accountExpireRecords.some(e => e.isExpired) || (() => {
      const expireDate = new Date(account.expireDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return expireDate < today;
    })();
    
    if (account.memberNo === 'TEST-2024-EXPIRE') {
      isExpired = true;
      businessCategory = '里程过期';
    } else if (isExpired) {
      businessCategory = '里程过期';
    } else if (latestTransaction?.businessType === '升舱' && latestTransaction?.transactionType === '退回') {
      businessCategory = '升舱退回';
    } else if (latestTransaction?.businessType === '活动赠送' && latestTransaction?.description.includes('双倍')) {
      businessCategory = '活动双倍';
    }
    
    const estimateDetail = calculateEstimateDetail(account.remainingMiles, account.accountType);
    
    records.push({
      id: generateId('LIA'),
      memberNo: account.memberNo,
      memberName: account.memberName,
      accountType: account.accountType,
      remainingMiles: account.remainingMiles,
      liabilityCoefficient: estimateDetail.parameters.liabilityCoefficient,
      probabilityCoefficient: estimateDetail.parameters.probabilityCoefficient,
      estimatedLiability: parseNumber(estimateDetail.calculationProcess.split('=')[1].trim()),
      businessCategory,
      reviewStatus: isExpired ? '未复核' : (Math.random() > 0.4 ? '已复核' : '未复核'),
      reviewer: Math.random() > 0.4 ? ['张会计', '李会计', '王主管'][Math.floor(Math.random() * 3)] : undefined,
      reviewTime: Math.random() > 0.4 ? randomDate(new Date(2026, 4, 1), new Date(2026, 4, 28)) + ' ' + ['09:30:00', '14:20:00', '16:45:00'][Math.floor(Math.random() * 3)] : undefined,
      reviewComment: Math.random() > 0.4 ? ['数据一致，复核通过', '核对无误', '已确认负债估算正确'][Math.floor(Math.random() * 3)] : undefined,
      isExpired,
      expireDate: account.expireDate,
      latestTransaction,
      exchangeOrders: accountOrders,
      expireRecords: accountExpireRecords,
      estimateDetail,
      createTime: formatDate(new Date(2026, 4, 1), 'yyyy-MM-dd HH:mm:ss'),
      updateTime: formatDate(new Date(2026, 4, 28), 'yyyy-MM-dd HH:mm:ss'),
    });
  });
  
  return records;
}

function generateBadRecords(): BadRecord[] {
  const badRecords: BadRecord[] = [];
  const sourceTypes: BadRecord['sourceType'][] = ['会员账户', '里程流水', '兑换订单', '过期日历'];
  const errorTypes: BadRecord['errorType'][] = ['空行', '缺列', '格式错误', '数据异常'];
  
  const badData = [
    { sourceType: '兑换订单', errorType: '空行', data: {}, desc: '整行数据为空', suggestion: '删除空行或补充数据' },
    { sourceType: '过期日历', errorType: '缺列', data: { memberNo: 'MEM-0000123' }, desc: '缺少过期日期、过期里程等关键字段', suggestion: '补充expireDate、milesToExpire字段' },
    { sourceType: '兑换订单', errorType: '缺列', data: { orderNo: 'ORD-20240001', memberNo: 'MEM-0000456' }, desc: '缺少兑换类型、里程数', suggestion: '补充exchangeType、miles字段' },
    { sourceType: '会员账户', errorType: '格式错误', data: { memberNo: 'MEM-0000789', memberName: '赵六', totalMiles: '不是数字' }, desc: 'totalMiles字段格式错误，应为数字', suggestion: '将totalMiles改为有效数字' },
    { sourceType: '里程流水', errorType: '格式错误', data: { memberNo: 'MEM-0000012', transactionDate: '2024/13/45' }, desc: 'transactionDate日期格式错误', suggestion: '将日期改为yyyy-MM-dd格式，如2024-01-15' },
    { sourceType: '过期日历', errorType: '格式错误', data: { memberNo: 'MEM-0000034', expireDate: '2024-13-01' }, desc: 'expireDate月份无效', suggestion: '检查月份值，应为1-12' },
    { sourceType: '会员账户', errorType: '数据异常', data: { memberNo: 'MEM-0000567', totalMiles: 50000, usedMiles: 60000, remainingMiles: -10000 }, desc: '已使用里程大于累计里程，剩余里程为负', suggestion: '核对总里程与已使用里程，修正数据' },
    { sourceType: '里程流水', errorType: '数据异常', data: { memberNo: 'MEM-0000890', transactionDate: '2024-01-01', expireDate: '2023-01-01' }, desc: '过期日期早于交易日期', suggestion: '检查过期日期与交易日期的逻辑关系' },
    { sourceType: '兑换订单', errorType: '数据异常', data: { orderNo: 'ORD-202400023', memberNo: 'MEM-0000222', miles: -500 }, desc: '兑换里程为负数', suggestion: '检查里程数，兑换里程应为正数' },
    { sourceType: '过期日历', errorType: '数据异常', data: { memberNo: 'MEM-0000333', milesToExpire: 10000, actualExpiredMiles: 15000 }, desc: '实际过期里程大于应过期里程', suggestion: '核实实际过期里程数' },
    { sourceType: '会员账户', errorType: '空行', data: {}, desc: '空行，无任何有效数据', suggestion: '删除该行' },
    { sourceType: '里程流水', errorType: '缺列', data: { transactionType: '累积' }, desc: '缺少会员号、里程数、交易日期等核心字段', suggestion: '补充memberNo、miles、transactionDate字段' },
  ];
  
  badData.forEach((item, idx) => {
    badRecords.push({
      id: generateId('BAD'),
      sourceType: item.sourceType as BadRecord['sourceType'],
      sourceFile: `${item.sourceType}_202605_${String(idx + 1).padStart(3, '0')}.xlsx`,
      rowNumber: (idx + 3) * 5 + Math.floor(Math.random() * 10),
      errorType: item.errorType as BadRecord['errorType'],
      errorDescription: item.desc,
      originalData: item.data,
      repairSuggestion: item.suggestion,
      isProcessed: idx % 4 === 0,
      processor: idx % 4 === 0 ? ['张会计', '李主管'][Math.floor(Math.random() * 2)] : undefined,
      processTime: idx % 4 === 0 ? formatDate(new Date(2026, 4, 20 + idx), 'yyyy-MM-dd HH:mm:ss') : undefined,
      importBatchNo: `IMP-BATCH-202605${String(idx + 1).padStart(4, '0')}`,
      createTime: formatDate(new Date(2026, 4, 25), 'yyyy-MM-dd HH:mm:ss'),
    });
  });
  
  return badRecords;
}

export const mockActivities = generateActivities();
export const mockMemberAccounts = generateMemberAccounts();
export const mockTransactions = generateTransactions(mockMemberAccounts);
export const mockOrders = generateOrders(mockMemberAccounts);
export const mockExpireCalendars = generateExpireCalendars(mockMemberAccounts);
export const mockLiabilityRecords = generateLiabilityRecords(
  mockMemberAccounts,
  mockTransactions,
  mockOrders,
  mockExpireCalendars
);
export const mockBadRecords = generateBadRecords();
