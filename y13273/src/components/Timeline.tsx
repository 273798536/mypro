import {
  ImagePlus,
  FileOutput,
  RefreshCw,
  Pencil,
  MessageSquare,
  ChevronRight,
} from 'lucide-react';
import type { TimelineEntry, TimelineType, Material } from '../types';
import { formatTime } from '../utils/time';

interface Props {
  entries: TimelineEntry[];
  materials: Material[];
}

const typeMeta: Record<TimelineType, { label: string; Icon: typeof ImagePlus; cls: string }> = {
  material_add: {
    label: '补录材料',
    Icon: ImagePlus,
    cls: 'bg-engineering-600 border-engineering-600',
  },
  conclusion_change: {
    label: '结论调整',
    Icon: Pencil,
    cls: 'bg-amberX-600 border-amberX-600',
  },
  note_edit: {
    label: '备注修改',
    Icon: MessageSquare,
    cls: 'bg-slateX-500 border-slateX-500',
  },
  rerun: {
    label: '重跑比选',
    Icon: RefreshCw,
    cls: 'bg-engineering-800 border-engineering-800',
  },
  export: {
    label: '导出报告',
    Icon: FileOutput,
    cls: 'bg-slateX-700 border-slateX-700',
  },
};

export function Timeline({ entries, materials }: Props) {
  if (entries.length === 0) {
    return <div className="text-center py-8 text-sm text-slateX-400">暂无历史记录</div>;
  }

  return (
    <ol className="relative border-l border-slateX-200 ml-2 space-y-5">
      {entries.map((entry) => {
        const meta = typeMeta[entry.type];
        const Icon = meta.Icon;
        const relatedMats = entry.materialIds
          ?.map((id) => materials.find((m) => m.id === id))
          .filter(Boolean) as Material[];

        return (
          <li key={entry.id} className="ml-5">
            <span
              className={`absolute -left-[9px] flex items-center justify-center w-4.5 h-4.5 rounded-full border-2 border-white ring-2 ${meta.cls}`}
              style={{ width: 18, height: 18 }}
            >
              <Icon size={10} className="text-white" />
            </span>
            <div className="bg-white border border-slateX-200 rounded-sm p-3">
              <div className="flex items-start gap-2 flex-wrap">
                <span className={`text-[11px] px-1.5 py-0.5 rounded-sm text-white ${meta.cls}`}>
                  {meta.label}
                </span>
                <span className="text-xs font-mono text-slateX-500">
                  {formatTime(entry.timestamp)}
                </span>
                <span className="text-xs text-slateX-600 ml-auto">操作人：{entry.operator}</span>
              </div>
              <p className="mt-1.5 text-sm text-slateX-800">{entry.changeSummary}</p>

              {entry.diff && (
                <div className="mt-2 text-[11px] font-mono bg-slateX-50 border border-slateX-200 rounded-sm p-2 space-y-0.5">
                  {entry.diff.before !== undefined && (
                    <div className="text-alert-600">
                      - before: {JSON.stringify(entry.diff.before)}
                    </div>
                  )}
                  {entry.diff.after !== undefined && (
                    <div className="text-engineering-700">
                      + after: {JSON.stringify(entry.diff.after)}
                    </div>
                  )}
                </div>
              )}

              {relatedMats && relatedMats.length > 0 && (
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] text-slateX-500">关联材料：</span>
                  {relatedMats.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center gap-1 text-[11px] px-1.5 py-0.5 bg-slateX-50 border border-slateX-200 rounded-sm"
                    >
                      <img
                        src={m.thumbnailUrl}
                        alt=""
                        className="w-4 h-4 object-cover rounded-sm"
                      />
                      <span className="font-mono text-slateX-600 truncate max-w-[140px]">
                        {m.originalFilename}
                      </span>
                      {m.isLateArrival && (
                        <span className="text-[10px] px-1 bg-alert-50 text-alert-600 rounded-sm">
                          晚到
                        </span>
                      )}
                      {m.isCapacityOverload && (
                        <span className="text-[10px] px-1 bg-alert-50 text-alert-600 rounded-sm">
                          超限
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </li>
        );
      })}
      <li className="ml-5 pb-0">
        <div className="flex items-center gap-2 text-xs text-slateX-400">
          <ChevronRight size={14} />
          历史变更不可删除，所有操作均留痕
        </div>
      </li>
    </ol>
  );
}
