import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  GitCompare, 
  ArrowRight, 
  CheckCircle,
  AlertCircle,
  XCircle,
  FileText,
  MessageSquare,
  User,
  Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSnapshotStore } from '@/store/snapshotStore';
import { compareSnapshots, formatDiff, formatPercentDiff } from '@/services/versionComparator';
import type { ComparisonResult } from '@/types';
import { 
  formatCurrency, 
  formatDate, 
  getStatusLabel,
  getDecisionLabel,
  getDecisionColor
} from '@/utils/formatters';

export default function Compare() {
  const navigate = useNavigate();
  const { snapshots, selectedForCompare, clearCompareSelection, getCompareSnapshots } = useSnapshotStore();
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [compareSnapshotList, setCompareSnapshotList] = useState(getCompareSnapshots());

  useEffect(() => {
    const snaps = getCompareSnapshots();
    setCompareSnapshotList(snaps);
    if (snaps.length === 2) {
      setComparison(compareSnapshots(snaps[0], snaps[1]));
    }
  }, [selectedForCompare, getCompareSnapshots]);

  const handleSelectSnapshot = (position: 'a' | 'b', snapshotId: string) => {
    if (selectedForCompare.length === 2) {
      clearCompareSelection();
    }
    useSnapshotStore.getState().toggleCompareSelection(snapshotId);
  };

  const [snapshotA, snapshotB] = compareSnapshotList;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <motion.h1 
            className="text-3xl font-bold text-white mb-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            版本对比
          </motion.h1>
          <motion.p 
            className="text-slate-400"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            并排对比两个版本的成本差异，高亮显示变化参数，保留历史人工判断
          </motion.p>
        </div>

        <button
          onClick={() => navigate('/timeline')}
          className="btn btn-outline"
        >
          返回时间线选择
        </button>
      </div>

      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-2">
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm font-bold">A</span>
              基准版本
            </h3>
            {compareSnapshots.length < 2 && (
              <select
                value={snapshotA?.id || ''}
                onChange={(e) => handleSelectSnapshot('a', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">选择基准版本...</option>
                {snapshots.filter(s => s.id !== snapshotB?.id).map(snap => (
                  <option key={snap.id} value={snap.id}>
                    {snap.version} - {snap.modelVersion}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
            <GitCompare className="w-8 h-8 text-white" />
          </div>
        </div>

        <div className="col-span-2">
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-sm font-bold">B</span>
              对比版本
            </h3>
            {compareSnapshots.length < 2 && (
              <select
                value={snapshotB?.id || ''}
                onChange={(e) => handleSelectSnapshot('b', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">选择对比版本...</option>
                {snapshots.filter(s => s.id !== snapshotA?.id).map(snap => (
                  <option key={snap.id} value={snap.id}>
                    {snap.version} - {snap.modelVersion}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {comparison && snapshotA && snapshotB && (
        <>
          <div className="grid grid-cols-3 gap-6">
            <motion.div
              className="card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">A</span>
                <div>
                  <p className="text-sm text-slate-400">{snapshotA.version}</p>
                  <p className="text-xs text-slate-500 font-mono-display">{snapshotA.modelVersion}</p>
                </div>
              </div>
              <p className="text-3xl font-bold text-white font-mono-display">
                {formatCurrency(snapshotA.totalCost)}
              </p>
              <div className="flex items-center gap-2 mt-2 text-xs">
                <span className={`badge badge-${snapshotA.status}`}>
                  {getStatusLabel(snapshotA.status)}
                </span>
                <span className="text-slate-500">{formatDate(snapshotA.createdAt)}</span>
              </div>
            </motion.div>

            <motion.div
              className="card text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <p className="text-sm text-slate-400 mb-2">成本差异</p>
              <div className={`text-4xl font-bold font-mono-display ${
                comparison.totalCostDiff > 0 ? 'text-red-400' : comparison.totalCostDiff < 0 ? 'text-emerald-400' : 'text-white'
              }`}>
                {formatDiff(comparison.totalCostDiff, '元')}
              </div>
              <p className={`text-lg mt-1 ${
                comparison.totalCostDiffPercent > 0 ? 'text-red-400' : comparison.totalCostDiffPercent < 0 ? 'text-emerald-400' : 'text-white'
              }`}>
                {formatPercentDiff(comparison.totalCostDiffPercent)}
              </p>
              <ArrowRight className="w-6 h-6 mx-auto mt-3 text-slate-600" />
            </motion.div>

            <motion.div
              className="card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold">B</span>
                <div>
                  <p className="text-sm text-slate-400">{snapshotB.version}</p>
                  <p className="text-xs text-slate-500 font-mono-display">{snapshotB.modelVersion}</p>
                </div>
              </div>
              <p className="text-3xl font-bold text-white font-mono-display">
                {formatCurrency(snapshotB.totalCost)}
              </p>
              <div className="flex items-center gap-2 mt-2 text-xs">
                <span className={`badge badge-${snapshotB.status}`}>
                  {getStatusLabel(snapshotB.status)}
                </span>
                <span className="text-slate-500">{formatDate(snapshotB.createdAt)}</span>
              </div>
            </motion.div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              参数差异对比
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">参数名称</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <span className="w-4 h-4 rounded bg-blue-500/30 text-blue-400 flex items-center justify-center text-xs">A</span>
                        {snapshotA.version}
                      </span>
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">差异</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <span className="w-4 h-4 rounded bg-purple-500/30 text-purple-400 flex items-center justify-center text-xs">B</span>
                        {snapshotB.version}
                      </span>
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">单位</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshotA.parameters.map((paramA, index) => {
                    const paramB = snapshotB.parameters.find(p => p.name === paramA.name);
                    const diff = comparison.parameterDiffs.find(d => d.name === paramA.name);
                    const hasDiff = diff && diff.diff !== 0;

                    return (
                      <motion.tr
                        key={paramA.id}
                        className={`border-b border-slate-700/50 ${hasDiff ? 'bg-amber-500/5' : ''}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * index }}
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">{paramA.name}</span>
                            {hasDiff && (
                              <span className="badge badge-warning text-xs">变更</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{paramA.description}</p>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className={`font-mono-display ${
                            hasDiff && paramA.value > (paramB?.value || 0) ? 'text-red-400 line-through' : 'text-white'
                          }`}>
                            {paramA.value}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          {diff ? (
                            <span className={`font-mono-display font-semibold ${
                              diff.diff > 0 ? 'text-red-400' : diff.diff < 0 ? 'text-emerald-400' : 'text-slate-400'
                            }`}>
                              {formatDiff(diff.diff, diff.unit)}
                              <span className="text-xs ml-1">
                                ({formatPercentDiff(diff.diffPercent)})
                              </span>
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className={`font-mono-display ${
                            hasDiff && paramB && paramB.value > paramA.value ? 'text-emerald-400' : 'text-white'
                          }`}>
                            {paramB?.value}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right text-slate-500">
                          {paramA.unit}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-400" />
                人工判断历史
              </h3>

              <div className="space-y-4">
                {snapshotA.manualJudgment && (
                  <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">A</span>
                        <span className="text-white font-medium">{snapshotA.manualJudgment.author}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getDecisionColor(snapshotA.manualJudgment.decision)} bg-current/10`}>
                        {getDecisionLabel(snapshotA.manualJudgment.decision)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 mb-2">{formatDate(snapshotA.manualJudgment.createdAt)}</p>
                    <p className="text-slate-300">{snapshotA.manualJudgment.content}</p>
                  </div>
                )}

                {snapshotB.manualJudgment && (
                  <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold">B</span>
                        <span className="text-white font-medium">{snapshotB.manualJudgment.author}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getDecisionColor(snapshotB.manualJudgment.decision)} bg-current/10`}>
                        {getDecisionLabel(snapshotB.manualJudgment.decision)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 mb-2">{formatDate(snapshotB.manualJudgment.createdAt)}</p>
                    <p className="text-slate-300">{snapshotB.manualJudgment.content}</p>
                  </div>
                )}

                {comparison.hasManualJudgmentChange && (
                  <div className="p-4 bg-amber-500/5 border border-amber-500/30 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-amber-400 font-medium text-sm">人工判断已变更</p>
                      <p className="text-slate-400 text-xs mt-1">
                        两个版本的人工判断存在差异，请仔细核对判断依据是否合理。
                        历史判断已永久保留，不会被新版本覆盖。
                      </p>
                    </div>
                  </div>
                )}

                {!comparison.hasManualJudgmentChange && snapshotA.manualJudgment && snapshotB.manualJudgment && (
                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/30 rounded-lg flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-emerald-400 font-medium text-sm">人工判断一致</p>
                      <p className="text-slate-400 text-xs mt-1">
                        两个版本的人工判断结论一致，审核连续性良好。
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-purple-400" />
                版本信息对比
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-900/30 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">操作人</p>
                    <p className="text-white">{snapshotA.operator}</p>
                  </div>
                  <div className="p-3 bg-slate-900/30 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">操作人</p>
                    <p className="text-white">{snapshotB.operator}</p>
                  </div>
                  <div className="p-3 bg-slate-900/30 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> 创建时间
                    </p>
                    <p className="text-white text-sm">{formatDate(snapshotA.createdAt)}</p>
                  </div>
                  <div className="p-3 bg-slate-900/30 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> 创建时间
                    </p>
                    <p className="text-white text-sm">{formatDate(snapshotB.createdAt)}</p>
                  </div>
                  <div className="p-3 bg-slate-900/30 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">备注数量</p>
                    <p className="text-white font-mono-display">{snapshotA.notes.length} 条</p>
                  </div>
                  <div className="p-3 bg-slate-900/30 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">备注数量</p>
                    <p className="text-white font-mono-display">{snapshotB.notes.length} 条</p>
                  </div>
                  <div className="p-3 bg-slate-900/30 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">截图数量</p>
                    <p className="text-white font-mono-display">{snapshotA.screenshots.length} 张</p>
                  </div>
                  <div className="p-3 bg-slate-900/30 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">截图数量</p>
                    <p className="text-white font-mono-display">{snapshotB.screenshots.length} 张</p>
                  </div>
                </div>

                <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                  <p className="text-sm text-slate-300">
                    <span className="text-blue-400 font-medium">提示：</span>
                    模型版本从 <span className="font-mono-display text-white">{snapshotA.modelVersion}</span> 变更为 
                    <span className="font-mono-display text-white"> {snapshotB.modelVersion}</span>，
                    请确认参数变化是否与模型版本迭代相关。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {!comparison && (
        <div className="card text-center py-20">
          <XCircle className="w-12 h-12 mx-auto mb-4 text-slate-600" />
          <p className="text-slate-400 mb-2">请选择两个版本进行对比</p>
          <p className="text-slate-500 text-sm">可在上方选择器或时间线页面中选择版本</p>
        </div>
      )}
    </div>
  );
}
