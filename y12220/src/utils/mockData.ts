import dayjs from 'dayjs';
import type {
  User,
  TicketOrder,
  Segment,
  CabinPrice,
  TaxRule,
  RebookRecord,
  TaxItem,
  CabinClass,
} from '../types';
import { db } from '../db';

const generateId = () => crypto.randomUUID();

const now = dayjs();

const CABIN_NAMES: Record<CabinClass, string> = {
  economy: '经济舱',
  premium_economy: '超级经济舱',
  business: '商务舱',
  first: '头等舱',
};

export const getCabinName = (cabinClass: CabinClass): string => {
  return CABIN_NAMES[cabinClass] || cabinClass;
};

const createTaxItem = (code: string, name: string, amount: number, country: string, rate: number): TaxItem => ({
  code,
  name,
  amount,
  country,
  rate,
});

const mockUsers: User[] = [
  {
    id: generateId(),
    username: 'admin',
    name: '系统管理员',
    role: 'admin',
    createdAt: now.subtract(30, 'day').toISOString(),
    lastLoginAt: now.subtract(1, 'hour').toISOString(),
  },
  {
    id: generateId(),
    username: 'settlement01',
    name: '张明（结算员）',
    role: 'settlement',
    createdAt: now.subtract(25, 'day').toISOString(),
    lastLoginAt: now.subtract(2, 'hour').toISOString(),
  },
  {
    id: generateId(),
    username: 'reviewer01',
    name: '李华（复核员）',
    role: 'reviewer',
    createdAt: now.subtract(20, 'day').toISOString(),
    lastLoginAt: now.subtract(3, 'hour').toISOString(),
  },
];

const mockTaxRules: TaxRule[] = [
  { id: generateId(), country: 'CN', countryName: '中国', taxCode: 'CNY', taxName: '民航发展基金', rate: 50, isFixed: true, fixedAmount: 50 },
  { id: generateId(), country: 'CN', countryName: '中国', taxCode: 'CNY', taxName: '燃油附加费', rate: 80, isFixed: true, fixedAmount: 80 },
  { id: generateId(), country: 'JP', countryName: '日本', taxCode: 'JPY', taxName: '日本旅客税', rate: 1000, isFixed: true, fixedAmount: 1000 },
  { id: generateId(), country: 'JP', countryName: '日本', taxCode: 'JPY', taxName: '国际机场使用税', rate: 2550, isFixed: true, fixedAmount: 2550 },
  { id: generateId(), country: 'US', countryName: '美国', taxCode: 'USD', taxName: '美国运输税', rate: 0.075, isFixed: false },
  { id: generateId(), country: 'US', countryName: '美国', taxCode: 'USD', taxName: '旅客设施费', rate: 4.5, isFixed: true, fixedAmount: 4.5 },
  { id: generateId(), country: 'SG', countryName: '新加坡', taxCode: 'SGD', taxName: '新加坡消费税', rate: 0.08, isFixed: false },
  { id: generateId(), country: 'HK', countryName: '香港', taxCode: 'HKD', taxName: '香港旅客离境税', rate: 120, isFixed: true, fixedAmount: 120 },
];

const mockCabinPrices: CabinPrice[] = [
  { id: generateId(), flightNo: 'CA1234', cabinClass: 'economy', basePrice: 1280, effectiveDate: now.toISOString() },
  { id: generateId(), flightNo: 'CA1234', cabinClass: 'premium_economy', basePrice: 2180, effectiveDate: now.toISOString() },
  { id: generateId(), flightNo: 'CA1234', cabinClass: 'business', basePrice: 4580, effectiveDate: now.toISOString() },
  { id: generateId(), flightNo: 'CA1234', cabinClass: 'first', basePrice: 8880, effectiveDate: now.toISOString() },
  { id: generateId(), flightNo: 'CA5678', cabinClass: 'economy', basePrice: 1580, effectiveDate: now.toISOString() },
  { id: generateId(), flightNo: 'CA5678', cabinClass: 'premium_economy', basePrice: 2580, effectiveDate: now.toISOString() },
  { id: generateId(), flightNo: 'CA5678', cabinClass: 'business', basePrice: 5280, effectiveDate: now.toISOString() },
  { id: generateId(), flightNo: 'CA5678', cabinClass: 'first', basePrice: 9880, effectiveDate: now.toISOString() },
  { id: generateId(), flightNo: 'CA9012', cabinClass: 'economy', basePrice: 3280, effectiveDate: now.toISOString() },
  { id: generateId(), flightNo: 'CA9012', cabinClass: 'business', basePrice: 8880, effectiveDate: now.toISOString() },
  { id: generateId(), flightNo: 'MU2345', cabinClass: 'economy', basePrice: 980, effectiveDate: now.toISOString() },
  { id: generateId(), flightNo: 'MU2345', cabinClass: 'business', basePrice: 3680, effectiveDate: now.toISOString() },
  { id: generateId(), flightNo: 'CZ6789', cabinClass: 'economy', basePrice: 1880, effectiveDate: now.toISOString() },
  { id: generateId(), flightNo: 'CZ6789', cabinClass: 'premium_economy', basePrice: 2980, effectiveDate: now.toISOString() },
  { id: generateId(), flightNo: 'HU3456', cabinClass: 'economy', basePrice: 2280, effectiveDate: now.toISOString() },
  { id: generateId(), flightNo: 'HU3456', cabinClass: 'business', basePrice: 6580, effectiveDate: now.toISOString() },
];

const passengerNames = ['张伟', '王芳', '李娜', '刘洋', '陈静', '杨华', '赵敏', '黄强', '周杰', '吴敏'];

const createSegment = (
  flightNo: string,
  dep: string,
  arr: string,
  depTime: dayjs.Dayjs,
  arrTime: dayjs.Dayjs,
  cabinClass: CabinClass,
  baseFare: number,
  country: string
): Segment => {
  const taxes: TaxItem[] = [];
  if (country === 'CN') {
    taxes.push(createTaxItem('CNY', '民航发展基金', 50, 'CN', 50));
    taxes.push(createTaxItem('CNY', '燃油附加费', 80, 'CN', 80));
  } else if (country === 'JP') {
    taxes.push(createTaxItem('JPY', '日本旅客税', 1000, 'JP', 1000));
    taxes.push(createTaxItem('JPY', '国际机场使用税', 2550, 'JP', 2550));
  } else if (country === 'US') {
    taxes.push(createTaxItem('USD', '美国运输税', baseFare * 0.075, 'US', 0.075));
    taxes.push(createTaxItem('USD', '旅客设施费', 4.5, 'US', 4.5));
  }

  const cabinCodes: Record<CabinClass, string> = {
    economy: 'Y',
    premium_economy: 'W',
    business: 'J',
    first: 'F',
  };

  return {
    id: generateId(),
    flightNo,
    departureAirport: dep,
    arrivalAirport: arr,
    departureTime: depTime.toISOString(),
    arrivalTime: arrTime.toISOString(),
    cabinClass,
    cabinCode: cabinCodes[cabinClass],
    baseFare,
    taxes,
    country,
  };
};

const createTicket = (index: number): TicketOrder => {
  const name = passengerNames[index];
  const id = generateId();
  const segments: Segment[] = [];

  const depDate = now.add(index, 'day').hour(8).minute(0);

  if (index % 3 === 0) {
    segments.push(createSegment('CA1234', 'PEK', 'SHA', depDate, depDate.add(2, 'hour'), 'economy', 1280, 'CN'));
    segments.push(createSegment('CA5678', 'SHA', 'CAN', depDate.add(3, 'hour'), depDate.add(5, 'hour'), 'economy', 1580, 'CN'));
  } else if (index % 3 === 1) {
    segments.push(createSegment('CA9012', 'PEK', 'NRT', depDate, depDate.add(3, 'hour'), 'business', 8880, 'JP'));
    segments.push(createSegment('CA5678', 'NRT', 'SFO', depDate.add(4, 'hour'), depDate.add(12, 'hour'), 'economy', 3280, 'US'));
  } else {
    segments.push(createSegment('MU2345', 'PEK', 'SHA', depDate, depDate.add(2, 'hour'), 'economy', 980, 'CN'));
    segments.push(createSegment('CZ6789', 'SHA', 'SIN', depDate.add(3, 'hour'), depDate.add(6, 'hour'), 'premium_economy', 2980, 'SG'));
    segments.push(createSegment('HU3456', 'SIN', 'HKG', depDate.add(7, 'hour'), depDate.add(9, 'hour'), 'business', 6580, 'HK'));
  }

  const totalFare = segments.reduce((sum, s) => sum + s.baseFare, 0);
  const totalTax = segments.reduce((sum, s) => sum + s.taxes.reduce((ts, t) => ts + t.amount, 0), 0);

  return {
    id,
    orderNo: `ORD${String(20260000 + index).padStart(8, '0')}`,
    passengerName: name,
    passengerId: `110101199${index % 10}0101${String(1000 + index).slice(-4)}`,
    contactPhone: `1380013800${String(index).padStart(2, '0')}`,
    originalSegments: segments,
    mileageUsed: index % 4 === 0 ? 50000 : 0,
    totalOriginalAmount: totalFare + totalTax,
    dataSource: {
      source: index % 2 === 0 ? 'BSP系统导入' : '手动录入',
      file: index % 2 === 0 ? `ORD${String(20260000 + index).padStart(8, '0')}.xlsx` : undefined,
      importedAt: now.subtract(index + 1, 'day').toISOString(),
      importedBy: mockUsers[1].name,
    },
    createdAt: now.subtract(index + 1, 'day').toISOString(),
    updatedAt: now.subtract(index + 1, 'day').toISOString(),
    version: 1,
  };
};

const mockTickets: TicketOrder[] = Array.from({ length: 10 }, (_, i) => createTicket(i));

const createRebookRecord = (ticket: TicketOrder, index: number): RebookRecord => {
  const statuses: RebookRecord['status'][] = ['draft', 'pending', 'approved', 'rejected', 'approved'];
  const status = statuses[index % 5];

  const newSegments = ticket.originalSegments.map((seg, segIdx) => {
    if (index % 2 === 0 && segIdx === 0) {
      return {
        ...seg,
        id: generateId(),
        cabinClass: 'business' as CabinClass,
        cabinCode: 'J',
        baseFare: seg.baseFare * 2.5,
        taxes: seg.taxes.map(t => ({ ...t, amount: t.amount * 1.5 })),
      };
    }
    if (index % 3 === 1 && segIdx === 1) {
      return {
        ...seg,
        id: generateId(),
        country: 'CN',
        arrivalAirport: 'CTU',
        taxes: [
          createTaxItem('CNY', '民航发展基金', 50, 'CN', 50),
          createTaxItem('CNY', '燃油附加费', 80, 'CN', 80),
        ],
      };
    }
    return { ...seg, id: generateId() };
  });

  const fareDiff = newSegments.reduce((sum, s) => sum + s.baseFare, 0) -
    ticket.originalSegments.reduce((sum, s) => sum + s.baseFare, 0);
  const taxDiff = newSegments.reduce((sum, s) => sum + s.taxes.reduce((ts, t) => ts + t.amount, 0), 0) -
    ticket.originalSegments.reduce((sum, s) => sum + s.taxes.reduce((ts, t) => ts + t.amount, 0), 0);
  const mileageRefund = ticket.mileageUsed > 0 ? -10000 : 0;

  const anomalies: RebookRecord['anomalies'] = [];

  ticket.originalSegments.forEach((seg, idx) => {
    const newSeg = newSegments[idx];
    if (newSeg && seg.cabinClass !== newSeg.cabinClass) {
      anomalies.push({
        id: generateId(),
        type: 'cabin_change',
        severity: 'warning',
        segmentIndex: idx,
        description: `第${idx + 1}航段舱位变更: ${getCabinName(seg.cabinClass)} → ${getCabinName(newSeg.cabinClass)}`,
        affectedResults: ['舱位差价', '税费计算'],
        amountImpact: newSeg.baseFare - seg.baseFare,
        ruleBasis: '航司舱位变更差价规则第3.2条',
      });
    }
    if (newSeg && seg.country !== newSeg.country) {
      anomalies.push({
        id: generateId(),
        type: 'cross_country_tax',
        severity: 'warning',
        segmentIndex: idx,
        description: `第${idx + 1}航段国家变更: ${seg.country} → ${newSeg.country}`,
        affectedResults: ['税费计算', '税项明细'],
        amountImpact: newSeg.taxes.reduce((s, t) => s + t.amount, 0) - seg.taxes.reduce((s, t) => s + t.amount, 0),
        ruleBasis: '跨国税费重算规则第5.1条',
      });
    }
  });

  if (Math.abs(mileageRefund) > 0) {
    anomalies.push({
      id: generateId(),
      type: 'mileage_refund',
      severity: mileageRefund > 0 ? 'warning' : 'error',
      description: `里程${mileageRefund > 0 ? '退还' : '补扣'}: ${Math.abs(mileageRefund)} 里程`,
      affectedResults: ['总差价', '里程账户'],
      amountImpact: mileageRefund * 0.01,
      ruleBasis: '里程改签规则第7.3条',
    });
  }

  const details: RebookRecord['calculationDetails'] = [
    { id: generateId(), item: '舱位差价', originalAmount: ticket.originalSegments.reduce((s, seg) => s + seg.baseFare, 0), newAmount: newSegments.reduce((s, seg) => s + seg.baseFare, 0), difference: fareDiff, remark: '各航段舱位价格差额' },
    { id: generateId(), item: '税费差价', originalAmount: ticket.originalSegments.reduce((s, seg) => s + seg.taxes.reduce((ts, t) => ts + t.amount, 0), 0), newAmount: newSegments.reduce((s, seg) => s + seg.taxes.reduce((ts, t) => ts + t.amount, 0), 0), difference: taxDiff, remark: '各航段税费重算差额' },
    { id: generateId(), item: '里程调整', originalAmount: ticket.mileageUsed * 0.01, newAmount: (ticket.mileageUsed + mileageRefund) * 0.01, difference: mileageRefund * 0.01, remark: '里程抵扣退还/补扣（1里程=0.01元）' },
  ];

  return {
    id: generateId(),
    ticketId: ticket.id,
    orderNo: ticket.orderNo,
    status,
    originalSegments: ticket.originalSegments,
    newSegments,
    originalMileageUsed: ticket.mileageUsed,
    newMileageUsed: ticket.mileageUsed + mileageRefund,
    mileageRefund,
    fareDifference: fareDiff,
    taxDifference: taxDiff,
    totalDifference: fareDiff + taxDiff + mileageRefund * 0.01,
    anomalies,
    explanations: anomalies.length > 0 ? anomalies.map(a => ({
      id: generateId(),
      anomalyId: a.id,
      content: `已核实该异常情况，符合改签规则要求，予以通过。`,
      explainedBy: mockUsers[1].name,
      createdAt: now.subtract(index, 'hour').toISOString(),
    })) : [],
    calculationDetails: details,
    createdBy: mockUsers[1].name,
    reviewedBy: status !== 'draft' ? mockUsers[2].name : undefined,
    reviewComment: status === 'rejected' ? '舱位变更理由不充分，请补充说明客户需求' : undefined,
    dataSource: {
      source: '改签申请',
      importedAt: now.subtract(index, 'day').toISOString(),
      importedBy: mockUsers[1].name,
    },
    version: 1,
    createdAt: now.subtract(index, 'day').toISOString(),
    submittedAt: status !== 'draft' ? now.subtract(index, 'day').add(2, 'hour').toISOString() : undefined,
    reviewedAt: status === 'approved' || status === 'rejected' ? now.subtract(index, 'day').add(4, 'hour').toISOString() : undefined,
    settledAt: status === 'approved' && index % 2 === 0 ? now.subtract(index, 'day').add(6, 'hour').toISOString() : undefined,
  };
};

export const initializeMockData = async (): Promise<void> => {
  const userCount = await db.users.count();
  if (userCount > 0) return;

  await db.transaction('rw', [db.users, db.ticketOrders, db.rebookRecords, db.cabinPrices, db.taxRules, db.auditLogs], async () => {
    await db.users.bulkAdd(mockUsers);
    await db.taxRules.bulkAdd(mockTaxRules);
    await db.cabinPrices.bulkAdd(mockCabinPrices);
    await db.ticketOrders.bulkAdd(mockTickets);

    const rebookRecords = mockTickets.slice(0, 5).map((ticket, idx) => createRebookRecord(ticket, idx));
    await db.rebookRecords.bulkAdd(rebookRecords);

    for (const record of rebookRecords) {
      await db.logAction(record.id, 'rebook', '创建改签记录', record.createdBy);
      if (record.submittedAt) {
        await db.logAction(record.id, 'rebook', '提交复核', record.createdBy);
      }
      if (record.reviewedAt && record.reviewedBy) {
        await db.logAction(record.id, 'rebook', record.status === 'approved' ? '审核通过' : '审核驳回', record.reviewedBy);
      }
    }
  });

  console.log('Mock data initialized successfully');
};

export { mockUsers, mockTaxRules, mockCabinPrices, mockTickets, CABIN_NAMES };
