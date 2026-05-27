import type { FuturesData } from '../types';

const baseMonths = [
  '2025-01',
  '2025-02',
  '2025-03',
  '2025-04',
  '2025-05',
  '2025-06',
  '2025-07',
  '2025-08',
  '2025-09',
  '2025-10',
  '2025-11',
  '2025-12',
];

const timeWindows = [
  '2025-01-06',
  '2025-01-13',
  '2025-01-20',
  '2025-01-27',
  '2025-02-03',
  '2025-02-10',
  '2025-02-17',
  '2025-02-24',
  '2025-03-03',
  '2025-03-10',
];

const basePrice = 3500;

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function generateMockData(): FuturesData[] {
  const data: FuturesData[] = [];
  const rand = seededRandom(42);

  let originalRow = 2;

  for (let twIdx = 0; twIdx < timeWindows.length; twIdx++) {
    const timeWindow = timeWindows[twIdx];

    for (let mIdx = 0; mIdx < baseMonths.length; mIdx++) {
      const contractMonth = baseMonths[mIdx];

      if (twIdx >= 2 && twIdx <= 4 && mIdx === 5) {
        originalRow++;
        continue;
      }

      const monthFactor = mIdx * 2.5;
      const timeFactor = twIdx * 3;
      const noise = (rand() - 0.5) * 30;
      let price = basePrice + monthFactor + timeFactor + noise;

      if (twIdx >= 3 && twIdx <= 6 && mIdx >= 1 && mIdx <= 3) {
        price -= 50 + (rand() - 0.5) * 20;
      }

      const volume = Math.floor(1000 + rand() * 5000 * (1 - mIdx * 0.05));
      const basis = ((price - basePrice) / basePrice) * 100;

      data.push({
        id: `data-${originalRow}`,
        contractMonth,
        price: Math.round(price * 100) / 100,
        volume,
        basis: Math.round(basis * 100) / 100,
        timeWindow,
        notes: mIdx < 3 ? '近月合约，流动性较好' : mIdx > 9 ? '远月合约，流动性较低' : '',
        source: 'mock_data.csv',
        originalRow,
        status: twIdx >= 2 && twIdx <= 4 && mIdx === 4 ? 'warning' : 'normal',
      });

      originalRow++;
    }
  }

  return data;
}

export function getMockCSVContent(): string {
  const headers = ['合约月份', '价格', '成交量', '基差', '时间窗口', '研究备注', '来源'];
  const data = generateMockData();
  const rows = data.map((d) => [
    d.contractMonth,
    d.price,
    d.volume,
    d.basis,
    d.timeWindow,
    d.notes,
    d.source,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}