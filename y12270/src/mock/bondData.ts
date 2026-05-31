import type { BondHolding, Version } from '../types';

const INDUSTRIES = [
  '国债', '地方政府债', '金融债', '企业债', '公司债',
  '中期票据', '短期融资券', '资产支持证券', '可转债', '可交换债'
];

const BOND_NAMES = [
  '24国债01', '24国开01', '24进出01', '24农发01', '24沪债01',
  '24粤债01', '24苏债01', '24浙债01', '24鲁债01', '24京债01',
  '24工行01', '24建行01', '24农行01', '24中行01', '24交行01',
  '24招商01', '24中信01', '24兴业01', '24浦发01', '24民生01',
  '24万科01', '24保利01', '24招商局01', '24华润01', '24中粮01',
  '24中石油01', '24中石化01', '24中海油01', '24国家电网01', '24南方电网01',
  '24中铁01', '24中建01', '24中交01', '24中铁建01', '24中冶01',
  '24华为01', '24腾讯01', '24阿里01', '24百度01', '24京东01',
  '24茅台01', '24五粮液01', '24洋河01', '24泸州老窖01', '24汾酒01',
  '24宁德01', '24比亚迪01', '24特斯拉01', '24隆基01', '24通威01'
];

const DATA_SOURCES = [
  'Wind资讯', '同花顺iFinD', '东方财富Choice', 'Bloomberg', '路透'
];

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function generateMockBondHoldings(count: number = 100): BondHolding[] {
  const holdings: BondHolding[] = [];
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    const seed = i * 12345 + 789;
    const random1 = seededRandom(seed);
    const random2 = seededRandom(seed + 1);
    const random3 = seededRandom(seed + 2);
    const random4 = seededRandom(seed + 3);
    
    const duration = 0.5 + random1 * 15;
    const yieldValue = 1.5 + random2 * 5;
    const faceValue = 1000000 + Math.floor(random3 * 9000000);
    const weight = random4 < 0.05 ? null : Math.round(random4 * 10000) / 100;
    
    holdings.push({
      bondId: `${String(i + 1).padStart(6, '0')}${generateId().toUpperCase()}`,
      bondName: BOND_NAMES[i % BOND_NAMES.length].replace('01', String(Math.floor(i / 10) + 1).padStart(2, '0')),
      industry: INDUSTRIES[i % INDUSTRIES.length],
      duration: Math.round(duration * 100) / 100,
      yield: Math.round(yieldValue * 100) / 100,
      weight,
      faceValue,
      source: DATA_SOURCES[i % DATA_SOURCES.length],
      importTime: new Date(now.getTime() - random1 * 7 * 24 * 60 * 60 * 1000)
    });
  }
  
  return holdings;
}

export function generateMockVersions(): Version[] {
  const now = new Date();
  return [
    {
      versionId: 'v-' + generateId(),
      name: '2024年Q4持仓',
      description: '2024年第四季度债券组合持仓数据，包含100只债券',
      source: 'Wind资讯',
      createdAt: new Date(now.getTime() - 0 * 24 * 60 * 60 * 1000),
      createdBy: '张研究员',
      parentVersion: null,
      holdingCount: 100
    },
    {
      versionId: 'v-' + generateId(),
      name: '2024年Q3持仓',
      description: '2024年第三季度债券组合持仓数据',
      source: 'Wind资讯',
      createdAt: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      createdBy: '李研究员',
      parentVersion: null,
      holdingCount: 95
    },
    {
      versionId: 'v-' + generateId(),
      name: '2024年Q3调整版',
      description: 'Q3持仓数据调整版，修正了5只债券的久期数据',
      source: 'Wind资讯 + 手动修正',
      createdAt: new Date(now.getTime() - 80 * 24 * 60 * 60 * 1000),
      createdBy: '李研究员',
      parentVersion: 'v-002',
      holdingCount: 95
    }
  ];
}

export const MOCK_HOLDINGS = generateMockBondHoldings(100);
export const MOCK_VERSIONS = generateMockVersions();

export const INDUSTRY_COLORS: Record<string, string> = {
  '国债': '#ef4444',
  '地方政府债': '#f97316',
  '金融债': '#eab308',
  '企业债': '#22c55e',
  '公司债': '#06b6d4',
  '中期票据': '#3b82f6',
  '短期融资券': '#8b5cf6',
  '资产支持证券': '#ec4899',
  '可转债': '#f43f5e',
  '可交换债': '#64748b'
};
