import { BondPosition, CouponPlan, CustodyReceipt } from '../types';
import { getCurrentDateTime, getNextBusinessDay } from '../utils/dateUtils';

const BOND_TEMPLATES = [
  { code: '019547', name: '24国债05', rate: 2.35, faceValue: 100 },
  { code: '019551', name: '24国债10', rate: 2.45, faceValue: 100 },
  { code: '019555', name: '24国债15', rate: 2.52, faceValue: 100 },
  { code: '110088', name: '24国开05', rate: 2.68, faceValue: 100 },
  { code: '110092', name: '24国开10', rate: 2.75, faceValue: 100 },
  { code: '110096', name: '24国开15', rate: 2.82, faceValue: 100 },
  { code: '018012', name: '23农发03', rate: 2.62, faceValue: 100 },
  { code: '018018', name: '23农发08', rate: 2.70, faceValue: 100 },
];

const PAYMENT_DATES_2026 = [
  '2026-01-15', '2026-01-20', '2026-01-25',
  '2026-02-10', '2026-02-15', '2026-02-20',
  '2026-03-05', '2026-03-15', '2026-03-25',
  '2026-04-10', '2026-04-15', '2026-04-20',
  '2026-05-05', '2026-05-15', '2026-05-25',
  '2026-06-10', '2026-06-15', '2026-06-20',
];

const ACCOUNTS = ['自营账户A', '自营账户B', '资管产品1号', '资管产品2号'];
const BANKS = ['工商银行托管部', '建设银行托管部', '招商银行托管部'];

export const generateMockPositions = (count: number = 8): BondPosition[] => {
  const positions: BondPosition[] = [];
  const selectedBonds = BOND_TEMPLATES.slice(0, count);
  
  selectedBonds.forEach((bond, index) => {
    positions.push({
      bondCode: bond.code,
      bondName: bond.name,
      faceValue: bond.faceValue,
      positionAmount: Math.floor(Math.random() * 5000 + 1000) * 10000,
      account: ACCOUNTS[index % ACCOUNTS.length],
      importDate: getCurrentDateTime(),
      importOrder: 1,
    });
  });
  
  return positions;
};

export const generateMockCouponPlans = (positions: BondPosition[]): CouponPlan[] => {
  const plans: CouponPlan[] = [];
  let planId = 1;
  
  positions.forEach((position) => {
    const bond = BOND_TEMPLATES.find(b => b.code === position.bondCode);
    if (!bond) return;
    
    const numPayments = Math.floor(Math.random() * 3 + 1);
    const selectedDates = [...PAYMENT_DATES_2026]
      .sort(() => Math.random() - 0.5)
      .slice(0, numPayments)
      .sort();
    
    selectedDates.forEach((date) => {
      const daysAccrued = Math.floor(Math.random() * 180 + 90);
      const expectedAmount = Math.round(
        (position.positionAmount * bond.rate * daysAccrued) / 36500
      );
      
      const isHolidayAdjusted = Math.random() > 0.85;
      
      plans.push({
        planId: `CP${String(planId++).padStart(4, '0')}`,
        bondCode: position.bondCode,
        bondName: bond.name,
        paymentDate: isHolidayAdjusted ? getNextBusinessDay(date) : date,
        couponRate: bond.rate,
        expectedAmount,
        daysAccrued,
        isHolidayAdjusted,
        originalPaymentDate: isHolidayAdjusted ? date : undefined,
        importDate: getCurrentDateTime(),
        status: 'pending',
      });
    });
  });
  
  return plans.sort((a, b) => a.paymentDate.localeCompare(b.paymentDate));
};

export const generateMockReceipts = (plans: CouponPlan[]): CustodyReceipt[] => {
  const receipts: CustodyReceipt[] = [];
  let receiptId = 1;
  
  plans.forEach((plan, index) => {
    const rand = Math.random();
    let shouldGenerate = true;
    let actualAmount = plan.expectedAmount;
    let actualDate = plan.paymentDate;
    
    if (rand > 0.85) {
      shouldGenerate = false;
    } else if (rand > 0.7) {
      actualAmount = Math.round(plan.expectedAmount * (0.3 + Math.random() * 0.65));
    }
    
    if (shouldGenerate) {
      receipts.push({
        receiptId: `CR${String(receiptId++).padStart(4, '0')}`,
        planId: plan.planId,
        bondCode: plan.bondCode,
        actualDate,
        actualAmount,
        bankReference: `BK${Date.now()}${String(index).padStart(3, '0')}`,
        bankName: BANKS[index % BANKS.length],
        importDate: getCurrentDateTime(),
        importOrder: 3,
      });
    }
  });
  
  return receipts;
};

export const generateAllMockData = () => {
  const positions = generateMockPositions();
  const couponPlans = generateMockCouponPlans(positions);
  const receipts = generateMockReceipts(couponPlans);
  
  return { positions, couponPlans, receipts };
};
