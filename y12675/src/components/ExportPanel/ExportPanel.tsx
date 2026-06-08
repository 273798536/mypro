import { Download, Camera, FileJson, FileText, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { exportToJSON } from '../../utils/dataProcessing';

export default function ExportPanel() {
  const { measurements, pointCloudData } = useAppStore();

  const handleScreenshot = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `crystal-defect-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleExportMeasurements = () => {
    const data = {
      exportTime: new Date().toISOString(),
      material: pointCloudData?.metadata.material,
      measurements: measurements.map((m) => ({
        id: m.id,
        distance: m.distance,
        defectIds: m.defectIds,
        notes: m.notes,
        conclusion: m.conclusion,
        status: m.status,
        timestamp: new Date(m.timestamp).toISOString(),
      })),
      summary: {
        total: measurements.length,
        directUse: measurements.filter((m) => m.status === 'direct_use').length,
        needsReview: measurements.filter((m) => m.status === 'needs_review').length,
      },
    };

    exportToJSON(data, `measurements-${Date.now()}.json`);
  };

  const handleExportReport = () => {
    const needsReview = measurements.filter((m) => m.status === 'needs_review');
    
    const reportContent = `
晶体缺陷分析报告
================

生成时间: ${new Date().toLocaleString('zh-CN')}
材料: ${pointCloudData?.metadata.material || '未知'}
数据来源: ${pointCloudData?.metadata.source || '未知'}

统计数据
--------
总测量数: ${measurements.length}
直接可用: ${measurements.filter((m) => m.status === 'direct_use').length}
需复核: ${needsReview.length}

${needsReview.length > 0 ? `
需复核项目
----------
${needsReview.map((m, i) => `
${i + 1}. 测量 #${m.id.split('-')[2]}
   距离: ${m.distance.toFixed(3)} nm
   缺陷: ${m.defectIds.join(', ')}
   ${m.notes ? `备注: ${m.notes}` : ''}
`).join('\n')}

⚠️ 注意: 以上 ${needsReview.length} 项测量需要添加结论后才能使用
` : ''}

详细测量数据
------------
${measurements.map((m, i) => `
${i + 1}. 测量 #${m.id.split('-')[2]}
   距离: ${m.distance.toFixed(3)} nm
   状态: ${m.status === 'direct_use' ? '✓ 直接可用' : '⚠ 需复核'}
   ${m.conclusion ? `结论: ${m.conclusion}` : ''}
   ${m.notes ? `备注: ${m.notes}` : ''}
`).join('\n')}

${needsReview.length > 0 ? `
---
此报告包含需复核项目，建议联系运维主管确认后再使用。
` : ''}
    `.trim();

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `crystal-defect-report-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const needsReviewCount = measurements.filter((m) => m.status === 'needs_review').length;

  return (
    <div className="bg-gray-900 bg-opacity-95 rounded-lg p-4 backdrop-blur-sm border border-yellow-900">
      <div className="flex items-center space-x-2 mb-4">
        <Download className="w-5 h-5 text-yellow-400" />
        <span className="text-yellow-400 text-sm font-medium">导出功能</span>
      </div>

      <div className="space-y-3">
        <button
          onClick={handleScreenshot}
          disabled={!pointCloudData}
          className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          <Camera className="w-4 h-4" />
          <span>截图导出 (PNG)</span>
        </button>

        <button
          onClick={handleExportMeasurements}
          disabled={measurements.length === 0}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          <FileJson className="w-4 h-4" />
          <span>导出测量数据 (JSON)</span>
        </button>

        <button
          onClick={handleExportReport}
          disabled={measurements.length === 0}
          className="w-full px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          <FileText className="w-4 h-4" />
          <span>生成分析报告 (TXT)</span>
        </button>

        {needsReviewCount > 0 && (
          <div className="p-3 bg-orange-900 bg-opacity-30 rounded-lg border border-orange-800">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5" />
              <div className="text-xs text-orange-300">
                <div className="font-medium mb-1">导出提示</div>
                <div>
                  当前有 <span className="text-orange-400 font-bold">{needsReviewCount}</span> 项测量
                  状态为"需复核"，生成报告时将包含这些项目的提示信息。
                </div>
              </div>
            </div>
          </div>
        )}

        {measurements.length === 0 && pointCloudData && (
          <div className="p-3 bg-gray-800 rounded-lg">
            <div className="text-xs text-gray-400 text-center">
              暂无测量数据，请先进行测量
            </div>
          </div>
        )}

        {!pointCloudData && (
          <div className="p-3 bg-gray-800 rounded-lg">
            <div className="text-xs text-gray-500 text-center">
              请先导入点云数据
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
