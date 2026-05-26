import type { OptionDataPoint } from '@/types';

const generateId = (): string => Math.random().toString(36).substr(2, 9);

export const generateMockOptionData = (): OptionDataPoint[] => {
  const expirationDates = [
    '2026-06-17', '2026-07-15', '2026-08-19', '2026-09-16',
    '2026-10-21', '2026-11-18', '2026-12-16', '2027-01-20',
  ];
  
  const strikePrices = Array.from({ length: 15 }, (_, i) => 4200 + i * 100);
  
  const dataPoints: OptionDataPoint[] = [];
  let sourceRow = 2;
  
  const baseVolatility = (strike: number, expiration: string): number => {
    const atmStrike = 4900;
    const strikeDiff = Math.abs(strike - atmStrike) / atmStrike;
    const daysToExp = (new Date(expiration).getTime() - new Date('2026-05-27').getTime()) / (1000 * 60 * 60 * 24);
    const timeFactor = Math.sqrt(daysToExp / 365);
    const smile = 0.15 + strikeDiff * 0.5 + (strike < atmStrike ? 0.05 : 0);
    return 0.12 + smile * 0.5 + timeFactor * 0.1;
  };
  
  expirationDates.forEach((expDate, expIdx) => {
    strikePrices.forEach((strike, strikeIdx) => {
      const baseVol = baseVolatility(strike, expDate);
      const noise = (Math.random() - 0.5) * 0.03;
      let impliedVol = Math.max(0.05, Math.min(0.8, baseVol + noise));
      
      const isMissingQuote = Math.random() < 0.05;
      const isSpike = expIdx === 3 && strikeIdx === 7;
      const isMismatch = expIdx === 5 && strikeIdx === 5;
      
      if (isSpike) {
        impliedVol = 0.65;
      }
      
      if (isMismatch) {
        impliedVol = 0.45;
      }
      
      const midPrice = strike * impliedVol * 0.1;
      
      dataPoints.push({
        id: generateId(),
        sourceRow: sourceRow++,
        sourceFile: 'option_chain_20260527.csv',
        expirationDate: expDate,
        strikePrice: strike,
        impliedVolatility: impliedVol,
        volume: Math.floor(Math.random() * 5000),
        openInterest: Math.floor(Math.random() * 20000),
        bid: isMissingQuote ? null : +(midPrice * 0.98 + Math.random() * 0.5).toFixed(2),
        ask: isMissingQuote ? null : +(midPrice * 1.02 + Math.random() * 0.5).toFixed(2),
        lastPrice: isMissingQuote && Math.random() < 0.5 
          ? null 
          : +(midPrice + (Math.random() - 0.5) * 2).toFixed(2),
      });
    });
  });
  
  return dataPoints;
};

export const generateSampleAnnotations = (): {
  dataPointId: string;
  author: string;
  content: string;
  revision: number;
  previousValue?: number;
  newValue?: number;
}[] => {
  return [
    {
      dataPointId: 'sample-1',
      author: '研究员A',
      content: '此点为异常尖峰，怀疑数据源错误，需要核实',
      revision: 1,
      previousValue: 0.65,
      newValue: 0.22,
    },
    {
      dataPointId: 'sample-2',
      author: '研究员B',
      content: '缺失报价，已联系交易台补数据',
      revision: 1,
    },
    {
      dataPointId: 'sample-1',
      author: '研究员A',
      content: '确认是数据源错误，已修正',
      revision: 2,
    },
  ];
};
