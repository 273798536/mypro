import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { WARNING_MESSAGES } from '../../game/config';
import { AlertTriangle, X, Check } from 'lucide-react';

const AlertModal: React.FC = () => {
  const { gameState, confirmPendingOperation, cancelPendingOperation } = useGameStore();
  const { pendingOperation } = gameState;

  if (!pendingOperation || !pendingOperation.warningType) return null;

  const warning = WARNING_MESSAGES[pendingOperation.warningType];
  const valve = gameState.nodes.find((n) => n.id === pendingOperation.valveId);

  const isDanger = warning.severity === 'danger';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div
        className={`w-full max-w-md industrial-panel p-6 ${isDanger ? 'border-red-500 glow-red' : 'border-yellow-500'}`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`p-3 rounded-full ${isDanger ? 'bg-red-900/50' : 'bg-yellow-900/50'}`}
          >
            <AlertTriangle
              size={32}
              className={isDanger ? 'text-red-400' : 'text-yellow-400'}
            />
          </div>
          <div className="flex-1">
            <h3
              className={`text-xl font-bold mb-2 ${isDanger ? 'text-red-400' : 'text-yellow-400'}`}
            >
              {warning.title}
            </h3>
            <p className="text-industrial-text mb-2">{warning.description}</p>
            {valve && (
              <div className="bg-industrial-bg/50 rounded-lg p-3 mb-4">
                <p className="text-sm text-industrial-muted">
                  目标阀门: <span className="text-industrial-text font-medium">{valve.name}</span>
                </p>
                <p className="text-sm text-industrial-muted">
                  操作类型: <span className={pendingOperation.newState ? 'text-green-400' : 'text-red-400'}>
                    {pendingOperation.newState ? '开启' : '关闭'}
                  </span>
                </p>
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelPendingOperation}
                className="industrial-btn-secondary flex items-center gap-2"
              >
                <X size={16} />
                取消
              </button>
              <button
                onClick={confirmPendingOperation}
                className={`flex items-center gap-2 ${isDanger ? 'industrial-btn-danger' : 'industrial-btn-primary'}`}
              >
                <Check size={16} />
                确认操作
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertModal;
