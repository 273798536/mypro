
import { useState } from 'react';
import { useAppStore } from '@/store';
import { calculateValidation } from '@/services/validation';
import { calculateStatistics } from '@/services/outlier';
import { CalculatorInput, ValidationResult, DataPoint } from '@/types';
import {
  Calculator as CalcIcon,
  AlertCircle,
  CheckCircle,
  Info,
  RefreshCw,
  Plus,
  X,
  ShieldCheck,
  ShieldX,
  Trash2,
  FileText,
  Target,
  Ruler,
  AlertTriangle,
} from 'lucide-react';

const CalculatorPage = () => {
  const {
    getSelectedTask,
    updateDataPoint,
    addHistoryRecord,
    currentUser,
    addDataPoint,
    removeDataPoint,
    verifyOutlier,
    reRunValidation,
  } = useAppStore();
  const task = getSelectedTask();

  const [input, setInput] = useState<CalculatorInput>({
    actualValue: task?.dataPoints[0]?.value || 3200,
    nominalValue: task?.nominalValue || 3200,
    tolerance: task?.tolerance || 5,
  });

  const [result, setResult] = useState<ValidationResult | null>(null);
  const [showVerifyModal, setShowVerifyModal] = useState<{
    dataPointId: string;
    currentIsOutlier: boolean;
  } | null>(null);
  const [verifyReason, setVerifyReason] = useState('');
  const [verifyConfirm, setVerifyConfirm] = useState(true);
  const [showAddPointModal, setShowAddPointModal] = useState(false);
  const [newPointValue, setNewPointValue] = useState('');
  const [newPointRemark, setNewPointRemark] = useState('');

  const handleCalculate = () => {
    const validationResult = calculateValidation(input);
    setResult(validationResult);
  };

  const handleToggleOutlier = (dataPointId: string, currentValue: boolean) => {
    if (!task) return;
    setShowVerifyModal({ dataPointId, currentIsOutlier: currentValue });
    setVerifyConfirm(!currentValue);
    setVerifyReason('');
  };

  const handleConfirmVerify = () => {
    if (!task || !showVerifyModal || !verifyReason.trim()) return;
    verifyOutlier(task.id, showVerifyModal.dataPointId, verifyReason, verifyConfirm);
    setShowVerifyModal(null);
    setVerifyReason('');
  };

  const handleUpdateRemark = (dataPointId: string, newRemark: string) => {
    if (!task) return;
    updateDataPoint(task.id, dataPointId, { remark: newRemark });
    addHistoryRecord(task.id, {
      taskId: task.id,
      operator: currentUser,
      action: '更新备注',
      reason: '修改了数据点备注',
    });
  };

  const handleAddPoint = () => {
    if (!task || !newPointValue) return;
    const val = parseFloat(newPointValue);
    if (isNaN(val)) return;
    addDataPoint(task.id, val, newPointRemark || undefined);
    setShowAddPointModal(false);
    setNewPointValue('');
    setNewPointRemark('');
  };

  const handleRemovePoint = (dataPointId: string) => {
    if (!task) return;
    if (window.confirm('确认删除该数据点？此操作将记录在历史中。')) {
      removeDataPoint(task.id, dataPointId);
    }
  };

  const handleReRun = () => {
    if (!task) return;
    reRunValidation(task.id);
    setResult(null);
    setTimeout(() => handleCalculate(), 100);
  };

  if (!task) {
    return (
      <div className="p-8">
        <div className="text-center py-16">
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 text-lg">请先从数据仪表盘选择一个校验任务</p>
        </div>
      </div>
    );
  }

  const stats = calculateStatistics(task.dataPoints.map((dp: DataPoint) => dp.value));
  const validPoints = task.dataPoints.filter((dp) => !dp.isOutlier);
  const outlierPoints = task.dataPoints.filter((dp) => dp.isOutlier);

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">剖切面越界校验计算工具</h1>
          <p className="text-slate-500">
            {task.name} · {task.robotModel} · 批次 {task.batchId || '—'}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleReRun}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            重复运行校验
          </button>
          <button
            onClick={() => setShowAddPointModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            补录数据点
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <CalcIcon className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-slate-800">校验参数输入</h2>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-500" />
                  标称值 (mm)
                </label>
                <input
                  type="number"
                  value={input.nominalValue}
                  onChange={(e) =>
                    setInput({ ...input, nominalValue: Number(e.target.value) })
                  }
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-blue-500" />
                  公差范围 (±mm)
                </label>
                <input
                  type="number"
                  value={input.tolerance}
                  onChange={(e) =>
                    setInput({ ...input, tolerance: Number(e.target.value) })
                  }
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  实际测量值 (mm)
                </label>
                <input
                  type="number"
                  value={input.actualValue}
                  onChange={(e) =>
                    setInput({ ...input, actualValue: Number(e.target.value) })
                  }
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-lg"
                />
              </div>

              <button
                onClick={handleCalculate}
                className="w-full bg-blue-600 text-white py-3.5 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <CalcIcon className="w-5 h-5" />
                计算校验
              </button>
            </div>

            {result && (
              <div
                className={`mt-6 p-5 rounded-xl border-2 ${
                  result.isValid
                    ? 'bg-green-50 border-green-300'
                    : 'bg-red-50 border-red-300'
                }`}
              >
                <div className="flex items-start gap-3 mb-4">
                  {result.isValid ? (
                    <CheckCircle className="w-7 h-7 text-green-600 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-7 h-7 text-red-600 flex-shrink-0" />
                  )}
                  <div>
                    <h3
                      className={`font-bold text-lg ${
                        result.isValid ? 'text-green-800' : 'text-red-800'
                      }`}
                    >
                      {result.isValid ? '✓ 校验通过' : '✗ 校验失败 - 剖切面越界'}
                    </h3>
                    <p
                      className={`text-sm mt-1 ${
                        result.isValid ? 'text-green-700' : 'text-red-700'
                      }`}
                    >
                      偏差: {result.deviation >= 0 ? '+' : ''}
                      {result.deviation.toFixed(2)} {result.unit}
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-start gap-2 text-sm bg-white/60 p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-500 font-medium w-20 flex-shrink-0">
                      校验公式:
                    </span>
                    <code className="font-mono text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                      {result.formula}
                    </code>
                  </div>
                  <div className="flex items-start gap-2 text-sm bg-white/60 p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-500 font-medium w-20 flex-shrink-0">
                      计算单位:
                    </span>
                    <span className="font-mono text-slate-800 font-semibold">
                      {result.unit} (毫米)
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-sm bg-white/60 p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-500 font-medium w-20 flex-shrink-0">
                      允许范围:
                    </span>
                    <span className="font-mono text-slate-800">
                      [{result.lowerBound}, {result.upperBound}] {result.unit}
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-sm bg-white/60 p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-500 font-medium w-20 flex-shrink-0">
                      适用范围:
                    </span>
                    <span className="text-slate-800 leading-relaxed">
                      {result.scope}
                    </span>
                  </div>
                  {result.failureReason && (
                    <div className="flex items-start gap-2 text-sm bg-red-100/60 p-3 rounded-lg border border-red-200">
                      <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-red-800 font-semibold">失败原因: </span>
                        <span className="text-red-700">{result.failureReason}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-orange-600" />
              统计信息
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-xs text-blue-600 font-medium">平均值</p>
                <p className="text-xl font-bold text-slate-800 font-mono">
                  {stats.mean.toFixed(2)}
                  <span className="text-sm text-slate-500 font-normal ml-1">mm</span>
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                <p className="text-xs text-purple-600 font-medium">中位数</p>
                <p className="text-xl font-bold text-slate-800 font-mono">
                  {stats.median.toFixed(2)}
                  <span className="text-sm text-slate-500 font-normal ml-1">mm</span>
                </p>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                <p className="text-xs text-amber-600 font-medium">标准差 (3σ)</p>
                <p className="text-xl font-bold text-slate-800 font-mono">
                  {stats.std.toFixed(2)}
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-600 font-medium">极差</p>
                <p className="text-xl font-bold text-slate-800 font-mono">
                  {(stats.max - stats.min).toFixed(2)}
                  <span className="text-sm text-slate-500 font-normal ml-1">mm</span>
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                <p className="text-xs text-green-600 font-medium">最小值</p>
                <p className="text-lg font-bold text-slate-800 font-mono">
                  {stats.min}
                  <span className="text-sm text-slate-500 font-normal ml-1">mm</span>
                </p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                <p className="text-xs text-red-600 font-medium">最大值</p>
                <p className="text-lg font-bold text-slate-800 font-mono">
                  {stats.max}
                  <span className="text-sm text-slate-500 font-normal ml-1">mm</span>
                </p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
              有效点数: <span className="font-semibold text-slate-800">{validPoints.length}</span>
              <span className="mx-2">·</span>
              离群点数:{' '}
              <span className="font-semibold text-orange-600">{outlierPoints.length}</span>
              {stats.outlierIndices.length > 0 && (
                <>
                  <span className="mx-2">·</span>
                  算法检测离群:{' '}
                  <span className="font-mono font-semibold text-red-600">
                    #{stats.outlierIndices.map((i) => i + 1).join(', #')}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Target className="w-6 h-6 text-orange-600" />
                <h2 className="text-xl font-semibold text-slate-800">测量数据点明细</h2>
              </div>
              <div className="text-sm text-slate-500">
                允许范围: [{task.nominalValue - task.tolerance}, {task.nominalValue + task.tolerance}] mm
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="text-left py-3 px-3 text-sm font-semibold text-slate-600">
                      序号
                    </th>
                    <th className="text-left py-3 px-3 text-sm font-semibold text-slate-600">
                      测量值
                    </th>
                    <th className="text-left py-3 px-3 text-sm font-semibold text-slate-600">
                      偏差
                    </th>
                    <th className="text-left py-3 px-3 text-sm font-semibold text-slate-600">
                      状态
                    </th>
                    <th className="text-left py-3 px-3 text-sm font-semibold text-slate-600">
                      备注 / 复核信息
                    </th>
                    <th className="text-right py-3 px-3 text-sm font-semibold text-slate-600">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {task.dataPoints.map((dataPoint: DataPoint, index: number) => {
                    const validation = calculateValidation({
                      actualValue: dataPoint.value,
                      nominalValue: task.nominalValue,
                      tolerance: task.tolerance,
                    });
                    const deviation = dataPoint.value - task.nominalValue;

                    const getRowBg = () => {
                      if (dataPoint.isOutlier) return 'bg-orange-50 border-l-4 border-orange-400';
                      if (!validation.isValid) return 'bg-red-50 border-l-4 border-red-400';
                      return 'hover:bg-slate-50';
                    };

                    return (
                      <tr
                        key={dataPoint.id}
                        className={`border-b border-slate-100 transition-colors ${getRowBg()}`}
                      >
                        <td className="py-3 px-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-sm">
                            {index + 1}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono text-lg font-semibold text-slate-800">
                            {dataPoint.value.toFixed(1)}
                          </span>
                          <span className="text-sm text-slate-500 ml-1">{dataPoint.unit}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`font-mono font-semibold ${
                              Math.abs(deviation) > task.tolerance
                                ? 'text-red-600'
                                : deviation === 0
                                ? 'text-slate-600'
                                : 'text-blue-600'
                            }`}
                          >
                            {deviation >= 0 ? '+' : ''}
                            {deviation.toFixed(1)}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {dataPoint.isOutlier ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-200 text-orange-800 rounded-full text-xs font-semibold">
                              <AlertTriangle className="w-3 h-3" />
                              离群点
                            </span>
                          ) : validation.isValid ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-200 text-green-800 rounded-full text-xs font-semibold">
                              <CheckCircle className="w-3 h-3" />
                              合格
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-200 text-red-800 rounded-full text-xs font-semibold">
                              <AlertCircle className="w-3 h-3" />
                              越界
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 max-w-xs">
                          <input
                            type="text"
                            value={dataPoint.remark || ''}
                            onChange={(e) => handleUpdateRemark(dataPoint.id, e.target.value)}
                            placeholder="添加备注..."
                            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          />
                          {dataPoint.verifiedBy && (
                            <div className="mt-2 text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-200">
                              <div className="flex items-center gap-1 text-blue-600 font-medium">
                                <ShieldCheck className="w-3 h-3" />
                                {dataPoint.verifiedBy} ·{' '}
                                {new Date(dataPoint.verifiedAt!).toLocaleString('zh-CN')}
                              </div>
                              <div className="mt-1 text-slate-600">
                                {dataPoint.verificationReason}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleToggleOutlier(dataPoint.id, dataPoint.isOutlier)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors mr-1 ${
                              dataPoint.isOutlier
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                            }`}
                            title={dataPoint.isOutlier ? '复核通过，排除离群点' : '标记为离群点待复核'}
                          >
                            {dataPoint.isOutlier ? (
                              <>
                                <ShieldCheck className="w-3.5 h-3.5" />
                                复核
                              </>
                            ) : (
                              <>
                                <ShieldX className="w-3.5 h-3.5" />
                                标记
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleRemovePoint(dataPoint.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            删除
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <h3 className="text-amber-800 font-semibold flex items-center gap-2 mb-2">
              <Info className="w-5 h-5" />
              使用说明
            </h3>
            <ul className="text-sm text-amber-700 space-y-1.5 list-disc list-inside">
              <li>点击「补录数据点」可追加新测量值，操作自动记入历史</li>
              <li>点击「标记/复核」按钮处理离群点，需填写复核原因以记录审计追踪</li>
              <li>「重复运行校验」会重新触发计算，并生成操作日志</li>
              <li>剖面图版本对比请前往「剖面图对比」页面并排查看新旧结论</li>
            </ul>
          </div>
        </div>
      </div>

      {showVerifyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl">
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              {verifyConfirm ? '确认标记为离群点' : '复核通过 - 排除离群点'}
            </h3>
            <p className="text-sm text-slate-500 mb-5">
              此操作将由「{currentUser}」执行，并完整记录在历史审计中。
            </p>

            <div className="space-y-4">
              <div className="flex gap-3">
                <button
                  onClick={() => setVerifyConfirm(true)}
                  className={`flex-1 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
                    verifyConfirm
                      ? 'bg-orange-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <ShieldX className="w-4 h-4" />
                  确认为离群点
                </button>
                <button
                  onClick={() => setVerifyConfirm(false)}
                  className={`flex-1 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
                    !verifyConfirm
                      ? 'bg-green-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  复核通过（排除）
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  复核原因 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={verifyReason}
                  onChange={(e) => setVerifyReason(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="请详细说明原因（例如：连续三次复测结果一致，确认为真实机械偏差 / 传感器电磁干扰导致的测量异常...）"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-slate-200">
              <button
                onClick={() => {
                  setShowVerifyModal(null);
                  setVerifyReason('');
                }}
                className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmVerify}
                disabled={!verifyReason.trim()}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                确认并记录
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddPointModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-800">补录数据点</h3>
              <button
                onClick={() => setShowAddPointModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  测量值 (mm) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={newPointValue}
                  onChange={(e) => setNewPointValue(e.target.value)}
                  placeholder="例如: 3201.5"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">备注</label>
                <input
                  type="text"
                  value={newPointRemark}
                  onChange={(e) => setNewPointRemark(e.target.value)}
                  placeholder="可选：复测来源、环境条件等"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-slate-200">
              <button
                onClick={() => setShowAddPointModal(false)}
                className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAddPoint}
                disabled={!newPointValue}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                确认补录
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalculatorPage;
