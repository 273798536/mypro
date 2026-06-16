import { AlertTriangle, Clock, MessageCircle, Mail, Map as MapIcon, MoreHorizontal, FileWarning } from 'lucide-react';
import type { Material, SourceChannel } from '../types';
import { formatTime } from '../utils/time';

interface Props {
  materials: Material[];
  highlightedId?: string;
  onHighlight?: (id: string | undefined) => void;
}

const channelMeta: Record<SourceChannel, { label: string; Icon: typeof MessageCircle; cls: string }> = {
  wechat: { label: '微信', Icon: MessageCircle, cls: 'bg-green-50 text-green-700 border-green-200' },
  onsite: { label: '现场', Icon: MapIcon, cls: 'bg-engineering-50 text-engineering-700 border-engineering-200' },
  email: { label: '邮件', Icon: Mail, cls: 'bg-slateX-100 text-slateX-700 border-slateX-200' },
  other: { label: '其他', Icon: MoreHorizontal, cls: 'bg-slateX-100 text-slateX-500 border-slateX-200' },
};

export function MaterialGrid({ materials, highlightedId, onHighlight }: Props) {
  if (materials.length === 0) {
    return (
      <div className="text-center py-12 text-slateX-400 text-sm">
        <FileWarning size={28} className="mx-auto mb-2" />
        暂无材料
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {materials.map((m) => {
        const meta = channelMeta[m.sourceChannel];
        const Icon = meta.Icon;
        const highlighted = highlightedId === m.id;
        const overload = m.isCapacityOverload;
        const late = m.isLateArrival;

        return (
          <div
            key={m.id}
            onMouseEnter={() => onHighlight?.(m.id)}
            onMouseLeave={() => onHighlight?.(undefined)}
            className={`relative bg-white rounded-sm overflow-hidden border transition-all ${
              overload
                ? 'border-alert-500 border-dashed border-2'
                : highlighted
                ? 'border-engineering-600 ring-2 ring-engineering-100'
                : 'border-slateX-200 hover:border-slateX-300'
            }`}
          >
            {late && (
              <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-1.5 py-0.5 bg-alert-600 text-white text-[10px] rounded-sm shadow-sm">
                <Clock size={10} />
                晚到附件
              </div>
            )}
            {overload && !late && (
              <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-1.5 py-0.5 bg-alert-50 text-alert-700 text-[10px] border border-alert-500 rounded-sm">
                <AlertTriangle size={10} />
                容量超限
              </div>
            )}
            {m.isDirty && (
              <div className="absolute top-2 right-2 z-10 material-dirty-tag px-1.5 py-0.5 bg-slateX-800 text-slateX-100 rounded-sm">
                原始数据
              </div>
            )}

            <div className="aspect-square bg-slateX-100 overflow-hidden">
              <img
                src={m.thumbnailUrl}
                alt={m.originalFilename}
                className={`w-full h-full object-cover ${m.isDirty ? 'contrast-90 saturate-75' : ''}`}
                loading="lazy"
              />
            </div>

            <div className="p-2.5 space-y-1.5">
              <div className="text-[11px] font-mono text-slateX-600 truncate" title={m.originalFilename}>
                {m.originalFilename}
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`inline-flex items-center gap-1 px-1 py-0.5 text-[10px] border rounded-sm ${meta.cls}`}>
                  <Icon size={10} />
                  {meta.label}
                </span>
                <span className="text-[10px] text-slateX-400 font-mono">
                  {formatTime(m.uploadedAt)}
                </span>
              </div>
              {m.note && (
                <p className="text-[11px] text-slateX-500 leading-snug line-clamp-2">
                  {m.note}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
