import { useGameStore } from '../store/useGameStore';
import { X, Download, Star, AlertCircle, CheckCircle, RotateCcw, Play, BarChart3 } from 'lucide-react';

export default function ResultPanel() {
  const {
    currentSession,
    currentLevel,
    showResultPanel,
    setShowResultPanel,
    resetLevel,
    exportResults,
    materials,
    startReplay
  } = useGameStore();
  
  if (!showResultPanel || !currentSession) return null;
  
  const session = currentSession;
  const level = currentLevel;
  const stars = session.stars || 0;
  
  const memberStats = session.members.map(m => {
    const mat = materials.find(material => material.id === m.materialId);
    const maxStress = Math.max(...session.replayData.map(f => Math.abs(f.memberStresses[m.id] || 0)));
    return {
      material: mat?.name || '未知',
      maxStress,
      maxAllowed: m.maxStress,
      ratio: maxStress / m.maxStress
    };
  });
  
  const handleExport = (format: 'csv' | 'json') => {
    const data = exportResults(session.id, format);
    const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bridge_result_${session.id}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const handleReplay = () => {
    setShowResultPanel(false);
    startReplay(session.id);
  };
  
  const handleRetry = () => {
    setShowResultPanel(false);
    resetLevel();
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        <div className={`p-6 ${session.success ? 'bg-gradient-to-r from-green-900/50 to-emerald-900/50' : 'bg-gradient-to-r from-red-900/50 to-orange-900/50'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {session.success ? (
                <CheckCircle className="text-green-400" size={32} />
              ) : (
                <AlertCircle className="text-red-400" size={32} />
              )}
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {session.success ? '测试通过！' : '测试失败'}
                </h2>
                <p className="text-slate-300">{level?.name}</p>
              </div>
            </div>
            <button
              onClick={() => setShowResultPanel(false)}
              className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>
          
          {session.success && (
            <div className="flex justify-center gap-2 mt-4">
              {[0, 1, 2].map(i => (
                <Star
                  key={i}
                  size={40}
                  className={`transition-all duration-500 ${
                    i < stars
                      ? 'text-yellow-400 fill-yellow-400 scale-110'
                      : 'text-slate-600'
                  }`}
                  style={{ animationDelay: `${i * 200}ms` }}
                />
              ))}
            </div>
          )}
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {!session.success && session.failureMessage && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <h4 className="font-bold text-red-400 mb-1">失败原因</h4>
                  <p className="text-red-300/90 text-sm">{session.failureMessage}</p>
                  {session.failureMemberId && (
                    <p className="text-red-400/70 text-xs mt-2">
                      失败杆件ID: {session.failureMemberId}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-700/50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-cyan-400">{session.score || 0}</div>
              <div className="text-xs text-slate-400 mt-1">总得分</div>
            </div>
            <div className="bg-slate-700/50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-yellow-400">{session.totalCost}</div>
              <div className="text-xs text-slate-400 mt-1">总花费</div>
            </div>
            <div className="bg-slate-700/50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-orange-400">
                {session.maxStressRecorded.toFixed(1)}
              </div>
              <div className="text-xs text-slate-400 mt-1">最大应力</div>
            </div>
          </div>
          
          <div className="bg-slate-700/30 rounded-xl p-4 mb-6">
            <h3 className="font-bold text-white mb-3 flex items-center gap-2">
              <BarChart3 size={18} className="text-purple-400" />
              杆件受力统计
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {memberStats.map((stat, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-24 text-sm text-slate-300">{stat.material}</div>
                  <div className="flex-1 h-3 bg-slate-600 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        stat.ratio > 0.8 ? 'bg-red-500' : stat.ratio > 0.5 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(stat.ratio * 100, 100)}%` }}
                    />
                  </div>
                  <div className="w-24 text-right text-sm text-slate-400">
                    {stat.maxStress.toFixed(1)} / {stat.maxAllowed}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {session.warnings.length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
              <h4 className="font-bold text-yellow-400 mb-2">警告信息</h4>
              <div className="space-y-1">
                {session.warnings.map((w, i) => (
                  <div key={i} className="text-sm text-yellow-300/80">• {w}</div>
                ))}
              </div>
            </div>
          )}
          
          <div className="bg-slate-700/30 rounded-xl p-4 mb-6">
            <h4 className="font-bold text-white mb-2">测试详情</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-slate-400">风载等级:</div>
              <div className="text-slate-200">{session.windSetting}</div>
              <div className="text-slate-400">节点数量:</div>
              <div className="text-slate-200">{session.nodes.length}</div>
              <div className="text-slate-400">杆件数量:</div>
              <div className="text-slate-200">{session.members.length}</div>
              <div className="text-slate-400">用时:</div>
              <div className="text-slate-200">
                {session.endTime ? ((session.endTime - session.startTime) / 1000).toFixed(1) + 's' : '-'}
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t border-slate-700 flex gap-3">
          <button
            onClick={handleRetry}
            className="flex-1 py-3 rounded-xl font-bold bg-slate-700 hover:bg-slate-600 text-white transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw size={18} />
            重新搭建
          </button>
          <button
            onClick={handleReplay}
            className="flex-1 py-3 rounded-xl font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-all flex items-center justify-center gap-2"
          >
            <Play size={18} />
            查看回放
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('csv')}
              className="p-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white transition-all"
              title="导出CSV"
            >
              <Download size={18} />
            </button>
            <button
              onClick={() => handleExport('json')}
              className="p-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white transition-all"
              title="导出JSON"
            >
              <Download size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
