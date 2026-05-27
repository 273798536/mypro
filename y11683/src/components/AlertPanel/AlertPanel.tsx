import { useStore } from '../../store/useStore';
import { AlertTriangle, X, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';

const TYPE_LABELS: Record<string, string> = {
  backwardation: '倒挂',
  month_gap: '月份缺口',
  volume_occlusion: '成交量遮挡',
  label_error: '标注错误',
  parse_error: '解析错误',
};

const TYPE_COLORS: Record<string, string> = {
  backwardation: 'text-red-400 bg-red-900/20 border-red-800/30',
  month_gap: 'text-yellow-400 bg-yellow-900/20 border-yellow-800/30',
  volume_occlusion: 'text-orange-400 bg-orange-900/20 border-orange-800/30',
  label_error: 'text-purple-400 bg-purple-900/20 border-purple-800/30',
  parse_error: 'text-red-500 bg-red-900/30 border-red-700/40',
};

export default function AlertPanel() {
  const { detections, resolveDetection, alertExpanded, toggleAlertExpanded, setSelectedDataId } = useStore();
  const unresolved = detections.filter((d) => !d.resolved);

  if (detections.length === 0) return null;

  const grouped = unresolved.reduce<Record<string, typeof detections>>((acc, d) => {
    if (!acc[d.type]) acc[d.type] = [];
    acc[d.type].push(d);
    return acc;
  }, {});

  return (
    <div className="absolute bottom-16 right-4 w-80 bg-slate-900/95 backdrop-blur rounded-lg border border-slate-700/50 shadow-2xl z-20 overflow-hidden">
      <div
        className="flex items-center justify-between px-3 py-2 border-b border-slate-700/50 cursor-pointer hover:bg-slate-800/30"
        onClick={toggleAlertExpanded}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-yellow-400" />
          <span className="text-sm font-medium text-slate-300">异常提示</span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-900/30 text-yellow-400">
            {unresolved.length}
          </span>
        </div>
        {alertExpanded ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronUp size={14} className="text-slate-500" />}
      </div>

      {alertExpanded && unresolved.length > 0 && (
        <div className="max-h-64 overflow-y-auto custom-scrollbar">
          {Object.entries(grouped).map(([type, items]) => (
            <div key={type} className="border-b border-slate-700/30 last:border-0">
              <div className="px-3 py-1.5 text-xs text-slate-500 bg-slate-800/30">
                {TYPE_LABELS[type] || type} ({items.length})
              </div>
              {items.map((d) => (
                <div
                  key={d.id}
                  className={`px-3 py-2 border-l-2 ${
                    d.severity === 'error'
                      ? 'border-red-500'
                      : 'border-yellow-500'
                  } hover:bg-slate-800/30 cursor-pointer transition-colors`}
                  onClick={() => {
                    if (d.relatedDataIds.length > 0) {
                      setSelectedDataId(d.relatedDataIds[0]);
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded border ${TYPE_COLORS[d.type] || ''}`}
                    >
                      {TYPE_LABELS[d.type] || d.type}
                    </span>
                    <span className="text-xs text-slate-500">行{d.originalRow}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {d.description}
                  </p>
                  <button
                    className="mt-1.5 text-xs text-slate-500 hover:text-green-400 flex items-center gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      resolveDetection(d.id);
                    }}
                  >
                    <CheckCircle2 size={10} />
                    标记已解决
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {unresolved.length === 0 && (
        <div className="px-3 py-4 text-center text-sm text-green-400">
          所有异常已解决
        </div>
      )}
    </div>
  );
}