export interface MonthlyTemperature {
  month: string;
  avgTemp: number;
  heatingDays: number;
}

export interface RegionTemperatureData {
  id: string;
  name: string;
  monthlyData: MonthlyTemperature[];
  source: string;
}

export const regionTemperatureData: RegionTemperatureData[] = [
  {
    id: 'beijing',
    name: '北京',
    monthlyData: [
      { month: '1月', avgTemp: -3, heatingDays: 31 },
      { month: '2月', avgTemp: 0, heatingDays: 28 },
      { month: '3月', avgTemp: 7, heatingDays: 20 },
      { month: '4月', avgTemp: 15, heatingDays: 5 },
      { month: '5月', avgTemp: 22, heatingDays: 0 },
      { month: '6月', avgTemp: 26, heatingDays: 0 },
      { month: '7月', avgTemp: 28, heatingDays: 0 },
      { month: '8月', avgTemp: 27, heatingDays: 0 },
      { month: '9月', avgTemp: 22, heatingDays: 0 },
      { month: '10月', avgTemp: 14, heatingDays: 10 },
      { month: '11月', avgTemp: 5, heatingDays: 25 },
      { month: '12月', avgTemp: -1, heatingDays: 31 }
    ],
    source: '中国气象局2023年统计数据'
  },
  {
    id: 'shanghai',
    name: '上海',
    monthlyData: [
      { month: '1月', avgTemp: 5, heatingDays: 25 },
      { month: '2月', avgTemp: 7, heatingDays: 20 },
      { month: '3月', avgTemp: 11, heatingDays: 10 },
      { month: '4月', avgTemp: 17, heatingDays: 0 },
      { month: '5月', avgTemp: 22, heatingDays: 0 },
      { month: '6月', avgTemp: 26, heatingDays: 0 },
      { month: '7月', avgTemp: 30, heatingDays: 0 },
      { month: '8月', avgTemp: 30, heatingDays: 0 },
      { month: '9月', avgTemp: 25, heatingDays: 0 },
      { month: '10月', avgTemp: 20, heatingDays: 0 },
      { month: '11月', avgTemp: 13, heatingDays: 8 },
      { month: '12月', avgTemp: 7, heatingDays: 22 }
    ],
    source: '中国气象局2023年统计数据'
  },
  {
    id: 'harbin',
    name: '哈尔滨',
    monthlyData: [
      { month: '1月', avgTemp: -19, heatingDays: 31 },
      { month: '2月', avgTemp: -14, heatingDays: 28 },
      { month: '3月', avgTemp: -5, heatingDays: 31 },
      { month: '4月', avgTemp: 6, heatingDays: 15 },
      { month: '5月', avgTemp: 15, heatingDays: 0 },
      { month: '6月', avgTemp: 22, heatingDays: 0 },
      { month: '7月', avgTemp: 24, heatingDays: 0 },
      { month: '8月', avgTemp: 22, heatingDays: 0 },
      { month: '9月', avgTemp: 15, heatingDays: 5 },
      { month: '10月', avgTemp: 5, heatingDays: 25 },
      { month: '11月', avgTemp: -7, heatingDays: 30 },
      { month: '12月', avgTemp: -16, heatingDays: 31 }
    ],
    source: '中国气象局2023年统计数据'
  },
  {
    id: 'guangzhou',
    name: '广州',
    monthlyData: [
      { month: '1月', avgTemp: 14, heatingDays: 0 },
      { month: '2月', avgTemp: 15, heatingDays: 0 },
      { month: '3月', avgTemp: 18, heatingDays: 0 },
      { month: '4月', avgTemp: 23, heatingDays: 0 },
      { month: '5月', avgTemp: 27, heatingDays: 0 },
      { month: '6月', avgTemp: 29, heatingDays: 0 },
      { month: '7月', avgTemp: 30, heatingDays: 0 },
      { month: '8月', avgTemp: 30, heatingDays: 0 },
      { month: '9月', avgTemp: 28, heatingDays: 0 },
      { month: '10月', avgTemp: 25, heatingDays: 0 },
      { month: '11月', avgTemp: 20, heatingDays: 0 },
      { month: '12月', avgTemp: 15, heatingDays: 0 }
    ],
    source: '中国气象局2023年统计数据'
  }
];

export const getRegionTemperatureById = (id: string): RegionTemperatureData | undefined => {
  return regionTemperatureData.find(r => r.id === id);
};

export const getDefaultRegionTemperature = (): RegionTemperatureData => {
  return regionTemperatureData[0];
};
