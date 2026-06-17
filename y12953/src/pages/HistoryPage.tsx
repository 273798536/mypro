import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  User,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
} from 'lucide-react';
import { useBackupStore } from '@/store/backupStore';

export default function HistoryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const backup = useBackupStore((state) => state.getBackupById(id || ''));
  const corrections = useBackupStore((state) => state.getCorrectionsByBackupId(id || ''));
  const revertCorrection = useBackupStore((state) => state.revertCorrection);

  if (!backup) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertTriangle className="w-16 h-16 text-amber-400 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">备份记录不存在</h2>
        <button
          onClick={() => navigate('/backups')}
          className="px-4 py-2 bg-navy-600 hover:bg-navy-500 text-white rounded-lg transition-colors"
        >
          返回列表
        </button>
      </div>
    );
  }

  const handleRevert = (correctionId: string) => {
    if (confirm('确定要回滚此修正吗？字段将恢复为修正前的类型。')) {
      revertCorrection(correctionId);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(`/backups/${backup.id}`)}
          className="p-2 rounded-lg bg-navy-800/50 hover:bg-navy-700/50 text-navy-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white font-mono">
            {backup.tableName} · 修正历史
          </h1>
          <p className="text-navy-300 mt-1 text-sm">
            共 {corrections.length} 条修正记录 · 可回滚至历史版本
          </p>
        </div>
      </div>

      {corrections.length === 0 ? (
        <div className="bg-navy-800/50 backdrop-blur-sm border border-navy-700/50 rounded-xl p-12 text-center">
          <Clock className="w-12 h-12 text-navy-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">暂无修正记录</h3>
          <p className="text-navy-400 text-sm mb-6">
            该备份记录尚未进行过字段修正
          </p>
          <Link
            to={`/backups/${backup.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-navy-600 hover:bg-navy-500 text-white rounded-lg transition-colors text-sm"
          >
            去详情页修正
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-navy-700/50" />

          <div className="space-y-6">
            {corrections.map((correction, idx) => (
              <div
                key={correction.id}
                className="relative pl-16 animate-fade-in-up"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="absolute left-4 top-5 w-4 h-4 rounded-full bg-navy-800 border-2 border-amber-500 z-10">
                  <div className="absolute inset-0 rounded-full bg-amber-400 animate-ping opacity-30" />
                </div>

                <div className="bg-navy-800/50 backdrop-blur-sm border border-navy-700/50 rounded-xl p-5 hover:border-navy-600/50 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-white font-semibold">
                          {correction.fieldName}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          类型修正
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-navy-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(correction.correctedAt).toLocaleString('zh-CN')}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {correction.operator}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevert(correction.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-navy-700/50 hover:bg-red-500/20 text-navy-300 hover:text-red-400 rounded-lg border border-navy-600/50 hover:border-red-500/30 transition-all"
                    >
                      <RotateCcw className="w-3 h-3" />
                      回滚
                    </button>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex-1 p-3 bg-navy-900/50 rounded-lg">
                      <p className="text-xs text-navy-400 mb-1">修正前</p>
                      <code className="text-red-400 font-mono text-sm">
                        {correction.oldType}
                      </code>
                    </div>
                    <ArrowRight className="w-5 h-5 text-navy-500 flex-shrink-0" />
                    <div className="flex-1 p-3 bg-navy-900/50 rounded-lg">
                      <p className="text-xs text-navy-400 mb-1">修正后</p>
                      <code className="text-emerald-400 font-mono text-sm">
                        {correction.newType}
                      </code>
                    </div>
                  </div>

                  {correction.reason && (
                    <div className="mt-4 pt-4 border-t border-navy-700/30">
                      <p className="text-xs text-navy-400 mb-1">修正原因</p>
                      <p className="text-sm text-navy-200">{correction.reason}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-navy-800/30 border border-navy-700/30 rounded-xl p-4">
        <p className="text-xs text-navy-400">
          💡 提示：每次字段修正都会保留完整历史记录，包括修正前后的类型、原因和操作人。
          回滚操作会移除该条修正，并将字段恢复为修正前的状态。
        </p>
      </div>
    </div>
  );
}
