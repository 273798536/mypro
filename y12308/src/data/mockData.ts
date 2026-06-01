import {
  MemberStatus,
  DataBatch,
  MemberStatusRecord,
  Member,
  CustomerServiceNote,
  Activity,
  StatusJumpReview,
  MarkovPrediction,
  InterventionSuggestion,
} from '../types';

export interface PredictionResult {
  month: string;
  statusPredictions: Record<MemberStatus, {
    count: number;
    probability: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  churnRiskDistribution: {
    low: number;
    medium: number;
    high: number;
  };
}

export interface MockData {
  batches: DataBatch[];
  members: Member[];
  activities: Activity[];
  reviews: CustomerServiceNote[];
  predictions: PredictionResult;
  suggestions: InterventionSuggestion[];
  jumpReviews: StatusJumpReview[];
  markovPredictions: MarkovPrediction[];
}

const MEMBER_STATUSES: MemberStatus[] = [
  MemberStatus.new,
  MemberStatus.active,
  MemberStatus.reactivated,
  MemberStatus.at_risk,
  MemberStatus.silent,
  MemberStatus.churned,
];

const STATUS_ORDER: Record<MemberStatus, number> = {
  [MemberStatus.new]: 0,
  [MemberStatus.reactivated]: 1,
  [MemberStatus.active]: 2,
  [MemberStatus.at_risk]: 3,
  [MemberStatus.silent]: 4,
  [MemberStatus.churned]: 5,
};

const STATUS_TRANSITION_PROBABILITIES: Record<MemberStatus, Record<MemberStatus, number>> = {
  [MemberStatus.new]: {
    [MemberStatus.new]: 0,
    [MemberStatus.reactivated]: 0,
    [MemberStatus.active]: 0.7,
    [MemberStatus.at_risk]: 0.15,
    [MemberStatus.silent]: 0.1,
    [MemberStatus.churned]: 0.05,
  },
  [MemberStatus.reactivated]: {
    [MemberStatus.new]: 0,
    [MemberStatus.reactivated]: 0,
    [MemberStatus.active]: 0.65,
    [MemberStatus.at_risk]: 0.2,
    [MemberStatus.silent]: 0.1,
    [MemberStatus.churned]: 0.05,
  },
  [MemberStatus.active]: {
    [MemberStatus.new]: 0,
    [MemberStatus.reactivated]: 0,
    [MemberStatus.active]: 0.7,
    [MemberStatus.at_risk]: 0.15,
    [MemberStatus.silent]: 0.1,
    [MemberStatus.churned]: 0.05,
  },
  [MemberStatus.at_risk]: {
    [MemberStatus.new]: 0,
    [MemberStatus.reactivated]: 0.1,
    [MemberStatus.active]: 0.2,
    [MemberStatus.at_risk]: 0.35,
    [MemberStatus.silent]: 0.25,
    [MemberStatus.churned]: 0.1,
  },
  [MemberStatus.silent]: {
    [MemberStatus.new]: 0,
    [MemberStatus.reactivated]: 0.05,
    [MemberStatus.active]: 0.1,
    [MemberStatus.at_risk]: 0.2,
    [MemberStatus.silent]: 0.45,
    [MemberStatus.churned]: 0.2,
  },
  [MemberStatus.churned]: {
    [MemberStatus.new]: 0,
    [MemberStatus.reactivated]: 0.1,
    [MemberStatus.active]: 0.05,
    [MemberStatus.at_risk]: 0.1,
    [MemberStatus.silent]: 0.25,
    [MemberStatus.churned]: 0.5,
  },
};

const TARGET_DISTRIBUTION: Record<MemberStatus, number> = {
  [MemberStatus.active]: 0.45,
  [MemberStatus.at_risk]: 0.15,
  [MemberStatus.silent]: 0.20,
  [MemberStatus.churned]: 0.15,
  [MemberStatus.new]: 0.03,
  [MemberStatus.reactivated]: 0.02,
};

const BEHAVIOR_TAGS = ['高价值', '活跃购买', '价格敏感', '品牌忠实', '偶尔浏览', '沉睡用户', '潜在流失', '新用户探索', '回归用户'];
const SYSTEM_TAGS = ['VIP会员', '普通会员', '潜在流失', '高风险', '已流失', '新注册', '回归用户', '活跃用户', '沉默用户'];

const FAMILY_NAMES = ['王', '李', '张', '刘', '陈', '杨', '黄', '赵', '周', '吴', '徐', '孙', '朱', '马', '胡', '郭', '林', '何', '高', '罗', '郑', '梁', '谢', '宋', '唐', '许', '韩', '冯', '邓', '曹', '彭', '曾', '萧', '田', '董', '袁', '潘', '于', '蒋', '蔡', '余', '杜', '叶', '程', '苏', '魏', '吕', '丁', '任', '沈'];
const GIVEN_NAMES_MALE = ['伟', '强', '磊', '洋', '勇', '军', '杰', '涛', '超', '明', '刚', '平', '辉', '鹏', '华', '鑫', '波', '斌', '宇', '浩', '凯', '健', '俊', '帅', '晨', '博', '文', '志', '国', '建', '永', '林', '龙', '飞', '杨', '昊', '然', '宁', '航', '阳'];
const GIVEN_NAMES_FEMALE = ['芳', '娜', '敏', '静', '丽', '艳', '娟', '莉', '玲', '桂', '英', '慧', '莹', '婷', '欣', '颖', '璐', '瑶', '怡', '萍', '梅', '琳', '莉', '红', '春', '燕', '秋', '霞', '香', '月', '青', '雪', '晶', '华', '蕾', '雯', '洁', '妍', '茜', '岚'];

const CS_NOTE_CONTENTS = [
  { type: 'complaint' as const, contents: ['用户反馈近期推送过多，希望减少营销短信', '投诉APP登录偶尔卡顿，影响使用体验', '对客服响应速度不满意，等待时间过长', '建议优化积分兑换流程，当前步骤繁琐', '反馈优惠券使用限制过多，体验不佳'] },
  { type: 'consult' as const, contents: ['咨询会员等级升级规则及权益', '询问积分有效期及使用方式', '了解生日福利具体内容', '咨询退货退款流程及周期', '询问如何修改绑定手机号'] },
  { type: 'feedback' as const, contents: ['对本次活动优惠力度非常满意', '建议增加更多支付方式', '希望APP增加深色模式', '表扬客服小张服务态度好', '反馈商品详情页信息不够详细'] },
  { type: 'other' as const, contents: ['用户咨询发票开具问题', '反馈收货地址需要修改', '询问门店地址及营业时间', '建议增加商品品类', '感谢平台提供的优质服务', '用户因长期未登录，从活跃转为沉默', '用户近期连续消费，从高风险转为活跃', '用户销户，确认流失状态', '用户回归，重新激活账号', '新用户完成首单，状态更新'] },
];

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedRandomChoice<T>(items: T[], weights: number[]): T {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;
  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) return items[i];
  }
  return items[items.length - 1];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start: Date, end: Date): string {
  const time = start.getTime() + Math.random() * (end.getTime() - start.getTime());
  return new Date(time).toISOString().split('T')[0];
}

function generateChineseName(): { name: string; gender: 'male' | 'female' } {
  const familyName = randomChoice(FAMILY_NAMES);
  const gender = Math.random() > 0.5 ? 'male' : 'female';
  const givenNames = gender === 'male' ? GIVEN_NAMES_MALE : GIVEN_NAMES_FEMALE;
  const givenNameLength = Math.random() > 0.3 ? 2 : 1;
  let givenName = randomChoice(givenNames);
  if (givenNameLength === 2) {
    givenName += randomChoice(givenNames);
  }
  return { name: familyName + givenName, gender };
}

function generatePhone(): string {
  const prefixes = ['130', '131', '132', '133', '134', '135', '136', '137', '138', '139', '150', '151', '152', '153', '155', '156', '157', '158', '159', '180', '181', '182', '183', '184', '185', '186', '187', '188', '189'];
  let phone = randomChoice(prefixes);
  for (let i = 0; i < 8; i++) {
    phone += Math.floor(Math.random() * 10).toString();
  }
  return phone;
}

function getNextStatus(currentStatus: MemberStatus, allowJump: boolean = false, jumpDistance: number = 1): MemberStatus {
  if (allowJump && jumpDistance > 1) {
    const currentIndex = STATUS_ORDER[currentStatus];
    const possibleStatuses = MEMBER_STATUSES.filter(s => {
      const distance = Math.abs(STATUS_ORDER[s] - currentIndex);
      return distance >= 2 && distance <= jumpDistance;
    });
    if (possibleStatuses.length > 0) {
      return randomChoice(possibleStatuses);
    }
  }
  
  const probs = STATUS_TRANSITION_PROBABILITIES[currentStatus];
  return weightedRandomChoice(MEMBER_STATUSES, MEMBER_STATUSES.map(s => probs[s]));
}

function getStatusForMonth(targetDistribution: Record<MemberStatus, number>): MemberStatus {
  return weightedRandomChoice(MEMBER_STATUSES, MEMBER_STATUSES.map(s => targetDistribution[s]));
}

function getMonthStartEnd(monthStr: string): { start: string; end: string } {
  const [year, month] = monthStr.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return {
    start: `${year}-${String(month).padStart(2, '0')}-01`,
    end: `${year}-${String(month).padStart(2, '0')}-${lastDay}`,
  };
}

function generateBatches(): DataBatch[] {
  const missingMonths = ['2025-12', '2026-02'];
  
  const batches: DataBatch[] = [];
  
  batches.push({
    id: generateUUID(),
    name: '2025年Q4批次',
    startDate: '2025-11-01',
    endDate: '2025-11-30',
    isCurrent: false,
    memberCount: 1850,
    missingMonths: [],
    createdAt: '2025-12-01',
  });
  
  batches.push({
    id: generateUUID(),
    name: '2026年Q1批次',
    startDate: '2026-01-01',
    endDate: '2026-03-31',
    isCurrent: false,
    memberCount: 1920,
    missingMonths: ['2025-12'],
    createdAt: '2026-04-01',
  });
  
  batches.push({
    id: generateUUID(),
    name: '2026年5月最新批次',
    startDate: '2025-11-01',
    endDate: '2026-05-31',
    isCurrent: true,
    memberCount: 2000,
    missingMonths: missingMonths,
    createdAt: '2026-06-01',
  });
  
  return batches;
}

function generateActivities(): Activity[] {
  const activities: Activity[] = [];
  
  activities.push({
    id: generateUUID(),
    name: '双十一狂欢购',
    type: 'promotion',
    startDate: '2025-11-01',
    endDate: '2025-11-15',
    overlapWith: [],
  });
  
  activities.push({
    id: generateUUID(),
    name: '双十二年终盛典',
    type: 'promotion',
    startDate: '2025-12-05',
    endDate: '2025-12-12',
    overlapWith: [],
  });
  
  activities.push({
    id: generateUUID(),
    name: '2026春节特惠',
    type: 'campaign',
    startDate: '2026-01-15',
    endDate: '2026-02-05',
    overlapWith: ['v2.0版本更新'],
  });
  
  activities.push({
    id: generateUUID(),
    name: 'v2.0版本更新',
    type: 'version_update',
    startDate: '2026-01-20',
    endDate: '2026-01-25',
    overlapWith: ['2026春节特惠'],
    version: 'v2.0',
  });
  
  activities.push({
    id: generateUUID(),
    name: '情人节专属活动',
    type: 'event',
    startDate: '2026-02-10',
    endDate: '2026-02-14',
    overlapWith: [],
  });
  
  activities.push({
    id: generateUUID(),
    name: '三月会员日',
    type: 'event',
    startDate: '2026-03-18',
    endDate: '2026-03-20',
    overlapWith: ['春季促销活动'],
  });
  
  activities.push({
    id: generateUUID(),
    name: '春季促销活动',
    type: 'promotion',
    startDate: '2026-03-15',
    endDate: '2026-03-22',
    overlapWith: ['三月会员日'],
  });
  
  activities.push({
    id: generateUUID(),
    name: 'v2.1版本更新',
    type: 'version_update',
    startDate: '2026-04-10',
    endDate: '2026-04-12',
    overlapWith: [],
    version: 'v2.1',
  });
  
  activities.push({
    id: generateUUID(),
    name: '五一劳动狂欢',
    type: 'campaign',
    startDate: '2026-05-01',
    endDate: '2026-05-07',
    overlapWith: [],
  });
  
  return activities;
}

function generateMembers(
  count: number,
  abnormalJumpCount: number,
  tagMismatchCount: number,
  activities: Activity[]
): { members: Member[]; jumpReviews: StatusJumpReview[] } {
  const members: Member[] = [];
  const jumpReviews: StatusJumpReview[] = [];
  const allMonths = ['2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05'];
  const missingMonths = new Set(['2025-12', '2026-02']);
  
  const abnormalJumpIndices = new Set<number>();
  while (abnormalJumpIndices.size < abnormalJumpCount) {
    abnormalJumpIndices.add(randomInt(0, count - 1));
  }
  
  const tagMismatchIndices = new Set<number>();
  while (tagMismatchIndices.size < tagMismatchCount) {
    const idx = randomInt(0, count - 1);
    tagMismatchIndices.add(idx);
  }
  
  const handlerNames = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十'];
  
  for (let i = 0; i < count; i++) {
    const { name } = generateChineseName();
    const isAbnormalJump = abnormalJumpIndices.has(i);
    const isTagMismatch = tagMismatchIndices.has(i);
    
    const statusHistory: MemberStatusRecord[] = [];
    let currentStatus = getStatusForMonth(TARGET_DISTRIBUTION);
    let abnormalJumpDetails = undefined;
    const memberId = generateUUID();
    
    for (let monthIdx = 0; monthIdx < allMonths.length; monthIdx++) {
      const month = allMonths[monthIdx];
      if (missingMonths.has(month)) continue;
      
      const { start, end } = getMonthStartEnd(month);
      let nextStatus: MemberStatus;
      
      if (monthIdx === 0) {
        nextStatus = currentStatus;
      } else if (isAbnormalJump && monthIdx === 3) {
        const fromStatus = currentStatus;
        const jumpDistance = randomInt(2, 3);
        nextStatus = getNextStatus(currentStatus, true, jumpDistance);
        
        const jumpReview: StatusJumpReview = {
          id: generateUUID(),
          memberId,
          fromStatus,
          toStatus: nextStatus,
          jumpDate: start,
          isApproved: null,
          evidence: [],
          plainLanguageExplanation: `这位会员从${fromStatus}直接跳到${nextStatus}，跨${jumpDistance}个状态，需要进一步核查原因`,
        };
        jumpReviews.push(jumpReview);
      } else {
        nextStatus = getNextStatus(currentStatus);
      }
      
      const monthActivities = activities.filter(a => {
        const aStart = new Date(a.startDate);
        const aEnd = new Date(a.endDate);
        const mStart = new Date(start);
        const mEnd = new Date(end);
        return (aStart <= mEnd && aEnd >= mStart);
      }).map(a => a.id);
      
      const sources: Array<'auto' | 'manual' | 'customer_service'> = ['auto', 'auto', 'auto', 'manual', 'customer_service'];
      
      const record: MemberStatusRecord = {
        id: generateUUID(),
        memberId,
        status: nextStatus,
        startDate: start,
        endDate: end,
        source: randomChoice(sources),
        activities: monthActivities,
      };
      
      statusHistory.push(record);
      currentStatus = nextStatus;
    }
    
    const finalStatus = statusHistory[statusHistory.length - 1].status;
    
    let churnProbability: number;
    
    switch (finalStatus) {
      case MemberStatus.churned:
        churnProbability = Math.round((0.8 + Math.random() * 0.2) * 100) / 100;
        break;
      case MemberStatus.silent:
        churnProbability = Math.round((0.5 + Math.random() * 0.3) * 100) / 100;
        break;
      case MemberStatus.at_risk:
        churnProbability = Math.round((0.6 + Math.random() * 0.3) * 100) / 100;
        break;
      case MemberStatus.active:
        churnProbability = Math.round((0.05 + Math.random() * 0.15) * 100) / 100;
        break;
      case MemberStatus.new:
        churnProbability = Math.round((0.1 + Math.random() * 0.2) * 100) / 100;
        break;
      case MemberStatus.reactivated:
        churnProbability = Math.round((0.2 + Math.random() * 0.3) * 100) / 100;
        break;
      default:
        churnProbability = 0.5;
    }
    
    let predictedStatus3m: MemberStatus;
    if (finalStatus === MemberStatus.churned) {
      predictedStatus3m = Math.random() > 0.7 ? MemberStatus.reactivated : MemberStatus.churned;
    } else if (finalStatus === MemberStatus.silent) {
      predictedStatus3m = Math.random() > 0.5 ? MemberStatus.at_risk : MemberStatus.churned;
    } else if (finalStatus === MemberStatus.at_risk) {
      predictedStatus3m = Math.random() > 0.6 ? MemberStatus.silent : MemberStatus.active;
    } else if (finalStatus === MemberStatus.active) {
      predictedStatus3m = Math.random() > 0.7 ? MemberStatus.at_risk : MemberStatus.active;
    } else {
      predictedStatus3m = MemberStatus.active;
    }
    
    const totalAmount = finalStatus === MemberStatus.churned 
      ? randomInt(100, 1000)
      : finalStatus === MemberStatus.silent
      ? randomInt(500, 3000)
      : finalStatus === MemberStatus.at_risk
      ? randomInt(1000, 5000)
      : finalStatus === MemberStatus.active
      ? randomInt(3000, 20000)
      : randomInt(500, 5000);
    
    const lastActiveDate = finalStatus === MemberStatus.churned
      ? randomDate(new Date('2025-11-01'), new Date('2026-02-28'))
      : finalStatus === MemberStatus.silent
      ? randomDate(new Date('2026-02-01'), new Date('2026-04-30'))
      : randomDate(new Date('2026-04-01'), new Date('2026-05-31'));
    
    const totalOrders = finalStatus === MemberStatus.churned
      ? randomInt(1, 5)
      : finalStatus === MemberStatus.silent
      ? randomInt(3, 10)
      : finalStatus === MemberStatus.at_risk
      ? randomInt(5, 15)
      : randomInt(10, 50);
    
    const registerDate = randomDate(new Date('2020-01-01'), new Date('2026-03-31'));
    
    let behaviorTags = [randomChoice(BEHAVIOR_TAGS)];
    let systemTags = [randomChoice(SYSTEM_TAGS)];
    
    if (isTagMismatch) {
      while (Math.abs(BEHAVIOR_TAGS.indexOf(behaviorTags[0]) - SYSTEM_TAGS.indexOf(systemTags[0])) < 4) {
        behaviorTags = [randomChoice(BEHAVIOR_TAGS)];
        systemTags = [randomChoice(SYSTEM_TAGS)];
      }
    }
    
    if (Math.random() > 0.5) {
      behaviorTags.push(randomChoice(BEHAVIOR_TAGS));
    }
    if (Math.random() > 0.6) {
      systemTags.push(randomChoice(SYSTEM_TAGS));
    }
    
    const customerServiceNotes: CustomerServiceNote[] = [];
    
    members.push({
      id: memberId,
      name,
      phone: generatePhone(),
      registerDate,
      totalOrders,
      totalAmount,
      lastActiveDate,
      currentStatus: finalStatus,
      statusHistory,
      behaviorTags,
      systemTags,
      tagConflict: isTagMismatch,
      customerServiceNotes,
      churnProbability,
      predictedStatus3m,
    });
  }
  
  return { members, jumpReviews };
}

function generateCustomerServiceNotes(members: Member[], count: number): CustomerServiceNote[] {
  const notes: CustomerServiceNote[] = [];
  const operatorNames = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十'];
  
  for (let i = 0; i < count; i++) {
    const member = randomChoice(members);
    const noteType = randomChoice(CS_NOTE_CONTENTS);
    const content = randomChoice(noteType.contents);
    const date = randomDate(new Date('2025-11-01'), new Date('2026-05-31'));
    
    let relatedStatus: MemberStatus | undefined = undefined;
    if (noteType.type === 'other' && content.includes('状态')) {
      relatedStatus = member.currentStatus;
    }
    
    notes.push({
      id: generateUUID(),
      memberId: member.id,
      date,
      operator: randomChoice(operatorNames),
      content,
      type: noteType.type,
      relatedStatus,
    });
    
    member.customerServiceNotes.push(notes[notes.length - 1]);
  }
  
  return notes.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function generateSuggestions(members: Member[]): InterventionSuggestion[] {
  const statusCounts: Record<MemberStatus, number> = {
    [MemberStatus.active]: 0,
    [MemberStatus.at_risk]: 0,
    [MemberStatus.silent]: 0,
    [MemberStatus.churned]: 0,
    [MemberStatus.new]: 0,
    [MemberStatus.reactivated]: 0,
  };
  members.forEach(m => statusCounts[m.currentStatus]++);
  
  const highRiskIds = members.filter(m => m.currentStatus === MemberStatus.at_risk).map(m => m.id);
  const silentIds = members.filter(m => m.currentStatus === MemberStatus.silent).map(m => m.id);
  const newAndReturningIds = members.filter(m => m.currentStatus === MemberStatus.new || m.currentStatus === MemberStatus.reactivated).map(m => m.id);
  const churnedIds = members.filter(m => m.currentStatus === MemberStatus.churned).map(m => m.id);
  
  return [
    {
      id: generateUUID(),
      name: '高危用户挽回计划',
      description: '针对高风险状态用户，推送专属优惠券和个性化推荐，降低流失风险。建议通过短信、APP推送多渠道触达，提供15%专属折扣。',
      targetStatuses: [MemberStatus.at_risk],
      expectedChurnReduction: 0.08,
      cost: 'medium',
      applicableMemberIds: highRiskIds,
    },
    {
      id: generateUUID(),
      name: '沉默用户激活活动',
      description: '对沉默3个月以上的用户开展召回活动，赠送积分和专属礼品，鼓励重新活跃。设计阶梯式激励机制，首单享额外赠品。',
      targetStatuses: [MemberStatus.silent],
      expectedChurnReduction: 0.05,
      cost: 'high',
      applicableMemberIds: silentIds,
    },
    {
      id: generateUUID(),
      name: '新会员培育计划',
      description: '为新注册用户提供新手引导和专属福利，提升首购率和留存率。建立7天、14天、30天的自动化触达机制。',
      targetStatuses: [MemberStatus.new, MemberStatus.reactivated],
      expectedChurnReduction: 0.03,
      cost: 'low',
      applicableMemberIds: newAndReturningIds,
    },
    {
      id: generateUUID(),
      name: '流失用户召回策略',
      description: '对已流失用户进行分层召回，针对高价值流失用户提供VIP专属回归礼遇，包括免邮券、专享折扣和专属客服。',
      targetStatuses: [MemberStatus.churned],
      expectedChurnReduction: 0.02,
      cost: 'high',
      applicableMemberIds: churnedIds,
    },
  ];
}

function generatePredictions(members: Member[]): PredictionResult {
  const nextMonth = '2026-06';
  const predictions: Record<MemberStatus, { count: number; probability: number; trend: 'up' | 'down' | 'stable' }> = {
    [MemberStatus.active]: { count: 0, probability: 0, trend: 'stable' },
    [MemberStatus.at_risk]: { count: 0, probability: 0, trend: 'stable' },
    [MemberStatus.silent]: { count: 0, probability: 0, trend: 'stable' },
    [MemberStatus.churned]: { count: 0, probability: 0, trend: 'stable' },
    [MemberStatus.new]: { count: 0, probability: 0, trend: 'stable' },
    [MemberStatus.reactivated]: { count: 0, probability: 0, trend: 'stable' },
  };
  
  members.forEach(m => {
    predictions[m.predictedStatus3m].count++;
  });
  
  const total = members.length;
  MEMBER_STATUSES.forEach(status => {
    predictions[status].probability = Math.round((predictions[status].count / total) * 100) / 100;
    
    const currentCount = members.filter(m => m.currentStatus === status).length;
    if (predictions[status].count > currentCount * 1.05) {
      predictions[status].trend = 'up';
    } else if (predictions[status].count < currentCount * 0.95) {
      predictions[status].trend = 'down';
    } else {
      predictions[status].trend = 'stable';
    }
  });
  
  let low = 0, medium = 0, high = 0;
  members.forEach(m => {
    if (m.churnProbability < 0.3) low++;
    else if (m.churnProbability < 0.6) medium++;
    else high++;
  });
  
  return {
    month: nextMonth,
    statusPredictions: predictions,
    churnRiskDistribution: { low, medium, high },
  };
}

function generateMarkovPredictions(members: Member[]): MarkovPrediction[] {
  const statusesWithoutReactivated = MEMBER_STATUSES.filter(s => s !== MemberStatus.reactivated);
  const n = statusesWithoutReactivated.length;
  
  const currentDistribution: Record<MemberStatus, number> = {} as Record<MemberStatus, number>;
  MEMBER_STATUSES.forEach(s => {
    currentDistribution[s] = members.filter(m => m.currentStatus === s).length / members.length;
  });
  
  const P: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      P[i][j] = STATUS_TRANSITION_PROBABILITIES[statusesWithoutReactivated[i]][statusesWithoutReactivated[j]];
    }
  }
  
  function matrixMultiply(A: number[][], B: number[][]): number[][] {
    const result: number[][] = Array(A.length).fill(null).map(() => Array(B[0].length).fill(0));
    for (let i = 0; i < A.length; i++) {
      for (let j = 0; j < B[0].length; j++) {
        for (let k = 0; k < B.length; k++) {
          result[i][j] += A[i][k] * B[k][j];
        }
      }
    }
    return result;
  }
  
  function matrixPower(mat: number[][], power: number): number[][] {
    let result: number[][] = Array(mat.length).fill(null).map((_, i) =>
      Array(mat.length).fill(0).map((_, j) => (i === j ? 1 : 0))
    );
    let base = mat;
    let p = power;
    while (p > 0) {
      if (p % 2 === 1) {
        result = matrixMultiply(result, base);
      }
      base = matrixMultiply(base, base);
      p = Math.floor(p / 2);
    }
    return result;
  }
  
  function vectorMultiply(v: number[], mat: number[][]): number[] {
    const result: number[] = Array(mat[0].length).fill(0);
    for (let j = 0; j < mat[0].length; j++) {
      for (let i = 0; i < v.length; i++) {
        result[j] += v[i] * mat[i][j];
      }
    }
    return result;
  }
  
  const V0 = statusesWithoutReactivated.map(s => currentDistribution[s] || 0);
  
  const markovPredictions: MarkovPrediction[] = [];
  const horizons = [1, 3, 6];
  
  horizons.forEach(horizon => {
    const predictionsArray: MarkovPrediction['predictions'] = [];
    
    for (let month = 1; month <= horizon; month++) {
      const Pn = matrixPower(P, month);
      const Vn = vectorMultiply(V0, Pn);
      
      const distribution: Record<MemberStatus, number> = {} as Record<MemberStatus, number>;
      const lower: Record<MemberStatus, number> = {} as Record<MemberStatus, number>;
      const upper: Record<MemberStatus, number> = {} as Record<MemberStatus, number>;
      
      for (let i = 0; i < n; i++) {
        const status = statusesWithoutReactivated[i];
        const prob = Vn[i];
        const stdDev = 0.05 * Math.sqrt(month);
        distribution[status] = Math.round(prob * 10000) / 10000;
        lower[status] = Math.max(0, Math.round((prob - 1.96 * stdDev) * 10000) / 10000);
        upper[status] = Math.min(1, Math.round((prob + 1.96 * stdDev) * 10000) / 10000);
      }
      
      predictionsArray.push({
        month,
        distribution,
        confidenceInterval: { lower, upper },
      });
    }
    
    markovPredictions.push({
      batchId: generateUUID(),
      predictionDate: new Date().toISOString().split('T')[0],
      horizonMonths: horizon,
      initialDistribution: currentDistribution,
      transitionMatrix: P,
      predictions: predictionsArray,
    });
  });
  
  return markovPredictions;
}

export function generateMockData(): MockData {
  const batches = generateBatches();
  const activities = generateActivities();
  
  const { members, jumpReviews } = generateMembers(2000, 100, 300, activities);
  
  const noteCount = randomInt(50, 80);
  const reviews = generateCustomerServiceNotes(members, noteCount);
  
  const suggestions = generateSuggestions(members);
  const predictions = generatePredictions(members);
  const markovPredictions = generateMarkovPredictions(members);
  
  return { batches, members, activities, reviews, predictions, suggestions, jumpReviews, markovPredictions };
}

export const mockData = generateMockData();
