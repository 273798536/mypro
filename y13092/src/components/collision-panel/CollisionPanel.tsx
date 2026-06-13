import { useAppStore } from '@/store/useAppStore';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
  ZoomIn,
  Globe2,
  Calculator,
  Ruler,
  User as UserIcon,
  Calendar,
  FileClock,
} from 'lucide-react';

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
      const snap = collision.snapshotBeforeRevoke;
      return (
        <div
          key={collision.id}
          className={`p-3 rounded border cursor-pointer transition-all ${
            isSelected
              ? 'border-slate-500 bg-slate-800/50'
              : 'border-slate-700/50 bg-slate-800/30 opacity-70 hover:opacity-100'
          }`}
          onClick={() => selectCollision(isSelected ? null : collision.id)}
        >
          <div className="flex items-start gap-2">
            <XCircle size={16} className="text-slate-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-400 line-through">
                {snap?.description ?? collision.description}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-600">{collision.id}</span>
                <span className="text-xs text-red-400/80">已撤回</span>
                {snap && (
                  <span className="text-xs text-slate-500">
                    {snap.snapshottedBy} @ {snap.snapshottedAt}
                  </span>
                )}
              </div>
            </div>
          </div>

          {isSelected && (
            <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-2">
              <div className="p-2 bg-red-500/5 border border-red-500/20 rounded">
                <p className="text-xs font-medium text-red-400 mb-1">撤回说明</p>
                <p className="text-xs text-slate-300">{collision.calcBasis}</p>
              </div>

              {snap && (
                <>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <FileClock size={11} />
                    撤回前状态快照（可追溯）
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1 text-slate-400">
                      <Globe2 size={11} className="text-blue-400" />
                      <span>坐标系:</span>
                      <code className="text-blue-300">
                        {snap.calcBasisDetail.coordinateSystems.join('/')}
                      </code>
                    </div>
                    <div className="flex items-center gap-1 text-slate-400">
                      <Calculator size={11} className="text-yellow-400" />
                      <span>算法:</span>
                      <span className="text-slate-300">
                        {snap.calcBasisDetail.transformMethod ?? '未记录'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-400">
                      <Ruler size={11} className="text-green-400" />
                      <span>净空:</span>
                      <span className="text-slate-300">
                        {snap.calcBasisDetail.clearanceValue ?? 'N/A'}/
                        {snap.calcBasisDetail.clearanceStandard ?? 'N/A'}m
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-400">
                      <UserIcon size={11} className="text-purple-400" />
                      <span>复核人:</span>
                      <span className="text-slate-300">
                        {snap.calcBasisDetail.checkedBy}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    撤回前状态: {snap.status} | 原计算口径: {snap.calcBasis}
                  </p>
                </>
              )}
            </div>
          )}
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
              <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
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
                </div>

                <div className="p-2 bg-slate-900/60 border border-slate-700 rounded space-y-1.5">
                  <p className="text-xs font-medium text-slate-300 flex items-center gap-1">
                    <Calculator size={11} className="text-yellow-400" />
                    计算口径详情
                  </p>
                  <p className="text-xs text-slate-400">{collision.calcBasis}</p>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-1">
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Globe2 size={11} className="text-blue-400" />
                      <span>坐标系:</span>
                      <code className="text-blue-300">
                        {collision.calcBasisDetail.coordinateSystems.join('/')}
                      </code>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Calculator size={11} className="text-yellow-400" />
                      <span>转换:</span>
                      <span className="text-slate-300">
                        {collision.calcBasisDetail.transformMethod ?? '未记录'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Ruler size={11} className="text-green-400" />
                      <span>净空:</span>
                      <span className="text-slate-300">
                        {collision.calcBasisDetail.clearanceValue ?? 'N/A'}/
                        {collision.calcBasisDetail.clearanceStandard ?? 'N/A'}m
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <UserIcon size={11} className="text-purple-400" />
                      <span>复核:</span>
                      <span className="text-slate-300">
                        {collision.calcBasisDetail.checkedBy}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-slate-500 pt-0.5">
                    <Calendar size={11} />
                    <span>检测时间: {collision.calcBasisDetail.checkTime}</span>
                  </div>

                  {collision.calcBasisDetail.notes && (
                    <p className="text-xs text-slate-500 italic pt-0.5">
                      备注: {collision.calcBasisDetail.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>
                    创建: {collision.createdAt} · {collision.createdBy}
                  </span>
                  <span className="font-mono">{collision.id}</span>
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
