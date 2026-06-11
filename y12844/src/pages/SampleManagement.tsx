import React, { useState } from 'react';
import {
  Search,
  Plus,
  Filter,
  ChevronRight,
  AlertTriangle,
  Ban,
  CheckCircle,
  Clock,
  Beaker,
  FileBarChart,
  BarChart3,
  ClipboardList,
  Download,
  Eye
} from 'lucide-react';
import { useSampleStore } from '@/store/useSampleStore';
import { useAnalysisStore } from '@/store/useAnalysisStore';
import StatusBadge from '@/components/StatusBadge';
import type { SampleStatus, Sample } from '@/types';
import { SAMPLE_STATUS_LABELS } from '@/types';

interface SampleManagementProps {
  onNavigate?: (page: string, sample?: Sample) => void;
}

const SampleManagement: React.FC<SampleManagementProps> = ({ onNavigate }) => {
  const {
    samples,
    filterStatus,
    searchKeyword,
    setFilterStatus,
    setSearchKeyword,
    setSelectedSample,
    getFilteredSamples,
    currentOperator
  } = useSampleStore();

  const { getLatestRun } = useAnalysisStore();
  const [expandedBarcode, setExpandedBarcode] = useState<string | null>(null);
  const [showStudentExplanation, setShowStudentExplanation] = useState(false);

  const filteredSamples = getFilteredSamples();

  const statusFilters: { value: SampleStatus | 'all'; label: string; count: number; color: string }[] = [
    {
      value: 'all',
      label: '全部',
      count: samples.length,
      color: 'bg-slate-600'
    },
    {
      value: 'success',
      label: '顺利通过',
      count: samples.filter(s => s.status === 'success').length,
      color: 'bg-emerald-500'
    },
    {
      value: 'pending',
      label: '待确认',
      count: samples.filter(s => s.status === 'pending').length,
      color: 'bg-amber-500'
    },
    {
      value: 'bad',
      label: '坏数据',
      count: samples.filter(s => s.status === 'bad').length,
      color: 'bg-red-500'
    },
    {
      value: 'blocked',
      label: '已拦截',
      count: samples.filter(s => s.status === 'blocked').length,
      color: 'bg-rose-500'
    }
  ];

  const toggleExpand = (barcode: string, createdAt: Date) => {
    const key = `${barcode}-${createdAt.getTime()}`;
    setExpandedBarcode(expandedBarcode === key ? null : key);
  };

  const isExpanded = (barcode: string, createdAt: Date) => {
    return expandedBarcode === `${barcode}-${createdAt.getTime()}`;
  };

  const handleNavigate = (page: string, sample: Sample) => {
    setSelectedSample(sample.barcode, sample.createdAt);
    onNavigate?.(page, sample);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-3">
                <Beaker size={28} />
                细胞迁移划痕分析系统
              </h1>
              <p className="text-blue-100 text-sm mt-1">
                临床检验级细胞迁移实验数据分析与质控平台
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-blue-200">当前操作员</p>
                <p className="font-medium text-sm">{currentOperator}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/30">
                <span className="font-bold">{currentOperator.charAt(0)}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[
            { label: '样本总数', value: samples.length, icon: Beaker, color: 'from-blue-500 to-blue-600' },
            { label: '已分析完成', value: samples.filter(s => s.runCount > 0 && s.status !== 'blocked').length, icon: CheckCircle, color: 'from-emerald-500 to-emerald-600' },
            { label: '待处理', value: samples.filter(s => s.status === 'pending' || s.status === 'blocked').length, icon: Clock, color: 'from-amber-500 to-amber-600' }
          ].map((stat, idx) => (
            <div key={idx} className={`bg-gradient-to-br ${stat.color} rounded-xl text-white p-5 shadow-lg`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm">{stat.label}</p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <stat.icon size={24} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="搜索条码、细胞类型、患者ID..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg w-72 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <Filter size={14} className="text-slate-500" />
                  <span className="text-slate-500">状态筛选:</span>
                  {statusFilters.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setFilterStatus(f.value)}
                      className={`px-3 py-1.5 rounded-full border-2 transition-all text-xs font-medium ${filterStatus === f.value
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${f.color}`}></span>
                        {f.label} ({f.count})
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowStudentExplanation(!showStudentExplanation)}
                  className={`text-xs px-4 py-2 rounded-lg border-2 transition-all flex items-center gap-1.5 ${showStudentExplanation
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'
                    }`}
                >
                  <Eye size={14} />
                  学生视图 {showStudentExplanation ? '开' : '关'}
                </button>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center gap-1.5 shadow-sm">
                  <Plus size={16} />
                  新增样本
                </button>
              </div>
            </div>
          </div>

          {showStudentExplanation && (
            <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Eye size={16} className="text-blue-600" />
                </div>
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">📚 学生学习视图已启用</p>
                  <p className="text-xs text-blue-600">
                    在本模式下，您将看到更多解释性内容，帮助理解：为什么某些样本被拦截、
                    质控指标的含义、异常处理的原因等。这些内容在检验师的日常工作中通常不会显示，
                    但对于学习理解检验流程非常重要。
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200">
                  <th className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider px-4 py-3">样本条码</th>
                  <th className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider px-4 py-3">细胞类型</th>
                  <th className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider px-4 py-3">患者ID</th>
                  <th className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider px-4 py-3">状态</th>
                  <th className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider px-4 py-3">操作人</th>
                  <th className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider px-4 py-3">运行次数</th>
                  <th className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider px-4 py-3">录入时间</th>
                  <th className="text-right text-xs font-semibold text-slate-600 uppercase tracking-wider px-4 py-3">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSamples.map((sample, index) => {
                  const latestRun = getLatestRun(sample.barcode);
                  const isDuplicateBlocked = sample.isBarcodeDuplicate && sample.status === 'blocked';

                  return (
                    <React.Fragment key={`${sample.barcode}-${sample.createdAt.getTime()}`}>
                      <tr
                        className={`hover:bg-slate-50 transition-colors ${isDuplicateBlocked ? 'bg-rose-50/60 border-l-4 border-rose-500' : ''
                          } ${index % 2 === 1 ? 'bg-slate-50/40' : ''}`}
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleExpand(sample.barcode, sample.createdAt)}
                              className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              <ChevronRight
                                size={18}
                                className={`transition-transform ${isExpanded(sample.barcode, sample.createdAt) ? 'rotate-90' : ''
                                  }`}
                              />
                            </button>
                            <div>
                              <p className="font-mono font-semibold text-slate-800 text-sm">{sample.barcode}</p>
                              {isDuplicateBlocked && (
                                <p className="text-xs text-rose-600 flex items-center gap-1 mt-0.5">
                                  <Ban size={12} />
                                  条码重复 - 已拦截
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm font-medium text-slate-700">{sample.cellType}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-slate-600 font-mono">{sample.patientId}</span>
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge status={sample.status} size="sm" />
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-slate-600">{sample.operator}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`text-sm font-mono font-medium ${sample.runCount > 0 ? 'text-emerald-600' : 'text-slate-400'
                            }`}>
                            {sample.runCount} 次
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-xs text-slate-500 font-mono">
                            {sample.createdAt.toLocaleString('zh-CN')}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleNavigate('analysis', sample)}
                              disabled={sample.status === 'blocked'}
                              className="p-2 rounded-lg hover:bg-blue-100 text-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              title="分析计算"
                            >
                              <FileBarChart size={16} />
                            </button>
                            <button
                              onClick={() => handleNavigate('chart', sample)}
                              disabled={!latestRun || sample.status === 'blocked'}
                              className="p-2 rounded-lg hover:bg-emerald-100 text-emerald-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              title="图表可视化"
                            >
                              <BarChart3 size={16} />
                            </button>
                            <button
                              onClick={() => handleNavigate('diff', sample)}
                              disabled={!latestRun || sample.status === 'blocked'}
                              className="p-2 rounded-lg hover:bg-indigo-100 text-indigo-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              title="差异分析"
                            >
                              <ClipboardList size={16} />
                            </button>
                            <button
                              onClick={() => handleNavigate('review', sample)}
                              className="p-2 rounded-lg hover:bg-amber-100 text-amber-600 transition-colors"
                              title="复核中心"
                            >
                              <CheckCircle size={16} />
                            </button>
                            <button
                              onClick={() => handleNavigate('export', sample)}
                              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                              title="导出报告"
                            >
                              <Download size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {isExpanded(sample.barcode, sample.createdAt) && (
                        <tr className="bg-slate-50">
                          <td colSpan={8} className="px-6 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="bg-white rounded-lg border border-slate-200 p-4">
                                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3 flex items-center gap-2">
                                  <FileBarChart size={14} />
                                  样本备注
                                </h4>
                                <p className="text-sm text-slate-700 leading-relaxed">
                                  {sample.notes || '暂无备注信息'}
                                </p>
                                {latestRun?.qcResult && (
                                  <div className="mt-3 pt-3 border-t border-slate-100">
                                    <p className="text-xs text-slate-500 mb-1">质控状态</p>
                                    <StatusBadge status={latestRun.qcResult.status} type="qc" size="sm" />
                                  </div>
                                )}
                              </div>

                              {isDuplicateBlocked && showStudentExplanation && (
                                <div className="bg-rose-50 rounded-lg border-2 border-rose-200 p-4 md:col-span-2">
                                  <h4 className="text-xs font-semibold text-rose-700 uppercase mb-3 flex items-center gap-2">
                                    <AlertTriangle size={14} />
                                    📚 学生课堂：为什么这个条码被拦截了？
                                  </h4>
                                  <div className="space-y-3 text-sm">
                                    <div className="bg-white rounded-lg p-3 border border-rose-100">
                                      <p className="font-medium text-rose-700 mb-1">🚫 拦截原因</p>
                                      <p className="text-rose-600 text-xs">
                                        条码 <code className="bg-rose-100 px-1.5 py-0.5 rounded font-mono">{sample.barcode}</code>
                                        已经被另一个样本使用。就像考试时不能有两个同学用同一个准考证号，
                                        如果两个样本用了同一个条码，系统就无法区分它们！
                                      </p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                      <div className="bg-white rounded-lg p-3 border border-rose-100">
                                        <p className="font-medium text-slate-700 text-xs mb-1">📋 问题1</p>
                                        <p className="text-xs text-slate-600">数据混淆：不知道哪个结果属于哪个样本</p>
                                      </div>
                                      <div className="bg-white rounded-lg p-3 border border-rose-100">
                                        <p className="font-medium text-slate-700 text-xs mb-1">📊 问题2</p>
                                        <p className="text-xs text-slate-600">统计错误：同一样本被重复计数导致偏差</p>
                                      </div>
                                      <div className="bg-white rounded-lg p-3 border border-rose-100">
                                        <p className="font-medium text-slate-700 text-xs mb-1">📄 问题3</p>
                                        <p className="text-xs text-slate-600">报告错误：最终报告可能发错给病人</p>
                                      </div>
                                    </div>
                                    <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                                      <p className="font-medium text-emerald-700 text-xs mb-1">✅ 正确处理方式</p>
                                      <p className="text-xs text-emerald-600">
                                        检查是否录入错误 → 确认患者信息 → 如为新样本分配新条码 →
                                        重新录入后进行分析
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {!isDuplicateBlocked && latestRun && (
                                <div className="bg-white rounded-lg border border-slate-200 p-4 md:col-span-2">
                                  <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3 flex items-center gap-2">
                                    <BarChart3 size={14} />
                                    最近分析结果（第{latestRun.runNumber}次运行）
                                  </h4>
                                  {latestRun.status === 'completed' ? (
                                    <div>
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {latestRun.migrationData.map((point) => (
                                          <div key={point.timePoint} className="bg-slate-50 rounded-lg p-2.5">
                                            <p className="text-xs text-slate-500">{point.timePoint}h</p>
                                            <p className="text-sm font-mono font-bold text-slate-700">
                                              {point.areaMm2.toFixed(2)} mm²
                                            </p>
                                            <p className={`text-xs font-mono ${point.migrationRate >= 40 ? 'text-emerald-600' : 'text-amber-600'
                                              }`}>
                                              {point.migrationRate.toFixed(1)}%
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                      {showStudentExplanation && latestRun.migrationData.length > 0 && (
                                        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                                          <p className="text-xs text-blue-700">
                                            <span className="font-semibold">📚 学习提示：</span>
                                            观察表格中从上到下的数据，你能发现什么规律？
                                            随着时间增加，划痕面积应该越来越
                                            <span className="font-bold text-emerald-700">小</span>，
                                            迁移率应该越来越<span className="font-bold text-emerald-700">大</span>。
                                            如果发现数据不符合这个规律，说明可能有问题需要检查！
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                                      <p className="text-sm font-medium text-red-700 flex items-center gap-2">
                                        <AlertTriangle size={16} />
                                        分析失败
                                      </p>
                                      {latestRun.failureReason && (
                                        <p className="text-xs text-red-600 mt-1">
                                          失败原因：{latestRun.failureReason.description}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredSamples.length === 0 && (
            <div className="py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Search size={28} className="text-slate-400" />
              </div>
              <p className="text-slate-500">没有找到匹配的样本记录</p>
              <p className="text-sm text-slate-400 mt-1">尝试调整搜索条件或筛选状态</p>
            </div>
          )}
        </div>

        <div className="mt-6 bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" />
            状态说明（检验师操作参考）
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-lg border-2 border-emerald-200 bg-emerald-50">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                <span className="font-semibold text-emerald-800">顺利通过</span>
              </div>
              <p className="text-emerald-700 leading-relaxed">
                划痕清晰、数据完整、质控全部达标（CV≤10%，Z'≥0.5，存活率≥90%）。
                可直接出具报告。
              </p>
            </div>
            <div className="p-4 rounded-lg border-2 border-amber-200 bg-amber-50">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                <span className="font-semibold text-amber-800">待确认</span>
              </div>
              <p className="text-amber-700 leading-relaxed">
                数据基本可用但存在疑问：临界值、时间点缺失、试剂批号未补录等。
                需人工复核后决定。
              </p>
            </div>
            <div className="p-4 rounded-lg border-2 border-red-200 bg-red-50">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                <span className="font-semibold text-red-800">坏数据</span>
              </div>
              <p className="text-red-700 leading-relaxed">
                明显的异常数据：严重污染、划痕完全不可识别、细胞大量死亡等。
                应标记作废并重新实验。
              </p>
            </div>
            <div className="p-4 rounded-lg border-2 border-rose-200 bg-rose-50">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                <span className="font-semibold text-rose-800">已拦截</span>
              </div>
              <p className="text-rose-700 leading-relaxed">
                条码重复或其他格式校验不通过。必须修正条码问题后才能继续分析，
                避免数据混淆。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SampleManagement;
