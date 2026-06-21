import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckSquare, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Plus,
  Clock,
  FileText,
  ArrowRight,
  Check,
  X
} from 'lucide-react';
import { useReviewStore } from '@/store/reviewStore';
import { useSnapshotStore } from '@/store/snapshotStore';
import type { ReviewItem } from '@/types';
import { formatCurrency, getStatusLabel } from '@/utils/formatters';

export default function Review() {
  const { items, toggleItemComplete, getStats, getSupplementItems, getReleaseItems, getItemsForSnapshot } = useReviewStore();
  const { snapshots } = useSnapshotStore();
  const [filter, setFilter] = useState<'all' | 'supplement' | 'release'>('all');
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | 'all'>('all');

  const stats = getStats();

  const filteredItems = items.filter(item => {
    if (filter !== 'all' && item.action !== filter) return false;
    if (selectedSnapshot !== 'all' && item.snapshotId !== selectedSnapshot) return false;
    return true;
  });

  const supplementItems = getSupplementItems();
  const releaseItems = getReleaseItems();

  const getSnapshotInfo = (snapshotId: string) => {
    return snapshots.find(s => s.id === snapshotId);
  };

  return (
    <div className="space-y-8">
      <div>
        <motion.h1 
          className="text-3xl font-bold text-white mb-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          审核放行
        </motion.h1>
        <motion.p 
          className="text-slate-400"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          明确每条记录需要补充的材料和可以放行的条件，指导后续操作
        </motion.p>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <CheckSquare className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">总审核项</p>
              <p className="text-2xl font-bold text-white font-mono-display">{stats.total}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="card border-amber-500/30"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">需补材料</p>
              <p className="text-2xl font-bold text-amber-400 font-mono-display">{stats.toSupplement}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="card border-emerald-500/30"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">可放行</p>
              <p className="text-2xl font-bold text-emerald-400 font-mono-display">{stats.toRelease}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="card border-blue-500/30"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Check className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">已完成</p>
              <p className="text-2xl font-bold text-white font-mono-display">
                {stats.completed}/{stats.total}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex bg-slate-800/50 rounded-lg p-1">
          {[
            { key: 'all', label: '全部', count: stats.total },
            { key: 'supplement', label: '需补材料', count: stats.toSupplement, color: 'amber' },
            { key: 'release', label: '可放行', count: stats.toRelease, color: 'emerald' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as typeof filter)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                filter === tab.key
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                tab.color === 'amber' ? 'bg-amber-500/20 text-amber-400' :
                tab.color === 'emerald' ? 'bg-emerald-500/20 text-emerald-400' :
                'bg-slate-700 text-slate-300'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <select
          value={selectedSnapshot}
          onChange={(e) => setSelectedSnapshot(e.target.value)}
          className="ml-auto bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="all">全部版本</option>
          {snapshots.map(snap => (
            <option key={snap.id} value={snap.id}>
              {snap.version} - {snap.modelVersion}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          {filteredItems.map((item, index) => {
            const snapshot = getSnapshotInfo(item.snapshotId);
            return (
              <motion.div
                key={item.id}
                className={`card ${
                  item.action === 'supplement' 
                    ? 'border-amber-500/30' 
                    : 'border-emerald-500/30'
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 * index }}
              >
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => toggleItemComplete(item.id)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 transition-all ${
                      item.isComplete
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : item.action === 'supplement'
                        ? 'border-amber-500/50 hover:border-amber-500'
                        : 'border-emerald-500/50 hover:border-emerald-500'
                    }`}
                  >
                    {item.isComplete && <Check className="w-4 h-4" />}
                  </button>

                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`badge ${
                        item.action === 'supplement' ? 'badge-warning' : 'badge-normal'
                      }`}>
                        {item.action === 'supplement' ? (
                          <>
                            <Plus className="w-3 h-3" />
                            补材料
                          </>
                        ) : (
                          <>
                            <Check className="w-3 h-3" />
                            可放行
                          </>
                        )}
                      </span>
                      {snapshot && (
                        <>
                          <span className="text-xs text-slate-500 font-mono-display">
                            {snapshot.version}
                          </span>
                          <span className={`badge badge-${snapshot.status} text-xs`}>
                            {getStatusLabel(snapshot.status)}
                          </span>
                        </>
                      )}
                    </div>

                    <h4 className={`font-semibold text-lg mb-2 ${
                      item.isComplete ? 'text-slate-500 line-through' : 'text-white'
                    }`}>
                      {item.material}
                    </h4>

                    <p className={`text-sm ${
                      item.isComplete ? 'text-slate-600' : 'text-slate-400'
                    }`}>
                      {item.remark}
                    </p>

                    {item.action === 'supplement' && !item.isComplete && (
                      <div className="mt-4 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-amber-400 font-medium text-sm mb-1">操作指引</p>
                            <p className="text-slate-400 text-xs">
                              请小许尽快补充此项材料。材料齐全后，点击左侧复选框标记为完成，
                              系统将自动更新审核状态。
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {item.action === 'release' && item.isComplete && (
                      <div className="mt-4 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-emerald-400 font-medium text-sm mb-1">放行条件已满足</p>
                            <p className="text-slate-400 text-xs">
                              此项材料已齐全，可进入下一审批环节。
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0">
                    {snapshot && (
                      <p className="text-white font-mono-display font-semibold">
                        {formatCurrency(snapshot.totalCost)}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="card text-center py-16">
              <XCircle className="w-12 h-12 mx-auto mb-4 text-slate-600" />
              <p className="text-slate-400">没有符合条件的审核项</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-400" />
              待补材料清单
            </h3>
            <div className="space-y-3">
              {supplementItems.filter(i => !i.isComplete).map((item, index) => {
                const snapshot = getSnapshotInfo(item.snapshotId);
                return (
                  <motion.div
                    key={item.id}
                    className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                  >
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm text-white font-medium">{item.material}</p>
                        {snapshot && (
                          <p className="text-xs text-slate-500 mt-1 font-mono-display">
                            {snapshot.version} · {formatCurrency(snapshot.totalCost)}
                          </p>
                        )}
                        <p className="text-xs text-amber-400 mt-2">{item.remark}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              {supplementItems.filter(i => !i.isComplete).length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500/50" />
                  <p className="text-sm">所有材料已补充完毕</p>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              可放行清单
            </h3>
            <div className="space-y-3">
              {releaseItems.filter(i => i.isComplete).map((item, index) => {
                const snapshot = getSnapshotInfo(item.snapshotId);
                return (
                  <motion.div
                    key={item.id}
                    className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                  >
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-white font-medium">{item.material}</p>
                        {snapshot && (
                          <p className="text-xs text-slate-500 mt-1 font-mono-display">
                            {snapshot.version}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              {releaseItems.filter(i => i.isComplete).length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  <p className="text-sm">暂无符合放行条件的项</p>
                </div>
              )}
            </div>
          </div>

          <div className="card bg-gradient-to-br from-blue-600/10 to-purple-600/10 border-blue-500/30">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <ArrowRight className="w-5 h-5 text-blue-400" />
              给小许的操作建议
            </h3>
            <div className="space-y-3 text-sm">
              {stats.toSupplement > 0 && (
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-300">
                    还有 <span className="text-amber-400 font-semibold">{stats.toSupplement}</span> 项材料需要补充，
                    请优先处理 v2.4.1 版本的灰度比例异常相关材料。
                  </p>
                </div>
              )}
              {stats.toRelease > 0 && (
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-300">
                    <span className="text-emerald-400 font-semibold">{stats.toRelease}</span> 项已满足放行条件，
                    可通知排班同事进行后续审核。
                  </p>
                </div>
              )}
              <div className="pt-3 mt-3 border-t border-slate-700/50">
                <p className="text-slate-400 text-xs">
                  💡 提示：补充材料时请记得在历史时间线中添加备注和截图，
                  所有记录都会永久保留，方便后续追溯。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
