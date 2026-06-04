import { useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { exportToCSV, exportToExcel, downloadFile } from '../utils/fileParser';
import { formatDateTime } from '../utils/coordinate';

export function useDataExport() {
  const trackPoints = useAppStore(state => state.trackPoints);
  const sourceMaterials = useAppStore(state => state.sourceMaterials);
  const currentBatch = useAppStore(state => state.currentBatch);
  const getFilteredPoints = useAppStore(state => state.getFilteredPoints);
  const exportData = useAppStore(state => state.exportData);

  const exportCSV = useCallback((includeAll: boolean = true) => {
    const points = includeAll ? trackPoints : getFilteredPoints();
    const csvContent = exportToCSV(points, sourceMaterials);
    const batchName = currentBatch?.name || '轨迹数据';
    const filename = `${batchName}_${formatDateTime(Date.now()).replace(/[/:]/g, '-')}.csv`;
    downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
  }, [trackPoints, sourceMaterials, currentBatch, getFilteredPoints]);

  const exportExcel = useCallback((includeAll: boolean = true) => {
    const points = includeAll ? trackPoints : getFilteredPoints();
    const batchName = currentBatch?.name || '轨迹数据';
    const excelContent = exportToExcel(points, sourceMaterials, batchName);
    const filename = `${batchName}_${formatDateTime(Date.now()).replace(/[/:]/g, '-')}.xlsx`;
    downloadFile(excelContent, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }, [trackPoints, sourceMaterials, currentBatch, getFilteredPoints]);

  const exportJSON = useCallback((includeAll: boolean = true) => {
    const data = exportData();
    if (!includeAll) {
      (data as any).trackPoints = getFilteredPoints();
    }
    const jsonContent = JSON.stringify(data, null, 2);
    const batchName = currentBatch?.name || '轨迹数据';
    const filename = `${batchName}_${formatDateTime(Date.now()).replace(/[/:]/g, '-')}.json`;
    downloadFile(jsonContent, filename, 'application/json;charset=utf-8;');
  }, [exportData, currentBatch, getFilteredPoints]);

  const exportReport = useCallback(() => {
    const data = exportData();
    const metrics = data.metrics;
    const batchName = currentBatch?.name || '轨迹数据';

    const reportContent = `
══════════════════════════════════════════════════════════════
                  地 图 等 高 线 临 摹 器 - 审 计 报 告
══════════════════════════════════════════════════════════════

【批次信息】
  批次名称：${batchName}
  批次ID：${currentBatch?.id || '-'}
  操作人员：${currentBatch?.operator || '-'}
  创建时间：${currentBatch ? formatDateTime(currentBatch.createTime) : '-'}
  报告生成时间：${formatDateTime(Date.now())}
  数据版本号：v${data.version}

【质量指标】
  ▶ 完整率：${metrics.completeness}%
  ▶ 准确率：${metrics.accuracy}%  
  ▶ 异常率：${metrics.anomalyRate}%
  ▶ 总点数：${metrics.totalPoints}
  ▶ 正常点数：${metrics.normalCount}
  ▶ 异常点数：${metrics.anomalyCount}

【按材料统计】
${metrics.byMaterial.map(m => `  ▶ ${m.materialName}：共${m.total}点，异常${m.anomalies}点`).join('\n')}

【异常明细】
${data.trackPoints
  .filter(p => p.status !== 'normal')
  .map((p, idx) => {
    const mat = sourceMaterials.find(m => m.id === p.sourceMaterial);
    const statusMap: Record<string, string> = {
      'out-of-bounds': '边界越界',
      'color-invalid': '颜色异常',
      'missing-unit': '缺项漏填',
      'supplementary': '补录数据'
    };
    return `  ${idx + 1}. 点${p.id.slice(-8)} | ${statusMap[p.status] || p.status} | 材料：${mat?.name || p.sourceMaterial} | 录入人：${p.operator}`;
  })
  .join('\n')}

【边界越界详情】
${data.trackPoints
  .filter(p => p.boundaryCollision)
  .map(p => `  • 点${p.id.slice(-8)} | ${p.boundaryCollision?.boundaryName} | 距离：${Math.abs(p.boundaryCollision?.distance || 0).toFixed(1)}米 | 类型：${p.boundaryCollision?.type === 'inside' ? '进入保护区' : '靠近边界'}`)
  .join('\n')}

══════════════════════════════════════════════════════════════
                        报告结束
══════════════════════════════════════════════════════════════
`;

    const filename = `审计报告_${batchName}_${formatDateTime(Date.now()).replace(/[/:]/g, '-')}.txt`;
    downloadFile(reportContent, filename, 'text/plain;charset=utf-8;');
  }, [exportData, currentBatch, sourceMaterials]);

  return {
    exportCSV,
    exportExcel,
    exportJSON,
    exportReport
  };
}
