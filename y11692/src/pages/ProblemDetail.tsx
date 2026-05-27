import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Image, FileText, History, Edit3, Eye, EyeOff } from 'lucide-react';
import { useProblemStore } from '@/store/problemStore';
import { FunctionChart } from '@/components/chart/FunctionChart';
import { ErrorPanel } from '@/components/analysis/ErrorPanel';
import { ProblemStatus, PointType } from '@/types';
import { exportChartAsImage, exportReportAsPDF } from '@/utils/export/reportGenerator';
import { formatInterval } from '@/utils/math/signAnalysis';

const ProblemDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { problems, resolveError, updateStatus, addCorrection } = useProblemStore();
  const [showDerivative, setShowDerivative] = useState(false);
  const [showSignRegions, setShowSignRegions] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const problem = problems.find(p => p.id === id);

  if (!problem) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">题目不存在</h2>
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 hover:underline"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const getStatusConfig = (status: ProblemStatus) => {
    switch (status) {
      case ProblemStatus.UNPROCESSED:
        return { label: '未处理', color: 'bg-gray-100 text-gray-700' };
      case ProblemStatus.CORRECTED:
        return { label: '已修正', color: 'bg-green-100 text-green-700' };
      case ProblemStatus.NEEDS_REVIEW:
        return { label: '待确认', color: 'bg-amber-100 text-amber-700' };
    }
  };

  const handleExportChart = async () => {
    setIsExporting(true);
    try {
      await exportChartAsImage('function-chart', `${problem.title}-曲线图.png`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportReport = async () => {
    setIsExporting(true);
    try {
      const chartData = await exportChartAsImage('function-chart');
      await exportReportAsPDF(problem, chartData || undefined);
    } finally {
      setIsExporting(false);
    }
  };

  const handleResolveError = (errorId: string) => {
    resolveError(problem.id, errorId);
    addCorrection(problem.id, {
      field: 'errors',
      oldValue: '未解决',
      newValue: '已解决',
      correctedBy: '教师',
      reason: '标记错误为已修正'
    });
  };

  const handleStatusChange = (status: ProblemStatus) => {
    updateStatus(problem.id, status);
  };

  const statusConfig = getStatusConfig(problem.status);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-gray-900">{problem.title}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${statusConfig.color}`}>
                    {statusConfig.label}
                  </span>
                  {problem.source && (
                    <span className="text-xs text-gray-500">来源：{problem.source}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportChart}
                disabled={isExporting}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <Image className="w-4 h-4" />
                导出图片
              </button>
              <button
                onClick={handleExportReport}
                disabled={isExporting}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50"
              >
                <FileText className="w-4 h-4" />
                导出报告
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">函数曲线分析</h2>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showSignRegions}
                      onChange={(e) => setShowSignRegions(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    {showSignRegions ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    符号区间
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showDerivative}
                      onChange={(e) => setShowDerivative(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    显示导数
                  </label>
                </div>
              </div>
              <FunctionChart
                expression={problem.expression}
                domain={problem.domain}
                criticalPoints={problem.criticalPoints}
                signIntervals={problem.signIntervals}
                inflectionPoints={problem.inflectionPoints}
                width={700}
                height={450}
                showDerivative={showDerivative}
                showSignRegions={showSignRegions}
              />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">函数信息</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500 block mb-1">原函数</label>
                  <code className="block w-full px-3 py-2 bg-gray-50 rounded-lg text-gray-800 font-mono text-sm">
                    f(x) = {problem.expression}
                  </code>
                </div>
                {problem.derivative && (
                  <div>
                    <label className="text-sm text-gray-500 block mb-1">一阶导数</label>
                    <code className="block w-full px-3 py-2 bg-blue-50 rounded-lg text-blue-800 font-mono text-sm">
                      f'(x) = {problem.derivative}
                    </code>
                  </div>
                )}
                {problem.secondDerivative && (
                  <div>
                    <label className="text-sm text-gray-500 block mb-1">二阶导数</label>
                    <code className="block w-full px-3 py-2 bg-indigo-50 rounded-lg text-indigo-800 font-mono text-sm">
                      f''(x) = {problem.secondDerivative}
                    </code>
                  </div>
                )}
                <div>
                  <label className="text-sm text-gray-500 block mb-1">定义域</label>
                  <div className="flex flex-wrap gap-2">
                    {problem.domain.map((interval, i) => (
                      <span key={i} className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700">
                        {formatInterval(interval)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">关键点分析</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 font-medium text-gray-500">类型</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-500">x 坐标</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-500">y 坐标</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-500">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {problem.criticalPoints.map((point, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                            point.type === PointType.MAXIMUM ? 'bg-red-100 text-red-700' :
                            point.type === PointType.MINIMUM ? 'bg-teal-100 text-teal-700' :
                            point.type === PointType.INFLECTION ? 'bg-amber-100 text-amber-700' :
                            point.type === PointType.NON_DIFFERENTIABLE ? 'bg-violet-100 text-violet-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {point.type === PointType.MAXIMUM ? '极大值点' :
                             point.type === PointType.MINIMUM ? '极小值点' :
                             point.type === PointType.INFLECTION ? '拐点' :
                             point.type === PointType.NON_DIFFERENTIABLE ? '不可导点' : '临界点'}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono">{point.x.toFixed(4)}</td>
                        <td className="py-2 px-3 font-mono">{point.y.toFixed(4)}</td>
                        <td className="py-2 px-3">
                          {point.isConfirmed ? (
                            <span className="text-green-600 text-xs">已确认</span>
                          ) : (
                            <span className="text-amber-600 text-xs">待确认</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">状态管理</h3>
              <div className="space-y-2">
                {[
                  { status: ProblemStatus.UNPROCESSED, label: '未处理', desc: '刚录入，尚未分析' },
                  { status: ProblemStatus.NEEDS_REVIEW, label: '待人工确认', desc: '需要教师复核' },
                  { status: ProblemStatus.CORRECTED, label: '已修正', desc: '错误已标记修正' }
                ].map(({ status, label, desc }) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    className={`w-full p-3 rounded-lg border text-left transition-all ${
                      problem.status === status
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-800">{label}</div>
                    <div className="text-xs text-gray-500">{desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <ErrorPanel
                errors={problem.errors}
                onResolve={handleResolveError}
              />
            </div>

            {problem.correctionHistory.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <History className="w-5 h-5 text-gray-500" />
                  <h3 className="text-lg font-semibold text-gray-800">修正记录</h3>
                </div>
                <div className="space-y-3">
                  {problem.correctionHistory.slice(-5).reverse().map((record) => (
                    <div key={record.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">
                          <Edit3 className="w-3 h-3 inline mr-1" />
                          {record.field}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(record.timestamp).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">{record.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProblemDetail;
