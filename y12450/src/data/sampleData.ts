import { Bond, Coupon, PutOption, DefaultEvent, SourceInfo } from '../types';

export const createSampleSources = (): SourceInfo[] => [
  {
    id: 'src-bond-001',
    type: 'bond',
    provider: '债券承销商-张三',
    providedAt: new Date('2026-01-15'),
    rawData: {}
  },
  {
    id: 'src-coupon-001',
    type: 'coupon',
    provider: '托管行-李四',
    providedAt: new Date('2026-01-16'),
    rawData: {}
  },
  {
    id: 'src-put-001',
    type: 'put',
    provider: '交易员-王五',
    providedAt: new Date('2026-01-17'),
    rawData: {}
  },
  {
    id: 'src-default-001',
    type: 'default',
    provider: '风控-赵六',
    providedAt: new Date('2026-03-20'),
    rawData: {}
  }
];

export const createSampleBond = (levelId: string): Bond => {
  const baseBond: Bond = {
    id: 'bond-001',
    name: '26铁道01',
    code: '123456',
    faceValue: 100000000,
    issueDate: new Date('2026-01-01'),
    maturityDate: new Date('2029-01-01'),
    couponRate: 3.5,
    couponFrequency: 4,
    hasPutOption: false,
    sourceId: 'src-bond-001'
  };

  if (levelId === 'level-3' || levelId === 'level-5') {
    return {
      ...baseBond,
      hasPutOption: true,
      putDate: new Date('2028-01-01')
    };
  }

  return baseBond;
};

export const createSampleCoupons = (bond: Bond, levelId: string): Coupon[] => {
  const coupons: Coupon[] = [];
  const totalPeriods = 12;
  const couponAmount = (bond.faceValue * bond.couponRate / 100) / 4;

  for (let i = 1; i <= totalPeriods; i++) {
    const paymentDate = new Date(bond.issueDate);
    paymentDate.setMonth(paymentDate.getMonth() + i * 3);

    const isDeferred = levelId === 'level-2' && i === 4;

    coupons.push({
      id: `coupon-${String(i).padStart(3, '0')}`,
      bondId: bond.id,
      paymentDate: isDeferred ? new Date(paymentDate.getTime() + 2 * 24 * 60 * 60 * 1000) : paymentDate,
      amount: couponAmount,
      period: i,
      isDeferred,
      deferredTo: isDeferred ? new Date(paymentDate.getTime() + 2 * 24 * 60 * 60 * 1000) : undefined,
      deferralReason: isDeferred ? '节假日顺延（元旦假期）' : undefined,
      isProcessed: false,
      sourceId: 'src-coupon-001'
    });
  }

  return coupons;
};

export const createSamplePutOption = (bond: Bond): PutOption => ({
  id: 'put-001',
  bondId: bond.id,
  exerciseDate: bond.putDate || new Date('2028-01-01'),
  strikePrice: 100,
  isExercised: false,
  isSelected: false,
  sourceId: 'src-put-001'
});

export const createSampleDefaultEvent = (bond: Bond, levelId: string): DefaultEvent | null => {
  if (levelId !== 'level-4' && levelId !== 'level-5') return null;

  return {
    id: 'default-001',
    bondId: bond.id,
    eventDate: new Date('2027-06-15'),
    eventType: 'coupon_miss',
    severity: 'severe',
    description: '发行人未能按时支付第6期票息，构成实质性违约',
    isResolved: false,
    impactDetails: [
      '第6期票息支付失败，金额875,000元',
      '后续票息支付存在不确定性',
      '本金兑付风险上升',
      '债券评级可能下调'
    ],
    sourceId: 'src-default-001'
  };
};
