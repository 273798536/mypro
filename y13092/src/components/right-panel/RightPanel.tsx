import { useAppStore } from '@/store/useAppStore';
import {
  AlertTriangle,
  History,
  Camera,
  FileText,
  Plus,
  Undo2,
  Check,
  X,
  Calculator,
  Globe2,
  Ruler,
  User as UserIcon,
  Calendar,
} from 'lucide-react';
import CollisionPanel from '@/components/collision-panel/CollisionPanel';
import HistoryPanel from '@/components/history-panel/HistoryPanel';
import ViewSnapshots from '@/components/view-snapshots/ViewSnapshots';
import ReportPanel from '@/components/report-panel/ReportPanel';
import MaterialImportPanel from '@/components/material-import/MaterialImportPanel';
import { useState } from 'react';

const tabs = [
  { id: 'collisions' as const, label: '异常', Icon: AlertTriangle },
  { id: 'history' as const, label: '历史', Icon: History },
  { id: 'snapshots' as const, label: '快照', Icon: Camera },
  { id: 'report' as const, label: '报告', Icon: FileText },
];

export default function RightPanel() {
  const {
    activePanel,
    setActivePanel,
    addRevokeRecord,
    clearLastError,
    lastError,
    session,
  } = useAppStore();

  const { collisions } = useAppStore();
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [selectedCollisionForRevoke, setSelectedCollisionForRevoke] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);

  const activeCollisions = collisions.filter(
    (c) => !c.isRevoked && c.status !== 'revoked',
  );

  const handleQuickRevoke = () => {
    if (activeCollisions.length > 0) {
      const target = activeCollisions[activeCollisions.length - 1];
      setSelectedCollisionForRevoke(target.id);
      setRevokeReason(
        '现场调度阿宁复核后撤回：坐标系不一致，计算口径存疑，需重新现场确认',
      );
      setModalError(null);
      setShowRevokeModal(true);
    }
  };

  const confirmRevoke = () => {
    setModalError(null);
    if (!selectedCollisionForRevoke) {
      setModalError('请选择要撤回的碰撞记录');
      return;
    }
    if (!revokeReason.trim()) {
      setModalError('请填写撤回原因（用于报告追溯）');
      return;
    }

    const result = addRevokeRecord(
      selectedCollisionForRevoke,
      revokeReason.trim(),
      session.operator,
    );

    if (!result.success) {
      setModalError(result.error ?? '撤回失败');
      return;
    }

    setShowRevokeModal(false);
    setRevokeReason('');
    setSelectedCollisionForRevoke('');
    setActivePanel('history');
  };

  const closeRevokeModal = () => {
    setShowRevokeModal(false);
    setModalError(null);
  };

  const selectedCollision = collisions.find(
    (c) => c.id === selectedCollisionForRevoke,
  );

  return (
    <div className="h-full flex flex-col bg-slate-800/50 rounded-lg border border-slate-700">
      <div className="flex border-b border-slate-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              clearLastError();
              setActivePanel(tab.id);
            }}
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

      {lastError && (
        <div className="mx-3 mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded flex items-start gap-1.5">
          <X
            size={12}
            className="text-red-400 mt-0.5 flex-shrink-0 cursor-pointer"
            onClick={clearLastError}
          />
          <p className="text-xs text-red-400">{lastError}</p>
        </div>
      )}

      {activePanel === 'collisions' && (
        <div className="flex-1 p-3 overflow-hidden flex flex-col gap-3">
          <MaterialImportPanel compact={false} />

          <div className="p-2 bg-orange-500/10 border border-orange-500/30 rounded">
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
            <p className="mt-1.5 text-[10px] text-orange-400/60">
              撤回会保留碰撞点撤回前完整状态快照，刷新不丢失
            </p>
          </div>

          <div className="flex-1 min-h-0">
            <CollisionPanel />
          </div>
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
          <div className="bg-slate-800 rounded-lg border border-slate-600 w-[420px] p-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-medium text-slate-200 mb-3 flex items-center gap-2">
              <Undo2 size={16} className="text-red-400" />
              撤回碰撞判断
            </h3>

            {selectedCollision && selectedCollision.calcBasisDetail && (
              <div className="mb-3 p-2.5 bg-slate-900/60 border border-slate-700 rounded text-xs space-y-1.5">
                <p className="text-slate-400 font-medium mb-1">当前计算口径（撤回后仍可回溯）</p>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Globe2 size={12} className="text-blue-400" />
                  <span>坐标系：</span>
                  <code className="text-blue-300">
                    {selectedCollision.calcBasisDetail.coordinateSystems.join(' / ')}
                  </code>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Calculator size={12} className="text-yellow-400" />
                  <span>转换方法：</span>
                  <span className="text-slate-400">
                    {selectedCollision.calcBasisDetail.transformMethod ?? '未记录'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Ruler size={12} className="text-green-400" />
                  <span>净空：</span>
                  <span className="text-slate-400">
                    实测 {selectedCollision.calcBasisDetail.clearanceValue ?? 'N/A'}m /
                    标准 {selectedCollision.calcBasisDetail.clearanceStandard ?? 'N/A'}m
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <UserIcon size={12} className="text-purple-400" />
                  <span>复核人：</span>
                  <span className="text-slate-400">
                    {selectedCollision.calcBasisDetail.checkedBy}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Calendar size={12} className="text-cyan-400" />
                  <span>时间：</span>
                  <span className="text-slate-400">
                    {selectedCollision.calcBasisDetail.checkTime}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">碰撞记录</label>
                <select
                  value={selectedCollisionForRevoke}
                  onChange={(e) => setSelectedCollisionForRevoke(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="" disabled>
                    请选择要撤回的碰撞记录
                  </option>
                  {activeCollisions.map((c) => (
                    <option key={c.id} value={c.id}>
                      [{c.severity}] {c.id} - {c.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  撤回原因（必填，写入报告追溯链路）
                </label>
                <textarea
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                  placeholder="说明撤回依据，例如坐标系不一致、现场复核有误、数据来源变更等..."
                />
              </div>

              {modalError && (
                <div className="p-2 bg-red-500/10 border border-red-500/30 rounded flex items-start gap-1.5">
                  <X size={12} className="text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-400">{modalError}</p>
                </div>
              )}

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">操作人：{session.operator}（现场调度）</span>
                <span className="flex items-center gap-1 text-green-400">
                  <Check size={12} />
                  将生成快照 + 写入历史 + 持久化保存
                </span>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={closeRevokeModal}
                className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmRevoke}
                className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded transition-colors"
              >
                确认撤回（保留快照）
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
