import { useState } from 'react';
import {
  History as HistoryIcon,
  ChevronRight,
  User,
  Clock,
  FileText,
  CheckCircle2,
  Archive,
  Plus,
} from 'lucide-react';
import { useAuditStore } from '@/store/useAuditStore';
import { api, STATUS_LABEL, formatDate } from '@/utils/api';

export default function History() {
  const { logs, rounds, currentRoundId, setCurrentRound, loadRounds, loadAllForRound } = useAuditStore();
  const [creating, setCreating] = useState(false);
  const [newRoundName, setNewRoundName] = useState('');

  const handleCreateRound = async () => {
    if (!newRoundName.trim()) {
      alert('请输入轮次名称');
      return;
    }
    setCreating(true);
    try {
      await api.createRound(newRoundName);
      setNewRoundName('');
      await loadRounds();
    } catch (e) {
      alert(String(e));
    } finally {
      setCreating(false);
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm('确认归档此审计轮次？归档后无法新增记录。')) return;
    try {
      await api.archiveRound(id);
      await loadRounds();
    } catch (e) {
      alert(String(e));
    }
  };

  const handleSwitchRound = async (id: string) => {
    await setCurrentRound(id);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">历史记录追溯</h1>
        <p className="muted text-sm mt-1">
          重启服务后仍可查到每一轮处理痕迹，状态流转日志完整记录操作人、时间和备注
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="card xl:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <div className="section-title">审计轮次</div>
            <button
              onClick={() => setCreating((v) => !v)}
              className="btn-ghost text-xs"
            >
              <Plus className="w-3.5 h-3.5" /> 新建
            </button>
          </div>

          {creating && (
            <div className="mb-3 p-3 bg-navy-50 border border-navy-200 rounded-lg space-y-2 animate-slide-up">
              <input
                value={newRoundName}
                onChange={(e) => setNewRoundName(e.target.value)}
                placeholder="如 2026年Q3审计轮次"
                className="w-full px-3 py-2 text-sm rounded-md border border-slatex-200 focus:outline-none focus:border-navy-400 focus:ring-1 focus:ring-navy-400"
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setCreating(false)} className="btn-secondary text-xs">
                  取消
                </button>
                <button onClick={handleCreateRound} className="btn-primary text-xs">
                  创建
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {rounds.map((r) => (
              <div
                key={r.id}
                className={`p-3 rounded-lg border transition cursor-pointer ${
                  r.id === currentRoundId
                    ? 'bg-navy-600 text-white border-navy-500 shadow'
                    : 'bg-slatex-50 border-slatex-100 hover:bg-slatex-100'
                }`}
                onClick={() => handleSwitchRound(r.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium text-sm ${r.id === currentRoundId ? 'text-white' : 'text-navy-800'}`}>
                      {r.name}
                    </div>
                    <div className={`text-[11px] mt-0.5 ${r.id === currentRoundId ? 'text-navy-200' : 'muted'}`}>
                      {formatDate(r.startedAt)} · {r.operator}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-[11px] px-1.5 py-0.5 rounded ${
                        r.status === 'active'
                          ? r.id === currentRoundId
                            ? 'bg-amber text-navy-800'
                            : 'bg-amber-soft text-amber-700'
                          : r.id === currentRoundId
                          ? 'bg-navy-400 text-white'
                          : 'bg-navy-100 text-navy-700'
                      }`}
                    >
                      {STATUS_LABEL[r.status]}
                    </span>
                    {r.status === 'active' && r.id !== currentRoundId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArchive(r.id);
                        }}
                        className="p-1 hover:bg-white/20 rounded"
                        title="归档"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {rounds.length === 0 && (
              <div className="text-center py-6 muted text-sm">暂无轮次</div>
            )}
          </div>
        </div>

        <div className="card xl:col-span-2">
          <div className="section-title mb-3 flex items-center gap-2">
            <HistoryIcon className="w-4 h-4 text-navy-600" />
            操作日志时间线
          </div>

          <div className="relative pl-5 space-y-4 max-h-[640px] overflow-y-auto scroll-thin pr-2">
            <div className="absolute left-1.5 top-1 bottom-1 w-px bg-slatex-200" />
            {logs.map((log, idx) => (
              <div key={log.id} className="relative animate-slide-up" style={{ animationDelay: `${idx * 30}ms` }}>
                <div className={`absolute -left-5 top-1 w-3 h-3 rounded-full border-2 bg-white ${
                  log.toStatus === 'confirmed' ? 'border-jade' :
                  log.toStatus === 'resolved' ? 'border-navy-600' :
                  log.toStatus === 'reviewing' ? 'border-blue-500' :
                  'border-amber'
                }`} />
                <div className="bg-slatex-50 rounded-lg p-3 border border-slatex-100 hover:bg-white hover:shadow-card transition">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slatex-500" />
                      <span className="text-sm font-medium text-navy-800">{log.operator}</span>
                      <span className="text-[11px] text-slatex-400 mono">
                        {log.entityType === 'record' ? '备份记录' : '异常'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] muted mono">
                      <Clock className="w-3 h-3" />
                      {formatDate(log.timestamp)}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className={`badge-${log.fromStatus}`}>{STATUS_LABEL[log.fromStatus]}</span>
                    <ChevronRight className="w-3 h-3 text-slatex-400" />
                    <span className={`badge-${log.toStatus}`}>{STATUS_LABEL[log.toStatus]}</span>
                  </div>
                  {log.remark && (
                    <div className="mt-2 text-sm text-slatex-700 leading-relaxed flex items-start gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slatex-400 mt-0.5 shrink-0" />
                      <span>{log.remark}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="text-center py-12 muted">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                当前轮次暂无操作记录
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
