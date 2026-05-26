import { db } from '../db/dexie';
import { CustomerOrder, BankStatement, PlatformBill, ExchangeRate } from '../types';

const customers = [
  'ABC贸易有限公司',
  'XYZ进出口集团',
  '环球商贸有限公司',
  '东方国际货运',
  '新世纪电子科技',
  '华洋国际采购',
  '恒信外贸服务',
  '利达国际物流',
];

const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'HKD'] as const;

const platforms = ['PayPal', 'Stripe', 'Alipay', 'Payoneer', 'WorldFirst'];

const banks = ['招商银行', '工商银行', '建设银行', '中国银行'];

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatDateTime(date: Date): string {
  return date.toISOString();
}

export async function generateMockData(days: number = 30): Promise<void> {
  await db.clearAll();

  const now = new Date();
  const orders: CustomerOrder[] = [];
  const statements: BankStatement[] = [];
  const bills: PlatformBill[] = [];
  const rates: ExchangeRate[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = formatDate(date);

    rates.push({
      id: `rate_${dateStr}_USD_CNY`,
      baseCurrency: 'USD',
      targetCurrency: 'CNY',
      rate: 7.15 + (Math.random() - 0.5) * 0.3,
      date: dateStr,
      source: '央行中间价',
      createdAt: formatDateTime(date),
      updatedAt: formatDateTime(date),
    });

    rates.push({
      id: `rate_${dateStr}_EUR_CNY`,
      baseCurrency: 'EUR',
      targetCurrency: 'CNY',
      rate: 7.75 + (Math.random() - 0.5) * 0.3,
      date: dateStr,
      source: '央行中间价',
      createdAt: formatDateTime(date),
      updatedAt: formatDateTime(date),
    });

    rates.push({
      id: `rate_${dateStr}_GBP_CNY`,
      baseCurrency: 'GBP',
      targetCurrency: 'CNY',
      rate: 9.05 + (Math.random() - 0.5) * 0.3,
      date: dateStr,
      source: '央行中间价',
      createdAt: formatDateTime(date),
      updatedAt: formatDateTime(date),
    });

    rates.push({
      id: `rate_${dateStr}_HKD_CNY`,
      baseCurrency: 'HKD',
      targetCurrency: 'CNY',
      rate: 0.92 + (Math.random() - 0.5) * 0.02,
      date: dateStr,
      source: '央行中间价',
      createdAt: formatDateTime(date),
      updatedAt: formatDateTime(date),
    });

    rates.push({
      id: `rate_${dateStr}_JPY_CNY`,
      baseCurrency: 'JPY',
      targetCurrency: 'CNY',
      rate: 0.048 + (Math.random() - 0.5) * 0.003,
      date: dateStr,
      source: '央行中间价',
      createdAt: formatDateTime(date),
      updatedAt: formatDateTime(date),
    });

    const orderCount = randomBetween(2, 5);
    for (let j = 0; j < orderCount; j++) {
      const orderNo = `ORD${dateStr.replace(/-/g, '')}${String(j + 1).padStart(3, '0')}`;
      const currency = randomFrom(currencies);
      let amount: number;

      switch (currency) {
        case 'USD':
          amount = randomBetween(5000, 50000);
          break;
        case 'EUR':
          amount = randomBetween(4000, 45000);
          break;
        case 'GBP':
          amount = randomBetween(3500, 40000);
          break;
        case 'JPY':
          amount = randomBetween(500000, 5000000);
          break;
        case 'HKD':
          amount = randomBetween(40000, 400000);
          break;
        default:
          amount = randomBetween(5000, 50000);
      }

      const order: CustomerOrder = {
        id: `order_${orderNo}`,
        orderNo,
        customerName: randomFrom(customers),
        currency,
        amount,
        orderDate: dateStr,
        source: 'ERP系统导入',
        createdAt: formatDateTime(date),
      };
      orders.push(order);

      const hasBill = Math.random() > 0.3;
      if (hasBill) {
        const platform = randomFrom(platforms);
        const feeRate = 0.02 + Math.random() * 0.04;
        const feeAmount = Math.round(amount * feeRate * 100) / 100;

        const bill: PlatformBill = {
          id: `bill_${orderNo}`,
          billNo: `BILL${dateStr.replace(/-/g, '')}${String(j + 1).padStart(3, '0')}`,
          platform,
          billDate: dateStr,
          currency,
          grossAmount: amount,
          feeAmount,
          netAmount: Math.round((amount - feeAmount) * 100) / 100,
          orderNo,
          source: '平台导出',
          createdAt: formatDateTime(date),
        };
        bills.push(bill);
      }

      const hasStatement = Math.random() > 0.15;
      if (hasStatement) {
        const receiptDelay = randomBetween(0, 5);
        const receiptDate = new Date(date);
        receiptDate.setDate(receiptDate.getDate() + receiptDelay);
        const receiptDateStr = formatDate(receiptDate);

        const isPartial = Math.random() > 0.85;
        const receiptMultiplier = isPartial ? 0.5 + Math.random() * 0.4 : 0.95 + Math.random() * 0.1;
        const statementAmount = Math.round(amount * receiptMultiplier * 100) / 100;

        const usdToCny = rates.find(
          (r) => r.baseCurrency === 'USD' && r.targetCurrency === 'CNY' && r.date === dateStr
        );
        const eurToCny = rates.find(
          (r) => r.baseCurrency === 'EUR' && r.targetCurrency === 'CNY' && r.date === dateStr
        );

        let cnyAmount: number;
        if (currency === 'USD' && usdToCny) {
          cnyAmount = statementAmount * usdToCny.rate;
        } else if (currency === 'EUR' && eurToCny) {
          cnyAmount = statementAmount * eurToCny.rate;
        } else {
          cnyAmount = statementAmount * 7.2;
        }

        const statement: BankStatement = {
          id: `stmt_${orderNo}`,
          referenceNo: `TXN${receiptDateStr.replace(/-/g, '')}${String(j + 1).padStart(3, '0')}`,
          transactionDate: receiptDateStr,
          currency: 'CNY',
          receivedAmount: Math.round(cnyAmount * 100) / 100,
          bank: randomFrom(banks),
          payerInfo: orders[orders.length - 1].customerName,
          source: '银行网银导出',
          createdAt: formatDateTime(receiptDate),
        };
        statements.push(statement);
      }
    }
  }

  await Promise.all([
    db.customerOrders.bulkAdd(orders),
    db.bankStatements.bulkAdd(statements),
    db.platformBills.bulkAdd(bills),
    db.exchangeRates.bulkAdd(rates),
  ]);

  console.log(`Mock数据生成完成：
    - 客户订单: ${orders.length} 条
    - 银行水单: ${statements.length} 条
    - 平台账单: ${bills.length} 条
    - 汇率数据: ${rates.length} 条
  `);
}

export async function clearAllData(): Promise<void> {
  await db.clearAll();
}

export async function getDatabaseStats(): Promise<{
  orderCount: number;
  statementCount: number;
  billCount: number;
  rateCount: number;
  matchingCount: number;
  lossCount: number;
}> {
  const [orderCount, statementCount, billCount, rateCount, matchingCount, lossCount] =
    await Promise.all([
      db.customerOrders.count(),
      db.bankStatements.count(),
      db.platformBills.count(),
      db.exchangeRates.count(),
      db.matchingRecords.count(),
      db.exchangeLosses.count(),
    ]);

  return {
    orderCount,
    statementCount,
    billCount,
    rateCount,
    matchingCount,
    lossCount,
  };
}
