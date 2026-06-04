import { useState, useMemo } from 'react';
import { FileText, Download, Printer, Eye, CheckCircle2, AlertTriangle, XCircle, FileWarning } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { anomalyTypeLabels, severityLabels } from '../data/mockData';
import { Button, Checkbox, message } from 'antd';
import type { CheckboxChangeEvent } from 'antd/es/checkbox';

interface ExportOptions {
  includeSummary: boolean;
  includeAnomalies: boolean;
  includeLayerOcclusion: boolean;
  includeMaterialMissing: boolean;
  includeOpinions: boolean;
}

export default function ReportPage() {
  const { records, anomalies, processOpinions, dataSources } = useAppStore();
  const [options, setOptions] = useState<ExportOptions>({
    includeSummary: true,
    includeAnomalies: true,
    includeLayerOcclusion: true,
    includeMaterialMissing: true,
    includeOpinions: true,
  });

  const reportData = useMemo(() => {
    const layerOcclusions = anomalies.filter(a => a.type === 'layer_occlusion' && !a.resolved);
    const materialMissing = anomalies.filter(
      a => (a.type === 'missing_unit' || a.type === 'score_abnormal') && !a.resolved
    );
    
    return {
      generatedAt: new Date(),
      totalRecords: records.length,
      anomalyCount: anomalies.filter(a => !a.resolved).length,
      resolvedCount: anomalies.filter(a => a.resolved).length,
      layerOcclusions,
      materialMissing,
      dataSourceCount: dataSources.length,
    };
  }, [records, anomalies, dataSources]);

  const handleOptionChange = (key: keyof ExportOptions) => (e: CheckboxChangeEvent) => {
    setOptions(prev => ({ ...prev, [key]: e.target.checked }));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportHTML = () => {
    const reportContent = generateReportHTML();
    const blob = new Blob([reportContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `海岸线变化报告_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.html`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('报告导出成功');
  };

  const generateReportHTML = () => {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>海岸线变化描边器 - 分析报告</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f7fa; color: #333; line-height: 1.6; }
    .container { max-width: 900px; margin: 0 auto; padding: 40px 20px; }
    .header { background: linear-gradient(135deg, #0D47A1 0%, #1976D2 100%); color: white; padding: 40px; border-radius: 12px; margin-bottom: 30px; }
    .header h1 { font-size: 28px; margin-bottom: 10px; }
    .header p { opacity: 0.9; font-size: 14px; }
    .card { background: white; border-radius: 12px; padding: 30px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .card h2 { font-size: 20px; margin-bottom: 20px; color: #1a1a1a; border-bottom: 2px solid #E4E7EB; padding-bottom: 15px; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
    .stat-card { text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px; }
    .stat-number { font-size: 32px; font-weight: bold; color: #0D47A1; }
    .stat-label { font-size: 12px; color: #666; margin-top: 5px; }
    .anomaly-item { padding: 15px; background: #FFF5F5; border-left: 4px solid #EF4444; margin-bottom: 10px; border-radius: 0 8px 8px 0; }
    .anomaly-item.resolved { background: #F0FDF4; border-left-color: #10B981; }
    .anomaly-title { font-weight: 600; margin-bottom: 5px; }
    .anomaly-desc { font-size: 14px; color: #555; margin-bottom: 8px; }
    .anomaly-source { font-size: 12px; color: #888; background: #f0f0f0; padding: 4px 8px; border-radius: 4px; display: inline-block; }
    .severity-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-right: 8px; }
    .severity-high { background: #FEE2E2; color: #DC2626; }
    .severity-medium { background: #FEF3C7; color: #D97706; }
    .severity-low { background: #D1FAE5; color: #059669; }
    .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; }
    @media print {
      body { background: white; }
      .no-print { display: none !important; }
      .container { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌊 海岸线变化描边器 - 分析报告</h1>
      <p>生成时间: ${reportData.generatedAt.toLocaleString('zh-CN')}</p>
    </div>

    ${options.includeSummary ? `
    <div class="card">
      <h2>📊 数据概览</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-number">${reportData.totalRecords}</div>
          <div class="stat-label">岸段总数</div>
        </div>
        <div class="stat-card">
          <div class="stat-number" style="color: #EF4444;">${reportData.anomalyCount}</div>
          <div class="stat-label">待处理异常</div>
        </div>
        <div class="stat-card">
          <div class="stat-number" style="color: #10B981;">${reportData.resolvedCount}</div>
          <div class="stat-label">已解决</div>
        </div>
        <div class="stat-card">
          <div class="stat-number" style="color: #F59E0B;">${reportData.dataSourceCount}</div>
          <div class="stat-label">数据源</div>
        </div>
      </div>
    </div>
    ` : ''}

    ${options.includeLayerOcclusion && reportData.layerOcclusions.length > 0 ? `
    <div class="card">
      <h2>🎯 图层遮挡问题追踪</h2>
      <p style="margin-bottom: 15px; color: #666; font-size: 14px;">
        以下岸段存在图层遮挡问题，旧数据图层覆盖了新的描边数据，导致训练员无法看到最新的海岸线变化。
      </p>
      ${reportData.layerOcclusions.map(a => {
        const record = records.find(r => r.id === a.recordId);
        return `
        <div class="anomaly-item">
          <div class="anomaly-title">
            <span class="severity-badge severity-high">严重</span>
            ${record?.segmentName || '未知岸段'} - 图层遮挡
          </div>
          <div class="anomaly-desc">${a.humanReadableReason}</div>
          <div class="anomaly-source">📍 问题来源: ${a.sourceMaterial}</div>
        </div>
        `;
      }).join('')}
    </div>
    ` : ''}

    ${options.includeMaterialMissing && reportData.materialMissing.length > 0 ? `
    <div class="card">
      <h2>📋 离线素材缺失说明</h2>
      <p style="margin-bottom: 15px; color: #666; font-size: 14px;">
        以下数据存在字段缺失或异常，请注意核对原始材料：
      </p>
      ${reportData.materialMissing.map(a => {
        const record = records.find(r => r.id === a.recordId);
        return `
        <div class="anomaly-item">
          <div class="anomaly-title">
            <span class="severity-badge severity-${a.severity}">${severityLabels[a.severity]}</span>
            ${record?.segmentName || '未知岸段'} - ${anomalyTypeLabels[a.type]}
          </div>
          <div class="anomaly-desc">${a.humanReadableReason}</div>
          <div class="anomaly-source">📍 问题来源: ${a.sourceMaterial}</div>
        </div>
        `;
      }).join('')}
    </div>
    ` : ''}

    ${options.includeAnomalies ? `
    <div class="card">
      <h2>⚠️ 异常数据汇总</h2>
      ${anomalies.filter(a => !a.resolved).map(a => {
        const record = records.find(r => r.id === a.recordId);
        return `
        <div class="anomaly-item">
          <div class="anomaly-title">
            <span class="severity-badge severity-${a.severity}">${severityLabels[a.severity]}</span>
            ${record?.segmentName || '未知岸段'} - ${anomalyTypeLabels[a.type]}
          </div>
          <div class="anomaly-desc">${a.humanReadableReason}</div>
          <div class="anomaly-source">📍 问题来源: ${a.sourceMaterial}</div>
        </div>
        `;
      }).join('')}
      ${anomalies.filter(a => !a.resolved).length === 0 ? '<p style="color: #10B981; text-align: center; padding: 20px;">✅ 所有异常已处理完毕</p>' : ''}
    </div>
    ` : ''}

    <div class="footer">
      <p>本报告由海岸线变化描边器自动生成</p>
      <p>如有疑问，请联系数据处理团队</p>
    </div>
  </div>
</body>
</html>
    `;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-card p-6 no-print">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-semibold text-ocean-text">报告导出</h2>
              <p className="text-sm text-ocean-textLight">生成人-readable格式的分析报告</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button icon={<Printer />} onClick={handlePrint}>
              打印报告
            </Button>
            <Button type="primary" icon={<Download />} onClick={handleExportHTML}>
              导出 HTML
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-ocean-text mb-4">报告内容选项</h3>
            <div className="space-y-3">
              <Checkbox 
                checked={options.includeSummary} 
                onChange={handleOptionChange('includeSummary')}
              >
                包含数据概览统计
              </Checkbox>
              <Checkbox 
                checked={options.includeAnomalies} 
                onChange={handleOptionChange('includeAnomalies')}
              >
                包含完整异常列表
              </Checkbox>
              <Checkbox 
                checked={options.includeLayerOcclusion} 
                onChange={handleOptionChange('includeLayerOcclusion')}
              >
                包含图层遮挡追踪（训练员重点关注）
              </Checkbox>
              <Checkbox 
                checked={options.includeMaterialMissing} 
                onChange={handleOptionChange('includeMaterialMissing')}
              >
                包含素材缺失原因说明（自然语言）
              </Checkbox>
              <Checkbox 
                checked={options.includeOpinions} 
                onChange={handleOptionChange('includeOpinions')}
              >
                包含处理意见
              </Checkbox>
            </div>
          </div>

          <div className="bg-ocean-surface rounded-lg p-4">
            <h3 className="text-sm font-medium text-ocean-text mb-3 flex items-center gap-2">
              <Eye className="w-4 h-4" />
              报告预览要点
            </h3>
            <ul className="text-sm text-ocean-textLight space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                <span>无技术术语，使用自然语言描述</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                <span>明确标注每个问题的来源材料</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                <span>图层遮挡问题单独高亮显示</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                <span>支持打印和离线查看</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="p-6 border-b border-ocean-border">
          <div className="bg-gradient-to-r from-primary-900 to-primary-700 text-white p-8 rounded-xl">
            <h1 className="font-serif text-2xl font-bold mb-2">🌊 海岸线变化描边器 - 分析报告</h1>
            <p className="text-white/80 text-sm">
              生成时间: {reportData.generatedAt.toLocaleString('zh-CN')}
            </p>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-96 overflow-y-auto">
          {options.includeSummary && (
            <div>
              <h3 className="font-serif text-lg font-semibold text-ocean-text mb-4 pb-2 border-b border-ocean-border">
                📊 数据概览
              </h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-4 bg-ocean-surface rounded-lg">
                  <p className="text-3xl font-bold text-primary-700">{reportData.totalRecords}</p>
                  <p className="text-xs text-ocean-textLight mt-1">岸段总数</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-3xl font-bold text-red-600">{reportData.anomalyCount}</p>
                  <p className="text-xs text-ocean-textLight mt-1">待处理异常</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-3xl font-bold text-green-600">{reportData.resolvedCount}</p>
                  <p className="text-xs text-ocean-textLight mt-1">已解决</p>
                </div>
                <div className="text-center p-4 bg-amber-50 rounded-lg">
                  <p className="text-3xl font-bold text-amber-600">{reportData.dataSourceCount}</p>
                  <p className="text-xs text-ocean-textLight mt-1">数据源</p>
                </div>
              </div>
            </div>
          )}

          {options.includeLayerOcclusion && reportData.layerOcclusions.length > 0 && (
            <div>
              <h3 className="font-serif text-lg font-semibold text-ocean-text mb-4 pb-2 border-b border-ocean-border flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                🎯 图层遮挡问题追踪（训练员重点关注）
              </h3>
              <p className="text-sm text-ocean-textLight mb-4">
                以下岸段存在图层遮挡问题，旧数据图层覆盖了新的描边数据，导致训练员无法看到最新的海岸线变化。
              </p>
              <div className="space-y-3">
                {reportData.layerOcclusions.map(anomaly => {
                  const record = records.find(r => r.id === anomaly.recordId);
                  return (
                    <div key={anomaly.id} className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
                      <div className="font-medium text-ocean-text mb-1">
                        {record?.segmentName} - {anomalyTypeLabels[anomaly.type]}
                      </div>
                      <p className="text-sm text-ocean-text mb-2">{anomaly.humanReadableReason}</p>
                      <p className="text-xs text-ocean-textLight bg-white px-2 py-1 rounded inline-block">
                        📍 问题来源: {anomaly.sourceMaterial}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {options.includeMaterialMissing && reportData.materialMissing.length > 0 && (
            <div>
              <h3 className="font-serif text-lg font-semibold text-ocean-text mb-4 pb-2 border-b border-ocean-border flex items-center gap-2">
                <FileWarning className="w-5 h-5 text-amber-500" />
                📋 离线素材缺失说明
              </h3>
              <p className="text-sm text-ocean-textLight mb-4">
                以下数据存在字段缺失或异常，请核对原始材料：
              </p>
              <div className="space-y-3">
                {reportData.materialMissing.map(anomaly => {
                  const record = records.find(r => r.id === anomaly.recordId);
                  return (
                    <div key={anomaly.id} className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg">
                      <div className="font-medium text-ocean-text mb-1">
                        {record?.segmentName} - {anomalyTypeLabels[anomaly.type]}
                      </div>
                      <p className="text-sm text-ocean-text mb-2">{anomaly.humanReadableReason}</p>
                      <p className="text-xs text-ocean-textLight bg-white px-2 py-1 rounded inline-block">
                        📍 问题来源: {anomaly.sourceMaterial}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {options.includeAnomalies && (
            <div>
              <h3 className="font-serif text-lg font-semibold text-ocean-text mb-4 pb-2 border-b border-ocean-border">
                ⚠️ 异常数据汇总
              </h3>
              <div className="space-y-3">
                {anomalies.filter(a => !a.resolved).map(anomaly => {
                  const record = records.find(r => r.id === anomaly.recordId);
                  return (
                    <div key={anomaly.id} className="p-4 bg-ocean-surface rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          anomaly.severity === 'high' ? 'bg-red-100 text-red-700' :
                          anomaly.severity === 'medium' ? 'bg-amber-100 text-amber-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {severityLabels[anomaly.severity]}
                        </span>
                        <span className="font-medium text-ocean-text">
                          {record?.segmentName} - {anomalyTypeLabels[anomaly.type]}
                        </span>
                      </div>
                      <p className="text-sm text-ocean-text mb-2">{anomaly.humanReadableReason}</p>
                      <p className="text-xs text-ocean-textLight">
                        📍 来源: {anomaly.sourceMaterial}
                      </p>
                    </div>
                  );
                })}
                {anomalies.filter(a => !a.resolved).length === 0 && (
                  <div className="text-center py-8 text-green-600">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-2" />
                    <p>所有异常已处理完毕</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
