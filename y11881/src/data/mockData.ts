import { Denomination, Inventory, Shift, Transaction } from '../types';

export const defaultDenominations: Denomination[] = [
  { id: '100yuan', value: 100, name: '100元', currency: 'CNY', warningThreshold: 10, criticalThreshold: 3 },
  { id: '50yuan', value: 50, name: '50元', currency: 'CNY', warningThreshold: 15, criticalThreshold: 5 },
  { id: '20yuan', value: 20, name: '20元', currency: 'CNY', warningThreshold: 20, criticalThreshold: 8 },
  { id: '10yuan', value: 10, name: '10元', currency: 'CNY', warningThreshold: 30, criticalThreshold: 10 },
  { id: '5yuan', value: 5, name: '5元', currency: 'CNY', warningThreshold: 40, criticalThreshold: 15 },
  { id: '1yuan', value: 1, name: '1元', currency: 'CNY', warningThreshold: 50, criticalThreshold: 20 },
  { id: '5jiao', value: 0.5, name: '5角', currency: 'CNY', warningThreshold: 60, criticalThreshold: 25 },
  { id: '1jiao', value: 0.1, name: '1角', currency: 'CNY', warningThreshold: 80, criticalThreshold: 30 },
];

export function generateMockInventory(shiftId: string): Inventory[] {
  return defaultDenominations.map((denom) => ({
    id: `inv-${denom.id}-${shiftId}`,
    denominationId: denom.id,
    quantity: Math.floor(Math.random() * 30) + denom.criticalThreshold,
    lastUpdated: new Date(),
    shiftId,
  }));
}

export function generateMockShifts(): Shift[] {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const dayBefore = new Date(yesterday);
  dayBefore.setDate(dayBefore.getDate() - 1);

  return [
    {
      id: 'shift-day-1',
      name: '白班',
      startTime: new Date(dayBefore.setHours(8, 0, 0, 0)),
      endTime: new Date(dayBefore.setHours(16, 0, 0, 0)),
      operator: '张三',
      status: 'completed',
    },
    {
      id: 'shift-night-1',
      name: '夜班',
      startTime: new Date(dayBefore.setHours(16, 0, 0, 0)),
      endTime: new Date(yesterday.setHours(0, 0, 0, 0)),
      operator: '李四',
      status: 'completed',
    },
    {
      id: 'shift-day-2',
      name: '白班',
      startTime: new Date(yesterday.setHours(8, 0, 0, 0)),
      endTime: new Date(yesterday.setHours(16, 0, 0, 0)),
      operator: '王五',
      status: 'completed',
    },
    {
      id: 'shift-night-2',
      name: '夜班',
      startTime: new Date(yesterday.setHours(16, 0, 0, 0)),
      endTime: new Date(now.setHours(0, 0, 0, 0)),
      operator: '赵六',
      status: 'completed',
    },
    {
      id: 'shift-current',
      name: '夜班(当前)',
      startTime: new Date(now.setHours(22, 0, 0, 0)),
      operator: '陈七',
      status: 'active',
    },
  ];
}

export function generateMockTransactions(shifts: Shift[]): Transaction[] {
  const transactions: Transaction[] = [];
  const completedShifts = shifts.filter((s) => s.status === 'completed');

  for (const shift of completedShifts) {
    const txCount = Math.floor(Math.random() * 15) + 10;
    for (let i = 0; i < txCount; i++) {
      const receivable = Math.round((Math.random() * 90 + 10) * 100) / 100;
      const received = Math.ceil(receivable / 10) * 10;
      const changeAmount = Math.round((received - receivable) * 100) / 100;

      const txTime = new Date(shift.startTime);
      txTime.setMinutes(txTime.getMinutes() + Math.floor(Math.random() * 480));

      const changeDetails = generateRandomChange(changeAmount);

      transactions.push({
        id: `tx-${shift.id}-${i}`,
        shiftId: shift.id,
        receivableAmount: receivable,
        receivedAmount: received,
        changeAmount,
        timestamp: txTime,
        operator: shift.operator,
        status: Math.random() > 0.9 ? 'warning' : 'success',
        changeDetails,
        sourceTrace: {
          algorithm: 'dynamic-programming',
          inventorySnapshot: generateRandomInventorySnapshot(),
          timestamp: txTime,
          operator: shift.operator,
        },
      });
    }
  }

  return transactions.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

function generateRandomChange(amount: number) {
  const details: { denominationId: string; quantity: number; value: number }[] = [];
  let remaining = amount;

  const denoms = [
    { id: '100yuan', value: 100 },
    { id: '50yuan', value: 50 },
    { id: '20yuan', value: 20 },
    { id: '10yuan', value: 10 },
    { id: '5yuan', value: 5 },
    { id: '1yuan', value: 1 },
    { id: '5jiao', value: 0.5 },
    { id: '1jiao', value: 0.1 },
  ];

  for (const denom of denoms) {
    if (remaining >= denom.value) {
      const count = Math.floor(remaining / denom.value);
      if (count > 0) {
        details.push({
          denominationId: denom.id,
          quantity: count,
          value: denom.value * count,
        });
        remaining = Math.round((remaining - denom.value * count) * 100) / 100;
      }
    }
  }

  return details;
}

function generateRandomInventorySnapshot(): Record<string, number> {
  const snapshot: Record<string, number> = {};
  defaultDenominations.forEach((d) => {
    snapshot[d.id] = Math.floor(Math.random() * 50) + 10;
  });
  return snapshot;
}

export function getInitialData() {
  const shifts = generateMockShifts();
  const transactions = generateMockTransactions(shifts);
  const currentShift = shifts.find((s) => s.status === 'active')!;
  const inventory = generateMockInventory(currentShift.id);

  return {
    denominations: defaultDenominations,
    shifts,
    transactions,
    inventory,
    currentShift,
  };
}
