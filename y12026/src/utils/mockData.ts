import { generateId, generateTraceCode } from './format';
import type { LicensePlate, MonthlyCard, TempParkingRecord, Discount, RenewalRecord, BadRow } from '@/types';

const ownerNames = ['张三', '李四', '王五', '赵六', '陈七', '刘八', '周九', '吴十', '郑十一', '孙十二', '钱十三', '马十四'];
const buildings = ['1', '2', '3', '4', '5'];
const platePrefixes = ['粤A', '粤B', '粤C', '沪A', '沪B', '京A', '京B', '苏A', '苏B', '浙A'];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(daysBack: number = 365): string {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysBack));
  return date.toISOString();
}

function formatPlateNumber(): string {
  const prefix = randomItem(platePrefixes);
  const suffix = String(randomNumber(10000, 99999));
  return `${prefix}${suffix}`;
}

export function generateMockLicensePlates(count: number = 20): LicensePlate[] {
  return Array.from({ length: count }, (_, index) => {
    const hasBindingHistory = Math.random() > 0.7;
    const building = randomItem(buildings);
    const roomNumber = `${randomNumber(1, 30)}${randomNumber(1, 2) === 1 ? '01' : '02'}`;
    const ownerName = ownerNames[index % ownerNames.length];
    const status = Math.random() > 0.9 ? 'transferred' : Math.random() > 0.8 ? 'inactive' : 'active';
    
    const bindingHistory = hasBindingHistory ? [
      {
        id: generateId(),
        plateNumber: '',
        ownerId: generateId(),
        ownerName: `原车主${randomNumber(1, 100)}`,
        bindingDate: randomDate(180),
        unbindingDate: randomDate(90),
        reason: randomItem(['车辆过户', '业主变更', '车辆置换']),
      },
      {
        id: generateId(),
        plateNumber: '',
        ownerId: generateId(),
        ownerName,
        bindingDate: randomDate(60),
      },
    ] : [
      {
        id: generateId(),
        plateNumber: '',
        ownerId: generateId(),
        ownerName,
        bindingDate: randomDate(180),
      },
    ];

    return {
      id: generateId(),
      plateNumber: formatPlateNumber(),
      ownerId: generateId(),
      ownerName,
      building,
      roomNumber,
      phone: `138${randomNumber(10000000, 99999999)}`,
      status,
      bindingHistory,
      createdAt: randomDate(365),
      updatedAt: randomDate(30),
      remarks: Math.random() > 0.8 ? 'VIP客户，需特别关注' : undefined,
    };
  });
}

export function generateMockMonthlyCards(plates: LicensePlate[]): MonthlyCard[] {
  return plates
    .filter(p => p.status === 'active')
    .map((plate, index) => {
      const cardType = index < 3 ? 'vip' : index < 5 ? 'employee' : 'standard';
      const monthlyFee = cardType === 'vip' ? 500 : cardType === 'employee' ? 200 : 300;
      const effectiveDate = new Date();
      effectiveDate.setMonth(effectiveDate.getMonth() - randomNumber(1, 6));
      const expiryDate = new Date(effectiveDate);
      expiryDate.setMonth(expiryDate.getMonth() + randomNumber(3, 12));
      const isExpired = expiryDate < new Date();

      return {
        id: generateId(),
        plateId: plate.id,
        plateNumber: plate.plateNumber,
        cardType,
        monthlyFee,
        effectiveDate: effectiveDate.toISOString(),
        expiryDate: expiryDate.toISOString(),
        status: isExpired ? 'expired' : 'active',
        balance: randomNumber(0, 500),
        tempParkingDeduction: randomNumber(0, 200),
        createdAt: effectiveDate.toISOString(),
        updatedAt: randomDate(7),
      };
    });
}

export function generateMockTempParkingRecords(plates: LicensePlate[], count: number = 30): TempParkingRecord[] {
  return Array.from({ length: count }, () => {
    const plate = randomItem(plates);
    const entryTime = new Date();
    entryTime.setDate(entryTime.getDate() - randomNumber(1, 30));
    entryTime.setHours(randomNumber(6, 22), randomNumber(0, 59), 0, 0);
    const duration = randomNumber(30, 480);
    const exitTime = new Date(entryTime.getTime() + duration * 60000);
    const feeAmount = Math.ceil(duration / 60) * 10;
    const isDeducted = Math.random() > 0.6;
    const deductionAmount = isDeducted ? feeAmount : 0;

    return {
      id: generateId(),
      plateNumber: plate.plateNumber,
      entryTime: entryTime.toISOString(),
      exitTime: exitTime.toISOString(),
      duration,
      feeAmount,
      deductionAmount,
      paymentMethod: isDeducted ? '月卡抵扣' : randomItem(['微信', '支付宝', '现金']),
      isDeducted,
      source: Math.random() > 0.9 ? 'manual' : 'system',
      createdAt: exitTime.toISOString(),
      remarks: Math.random() > 0.9 ? '手动调整费用' : undefined,
    };
  });
}

export function generateMockDiscounts(plates: LicensePlate[]): Discount[] {
  const discountTemplates = [
    { name: '老业主9折优惠', type: 'percentage' as const, value: 10 },
    { name: '年付立减200', type: 'fixed' as const, value: 200 },
    { name: '推荐新客户赠1月', type: 'freeMonths' as const, value: 1 },
    { name: '物业费代缴优惠', type: 'percentage' as const, value: 5 },
    { name: '节日特别优惠', type: 'fixed' as const, value: 100 },
  ];

  return discountTemplates.map((template, index) => {
    const isExpired = index === discountTemplates.length - 1;
    const effectiveDate = new Date();
    effectiveDate.setMonth(effectiveDate.getMonth() - randomNumber(1, 3));
    const expiryDate = new Date(effectiveDate);
    if (isExpired) {
      expiryDate.setDate(expiryDate.getDate() - randomNumber(1, 30));
    } else {
      expiryDate.setMonth(expiryDate.getMonth() + randomNumber(1, 6));
    }

    return {
      id: generateId(),
      ownerId: randomItem(plates).ownerId,
      ...template,
      effectiveDate: effectiveDate.toISOString(),
      expiryDate: expiryDate.toISOString(),
      isActive: !isExpired,
      maxUsage: randomNumber(1, 10),
      usedCount: randomNumber(0, 5),
      createdAt: effectiveDate.toISOString(),
      remarks: isExpired ? '优惠已过期，需联系业主确认' : undefined,
    };
  });
}

export function generateMockRenewalRecords(
  plates: LicensePlate[],
  monthlyCards: MonthlyCard[]
): RenewalRecord[] {
  return monthlyCards.slice(0, 15).map(card => {
    const plate = plates.find(p => p.id === card.plateId)!;
    const renewalMonths = randomNumber(1, 12);
    const baseFee = card.monthlyFee * renewalMonths;
    const hasDeduction = Math.random() > 0.5;
    const hasDiscount = Math.random() > 0.4;
    const tempParkingDeduction = hasDeduction ? randomNumber(50, 200) : 0;
    const discountAmount = hasDiscount ? randomNumber(30, 150) : 0;
    const totalAmount = Math.max(0, baseFee - tempParkingDeduction - discountAmount);
    
    const statusRandom = Math.random();
    const status = statusRandom > 0.7 ? 'confirmed' : statusRandom > 0.4 ? 'reviewed' : 'pending';
    const reviewStatusRandom = Math.random();
    const reviewStatus = reviewStatusRandom > 0.85 ? 'error' : reviewStatusRandom > 0.7 ? 'warning' : 'normal';

    return {
      id: generateId(),
      plateId: plate.id,
      plateNumber: plate.plateNumber,
      cardId: card.id,
      renewalMonths,
      baseFee,
      tempParkingDeduction,
      discountAmount,
      totalAmount,
      appliedDiscountIds: [],
      status,
      reviewStatus,
      reviewer: status !== 'pending' ? '财务管理员' : undefined,
      reviewedAt: status !== 'pending' ? randomDate(7) : undefined,
      createdAt: randomDate(30),
      remarks: reviewStatus !== 'normal' ? (reviewStatus === 'error' ? '临停抵扣异常，需人工复核' : '优惠叠加警告') : undefined,
      traceCode: generateTraceCode(),
      ownerName: plate.ownerName,
      building: plate.building,
      roomNumber: plate.roomNumber,
    };
  });
}

export function generateMockBadRows(): BadRow[] {
  return [
    {
      id: generateId(),
      importSessionId: generateId(),
      sourceType: 'tempParking',
      rowNumber: 5,
      rawData: '粤A12345,,2024-01-15 10:30',
      errorType: 'missingColumn',
      errorMessage: '缺少出场时间和费用字段',
      createdAt: randomDate(7),
    },
    {
      id: generateId(),
      importSessionId: generateId(),
      sourceType: 'licensePlate',
      rowNumber: 12,
      rawData: '',
      errorType: 'emptyRow',
      errorMessage: '空行数据',
      createdAt: randomDate(7),
    },
    {
      id: generateId(),
      importSessionId: generateId(),
      sourceType: 'discount',
      rowNumber: 8,
      rawData: '粤C99999,张三,折扣,abc,2024-01-01,2024-12-31',
      errorType: 'invalidFormat',
      errorMessage: '优惠值格式错误，应为数字',
      createdAt: randomDate(7),
    },
    {
      id: generateId(),
      importSessionId: generateId(),
      sourceType: 'refund',
      rowNumber: 15,
      rawData: '粤B66666,退款申请,-500.00,备注信息过长需要截断处理',
      errorType: 'invalidFormat',
      errorMessage: '退款金额格式异常',
      createdAt: randomDate(3),
    },
  ];
}

export function generateAllMockData() {
  const licensePlates = generateMockLicensePlates(25);
  const monthlyCards = generateMockMonthlyCards(licensePlates);
  const tempParkingRecords = generateMockTempParkingRecords(licensePlates, 40);
  const discounts = generateMockDiscounts(licensePlates);
  const renewalRecords = generateMockRenewalRecords(licensePlates, monthlyCards);
  const badRows = generateMockBadRows();

  return {
    licensePlates,
    monthlyCards,
    tempParkingRecords,
    discounts,
    renewalRecords,
    badRows,
  };
}
