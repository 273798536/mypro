import { useAppStore } from '@/store/useAppStore';
import { AlertTriangle, AlertCircle, Info, CheckCircle, XCircle, ZoomIn } from 'lucide-react';

const severityConfig = {
  critical: {
    label: '严重',
    color: 'bg-red-500',
    textColor: 'text-red-400',
    borderColor: 'border-red-500/30',
    bgColor: 'bg-red-500/10',
    Icon: AlertTriangle,
  },
  warning: {
    label: '警告',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-400',
    borderColor: 'border-yellow-500/30',
    bgColor: 'bg-yellow-500/10',
    Icon: AlertCircle,
  },
  info: {
    label: '提示',
    color: 'bg-blue-500',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-500/30',
    bgColor: 'bg-blue-500/10',
    Icon: Info,
  },
};

const statusConfig = {
  pending: { label: '待复核', Icon: AlertCircle, color: 'text-slate-400' },
  confirmed: { label: '已确认', Icon: CheckCircle, color: 'text-green-400' },
  resolved: { label: '已解决', Icon: CheckCircle, color: 'text-blue-400' },
  revoked: { label: '已撤回', Icon: XCircle, color: 'text-slate-500' },
};

const typeLabels: Record<string, string> = {
  hard: '硬碰撞',
  soft: '软干涉',
  clearance: '净空检查',
};

export default function CollisionPanel() {
  const {
    collisions,
    selectedCollisionId,
    selectCollision,
    viewState,
    setViewState,
    layers,
  } = useAppStore();

  const activeCollisions = collisions.filter((c) => !c.isRevoked);
  const revokedCollisions = collisions.filter((c) => c.isRevoked);

  const handleLocate = (collision: typeof collisions[0]) => {
    selectCollision(collision.id);
    setViewState({
      centerX: collision.x,
      centerY: collision.y,
      scale: Math.min(2, viewState.scale),
    });
  };

  const getLayerName = (id: string) => layers.find((l) => l.id === id)?.name || id;

  const renderCollisionCard = (collision: typeof collisions[0], isRevoked: boolean) => {
    const config = severityConfig[collision.severity];
    const status = statusConfig[collision.status];
    const isSelected = selectedCollisionId === collision.id;

    if (isRevoked) {
      return (
        <div
          key={collision.id}
          className="p-3 rounded border border-slate-700/50 bg-slate-800/30 opacity-60"
        >
          <div className="flex items-start gap-2">
            <XCircle size={16} className="text-slate-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-500 line-through">{collision.description}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-600">{collision.id}</span>
                <span className="text-xs text-slate-600">已撤回</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        key={collision.id}
        className={`p-3 rounded border cursor-pointer transition-all ${
          isSelected
            ? `${config.borderColor} ${config.bgColor} ring-1 ring-offset-1 ring-offset-slate-900 ring-current`
            : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
        }`}
        onClick={() => selectCollision(isSelected ? null : collision.id)}
      >
        <div className="flex items-start gap-2">
          <config.Icon size={16} className={`${config.textColor} mt-0.5 flex-shrink-0`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${config.color}`} />
              <span className={`text-xs ${config.textColor} font-medium`}>
                {config.label}
              </span>
              <span className="text-xs text-slate-500">{typeLabels[collision.type]}</span>
            </div>
            <p className="text-sm text-slate-200 mt-1">{collision.description}</p>

            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1">
                <status.Icon size={12} className={status.color} />
                <span className={`text-xs ${status.color}`}>{status.label}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleLocate(collision);
                }}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                <ZoomIn size={12} />
                定位
              </button>
            </div>

            {isSelected && (
              <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-2">
                <div>
                  <p className="text-xs text-slate-500">关联图层</p>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {getLayerName(collision.layerA)} ↔ {getLayerName(collision.layerB)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">位置坐标</p>
                  <p className="text-xs text-slate-300 mt-0.5 font-mono">
                    ({collision.x.toFixed(1)}, {collision.y.toFixed(1)})
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">计算口径</p>
                  <p className="text-xs text-slate-300 mt-0.5">{collision.calcBasis}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-orange-400" />
          <span className="text-sm font-medium text-slate-200">碰撞异常</span>
          <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">
            {activeCollisions.length}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {activeCollisions.length > 0 && (
          <div>
            <p className="text-xs text-slate-500 mb-2">有效异常 ({activeCollisions.length})</p>
            <div className="space-y-2">
              {activeCollisions.map((c) => renderCollisionCard(c, false))}
            </div>
          </div>
        )}

        {revokedCollisions.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-slate-500 mb-2">
              已撤回 ({revokedCollisions.length})
            </p>
            <div className="space-y-2">
              {revokedCollisions.map((c) => renderCollisionCard(c, true))}
            </div>
          </div>
        )}

        {activeCollisions.length === 0 && revokedCollisions.length === 0 && (
          <div className="text-center py-8 text-slate-500 text-sm">
            暂无碰撞检测结果
          </div>
        )}
      </div>
    </div>
  );
}
