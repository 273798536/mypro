import { useStore } from '../../store/useStore';
import { X, AlertTriangle, FileText, Clock, CheckCircle2, User, Tag } from 'lucide-react';
import { BerthStatus } from '../../types';

const statusLabels: Record<BerthStatus, string> = {
  available: '空闲',
  occupied: '已靠泊',
  maintenance: '维护中',
};

const statusColorMap: Record<BerthStatus, string> = {
  available: 'bg-port-success/20 text-port-success border-port-success/50',
  occupied: 'bg-port-deep/30 text-blue-300 border-port-deep/50',
  maintenance: 'bg-port-warning/20 text-port-warning border-port-warning/50',
};

const errorTypeLabels: Record<string, { label: string; desc: string }> = {
  coordinate_flip: { label: '坐标翻转', desc: 'X/Y坐标方向可能对调' },
  scale_mismatch: { label: '比例尺错用', desc: '参考图比例尺与实际不符' },
  missing_unit: { label: '漏填单位', desc: '关键字段单位缺失' },
};

export default function PropertyPanel() {
  const {
    canvas, berths, materials, operations, selectBerth,
    updateBerthStatus, updateBerth,
  } = useStore();

  const selectedBerth = berths.find((b) => b.id === canvas.selectedId);
  const relatedMaterials = selectedBerth
    ? materials.filter((m) => selectedBerth.materialIds.includes(m.id))
    : [];
  const relatedOps = selectedBerth
    ? operations.filter((o) => o.berthId === selectedBerth.id).slice(0, 5)
    : [];

  if (!selectedBerth) {
    return (
      <div className="w-80 bg-port-panel border-l border-port-border p-6 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-port-border/50 flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-slate-500" />
        </div>
        <h3 className="text-base font-medium text-slate-300 mb-2">未选中泊位</h3>
        <p className="text-sm text-slate-500 leading-relaxed">
          点击画布上的泊位卡片查看详细属性、关联材料和操作历史。
          <br /><br />
          <span className="text-xs">
            提示：按住 Alt + 拖拽 可平移画布<br />
            鼠标滚轮 可缩放视图
          </span>
        </p>
      </div>
    );
  }

  const b = selectedBerth;

  return (
    <div className="w-80 bg-port-panel border-l border-port-border flex flex-col overflow-hidden">
      <div className="p-4 border-b border-port-border flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white">{b.name}</h3>
          <p className="text-xs text-slate-500">ID: {b.id}</p>
        </div>
        <button
          onClick={() => selectBerth(null)}
          className="p-1.5 rounded-md hover:bg-port-border text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {b.hasError && b.errorType && errorTypeLabels[b.errorType] && (
          <div className="panel p-3 border-port-danger/50 bg-port-danger/10">
            <div className="flex items-center gap-2 mb-1.5">
              <AlertTriangle className="w-4 h-4 text-port-danger" />
              <span className="text-sm font-medium text-port-danger">
                {errorTypeLabels[b.errorType].label}
              </span>
            </div>
            <p className="text-xs text-slate-400">{errorTypeLabels[b.errorType].desc}</p>
          </div>
        )}

        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">状态</p>
          <div className="flex gap-2">
            {(Object.keys(statusLabels) as BerthStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => updateBerthStatus(b.id, s)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                  b.status === s
                    ? statusColorMap[s]
                    : 'bg-port-bg border-port-border text-slate-400 hover:text-white'
                }`}
              >
                {statusLabels[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">X 坐标</p>
            <input
              type="number"
              value={b.x}
              onChange={(e) => updateBerth(b.id, { x: Number(e.target.value) })}
              className="input-field w-full text-sm font-mono"
            />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Y 坐标</p>
            <input
              type="number"
              value={b.y}
              onChange={(e) => updateBerth(b.id, { y: Number(e.target.value) })}
              className="input-field w-full text-sm font-mono"
            />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">宽度</p>
            <input
              type="number"
              value={b.width}
              onChange={(e) => updateBerth(b.id, { width: Number(e.target.value) })}
              className="input-field w-full text-sm font-mono"
            />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">高度</p>
            <input
              type="number"
              value={b.height}
              onChange={(e) => updateBerth(b.id, { height: Number(e.target.value) })}
              className="input-field w-full text-sm font-mono"
            />
          </div>
        </div>

        {b.shipName && (
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">靠泊船舶</p>
            <div className="panel p-3 space-y-2">
              <p className="text-sm text-white font-medium">⛴ {b.shipName}</p>
              {b.cargoType && (
                <p className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Tag className="w-3 h-3" /> 货类: {b.cargoType}
                </p>
              )}
              {b.eta && (
                <p className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> 到港: {new Date(b.eta).toLocaleString('zh-CN')}
                </p>
              )}
              {b.etd && (
                <p className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> 离港: {new Date(b.etd).toLocaleString('zh-CN')}
                </p>
              )}
            </div>
          </div>
        )}

        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
            关联材料 ({relatedMaterials.length})
          </p>
          <div className="space-y-2">
            {relatedMaterials.length === 0 && (
              <p className="text-xs text-slate-500 italic">暂未关联材料</p>
            )}
            {relatedMaterials.map((m) => (
              <div key={m.id} className="panel p-2.5 hover:bg-port-border/30 transition-colors cursor-pointer">
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate">{m.title}</p>
                    <p className="text-[10px] text-slate-500">
                      {m.type === 'screenshot' ? '截图' : m.type === 'draft' ? '草稿' : '意见'}
                      {' · '}{m.tags.slice(0, 2).join(' / ')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
            最近操作
          </p>
          <div className="space-y-2">
            {relatedOps.length === 0 && (
              <p className="text-xs text-slate-500 italic">暂无操作记录</p>
            )}
            {relatedOps.map((op) => (
              <div key={op.id} className="panel p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium text-slate-200">{op.description}</p>
                  {op.isConfirmed ? (
                    <CheckCircle2 className="w-3 h-3 text-port-success" title="已确认" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-port-warning" title="待确认" />
                  )}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />{op.operator}
                  </span>
                  <span>{new Date(op.timestamp).toLocaleString('zh-CN')}</span>
                </div>
                {op.isSupplementary && (
                  <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-port-warning/20 text-port-warning">
                    补录
                  </span>
                )}
                {op.isError && (
                  <span className="inline-block mt-1 ml-1 text-[10px] px-1.5 py-0.5 rounded bg-port-danger/20 text-port-danger">
                    含错误
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {b.remark && (
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">备注</p>
            <textarea
              value={b.remark}
              onChange={(e) => updateBerth(b.id, { remark: e.target.value })}
              className="input-field w-full text-xs resize-none h-20"
            />
          </div>
        )}
      </div>
    </div>
  );
}
