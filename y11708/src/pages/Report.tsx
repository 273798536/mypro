import React, { useState } from 'react';
import { FileText, FileSpreadsheet, Download, Eye } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import type { ReportConfig } from '../types';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { exportToExcel, exportToPDF, downloadBlob } from '../utils/reportGenerator';
import { formatPercent } from '../utils/cn';

export const Report: React.FC = () => {
  const { matrix, prediction, risks, dataSource } = useAppStore();
  
  const [config, setConfig] = useState<ReportConfig>({
    includeMatrix: true,
    includePrediction: true,
    includeRisks: true,
    includeHistory: false,
    format: 'excel',
    remark: ''
  });

  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!matrix || !prediction) return;
    
    setExporting(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      const filename = `Markov留存预测报告_${new Date().toISOString().slice(0, 10)}`;
      
      if (config.format === 'excel') {
        const blob = exportToExcel(matrix, prediction, risks, dataSource);
        downloadBlob(blob, `${filename}.xlsx`);
      } else {
        const blob = exportToPDF(matrix, prediction, risks, dataSource, config.remark);
        downloadBlob(blob, `${filename}.pdf`);
      }
    } catch (error) {
      console.error('导出失败:', error);
    } finally {
      setExporting(false);
    }
  };

  const canExport = matrix && prediction;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">报告导出</h1>
          <p className="text-gray-500 mt-1">配置并导出Markov留存预测分析报告</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <Card.Header>
              <Card.Title>导出配置</Card.Title>
              <Card.Description>选择报告包含的内容和导出格式</Card.Description>
            </Card.Header>
            <Card.Content className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">导出格式</label>
                <div className="flex gap-3">
                  <button
                    className={config.format === 'excel'
                      ? 'flex-1 p-4 border-2 border-green-500 bg-green-50 rounded-lg'
                      : 'flex-1 p-4 border-2 border-gray-200 rounded-lg hover:border-gray-300'
                    }
                    onClick={() => setConfig({ ...config, format: 'excel' })}
                  >
                    <FileSpreadsheet className={`w-8 h-8 mx-auto mb-2 ${config.format === 'excel' ? 'text-green-600' : 'text-gray-400'}`} />
                    <p className={`font-medium ${config.format === 'excel' ? 'text-green-700' : 'text-gray-700'}`}>Excel</p>
                    <p className="text-xs text-gray-500 mt-1">适合数据处理</p>
                  </button>
                  <button
                    className={config.format === 'pdf'
                      ? 'flex-1 p-4 border-2 border-red-500 bg-red-50 rounded-lg'
                      : 'flex-1 p-4 border-2 border-gray-200 rounded-lg hover:border-gray-300'
                    }
                    onClick={() => setConfig({ ...config, format: 'pdf' })}
                  >
                    <FileText className={`w-8 h-8 mx-auto mb-2 ${config.format === 'pdf' ? 'text-red-600' : 'text-gray-400'}`} />
                    <p className={`font-medium ${config.format === 'pdf' ? 'text-red-700' : 'text-gray-700'}`}>PDF</p>
                    <p className="text-xs text-gray-500 mt-1">适合正式汇报</p>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">包含内容</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.includeMatrix}
                      onChange={(e) => setConfig({ ...config, includeMatrix: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <div>
                      <p className="font-medium text-gray-800">转移矩阵</p>
                      <p className="text-xs text-gray-500">包含状态转移概率表和热力图数据</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.includePrediction}
                      onChange={(e) => setConfig({ ...config, includePrediction: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <div>
                      <p className="font-medium text-gray-800">预测结果</p>
                      <p className="text-xs text-gray-500">包含活跃率、流失率预测及详细解读</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.includeRisks}
                      onChange={(e) => setConfig({ ...config, includeRisks: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <div>
                      <p className="font-medium text-gray-800">风险提示</p>
                      <p className="text-xs text-gray-500">包含数据质量问题检测结果</p>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">备注（可选）</label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm resize-none"
                  rows={3}
                  placeholder="输入报告备注说明..."
                  value={config.remark}
                  onChange={(e) => setConfig({ ...config, remark: e.target.value })}
                />
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleExport}
                disabled={!canExport || exporting}
                loading={exporting}
              >
                <Download className="w-5 h-5 mr-2" />
                导出报告
              </Button>

              {!canExport && (
                <p className="text-sm text-amber-600 text-center">
                  请先在主面板完成预测计算后再导出报告
                </p>
              )}
            </Card.Content>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <Card.Header>
              <div className="flex items-center justify-between">
                <div>
                  <Card.Title>报告预览</Card.Title>
                  <Card.Description>当前数据的报告摘要</Card.Description>
                </div>
                <Eye className="w-5 h-5 text-gray-400" />
              </div>
            </Card.Header>
            <Card.Content className="space-y-4">
              {canExport ? (
                <>
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                    <h3 className="font-semibold text-gray-800 mb-2">Markov 留存预测报告</h3>
                    <p className="text-sm text-gray-600">
                      数据来源: {dataSource}
                    </p>
                    <p className="text-sm text-gray-600">
                      生成时间: {new Date().toLocaleString('zh-CN')}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-green-50 rounded-lg text-center">
                      <p className="text-sm text-gray-600">预测活跃率</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatPercent(prediction!.activeRate)}
                      </p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg text-center">
                      <p className="text-sm text-gray-600">预测流失率</p>
                      <p className="text-2xl font-bold text-red-600">
                        {formatPercent(prediction!.churnRate)}
                      </p>
                    </div>
                  </div>

                  {config.includeRisks && risks.length > 0 && (
                    <div className="p-4 bg-amber-50 rounded-lg">
                      <p className="font-medium text-amber-800 mb-1">检测到 {risks.length} 项风险</p>
                      <p className="text-sm text-amber-700">
                        {risks.some(r => r.severity === 'error')
                          ? '存在严重问题，可能影响预测准确性'
                          : '存在警告信息，请在解读时注意'}
                      </p>
                    </div>
                  )}

                  {config.remark && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 mb-1">备注:</p>
                      <p className="text-sm text-gray-600">{config.remark}</p>
                    </div>
                  )}

                  <div className="text-sm text-gray-500 space-y-1 pt-2 border-t">
                    <p>✓ 状态转移矩阵 (共 {matrix!.states.length} 个状态)</p>
                    <p>✓ 状态分布预测对比</p>
                    <p>✓ 结果解读说明</p>
                    {config.includeRisks && <p>✓ 风险检测详情</p>}
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p>暂无数据可预览</p>
                  <p className="text-sm mt-1">请先在主面板执行预测计算</p>
                </div>
              )}
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <Card.Title>数据来源</Card.Title>
            </Card.Header>
            <Card.Content>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">数据源:</span>
                  <span className="font-medium text-gray-800">{dataSource}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">状态数量:</span>
                  <span className="font-medium text-gray-800">{matrix?.states.length || 0} 个</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">样本总量:</span>
                  <span className="font-medium text-gray-800">
                    {matrix?.sampleSizes.reduce((a, b) => a + b, 0).toLocaleString() || 0} 人
                  </span>
                </div>
              </div>
            </Card.Content>
          </Card>
        </div>
      </div>
    </div>
  );
};
