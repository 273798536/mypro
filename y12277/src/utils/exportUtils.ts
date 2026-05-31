import { Institution, Indicator, RegionCoord, RiskReport, ExportRecord } from '../types';

function toCSV(data: Record<string, any>[], headers: string[]): string {
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',')
    )
  ].join('\n');
  return csvContent;
}

function downloadCSV(content: string, filename: string) {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportIndicators(
  institution: Institution,
  indicators: Indicator[],
  operator: string
): ExportRecord {
  const data = indicators.map(ind => ({
    '机构ID': institution.id,
    '机构名称': institution.name,
    '机构类型': institution.type,
    '指标名称': ind.name,
    '指标值': ind.isMissing ? '缺失' : ind.value,
    '统计月份': ind.month,
    '是否缺失': ind.isMissing ? '是' : '否',
    '缺失月份': ind.missingMonth || '',
    '数据来源材料': ind.sourceMaterial,
    '缺失材料': ind.missingMaterial || ''
  }));

  const headers = [
    '机构ID', '机构名称', '机构类型', '指标名称', '指标值',
    '统计月份', '是否缺失', '缺失月份', '数据来源材料', '缺失材料'
  ];

  const csv = toCSV(data, headers);
  const filename = `${institution.name}_指标数据_${new Date().toISOString().slice(0, 10)}.csv`;
  downloadCSV(csv, filename);

  return {
    id: `export-${Date.now()}`,
    exportTime: new Date().toISOString(),
    operator,
    exportType: 'indicators',
    materialCorrespondence: `指标数据来源包含: ${[...new Set(indicators.map(i => i.sourceMaterial))].join(', ')}`
  };
}

export function exportCoordinates(
  institutions: Institution[],
  regionCoords: RegionCoord[],
  operator: string
): ExportRecord {
  const data = institutions.map(inst => {
    const coord = regionCoords.find(c => c.institutionId === inst.id);
    return {
      '机构ID': inst.id,
      '机构名称': inst.name,
      '机构类型': inst.type,
      '所属区域': inst.region,
      '地形X坐标': inst.coordinateX,
      '地形Z坐标': inst.coordinateZ,
      '区域中心X': coord?.centerX.toFixed(2) || '',
      '区域中心Z': coord?.centerZ.toFixed(2) || '',
      '区域半径': coord?.radius.toFixed(2) || '',
      '重叠机构': coord?.overlappingWith.map(id => {
        const overlapInst = institutions.find(i => i.id === id);
        return overlapInst?.name || id;
      }).join('; ') || '',
      '坐标来源材料': coord?.sourceMaterial || ''
    };
  });

  const headers = [
    '机构ID', '机构名称', '机构类型', '所属区域', '地形X坐标', '地形Z坐标',
    '区域中心X', '区域中心Z', '区域半径', '重叠机构', '坐标来源材料'
  ];

  const csv = toCSV(data, headers);
  const filename = `机构区域坐标映射_${new Date().toISOString().slice(0, 10)}.csv`;
  downloadCSV(csv, filename);

  return {
    id: `export-${Date.now()}`,
    exportTime: new Date().toISOString(),
    operator,
    exportType: 'coordinates',
    materialCorrespondence: `坐标数据来源包含: ${[...new Set(regionCoords.map(c => c.sourceMaterial))].join(', ')}`
  };
}

export function exportRiskReport(
  institution: Institution,
  report: RiskReport,
  indicators: Indicator[],
  riskScore: { score: number; level: string; month: string },
  operator: string
): ExportRecord {
  const reportContent = `
# ${report.title}

## 一、机构基本信息
- 机构ID: ${institution.id}
- 机构名称: ${institution.name}
- 机构类型: ${institution.type}
- 所属区域: ${institution.region}
- 报告月份: ${report.month}
- 撰写人: ${report.author}

## 二、综合风险评估
- 风险得分: ${riskScore.score.toFixed(1)}
- 风险等级: ${riskScore.level}
- 评估月份: ${riskScore.month}

## 三、报告摘要
${report.content}

## 四、指标明细
${indicators.map(ind => `
### ${ind.name}
- 指标值: ${ind.isMissing ? '数据缺失' : ind.value.toFixed(2)}
- 统计月份: ${ind.month}
- 数据来源: ${ind.sourceMaterial}
${ind.isMissing ? `- 缺失说明: ${ind.missingMonth} 数据缺失, 对应材料: ${ind.missingMaterial}` : ''}
`).join('')}

## 五、材料对应关系
- 风险报告: ${report.id}
- 数据来源材料: ${[...new Set(indicators.map(i => i.sourceMaterial))].join(', ')}

---
*导出时间: ${new Date().toLocaleString()}*
*导出人: ${operator}*
  `.trim();

  const blob = new Blob([reportContent], { type: 'text/markdown;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  const filename = `${institution.name}_${report.month}_风险报告.md`;
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return {
    id: `export-${Date.now()}`,
    exportTime: new Date().toISOString(),
    operator,
    exportType: 'report',
    materialCorrespondence: `报告 ${report.id} 关联指标数据来源: ${[...new Set(indicators.map(i => i.sourceMaterial))].join(', ')}`
  };
}
