import { useStore } from '../../store/useStore';
import { Operation } from '../../types';
import {
  Move, Maximize2, MoveDiagonal, ZoomIn, Pencil, Plus, Trash2, RefreshCw,
  AlertTriangle, CheckCircle2, Clock, User, FileText, Filter, Search,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

const opIcons: Record<string, any> = {
  move: Move,
  resize: Maximize2,
  pan: MoveDiagonal,
  zoom: ZoomIn,
  annotate: Pencil,
  create: Plus,
  delete: Trash2,
  status_change: RefreshCw,
};

const opLabels: Record<string, string> = {
  move: '移动',
  resize: '调整尺寸',
  pan: '平移画布',
  zoom: '缩放画布',
  annotate: '标注',
  create: '创建',
  delete: '删除',
  status_change: '状态变更',
};

export default function Timeline({ onSelect }: { onSelect: (op: Operation) => void }) {
  const { operations, selectedOperationId, selectOperation, errors, materials, berths } = useStore();
  const [filterError, setFilterError] = useState(false);
  const [filterUnconfirmed, setFilterUnconfirmed] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = operations.filter((op) => {
    if (filterError && !op.isError) return false;
    if (filterUnconfirmed && op.isConfirmed) return false;
    if (search && !op.description.includes(search) && !op.operator.includes(search)) return false;
    return true;
  });

  const groupedByDate: Record<string, Operation[]> = {};
  filtered.forEach((op) => {
    const date = new Date(op.timestamp).toLocaleDateString('zh-CN');
    if (!groupedByDate[date]) groupedByDate[date] = [];
    groupedByDate[date].push(op);
  });

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-port-border space-y-3">
        <div>
          <h2 className="text-lg font-bold text-white">操作历史</h2>
          <p className="text-xs text-slate-400 mt-0.5">所有操作自动记录，支持追溯和撤销重做</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索操作..."
              className="input-field pl-9 w-full text-xs"
            />
          </div>
          <button
            onClick={() => setFilterError(!filterError)}
            className={`px-2.5 py-1.5 rounded text-xs font-medium flex items-center gap-1 transition-all ${
              filterError
                ? 'bg-port-danger/20 text-port-danger border border-port-danger/50'
                : 'bg-port-bg text-slate-400 hover:text-white border border-port-border'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            错误 {errors.length}
          </button>
          <button
            onClick={() => setFilterUnconfirmed(!filterUnconfirmed)}
            className={`px-2.5 py-1.5 rounded text-xs font-medium flex items-center gap-1 transition-all ${
              filterUnconfirmed
                ? 'bg-port-warning/20 text-port-warning border border-port-warning/50'
                : 'bg-port-bg text-slate-400 hover:text-white border border-port-border'
            }`}
          >
            <Clock className="w-3 h-3" />
            待确认
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {Object.entries(groupedByDate).length === 0 && (
          <div className="text-center py-20 text-slate-500 text-sm">
            <Filter className="w-10 h-10 mx-auto mb-3 opacity-50" />
            没有匹配的操作记录
          </div>
        )}

        {Object.entries(groupedByDate).map(([date, ops]) => (
          <div key={date} className="mb-6">
            <div className="sticky top-0 bg-port-bg/95 backdrop-blur-sm py-2 mb-2 -mx-5 px-5 z-10">
              <p className="text-xs font-semibold text-slate-400">{date}</p>
              <p className="text-[10px] text-slate-600">{ops.length} 条操作</p>
            </div>

            <div className="border-l-2 border-port-border pl-6 space-y-3 ml-1.5">
              {ops.map((op) => {
                const Icon = opIcons[op.type] || RefreshCw;
                const relatedError = errors.find((e) => e.operationId === op.id);
                const relatedMaterial = op.materialId ? materials.find((m) => m.id === op.materialId) : null;
                const relatedBerth = op.berthId ? berths.find((b) => b.id === op.berthId) : null;
                const isSelected = selectedOperationId === op.id;

                return (
                  <div
                    key={op.id}
                    onClick={() => { selectOperation(op.id); onSelect(op); }}
                    className={`timeline-dot ${op.isError ? 'timeline-dot-error' : ''} relative panel p-3 cursor-pointer transition-all ${
                      isSelected ? 'ring-2 ring-port-deep border-port-deep' : 'hover:border-port-deep/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        op.isError ? 'bg-port-danger/20 text-port-danger'
                          : op.type === 'zoom' || op.type === 'pan' ? 'bg-slate-700 text-slate-300'
                          : 'bg-port-deep/30 text-blue-300'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-white">{op.description}</p>
                          {op.isError && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-port-danger/20 text-port-danger border border-port-danger/50 flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" /> 错误
                            </span>
                          )}
                          {op.isSupplementary && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-port-warning/20 text-port-warning border border-port-warning/50">
                              补录
                            </span>
                          )}
                          {op.isConfirmed ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-port-success/20 text-port-success border border-port-success/50 flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" /> 已确认
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-600/50 text-slate-300 border border-slate-500/50">
                              待确认
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500 flex-wrap">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />{op.operator}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(op.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                          <span className="text-slate-600">·</span>
                          <span className="px-1.5 py-0.5 rounded bg-port-bg text-slate-400">{opLabels[op.type] || op.type}</span>
                          {relatedBerth && (
                            <span className={`px-1.5 py-0.5 rounded ${relatedBerth.hasError ? 'bg-port-danger/10 text-port-danger' : 'bg-port-bg text-slate-300'}`}>
                              {relatedBerth.name}
                            </span>
                          )}
                          {relatedMaterial && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-port-warning/10 text-port-warning">
                              <FileText className="w-2.5 h-2.5" />
                              {relatedMaterial.title.slice(0, 12)}...
                            </span>
                          )}
                        </div>

                        {relatedError && (
                          <div className="mt-2 text-xs p-2 rounded bg-port-danger/10 border border-port-danger/30 text-port-danger">
                            <p className="font-medium flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              {relatedError.errorType}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">{relatedError.errorReason}</p>
                          </div>
                        )}
                      </div>

                      <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-transform ${isSelected ? 'text-port-deep translate-x-0.5' : 'text-slate-600'}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
