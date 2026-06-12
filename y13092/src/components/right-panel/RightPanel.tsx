import { useAppStore } from '@/store/useAppStore';
import { AlertTriangle, History, Camera, FileText, Plus, Undo2 } from 'lucide-react';
import CollisionPanel from '@/components/collision-panel/CollisionPanel';
import HistoryPanel from '@/components/history-panel/HistoryPanel';
import ViewSnapshots from '@/components/view-snapshots/ViewSnapshots';
import ReportPanel from '@/components/report-panel/ReportPanel';
import { useState } from 'react';

const tabs = [
  { id: 'collisions' as const, label: '异常', Icon: AlertTriangle },
  { id: 'history' as const, label: '历史', Icon: History },
  { id: 'snapshots' as const, label: '快照', Icon: Camera },
  { id: 'report' as const, label: '报告', Icon: FileText },
];

export default function RightPanel() {
  const { activePanel, setActivePanel, addRevokeRecord } = useAppStore();
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [selectedCollisionForRevoke, setSelectedCollisionForRevoke] = useState('');
  const { collisions } = useAppStore();

  const activeCollisions = collisions.filter((c) => !c.isRevoked && c.status !== 'revoked');

  const handleQuickRevoke = () => {
    if (activeCollisions.length > 0) {
      setSelectedCollisionForRevoke(activeCollisions[activeCollisions.length - 1].id);
      setRevokeReason('现场调度阿宁复核后撤回，坐标系不一致，需重新确认');
      setShowRevokeModal(true);
    }
  };

  const confirmRevoke = () => {
    if (selectedCollisionForRevoke && revokeReason.trim()) {
      addRevokeRecord(selectedCollisionForRevoke, revokeReason.trim(), '阿宁');
      setShowRevokeModal(false);
      setActivePanel('history');
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-800/50 rounded-lg border border-slate-700">
      <div className="flex border-b border-slate-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActivePanel(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs transition-colors relative ${
              activePanel === tab.id
                ? 'text-blue-400 bg-slate-700/50'
                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/30'
            }`}
          >
            <tab.Icon size={14} />
            {tab.label}
            {activePanel === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
            )}
          </button>
        ))}
      </div>

      {activePanel === 'collisions' && (
        <div className="flex-1 p-3 overflow-hidden flex flex-col">
          <div className="mb-3 p-2 bg-orange-500/10 border border-orange-500/30 rounded">
            <p className="text-xs text-orange-400 font-medium flex items-center gap-1">
              <Undo2 size={12} />
              模拟现场操作
            </p>
            <button
              onClick={handleQuickRevoke}
              className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 text-xs rounded transition-colors border border-orange-500/30"
            >
              <Plus size={12} />
              补一条撤回记录
            </button>
          </div>
          <CollisionPanel />
        </div>
      )}

      {activePanel === 'history' && (
        <div className="flex-1 p-3 overflow-hidden">
          <HistoryPanel />
        </div>
      )}

      {activePanel === 'snapshots' && (
        <div className="flex-1 p-3 overflow-hidden">
          <ViewSnapshots />
        </div>
      )}

      {activePanel === 'report' && (
        <div className="flex-1 p-3 overflow-hidden">
          <ReportPanel />
        </div>
      )}

      {showRevokeModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg border border-slate-600 w-96 p-5 shadow-xl">
            <h3 className="text-base font-medium text-slate-200 mb-3 flex items-center gap-2">
              <Undo2 size={16} className="text-red-400" />
              撤回碰撞判断
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">碰撞记录</label>
                <select
                  value={selectedCollisionForRevoke}
                  onChange={(e) => setSelectedCollisionForRevoke(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  {activeCollisions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id} - {c.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">撤回原因</label>
                <textarea
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                  placeholder="请输入撤回原因..."
                />
              </div>

              <div className="text-xs text-slate-500">
                操作人：阿宁（现场调度）
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowRevokeModal(false)}
                className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmRevoke}
                className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded transition-colors"
              >
                确认撤回
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
