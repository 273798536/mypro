import type { Holding, Redemption, CashPosition, TradeCalendar, CorrectionTrace } from '../types';
import dayjs from 'dayjs';

const today = dayjs();
const startDate = today.subtract(7, 'day');

export const mockTradeCalendar: TradeCalendar[] = Array.from({ length: 14 }, (_, i) => {
  const date = startDate.add(i, 'day');
  const dayOfWeek = date.day();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  return {
    tradeDate: date.format('YYYY-MM-DD'),
    isTradingDay: !isWeekend,
    holidayName: isWeekend ? (dayOfWeek === 0 ? '周日' : '周六') : undefined,
  };
});

export const mockHoldings: Holding[] = [
  {
    id: 'h001',
    fundCode: 'F001',
    assetName: '货币基金A',
    amount: 50000000,
    liquidityLevel: 'HIGH',
    maturityDays: 1,
    sourceFile: 'fund_holdings_202401.xlsx',
    sourceLine: 15,
    createdAt: today.format('YYYY-MM-DD'),
  },
  {
    id: 'h002',
    fundCode: 'F001',
    assetName: '国债逆回购',
    amount: 30000000,
    liquidityLevel: 'HIGH',
    maturityDays: 1,
    sourceFile: 'fund_holdings_202401.xlsx',
    sourceLine: 16,
    createdAt: today.format('YYYY-MM-DD'),
  },
  {
    id: 'h003',
    fundCode: 'F001',
    assetName: '短期融资券A',
    amount: 25000000,
    liquidityLevel: 'MEDIUM',
    maturityDays: 30,
    sourceFile: 'fund_holdings_202401.xlsx',
    sourceLine: 23,
    createdAt: today.format('YYYY-MM-DD'),
  },
  {
    id: 'h004',
    fundCode: 'F001',
    assetName: '同业存单B',
    amount: 40000000,
    liquidityLevel: 'MEDIUM',
    maturityDays: 60,
    sourceFile: 'fund_holdings_202401.xlsx',
    sourceLine: 28,
    createdAt: today.format('YYYY-MM-DD'),
  },
  {
    id: 'h005',
    fundCode: 'F001',
    assetName: '企业债券C',
    amount: 35000000,
    liquidityLevel: 'LOW',
    maturityDays: 180,
    sourceFile: 'fund_holdings_202401.xlsx',
    sourceLine: 35,
    createdAt: today.format('YYYY-MM-DD'),
  },
  {
    id: 'h006',
    fundCode: 'F001',
    assetName: '股票组合',
    amount: 60000000,
    liquidityLevel: 'MEDIUM',
    maturityDays: 3,
    sourceFile: 'fund_holdings_202401.xlsx',
    sourceLine: 42,
    createdAt: today.format('YYYY-MM-DD'),
  },
  {
    id: 'h007',
    fundCode: 'F001',
    assetName: '定期存款',
    amount: 45000000,
    liquidityLevel: 'LOW',
    maturityDays: 90,
    sourceFile: 'fund_holdings_202401.xlsx',
    sourceLine: 50,
    createdAt: today.format('YYYY-MM-DD'),
  },
  {
    id: 'h008',
    fundCode: 'F001',
    assetName: '央行票据',
    amount: 20000000,
    liquidityLevel: 'HIGH',
    maturityDays: 7,
    sourceFile: 'fund_holdings_202401.xlsx',
    sourceLine: 18,
    createdAt: today.format('YYYY-MM-DD'),
  },
];

export const mockRedemptions: Redemption[] = [
  {
    id: 'r001',
    clientId: 'C001',
    clientName: '机构客户A',
    amount: 20000000,
    requestDate: today.format('YYYY-MM-DD'),
    valueDate: today.add(1, 'day').format('YYYY-MM-DD'),
    status: 'PENDING',
    sourceFile: 'client_redemption_202401.csv',
    sourceLine: 8,
  },
  {
    id: 'r002',
    clientId: 'C002',
    clientName: '个人高净值B',
    amount: 5000000,
    requestDate: today.format('YYYY-MM-DD'),
    valueDate: today.add(1, 'day').format('YYYY-MM-DD'),
    status: 'PENDING',
    sourceFile: 'client_redemption_202401.csv',
    sourceLine: 12,
  },
  {
    id: 'r003',
    clientId: 'C003',
    clientName: '保险公司C',
    amount: 35000000,
    requestDate: today.subtract(1, 'day').format('YYYY-MM-DD'),
    valueDate: today.add(3, 'day').format('YYYY-MM-DD'),
    status: 'PROCESSING',
    sourceFile: 'client_redemption_202401.csv',
    sourceLine: 15,
  },
  {
    id: 'r004',
    clientId: 'C004',
    clientName: '基金公司D',
    amount: 15000000,
    requestDate: today.subtract(2, 'day').format('YYYY-MM-DD'),
    valueDate: today.format('YYYY-MM-DD'),
    status: 'COMPLETED',
    sourceFile: 'client_redemption_202401.csv',
    sourceLine: 5,
  },
  {
    id: 'r005',
    clientId: 'C005',
    clientName: '信托公司E',
    amount: 28000000,
    requestDate: today.format('YYYY-MM-DD'),
    valueDate: today.add(2, 'day').format('YYYY-MM-DD'),
    status: 'PENDING',
    sourceFile: 'client_redemption_202401.csv',
    sourceLine: 22,
  },
];

export const mockCashPositions: CashPosition[] = [
  {
    id: 'c001',
    tradeDate: today.format('YYYY-MM-DD'),
    availableCash: 80000000,
    reservedCash: 25000000,
    reservedBy: 'r001,r002,r005',
    sourceFile: 'cash_position_202401.xlsx',
    sourceLine: 3,
  },
];

export const mockCorrectionTraces: CorrectionTrace[] = [];

export function generateHistoricalData(days: number) {
  const historicalHoldings: Record<string, Holding[]> = {};
  const historicalRedemptions: Record<string, Redemption[]> = {};
  
  for (let i = 0; i < days; i++) {
    const date = startDate.add(i, 'day').format('YYYY-MM-DD');
    historicalHoldings[date] = mockHoldings.map(h => ({
      ...h,
      amount: h.amount * (0.9 + Math.random() * 0.2),
    }));
    historicalRedemptions[date] = mockRedemptions
      .filter(r => dayjs(r.requestDate).isBefore(dayjs(date).add(1, 'day')))
      .map(r => ({
        ...r,
        status: dayjs(r.valueDate).isBefore(date) ? 'COMPLETED' : r.status,
      }));
  }
  
  return { historicalHoldings, historicalRedemptions };
}
