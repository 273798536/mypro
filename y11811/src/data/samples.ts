import { FundHolding, IndustryClassification, SamplePortfolio } from '@/types'

export const INDUSTRIES: IndustryClassification[] = [
  { id: 'ind-001', name: '信息技术', maxWeight: 25 },
  { id: 'ind-002', name: '医药生物', maxWeight: 20 },
  { id: 'ind-003', name: '消费', maxWeight: 20 },
  { id: 'ind-004', name: '金融', maxWeight: 20 },
  { id: 'ind-005', name: '新能源', maxWeight: 20 },
  { id: 'ind-006', name: '制造', maxWeight: 15 },
  { id: 'ind-007', name: '消费电子', maxWeight: 15 },
  { id: 'ind-008', name: '其他', maxWeight: 10 },
]

export const PROHIBITED_FUNDS: string[] = ['000008', '000012', '110011']

export const SAMPLE_PORTFOLIOS: SamplePortfolio[] = [
  {
    id: 'sample-balanced',
    name: '均衡组合（权重不满样例',
    description: '演示权重合计不足100%的边界样例，用于测试权重检查功能',
    holdings: [
      { fundCode: '000001', fundName: '华夏成长混合', weight: 15, industryId: 'ind-001', industryName: '信息技术', isProhibited: false },
      { fundCode: '000002', fundName: '嘉实增长混合', weight: 20, industryId: 'ind-002', industryName: '医药生物', isProhibited: false },
      { fundCode: '000003', fundName: '易方达平稳增长', weight: 18, industryId: 'ind-003', industryName: '消费', isProhibited: false },
      { fundCode: '000004', fundName: '南方稳健成长', weight: 15, industryId: 'ind-004', industryName: '金融', isProhibited: false },
      { fundCode: '000005', fundName: '博时价值增长', weight: 12, industryId: 'ind-005', industryName: '新能源', isProhibited: false },
    ],
    riskBudget: { volatilityLimit: 15, drawdownLimit: 10, industryConcentration: 25 },
  },
  {
    id: 'sample-industry',
    name: '行业超限组合（行业超限样例',
    description: '演示信息技术行业权重超过25%限制的边界样例',
    holdings: [
      { fundCode: '000006', fundName: '汇添富优势精选', weight: 30, industryId: 'ind-001', industryName: '信息技术', isProhibited: false },
      { fundCode: '000007', fundName: '广发聚丰混合', weight: 25, industryId: 'ind-001', industryName: '信息技术', isProhibited: false },
      { fundCode: '000009', fundName: '华安创新混合', weight: 20, industryId: 'ind-002', industryName: '医药生物', isProhibited: false },
      { fundCode: '000010', fundName: '富国天益价值', weight: 15, industryId: 'ind-003', industryName: '消费', isProhibited: false },
      { fundCode: '000011', fundName: '诺安成长混合', weight: 10, industryId: 'ind-005', industryName: '新能源', isProhibited: false },
    ],
    riskBudget: { volatilityLimit: 18, drawdownLimit: 12, industryConcentration: 25 },
  },
  {
    id: 'sample-prohibited',
    name: '禁买标的组合（禁买样例）',
    description: '演示包含禁买基金的边界样例',
    holdings: [
      { fundCode: '000008', fundName: '国泰金鹰增长', weight: 20, industryId: 'ind-001', industryName: '信息技术', isProhibited: true },
      { fundCode: '000012', fundName: '鹏华行业成长', weight: 20, industryId: 'ind-002', industryName: '医药生物', isProhibited: true },
      { fundCode: '000013', fundName: '融通新蓝筹混合', weight: 25, industryId: 'ind-003', industryName: '消费', isProhibited: false },
      { fundCode: '000014', fundName: '长城久富核心成长', weight: 20, industryId: 'ind-004', industryName: '金融', isProhibited: false },
      { fundCode: '000015', fundName: '宝康消费品', weight: 15, industryId: 'ind-005', industryName: '新能源', isProhibited: false },
    ],
    riskBudget: { volatilityLimit: 16, drawdownLimit: 11, industryConcentration: 25 },
  },
  {
    id: 'sample-normal',
    name: '标准合规组合',
    description: '完全合规的标准组合样例',
    holdings: [
      { fundCode: '110002', fundName: '易方达策略成长', weight: 18, industryId: 'ind-001', industryName: '信息技术', isProhibited: false },
      { fundCode: '110003', fundName: '易方达50指数', weight: 17, industryId: 'ind-004', industryName: '金融', isProhibited: false },
      { fundCode: '160505', fundName: '博时主题行业', weight: 20, industryId: 'ind-006', industryName: '制造', isProhibited: false },
      { fundCode: '161601', fundName: '融通新蓝筹', weight: 20, industryId: 'ind-002', industryName: '医药生物', isProhibited: false },
      { fundCode: '161604', fundName: '融通深证100', weight: 15, industryId: 'ind-003', industryName: '消费', isProhibited: false },
      { fundCode: '161706', fundName: '招商优质成长', weight: 10, industryId: 'ind-005', industryName: '新能源', isProhibited: false },
    ],
    riskBudget: { volatilityLimit: 15, drawdownLimit: 10, industryConcentration: 25 },
  },
]

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11)
}
