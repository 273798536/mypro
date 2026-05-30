import { DataRow, UploadedFile, FieldInfo } from '@/types';

function generateLaggedData(
  baseData: number[],
  lag: number,
  noise: number = 0.1
): number[] {
  const result: number[] = [];
  for (let i = 0; i < baseData.length; i++) {
    const sourceIndex = Math.max(0, i - lag);
    const noiseValue = (Math.random() - 0.5) * noise * (Math.max(...baseData) - Math.min(...baseData));
    result.push(baseData[sourceIndex] + noiseValue);
  }
  return result;
}

function generateTrendData(
  length: number,
  start: number,
  slope: number,
  noise: number = 0.1
): number[] {
  const result: number[] = [];
  for (let i = 0; i < length; i++) {
    const trend = start + slope * i;
    const noiseValue = (Math.random() - 0.5) * noise * (Math.abs(start) + Math.abs(slope * length));
    result.push(trend + noiseValue);
  }
  return result;
}

function generateDateSeries(length: number, startDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);
  for (let i = 0; i < length; i++) {
    dates.push(current.toISOString().split('T')[0]);
    current.setMonth(current.getMonth() + 1);
  }
  return dates;
}

export function generateMockData(): UploadedFile[] {
  const length = 36;
  const dates = generateDateSeries(length, '2022-01-01');
  
  const adSpend = generateTrendData(length, 100, 5, 0.15);
  const sales = generateLaggedData(adSpend, 2, 0.2);
  const userGrowth = generateTrendData(length, 50, 3, 0.1);
  const revenue = generateLaggedData(userGrowth, 1, 0.15);
  const iceCream = generateTrendData(length, 20, 2, 0.3);
  const drowning = generateTrendData(length, 5, 0.5, 0.2);
  
  const marketingRows: DataRow[] = [];
  for (let i = 0; i < length; i++) {
    marketingRows.push({
      日期: dates[i],
      广告投入: Math.round(adSpend[i] * 100) / 100,
      销售额: Math.round(sales[i] * 100) / 100,
      渠道: '线上',
      __sourceFile: 'marketing_data.csv',
      __rowIndex: i + 1,
      __sourceFiles: []
    });
  }
  
  const userRows: DataRow[] = [];
  for (let i = 0; i < length; i++) {
    userRows.push({
      日期: dates[i],
      用户增长: Math.round(userGrowth[i] * 100) / 100,
      营收: Math.round(revenue[i] * 100) / 100,
      地区: '华东',
      __sourceFile: 'user_data.csv',
      __rowIndex: i + 1,
      __sourceFiles: []
    });
  }
  
  const spuriousRows: DataRow[] = [];
  for (let i = 0; i < length; i++) {
    spuriousRows.push({
      日期: dates[i],
      冰淇淋销量: Math.round(iceCream[i] * 100) / 100,
      溺水人数: Math.round(drowning[i] * 100) / 100,
      季节: i % 12 < 3 ? '冬' : i % 12 < 6 ? '春' : i % 12 < 9 ? '夏' : '秋',
      __sourceFile: 'spurious_correlation.csv',
      __rowIndex: i + 1,
      __sourceFiles: []
    });
  }
  
  const files: UploadedFile[] = [
    {
      id: 'mock-marketing',
      name: 'marketing_data.csv',
      rows: marketingRows,
      fields: [
        { name: '日期', type: 'time', sampleValues: dates.slice(0, 5) },
        { name: '广告投入', type: 'metric', sampleValues: adSpend.slice(0, 5) },
        { name: '销售额', type: 'metric', sampleValues: sales.slice(0, 5) },
        { name: '渠道', type: 'group', sampleValues: ['线上', '线上', '线上', '线上', '线上'] }
      ]
    },
    {
      id: 'mock-user',
      name: 'user_data.csv',
      rows: userRows,
      fields: [
        { name: '日期', type: 'time', sampleValues: dates.slice(0, 5) },
        { name: '用户增长', type: 'metric', sampleValues: userGrowth.slice(0, 5) },
        { name: '营收', type: 'metric', sampleValues: revenue.slice(0, 5) },
        { name: '地区', type: 'group', sampleValues: ['华东', '华东', '华东', '华东', '华东'] }
      ]
    },
    {
      id: 'mock-spurious',
      name: 'spurious_correlation.csv',
      rows: spuriousRows,
      fields: [
        { name: '日期', type: 'time', sampleValues: dates.slice(0, 5) },
        { name: '冰淇淋销量', type: 'metric', sampleValues: iceCream.slice(0, 5) },
        { name: '溺水人数', type: 'metric', sampleValues: drowning.slice(0, 5) },
        { name: '季节', type: 'group', sampleValues: ['冬', '冬', '冬', '春', '春'] }
      ]
    }
  ];
  
  return files;
}

export function getMockAnalysisParams() {
  return {
    timeField: '日期',
    groupFields: ['渠道', '地区', '季节'],
    metricFields: ['广告投入', '销售额', '用户增长', '营收', '冰淇淋销量', '溺水人数'],
    timeRange: { start: null, end: null },
    maxLag: 6,
    correlationThreshold: 0.7,
    trendThreshold: 0.6
  };
}
