import type { Asset, CorrelationEdge, DataQualityReport } from '@/types';

export const generateReportContent = (
  assets: Asset[],
  edges: CorrelationEdge[],
  qualityReport: DataQualityReport | null
): string => {
  const now = new Date().toLocaleString('zh-CN');

  const content = `
================================================================================
                        资产相关性星云分析报告
                        生成时间: ${now}
================================================================================

一、数据概览
--------------------------------------------------------------------------------
  资产总数: ${assets.length}
  相关性边数: ${edges.length}
  平均相关系数: ${edges.length > 0 ? (edges.reduce((sum, e) => sum + Math.abs(e.coefficient), 0) / edges.length).toFixed(4) : 'N/A'}

二、数据质量状态
--------------------------------------------------------------------------------
  未处理数据: ${qualityReport?.rawCount || 0} 项
  已修正数据: ${qualityReport?.correctedCount || 0} 项
  待确认数据: ${qualityReport?.pendingReviewCount || 0} 项

  矩阵对称性: ${qualityReport?.isSymmetric ? '✓ 正常' : '✗ 异常'}
  节点密度: ${qualityReport ? (qualityReport.nodeDensity * 100).toFixed(1) + '%' : 'N/A'}

三、数据质量警告
--------------------------------------------------------------------------------
${qualityReport && !qualityReport.isSymmetric
  ? `  ⚠️  存在 ${qualityReport.asymmetricPairs.length} 对不对称相关性数据
     ${qualityReport.asymmetricPairs.slice(0, 5).join(', ')}${qualityReport.asymmetricPairs.length > 5 ? '...' : ''}
`
  : '  ✓ 相关矩阵对称，数据一致性良好'}

${qualityReport && qualityReport.timeWindowErrors.length > 0
  ? `  ⚠️  存在 ${qualityReport.timeWindowErrors.length} 个时间窗口数据异常
     ${qualityReport.timeWindowErrors.slice(0, 3).join('\n     ')}${qualityReport.timeWindowErrors.length > 3 ? '\n     ...' : ''}
`
  : '  ✓ 时间窗口数据完整'}

${qualityReport?.isOverDense
  ? `  ⚠️  节点密度过高 (${(qualityReport.nodeDensity * 100).toFixed(1)}%)，建议增加筛选阈值
`
  : '  ✓ 节点密度适中'}

四、资产分类统计
--------------------------------------------------------------------------------
${['stock', 'bond', 'commodity', 'currency'].map((type) => {
    const count = assets.filter((a) => a.type === type).length;
    const labels: Record<string, string> = {
      stock: '股票',
      bond: '债券',
      commodity: '商品',
      currency: '外汇',
    };
    return `  ${labels[type]}: ${count} 项`;
  }).join('\n')}

五、修正记录 (最近5条)
--------------------------------------------------------------------------------
${assets
    .flatMap((a) => a.correctionHistory.map((h) => ({ ...h, assetCode: a.code })))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5)
    .map(
      (log) =>
        `  [${log.assetCode}] ${log.field}: ${log.oldValue} → ${log.newValue}
     原因: ${log.reason} | 操作人: ${log.operator}
`
    )
    .join('\n') || '  暂无修正记录'}

================================================================================
                              报告结束
================================================================================
`;

  return content;
};

export const downloadTextFile = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const captureScreenshot = (canvasElement: HTMLCanvasElement): string => {
  return canvasElement.toDataURL('image/png');
};

export const downloadImage = (dataUrl: string, filename: string) => {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
