import { useNavigate } from 'react-router-dom';
import {
  useAnalysisResult,
  useAppStore,
} from '@/store/useAppStore';
import {
  Download,
  FileSpreadsheet,
  FileWarning,
  AlertTriangle,
  BarChart3,
  FileText,
  Archive,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
import {
  exportCalibratedResults,
  exportDirtyRows,
  exportAnomalies,
  exportCategoryResults,
  exportSummaryReport,
  exportAll,
} from '@/utils/exportUtils';
import { ANOMALY_TYPE_LABELS, GROUP_LABELS } from '@/types';
import { formatPercent } from '@/utils/statistics';

export default function ExportPage() {
  const navigate = useNavigate();
  const analysisResult = useAnalysisResult();
  const { resetAll } = useAppStore();

  if (!analysisResult) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mb-6">
          <Download className="text-neutral-400" size={40} />
        </div>
        <h2 className="text-xl font-semibold text-neutral-700 mb-2">暂无导出数据</h2>
        <p className="text-neutral-500 mb-6">请先完成数据分析</p>
        <button
          onClick={() => navigate('/')}
          className="btn-primary"
        >
          前往数据上传
        </button>
      </div>
    );
  }

  const {
    overallCoverage,
    overallCalibratedCoverage,
    targetCoverage,
    dirtyRows,
    anomalies,
    categoryResults,
    groupResults,
    badExamples,
    totalRows,
    validRowCount,
    dirtyRowCount,
  } = analysisResult;

  const anomalyCounts = {
    promotion: anomalies.filter(a => a.type === 'promotion').length,
    low_sample: anomalies.filter(a => a.type === 'low_sample').length,
    under_coverage: anomalies.filter(a => a.type === 'under_coverage').length,
    bad_forecast: anomalies.filter(a => a.type === 'bad_forecast').length,
    logic_error: anomalies.filter(a => a.type === 'logic_error').length,
  };

  const handleReset = () => {
    if (confirm('确定要重置所有数据吗？')) {
      resetAll();
      navigate('/');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">结果导出</h1>
          <p className="text-neutral-500">
            导出校准分析结果和相关数据文件
          </p>
        </div>
        <button
          onClick={() => navigate('/analysis')}
          className="flex items-center gap-2 text-neutral-600 hover:text-primary transition-colors"
        >
          <ArrowLeft size={18} />
          <span>返回分析页</span>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card border-l-4 border-l-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500 mb-1">原始覆盖率</p>
              <p className="text-2xl font-bold text-neutral-800">{formatPercent(overallCoverage)}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="card border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500 mb-1">校准后覆盖率</p>
              <p className="text-2xl font-bold text-blue-600">{formatPercent(overallCalibratedCoverage)}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <BarChart3 className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="card border-l-4 border-l-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500 mb-1">目标覆盖率</p>
              <p className="text-2xl font-bold text-yellow-600">{formatPercent(targetCoverage)}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <FileText className="text-yellow-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <FileSpreadsheet className="text-primary" size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-800">校准结果</h3>
                <p className="text-sm text-neutral-500">包含原始值和校准后区间</p>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">总行数</span>
                <span className="font-medium">{totalRows}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">有效行数</span>
                <span className="font-medium text-green-600">{validRowCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">脏数据行数</span>
                <span className="font-medium text-red-500">{dirtyRowCount}</span>
              </div>
            </div>

            <button
              onClick={() => exportCalibratedResults(analysisResult)}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              <Download size={18} />
              <span>导出校准结果 (CSV)</span>
            </button>
          </div>

          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <FileWarning className="text-red-600" size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-800">脏数据清单</h3>
                <p className="text-sm text-neutral-500">单独列出所有解析失败的行</p>
              </div>
            </div>

            {dirtyRows.length > 0 ? (
              <>
                <div className="max-h-[200px] overflow-y-auto scrollbar-thin mb-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="text-left text-xs font-medium text-neutral-500 pb-2">行号</th>
                        <th className="text-left text-xs font-medium text-neutral-500 pb-2">品类</th>
                        <th className="text-left text-xs font-medium text-neutral-500 pb-2">错误</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dirtyRows.slice(0, 10).map((row) => (
                        <tr key={row.id} className="border-t border-neutral-100">
                          <td className="py-2 text-neutral-700">{row.rowNumber}</td>
                          <td className="py-2 text-neutral-700">{row.category || '-'}</td>
                          <td className="py-2">
                            <span className="tag-danger">
                              {row._errors[0]?.type || '未知错误'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {dirtyRows.length > 10 && (
                    <p className="text-xs text-neutral-400 text-center py-2">
                      还有 {dirtyRows.length - 10} 条脏数据
                    </p>
                  )}
                </div>
                <button
                  onClick={() => exportDirtyRows(dirtyRows)}
                  className="w-full btn-danger flex items-center justify-center gap-2"
                >
                  <Download size={18} />
                  <span>导出脏数据清单 ({dirtyRows.length} 行)</span>
                </button>
              </>
            ) : (
              <div className="text-center py-8 text-neutral-400">
                <CheckCircle2 size={32} className="mx-auto mb-2 text-green-400" />
                <p>太棒了！没有脏数据</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="text-yellow-600" size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-800">异常清单</h3>
                <p className="text-sm text-neutral-500">所有检测到的异常情况</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {Object.entries(anomalyCounts).map(([type, count]) => (
                <div key={type} className="bg-neutral-50 rounded-lg p-3">
                  <p className="text-xs text-neutral-500">{ANOMALY_TYPE_LABELS[type as keyof typeof ANOMALY_TYPE_LABELS]}</p>
                  <p className={`text-xl font-bold ${count > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                    {count}
                  </p>
                </div>
              ))}
            </div>

            {badExamples.length > 0 && (
              <div className="bg-red-50 rounded-lg p-3 mb-4">
                <p className="text-xs font-medium text-red-600 mb-2">⚠️ 严重坏值 Top 3</p>
                <div className="space-y-2">
                  {badExamples.slice(0, 3).map((ex) => (
                    <div key={ex.id} className="flex justify-between text-sm">
                      <span className="text-red-700">{ex.category}</span>
                      <span className="font-mono text-red-600">
                        偏差 {(ex.deviationPercent * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => exportAnomalies(anomalies)}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
            >
              <Download size={18} />
              <span>导出异常清单 ({anomalies.length} 条)</span>
            </button>
          </div>

          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="text-blue-600" size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-800">分品类分析</h3>
                <p className="text-sm text-neutral-500">各品类详细统计数据</p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {groupResults.map((g) => (
                <div key={g.group} className="flex justify-between text-sm p-2 bg-neutral-50 rounded">
                  <span>{GROUP_LABELS[g.group]}</span>
                  <span className="font-medium">{g.categories.length} 个品类</span>
                </div>
              ))}
              <div className="flex justify-between text-sm p-2 bg-primary/5 rounded">
                <span className="font-medium text-primary">总计</span>
                <span className="font-bold text-primary">{categoryResults.length} 个品类</span>
              </div>
            </div>

            <button
              onClick={() => exportCategoryResults(analysisResult)}
              className="w-full btn-secondary flex items-center justify-center gap-2"
            >
              <Download size={18} />
              <span>导出分品类结果</span>
            </button>
          </div>
        </div>
      </div>

      <div className="card bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white rounded-xl shadow-sm flex items-center justify-center">
              <Archive className="text-primary" size={28} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-primary">一键导出所有报告</h3>
              <p className="text-sm text-neutral-500">
                包含校准结果、脏数据清单、异常清单、分品类结果、HTML分析报告
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => exportSummaryReport(analysisResult)}
              className="btn-secondary flex items-center gap-2"
            >
              <FileText size={18} />
              <span>仅导出报告</span>
            </button>
            <button
              onClick={() => exportAll(analysisResult)}
              className="btn-primary flex items-center gap-2 text-lg px-8"
            >
              <Archive size={20} />
              <span>全部导出</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-neutral-200">
        <p className="text-sm text-neutral-400">
          分析完成时间: {analysisResult.processedAt.toLocaleString('zh-CN')}
        </p>
        <button
          onClick={handleReset}
          className="text-sm text-neutral-400 hover:text-accent-danger transition-colors"
        >
          重置所有数据，开始新的分析
        </button>
      </div>
    </div>
  );
}
