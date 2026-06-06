import { useStore } from '../../store/useStore';
import { Operation } from '../../types';
import {
  ArrowRight, AlertTriangle, CheckCircle2, Clock, FileText, User,
  ArrowDown, ArrowUp, Minus,
} from 'lucide-react';

function formatValue(v: any): string {
  if (v === null || v === undefined) return '-';
  if (typeof v === 'object') return JSON.stringify(v);
  if (typeof v === 'boolean') return v ? '是' : '否';
  return String(v);
}

function diffStates(before: any, after: any): { key: string; oldValue: any; newValue: any; type: 'add' | 'remove' | 'change' }[] {
  if (!before && !after) return [];
  const b = before || {};
  const a = after || {};
  const allKeys = new Set([...Object.keys(b), ...Object.keys(a)]);
  const diffs: any[] = [];
  allKeys.forEach((k) => {
    if (JSON.stringify(b[k]) !== JSON.stringify(a[k])) {
      let type: 'add' | 'remove' | 'change' = 'change';
      if (b[k] === undefined) type = 'add';
      else if (a[k] === undefined) type = 'remove';
      diffs.push({ key: k, oldValue: b[k], newValue: a[k], type });
    }
  });
  return diffs;
}

const fieldLabels: Record<string, string> = {
  x: 'X 坐标',
  y: 'Y 坐标',
  width: '宽度',
  height: '高度',
  zoom: '缩放比例',
  panX: '水平平移',
  panY: '垂直平移',
  status: '状态',
  annotations: '标注数量',
  isCoordinateFlipped: '坐标翻转',
};

export default function DiffViewer({ operation }: { operation: Operation | null }) {
  const { errors, materials, berths, confirmOperation, currentUser } = useStore();

  if (!operation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
        <div className="w-20 h-20 rounded-full bg-port-border/30 flex items-center justify-center mb-4">
          <ArrowRight className="w-10 h-10 text-slate-600" />
        </div>
        <h3 className="text-base font-medium text-slate-300 mb-2">选择一条操作记录</h3>
        <p className="text-sm text-slate-500 max-w-sm">
          在左侧时间线点击任意操作，可查看操作前后的状态差异、关联材料和错误详情
        </p>
      </div>
    );
  }

  const diffs = diffStates(operation.beforeState, operation.afterState);
  const relatedError = errors.find((e) => e.operationId === operation.id);
  const relatedMaterial = operation.materialId ? materials.find((m) => m.id === operation.materialId) : null;
  const relatedBerth = operation.berthId ? berths.find((b) => b.id === operation.berthId) : null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-5 py-4 border-b border-port-border space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white">{operation.description}</h3>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400 flex-wrap">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />{operation.operator}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(operation.timestamp).toLocaleString('zh-CN')}
              </span>
              {operation.isSupplementary && (
                <span className="px-2 py-0.5 rounded bg-port-warning/20 text-port-warning text-[10px] font-medium">
                  补录操作
                </span>
              )}
            </div>
          </div>

          {!operation.isConfirmed && (
            <button
              onClick={() => confirmOperation(operation.id)}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              人工确认
            </button>
          )}
          {operation.isConfirmed && operation.confirmedBy && (
            <div className="text-right">
              <p className="text-xs text-port-success flex items-center gap-1 justify-end">
                <CheckCircle2 className="w-3.5 h-3.5" /> 已确认
              </p>
              <p className="text-[10px] text-slate-500">
                {operation.confirmedBy} · {operation.confirmedAt && new Date(operation.confirmedAt).toLocaleString('zh-CN')}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {relatedError && (
          <div className="panel p-4 border-port-danger/50 bg-port-danger/10">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-port-danger" />
              <h4 className="text-sm font-bold text-port-danger">错误记录：{relatedError.errorType}</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-xs text-slate-400 mb-1">错误原因</p>
                <p className="text-slate-200">{relatedError.errorReason}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">错误位置</p>
                <p className="text-slate-300 font-mono text-xs">
                  坐标 ({relatedError.errorPosition.x}, {relatedError.errorPosition.y})
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">修正建议</p>
                <p className="text-port-success">{relatedError.suggestion}</p>
              </div>
              {relatedMaterial && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">问题来源材料</p>
                  <div className="flex items-center gap-2 p-2 rounded bg-port-bg border border-port-border">
                    <img src={relatedMaterial.imageUrl} className="w-12 h-9 object-cover rounded" />
                    <div>
                      <p className="text-xs font-medium text-slate-200">{relatedMaterial.title}</p>
                      <p className="text-[10px] text-slate-500">学生可从此材料定位比例尺错用原因</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div>
          <h4 className="text-sm font-semibold text-white mb-3">状态差异对比</h4>

          {diffs.length === 0 && (
            <p className="text-sm text-slate-500 italic p-4 panel">无字段级差异（可能为视图操作）</p>
          )}

          <div className="space-y-2">
            {diffs.map((d) => {
              const Icon = d.type === 'add' ? ArrowDown : d.type === 'remove' ? ArrowUp : Minus;
              const colorClass = d.type === 'add' ? 'diff-add' : d.type === 'remove' ? 'diff-remove' : '';
              return (
                <div key={d.key} className={`panel p-3 ${colorClass}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-4 h-4 ${
                      d.type === 'add' ? 'text-port-success' : d.type === 'remove' ? 'text-port-danger' : 'text-slate-400'
                    }`} />
                    <span className="text-sm font-medium text-white">
                      {fieldLabels[d.key] || d.key}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-port-bg text-slate-400 uppercase ml-auto">
                      {d.type === 'add' ? '新增' : d.type === 'remove' ? '删除' : '变更'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-slate-500 mb-1">变更前</p>
                      <p className="font-mono text-slate-300 p-2 rounded bg-port-bg border border-port-border">
                        {formatValue(d.oldValue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">变更后</p>
                      <p className="font-mono text-white p-2 rounded bg-port-deep/20 border border-port-deep/50">
                        {formatValue(d.newValue)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {operation.comment && (
          <div>
            <h4 className="text-sm font-semibold text-white mb-2">操作备注</h4>
            <p className="text-sm text-slate-300 p-3 panel">{operation.comment}</p>
          </div>
        )}

        {relatedBerth && (
          <div>
            <h4 className="text-sm font-semibold text-white mb-2">关联泊位</h4>
            <div className={`panel p-3 ${relatedBerth.hasError ? 'border-port-danger/50' : ''}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{relatedBerth.name}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    位置 ({relatedBerth.x}, {relatedBerth.y}) · 尺寸 {relatedBerth.width}×{relatedBerth.height}
                  </p>
                </div>
                {relatedBerth.hasError && (
                  <span className="px-2 py-1 rounded text-xs bg-port-danger/20 text-port-danger border border-port-danger/50">
                    含错误
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {relatedMaterial && (
          <div>
            <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-1.5">
              <FileText className="w-4 h-4" /> 关联材料溯源
            </h4>
            <div className="panel p-3">
              <div className="flex gap-3">
                <img src={relatedMaterial.imageUrl} className="w-28 h-20 object-cover rounded-lg flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{relatedMaterial.title}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-port-bg text-slate-400">
                      {relatedMaterial.type === 'screenshot' ? '截图' : relatedMaterial.type === 'draft' ? '草稿' : '意见'}
                    </span>
                    {relatedMaterial.tags.map((t) => (
                      <span key={t} className="text-[10px] text-slate-500">#{t}</span>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    {relatedMaterial.annotations.length} 个标注 · {relatedMaterial.comments.length} 条意见
                  </p>
                  {relatedMaterial.source && (
                    <p className="text-[10px] text-slate-600 mt-1">来源: {relatedMaterial.source}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
