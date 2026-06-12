import { useState } from 'react';
import {
  User,
  Edit3,
  FileText,
  Camera,
  AlertTriangle,
  CheckCircle,
  Maximize2,
  MapPin,
} from 'lucide-react';
import type { HistoryRecord } from '@/types';
import { ACTION_LABELS } from '@/types';
import { formatTime } from '@/utils/storage';
import { cn } from '@/lib/utils';

interface HistoryItemProps {
  record: HistoryRecord;
}

const actionIcons: Record<string, typeof Edit3> = {
  create: FileText,
  update_status: CheckCircle,
  update_coord: MapPin,
  add_remark: FileText,
  add_screenshot: Camera,
  modify_judgment: Edit3,
};

export function HistoryItem({ record }: HistoryItemProps) {
  const [showImage, setShowImage] = useState(false);
  const Icon = actionIcons[record.actionType] || Edit3;

  const isLinjie = record.operator === '林姐';

  return (
    <div className="relative pl-6 pb-3">
      <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-space-500 border-2 border-space-800" />
      {isLinjie && (
        <div className="absolute left-[-3px] top-[-1px] w-[10px] h-[10px] rounded-full bg-aviation-orange animate-pulse" />
      )}
      <div className="absolute left-[3px] top-4 bottom-0 w-px bg-space-700" />

      <div className="bg-space-800/50 rounded border border-space-700/50 p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'p-1 rounded',
                record.actionType === 'modify_judgment'
                  ? 'bg-aviation-orange/20 text-aviation-orange'
                  : 'bg-space-700 text-space-400'
              )}
            >
              <Icon size={12} />
            </div>
            <span className="text-xs font-medium text-space-200">
              {ACTION_LABELS[record.actionType]}
            </span>
          </div>
          <span className="text-[10px] text-space-500 whitespace-nowrap">
            {formatTime(record.timestamp)}
          </span>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <div
            className={cn(
              'w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-medium',
              isLinjie
                ? 'bg-aviation-orange/20 text-aviation-orange'
                : 'bg-space-700 text-space-400'
            )}
          >
            {record.operator[0]}
          </div>
          <span className={cn(
            'text-xs',
            isLinjie ? 'text-aviation-orange font-medium' : 'text-space-300'
          )}>
            {record.operator}
            {isLinjie && <span className="ml-1 text-[9px]">(教学老师)</span>}
          </span>
        </div>

        {(record.oldValue || record.newValue) && (
          <div className="mb-2 text-xs space-y-1">
            {record.oldValue && record.oldValue !== record.newValue && (
              <div className="flex items-center gap-2">
                <span className="text-space-500 text-[10px] min-w-[36px]">原值</span>
                <span className="text-space-400 line-through">{record.oldValue}</span>
              </div>
            )}
            {record.newValue && (
              <div className="flex items-center gap-2">
                <span className="text-space-500 text-[10px] min-w-[36px]">新值</span>
                <span className="text-space-200">{record.newValue}</span>
              </div>
            )}
          </div>
        )}

        {record.remark && (
          <div className="mb-2 text-xs text-space-300 bg-space-900/50 rounded p-2 border-l-2 border-space-500">
            {record.remark}
          </div>
        )}

        {record.screenshot && (
          <div className="relative">
            <button
              onClick={() => setShowImage(!showImage)}
              className="group relative block w-full rounded overflow-hidden border border-space-600"
            >
              <img
                src={record.screenshot}
                alt="复核截图"
                className="w-full h-24 object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Maximize2 size={16} className="text-white" />
              </div>
            </button>

            {record.viewCondition && (
              <div className="mt-1 text-[10px] text-space-500 font-mono">
                视图: ({record.viewCondition.centerLng.toFixed(4)}, {record.viewCondition.centerLat.toFixed(4)}) ×{record.viewCondition.zoom.toFixed(1)}
              </div>
            )}

            {!record.viewCondition && (
              <div className="mt-1 flex items-center gap-1 text-[10px] text-aviation-orange">
                <AlertTriangle size={10} />
                视图条件丢失
              </div>
            )}

            {showImage && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                onClick={() => setShowImage(false)}
              >
                <img
                  src={record.screenshot}
                  alt="复核截图大图"
                  className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
