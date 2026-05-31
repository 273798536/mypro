import type { Region, MonthlyMetrics } from '@/types';

const regionNames = [
  '北京', '上海', '广州', '深圳', '杭州',
  '成都', '武汉', '西安', '南京', '重庆',
  '苏州', '天津', '长沙', '郑州', '青岛',
  '大连', '厦门', '宁波', '无锡', '合肥',
];

export function generateMockData(): { regions: Region[]; monthlyData: Record<string, MonthlyMetrics[]> } {
  const regions: Region[] = [];
  const monthlyData: Record<string, MonthlyMetrics[]> = {};

  const rows = 5;
  const cols = 4;
  let regionIndex = 0;

  for (let row = 0; row < rows && regionIndex < regionNames.length; row++) {
    for (let col = 0; col < cols && regionIndex < regionNames.length; col++) {
      const id = `region-${regionIndex}`;
      const name = regionNames[regionIndex];
      const isPartial = regionIndex === 5 || regionIndex === 12;
      const hasExtreme = regionIndex === 3;

      regions.push({
        id,
        name,
        center: [col * 2.5 - (cols - 1) * 1.25, row * 2.5 - (rows - 1) * 1.25],
        gridPos: { row, col },
        status: isPartial ? 'partial' : 'complete',
        dataSource: {
          boundary: {
            source: '国家地理信息系统 v2.1',
            importedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
            importedBy: '数据管理部-张三',
            version: '2.1.0',
          },
          lossRatio: !isPartial
            ? {
                source: '理赔系统月度报表',
                importedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
                importedBy: '理赔部-李四',
                version: '1.5.2',
              }
            : undefined,
          premium: !isPartial
            ? {
                source: '核心业务系统',
                importedAt: new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000).toISOString(),
                importedBy: '财务部-王五',
                version: '3.0.0',
              }
            : undefined,
          hazardExposure: !isPartial
            ? {
                source: '灾害风险评估模型',
                importedAt: new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000).toISOString(),
                importedBy: '精算部-赵六',
                version: '1.2.0',
              }
            : undefined,
        },
      });

      const metrics: MonthlyMetrics[] = [];
      const baseLossRatio = 0.4 + Math.random() * 0.4;
      const basePremium = 50000000 + Math.random() * 150000000;
      const baseHazard = 0.3 + Math.random() * 0.5;

      for (let month = 0; month < 12; month++) {
        const isMissing = isPartial && month > 6;
        const isExtremeLoss = hasExtreme && month === 6;

        if (!isMissing) {
          metrics.push({
            regionId: id,
            year: 2024,
            month: month + 1,
            lossRatio: isExtremeLoss ? 2.5 : baseLossRatio + (Math.random() - 0.5) * 0.2,
            premium: basePremium * (1 + (Math.random() - 0.5) * 0.3),
            hazardExposure: baseHazard + (Math.random() - 0.5) * 0.2,
          });
        }
      }

      monthlyData[id] = metrics;
      regionIndex++;
    }
  }

  return { regions, monthlyData };
}
