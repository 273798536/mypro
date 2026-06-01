import { CrackPoint, RiskReport } from '../types';
import { format } from 'date-fns';

export function generateRiskReport(cracks: CrackPoint[]): RiskReport {
  const totalCracks = cracks.length;
  const duplicateCount = cracks.filter((c) => c.isDuplicate).length;
  const missingFieldCount = cracks.filter((c) => c.status === 'missing_field').length;
  const lateAddedCount = cracks.filter((c) => c.status === 'late_added').length;
  const highRiskCount = cracks.filter((c) => c.riskLevel === 'high').length;
  const normalCount = cracks.filter((c) => c.status === 'normal').length;

  const duplicateNames = cracks
    .filter((c) => c.isDuplicate)
    .map((c) => c.name)
    .join('、');

  const missingNames = cracks
    .filter((c) => c.status === 'missing_field')
    .map((c) => c.name)
    .join('、');

  const highRiskNames = cracks
    .filter((c) => c.riskLevel === 'high')
    .map((c) => c.name)
    .join('、');

  const content = `
# 山地滑坡裂缝监测风险报告

**生成时间**: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}

## 一、数据概览

| 指标 | 数量 |
|------|------|
| 裂缝总数 | ${totalCracks} |
| 正常记录 | ${normalCount} |
| **重复记录** | **${duplicateCount}** |
| 缺字段记录 | ${missingFieldCount} |
| 晚补记录 | ${lateAddedCount} |
| 高风险裂缝 | ${highRiskCount} |

## 二、重点问题

### 1. 重复记录问题
共发现 **${duplicateCount}** 条疑似重复记录，请重点核实：
${duplicateNames ? '- ' + duplicateNames : '- 暂无重复记录'}

### 2. 数据缺失问题
共发现 **${missingFieldCount}** 条记录存在字段缺失：
${missingNames ? '- ' + missingNames : '- 暂无数据缺失'}

### 3. 高风险裂缝
共 **${highRiskCount}** 条高风险裂缝需要重点关注：
${highRiskNames ? '- ' + highRiskNames : '- 暂无高风险裂缝'}

## 三、处理建议

1. **优先处理重复数据**：建议对重复记录进行合并或删除，确保数据准确性
2. **补全缺失字段**：及时补充雨量数据和住户坐标信息
3. **高风险监测**：对高风险裂缝增加监测频次
4. **数据质量管控**：建立数据录入审核机制，避免重复录入

## 四、备注

本报告基于系统自动检测生成，仅供参考。实际情况请结合现场勘查确认。
  `.trim();

  return {
    id: `report_${Date.now()}`,
    generateTime: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
    totalCracks,
    duplicateCount,
    missingFieldCount,
    lateAddedCount,
    content,
  };
}

export function downloadReport(report: RiskReport): void {
  const blob = new Blob([report.content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `滑坡风险报告_${report.generateTime.replace(/[:\s]/g, '-')}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
