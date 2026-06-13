import { MapPin, Layers, Users, Mountain, ThumbsUp, ThumbsDown, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { PROCESSING_STATUS_LABEL, type ProcessingStatus } from '../types';

export default function OptionDetail() {
  const selectedId = useAppStore((s) => s.selectedOptionId);
  const options = useAppStore((s) => s.stationOptions);
  const setSelectedOption = useAppStore((s) => s.setSelectedOption);
  const getCommentsByOption = useAppStore((s) => s.getCommentsByOption);

  if (!selectedId) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-4 h-full flex items-center justify-center">
        <div className="text-center text-sm text-slate-400">
          <MapPin size={28} className="mx-auto mb-2 opacity-50" />
          <div>点击3D场景中的方案站位</div>
          <div className="text-xs mt-1">或从下方列表选择查看详情</div>
          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            {options.map((o) => (
              <button
                key={o.id}
                onClick={() => setSelectedOption(o.id)}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:border-primary-400 hover:text-primary-600 transition-colors"
                style={{ color: o.color, borderColor: o.color + '55' }}
              >
                {o.code}方案
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const opt = options.find((o) => o.id === selectedId);
  if (!opt) return null;

  const optComments = getCommentsByOption(selectedId);
  const statusCount: Record<string, number> = {};
  for (const c of optComments) statusCount[c.status] = (statusCount[c.status] || 0) + 1;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 h-full overflow-y-auto">
      <div className="flex items-start gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
          style={{ background: opt.color }}
        >
          {opt.code}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-base font-semibold text-slate-800">{opt.name}</div>
          <div className="text-xs text-slate-500 mt-0.5">{opt.description}</div>
        </div>
        <button
          onClick={() => setSelectedOption(null)}
          className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
        >
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
        <InfoCell icon={<Mountain size={12} />} label="海拔" value={`${opt.elevation} m`} />
        <InfoCell icon={<Layers size={12} />} label="楼层" value={opt.buildingFloors} />
        <InfoCell icon={<MapPin size={12} />} label="建筑面积" value={`${opt.floorArea} ㎡`} />
        <InfoCell icon={<Users size={12} />} label="设计容量" value={`${opt.capacity} 人/h`} />
      </div>

      <div className="mb-4">
        <div className="text-xs font-medium text-slate-600 mb-1.5">处理状态概览</div>
        <div className="flex gap-1.5 flex-wrap">
          {Object.entries(statusCount).length === 0 ? (
            <span className="text-xs text-slate-400">暂无批注</span>
          ) : (
            Object.entries(statusCount).map(([k, v]) => {
              const label =
                k in PROCESSING_STATUS_LABEL
                  ? PROCESSING_STATUS_LABEL[k as ProcessingStatus]
                  : k;
              return (
                <span
                  key={k}
                  className="px-2 py-0.5 rounded text-xs bg-slate-50 text-slate-600 border border-slate-200"
                >
                  {label}: {v}
                </span>
              );
            })
          )}
        </div>
      </div>

      <div className="mb-3">
        <div className="text-xs font-medium text-slate-600 mb-1.5 flex items-center gap-1">
          <ThumbsUp size={12} className="text-green-500" />
          优势
        </div>
        <ul className="space-y-1">
          {opt.advantages.map((a, i) => (
            <li
              key={i}
              className="text-xs text-slate-700 pl-3 border-l-2 border-green-300"
            >
              {a}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="text-xs font-medium text-slate-600 mb-1.5 flex items-center gap-1">
          <ThumbsDown size={12} className="text-red-400" />
          风险/劣势
        </div>
        <ul className="space-y-1">
          {opt.disadvantages.map((a, i) => (
            <li
              key={i}
              className="text-xs text-slate-700 pl-3 border-l-2 border-red-200"
            >
              {a}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function InfoCell({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="p-2 bg-slate-50 rounded">
      <div className="flex items-center gap-1 text-slate-500 mb-0.5">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-slate-800 font-medium">{value}</div>
    </div>
  );
}
